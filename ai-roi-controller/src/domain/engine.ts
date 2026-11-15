/**
 * Motor de cálculo do AI ROI Controller — funções puras, sem I/O.
 *
 * Regras centrais:
 *  - Só benefício VALIDADO entra no ROI.
 *  - Capacidade liberada (horas × custo/hora) nunca é tratada como caixa.
 *  - Sem dados suficientes, o indicador devolve um estado, não um número.
 *  - Investimento zero nunca vira divisão por zero.
 */
import { addMonths, monthsBetween, periodOf, periodRange } from "./period";
import type {
  Benefit, CostCategory, Database, ID, Measurement, Period, Process, Source, Subscription,
} from "./types";

export type Indicator =
  | { state: "ok"; value: number }
  | { state: "insufficient"; missing: string[] }
  | { state: "no_investment" }
  | { state: "unavailable"; reason: string };

const ok = (value: number): Indicator => ({ state: "ok", value });
const insufficient = (...missing: string[]): Indicator => ({ state: "insufficient", missing });
export const valueOf = (i: Indicator): number | null => (i.state === "ok" ? i.value : null);

export interface Scope {
  from: Period;
  to: Period;
  departmentIds?: ID[];
  toolIds?: ID[];
  processIds?: ID[];
}

export interface CostLine {
  period: Period;
  amount: number;
  category: CostCategory;
  departmentId?: ID;
  toolId?: ID;
  processId?: ID;
  source: Source;
  origin: { kind: "entry" | "subscription"; id: ID; label: string; rationale?: string };
}

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const sum = <T>(xs: T[], f: (x: T) => number) => xs.reduce((a, x) => a + f(x), 0);
const has = (set: ID[] | undefined, id: ID | undefined) => !set?.length || (id !== undefined && set.includes(id));

/** Um contrato gera custo nos meses entre a contratação e o encerramento (inclusive). */
export function subscriptionActiveIn(s: Subscription, p: Period): boolean {
  if (!s.contractedOn || periodOf(s.contractedOn) > p) return false;
  return !s.endedOn || p <= periodOf(s.endedOn);
}

const cache = new WeakMap<Database, Map<string, CostLine[]>>();

/**
 * Todas as linhas de custo do intervalo: lançamentos + custo mensal dos contratos,
 * distribuído pelas regras de rateio. O saldo não rateado vai para o departamento
 * responsável pelo contrato (ou fica sem departamento, visível como "não atribuído").
 * A soma das linhas de um contrato em um mês é sempre igual ao custo mensal.
 */
export function expandCostLines(db: Database, from: Period, to: Period): CostLine[] {
  const key = `${from}|${to}`;
  let byRange = cache.get(db);
  if (!byRange) cache.set(db, (byRange = new Map()));
  const hit = byRange.get(key);
  if (hit) return hit;

  const lines: CostLine[] = [];
  for (const c of db.costs) {
    if (c.period < from || c.period > to) continue;
    const proc = c.processId ? db.processes.find((p) => p.id === c.processId) : undefined;
    lines.push({
      period: c.period, amount: c.amount, category: c.category,
      departmentId: c.departmentId ?? proc?.departmentId, toolId: c.toolId ?? proc?.toolId, processId: c.processId,
      source: c.source, origin: { kind: "entry", id: c.id, label: c.description || "Lançamento de custo" },
    });
  }
  const periods = periodRange(from, to);
  for (const s of db.subscriptions) {
    const tool = db.tools.find((t) => t.id === s.toolId);
    const label = `${tool?.name ?? "Ferramenta"}${s.plan ? ` · ${s.plan}` : ""}`;
    const allocs = db.allocations.filter((a) => a.subscriptionId === s.id && a.percent > 0);
    const totalPct = sum(allocs, (a) => a.percent);
    const scale = totalPct > 100 ? 100 / totalPct : 1;
    for (const p of periods) {
      if (!subscriptionActiveIn(s, p) || !(s.monthlyCost > 0)) continue;
      let assigned = 0;
      for (const a of allocs) {
        const amount = round2((s.monthlyCost * a.percent * scale) / 100);
        assigned = round2(assigned + amount);
        lines.push({
          period: p, amount, category: "license", departmentId: a.departmentId, toolId: s.toolId, source: s.source,
          origin: { kind: "subscription", id: s.id, label, rationale: `Rateio de ${a.percent}%: ${a.rationale}` },
        });
      }
      const rest = round2(s.monthlyCost - assigned);
      if (Math.abs(rest) >= 0.01) {
        lines.push({
          period: p, amount: rest, category: "license", departmentId: s.ownerDepartmentId, toolId: s.toolId, source: s.source,
          origin: {
            kind: "subscription", id: s.id, label,
            rationale: allocs.length
              ? s.ownerDepartmentId ? "Saldo não rateado, atribuído ao departamento responsável" : "Saldo não rateado, sem departamento"
              : s.ownerDepartmentId ? "Sem rateio: custo integral do departamento responsável" : "Sem rateio e sem departamento responsável",
          },
        });
      }
    }
  }
  byRange.set(key, lines);
  return lines;
}

