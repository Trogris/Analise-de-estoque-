"use client";
/**
 * Estado da aplicação e a "costura" de persistência. As telas só conhecem
 * `useStore()`; trocar Google Planilhas por Postgres/Supabase é trocar o Gateway.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { emptyDb, type Database, type TableKey } from "@/domain/types";
import { uid } from "@/lib/format";
import { buildDemo } from "./demo";
import { applyMutations, type Mutation } from "./mutations";
import { referencesTo, TABLES, validate, type Row } from "./schema";

export type Mode = "local" | "sheets";
interface Gateway { load(): Promise<Database>; apply(muts: Mutation[]): Promise<void> }

const LOCAL_KEY = "ai-roi-controller:db:v1";
/** Marca que a pessoa já removeu os dados de exemplo — eles não voltam sozinhos. */
export const DEMO_DISMISSED_KEY = "ai-roi-controller:demo-dismissed";
const localGateway: Gateway = {
  async load() {
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      return raw ? { ...emptyDb(), ...(JSON.parse(raw) as Database) } : emptyDb();
    } catch { return emptyDb(); }
  },
  async apply(muts) {
    const db = applyMutations(await this.load(), muts);
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify(db)); }
    catch { throw new Error("Não foi possível gravar neste navegador (armazenamento cheio ou bloqueado)."); }
  },
};
async function json<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => ({}));
  if (res.status === 401) window.location.assign("/entrar");
  if (!res.ok) throw new Error((body as { error?: string }).error || `Erro ${res.status} ao falar com o servidor.`);
  return body as T;
}
const sheetsGateway: Gateway = {
  load: async () => json<Database>(await fetch("/api/db", { cache: "no-store" })),
  apply: async (muts) => { await json(await fetch("/api/db", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(muts) })); },
};

export type SaveResult = { ok: true; row: Row } | { ok: false; errors: Record<string, string>; message?: string };
interface Store {
  db: Database;
  ready: boolean;
  mode: Mode;
  protectedAccess: boolean;
  serviceAccount: string | null;
  syncing: boolean;
  loadError: string | null;
  actor: string;
  hasDemo: boolean;
  commit(muts: Mutation[]): Promise<{ ok: true } | { ok: false; message: string }>;
  save(table: TableKey, input: Record<string, unknown>, opts?: { audit?: string; action?: string }): Promise<SaveResult>;
  remove(table: TableKey, id: string): Promise<{ ok: true } | { ok: false; message: string }>;
  reload(): Promise<void>;
}
const Ctx = createContext<Store | null>(null);
export const useStore = () => {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore fora do StoreProvider");
  return s;
};

export const stamp = (row: Record<string, unknown>, existing?: Row): Row => {
  const now = new Date().toISOString();
  return { source: "manual", ...row, id: String(row.id ?? existing?.id ?? uid()), createdAt: existing?.createdAt ?? now, updatedAt: now } as Row;
};

export function StoreProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<Database>(emptyDb);
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<Mode>("local");
  const [info, setInfo] = useState({ protectedAccess: false, serviceAccount: null as string | null });
  const [pending, setPending] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const dbRef = useRef(db);
  useEffect(() => { dbRef.current = db; }, [db]);
  const gateway = useRef<Gateway>(localGateway);

  const reload = useCallback(async () => {
    setLoadError(null);
    try { setDb(await gateway.current.load()); }
    catch (e) { setLoadError(e instanceof Error ? e.message : "Falha ao carregar os dados."); }
    setReady(true);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const s = (await (await fetch("/api/status", { cache: "no-store" })).json()) as { mode: Mode; protected: boolean; serviceAccount: string | null };
        if (s.mode === "sheets") { gateway.current = sheetsGateway; setMode("sheets"); }
        setInfo({ protectedAccess: s.protected, serviceAccount: s.serviceAccount });
      } catch { /* sem servidor de API: segue em modo local */ }
      // Primeira visita em modo local, sem nenhum dado: abre com a empresa fictícia de exemplo,
      // sempre identificada como tal. Nunca acontece com o Google Planilhas conectado.
      if (gateway.current === localGateway) {
        try {
          const empty = Object.values(await localGateway.load()).every((rows) => (rows as unknown[]).length === 0);
          if (empty && !localStorage.getItem(DEMO_DISMISSED_KEY)) await localGateway.apply(buildDemo());
        } catch { /* sem armazenamento: abre vazio */ }
      }
      await reload();
    })();
  }, [reload]);

  const actor = db.org[0]?.operator || "Operador não identificado";

  const commit = useCallback<Store["commit"]>(async (muts) => {
    if (!muts.length) return { ok: true };
    const before = dbRef.current;
    const next = applyMutations(before, muts);
    dbRef.current = next;
    setDb(next); // otimista
    setPending((n) => n + 1);
    try {
      await gateway.current.apply(muts);
      return { ok: true };
    } catch (e) {
      dbRef.current = before;
      setDb(before); // desfaz
      return { ok: false, message: e instanceof Error ? e.message : "Não foi possível gravar." };
    } finally { setPending((n) => n - 1); }
  }, []);

  const auditRow = (action: string, table: TableKey, recordId: string, summary: string): Mutation => ({
    op: "upsert", table: "audit",
    row: stamp({ actor: dbRef.current.org[0]?.operator || "Operador não identificado", action, table, recordId, summary }),
  });

  const save = useCallback<Store["save"]>(async (table, input, opts) => {
    const def = TABLES[table];
    const cur = dbRef.current;
    const existing = input.id ? (cur[table] as unknown as Row[]).find((r) => r.id === input.id) : undefined;
    const v = validate(def, { ...input, id: existing?.id }, cur);
    if (!v.ok) return { ok: false, errors: v.errors };
    // Campos de sistema (fora do formulário) são preservados ou vêm explicitamente de `input`.
    const system = Object.fromEntries(def.fields.filter((f) => f.form === false).map((f) => [f.key, input[f.key] ?? existing?.[f.key]]).filter(([, x]) => x !== undefined));
    const row = stamp({ ...v.value, ...system, source: input.source ?? existing?.source ?? "manual", importId: input.importId ?? existing?.importId }, existing);
    if (table === "benefits" && !row.status) row.status = "draft";
    const title = def.title(row, cur);
    const r = await commit([
      { op: "upsert", table, row },
      auditRow(opts?.action ?? (existing ? "update" : "create"), table, row.id, opts?.audit ?? `${existing ? "Alterou" : "Criou"} ${def.singular}: ${title}`),
    ]);
    return r.ok ? { ok: true, row } : { ok: false, errors: {}, message: r.message };
  }, [commit]);

  const remove = useCallback<Store["remove"]>(async (table, id) => {
    const def = TABLES[table];
    const cur = dbRef.current;
    const row = (cur[table] as unknown as Row[]).find((r) => r.id === id);
    if (!row) return { ok: true };
    const refs = referencesTo(cur, table, id);
    if (refs.length) {
      return { ok: false, message: `Não é possível excluir: em uso por ${refs.map((r) => `${r.count} ${r.count > 1 ? r.def.plural : r.def.singular}`).join(", ")}. Exclua ou altere esses registros primeiro.` };
    }
    return commit([{ op: "delete", table, id }, auditRow("delete", table, id, `Excluiu ${def.singular}: ${def.title(row, cur)}`)]);
  }, [commit]);

  const hasDemo = useMemo(
    () => (Object.values(db) as unknown as Row[][]).some((rows) => rows.some((r) => r.source === "demo")),
    [db],
  );
  const value: Store = { db, ready, mode, ...info, syncing: pending > 0, loadError, actor, hasDemo, commit, save, remove, reload };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
