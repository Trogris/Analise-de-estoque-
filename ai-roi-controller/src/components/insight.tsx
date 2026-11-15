"use client";
import { ArrowDownRight, ArrowUpRight, ChevronRight, CircleHelp, Minus } from "lucide-react";
import type { ReactNode } from "react";
import { SourcePill } from "@/components/crud";
import { COST_CATEGORIES } from "@/data/schema";
import { useStore } from "@/data/store";
import { capacityOf, hoursSavedOf, type Indicator, type Summary } from "@/domain/engine";
import { periodLabel } from "@/domain/period";
import { fmt, indicatorText, type Fmt } from "@/lib/format";
import { cx, Drawer, Pill } from "./ui";

/** Valor de indicador: número quando há dados; estado explicado quando não há. */
export function IndicatorValue({ value, format, className }: { value: Indicator | number; format: Fmt; className?: string }) {
  if (typeof value === "number") return <span className={cx("num", className)}>{format(value)}</span>;
  const t = indicatorText(value, format);
  if (t.ok) return <span className={cx("num", className)}>{t.text}</span>;
  return <span className="inline-flex items-center gap-1 text-ink-3 font-medium text-[0.62em] leading-tight" title={t.hint}>{t.text}<CircleHelp size={13} aria-hidden /><span className="sr-only">{t.hint}</span></span>;
}

export function Delta({ cur, prev, invert, neutral, mode = "pct" }: { cur: number | null; prev: number | null; invert?: boolean; neutral?: boolean; mode?: "pct" | "pp" }) {
  if (cur === null || prev === null || (mode === "pct" && prev === 0)) return <span className="text-ink-3 text-[12.5px]">Sem período anterior para comparar</span>;
  const d = mode === "pp" ? cur - prev : (cur - prev) / Math.abs(prev);
  const flat = Math.abs(d) < 0.0005;
  const good = invert ? d < 0 : d > 0;
  const Icon = flat ? Minus : d > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-3">
      <span className={cx("inline-flex items-center gap-0.5 font-semibold num", flat || neutral ? "text-ink-2" : good ? "text-pos" : "text-neg")}>
        <Icon size={14} aria-hidden />{d > 0 ? "+" : ""}{mode === "pp" ? fmt.pp(d) : fmt.pct(d)}
      </span>
      vs. período anterior
    </span>
  );
}

export function Kpi({ label, icon, value, format, sub, delta, onTrace, tone }: {
  label: string; icon: ReactNode; value: Indicator | number; format: Fmt; sub?: ReactNode; delta?: ReactNode; onTrace?: () => void; tone?: "pos" | "neg";
}) {
  const body = (
    <>
      <div className="flex items-center gap-2 text-ink-2 text-[13px] font-medium">
        <span className="grid place-items-center w-7 h-7 rounded-[9px] bg-[var(--accent-soft)] text-[var(--accent-ink)] flex-none">{icon}</span>
        <span className="flex-1 min-w-0 leading-tight">{label}</span>
        {onTrace ? <ChevronRight size={15} className="text-ink-3 flex-none opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity" aria-hidden /> : null}
      </div>
      <div className={cx("text-[25px] sm:text-[28px] font-semibold tracking-tight leading-none mt-3 min-h-[30px] flex items-center", tone === "pos" && "text-pos", tone === "neg" && "text-neg")}>
        <IndicatorValue value={value} format={format} />
      </div>
      <div className="mt-2 min-h-[18px] text-[12.5px] text-ink-3 leading-snug">{delta ?? sub}</div>
      {delta && sub ? <div className="text-[12.5px] text-ink-3 leading-snug mt-0.5">{sub}</div> : null}
    </>
  );
  return onTrace ? (
    <button type="button" onClick={onTrace} aria-label={`${label}: ver origem dos dados`}
      className="glass group text-left p-4 transition-transform duration-200 hover:-translate-y-0.5 focus-visible:-translate-y-0.5">{body}</button>
  ) : <div className="glass p-4">{body}</div>;
}

