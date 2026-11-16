"use client";
import { FileSpreadsheet, Printer } from "lucide-react";
import { useMemo, useState } from "react";
import { Legend, MoneyChart } from "@/components/charts";
import { FilterBar, useFilters } from "@/components/filters";
import { Button, Empty, PageHeader, Pill, useToast } from "@/components/ui";
import { BENEFIT_CATEGORIES, COST_CATEGORIES } from "@/data/schema";
import { useStore } from "@/data/store";
import { groupBy, monthly, summarize, valueOf, type Indicator, type Summary } from "@/domain/engine";
import { buildInsights } from "@/domain/insights";
import { companyIndex, DIMENSIONS, levelOf, maturity } from "@/domain/maturity";
import { periodLabel } from "@/domain/period";
import { downloadWorkbook, type SheetSpec } from "@/lib/excel";
import { fmt, indicatorText, type Fmt } from "@/lib/format";

const txt = (i: Indicator, f: Fmt) => indicatorText(i, f).text;
const raw = (i: Indicator) => valueOf(i) ?? "Dados insuficientes";
const BRL = '"R$" #,##0.00';
const PCT = "0.0%";

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-[14px] border border-line p-3 bg-[var(--sunken)]"><div className="text-[12px] text-ink-3">{label}</div><div className="text-[19px] font-semibold num mt-0.5">{value}</div>{hint ? <div className="text-[11.5px] text-ink-3 mt-0.5">{hint}</div> : null}</div>
  );
}
function GroupTable({ title, label, rows }: { title: string; label: string; rows: { id: string; name: string; summary: Summary }[] }) {
  return (
    <section>
      <h2 className="text-[16px] font-semibold mb-2">{title}</h2>
      {rows.length ? (
        <div className="table-wrap border border-line !rounded-[14px]">
          <table className="table"><thead><tr><th>{label}</th><th className="r">Investimento</th><th className="r">Benefício validado</th><th className="r">ROI</th><th className="r">Horas liberadas</th><th className="r">Aprovação</th><th className="r">Custo/entrega aprovada</th></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.id}><td className="font-medium">{r.name}</td><td className="r">{fmt.money(r.summary.investment)}</td><td className="r">{fmt.money(r.summary.benefitValidated)}</td>
                <td className="r">{valueOf(r.summary.roi) !== null ? <b className={valueOf(r.summary.roi)! >= 0 ? "text-pos" : "text-neg"}>{fmt.pct(valueOf(r.summary.roi)!)}</b> : <span className="text-ink-3">{txt(r.summary.roi, fmt.pct)}</span>}</td>
                <td className="r">{fmt.hours(r.summary.hoursSaved)}</td><td className="r">{valueOf(r.summary.approvalRate) !== null ? fmt.pct(valueOf(r.summary.approvalRate)!) : "—"}</td>
                <td className="r">{valueOf(r.summary.costPerApproved) !== null ? fmt.money(valueOf(r.summary.costPerApproved)!) : "—"}</td></tr>
            ))}</tbody></table>
        </div>
      ) : <p className="text-ink-3">Sem dados no período.</p>}
    </section>
  );
}

