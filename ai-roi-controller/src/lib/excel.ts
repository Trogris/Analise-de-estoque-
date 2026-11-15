/** Leitura e geração de Excel no navegador (exceljs carregado sob demanda). */
import { TABLES, columnsOf, type Row } from "@/data/schema";
import type { RawCell } from "@/data/importer";
import type { Database, TableKey } from "@/domain/types";

const load = async () => (await import("exceljs")).default;

/** Texto que começaria uma fórmula é neutralizado ao exportar. */
const safe = (v: unknown) => (typeof v === "string" && /^[=+\-@\t\r]/.test(v) ? `'${v}` : v);

export async function readXlsx(buf: ArrayBuffer): Promise<RawCell[][]> {
  const ExcelJS = await load();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  const ws = wb.worksheets[0];
  if (!ws) return [];
  const rows: RawCell[][] = [];
  ws.eachRow({ includeEmpty: false }, (row) => {
    const values = (row.values as unknown[]).slice(1).map((v): RawCell => {
      if (v === null || v === undefined) return "";
      if (v instanceof Date || typeof v === "number" || typeof v === "string") return v;
      if (typeof v === "object") {
        const o = v as { result?: unknown; text?: string; richText?: { text: string }[] };
        if (o.result !== undefined) return o.result as RawCell;
        if (o.richText) return o.richText.map((t) => t.text).join("");
        if (o.text) return o.text;
      }
      return String(v);
    });
    rows.push(values);
  });
  return rows;
}

export interface SheetSpec { name: string; columns: { header: string; width?: number; numFmt?: string }[]; rows: unknown[][] }

export async function downloadWorkbook(fileName: string, sheets: SheetSpec[]) {
  const ExcelJS = await load();
  const wb = new ExcelJS.Workbook();
  wb.creator = "AI ROI Controller";
  wb.created = new Date();
  for (const s of sheets) {
    const ws = wb.addWorksheet(s.name.slice(0, 31), { views: [{ state: "frozen", ySplit: 1 }] });
    ws.columns = s.columns.map((c) => ({ header: c.header, width: c.width ?? Math.max(14, c.header.length + 4), style: c.numFmt ? { numFmt: c.numFmt } : {} }));
    ws.getRow(1).font = { bold: true };
    for (const r of s.rows) ws.addRow(r.map(safe));
  }
  const buf = await wb.xlsx.writeBuffer();
  download(fileName, new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
}

export function download(fileName: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = fileName;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Todas as tabelas, uma aba por tabela, com os mesmos nomes de coluna da planilha-banco. */
export function rawSheets(db: Database, tables: TableKey[]): SheetSpec[] {
  return tables.map((k) => {
    const def = TABLES[k];
    const cols = columnsOf(def);
    return { name: def.sheet, columns: cols.map((c) => ({ header: c })), rows: (db[k] as unknown as Row[]).map((r) => cols.map((c) => r[c] ?? "")) };
  });
}