function Formula({ children }: { children: ReactNode }) {
  return <div className="rounded-[14px] bg-[var(--sunken)] border border-line p-3.5 text-[14px] leading-relaxed num">{children}</div>;
}
function Section({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  return (
    <section className="mt-5">
      <h3 className="text-[13px] font-semibold text-ink-2 mb-2">{title} <span className="text-ink-3 font-normal">({count})</span></h3>
      {count ? <div className="solid !shadow-none table-wrap max-h-[340px] overflow-y-auto">{children}</div> : <p className="text-ink-3 text-sm">Nenhum registro no período e filtros selecionados.</p>}
    </section>
  );
}

export type TraceKind = "roi" | "investment" | "benefit" | "hours" | "quality" | "adoption";
const TITLES: Record<TraceKind, string> = {
  roi: "ROI consolidado", investment: "Investimento total em IA", benefit: "Benefício financeiro realizado",
  hours: "Horas produtivas liberadas", quality: "Entregas e custo por entrega aprovada", adoption: "Adoção",
};

/** Origem do indicador: fórmula com os números usados e os lançamentos que a compõem. */
export function TraceDrawer({ kind, summary, onClose }: { kind: TraceKind | null; summary: Summary; onClose: () => void }) {
  const { db } = useStore();
  if (!kind) return null;
  const s = summary;
  const name = (list: { id: string; name: string }[], id?: string) => list.find((x) => x.id === id)?.name ?? "—";
  const validated = s.benefits.filter((b) => b.status === "validated");
  const pending = s.benefits.filter((b) => b.status === "submitted" || b.status === "draft");
  const costs = (
    <Section title="Custos que compõem o investimento" count={s.lines.length}>
      <table className="table"><thead><tr><th>Mês</th><th>Origem</th><th className="r">Valor</th></tr></thead><tbody>
        {s.lines.slice(0, 300).map((l, i) => (
          <tr key={i}>
            <td className="whitespace-nowrap">{periodLabel(l.period)}</td>
            <td>
              <div className="font-medium">{l.origin.label}</div>
              <div className="text-ink-3 text-[12.5px]">{COST_CATEGORIES.find(([k]) => k === l.category)?.[1]} · {name(db.departments, l.departmentId) === "—" ? "Sem departamento" : name(db.departments, l.departmentId)}{l.origin.rationale ? ` · ${l.origin.rationale}` : ""}</div>
              <div className="mt-1"><SourcePill source={l.source} /></div>
            </td>
            <td className="r whitespace-nowrap">{fmt.money(l.amount)}</td>
          </tr>
        ))}
      </tbody></table>
    </Section>
  );
  const benefits = (list: typeof validated, title: string) => (
    <Section title={title} count={list.length}>
      <table className="table"><thead><tr><th>Mês</th><th>Benefício</th><th className="r">Valor</th></tr></thead><tbody>
        {list.map((b) => (
          <tr key={b.id}>
            <td className="whitespace-nowrap">{periodLabel(b.period)}</td>
            <td>
              <div className="font-medium">{b.description || "Benefício"}</div>
              <div className="text-ink-3 text-[12.5px]">{name(db.departments, b.departmentId)}{b.evidence ? ` · Evidência: ${b.evidence}` : " · Sem evidência"}{b.validatedBy ? ` · Validado por ${b.validatedBy}` : ""}</div>
              <div className="mt-1"><SourcePill source={b.source} /></div>
            </td>
            <td className="r whitespace-nowrap">{fmt.money(b.amount)}</td>
          </tr>
        ))}
      </tbody></table>
    </Section>
  );
  const measurements = (
    <Section title="Medições de produtividade" count={s.measurements.length}>
      <table className="table"><thead><tr><th>Mês</th><th>Processo</th><th className="r">Horas</th><th className="r">Capacidade</th></tr></thead><tbody>
        {s.measurements.map((m) => (
          <tr key={m.id}>
            <td className="whitespace-nowrap">{periodLabel(m.period)}</td>
            <td>
              <div className="font-medium">{name(db.processes, m.processId)}</div>
              <div className="text-ink-3 text-[12.5px] num">({fmt.num(m.minutesBefore)} − {fmt.num(m.minutesAfter)}) min × {fmt.int(m.activities)} atividades · {fmt.money(m.hourlyCost)}/h{m.deliveriesTotal !== undefined ? ` · ${fmt.int(m.deliveriesApproved ?? 0)} de ${fmt.int(m.deliveriesTotal)} aprovadas` : ""}</div>
              <div className="mt-1"><SourcePill source={m.source} /></div>
            </td>
            <td className="r whitespace-nowrap">{fmt.hours(hoursSavedOf(m))}</td>
            <td className="r whitespace-nowrap">{fmt.money(capacityOf(m))}</td>
          </tr>
        ))}
      </tbody></table>
    </Section>
  );
  const it = (i: Indicator, f: Fmt) => indicatorText(i, f);
  return (
    <Drawer open onClose={onClose} title={TITLES[kind]} subtitle={`Origem do indicador · ${periodLabel(s.scope.from)} a ${periodLabel(s.scope.to)}`}>
      {kind === "roi" ? (<>
        <Formula>
          <b>ROI</b> = (benefício validado − investimento) ÷ investimento<br />
          = ({fmt.money(s.benefitValidated)} − {fmt.money(s.investment)}) ÷ {fmt.money(s.investment)} = <b>{it(s.roi, fmt.pct).text}</b>
          {s.roi.state !== "ok" ? <div className="text-ink-2 mt-1">{it(s.roi, fmt.pct).hint}</div> : null}
          <div className="mt-2 text-ink-2">Resultado líquido: {it(s.net, fmt.money).text} · Benefício por real investido: {it(s.benefitPerReal, fmt.ratio).text}</div>
        </Formula>
        <p className="text-[13.5px] text-ink-2 mt-3">Só entram benefícios <b>validados</b>. A capacidade liberada ({fmt.money(s.capacityValue)}) não é somada: ela mostra tempo disponível, não dinheiro em caixa.</p>
        {benefits(validated, "Benefícios validados")}{costs}
      </>) : kind === "investment" ? (<>
        <Formula>
          <b>Investimento</b> = licenças + APIs + implantação + treinamento + consultoria + outros = <b>{fmt.money(s.investment)}</b>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 mt-2 text-ink-2">
            {COST_CATEGORIES.map(([k, l]) => <div key={k} className="flex justify-between gap-2"><span>{l}</span><span>{fmt.money(s.byCategory[k as keyof typeof s.byCategory])}</span></div>)}
          </div>
          {s.unassigned > 0 ? <div className="mt-2 text-[var(--warn)]">{fmt.money(s.unassigned)} sem departamento atribuído.</div> : null}
        </Formula>
        {costs}
      </>) : kind === "benefit" ? (<>
        <Formula><b>Benefício realizado</b> = soma dos benefícios validados = <b>{fmt.money(s.benefitValidated)}</b>
          <div className="text-ink-2 mt-1">Fora do cálculo: {fmt.money(s.benefitPending)} aguardando validação e {fmt.money(s.benefitDraft)} em rascunho.</div>
        </Formula>
        {benefits(validated, "Benefícios validados")}{benefits(pending, "Ainda não validados (fora do ROI)")}
      </>) : kind === "hours" ? (<>
        <Formula>
          <b>Horas liberadas</b> = (tempo antes − tempo com IA) × atividades = <b>{fmt.hours(s.hoursSaved)}</b><br />
          <b>Capacidade liberada</b> = horas × custo total da hora = <b>{fmt.money(s.capacityValue)}</b>
          <div className="text-ink-2 mt-1">Capacidade liberada não é economia em caixa. Taxa de realização (benefício validado ÷ capacidade): {it(s.realizationRate, fmt.pct).text}.</div>
        </Formula>
        {measurements}
      </>) : kind === "quality" ? (<>
        <Formula>
          <b>Taxa de aprovação</b> = aprovadas ÷ totais = {fmt.int(s.deliveriesApproved)} ÷ {fmt.int(s.deliveriesTotal)} = <b>{it(s.approvalRate, fmt.pct).text}</b><br />
          <b>Custo por entrega aprovada</b> = investimento ÷ aprovadas = {fmt.money(s.investment)} ÷ {fmt.int(s.deliveriesApproved)} = <b>{it(s.costPerApproved, fmt.money).text}</b>
          {s.costPerApproved.state !== "ok" ? <div className="text-ink-2 mt-1">{it(s.costPerApproved, fmt.money).hint}</div> : null}
          <div className="text-ink-2 mt-1">Aproveitamento: {it(s.usageRate, fmt.pct).text} · Redução de retrabalho: {it(s.reworkReduction, fmt.pp).text}</div>
        </Formula>
        {measurements}
      </>) : (<>
        <Formula>
          <b>Taxa de adoção</b> = usuários ativos ÷ licenças contratadas{s.activeUsers !== null && s.seats ? <> = {fmt.int(s.activeUsers)} ÷ {fmt.int(s.seats)}</> : null} = <b>{it(s.adoptionRate, fmt.pct).text}</b>
          {s.adoptionRate.state !== "ok" ? <div className="text-ink-2 mt-1">{it(s.adoptionRate, fmt.pct).hint}</div> : null}
        </Formula>
        <p className="text-[13.5px] text-ink-2 mt-3">Considera o mês mais recente com usuários ativos informados e apenas ferramentas com esse dado. Nada é estimado: sem registro de uso, a adoção fica indisponível.</p>
        <div className="mt-3"><Pill tone="info">Registros de uso ficam em Ferramentas → Uso</Pill></div>
      </>)}
    </Drawer>
  );
}
