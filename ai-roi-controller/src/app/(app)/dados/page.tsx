"use client";
import { Download, FileSpreadsheet, FileUp, Undo2 } from "lucide-react";
import { useRef, useState } from "react";
import { Button, Confirm, cx, Empty, PageHeader, Pill, useToast } from "@/components/ui";
import { parseCsv, prepareImport, sha256, templateCsv, type ImportReport, type RawCell } from "@/data/importer";
import type { Mutation } from "@/data/mutations";
import { TABLES, type Row } from "@/data/schema";
import { stamp, useStore } from "@/data/store";
import { TABLE_KEYS, type ImportBatch, type TableKey } from "@/domain/types";
import { download, downloadWorkbook, rawSheets, readXlsx } from "@/lib/excel";
import { fmt, uid } from "@/lib/format";

const IMPORTABLE = TABLE_KEYS.filter((k) => TABLES[k].importable);

export default function Dados() {
  const { db, commit, actor } = useStore();
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [table, setTable] = useState<TableKey>("costs");
  const [busy, setBusy] = useState(false);
  const [staged, setStaged] = useState<{ report: ImportReport; fileName: string; fileHash: string; importId: string; repeated: boolean } | null>(null);
  const [undo, setUndo] = useState<ImportBatch | null>(null);
  const def = TABLES[table];

  async function onFile(file: File) {
    setBusy(true);
    try {
      if (file.size > 8 * 1024 * 1024) throw new Error("Arquivo maior que 8 MB. Divida a planilha em partes menores.");
      const buf = await file.arrayBuffer();
      const isXlsx = /\.xlsx$/i.test(file.name);
      if (!isXlsx && !/\.csv$/i.test(file.name)) throw new Error("Formato não aceito. Use um arquivo .csv ou .xlsx.");
      const sheet: RawCell[][] = isXlsx ? await readXlsx(buf) : parseCsv(new TextDecoder("utf-8").decode(buf));
      if (sheet.length < 2) throw new Error("O arquivo não tem linhas de dados além do cabeçalho.");
      const fileHash = await sha256(buf);
      const importId = uid();
      setStaged({ report: prepareImport(table, sheet, db, importId), fileName: file.name, fileHash, importId, repeated: db.imports.some((i) => i.fileHash === fileHash) });
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Não foi possível ler o arquivo.");
    } finally { setBusy(false); if (input.current) input.current.value = ""; }
  }

  async function confirmImport() {
    if (!staged) return;
    const { report, fileName, fileHash, importId } = staged;
    setBusy(true);
    const batch = stamp({
      id: importId, table, fileName, fileHash, rowsTotal: report.total, rowsImported: report.imported, rowsDuplicated: report.duplicated, rowsFailed: report.failed,
      errors: JSON.stringify(report.rows.filter((r) => r.status !== "ok").slice(0, 200).map((r) => ({ row: r.line, status: r.status, message: r.message }))),
      source: "import",
    });
    const audit = stamp({ actor, action: "import", table, recordId: importId, summary: `Importou ${report.imported} ${def.plural} de ${fileName} (${report.failed} com erro, ${report.duplicated} duplicadas)` });
    const r = await commit([...report.mutations, { op: "upsert", table: "imports", row: batch }, { op: "upsert", table: "audit", row: audit }]);
    setBusy(false);
    if (r.ok) { toast("ok", `${report.imported} ${def.plural} importados.`); setStaged(null); } else toast("error", r.message);
  }

  async function undoImport(b: ImportBatch) {
    const muts: Mutation[] = (db[b.table as TableKey] as unknown as Row[]).filter((r) => r.importId === b.id).map((r) => ({ op: "delete", table: b.table as TableKey, id: r.id }));
    const audit = stamp({ actor, action: "delete", table: b.table, recordId: b.id, summary: `Desfez a importação de ${b.fileName} (${muts.length} registros removidos)` });
    const r = await commit([...muts, { op: "delete", table: "imports", id: b.id }, { op: "upsert", table: "audit", row: audit }]);
    toast(r.ok ? "ok" : "error", r.ok ? `Importação desfeita: ${muts.length} registros removidos.` : r.message);
    setUndo(null);
  }

  const rep = staged?.report;
  const problems = rep?.rows.filter((r) => r.status !== "ok") ?? [];
  return (
    <>
      <PageHeader title="Dados" subtitle="Importe planilhas, exporte tudo e acompanhe o histórico. Cada registro guarda a origem: manual, importado ou integração." />
      <section className="solid p-4 sm:p-5">
        <h2 className="text-[16px] font-semibold">Importar CSV ou Excel</h2>
        <p className="text-ink-3 text-[13.5px] mt-0.5 max-w-[80ch]">As colunas são reconhecidas pelo cabeçalho. Departamentos, ferramentas e processos são localizados pelo nome. Linhas com erro são relatadas e não bloqueiam as demais; registros idênticos não são somados duas vezes.</p>
        <div className="flex flex-wrap items-end gap-3 mt-4">
          <div className="flex-1 basis-56 max-w-xs">
            <label htmlFor="tabela" className="label">O que você vai importar</label>
            <select id="tabela" className="input" value={table} onChange={(e) => { setTable(e.target.value as TableKey); setStaged(null); }}>
              {IMPORTABLE.map((k) => <option key={k} value={k}>{TABLES[k].plural[0].toUpperCase() + TABLES[k].plural.slice(1)}</option>)}
            </select>
          </div>
          <Button onClick={() => download(`modelo-${def.sheet}.csv`, new Blob([templateCsv(table)], { type: "text/csv;charset=utf-8" }))}><Download size={16} />Baixar modelo</Button>
          <Button variant="primary" loading={busy && !staged} onClick={() => input.current?.click()}><FileUp size={16} />Escolher arquivo</Button>
          <input ref={input} type="file" accept=".csv,.xlsx" className="sr-only" aria-label="Arquivo para importar" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        </div>

        {rep && staged ? (
          <div className="mt-5 rounded-[16px] border border-line p-4 bg-[var(--sunken)]">
            <div className="flex flex-wrap items-center gap-2">
              <FileSpreadsheet size={17} className="text-ink-3" /><span className="font-medium">{staged.fileName}</span>
              <Pill tone="pos">{rep.imported} prontas</Pill>
              {rep.duplicated ? <Pill tone="info">{rep.duplicated} duplicadas</Pill> : null}
              {rep.failed ? <Pill tone="neg">{rep.failed} com erro</Pill> : null}
            </div>
            {staged.repeated ? <p className="text-[var(--warn)] text-[13.5px] font-medium mt-2">Este mesmo arquivo já foi importado antes. As linhas repetidas foram marcadas como duplicadas.</p> : null}
            {rep.missingRequired.length ? (
              <p className="text-neg font-medium mt-3">Faltam colunas obrigatórias: {rep.missingRequired.join(", ")}. Baixe o modelo para ver os cabeçalhos esperados.</p>
            ) : (<>
              <p className="text-[13px] text-ink-2 mt-3">
                Colunas reconhecidas: {rep.columns.filter((c) => c.field).map((c) => c.field!.label).join(", ") || "nenhuma"}.
                {rep.columns.some((c) => !c.field && c.header) ? ` Ignoradas: ${rep.columns.filter((c) => !c.field && c.header).map((c) => c.header).join(", ")}.` : ""}
              </p>
              {problems.length ? (
                <div className="solid !shadow-none table-wrap mt-3 max-h-[260px] overflow-y-auto">
                  <table className="table"><thead><tr><th>Linha</th><th>Conteúdo</th><th>Problema</th></tr></thead>
                    <tbody>{problems.slice(0, 100).map((r) => (
                      <tr key={r.line}><td className="num">{r.line}</td><td className="text-ink-2 max-w-[220px] truncate">{r.preview}</td>
                        <td className={cx(r.status === "error" ? "text-neg" : "text-ink-2")}>{r.message}</td></tr>
                    ))}</tbody></table>
                </div>
              ) : null}
            </>)}
            <div className="flex flex-wrap gap-2 mt-4">
              <Button variant="primary" loading={busy} disabled={!rep.imported} onClick={confirmImport}>Importar {rep.imported} {rep.imported === 1 ? "registro" : "registros"}</Button>
              <Button onClick={() => setStaged(null)}>Cancelar</Button>
            </div>
          </div>
        ) : null}
      </section>

      <section className="solid">
        <div className="p-4 sm:px-5"><h2 className="text-[16px] font-semibold">Histórico de importações</h2></div>
        {db.imports.length === 0 ? <Empty title="Nenhuma importação ainda">Cada arquivo importado fica registrado aqui, com totais, erros por linha e a opção de desfazer.</Empty> : (
          <div className="table-wrap border-t border-line">
            <table className="table">
              <thead><tr><th>Quando</th><th>Arquivo</th><th>Tabela</th><th className="r">Importadas</th><th className="r">Duplicadas</th><th className="r">Com erro</th><th><span className="sr-only">Ações</span></th></tr></thead>
              <tbody>{[...db.imports].reverse().map((b) => {
                const errs = (() => { try { return JSON.parse(b.errors || "[]") as { row: number; status: string; message: string }[]; } catch { return []; } })();
                return (
                  <tr key={b.id}>
                    <td className="whitespace-nowrap">{fmt.dateTime(b.createdAt)}</td>
                    <td><div className="font-medium">{b.fileName}</div>
                      {errs.length ? <details className="text-[12.5px] text-ink-2 mt-1"><summary className="cursor-pointer">Ver {errs.length} linhas não importadas</summary><ul className="mt-1 max-h-40 overflow-y-auto">{errs.map((e) => <li key={e.row}>Linha {e.row}: {e.message}</li>)}</ul></details> : null}</td>
                    <td>{TABLES[b.table as TableKey]?.plural ?? b.table}</td>
                    <td className="r">{b.rowsImported}</td><td className="r">{b.rowsDuplicated}</td><td className="r">{b.rowsFailed ? <Pill tone="neg">{b.rowsFailed}</Pill> : 0}</td>
                    <td className="r"><Button size="sm" onClick={() => setUndo(b)}><Undo2 size={14} />Desfazer</Button></td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
        )}
      </section>

      <section className="solid p-4 sm:p-5">
        <h2 className="text-[16px] font-semibold">Exportar</h2>
        <p className="text-ink-3 text-[13.5px] mt-0.5">Leve todos os dados com você, a qualquer momento.</p>
        <div className="flex flex-wrap gap-2 mt-3">
          <Button onClick={async () => { await downloadWorkbook("ai-roi-controller-dados.xlsx", rawSheets(db, TABLE_KEYS)); toast("ok", "Arquivo Excel gerado."); }}><FileSpreadsheet size={16} />Todas as tabelas em Excel</Button>
          <Button onClick={() => { download("ai-roi-controller-backup.json", new Blob([JSON.stringify(db, null, 2)], { type: "application/json" })); toast("ok", "Cópia de segurança gerada."); }}><Download size={16} />Cópia de segurança (JSON)</Button>
        </div>
      </section>
      <Confirm open={!!undo} onClose={() => setUndo(null)} title="Desfazer importação?" confirmLabel="Desfazer" onConfirm={() => undoImport(undo!)}>
        {undo ? <>Os registros criados por “{undo.fileName}” serão removidos. Registros lançados manualmente não são afetados.</> : null}
      </Confirm>
    </>
  );
}
