/**
 * Índice de maturidade em IA por departamento e benchmark entre áreas.
 *
 * O índice (0–100) é a média de quatro dimensões, cada uma calculada só com dados
 * registrados. Dimensão sem dado fica de fora e é sinalizada; com menos de três
 * dimensões o índice não é calculado. As faixas abaixo são critérios do produto,
 * não verdades universais — ficam aqui, em um só lugar, para serem ajustadas.
 */
import { groupBy, hoursSavedOf, summarize, valueOf, type Scope, type Summary } from "./engine";
import type { Database, ID } from "./types";

export type DimensionKey = "adoption" | "productivity" | "quality" | "financial";
export const DIMENSIONS: { key: DimensionKey; label: string; measure: string; rule: string }[] = [
  { key: "adoption", label: "Adoção", measure: "Colaboradores que usam IA", rule: "Usuários ativos ÷ colaboradores do departamento. 80% ou mais = 100 pontos." },
  { key: "productivity", label: "Produtividade", measure: "Capacidade liberada", rule: "Horas liberadas ÷ (colaboradores × 160 h × meses). 10% ou mais = 100 pontos." },
  { key: "quality", label: "Qualidade", measure: "Entregas aprovadas", rule: "Taxa de aprovação das entregas feitas com IA. 50% = 0 pontos; 95% ou mais = 100 pontos." },
  { key: "financial", label: "Retorno", measure: "ROI", rule: "ROI com benefícios validados. −50% ou menos = 0 pontos; +100% ou mais = 100 pontos." },
];
export const RANGES: Record<DimensionKey, [zero: number, full: number]> = {
  adoption: [0, 0.8], productivity: [0, 0.1], quality: [0.5, 0.95], financial: [-0.5, 1],
};
export const LEVELS: { min: number; label: string; tone: "neg" | "warn" | "info" | "pos" }[] = [
  { min: 80, label: "Referência", tone: "pos" },
  { min: 60, label: "Consolidado", tone: "info" },
  { min: 40, label: "Em desenvolvimento", tone: "warn" },
  { min: 0, label: "Inicial", tone: "neg" },
];
export const levelOf = (score: number) => LEVELS.find((l) => score >= l.min)!;
export const HOURS_PER_MONTH = 160;

const clamp = (n: number) => Math.max(0, Math.min(100, n));
export const scoreOf = (key: DimensionKey, value: number) => {
  const [zero, full] = RANGES[key];
  return Math.round(clamp(((value - zero) / (full - zero)) * 100));
};

export interface DimensionResult { key: DimensionKey; label: string; value: number | null; score: number | null; missing?: string }
export interface DeptMaturity {
  id: ID;
  name: string;
  headcount?: number;
  dimensions: Record<DimensionKey, DimensionResult>;
  /** null quando há menos de três dimensões com dados. */
  score: number | null;
  measured: number;
  summary: Summary;
}

export function maturity(db: Database, scope: Scope): DeptMaturity[] {
  const base: Scope = { from: scope.from, to: scope.to };
  return db.departments.map((d) => {
    const s = summarize(db, { ...base, departmentIds: [d.id] });
    const dim = (key: DimensionKey, value: number | null, missing: string): DimensionResult => ({
      key, label: DIMENSIONS.find((x) => x.key === key)!.label, value,
      score: value === null ? null : scoreOf(key, value), ...(value === null ? { missing } : {}),
    });

    // Adoção: no mês mais recente com uso informado, a ferramenta com mais usuários ativos
    // (somar ferramentas contaria a mesma pessoa mais de uma vez).
    const usage = db.usage.filter((u) => u.departmentId === d.id && u.activeUsers !== undefined && u.period >= base.from && u.period <= base.to);
    const lastPeriod = usage.map((u) => u.period).sort().pop();
    const active = lastPeriod ? Math.max(...usage.filter((u) => u.period === lastPeriod).map((u) => u.activeUsers!)) : null;
    const adoption = !d.headcount ? null : active === null ? null : Math.min(1, active / d.headcount);

    const productivity = d.headcount && s.measurements.length ? s.hoursSaved / (d.headcount * HOURS_PER_MONTH * s.months) : null;

    const dimensions = {
      adoption: dim("adoption", adoption, !d.headcount ? "número de colaboradores do departamento" : "usuários ativos informados em Ferramentas → Uso"),
      productivity: dim("productivity", productivity, !d.headcount ? "número de colaboradores do departamento" : "medições de produtividade no período"),
      quality: dim("quality", valueOf(s.approvalRate), "entregas totais e aprovadas nas medições"),
      financial: dim("financial", valueOf(s.roi), s.roi.state === "insufficient" ? s.roi.missing.join("; ") : "investimento registrado"),
    };
    const scores = Object.values(dimensions).map((x) => x.score).filter((x): x is number => x !== null);
    return {
      id: d.id, name: d.name, headcount: d.headcount, dimensions, measured: scores.length, summary: s,
      score: scores.length >= 3 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
    };
  });
}

