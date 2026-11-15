"use client";
import { Bar, CartesianGrid, ComposedChart, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { valueOf, type Summary } from "@/domain/engine";
import { periodLabel } from "@/domain/period";
import { fmt, indicatorText } from "@/lib/format";

interface Point { period: string; summary: Summary }
const axis = { fontSize: 12, fill: "var(--ink-3)" };
const short = (v: number) => (Math.abs(v) >= 1e6 ? `${fmt.num(Math.round(v / 1e5) / 10)} mi` : Math.abs(v) >= 1e3 ? `${fmt.int(v / 1e3)} mil` : fmt.int(v));

function Tip({ active, payload, rows }: { active?: boolean; payload?: { payload: { p: Point } }[]; rows: (s: Summary) => [string, string, string?][] }) {
  if (!active || !payload?.length) return null;
  const { p } = payload[0].payload;
  return (
    <div className="glass glass-strong float px-3 py-2.5 text-[13px] rounded-[12px] min-w-[190px]">
      <div className="font-semibold mb-1.5">{periodLabel(p.period)}</div>
      {rows(p.summary).map(([label, value, color]) => (
        <div key={label} className="flex items-center gap-2 py-0.5">
          {color ? <i className="w-2.5 h-2.5 rounded-[3px] flex-none" style={{ background: color }} /> : <i className="w-2.5 flex-none" />}
          <span className="text-ink-2 flex-1">{label}</span><span className="num font-medium">{value}</span>
        </div>
      ))}
    </div>
  );
}

export function Legend({ items }: { items: [string, string, boolean?][] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-ink-2">
      {items.map(([label, color, line]) => (
        <span key={label} className="inline-flex items-center gap-1.5">
          <i className={line ? "w-3.5 h-[3px] rounded-full" : "w-2.5 h-2.5 rounded-[3px]"} style={{ background: color }} />{label}
        </span>
      ))}
    </div>
  );
}

/** Investimento × benefício validado, mês a mês. Uma única escala (R$). */
export function MoneyChart({ data, height = 280 }: { data: Point[]; height?: number }) {
  const rows = data.map((p) => ({ p, label: periodLabel(p.period), inv: p.summary.investment, ben: p.summary.benefitValidated }));
  return (
    <div style={{ height }} role="img" aria-label={`Investimento e benefício validado por mês, de ${rows[0]?.label} a ${rows[rows.length - 1]?.label}`}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barGap={2} barCategoryGap="24%">
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={18} />
          <YAxis tick={axis} tickLine={false} axisLine={false} width={54} tickFormatter={short} />
          <Tooltip cursor={{ fill: "var(--sunken)" }} content={<Tip rows={(s) => [
            ["Benefício validado", fmt.money(s.benefitValidated), "var(--chart-1)"],
            ["Investimento", fmt.money(s.investment), "var(--chart-2)"],
            ["ROI do mês", indicatorText(s.roi, fmt.pct).text],
          ]} />} />
          <Bar dataKey="inv" fill="var(--chart-2)" radius={[4, 4, 0, 0]} maxBarSize={22} isAnimationActive={false} />
          <Bar dataKey="ben" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={22} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/** ROI mensal. Meses sem dados suficientes ficam em branco — não viram zero. */
export function RoiChart({ data, height = 280, onHero }: { data: Point[]; height?: number; onHero?: boolean }) {
  const rows = data.map((p) => ({ p, label: periodLabel(p.period), roi: valueOf(p.summary.roi) === null ? null : Math.round(valueOf(p.summary.roi)! * 1000) / 10 }));
  const stroke = onHero ? "#ffffff" : "var(--chart-1)";
  if (onHero) {
    return (
      <div style={{ height }} aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 6, right: 6, bottom: 2, left: 6 }}>
            <ReferenceLine y={0} stroke="rgba(255,255,255,.3)" strokeDasharray="3 4" />
            <Line dataKey="roi" stroke={stroke} strokeWidth={2.2} dot={false} connectNulls={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }
  return (
    <div style={{ height }} role="img" aria-label="ROI por mês">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={18} />
          <YAxis tick={axis} tickLine={false} axisLine={false} width={54} tickFormatter={(v) => `${fmt.int(v)}%`} />
          <ReferenceLine y={0} stroke="var(--ink-3)" strokeDasharray="3 4" />
          <Tooltip cursor={{ stroke: "var(--line-strong)" }} content={<Tip rows={(s) => [
            ["ROI do mês", indicatorText(s.roi, fmt.pct).text, "var(--chart-1)"],
            ["Benefício validado", fmt.money(s.benefitValidated)],
            ["Investimento", fmt.money(s.investment)],
          ]} />} />
          <Line dataKey="roi" stroke={stroke} strokeWidth={2} dot={{ r: 3, fill: "var(--solid)", strokeWidth: 2 }} activeDot={{ r: 5 }} connectNulls={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Tempo por atividade antes × com IA, por mês, de um processo. */
export function BeforeAfterChart({ rows, height = 220 }: { rows: { period: string; before: number; after: number }[]; height?: number }) {
  const data = rows.map((r) => ({ ...r, label: periodLabel(r.period) }));
  return (
    <div style={{ height }} role="img" aria-label="Tempo médio por atividade antes e com IA">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={18} />
          <YAxis tick={axis} tickLine={false} axisLine={false} width={46} tickFormatter={(v) => `${fmt.int(v)}`} domain={[0, "auto"]} />
          <Tooltip cursor={{ stroke: "var(--line-strong)" }} content={({ active, payload }) => active && payload?.length ? (
            <div className="glass glass-strong float px-3 py-2.5 text-[13px] rounded-[12px]">
              <div className="font-semibold mb-1">{payload[0].payload.label}</div>
              <div className="text-ink-2">Antes da IA: <b className="text-ink num">{fmt.num(payload[0].payload.before)} min</b></div>
              <div className="text-ink-2">Com IA: <b className="text-ink num">{fmt.num(payload[0].payload.after)} min</b></div>
            </div>
          ) : null} />
          <Line dataKey="before" stroke="var(--chart-2)" strokeWidth={2} strokeDasharray="5 4" dot={false} isAnimationActive={false} />
          <Line dataKey="after" stroke="var(--chart-1)" strokeWidth={2} dot={{ r: 3, fill: "var(--solid)", strokeWidth: 2 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
