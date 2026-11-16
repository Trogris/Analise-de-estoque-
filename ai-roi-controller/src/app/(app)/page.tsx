"use client";
import {
  ArrowRight, BadgeCheck, Play, Check, CircleDollarSign, Clock, Lightbulb, PackageCheck, PiggyBank, Receipt, Sparkles, Users, Workflow,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Legend, MoneyChart, RoiChart } from "@/components/charts";
import { FilterBar, useFilters } from "@/components/filters";
import { Delta, IndicatorValue, Kpi, TraceDrawer, type TraceKind } from "@/components/insight";
import { Button, cx, PageHeader, Pill, Segmented, useToast } from "@/components/ui";
import { buildDemo } from "@/data/demo";
import { COST_CATEGORIES } from "@/data/schema";
import { useStore } from "@/data/store";
import { groupBy, monthly, previousScope, summarize, valueOf } from "@/domain/engine";
import { buildInsights } from "@/domain/insights";
import { periodLabel } from "@/domain/period";
import { fmt, indicatorText } from "@/lib/format";

const TONE = { pos: "pos", warn: "warn", neg: "neg", info: "info" } as const;

function Onboarding() {
  const { db, commit } = useStore();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const steps: [string, string, string, boolean][] = [
    ["Cadastre um departamento", "A análise é feita por departamento, não por pessoa.", "/departamentos", db.departments.length > 0],
    ["Cadastre a ferramenta de IA e o contrato", "Licenças, valor mensal e como o custo é rateado.", "/ferramentas", db.tools.length > 0 && (db.subscriptions.length > 0 || db.costs.length > 0)],
    ["Registre um processo que usa IA", "Com o tempo médio antes da IA e o custo da hora.", "/processos", db.processes.length > 0],
    ["Informe a primeira medição", "Atividades do mês, tempo com IA e entregas aprovadas.", "/processos?aba=medicoes", db.measurements.length > 0],
    ["Lance e valide um benefício financeiro", "Só benefício validado entra no ROI.", "/financeiro?aba=beneficios", db.benefits.some((b) => b.status === "validated")],
  ];
  const done = steps.filter((s) => s[3]).length;
  if (done === steps.length) return null;
  const empty = done === 0;
  return (
    <section className="glass p-5 sm:p-6">
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex-1 basis-72 min-w-0">
          <h2 className="text-[19px] font-semibold">{empty ? "Comece a medir o retorno da IA" : "Primeiros passos"}</h2>
          <p className="text-ink-2 mt-1 max-w-[62ch]">
            {empty ? "Ainda não há dados. Os indicadores aparecem conforme você cadastra — nada é estimado ou preenchido automaticamente." : `${done} de ${steps.length} concluídos. Complete os passos para ter o ROI calculado.`}
          </p>
        </div>
        {empty ? (
          <Button loading={busy} onClick={async () => {
            setBusy(true);
            const r = await commit(buildDemo());
            setBusy(false);
            toast(r.ok ? "info" : "error", r.ok ? "Dados fictícios carregados. Eles ficam identificados e podem ser removidos de uma vez." : r.message);
          }}><Sparkles size={16} />Explorar com dados de exemplo</Button>
        ) : null}
      </div>
      <ol className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        {steps.map(([title, hint, href, ok], i) => (
          <li key={title}>
            <Link href={href} className={cx("flex gap-3 h-full rounded-[14px] p-3 border transition-colors", ok ? "border-transparent bg-[var(--pos-soft)]" : "border-line bg-[var(--sunken)] hover:bg-[var(--hover)]")}>
              <span className={cx("grid place-items-center w-6 h-6 rounded-full text-xs font-semibold flex-none mt-0.5", ok ? "bg-[var(--pos)] text-[var(--solid)]" : "bg-solid border border-line text-ink-2")}>
                {ok ? <Check size={14} /> : i + 1}
              </span>
              <span className="min-w-0"><span className="block font-medium text-[14px] leading-snug">{title}</span><span className="block text-ink-3 text-[12.5px] mt-0.5">{hint}</span></span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default function Painel() {
  const { db } = useStore();
  const { scope, hasData } = useFilters();
  const [trace, setTrace] = useState<TraceKind | null>(null);
  const [chart, setChart] = useState<"money" | "roi">("money");

  const s = useMemo(() => summarize(db, scope), [db, scope]);
  const prev = useMemo(() => summarize(db, previousScope(scope)), [db, scope]);
  const series = useMemo(() => monthly(db, scope), [db, scope]);
  const depts = useMemo(() => groupBy(db, scope, "department"), [db, scope]);
  const tools = useMemo(() => groupBy(db, scope, "tool"), [db, scope]);
  const insights = useMemo(() => buildInsights(db, scope, new Date().toISOString().slice(0, 10)), [db, scope]);
  const hasPrev = prev.lines.length + prev.benefits.length + prev.measurements.length > 0;
  const p = <T,>(v: T) => (hasPrev ? v : null);

  const roiText = indicatorText(s.roi, fmt.pct);
  const roi = valueOf(s.roi);
  const maxDept = Math.max(1, ...depts.map((d) => Math.max(d.summary.investment, d.summary.benefitValidated)));
  const funnelMax = Math.max(s.capacityValue, s.benefitValidated + s.benefitPending, 1);
  const sources = useMemo(() => {
    const rows = [...db.costs, ...db.benefits, ...db.measurements, ...db.subscriptions];
    const count = (k: string) => rows.filter((r) => r.source === k).length;
    return { total: rows.length, manual: count("manual"), imported: count("import"), demo: count("demo") };
  }, [db]);
  const benefitsInScope = s.benefits.filter((b) => b.status !== "rejected");
  const withEvidence = benefitsInScope.filter((b) => b.evidence).length;

  return (
    <>
      <PageHeader eyebrow="Visão executiva" title={<>O retorno da sua IA, <span className="accent-word">em números.</span></>} subtitle={`Investimento, benefício validado e produtividade de ${periodLabel(scope.from)} a ${periodLabel(scope.to)}.`}
        actions={hasData ? <>
          <Link href="/apresentacao" className="btn btn-primary"><Play size={15} />Modo apresentação</Link>
          <Link href="/relatorio" className="btn btn-ghost">Gerar relatório<ArrowRight size={15} /></Link>
        </> : undefined} />
      <Onboarding />
      {hasData ? (<>
        <FilterBar />
        {depts.length > 1 ? (
          <div className="marquee glass !rounded-full py-2.5" aria-label="ROI por departamento">
            <div className="marquee-track" style={{ "--marquee-s": `${Math.max(28, depts.length * 8)}s` } as React.CSSProperties}>
              {[0, 1].map((copy) => (
                <div key={copy} className="flex" aria-hidden={copy === 1}>
                  {depts.map((d) => { const r = valueOf(d.summary.roi); return (
                    <span key={d.id} className="flex items-center gap-2.5 px-6 whitespace-nowrap text-[13.5px]">
                      <span className="eyebrow !text-ink-2">{d.name}</span>
                      <span className={cx("font-semibold num", r === null ? "text-ink-3" : r >= 0 ? "text-pos" : "text-neg")}>{r === null ? "sem ROI" : `${r >= 0 ? "+" : ""}${fmt.pct(r)}`}</span>
                      <span className="text-ink-3 num">{fmt.hours(d.summary.hoursSaved)}</span>
                      <span className="text-ink-3" aria-hidden>✦</span>
                    </span>); })}
                </div>
              ))}
            </div>
          </div>
        ) : null}
        <div className="enter flex flex-col gap-4 lg:gap-5">
          <div className="grid gap-4 lg:gap-5 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            <button type="button" onClick={() => setTrace("roi")} aria-label="ROI consolidado: ver origem dos dados" className="hero text-left p-6 sm:p-7 flex flex-col min-h-[330px] transition-transform duration-300 hover:-translate-y-1">
              <div className="flex items-center justify-between gap-3 relative z-[1]">
                <span className="text-[13px] font-semibold uppercase tracking-[0.08em] on-hero-2">ROI consolidado</span>
                <span className="hero-chip">{periodLabel(scope.from)} – {periodLabel(scope.to)}</span>
              </div>
              <div className="relative z-[1] mt-5">
                {roi !== null ? (
                  <div className="hero-num display text-[68px] sm:text-[92px] leading-[0.95] num">{roiText.text}</div>
                ) : (
                  <div><div className="text-[30px] sm:text-[34px] font-semibold leading-tight">{roiText.text}</div><p className="on-hero-2 mt-2 max-w-[40ch] text-[14.5px]">{roiText.hint}</p></div>
                )}
                {roi !== null ? (
                  <p className="on-hero-2 mt-3 text-[15px] max-w-[44ch]">
                    Cada R$ 1,00 investido retornou <b className="text-white">{indicatorText(s.benefitPerReal, fmt.ratio).text}</b> em benefício financeiro validado.
                  </p>
                ) : null}
              </div>
              <div className="relative z-[1] mt-auto pt-4"><RoiChart data={series} height={54} onHero /></div>
              <dl className="relative z-[1] grid grid-cols-3 gap-3 pt-3 border-t border-white/15 text-[13px]">
                {[["Resultado líquido", indicatorText(s.net, fmt.moneyShort).text], ["Payback", indicatorText(s.paybackMonths, fmt.months).text], ["Meses com ROI", `${series.filter((x) => x.summary.roi.state === "ok").length} de ${series.length}`]].map(([k, v]) => (
                  <div key={k}><dt className="on-hero-2">{k}</dt><dd className="font-semibold text-[15px] mt-0.5 num">{v}</dd></div>
                ))}
              </dl>
            </button>
            <div className="grid grid-cols-2 gap-4 lg:gap-5">
              <Kpi label="Investimento total em IA" icon={<CircleDollarSign size={16} />} value={s.investment} format={fmt.moneyShort} onTrace={() => setTrace("investment")} trend={series.map((m) => m.summary.investment)}
                delta={<Delta cur={s.investment} prev={p(prev.investment)} neutral />} />
              <Kpi label="Benefício financeiro realizado" icon={<PiggyBank size={16} />} value={s.benefitValidated} format={fmt.moneyShort} tone={s.benefitValidated > 0 ? "pos" : undefined} onTrace={() => setTrace("benefit")} trend={series.map((m) => m.summary.benefitValidated)}
                delta={<Delta cur={s.benefitValidated} prev={p(prev.benefitValidated)} />} sub={s.benefitPending > 0 ? `${fmt.moneyShort(s.benefitPending)} aguardando validação` : undefined} />
              <Kpi label="Horas produtivas liberadas" icon={<Clock size={16} />} value={s.hoursSaved} format={fmt.hours} tone={s.hoursSaved < 0 ? "neg" : undefined} onTrace={() => setTrace("hours")} trend={series.map((m) => (m.summary.measurements.length ? m.summary.hoursSaved : null))}
                delta={<Delta cur={s.hoursSaved} prev={p(prev.hoursSaved)} />} sub={`${fmt.moneyShort(s.capacityValue)} em capacidade (não é caixa)`} />
              <Kpi label="Custo por entrega aprovada" icon={<Receipt size={16} />} value={s.costPerApproved} format={fmt.money} onTrace={() => setTrace("quality")} trend={series.map((m) => valueOf(m.summary.costPerApproved))}
                delta={valueOf(s.costPerApproved) !== null ? <Delta cur={valueOf(s.costPerApproved)} prev={p(valueOf(prev.costPerApproved))} invert /> : undefined}
                sub={s.costPerApproved.state !== "ok" ? indicatorText(s.costPerApproved, fmt.money).hint : undefined} />
            </div>
          </div>

          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-5">
            <Kpi label="Processos com IA" icon={<Workflow size={16} />} value={s.processCount} format={fmt.int} sub={`${s.measuredProcessCount} com medição no período`} />
            <Kpi label="Entregas aprovadas" icon={<PackageCheck size={16} />} value={s.deliveriesApproved} format={fmt.int} onTrace={() => setTrace("quality")} sub={`de ${fmt.int(s.deliveriesTotal)} entregas`} />
            <Kpi label="Taxa de aprovação" icon={<BadgeCheck size={16} />} value={s.approvalRate} format={fmt.pct} onTrace={() => setTrace("quality")}
              delta={valueOf(s.approvalRate) !== null ? <Delta cur={valueOf(s.approvalRate)} prev={p(valueOf(prev.approvalRate))} mode="pp" /> : undefined}
              sub={s.approvalRate.state !== "ok" ? indicatorText(s.approvalRate, fmt.pct).hint : undefined} />
            <Kpi label="Taxa de adoção" icon={<Users size={16} />} value={s.adoptionRate} format={fmt.pct} onTrace={() => setTrace("adoption")}
              sub={s.adoptionRate.state === "ok" ? `${fmt.int(s.activeUsers!)} usuários ativos de ${fmt.int(s.seats!)} licenças` : indicatorText(s.adoptionRate, fmt.pct).hint} />
          </div>

          <div className="grid gap-4 lg:gap-5 xl:grid-cols-[minmax(0,8fr)_minmax(0,4fr)]">
            <section className="solid p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <div className="flex-1 basis-48"><h2 className="text-[16px] font-semibold">Evolução mensal</h2>
                  <p className="text-ink-3 text-[13px]">{chart === "money" ? "Investimento e benefício financeiro validado" : "ROI de cada mês; meses sem dados suficientes ficam em branco"}</p></div>
                <Segmented label="Tipo de gráfico" value={chart} onChange={setChart} options={[["money", "Valores"], ["roi", "ROI"]]} />
              </div>
              {chart === "money" ? (<><Legend items={[["Benefício validado", "var(--pos)", true], ["Investimento", "var(--chart-1)", true]]} /><div className="mt-2"><MoneyChart data={series} /></div></>) : <RoiChart data={series} />}
            </section>

            <section className="solid p-4 sm:p-5 flex flex-col">
              <h2 className="text-[16px] font-semibold">Da capacidade ao caixa</h2>
              <p className="text-ink-3 text-[13px]">Quanto do tempo liberado virou resultado financeiro comprovado.</p>
              <div className="flex flex-col gap-3.5 mt-4">
                {([
                  ["Capacidade liberada", s.capacityValue, "var(--capacity)", `${fmt.hours(s.hoursSaved)} × custo da hora. Não é caixa.`],
                  ["Benefícios lançados", s.benefitValidated + s.benefitPending, "var(--chart-1)", "Validados + aguardando validação"],
                  ["Benefício validado", s.benefitValidated, "var(--pos)", "Entra no ROI"],
                ] as const).map(([label, v, color, hint]) => (
                  <div key={label}>
                    <div className="flex justify-between gap-3 text-[14px]"><span className="font-medium">{label}</span><span className="num font-semibold">{fmt.moneyShort(v)}</span></div>
                    <div className="bar mt-1.5 !h-2"><i style={{ width: `${Math.max(0, Math.min(100, (v / funnelMax) * 100))}%`, background: color }} /></div>
                    <div className="text-ink-3 text-[12.5px] mt-1">{hint}</div>
                  </div>
                ))}
              </div>
              <div className="mt-auto pt-4">
                <div className="rounded-[14px] bg-[var(--sunken)] border border-line p-3">
                  <div className="text-[12.5px] text-ink-3">Taxa de realização</div>
                  <div className="text-[22px] font-semibold mt-0.5"><IndicatorValue value={s.realizationRate} format={fmt.pct} /></div>
                  <div className="text-[12.5px] text-ink-3 mt-0.5">Benefício validado ÷ capacidade liberada</div>
                </div>
              </div>
            </section>
          </div>

          <section className="solid">
            <div className="flex items-center gap-3 p-4 sm:px-5">
              <div className="flex-1"><h2 className="text-[16px] font-semibold">Comparação entre departamentos</h2><p className="text-ink-3 text-[13px]">Investimento, retorno e produtividade por área no período.</p></div>
              <Link href="/departamentos" className="btn btn-plain btn-sm">Ver todos<ArrowRight size={14} /></Link>
            </div>
            {depts.length ? (
              <div className="table-wrap border-t border-line">
                <table className="table">
                  <thead><tr><th>Departamento</th><th className="min-w-[190px]">Investimento × benefício</th><th className="r">ROI</th><th className="r">Horas liberadas</th><th className="r">Capacidade</th><th className="r">Aprovação</th></tr></thead>
                  <tbody>
                    {[...depts].sort((a, b) => (valueOf(b.summary.roi) ?? -Infinity) - (valueOf(a.summary.roi) ?? -Infinity)).map((d) => {
                      const r = valueOf(d.summary.roi);
                      return (
                        <tr key={d.id}>
                          <td className="font-medium">{d.name}</td>
                          <td>
                            <div className="flex items-center gap-2"><div className="bar flex-1"><i style={{ width: `${(d.summary.benefitValidated / maxDept) * 100}%`, background: "var(--pos)" }} /></div><span className="num text-[12.5px] w-[84px] text-right">{fmt.moneyShort(d.summary.benefitValidated)}</span></div>
                            <div className="flex items-center gap-2 mt-1"><div className="bar flex-1"><i style={{ width: `${(d.summary.investment / maxDept) * 100}%`, background: "var(--chart-1)" }} /></div><span className="num text-[12.5px] w-[84px] text-right text-ink-3">{fmt.moneyShort(d.summary.investment)}</span></div>
                          </td>
                          <td className="r">{r !== null ? <Pill tone={r >= 0 ? "pos" : "neg"}>{r >= 0 ? "+" : ""}{fmt.pct(r)}</Pill> : <span className="text-ink-3 text-[13px]" title={indicatorText(d.summary.roi, fmt.pct).hint}>{indicatorText(d.summary.roi, fmt.pct).text}</span>}</td>
                          <td className="r">{fmt.hours(d.summary.hoursSaved)}</td>
                          <td className="r">{fmt.moneyShort(d.summary.capacityValue)}</td>
                          <td className="r">{indicatorText(d.summary.approvalRate, fmt.pct).ok ? indicatorText(d.summary.approvalRate, fmt.pct).text : <span className="text-ink-3">—</span>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="px-4 sm:px-5 py-2.5 border-t border-line"><Legend items={[["Benefício validado", "var(--pos)"], ["Investimento", "var(--chart-1)"]]} /></div>
              </div>
            ) : <p className="px-5 pb-5 text-ink-3">Nenhum departamento com dados no período.</p>}
          </section>

          <div className="grid gap-4 lg:gap-5 xl:grid-cols-2">
            <section className="solid p-4 sm:p-5">
              <div className="flex items-center gap-3"><div className="flex-1"><h2 className="text-[16px] font-semibold">Ferramentas de IA</h2><p className="text-ink-3 text-[13px]">Quais justificam o investimento.</p></div>
                <Link href="/ferramentas" className="btn btn-plain btn-sm">Gerenciar<ArrowRight size={14} /></Link></div>
              <ul className="mt-3 divide-y divide-[var(--line)]">
                {tools.length === 0 ? <li className="text-ink-3 py-3">Nenhuma ferramenta com dados no período.</li> : null}
                {[...tools].sort((a, b) => (valueOf(b.summary.roi) ?? -Infinity) - (valueOf(a.summary.roi) ?? -Infinity)).map((t) => {
                  const r = valueOf(t.summary.roi);
                  return (
                    <li key={t.id} className="flex items-center gap-3 py-3">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{t.name}</div>
                        <div className="text-ink-3 text-[12.5px] num">{fmt.moneyShort(t.summary.investment)} investidos · {fmt.moneyShort(t.summary.benefitValidated)} validados · {fmt.hours(t.summary.hoursSaved)}</div>
                      </div>
                      {r !== null ? <Pill tone={r >= 0 ? "pos" : "neg"}>ROI {r >= 0 ? "+" : ""}{fmt.pct(r)}</Pill> : <Pill title={indicatorText(t.summary.roi, fmt.pct).hint}>{indicatorText(t.summary.roi, fmt.pct).text}</Pill>}
                    </li>
                  );
                })}
              </ul>
              <h3 className="text-[13px] font-semibold text-ink-2 mt-4 mb-2">Composição do investimento</h3>
              <div className="flex h-2.5 rounded-full overflow-hidden gap-[2px] bg-[var(--sunken)]" role="img" aria-label="Composição do investimento por categoria">
                {COST_CATEGORIES.map(([k], i) => s.byCategory[k as keyof typeof s.byCategory] > 0 ? (
                  <i key={k} style={{ width: `${(s.byCategory[k as keyof typeof s.byCategory] / s.investment) * 100}%`, background: "var(--chart-1)", opacity: 1 - i * 0.15 }} />
                ) : null)}
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2.5 text-[13px]">
                {COST_CATEGORIES.map(([k, l], i) => (
                  <div key={k} className="flex items-center gap-2"><i className="w-2.5 h-2.5 rounded-[3px] flex-none" style={{ background: "var(--chart-1)", opacity: 1 - i * 0.15 }} /><span className="text-ink-2 flex-1 truncate">{l}</span><span className="num">{fmt.moneyShort(s.byCategory[k as keyof typeof s.byCategory])}</span></div>
                ))}
              </div>
            </section>

            <section className="solid p-4 sm:p-5">
              <h2 className="text-[16px] font-semibold flex items-center gap-2"><Lightbulb size={17} className="text-[var(--accent-ink)]" />Recomendações</h2>
              <p className="text-ink-3 text-[13px]">Geradas a partir dos dados registrados. Cada uma cita os números de origem.</p>
              <ul className="mt-3 flex flex-col gap-2">
                {insights.length === 0 ? <li className="text-ink-3 py-3">Sem recomendações para o período. Elas aparecem conforme custos, medições e benefícios são registrados.</li> : null}
                {insights.slice(0, 6).map((i) => (
                  <li key={i.id}>
                    <Link href={i.href} className="flex gap-3 rounded-[14px] p-3 border border-line hover:bg-[var(--sunken)] transition-colors">
                      <span className="mt-0.5 flex-none"><Pill tone={TONE[i.tone]}>{i.tone === "pos" ? "Oportunidade" : i.tone === "neg" ? "Risco" : i.tone === "warn" ? "Atenção" : "Decisão"}</Pill></span>
                      <span className="min-w-0"><span className="block font-medium text-[14.5px] leading-snug">{i.title}</span><span className="block text-ink-2 text-[13px] mt-1">{i.detail}</span></span>
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="mt-4 pt-3 border-t border-line text-[13px] text-ink-2">
                <span className="font-semibold text-ink">Confiabilidade dos dados: </span>
                {fmt.int(sources.total)} registros financeiros e de medição — {fmt.int(sources.manual)} manuais, {fmt.int(sources.imported)} importados{sources.demo ? `, ${fmt.int(sources.demo)} de exemplo fictício` : ""}.
                {benefitsInScope.length ? ` ${withEvidence} de ${benefitsInScope.length} benefícios do período têm evidência registrada.` : ""}
              </div>
            </section>
          </div>
        </div>
        <TraceDrawer kind={trace} summary={s} onClose={() => setTrace(null)} />
      </>) : null}
    </>
  );
}
