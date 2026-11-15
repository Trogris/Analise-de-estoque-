"use client";
/**
 * Cadastro genérico dirigido pelo esquema (src/data/schema.ts): a mesma
 * definição produz a lista, o formulário, a validação e as mensagens.
 */
import { ArrowDown, ArrowUp, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { TABLES, type FieldDef, type Row, type TableDef } from "@/data/schema";
import { useStore } from "@/data/store";
import { periodLabel } from "@/domain/period";
import type { Database, TableKey } from "@/domain/types";
import { fmt } from "@/lib/format";
import { Button, Confirm, cx, Dialog, Empty, Pill, useToast } from "./ui";

const SOURCE: Record<string, [string, "mute" | "info" | "warn"]> = {
  manual: ["Manual", "mute"], import: ["Importado", "info"], integration: ["Integração", "info"], demo: ["Exemplo fictício", "warn"],
};
export const SourcePill = ({ source }: { source?: unknown }) => {
  const [label, tone] = SOURCE[String(source)] ?? SOURCE.manual;
  return <Pill tone={tone} title="Origem do dado">{label}</Pill>;
};

export function cellText(fd: FieldDef, v: unknown, db: Database): string {
  if (v === undefined || v === null || v === "") return "—";
  switch (fd.type) {
    case "ref": { const t = TABLES[fd.ref!]; const r = (db[fd.ref!] as unknown as Row[]).find((x) => x.id === v); return r ? t.title(r, db) : "(removido)"; }
    case "select": return fd.options!.find(([o]) => o === v)?.[1] ?? String(v);
    case "money": return fmt.money(Number(v));
    case "percent": return `${fmt.num(Number(v))}%`;
    case "int": case "number": return fmt.num(Number(v));
    case "month": return periodLabel(String(v));
    case "date": return fmt.date(String(v));
    default: return String(v);
  }
}

/* ---------- Formulário ---------- */
export function EntityForm({ table, open, onClose, initial, defaults, onSaved, title }: {
  table: TableKey; open: boolean; onClose: () => void; initial?: Row | null; defaults?: Record<string, unknown>; onSaved?: (row: Row) => void; title?: string;
}) {
  return open ? <FormBody key={initial?.id ?? "new"} {...{ table, onClose, initial, defaults, onSaved, title }} /> : null;
}

function FormBody({ table, onClose, initial, defaults, onSaved, title }: {
  table: TableKey; onClose: () => void; initial?: Row | null; defaults?: Record<string, unknown>; onSaved?: (row: Row) => void; title?: string;
}) {
  const def = TABLES[table];
  const { db, save } = useStore();
  const toast = useToast();
  const fields = def.fields.filter((f) => f.form !== false);
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((f) => {
      const v = initial?.[f.key] ?? defaults?.[f.key];
      return [f.key, v === undefined || v === null ? "" : typeof v === "number" ? String(v).replace(".", ",") : String(v)];
    })));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: string) => { setValues((s) => ({ ...s, [k]: v })); if (errors[k]) setErrors((e) => Object.fromEntries(Object.entries(e).filter(([key]) => key !== k))); };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const r = await save(table, { ...values, id: initial?.id });
    setBusy(false);
    if (r.ok) {
      toast("ok", `${def.singular[0].toUpperCase()}${def.singular.slice(1)} ${def.fem ? "salva" : "salvo"}.`);
      onSaved?.(r.row);
      onClose();
    } else {
      setErrors(r.errors);
      if (r.message) toast("error", r.message);
      else {
        const first = fields.find((f) => r.errors[f.key]);
        if (first) document.getElementById(`f-${table}-${first.key}`)?.focus();
      }
    }
  }

  return (
    <Dialog open onClose={onClose} wide={fields.length > 6}
      title={title ?? `${initial ? "Editar" : def.fem ? "Nova" : "Novo"} ${def.singular}`}
      footer={<>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="primary" loading={busy} onClick={(e) => (e.currentTarget.closest("[role=dialog]")?.querySelector("form") as HTMLFormElement)?.requestSubmit()}>Salvar</Button>
      </>}>
      <form onSubmit={submit} noValidate className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3.5">
        {fields.map((f) => {
          const id = `f-${table}-${f.key}`;
          const common = {
            id, value: values[f.key], "aria-invalid": !!errors[f.key], "aria-describedby": `${id}-d`,
            onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => set(f.key, e.target.value),
            className: "input",
          };
          const refRows = f.type === "ref" ? (db[f.ref!] as unknown as Row[]).filter((r) => !(table === f.ref && r.id === initial?.id)) : [];
          return (
            <div key={f.key} className={cx((f.wide || f.type === "longtext") && "sm:col-span-2")}>
              <label htmlFor={id} className="label">{f.label}{f.required ? <span className="text-neg" aria-hidden> *</span> : null}</label>
              {f.type === "longtext" ? <textarea {...common} placeholder={f.placeholder} rows={2} />
                : f.type === "select" ? (
                  <select {...common}><option value="">Selecione…</option>{f.options!.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
                ) : f.type === "ref" ? (
                  <select {...common}>
                    <option value="">{refRows.length ? (f.required ? "Selecione…" : "Nenhum") : `Nenhum(a) ${TABLES[f.ref!].singular} cadastrado(a)`}</option>
                    {refRows.map((r) => <option key={r.id} value={r.id}>{TABLES[f.ref!].title(r, db)}</option>)}
                  </select>
                ) : (
                  <input {...common} placeholder={f.placeholder}
                    type={f.type === "date" ? "date" : f.type === "month" ? "month" : "text"}
                    inputMode={["number", "money", "percent"].includes(f.type) ? "decimal" : f.type === "int" ? "numeric" : undefined}
                    autoComplete="off" />
                )}
              <div id={`${id}-d`}>
                {errors[f.key] ? <p className="error">{errors[f.key]}</p> : f.help ? <p className="help">{f.help}</p> : null}
              </div>
            </div>
          );
        })}
      </form>
    </Dialog>
  );
}

