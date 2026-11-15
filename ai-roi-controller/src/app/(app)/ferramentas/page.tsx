"use client";
import { useMemo } from "react";
import { Crud } from "@/components/crud";
import { useFilters } from "@/components/filters";
import { PageHeader, Pill, Segmented, useQueryParam } from "@/components/ui";
import { useStore } from "@/data/store";
import { groupBy, valueOf } from "@/domain/engine";
import { fmt, indicatorText } from "@/lib/format";

type Tab = "ferramentas" | "contratos" | "rateio" | "uso";

export default function Ferramentas() {
  const { db } = useStore();
  const { scope } = useFilters();
  const [tab, setTab] = useQueryParam("aba", "ferramentas");
  const byTool = useMemo(() => new Map(groupBy(db, { from: scope.from, to: scope.to }, "tool").map((g) => [g.id, g.summary])), [db, scope.from, scope.to]);
  const allocated = (subId: string) => db.allocations.filter((a) => a.subscriptionId === subId).reduce((a, x) => a + x.percent, 0);
  return (
    <>
      <PageHeader title="Ferramentas e licenças" subtitle="O que a empresa contrata de IA, quanto custa e como o custo é distribuído entre os departamentos." />
      <Segmented label="Seção" value={tab as Tab} onChange={setTab} options={[["ferramentas", "Ferramentas"], ["contratos", "Contratos"], ["rateio", "Rateio"], ["uso", "Uso"]]} />
      {tab === "ferramentas" ? (
        <Crud table="tools" emptyHint="Cadastre ChatGPT, Claude, Microsoft Copilot, Gemini, APIs ou plataformas especializadas. Preços e licenças ficam nos contratos."
          extraColumns={[
            { label: "Investimento no período", num: true, sort: (r) => byTool.get(r.id)?.investment ?? 0, render: (r) => fmt.moneyShort(byTool.get(r.id)?.investment ?? 0) },
            {
              label: "ROI", num: true, sort: (r) => valueOf(byTool.get(r.id)?.roi ?? { state: "insufficient", missing: [] }) ?? -Infinity,
              render: (r) => {
                const s = byTool.get(r.id);
                if (!s) return <span className="text-ink-3">Sem dados</span>;
                const v = valueOf(s.roi);
                return v !== null ? <Pill tone={v >= 0 ? "pos" : "neg"}>{v >= 0 ? "+" : ""}{fmt.pct(v)}</Pill> : <span className="text-ink-3 text-[13px]" title={indicatorText(s.roi, fmt.pct).hint}>{indicatorText(s.roi, fmt.pct).text}</span>;
              },
            },
          ]} />
      ) : tab === "contratos" ? (
        <Crud table="subscriptions" defaults={{ billing: "per_seat", status: "active" }}
          emptyHint="Registre plano, licenças e custo mensal. O custo entra no investimento de cada mês entre a contratação e o encerramento."
          extraColumns={[
            { label: "Custo anual", num: true, sort: (r) => Number(r.monthlyCost) * 12, render: (r) => fmt.moneyShort(Number(r.monthlyCost) * 12) },
            {
              label: "Rateado", num: true, sort: (r) => allocated(r.id),
              render: (r) => { const p = allocated(r.id); return <Pill tone={p >= 99.99 ? "pos" : r.ownerDepartmentId ? "info" : "warn"} title={p < 100 ? (r.ownerDepartmentId ? "O saldo vai para o departamento responsável" : "O saldo fica sem departamento") : undefined}>{fmt.num(p)}%</Pill>; },
            },
          ]} />
      ) : tab === "rateio" ? (
        <Crud table="allocations" emptyHint="Divida o custo de um contrato entre departamentos. O critério de rateio é obrigatório e aparece na origem de cada indicador." />
      ) : (
        <Crud table="usage" emptyHint="Registre usuários ativos (e tokens, quando o fornecedor disponibiliza) com a fonte do dado. Sem isso a taxa de adoção fica indisponível — o sistema não estima uso." />
      )}
    </>
  );
}