export interface Summary {
  scope: Scope;
  months: number;
  investment: number;
  byCategory: Record<CostCategory, number>;
  /** Custos sem departamento (aparecem só na visão da empresa). */
  unassigned: number;
  benefitValidated: number;
  benefitPending: number;
  benefitDraft: number;
  hoursSaved: number;
  capacityValue: number;
  activities: number;
  deliveriesTotal: number;
  deliveriesApproved: number;
  processCount: number;
  measuredProcessCount: number;
  activeUsers: number | null;
  seats: number | null;
  /** Processos do filtro sem "% do custo da ferramenta" — custo atribuído incompleto. */
  missingCostShare: ID[];
  roi: Indicator;
  net: Indicator;
  benefitPerReal: Indicator;
  costPerApproved: Indicator;
  approvalRate: Indicator;
  usageRate: Indicator;
  reworkReduction: Indicator;
  adoptionRate: Indicator;
  /** Quanto da capacidade liberada virou benefício financeiro validado. */
  realizationRate: Indicator;
  paybackMonths: Indicator;
  lines: CostLine[];
  benefits: Benefit[];
  measurements: Measurement[];
}

export const hoursSavedOf = (m: Measurement) => ((m.minutesBefore - m.minutesAfter) * m.activities) / 60;
export const capacityOf = (m: Measurement) => hoursSavedOf(m) * m.hourlyCost;

function scopedCostLines(db: Database, scope: Scope): { lines: CostLine[]; missingCostShare: ID[] } {
  const all = expandCostLines(db, scope.from, scope.to).filter(
    (l) => has(scope.departmentIds, l.departmentId) && has(scope.toolIds, l.toolId),
  );
  if (!scope.processIds?.length) return { lines: all, missingCostShare: [] };

  const procs = db.processes.filter((p) => scope.processIds!.includes(p.id));
  const missing = new Set<ID>();
  const lines: CostLine[] = [];
  for (const l of all) {
    if (l.processId) {
      if (scope.processIds.includes(l.processId)) lines.push(l);
      continue;
    }
    for (const p of procs) {
      if (l.departmentId !== p.departmentId || l.toolId !== p.toolId) continue;
      if (p.costSharePct === undefined || p.costSharePct === null) { missing.add(p.id); continue; }
      const amount = round2((l.amount * p.costSharePct) / 100);
      if (amount) {
        lines.push({
          ...l, amount, processId: p.id,
          origin: { ...l.origin, rationale: `${p.costSharePct}% do custo atribuído ao processo. ${l.origin.rationale ?? ""}`.trim() },
        });
      }
    }
  }
  return { lines, missingCostShare: [...missing] };
}

