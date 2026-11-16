"use client";
import { Award, CircleHelp, Compass, Trophy } from "lucide-react";
import { useMemo, useState } from "react";
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer } from "recharts";
import { Legend } from "@/components/charts";
import { FilterBar, useFilters } from "@/components/filters";
import { cx, Empty, PageHeader, Pill } from "@/components/ui";
import { useStore } from "@/data/store";
import { benchmark, companyIndex, DIMENSIONS, levelOf, maturity, opportunities, type DeptMaturity, type DimensionKey } from "@/domain/maturity";
import { periodLabel } from "@/domain/period";
import { fmt } from "@/lib/format";

const show = (key: DimensionKey, v: number | null) => (v === null ? "—" : fmt.pct(v));

/** Célula de calor: a nota em texto e a intensidade no fundo — cor nunca é o único sinal. */
function ScoreCell({ row, k }: { row: DeptMaturity; k: DimensionKey }) {
  const d = row.dimensions[k];
  if (d.score === null) {
    return <td className="text-center"><span className="inline-flex items-center gap-1 text-ink-3 text-[12.5px]" title={`Falta registrar: ${d.missing}`}>Sem dados<CircleHelp size={12} aria-hidden /></span></td>;
  }
  return (
    <td className="!p-1.5">
      <div className="rounded-[10px] px-2 py-1.5 text-center" style={{ background: `color-mix(in srgb, var(--chart-1) ${6 + d.score * 0.3}%, transparent)` }}>
        <div className="font-semibold num">{d.score}</div>
        <div className="text-[11.5px] text-ink-2 num">{show(k, d.value)}</div>
      </div>
    </td>
  );
}

