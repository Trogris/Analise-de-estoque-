/**
 * Repositório sobre o Google Planilhas: uma aba por tabela, cabeçalho na linha 1,
 * um registro por linha. As colunas são localizadas pelo nome do cabeçalho, então
 * reordenar colunas na planilha não quebra nada.
 *
 * Limites conhecidos (aceitos nesta fase): sem transações e sem controle de
 * concorrência — em gravações simultâneas, vence a última.
 */
import { columnsOf, isNumeric, TABLES, validate, type Row, type TableDef } from "@/data/schema";
import type { Mutation } from "@/data/mutations";
import { emptyDb, TABLE_KEYS, type Database } from "@/domain/types";
import { SheetsError, type Cell, type SheetsApi } from "./client";

const tab = (def: TableDef, range: string) => `'${def.sheet}'!${range}`;

/** Cria abas e cabeçalhos que faltam. Nunca apaga nem reordena o que já existe. */
export async function ensureSchema(api: SheetsApi): Promise<{ created: string[]; meta: Map<string, number> }> {
  let meta = await api.meta();
  const missing = TABLE_KEYS.map((k) => TABLES[k]).filter((d) => !meta.has(d.sheet));
  if (missing.length) {
    await api.batchUpdate(missing.map((d) => ({ addSheet: { properties: { title: d.sheet, gridProperties: { frozenRowCount: 1 } } } })));
    meta = await api.meta();
  }
  const defs = TABLE_KEYS.map((k) => TABLES[k]);
  const headers = await api.batchGet(defs.map((d) => tab(d, "1:1")));
  const updates: { range: string; values: Cell[][] }[] = [];
  defs.forEach((d, i) => {
    const current = (headers[i][0] ?? []).map(String);
    const add = columnsOf(d).filter((c) => !current.includes(c));
    if (add.length) updates.push({ range: tab(d, "1:1"), values: [[...current, ...add]] });
  });
  await api.batchUpdateValues(updates);
  return { created: missing.map((d) => d.sheet), meta };
}

function parseRow(def: TableDef, header: string[], cells: Cell[]): Row | null {
  const raw: Record<string, unknown> = {};
  header.forEach((h, i) => { if (cells[i] !== undefined && cells[i] !== "") raw[h] = cells[i]; });
  if (!raw.id) return null;
  const row: Row = { id: String(raw.id) };
  for (const fd of def.fields) {
    const v = raw[fd.key];
    if (v === undefined) continue;
    row[fd.key] = isNumeric(fd) ? Number(v) : String(v);
    if (isNumeric(fd) && Number.isNaN(row[fd.key])) delete row[fd.key];
  }
  row.source = String(raw.source ?? "manual");
  if (raw.importId) row.importId = String(raw.importId);
  row.createdAt = String(raw.createdAt ?? "");
  row.updatedAt = String(raw.updatedAt ?? "");
  return row;
}

const toCells = (header: string[], row: Row): Cell[] =>
  header.map((h) => {
    const v = row[h];
    return v === undefined || v === null ? "" : typeof v === "number" || typeof v === "boolean" ? v : String(v);
  });

export async function loadDatabase(api: SheetsApi): Promise<Database> {
  await ensureSchema(api);
  const defs = TABLE_KEYS.map((k) => TABLES[k]);
  const data = await api.batchGet(defs.map((d) => tab(d, "A:ZZ")));
  const db = emptyDb() as unknown as Record<string, Row[]>;
  defs.forEach((d, i) => {
    const [head, ...rows] = data[i];
    const header = (head ?? []).map(String);
    db[d.key] = rows.map((r) => parseRow(d, header, r)).filter((r): r is Row => r !== null);
  });
  return db as unknown as Database;
}

/** Valida no servidor antes de gravar; a validação do navegador é só conveniência. */
export function validateMutations(muts: unknown): Mutation[] {
  if (!Array.isArray(muts) || muts.length === 0 || muts.length > 5000) throw new SheetsError("Lista de alterações inválida.", 400);
  return muts.map((m, i) => {
    const def = TABLES[(m as Mutation)?.table];
    if (!def) throw new SheetsError(`Alteração ${i + 1}: tabela desconhecida.`, 400);
    if (m.op === "delete" && typeof m.id === "string" && m.id) return { op: "delete", table: def.key, id: m.id };
    if (m.op === "upsert" && m.row && typeof m.row.id === "string" && /^[\w-]{1,64}$/.test(m.row.id)) {
      const r = validate(def, m.row, null);
      if (!r.ok) throw new SheetsError(`Alteração ${i + 1} (${def.singular}): ${Object.entries(r.errors).map(([k, v]) => `${k}: ${v}`).join(" ")}`, 400);
      const sys = Object.fromEntries(["source", "importId", "createdAt", "updatedAt"].filter((k) => typeof m.row[k] === "string").map((k) => [k, String(m.row[k]).slice(0, 64)]));
      // Campos de sistema (status, validação, auditoria) não passam por formulário, mas são gravados.
      const system = Object.fromEntries(def.fields.filter((fd) => fd.form === false && m.row[fd.key] !== undefined && m.row[fd.key] !== "").map((fd) => [fd.key, r.value[fd.key] ?? m.row[fd.key]]));
      return { op: "upsert", table: def.key, row: { ...r.value, ...system, ...sys, id: m.row.id } as Row };
    }
    throw new SheetsError(`Alteração ${i + 1}: formato inválido.`, 400);
  });
}

export async function applyToSheets(api: SheetsApi, muts: Mutation[]): Promise<void> {
  const { meta } = await ensureSchema(api);
  const tables = [...new Set(muts.map((m) => m.table))].map((k) => TABLES[k]);
  const got = await api.batchGet(tables.flatMap((d) => [tab(d, "1:1"), tab(d, "A:A")]));

  const updates: { range: string; values: Cell[][] }[] = [];
  const deletes: { sheetId: number; index: number }[] = [];
  for (let t = 0; t < tables.length; t++) {
    const def = tables[t];
    const header = (got[t * 2][0] ?? []).map(String);
    const rowOf = new Map<string, number>(); // id → índice (0 = cabeçalho)
    got[t * 2 + 1].forEach((r, i) => { if (i > 0 && r[0] !== undefined && r[0] !== "") rowOf.set(String(r[0]), i); });
    const appends = new Map<string, Cell[]>();
    for (const m of muts) {
      if (m.table !== def.key) continue;
      if (m.op === "upsert") {
        const at = rowOf.get(m.row.id);
        if (at !== undefined) updates.push({ range: tab(def, `A${at + 1}`), values: [toCells(header, m.row)] });
        else appends.set(m.row.id, toCells(header, m.row));
      } else {
        const at = rowOf.get(m.id);
        if (at !== undefined) deletes.push({ sheetId: meta.get(def.sheet)!, index: at });
        appends.delete(m.id);
      }
    }
    await api.append(tab(def, "A1"), [...appends.values()]);
  }
  await api.batchUpdateValues(updates);
  // De baixo para cima, para que os índices continuem válidos.
  deletes.sort((a, b) => b.index - a.index);
  await api.batchUpdate(deletes.map((d) => ({
    deleteDimension: { range: { sheetId: d.sheetId, dimension: "ROWS", startIndex: d.index, endIndex: d.index + 1 } },
  })));
}