export function summarize(db: Database, scope: Scope): Summary {
  const months = Math.max(0, monthsBetween(scope.from, scope.to));
  const procById = new Map(db.processes.map((p) => [p.id, p]));
  const inProcScope = (p: Process | undefined) =>
    !!p && has(scope.departmentIds, p.departmentId) && has(scope.toolIds, p.toolId) && has(scope.processIds, p.id);

  const { lines, missingCostShare } = scopedCostLines(db, scope);
  const byCategory = { license: 0, api: 0, implementation: 0, training: 0, consulting: 0, other: 0 } as Record<CostCategory, number>;
  for (const l of lines) byCategory[l.category] = round2(byCategory[l.category] + l.amount);
  const investment = round2(sum(lines, (l) => l.amount));
  const unassigned = round2(sum(lines.filter((l) => !l.departmentId), (l) => l.amount));

  const benefits = db.benefits.filter((b) => {
    if (b.period < scope.from || b.period > scope.to) return false;
    const toolId = b.toolId ?? (b.processId ? procById.get(b.processId)?.toolId : undefined);
    if (scope.processIds?.length && !(b.processId && scope.processIds.includes(b.processId))) return false;
    if (scope.toolIds?.length && !has(scope.toolIds, toolId)) return false;
    return has(scope.departmentIds, b.departmentId);
  });
  const byStatus = (s: Benefit["status"]) => round2(sum(benefits.filter((b) => b.status === s), (b) => b.amount));
  const benefitValidated = byStatus("validated");
  const validatedCount = benefits.filter((b) => b.status === "validated").length;

  const measurements = db.measurements.filter(
    (m) => m.period >= scope.from && m.period <= scope.to && inProcScope(procById.get(m.processId)),
  );
  const hoursSaved = sum(measurements, hoursSavedOf);
  const capacityValue = round2(sum(measurements, capacityOf));
  const withDeliveries = measurements.filter((m) => (m.deliveriesTotal ?? 0) > 0);
  const deliveriesTotal = sum(withDeliveries, (m) => m.deliveriesTotal!);
  const approvedKnown = withDeliveries.filter((m) => m.deliveriesApproved !== undefined);
  const deliveriesApproved = sum(approvedKnown, (m) => m.deliveriesApproved!);
  const usedKnown = withDeliveries.filter((m) => m.deliveriesUsed !== undefined);

  // Retrabalho: linha de base do processo × retrabalho medido, ponderados pelas entregas.
  const reworkRows = withDeliveries.filter(
    (m) => m.reworkCount !== undefined && procById.get(m.processId)?.baselineReworkPct !== undefined,
  );
  const reworkTotal = sum(reworkRows, (m) => m.deliveriesTotal!);

  const processes = db.processes.filter((p) => inProcScope(p) && periodOf(p.startedOn) <= scope.to);

  // Adoção: só com dado de uso de fonte informada; nunca estimada.
  const usage = db.usage.filter(
    (u) => u.period >= scope.from && u.period <= scope.to && u.activeUsers !== undefined &&
      has(scope.toolIds, u.toolId) && has(scope.departmentIds, u.departmentId),
  );
  const lastUsagePeriod = usage.reduce<Period | null>((a, u) => (a === null || u.period > a ? u.period : a), null);
  const lastUsage = usage.filter((u) => u.period === lastUsagePeriod);
  const activeUsers = lastUsagePeriod ? sum(lastUsage, (u) => u.activeUsers!) : null;
  let seats: number | null = null;
  let adoptionRate: Indicator;
  if (scope.processIds?.length) adoptionRate = { state: "unavailable", reason: "Uso não é registrado por processo" };
  else if (scope.departmentIds?.length) adoptionRate = { state: "unavailable", reason: "Licenças não são registradas por departamento" };
  else if (!lastUsagePeriod) adoptionRate = insufficient("usuários ativos informados");
  else {
    const toolIds = new Set(lastUsage.map((u) => u.toolId));
    seats = sum(
      db.subscriptions.filter((s) => toolIds.has(s.toolId) && subscriptionActiveIn(s, lastUsagePeriod) && s.seats),
      (s) => s.seats!,
    );
    adoptionRate = seats > 0 ? ok(activeUsers! / seats) : insufficient("quantidade de licenças nos contratos");
  }

  const hasCosts = lines.length > 0;
  let roi: Indicator, benefitPerReal: Indicator, paybackMonths: Indicator;
  if (investment <= 0) {
    roi = benefitPerReal = paybackMonths = benefitValidated > 0 ? { state: "no_investment" } : insufficient(hasCosts ? "investimento maior que zero" : "custos de IA");
  } else if (validatedCount === 0) {
    roi = benefitPerReal = paybackMonths = insufficient("benefícios financeiros validados");
  } else {
    roi = ok((benefitValidated - investment) / investment);
    benefitPerReal = ok(benefitValidated / investment);
    // Meses decorridos desde o primeiro custo ou benefício do período — meses vazios antes disso não diluem a média.
    const firstPeriod = [...lines.map((l) => l.period), ...benefits.filter((x) => x.status === "validated").map((x) => x.period)].sort()[0];
    const elapsed = Math.max(1, monthsBetween(firstPeriod, scope.to));
    paybackMonths = benefitValidated > 0 ? ok(investment / (benefitValidated / elapsed)) : insufficient("benefício validado maior que zero");
  }
  const net: Indicator = !hasCosts && validatedCount === 0
    ? insufficient("custos de IA", "benefícios financeiros validados")
    : ok(round2(benefitValidated - investment));

  let costPerApproved: Indicator;
  if (!hasCosts) costPerApproved = insufficient("custos de IA");
  else if (missingCostShare.length) costPerApproved = insufficient("% do custo da ferramenta atribuído ao processo");
  else if (!approvedKnown.length) costPerApproved = insufficient("entregas aprovadas nas medições");
  else if (deliveriesApproved <= 0) costPerApproved = insufficient("ao menos uma entrega aprovada");
  else costPerApproved = ok(investment / deliveriesApproved);

  return {
    scope, months, investment, byCategory, unassigned,
    benefitValidated, benefitPending: byStatus("submitted"), benefitDraft: byStatus("draft"),
    hoursSaved, capacityValue, activities: sum(measurements, (m) => m.activities),
    deliveriesTotal, deliveriesApproved,
    processCount: processes.length, measuredProcessCount: new Set(measurements.map((m) => m.processId)).size,
    activeUsers, seats, missingCostShare,
    roi, net, benefitPerReal, costPerApproved,
    approvalRate: approvedKnown.length
      ? ok(deliveriesApproved / sum(approvedKnown, (m) => m.deliveriesTotal!)) : insufficient("entregas totais e aprovadas"),
    usageRate: usedKnown.length
      ? ok(sum(usedKnown, (m) => m.deliveriesUsed!) / sum(usedKnown, (m) => m.deliveriesTotal!)) : insufficient("entregas aproveitadas"),
    reworkReduction: reworkTotal > 0
      ? ok(
          sum(reworkRows, (m) => procById.get(m.processId)!.baselineReworkPct! * m.deliveriesTotal!) / reworkTotal / 100 -
            sum(reworkRows, (m) => m.reworkCount!) / reworkTotal,
        )
      : insufficient("retrabalho antes da IA (no processo) e retrabalho medido"),
    adoptionRate,
    realizationRate: capacityValue > 0 ? ok(benefitValidated / capacityValue) : insufficient("medições de produtividade com ganho de tempo"),
    paybackMonths,
    lines, benefits, measurements,
  };
}