export default function Maturidade() {
  const { db } = useStore();
  const { scope } = useFilters();
  const rows = useMemo(() => maturity(db, scope).sort((a, b) => (b.score ?? -1) - (a.score ?? -1)), [db, scope]);
  const bench = useMemo(() => benchmark(rows), [rows]);
  const ops = useMemo(() => opportunities(db, scope, rows), [db, scope, rows]);
  const index = companyIndex(rows);
  const scored = rows.filter((r) => r.score !== null);
  const [picked, setPicked] = useState<string>("");
  const leader = scored[0];
  const current = rows.find((r) => r.id === picked) ?? scored[scored.length - 1] ?? rows[0];
  const radar = DIMENSIONS.map((d) => ({ label: d.label, atual: current?.dimensions[d.key].score ?? 0, referencia: leader?.dimensions[d.key].score ?? 0 }));

  if (!db.departments.length) {
    return (<>
      <PageHeader title="Maturidade em IA" subtitle="Uma nota por departamento e a comparação entre as áreas." />
      <section className="solid"><Empty icon={<Award size={22} />} title="Cadastre departamentos para começar">O índice é calculado por departamento, a partir de uso, medições de produtividade, entregas aprovadas e benefícios validados.</Empty></section>
    </>);
  }
  return (
    <>
      <PageHeader eyebrow="Benchmark interno" title={<>Maturidade <span className="accent-word">em IA</span></>} subtitle={`Uma nota de 0 a 100 por departamento e o que as áreas de maior resultado fazem diferente. Período: ${periodLabel(scope.from)} a ${periodLabel(scope.to)}.`} />
      <FilterBar dimensions={false} />

      <div className="enter grid gap-4 lg:gap-5 xl:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]">
        <section className="hero p-5 sm:p-6 flex flex-col min-h-[260px]">
          <span className="relative z-[1] text-[13px] font-semibold uppercase tracking-[0.08em] on-hero-2">Índice de maturidade da empresa</span>
          <div className="relative z-[1] mt-4 flex items-end gap-3">
            {index !== null ? (<>
              <span className="hero-num display text-[84px] sm:text-[96px] leading-[0.95] num">{index}</span>
              <span className="on-hero-2 text-[17px] mb-2">de 100</span>
            </>) : <span className="text-[28px] font-semibold leading-tight">Dados insuficientes</span>}
          </div>
          <div className="relative z-[1] mt-3">
            {index !== null ? <span className="hero-chip">{levelOf(index).label}</span> : null}
            <p className="on-hero-2 text-[14px] mt-3 max-w-[40ch]">
              {index !== null
                ? `Média de ${scored.length} ${scored.length === 1 ? "departamento avaliado" : "departamentos avaliados"}${rows.length > scored.length ? `; ${rows.length - scored.length} ainda sem dados suficientes` : ""}.`
                : "Um departamento precisa de ao menos três das quatro dimensões com dados para receber nota."}
            </p>
          </div>
          <div className="relative z-[1] mt-auto pt-4 h-2.5">
            <div className="h-2 rounded-full bg-white/20 overflow-hidden"><i className="block h-full rounded-full bg-white" style={{ width: `${index ?? 0}%` }} /></div>
          </div>
        </section>

        <section className="solid p-4 sm:p-5">
          <h2 className="text-[16px] font-semibold flex items-center gap-2"><Trophy size={17} className="text-[var(--accent-ink)]" />Ranking dos departamentos</h2>
          <p className="text-ink-3 text-[13px]">Toque em um departamento para compará-lo com a área de referência.</p>
          <ul className="mt-3 flex flex-col gap-1">
            {rows.map((r, i) => (
              <li key={r.id}>
                <button type="button" onClick={() => setPicked(r.id)} aria-pressed={current?.id === r.id}
                  className={cx("w-full flex items-center gap-3 rounded-[12px] px-2.5 py-2 text-left transition-colors hover:bg-[var(--sunken)]", current?.id === r.id && "bg-[var(--accent-soft)]")}>
                  <span className="w-5 text-ink-3 text-[13px] num">{r.score !== null ? i + 1 : "–"}</span>
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center gap-2"><span className="font-medium truncate">{r.name}</span>
                      {r.score !== null ? <Pill tone={levelOf(r.score).tone}>{levelOf(r.score).label}</Pill> : <Pill title="Menos de três dimensões com dados">Dados insuficientes</Pill>}</span>
                    <span className="bar mt-1.5 block"><i style={{ width: `${r.score ?? 0}%` }} /></span>
                  </span>
                  <span className="w-10 text-right text-[19px] font-semibold num">{r.score ?? "—"}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="grid gap-4 lg:gap-5 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <section className="solid">
          <div className="p-4 sm:px-5"><h2 className="text-[16px] font-semibold">Nota por dimensão</h2><p className="text-ink-3 text-[13px]">Nota de 0 a 100 e, abaixo, a medida que a originou.</p></div>
          <div className="table-wrap border-t border-line">
            <table className="table">
              <thead><tr><th>Departamento</th>{DIMENSIONS.map((d) => <th key={d.key} className="text-center" title={d.rule}>{d.label}<span className="block font-normal text-[11px]">{d.measure}</span></th>)}<th className="r">Índice</th></tr></thead>
              <tbody>{rows.map((r) => (
                <tr key={r.id}><td className="font-medium">{r.name}{r.headcount ? <span className="block text-ink-3 text-[12px] font-normal">{r.headcount} colaboradores</span> : null}</td>
                  {DIMENSIONS.map((d) => <ScoreCell key={d.key} row={r} k={d.key} />)}
                  <td className="r text-[17px] font-semibold">{r.score ?? <span className="text-ink-3 text-[13px] font-normal">—</span>}</td></tr>
              ))}</tbody>
            </table>
          </div>
        </section>

        <section className="solid p-4 sm:p-5 flex flex-col">
          <h2 className="text-[16px] font-semibold">{current?.name ?? "Departamento"} × referência</h2>
          <p className="text-ink-3 text-[13px]">{leader ? (current?.id === leader.id ? `${leader.name} é a área de maior índice.` : `Comparado com ${leader.name}, a área de maior índice.`) : "Sem área de referência ainda."}</p>
          <div className="mt-2"><Legend items={[[current?.name ?? "Selecionado", "var(--chart-1)"], ...(leader && leader.id !== current?.id ? [[`${leader.name} (referência)`, "var(--chart-2)"] as [string, string]] : [])]} /></div>
          <div className="h-[300px] mt-1" role="img" aria-label={`Notas de ${current?.name} por dimensão: ${radar.map((x) => `${x.label} ${x.atual}`).join(", ")}`}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radar} outerRadius="72%">
                <PolarGrid stroke="var(--chart-grid)" />
                <PolarAngleAxis dataKey="label" tick={{ fontSize: 12.5, fill: "var(--ink-2)" }} />
                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                {leader && leader.id !== current?.id ? <Radar dataKey="referencia" stroke="var(--chart-2)" strokeWidth={2} strokeDasharray="5 4" fill="var(--chart-2)" fillOpacity={0.08} isAnimationActive={false} /> : null}
                <Radar dataKey="atual" stroke="var(--chart-1)" strokeWidth={2} fill="var(--chart-1)" fillOpacity={0.18} dot={{ r: 3, fill: "var(--solid)", strokeWidth: 2 }} isAnimationActive={false} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <dl className="grid grid-cols-2 gap-2 text-[13px] mt-auto">
            {DIMENSIONS.map((d) => { const x = current?.dimensions[d.key]; return (
              <div key={d.key} className="rounded-[12px] border border-line bg-[var(--sunken)] px-3 py-2">
                <dt className="text-ink-3">{d.label}</dt>
                <dd className="font-semibold num">{x?.score ?? "Sem dados"}{x?.score != null ? <span className="font-normal text-ink-3"> · {show(d.key, x.value)}</span> : null}</dd>
              </div>); })}
          </dl>
        </section>
      </div>

      <section className="solid p-4 sm:p-5">
        <h2 className="text-[16px] font-semibold">Benchmark interno</h2>
        <p className="text-ink-3 text-[13px]">Em cada dimensão, a área de referência, a mediana da empresa e o menor resultado.</p>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 mt-3">
          {bench.map((b) => { const meta = DIMENSIONS.find((d) => d.key === b.key)!; return (
            <div key={b.key} className="rounded-[16px] border border-line p-3.5">
              <div className="font-semibold">{b.label}</div><div className="text-ink-3 text-[12.5px]">{meta.measure}</div>
              {b.leader ? (
                <dl className="mt-3 flex flex-col gap-2 text-[13.5px]">
                  <div className="flex justify-between gap-2"><dt className="text-ink-2 min-w-0"><span className="block text-[11.5px] text-ink-3">Referência</span><span className="font-medium text-ink truncate block">{b.leader.name}</span></dt><dd className="font-semibold text-pos num self-end">{show(b.key, b.leader.dimensions[b.key].value)}</dd></div>
                  <div className="flex justify-between gap-2"><dt className="text-ink-2"><span className="block text-[11.5px] text-ink-3">Mediana da empresa</span>{b.count} {b.count === 1 ? "área" : "áreas"} com dados</dt><dd className="font-semibold num self-end">{show(b.key, b.median)}</dd></div>
                  {b.laggard ? <div className="flex justify-between gap-2"><dt className="text-ink-2 min-w-0"><span className="block text-[11.5px] text-ink-3">Menor resultado</span><span className="font-medium text-ink truncate block">{b.laggard.name}</span></dt><dd className="font-semibold text-neg num self-end">{show(b.key, b.laggard.dimensions[b.key].value)}</dd></div> : null}
                </dl>
              ) : <p className="text-ink-3 text-[13px] mt-3">Nenhum departamento com dados nesta dimensão.</p>}
            </div>); })}
        </div>
      </section>

      <section className="solid p-4 sm:p-5">
        <h2 className="text-[16px] font-semibold flex items-center gap-2"><Compass size={17} className="text-[var(--accent-ink)]" />Onde replicar</h2>
        <p className="text-ink-3 text-[13px]">Para cada departamento, a dimensão mais distante da área de referência. São comparações entre dados registrados, não previsões de resultado.</p>
        {ops.length ? (
          <ul className="grid gap-3 lg:grid-cols-2 mt-3">
            {ops.map((o) => (
              <li key={o.id} className="rounded-[16px] border border-line p-3.5">
                <div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{o.department}</span><Pill tone="info">{o.label}</Pill><span className="text-ink-3 text-[12.5px]">{o.gap} pontos abaixo de {o.reference}</span></div>
                <p className="font-medium text-[14.5px] mt-2 leading-snug">{o.title}</p>
                <p className="text-ink-2 text-[13.5px] mt-1.5">{o.detail}</p>
              </li>
            ))}
          </ul>
        ) : <p className="text-ink-3 mt-3">Sem comparações disponíveis. É preciso ao menos dois departamentos com dados na mesma dimensão e uma diferença relevante entre eles.</p>}
      </section>

      <details className="solid p-4 sm:p-5 text-[14px]">
        <summary className="font-semibold cursor-pointer">Como o índice é calculado</summary>
        <p className="text-ink-2 mt-3 max-w-[90ch]">O índice é a média das dimensões que têm dados. Um departamento precisa de pelo menos três das quatro para receber nota; dimensão sem dado não conta como zero. As faixas são critérios deste produto e podem ser ajustadas.</p>
        <dl className="mt-3 grid gap-2 sm:grid-cols-2">
          {DIMENSIONS.map((d) => <div key={d.key} className="rounded-[12px] border border-line p-3"><dt className="font-semibold">{d.label} · {d.measure}</dt><dd className="text-ink-2 text-[13.5px] mt-0.5">{d.rule}</dd></div>)}
        </dl>
        <p className="text-ink-3 text-[13px] mt-3">Níveis: 80 ou mais, Referência · 60 a 79, Consolidado · 40 a 59, Em desenvolvimento · abaixo de 40, Inicial.</p>
      </details>
    </>
  );
}
