"use client";
import { Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { BeforeAfterChart, Legend } from "@/components/charts";
import { Crud, EntityForm } from "@/components/crud";
import { FilterBar, useFilters } from "@/components/filters";
import { IndicatorValue } from "@/components/insight";
import { Button, Drawer, PageHeader, Pill, Segmented, useQueryParam } from "@/components/ui";
import type { Row } from "@/data/schema";
import { useStore } from "@/data/store";
import { groupBy, hoursSavedOf, summarize, valueOf } from "@/domain/engine";
import { addMonths, periodLabel, toPeriod } from "@/domain/period";
import type { Process } from "@/domain/types";
import { fmt, indicatorText } from "@/lib/format";

function ProcessDetail({ process, onClose }: { process: Process; onClose: () => void }) {
  const { db } = useStore();
  const { scope } = useFilters();
  const [adding, setAdding] = useState(false);
  const ms = db.measurements.filter((m) => m.processId === process.id).sort((a, b) => a.period.localeCompare(b.period));
  const s = useMemo(() => summarize(db, { from: scope.from, to: scope.to, processIds: [process.id] }), [db, scope.from, scope.to, process.id]);
  const last = ms[ms.length - 1];
  const next = last ? addMonths(last.period, 1) : toPeriod(new Date());
  const stat = (label: string, node: React.ReactNode, hint?: string) => (
    <div className="rounded-[14px] bg-[var(--sunken)] border border-line p-3">
      <div className="text-[12.5px] text-ink-3">{label}</div>
      <div className="text-[19px] font-semibold mt-0.5 min-h-[26px] flex items-center">{node}</div>
      {hint ? <div className="text-[12px] text-ink-3 mt-0.5">{hint}</div> : null}
    </div>
  );
  return (
    <Drawer open onClose={onClose} title={process.name}
      subtitle={<>{db.departments.find((d) => d.id === process.departmentId)?.name} · {db.tools.find((t) => t.id === process.toolId)?.name} · desde {fmt.date(process.startedOn)}</>}>
      <div className="grid grid-cols-2 gap-3">
        {stat("Horas liberadas", <IndicatorValue value={s.hoursSaved} format={fmt.hours} />, `${periodLabel(scope.from)} a ${periodLabel(scope.to)}`)}
        {stat("Capacidade liberada", <IndicatorValue value={s.capacityValue} format={fmt.moneyShort} />, "Não é caixa")}
        {stat("Benefício validado", <IndicatorValue value={s.benefitValidated} format={fmt.moneyShort} />, s.benefitPending ? `${fmt.moneyShort(s.benefitPending)} aguardando validação` : undefined)}
        {stat("ROI do processo", <IndicatorValue value={s.roi} format={fmt.pct} />, s.missingCostShare.length ? "Informe o % do custo da ferramenta" : undefined)}
        {stat("Custo por entrega aprovada", <IndicatorValue value={s.costPerApproved} format={fmt.money} />)}
        {stat("Taxa de aprovação", <IndicatorValue value={s.approvalRate} format={fmt.pct} />, valueOf(s.reworkReduction) !== null ? `Retrabalho: ${valueOf(s.reworkReduction)! >= 0 ? "−" : "+"}${fmt.pp(Math.abs(valueOf(s.reworkReduction)!))}` : undefined)}
      </div>

      <h3 className="text-[13px] font-semibold text-ink-2 mt-5 mb-2">Antes × com IA — tempo médio por atividade (min)</h3>
      {ms.length ? (
        <div className="solid !shadow-none p-3">
          <Legend items={[["Com IA", "var(--chart-1)", true], ["Antes da IA", "var(--chart-2)", true]]} />
          <BeforeAfterChart rows={ms.map((m) => ({ period: m.period, before: m.minutesBefore, after: m.minutesAfter }))} />
        </div>
      ) : <p className="text-ink-3 text-sm">Sem medições. Registre a primeira para comparar o antes e o depois.</p>}

      <div className="flex items-center gap-3 mt-5 mb-2">
        <h3 className="text-[13px] font-semibold text-ink-2 flex-1">Medições mensais ({ms.length})</h3>
        <Button size="sm" variant="primary" onClick={() => setAdding(true)}><Plus size={15} />Registrar medição</Button>
      </div>
      {ms.length ? (
        <div className="solid !shadow-none table-wrap">
          <table className="table"><thead><tr><th>Mês</th><th className="r">Atividades</th><th className="r">Min antes → com IA</th><th className="r">Horas</th><th className="r">Aprovadas</th></tr></thead>
            <tbody>{[...ms].reverse().map((m) => (
              <tr key={m.id}><td>{periodLabel(m.period)}</td><td className="r">{fmt.int(m.activities)}</td><td className="r">{fmt.num(m.minutesBefore)} → {fmt.num(m.minutesAfter)}</td>
                <td className="r">{hoursSavedOf(m) < 0 ? <Pill tone="neg">{fmt.hours(hoursSavedOf(m))}</Pill> : fmt.hours(hoursSavedOf(m))}</td>
                <td className="r">{m.deliveriesTotal !== undefined && m.deliveriesApproved !== undefined ? `${fmt.int(m.deliveriesApproved)} de ${fmt.int(m.deliveriesTotal)}` : "—"}</td></tr>
            ))}</tbody></table>
        </div>
      ) : null}
      {process.description || process.notes ? (
        <div className="mt-5 text-[14px] text-ink-2"><h3 className="text-[13px] font-semibold mb-1">Descrição e evidências</h3><p className="whitespace-pre-wrap">{[process.description, process.notes].filter(Boolean).join("\n\n")}</p></div>
      ) : null}
      <EntityForm table="measurements" open={adding} onClose={() => setAdding(false)} title={`Registrar medição · ${process.name}`}
        defaults={{ processId: process.id, period: next, minutesBefore: process.baselineMinutes, hourlyCost: process.hourlyCost, activities: process.monthlyFrequency }} />
    </Drawer>
  );
}

export default function Processos() {
  const { db } = useStore();
  const { scope } = useFilters();
  const [tab, setTab] = useQueryParam("aba", "processos");
  const [openId, setOpenId] = useQueryParam("id", "");
  const byProc = useMemo(() => new Map(groupBy(db, { ...scope, processIds: undefined }, "process").map((g) => [g.id, g.summary])), [db, scope]);
  const inScope = (p: Row) => (!scope.departmentIds || scope.departmentIds.includes(String(p.departmentId))) && (!scope.toolIds || scope.toolIds.includes(String(p.toolId)));
  const open = db.processes.find((p) => p.id === openId);
  useEffect(() => { if (openId && db.processes.length && !open) setOpenId(""); }, [openId, open, db.processes.length, setOpenId]);
  return (
    <>
      <PageHeader title="Processos com IA" subtitle="Onde a IA é aplicada, quanto tempo cada atividade levava e quanto leva agora. Clique em um processo para ver o antes e o depois." />
      <div className="flex flex-wrap gap-3 items-center">
        <Segmented label="Seção" value={tab as "processos" | "medicoes"} onChange={setTab} options={[["processos", "Processos"], ["medicoes", "Medições"]]} />
      </div>
      <FilterBar process={false} />
      {tab === "processos" ? (
        <Crud table="processes" filter={inScope} columns={["name", "departmentId", "toolId"]} onRowClick={(r) => setOpenId(r.id)}
          emptyHint="Exemplo: no RH, “Elaboração de descrições de cargos” com ChatGPT. Informe o tempo médio antes da IA e o custo da hora; as medições mensais mostram o ganho."
          extraColumns={[
            { label: "Horas liberadas", num: true, sort: (r) => byProc.get(r.id)?.hoursSaved ?? 0, render: (r) => { const h = byProc.get(r.id)?.hoursSaved ?? 0; return h < 0 ? <Pill tone="neg">{fmt.hours(h)}</Pill> : fmt.hours(h); } },
            { label: "Capacidade", num: true, sort: (r) => byProc.get(r.id)?.capacityValue ?? 0, render: (r) => fmt.moneyShort(byProc.get(r.id)?.capacityValue ?? 0) },
            { label: "Benefício validado", num: true, sort: (r) => byProc.get(r.id)?.benefitValidated ?? 0, render: (r) => fmt.moneyShort(byProc.get(r.id)?.benefitValidated ?? 0) },
            {
              label: "Aprovação", num: true, sort: (r) => valueOf(byProc.get(r.id)?.approvalRate ?? { state: "insufficient", missing: [] }) ?? -1,
              render: (r) => { const s = byProc.get(r.id); const t = s ? indicatorText(s.approvalRate, fmt.pct) : null; return t?.ok ? t.text : <span className="text-ink-3">—</span>; },
            },
          ]} />
      ) : (
        <Crud table="measurements" filter={(m) => { const p = db.processes.find((x) => x.id === m.processId) as unknown as Row | undefined; return !!p && inScope(p) && String(m.period) >= scope.from && String(m.period) <= scope.to; }}
          addLabel="Registrar medição" emptyHint="Uma medição por processo e por mês: atividades realizadas, tempo médio com IA e entregas aprovadas."
          extraColumns={[{ label: "Horas liberadas", num: true, sort: (r) => hoursSavedOf(r as never), render: (r) => { const h = hoursSavedOf(r as never); return h < 0 ? <Pill tone="neg">{fmt.hours(h)}</Pill> : fmt.hours(h); } }]} />
      )}
      {open ? <ProcessDetail process={open} onClose={() => setOpenId("")} /> : null}
    </>
  );
}