/* ---------- Lista ---------- */
export interface ExtraColumn { label: string; num?: boolean; render: (row: Row) => ReactNode; sort?: (row: Row) => number | string }

export function Crud({ table, filter, defaults, extraColumns, rowActions, onRowClick, emptyHint, addLabel, columns, canEdit, toolbar }: {
  table: TableKey;
  filter?: (row: Row) => boolean;
  defaults?: Record<string, unknown>;
  extraColumns?: ExtraColumn[];
  rowActions?: (row: Row) => ReactNode;
  onRowClick?: (row: Row) => void;
  emptyHint?: ReactNode;
  addLabel?: string;
  columns?: string[];
  canEdit?: (row: Row) => boolean;
  toolbar?: ReactNode;
}) {
  const def: TableDef = TABLES[table];
  const { db, remove } = useStore();
  const toast = useToast();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);
  const [editing, setEditing] = useState<Row | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<Row | null>(null);

  const cols = useMemo(
    () => (columns ? columns.map((k) => def.fields.find((f) => f.key === k)!) : def.fields.filter((f) => f.list)),
    [def, columns],
  );
  const all = (db[table] as unknown as Row[]).filter((r) => !filter || filter(r));
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let out = needle ? all.filter((r) => cols.some((c) => cellText(c, r[c.key], db).toLowerCase().includes(needle))) : [...all];
    if (sort) {
      const fd = cols.find((c) => c.key === sort.key);
      const ex = extraColumns?.find((c) => c.label === sort.key);
      const val = (r: Row) => (ex?.sort ? ex.sort(r) : fd ? (typeof r[fd.key] === "number" ? (r[fd.key] as number) : cellText(fd, r[fd.key], db)) : "");
      out.sort((a, b) => { const x = val(a), y = val(b); return (typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "pt-BR")) * sort.dir; });
    } else out = out.reverse();
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all.length, db, q, sort, cols]);

  const Th = ({ k, label, num }: { k: string; label: string; num?: boolean }) => (
    <th className={cx(num && "r")} aria-sort={sort?.key === k ? (sort.dir === 1 ? "ascending" : "descending") : undefined}>
      <button type="button" onClick={() => setSort((s) => (s?.key === k ? (s.dir === 1 ? { key: k, dir: -1 } : null) : { key: k, dir: 1 }))}>
        {label}{sort?.key === k ? (sort.dir === 1 ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : null}
      </button>
    </th>
  );
  const isNum = (f: FieldDef) => ["number", "int", "money", "percent"].includes(f.type);

  return (
    <section className="solid">
      <div className="flex flex-wrap items-center gap-2 p-3 border-b border-line">
        <div className="relative flex-1 basis-48 min-w-0">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" aria-hidden />
          <input className="input !pl-9" placeholder={`Buscar em ${def.plural}`} aria-label={`Buscar em ${def.plural}`} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {toolbar}
        <Button variant="primary" onClick={() => setEditing(null)}><Plus size={16} />{addLabel ?? `${def.fem ? "Nova" : "Novo"} ${def.singular}`}</Button>
      </div>
      {all.length === 0 ? (
        <Empty title={`Nenhum(a) ${def.singular} ainda`} action={<Button variant="primary" onClick={() => setEditing(null)}><Plus size={16} />Cadastrar</Button>}>{emptyHint}</Empty>
      ) : rows.length === 0 ? (
        <Empty title="Nada encontrado">Nenhum registro corresponde a “{q}”.</Empty>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr>
              {cols.map((c) => <Th key={c.key} k={c.key} label={c.label} num={isNum(c)} />)}
              {extraColumns?.map((c) => (c.sort ? <Th key={c.label} k={c.label} label={c.label} num={c.num} /> : <th key={c.label} className={cx(c.num && "r")}>{c.label}</th>))}
              <th>Origem</th><th><span className="sr-only">Ações</span></th>
            </tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className={cx(onRowClick && "cursor-pointer")} onClick={onRowClick ? () => onRowClick(r) : undefined}>
                  {cols.map((c, i) => (
                    <td key={c.key} className={cx(isNum(c) && "r", i === 0 && "font-medium", c.type === "longtext" && "max-w-[280px] text-ink-2")}>
                      {i === 0 && onRowClick ? (
                        <button type="button" className="text-left hover:text-[var(--accent-ink)] font-medium" onClick={(e) => { e.stopPropagation(); onRowClick(r); }}>{cellText(c, r[c.key], db)}</button>
                      ) : cellText(c, r[c.key], db)}
                    </td>
                  ))}
                  {extraColumns?.map((c) => <td key={c.label} className={cx(c.num && "r")}>{c.render(r)}</td>)}
                  <td><SourcePill source={r.source} /></td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      {rowActions?.(r)}
                      {!canEdit || canEdit(r) ? (<>
                        <Button variant="plain" size="sm" icon aria-label={`Editar ${def.title(r, db)}`} title="Editar" onClick={() => setEditing(r)}><Pencil size={15} /></Button>
                        <Button variant="plain" size="sm" icon aria-label={`Excluir ${def.title(r, db)}`} title="Excluir" onClick={() => setDeleting(r)}><Trash2 size={15} /></Button>
                      </>) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <EntityForm table={table} open={editing !== undefined} initial={editing} defaults={defaults} onClose={() => setEditing(undefined)} />
      <Confirm open={!!deleting} onClose={() => setDeleting(null)} title={`Excluir ${def.singular}?`}
        onConfirm={async () => {
          const r = await remove(table, deleting!.id);
          if (r.ok) toast("ok", `${def.singular[0].toUpperCase()}${def.singular.slice(1)} ${def.fem ? "excluída" : "excluído"}.`); else toast("error", r.message);
          setDeleting(null);
        }}>
        {deleting ? <>“{def.title(deleting, db)}” será removido(a). A exclusão fica registrada na auditoria.</> : null}
      </Confirm>
    </section>
  );
}