export default function Relatorio() {
  const { db, hasDemo } = useStore();
  const { scope, hasData } = useFilters();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const s = useMemo(() => summarize(db, scope), [db, scope]);
  const series = useMemo(() => monthly(db, scope), [db, scope]);
  const depts = useMemo(() => groupBy(db, scope, "department"), [db, scope]);
  const tools = useMemo(() => groupBy(db, scope, "tool"), [db, scope]);
  const procs = useMemo(() => groupBy(db, scope, "process").sort((a, b) => b.summary.hoursSaved - a.summary.hoursSaved), [db, scope]);
  const mat = useMemo(() => maturity(db, scope).sort((a, b) => (b.score ?? -1) - (a.score ?? -1)), [db, scope]);
  const insights = useMemo(() => buildInsights(db, scope, new Date().toISOString().slice(0, 10)), [db, scope]);
  const org = db.org[0];
  const filters = [
    scope.departmentIds && `Departamento: ${db.departments.find((d) => d.id === scope.departmentIds![0])?.name}`,
    scope.toolIds && `Ferramenta: ${db.tools.find((t) => t.id === scope.toolIds![0])?.name}`,
    scope.processIds && `Processo: ${db.processes.find((p) => p.id === scope.processIds![0])?.name}`,
  ].filter(Boolean).join(" · ") || "Empresa inteira";
  const byBenefitCat = BENEFIT_CATEGORIES.map(([k, l]) => [l, s.benefits.filter((b) => b.status === "validated" && b.category === k).reduce((a, b) => a + b.amount, 0)] as const).filter(([, v]) => v > 0);

  async function excel() {
    setBusy(true);
    try {
      const group = (name: string, label: string, rows: { name: string; summary: Summary }[]): SheetSpec => ({
        name,
        columns: [{ header: label, width: 34 }, { header: "Investimento", numFmt: BRL }, { header: "Benefício validado", numFmt: BRL }, { header: "Resultado líquido", numFmt: BRL },
          { header: "ROI", numFmt: PCT }, { header: "Horas liberadas", numFmt: "#,##0.0" }, { header: "Capacidade liberada (não é caixa)", numFmt: BRL },
          { header: "Entregas aprovadas" }, { header: "Taxa de aprovação", numFmt: PCT }, { header: "Custo por entrega aprovada", numFmt: BRL }],
        rows: rows.map((r) => [r.name, r.summary.investment, r.summary.benefitValidated, raw(r.summary.net), raw(r.summary.roi), r.summary.hoursSaved, r.summary.capacityValue,
          r.summary.deliveriesApproved, raw(r.summary.approvalRate), raw(r.summary.costPerApproved)]),
      });
      await downloadWorkbook(`relatorio-roi-ia-${scope.from}-a-${scope.to}.xlsx`, [
        {
          name: "Resumo", columns: [{ header: "Indicador", width: 40 }, { header: "Valor", width: 26 }, { header: "Observação", width: 70 }],
          rows: [
            ["Empresa", org?.name ?? "—", hasDemo ? "ATENÇÃO: contém dados fictícios de demonstração" : ""],
            ["Período", `${periodLabel(scope.from)} a ${periodLabel(scope.to)}`, filters],
            ["Gerado em", fmt.dateTime(new Date().toISOString()), ""],
            ["Investimento total", s.investment, "Licenças dos contratos + lançamentos de custo"],
            ["Benefício financeiro realizado", s.benefitValidated, "Apenas benefícios validados"],
            ["Benefícios aguardando validação", s.benefitPending, "Fora do ROI"],
            ["Resultado financeiro líquido", raw(s.net), "Benefício validado − investimento"],
            ["ROI", valueOf(s.roi) !== null ? fmt.pct(valueOf(s.roi)!) : txt(s.roi, fmt.pct), "(Benefício validado − investimento) ÷ investimento"],
            ["Benefício por real investido", raw(s.benefitPerReal), "Benefício validado ÷ investimento"],
            ["Horas produtivas liberadas", s.hoursSaved, "(Tempo antes − tempo com IA) × atividades"],
            ["Capacidade produtiva liberada", s.capacityValue, "Horas × custo da hora. NÃO é economia em caixa."],
            ["Taxa de realização", valueOf(s.realizationRate) !== null ? fmt.pct(valueOf(s.realizationRate)!) : txt(s.realizationRate, fmt.pct), "Benefício validado ÷ capacidade liberada"],
            ["Processos com IA", s.processCount, ""], ["Entregas aprovadas", s.deliveriesApproved, `de ${s.deliveriesTotal}`],
            ["Taxa de aprovação", valueOf(s.approvalRate) !== null ? fmt.pct(valueOf(s.approvalRate)!) : txt(s.approvalRate, fmt.pct), ""],
            ["Custo por entrega aprovada", raw(s.costPerApproved), "Investimento ÷ entregas aprovadas"],
            ["Taxa de adoção", valueOf(s.adoptionRate) !== null ? fmt.pct(valueOf(s.adoptionRate)!) : txt(s.adoptionRate, fmt.pct), "Usuários ativos ÷ licenças (só com dado de uso informado)"],
          ],
        },
        group("Departamentos", "Departamento", depts), group("Ferramentas", "Ferramenta", tools), group("Processos", "Processo", procs),
        {
          name: "Evolução mensal", columns: [{ header: "Mês" }, { header: "Investimento", numFmt: BRL }, { header: "Benefício validado", numFmt: BRL }, { header: "ROI", numFmt: PCT }, { header: "Horas liberadas", numFmt: "#,##0.0" }],
          rows: series.map((m) => [m.period, m.summary.investment, m.summary.benefitValidated, raw(m.summary.roi), m.summary.hoursSaved]),
        },
        {
          name: "Maturidade", columns: [{ header: "Departamento", width: 30 }, { header: "Índice (0–100)" }, { header: "Nível", width: 22 }, ...DIMENSIONS.flatMap((d) => [{ header: `${d.label} (nota)` }, { header: d.measure, numFmt: PCT, width: 26 }])],
          rows: mat.map((r) => [r.name, r.score ?? "Dados insuficientes", r.score !== null ? levelOf(r.score).label : "", ...DIMENSIONS.flatMap((d) => [r.dimensions[d.key].score ?? "Sem dados", r.dimensions[d.key].value ?? ""])]),
        },
        { name: "Recomendações", columns: [{ header: "Recomendação", width: 60 }, { header: "Detalhe", width: 120 }], rows: insights.map((i) => [i.title, i.detail]) },
        {
          name: "Origem dos custos", columns: [{ header: "Mês" }, { header: "Categoria", width: 18 }, { header: "Origem", width: 40 }, { header: "Critério", width: 60 }, { header: "Departamento", width: 24 }, { header: "Valor", numFmt: BRL }, { header: "Fonte do dado" }],
          rows: s.lines.map((l) => [l.period, COST_CATEGORIES.find(([k]) => k === l.category)?.[1], l.origin.label, l.origin.rationale ?? "", db.departments.find((d) => d.id === l.departmentId)?.name ?? "Sem departamento", l.amount, l.source]),
        },
      ]);
      toast("ok", "Relatório em Excel gerado.");
    } catch { toast("error", "Não foi possível gerar o Excel. Tente de novo."); }
    setBusy(false);
  }

  return (
    <>
      <PageHeader title="Relatório executivo" subtitle="Documento pronto para a diretoria. Use os filtros para definir o período e o recorte."
        actions={<>
          <Button onClick={excel} loading={busy} disabled={!hasData}><FileSpreadsheet size={16} />Exportar Excel</Button>
          <Button variant="primary" disabled={!hasData} onClick={() => window.print()}><Printer size={16} />Salvar como PDF</Button>
        </>} />
      <FilterBar />
      {!hasData ? <section className="solid"><Empty title="Ainda não há dados para relatar">Cadastre custos, processos, medições e benefícios. O relatório é montado apenas com o que foi registrado.</Empty></section> : (
        <article className="solid p-5 sm:p-8 flex flex-col gap-7">
          <header className="flex flex-wrap items-start gap-4 pb-5 border-b border-line">
            <div className="flex-1 basis-72">
              <div className="flex items-center gap-2 text-[13px] font-semibold text-ink-3 uppercase tracking-[0.08em]"><span className="brand-mark !w-5 !h-5 !rounded-[6px]" aria-hidden />AI ROI Controller</div>
              <h1 className="text-[26px] font-semibold mt-2">Retorno dos investimentos em inteligência artificial</h1>
              <p className="text-ink-2 mt-1">{org?.name ?? "Empresa não identificada"} · {periodLabel(scope.from)} a {periodLabel(scope.to)} · {filters}</p>
            </div>
            <div className="text-[12.5px] text-ink-3 text-right">Gerado em {fmt.dateTime(new Date().toISOString())}{org?.operator ? <><br />por {org.operator}</> : null}</div>
          </header>
          {hasDemo ? <p className="rounded-[12px] px-4 py-2.5 bg-[var(--warn-soft)] text-[var(--warn)] font-semibold text-[14px]">Este relatório contém dados fictícios de demonstração. Não representa resultados reais.</p> : null}

          <section>
            <h2 className="text-[16px] font-semibold mb-2">Resumo</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Stat label="ROI consolidado" value={txt(s.roi, fmt.pct)} hint={s.roi.state !== "ok" ? indicatorText(s.roi, fmt.pct).hint : `R$ 1 investido → ${txt(s.benefitPerReal, fmt.ratio)}`} />
              <Stat label="Investimento total" value={fmt.money(s.investment)} />
              <Stat label="Benefício financeiro realizado" value={fmt.money(s.benefitValidated)} hint={s.benefitPending ? `+ ${fmt.money(s.benefitPending)} aguardando validação` : "Somente validados"} />
              <Stat label="Resultado líquido" value={txt(s.net, fmt.money)} />
              <Stat label="Horas produtivas liberadas" value={fmt.hours(s.hoursSaved)} />
              <Stat label="Capacidade liberada" value={fmt.money(s.capacityValue)} hint="Não é economia em caixa" />
              <Stat label="Taxa de aprovação" value={txt(s.approvalRate, fmt.pct)} hint={`${fmt.int(s.deliveriesApproved)} de ${fmt.int(s.deliveriesTotal)} entregas`} />
              <Stat label="Custo por entrega aprovada" value={txt(s.costPerApproved, fmt.money)} />
            </div>
          </section>

          <section>
            <h2 className="text-[16px] font-semibold mb-2">Evolução mensal</h2>
            <Legend items={[["Benefício validado", "var(--pos)", true], ["Investimento", "var(--chart-1)", true]]} />
            <MoneyChart data={series} height={240} />
          </section>

          <GroupTable title="Investimento e benefício por departamento" label="Departamento" rows={[...depts].sort((a, b) => b.summary.benefitValidated - a.summary.benefitValidated)} />
          <GroupTable title="Ferramentas com melhor retorno" label="Ferramenta" rows={[...tools].sort((a, b) => (valueOf(b.summary.roi) ?? -Infinity) - (valueOf(a.summary.roi) ?? -Infinity))} />
          <GroupTable title="Processos mais produtivos" label="Processo" rows={procs.slice(0, 10)} />

          <section>
            <h2 className="text-[16px] font-semibold mb-2">Maturidade em IA por departamento{companyIndex(mat) !== null ? <span className="font-normal text-ink-3"> · índice da empresa: {companyIndex(mat)} de 100</span> : null}</h2>
            <div className="table-wrap border border-line !rounded-[14px]">
              <table className="table"><thead><tr><th>Departamento</th><th className="r">Índice</th><th>Nível</th>{DIMENSIONS.map((d) => <th key={d.key} className="r">{d.label}</th>)}</tr></thead>
                <tbody>{mat.map((r) => (
                  <tr key={r.id}><td className="font-medium">{r.name}</td><td className="r font-semibold">{r.score ?? "—"}</td>
                    <td>{r.score !== null ? <Pill tone={levelOf(r.score).tone}>{levelOf(r.score).label}</Pill> : <span className="text-ink-3">Dados insuficientes</span>}</td>
                    {DIMENSIONS.map((d) => <td key={d.key} className="r">{r.dimensions[d.key].score ?? <span className="text-ink-3">—</span>}</td>)}</tr>
                ))}</tbody></table>
            </div>
            <p className="text-[12.5px] text-ink-3 mt-1.5">Nota de 0 a 100, média das dimensões com dados (mínimo de três). Critérios detalhados na tela Maturidade.</p>
          </section>

          <div className="grid gap-7 lg:grid-cols-2">
            <section>
              <h2 className="text-[16px] font-semibold mb-2">Indicadores de qualidade</h2>
              <dl className="text-[14px] divide-y divide-[var(--line)] border border-line rounded-[14px]">
                {[["Taxa de aprovação", txt(s.approvalRate, fmt.pct)], ["Taxa de aproveitamento", txt(s.usageRate, fmt.pct)], ["Redução de retrabalho", txt(s.reworkReduction, fmt.pp)],
                  ["Taxa de adoção", txt(s.adoptionRate, fmt.pct)], ["Taxa de realização (benefício ÷ capacidade)", txt(s.realizationRate, fmt.pct)], ["Payback", txt(s.paybackMonths, fmt.months)]].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 px-3.5 py-2.5"><dt className="text-ink-2">{k}</dt><dd className="font-semibold num">{v}</dd></div>
                ))}
              </dl>
            </section>
            <section>
              <h2 className="text-[16px] font-semibold mb-2">Composição</h2>
              <dl className="text-[14px] divide-y divide-[var(--line)] border border-line rounded-[14px]">
                {COST_CATEGORIES.filter(([k]) => s.byCategory[k as keyof typeof s.byCategory] > 0).map(([k, l]) => (
                  <div key={k} className="flex justify-between gap-4 px-3.5 py-2.5"><dt className="text-ink-2">Investimento · {l}</dt><dd className="font-semibold num">{fmt.money(s.byCategory[k as keyof typeof s.byCategory])}</dd></div>
                ))}
                {byBenefitCat.map(([l, v]) => (
                  <div key={l} className="flex justify-between gap-4 px-3.5 py-2.5"><dt className="text-ink-2">Benefício · {l}</dt><dd className="font-semibold num text-pos">{fmt.money(v)}</dd></div>
                ))}
              </dl>
            </section>
          </div>

          <section>
            <h2 className="text-[16px] font-semibold mb-2">Recomendações</h2>
            {insights.length ? (
              <ul className="flex flex-col gap-2">{insights.slice(0, 8).map((i) => (
                <li key={i.id} className="border border-line rounded-[14px] p-3.5">
                  <div className="flex flex-wrap items-center gap-2"><Pill tone={i.tone}>{i.tone === "pos" ? "Oportunidade" : i.tone === "neg" ? "Risco" : i.tone === "warn" ? "Atenção" : "Decisão"}</Pill><span className="font-semibold">{i.title}</span></div>
                  <p className="text-ink-2 text-[13.5px] mt-1.5">{i.detail}</p>
                </li>
              ))}</ul>
            ) : <p className="text-ink-3">Sem recomendações para o período.</p>}
          </section>

          <footer className="text-[12.5px] text-ink-3 pt-5 border-t border-line leading-relaxed">
            <b className="text-ink-2">Como ler este relatório.</b> ROI = (benefício financeiro validado − investimento) ÷ investimento. Só entram benefícios validados por responsável autorizado. Capacidade liberada (horas × custo da hora) indica tempo disponível e não é somada ao benefício financeiro. Indicadores sem dados suficientes aparecem como “Dados insuficientes” em vez de zero. Base: {s.lines.length} linhas de custo, {s.benefits.length} benefícios e {s.measurements.length} medições no período.
          </footer>
        </article>
      )}
    </>
  );
}
