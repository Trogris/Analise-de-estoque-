/**
 * Importação de CSV/Excel: mapeia colunas pelo cabeçalho, valida linha a linha,
 * detecta duplicidades e devolve um relatório. Nada é gravado aqui.
 */
import type { Database, TableKey } from "@/domain/types";
import { uid } from "@/lib/format";
import { applyMutations, type Mutation } from "./mutations";
import { TABLES, validate, type FieldDef, type Row, type TableDef } from "./schema";

export type RawCell = string | number | Date | null | undefined;

const norm = (s: unknown) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** CSV conforme RFC 4180, aceitando ";" (padrão do Excel em português) ou ",". */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const firstLine = src.split(/\r?\n/, 1)[0] ?? "";
  const delim = (firstLine.match(/;/g)?.length ?? 0) >= (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') { if (src[i + 1] === '"') { cell += '"'; i++; } else quoted = false; }
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delim) { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += ch;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

const pad = (n: number) => String(n).padStart(2, "0");
function toIsoDate(v: RawCell): string | RawCell {
  if (v instanceof Date) return `${v.getUTCFullYear()}-${pad(v.getUTCMonth() + 1)}-${pad(v.getUTCDate())}`;
  const s = String(v ?? "").trim();
  let m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (m) return `${m[3]}-${pad(+m[2])}-${pad(+m[1])}`;
  m = /^(\d{1,2})\/(\d{4})$/.exec(s);
  if (m) return `${m[2]}-${pad(+m[1])}-01`;
  return s;
}

export const importFields = (def: TableDef) => def.fields.filter((f) => f.form !== false);

function coerce(fd: FieldDef, v: RawCell, db: Database): { value?: unknown; error?: string } {
  if (v === null || v === undefined || (typeof v === "string" && v.trim() === "")) return {};
  if (fd.type === "date") return { value: toIsoDate(v) };
  if (fd.type === "month") return { value: String(toIsoDate(v)).slice(0, 7) };
  if (fd.type === "select") {
    const hit = fd.options!.find(([val, label]) => norm(val) === norm(v) || norm(label) === norm(v));
    return hit ? { value: hit[0] } : { error: `${fd.label}: “${v}” não é uma opção válida (${fd.options!.map((o) => o[1]).join(", ")}).` };
  }
  if (fd.type === "ref") {
    const target = TABLES[fd.ref!];
    const rows = db[fd.ref!] as unknown as Row[];
    const hits = rows.filter((r) => r.id === v || norm(target.title(r, db)) === norm(v) || norm(r.name) === norm(v));
    if (hits.length === 1) return { value: hits[0].id };
    return { error: hits.length ? `${fd.label}: “${v}” corresponde a mais de um registro.` : `${fd.label}: “${v}” não está cadastrado.` };
  }
  return { value: v instanceof Date ? toIsoDate(v) : v };
}

const businessKey = (def: TableDef, row: Record<string, unknown>) =>
  JSON.stringify(importFields(def).map((f) => { const v = row[f.key]; return v === undefined || v === "" ? null : typeof v === "number" ? Math.round(v * 100) / 100 : norm(v); }));

export interface ImportReport {
  table: TableKey;
  columns: { header: string; field: FieldDef | null }[];
  missingRequired: string[];
  rows: { line: number; status: "ok" | "duplicate" | "error"; message?: string; preview: string }[];
  mutations: Mutation[];
  total: number;
  imported: number;
  duplicated: number;
  failed: number;
}

export function prepareImport(table: TableKey, sheet: RawCell[][], db: Database, importId: string): ImportReport {
  const def = TABLES[table];
  const fields = importFields(def);
  const [head = [], ...body] = sheet;
  const columns = head.map((h) => ({ header: String(h ?? ""), field: fields.find((f) => norm(f.label) === norm(h) || norm(f.key) === norm(h)) ?? null }));
  const mapped = new Set(columns.map((c) => c.field?.key));
  const missingRequired = fields.filter((f) => f.required && !mapped.has(f.key)).map((f) => f.label);
  const report: ImportReport = { table, columns, missingRequired, rows: [], mutations: [], total: body.length, imported: 0, duplicated: 0, failed: 0 };
  if (missingRequired.length) return report;

  const seen = new Set((db[table] as unknown as Row[]).map((r) => businessKey(def, r)));
  let working = db;
  const now = new Date().toISOString();
  body.forEach((cells, i) => {
    const line = i + 2;
    const input: Record<string, unknown> = {};
    const errors: string[] = [];
    columns.forEach((c, j) => {
      if (!c.field) return;
      const r = coerce(c.field, cells[j], working);
      if (r.error) errors.push(r.error); else if (r.value !== undefined) input[c.field.key] = r.value;
    });
    const preview = columns.filter((c) => c.field).slice(0, 4).map((c) => String(cells[columns.indexOf(c)] ?? "") || "—").join(" · ");
    if (!errors.length) {
      const v = validate(def, input, working);
      if (!v.ok) errors.push(...Object.entries(v.errors).map(([k, msg]) => `${fields.find((f) => f.key === k)?.label ?? k}: ${msg}`));
      else {
        const key = businessKey(def, v.value);
        if (seen.has(key)) { report.duplicated++; report.rows.push({ line, status: "duplicate", message: "Registro idêntico já existe.", preview }); return; }
        seen.add(key);
        const row = { ...v.value, id: uid(), source: "import", importId, createdAt: now, updatedAt: now } as Row;
        // Benefício importado nunca entra validado: precisa de validação explícita.
        if (table === "benefits") row.status = row.evidence ? "submitted" : "draft";
        const m: Mutation = { op: "upsert", table, row };
        report.mutations.push(m);
        working = applyMutations(working, [m]);
        report.imported++;
        report.rows.push({ line, status: "ok", preview });
        return;
      }
    }
    report.failed++;
    report.rows.push({ line, status: "error", message: errors.join(" "), preview });
  });
  return report;
}

/** Modelo de planilha: cabeçalhos e uma linha de exemplo do formato esperado. */
export function templateCsv(table: TableKey): string {
  const fields = importFields(TABLES[table]);
  const sample = fields.map((f) =>
    f.type === "month" ? "2026-01" : f.type === "date" ? "2026-01-15" : f.type === "select" ? f.options![0][1]
      : f.type === "ref" ? `(nome de ${TABLES[f.ref!].singular})` : ["number", "int", "money", "percent"].includes(f.type) ? "0" : "");
  const esc = (s: string) => (/[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  return "﻿" + [fields.map((f) => esc(f.label)).join(";"), sample.map(esc).join(";")].join("\r\n") + "\r\n";
}

export async function sha256(buf: ArrayBuffer): Promise<string> {
  const h = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