/** Mesmo intervalo, imediatamente anterior — para comparar períodos. */
export function previousScope(scope: Scope): Scope {
  const n = monthsBetween(scope.from, scope.to);
  return { ...scope, from: addMonths(scope.from, -n), to: addMonths(scope.from, -1) };
}

export function monthly(db: Database, scope: Scope): { period: Period; summary: Summary }[] {
  return periodRange(scope.from, scope.to).map((p) => ({ period: p, summary: summarize(db, { ...scope, from: p, to: p }) }));
}

export type Dimension = "department" | "tool" | "process";
export interface GroupRow { id: ID; name: string; summary: Summary }

export function groupBy(db: Database, scope: Scope, dim: Dimension): GroupRow[] {
  const rows: GroupRow[] = [];
  if (dim === "department") {
    for (const d of db.departments) {
      if (!has(scope.departmentIds, d.id)) continue;
      rows.push({ id: d.id, name: d.name, summary: summarize(db, { ...scope, departmentIds: [d.id] }) });
    }
  } else if (dim === "tool") {
    for (const t of db.tools) {
      if (!has(scope.toolIds, t.id)) continue;
      rows.push({ id: t.id, name: t.name, summary: summarize(db, { ...scope, toolIds: [t.id] }) });
    }
  } else {
    for (const p of db.processes) {
      if (!has(scope.processIds, p.id) || !has(scope.departmentIds, p.departmentId) || !has(scope.toolIds, p.toolId)) continue;
      rows.push({ id: p.id, name: p.name, summary: summarize(db, { ...scope, processIds: [p.id] }) });
    }
  }
  return rows.filter((r) => r.summary.lines.length || r.summary.benefits.length || r.summary.measurements.length);
}

/** Primeiro e último mês com qualquer dado — define o intervalo padrão do painel. */
export function dataRange(db: Database): { from: Period; to: Period } | null {
  const ps: Period[] = [
    ...db.costs.map((c) => c.period), ...db.benefits.map((b) => b.period), ...db.measurements.map((m) => m.period),
    ...db.subscriptions.filter((s) => s.contractedOn).map((s) => periodOf(s.contractedOn)),
  ].filter(Boolean);
  if (!ps.length) return null;
  ps.sort();
  return { from: ps[0], to: ps[ps.length - 1] };
}