/** Índice da empresa: média simples dos departamentos com índice calculado. */
export function companyIndex(rows: DeptMaturity[]): number | null {
  const scored = rows.filter((r) => r.score !== null);
  return scored.length ? Math.round(scored.reduce((a, r) => a + r.score!, 0) / scored.length) : null;
}

export interface BenchmarkRow { key: DimensionKey; label: string; leader: DeptMaturity | null; laggard: DeptMaturity | null; median: number | null; count: number }
export function benchmark(rows: DeptMaturity[]): BenchmarkRow[] {
  return DIMENSIONS.map(({ key, label }) => {
    const withData = rows.filter((r) => r.dimensions[key].value !== null).sort((a, b) => b.dimensions[key].value! - a.dimensions[key].value!);
    const values = withData.map((r) => r.dimensions[key].value!);
    const mid = Math.floor(values.length / 2);
    return {
      key, label, count: withData.length,
      leader: withData[0] ?? null,
      laggard: withData.length > 1 ? withData[withData.length - 1] : null,
      median: values.length ? (values.length % 2 ? values[mid] : (values[mid - 1] + values[mid]) / 2) : null,
    };
  });
}

const pct = (n: number) => `${(n * 100).toLocaleString("pt-BR", { maximumFractionDigits: Math.abs(n) < 0.1 ? 1 : 0 })}%`;
const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const hrs = (n: number) => `${n.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} h`;

export interface Opportunity { id: string; departmentId: ID; department: string; dimension: DimensionKey; label: string; gap: number; title: string; detail: string; reference: string }

/**
 * Onde replicar: para cada departamento, a dimensão com maior distância para a área
 * de referência, descrita com os números de ambas. É uma comparação, não uma previsão.
 */
export function opportunities(db: Database, scope: Scope, rows: DeptMaturity[]): Opportunity[] {
  const bench = benchmark(rows);
  const out: Opportunity[] = [];
  const procStats = (deptId: ID) =>
    groupBy(db, { from: scope.from, to: scope.to, departmentIds: [deptId] }, "process").map((g) => ({
      name: g.name, hours: g.summary.measurements.reduce((a, m) => a + hoursSavedOf(m), 0), approval: valueOf(g.summary.approvalRate),
    }));
  for (const r of rows) {
    let best: Opportunity | null = null;
    for (const b of bench) {
      const mine = r.dimensions[b.key];
      if (!b.leader || b.leader.id === r.id || mine.score === null) continue;
      const ref = b.leader.dimensions[b.key];
      const gap = ref.score! - mine.score;
      if (gap < 15 || (best && gap <= best.gap)) continue;
      const L = b.leader;
      let title = "", detail = "";
      if (b.key === "adoption") {
        const more = Math.round((ref.value! - mine.value!) * (r.headcount ?? 0));
        title = `${pct(mine.value!)} dos colaboradores usam IA; em ${L.name} são ${pct(ref.value!)}`;
        detail = `Chegar ao mesmo nível significaria mais ${more} ${more === 1 ? "pessoa usando" : "pessoas usando"} IA em ${r.name}. Veja como ${L.name} treinou e distribuiu as licenças.`;
      } else if (b.key === "productivity") {
        const top = procStats(L.id).sort((a, x) => x.hours - a.hours)[0];
        title = `Libera ${pct(mine.value!)} da capacidade; ${L.name} libera ${pct(ref.value!)}`;
        detail = `${r.name} liberou ${hrs(r.summary.hoursSaved)} no período.${top ? ` Em ${L.name}, o processo que mais contribui é “${top.name}” (${hrs(top.hours)}).` : ""} Procure atividades repetitivas e de alto volume que ainda não usam IA.`;
      } else if (b.key === "quality") {
        const worst = procStats(r.id).filter((p) => p.approval !== null).sort((a, x) => a.approval! - x.approval!)[0];
        title = `Aprova ${pct(mine.value!)} das entregas feitas com IA; ${L.name} aprova ${pct(ref.value!)}`;
        detail = `${worst ? `O processo com menor aprovação em ${r.name} é “${worst.name}” (${pct(worst.approval!)}). ` : ""}Entregas reprovadas voltam como retrabalho e consomem o tempo ganho. Compare como ${L.name} revisa o que a IA produz.`;
      } else {
        const real = valueOf(r.summary.realizationRate);
        title = `ROI de ${pct(mine.value!)}; ${L.name} tem ${pct(ref.value!)}`;
        detail = `${r.name} investiu ${brl(r.summary.investment)} e validou ${brl(r.summary.benefitValidated)}${real !== null ? `, o equivalente a ${pct(real)} da capacidade liberada (${brl(r.summary.capacityValue)})` : ""}. Verifique se há ganhos ainda não lançados ou sem validação, ou licenças sem uso.`;
      }
      best = { id: `${r.id}-${b.key}`, departmentId: r.id, department: r.name, dimension: b.key, label: b.label, gap, title, detail, reference: L.name };
    }
    if (best) out.push(best);
  }
  return out.sort((a, b) => b.gap - a.gap);
}
