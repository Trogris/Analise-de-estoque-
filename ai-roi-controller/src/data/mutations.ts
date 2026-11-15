import type { Database, TableKey } from "@/domain/types";
import type { Row } from "./schema";

export type Mutation =
  | { op: "upsert"; table: TableKey; row: Row }
  | { op: "delete"; table: TableKey; id: string };

/** Aplica mutações devolvendo um novo banco (imutável). */
export function applyMutations(db: Database, muts: Mutation[]): Database {
  const next = { ...db } as unknown as Record<TableKey, Row[]>;
  const touched = new Set<TableKey>();
  for (const m of muts) {
    if (!touched.has(m.table)) { next[m.table] = [...(db[m.table] as unknown as Row[])]; touched.add(m.table); }
    const rows = next[m.table];
    const i = rows.findIndex((r) => r.id === (m.op === "upsert" ? m.row.id : m.id));
    if (m.op === "upsert") { if (i >= 0) rows[i] = m.row; else rows.push(m.row); }
    else if (i >= 0) rows.splice(i, 1);
  }
  return next as unknown as Database;
}
