"use client";
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useStore } from "@/data/store";
import { dataRange, type Scope } from "@/domain/engine";
import { addMonths, isPeriod, monthsBetween, toPeriod } from "@/domain/period";

type Preset = "3" | "6" | "12" | "all" | "custom";
interface FilterState { preset: Preset; from: string; to: string; departmentId: string; toolId: string; processId: string }
interface FiltersCtx extends FilterState { scope: Scope; set: (p: Partial<FilterState>) => void; hasData: boolean }
const Ctx = createContext<FiltersCtx | null>(null);
export const useFilters = () => useContext(Ctx)!;

export function FiltersProvider({ children }: { children: ReactNode }) {
  const { db } = useStore();
  const [state, setState] = useState<FilterState>({ preset: "12", from: "", to: "", departmentId: "", toolId: "", processId: "" });
  const value = useMemo<FiltersCtx>(() => {
    const range = dataRange(db);
    const today = toPeriod(new Date());
    // O período termina no último mês com dados (nunca depois do mês atual).
    const end = range ? (range.to < today ? range.to : today) : today;
    let from: string, to: string;
    if (state.preset === "custom" && isPeriod(state.from) && isPeriod(state.to) && state.from <= state.to) { from = state.from; to = state.to; }
    else if (state.preset === "all" && range) { from = range.from; to = end; }
    else { const n = state.preset === "3" ? 3 : state.preset === "6" ? 6 : 12; to = end; from = addMonths(end, -(n - 1)); }
    if (monthsBetween(from, to) > 120) from = addMonths(to, -119);
    const ok = (list: { id: string }[], id: string) => (id && list.some((x) => x.id === id) ? [id] : undefined);
    return {
      ...state, from, to, hasData: !!range,
      scope: { from, to, departmentIds: ok(db.departments, state.departmentId), toolIds: ok(db.tools, state.toolId), processIds: ok(db.processes, state.processId) },
      set: (p) => setState((s) => ({ ...s, ...p })),
    };
  }, [db, state]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function FilterBar({ process = true, dimensions = true }: { process?: boolean; dimensions?: boolean }) {
  const { db } = useStore();
  const f = useFilters();
  const presets: [Preset, string][] = [["3", "3 meses"], ["6", "6 meses"], ["12", "12 meses"], ["all", "Tudo"], ["custom", "Personalizado"]];
  const procs = db.processes.filter((p) => (!f.departmentId || p.departmentId === f.departmentId) && (!f.toolId || p.toolId === f.toolId));
  const active = !!(f.departmentId || f.toolId || f.processId);
  return (
    <div className="glass no-print flex flex-wrap items-center gap-2 p-2">
      <div className="seg" role="group" aria-label="Período">
        {presets.map(([v, l]) => (
          <button key={v} type="button" aria-pressed={f.preset === v}
            onClick={() => f.set(v === "custom" ? { preset: v, from: f.from || f.scope.from, to: f.to || f.scope.to } : { preset: v })}>{l}</button>
        ))}
      </div>
      {f.preset === "custom" ? (
        <div className="flex items-center gap-1.5">
          <input type="month" className="input !w-[150px]" aria-label="De" value={f.from} max={f.to || undefined} onChange={(e) => f.set({ from: e.target.value })} />
          <span className="text-ink-3 text-sm">até</span>
          <input type="month" className="input !w-[150px]" aria-label="Até" value={f.to} min={f.from || undefined} onChange={(e) => f.set({ to: e.target.value })} />
        </div>
      ) : null}
      {dimensions ? <div className="flex flex-wrap gap-2 flex-1 basis-64 justify-end">
        <select className="input !w-auto flex-1 basis-40 sm:max-w-[220px]" aria-label="Departamento" value={f.departmentId} onChange={(e) => f.set({ departmentId: e.target.value, processId: "" })}>
          <option value="">Todos os departamentos</option>
          {db.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select className="input !w-auto flex-1 basis-40 sm:max-w-[220px]" aria-label="Ferramenta" value={f.toolId} onChange={(e) => f.set({ toolId: e.target.value, processId: "" })}>
          <option value="">Todas as ferramentas</option>
          {db.tools.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        {process ? (
          <select className="input !w-auto flex-1 basis-40 sm:max-w-[220px]" aria-label="Processo" value={f.processId} onChange={(e) => f.set({ processId: e.target.value })}>
            <option value="">Todos os processos</option>
            {procs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        ) : null}
        {active ? <button type="button" className="btn btn-plain btn-sm self-center" onClick={() => f.set({ departmentId: "", toolId: "", processId: "" })}>Limpar</button> : null}
      </div> : null}
    </div>
  );
}
