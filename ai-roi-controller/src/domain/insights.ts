/**
 * Recomendações baseadas exclusivamente nos dados registrados.
 * Cada recomendação cita os números que a originaram; nada é estimado.
 */
import { groupBy, hoursSavedOf, subscriptionActiveIn, summarize, type Scope } from "./engine";
import { addMonths, periodLabel, periodOf } from "./period";
import type { Database, ID } from "./types";

export type Tone = "pos" | "warn" | "neg" | "info";
export interface Insight {
  id: string;
  tone: Tone;
  title: string;
  detail: string;
  /** Rota onde o usuário resolve ou investiga. */
  href: string;
  /** Maior = mais importante. */
  weight: number;
}

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const pct = (n: number) => `${(n * 100).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}%`;
const hrs = (n: number) => `${n.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} h`;

export function buildInsights(db: Database, scope: Scope, today: string): Insight[] {
  const out: Insight[] = [];
  const s = summarize(db, scope);
  const name = (list: { id: ID; name: string }[], id?: ID) => list.find((x) => x.id === id)?.name ?? "—";

  if (s.benefitPending > 0) {
    out.push({
      id: "pending", tone: "warn", weight: 90, href: "/financeiro?aba=beneficios",
      title: `${brl(s.benefitPending)} em benefícios aguardando validação`,
      detail: "Benefícios enviados só entram no ROI depois de validados por um responsável autorizado.",
    });
  }
  if (s.realizationRate.state === "ok" && s.capacityValue > 0 && s.realizationRate.value < 0.25) {
    out.push({
      id: "realization", tone: "info", weight: 80, href: "/financeiro?aba=beneficios",
      title: `Só ${pct(s.realizationRate.value)} da capacidade liberada virou resultado financeiro`,
      detail: `${hrs(s.hoursSaved)} liberadas equivalem a ${brl(s.capacityValue)} em capacidade, mas ${brl(s.benefitValidated)} foram validados como benefício. Verifique para onde esse tempo foi (horas extras evitadas, terceirização reduzida, mais entregas) e registre com evidência.`,
    });
  }
  for (const g of groupBy(db, scope, "tool")) {
    const r = g.summary;
    if (r.roi.state === "ok" && r.roi.value < 0) {
      out.push({
        id: `tool-neg-${g.id}`, tone: "neg", weight: 70 + Math.min(20, r.investment / 5000), href: "/ferramentas",
        title: `${g.name}: retorno negativo (${pct(r.roi.value)})`,
        detail: `Investimento de ${brl(r.investment)} contra ${brl(r.benefitValidated)} em benefício validado no período. Avalie reduzir licenças, redirecionar o uso ou registrar benefícios ainda não lançados.`,
      });
    } else if (r.investment > 0 && r.roi.state === "insufficient" && !r.measurements.length) {
      out.push({
        id: `tool-blind-${g.id}`, tone: "warn", weight: 60, href: "/processos",
        title: `${g.name}: ${brl(r.investment)} investidos sem nenhum processo medido`,
        detail: "Não há medição de produtividade nem benefício validado ligados a esta ferramenta. Cadastre os processos que a utilizam para saber se o investimento se justifica.",
      });
    }
  }
  const depts = groupBy(db, scope, "department").filter((g) => g.summary.roi.state === "ok");
  if (depts.length >= 2) {
    const best = depts.reduce((a, b) => ((a.summary.roi as { value: number }).value >= (b.summary.roi as { value: number }).value ? a : b));
    const v = (best.summary.roi as { value: number }).value;
    if (v > 0) {
      out.push({
        id: "best-dept", tone: "pos", weight: 40, href: "/departamentos",
        title: `${best.name} tem o maior retorno: ${pct(v)}`,
        detail: `${brl(best.summary.benefitValidated)} validados para ${brl(best.summary.investment)} investidos. Bom candidato para ampliar o uso de IA e replicar as práticas em outras áreas.`,
      });
    }
  }
  for (const p of db.processes) {
    const ms = s.measurements.filter((m) => m.processId === p.id).sort((a, b) => a.period.localeCompare(b.period));
    if (!ms.length) continue;
    const last = ms[ms.length - 1];
    if (last.minutesAfter >= last.minutesBefore) {
      out.push({
        id: `proc-slow-${p.id}`, tone: "neg", weight: 65, href: `/processos?id=${p.id}`,
        title: `${p.name}: a IA não está reduzindo o tempo`,
        detail: `Na última medição (${periodLabel(last.period)}), cada atividade levou ${last.minutesAfter} min contra ${last.minutesBefore} min antes da IA. Revise a forma de uso ou reavalie a aplicação neste processo.`,
      });
    }
    const total = last.deliveriesTotal ?? 0;
    if (total > 0 && last.deliveriesApproved !== undefined && last.deliveriesApproved / total < 0.7) {
      out.push({
        id: `proc-quality-${p.id}`, tone: "warn", weight: 55, href: `/processos?id=${p.id}`,
        title: `${p.name}: taxa de aprovação de ${pct(last.deliveriesApproved / total)}`,
        detail: `${last.deliveriesApproved} de ${total} entregas aprovadas na última medição. Ganho de tempo com baixa aprovação costuma voltar como retrabalho.`,
      });
    }
  }
  const top = db.processes
    .map((p) => ({ p, h: s.measurements.filter((m) => m.processId === p.id).reduce((a, m) => a + hoursSavedOf(m), 0) }))
    .filter((x) => x.h > 0)
    .sort((a, b) => b.h - a.h)[0];
  if (top) {
    out.push({
      id: "top-process", tone: "pos", weight: 35, href: `/processos?id=${top.p.id}`,
      title: `${top.p.name} é o processo que mais libera tempo`,
      detail: `${hrs(top.h)} liberadas no período em ${name(db.departments, top.p.departmentId)}.`,
    });
  }

  // Itens de governança — independem do período filtrado.
  const now = today.slice(0, 7);
  const in60 = new Date(new Date(today).getTime() + 60 * 864e5).toISOString().slice(0, 10);
  for (const sub of db.subscriptions) {
    if (!subscriptionActiveIn(sub, now)) continue;
    const tool = name(db.tools, sub.toolId);
    if (sub.renewsOn && sub.renewsOn >= today && sub.renewsOn <= in60) {
      out.push({
        id: `renew-${sub.id}`, tone: "info", weight: 50, href: "/ferramentas?aba=contratos",
        title: `${tool} renova em ${sub.renewsOn.split("-").reverse().join("/")}`,
        detail: `Contrato de ${brl(sub.monthlyCost)} por mês. Use o retorno apurado para decidir entre renovar, renegociar ou reduzir.`,
      });
    }
    const allocated = db.allocations.filter((a) => a.subscriptionId === sub.id).reduce((a, x) => a + x.percent, 0);
    if (allocated < 100 && !sub.ownerDepartmentId) {
      out.push({
        id: `unalloc-${sub.id}`, tone: "warn", weight: 45, href: "/ferramentas?aba=rateio",
        title: `${tool}: ${100 - allocated}% do custo sem departamento`,
        detail: "Esse valor entra no investimento da empresa, mas não aparece em nenhum departamento. Complete o rateio ou informe o departamento responsável.",
      });
    }
    if (sub.seats) {
      const lastUse = db.usage
        .filter((u) => u.toolId === sub.toolId && u.activeUsers !== undefined)
        .sort((a, b) => b.period.localeCompare(a.period));
      if (lastUse.length) {
        const period = lastUse[0].period;
        const active = lastUse.filter((u) => u.period === period).reduce((a, u) => a + u.activeUsers!, 0);
        const seats = db.subscriptions.filter((x) => x.toolId === sub.toolId && subscriptionActiveIn(x, period)).reduce((a, x) => a + (x.seats ?? 0), 0);
        const idle = seats - active;
        if (seats > 0 && idle / seats >= 0.2 && sub.unitPrice && !out.some((o) => o.id === `idle-${sub.toolId}`)) {
          out.push({
            id: `idle-${sub.toolId}`, tone: "warn", weight: 75, href: "/ferramentas?aba=uso",
            title: `${tool}: ${idle} de ${seats} licenças sem uso em ${periodLabel(period)}`,
            detail: `${active} usuários ativos informados. As licenças ociosas custam ${brl(idle * sub.unitPrice)} por mês.`,
          });
        }
      }
    }
  }
  const stale = addMonths(now, -2);
  const staleProcs = db.processes.filter((p) => {
    if (periodOf(p.startedOn) > stale) return false;
    const last = db.measurements.filter((m) => m.processId === p.id).map((m) => m.period).sort().pop();
    return !last || last < stale;
  });
  if (staleProcs.length) {
    out.push({
      id: "stale", tone: "info", weight: 30, href: "/processos",
      title: `${staleProcs.length} processo(s) sem medição recente`,
      detail: `Sem medição há mais de dois meses: ${staleProcs.slice(0, 3).map((p) => p.name).join(", ")}${staleProcs.length > 3 ? "…" : ""}. Indicadores desatualizados perdem valor para decisão.`,
    });
  }
  return out.sort((a, b) => b.weight - a.weight);
}
