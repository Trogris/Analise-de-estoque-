"use client";
import { useMemo } from "react";
import { Crud } from "@/components/crud";
import { FilterBar, useFilters } from "@/components/filters";
import { PageHeader, Pill } from "@/components/ui";
import { useStore } from "@/data/store";
import { groupBy, valueOf } from "@/domain/engine";
import { periodLabel } from "@/domain/period";
import { fmt, indicatorText } from "@/lib/format";

export default function Departamentos() {
  const { db } = useStore();
  const { scope } = useFilters();
  const byId = useMemo(() => new Map(groupBy(db, { ...scope, departmentIds: undefined, processIds: undefined }, "department").map((g) => [g.id, g.summary])), [db, scope]);
  const months = Math.max(1, byId.values().next().value?.months ?? 1);
  return (
    <>
      <PageHeader title="Departamentos" subtitle={`A unidade de análise do sistema. Resultados de ${periodLabel(scope.from)} a ${periodLabel(scope.to)}.`} />
      <FilterBar process={false} />
      <Crud table="departments" columns={["name", "manager", "headcount"]}
        filter={(r) => !scope.departmentIds || scope.departmentIds.includes(r.id)}
        emptyHint="Cadastre as áreas da empresa (Produção, Engenharia, RH, Financeiro…). Custos, processos e benefícios são sempre ligados a um departamento."
        extraColumns={[
          { label: "Investimento", num: true, sort: (r) => byId.get(r.id)?.investment ?? 0, render: (r) => fmt.moneyShort(byId.get(r.id)?.investment ?? 0) },
          { label: "Benefício validado", num: true, sort: (r) => byId.get(r.id)?.benefitValidated ?? 0, render: (r) => fmt.moneyShort(byId.get(r.id)?.benefitValidated ?? 0) },
          {
            label: "ROI", num: true, sort: (r) => valueOf(byId.get(r.id)?.roi ?? { state: "insufficient", missing: [] }) ?? -Infinity,
            render: (r) => {
              const s = byId.get(r.id);
              if (!s) return <span className="text-ink-3">Sem dados</span>;
              const v = valueOf(s.roi);
              return v !== null ? <Pill tone={v >= 0 ? "pos" : "neg"}>{v >= 0 ? "+" : ""}{fmt.pct(v)}</Pill> : <span className="text-ink-3 text-[13px]" title={indicatorText(s.roi, fmt.pct).hint}>{indicatorText(s.roi, fmt.pct).text}</span>;
            },
          },
          { label: "Horas liberadas", num: true, sort: (r) => byId.get(r.id)?.hoursSaved ?? 0, render: (r) => fmt.hours(byId.get(r.id)?.hoursSaved ?? 0) },
          {
            label: "Produtividade", num: true,
            sort: (r) => (r.headcount ? (byId.get(r.id)?.hoursSaved ?? 0) / (Number(r.headcount) * 160 * months) : -1),
            render: (r) => {
              const s = byId.get(r.id);
              if (!r.headcount || !s) return <span className="text-ink-3" title="Informe o número de colaboradores para calcular">—</span>;
              const share = s.hoursSaved / (Number(r.headcount) * 160 * months);
              return <span title="Horas liberadas ÷ (colaboradores × 160 h × meses)">{fmt.pct(share)} da capacidade</span>;
            },
          },
        ]} />
    </>
  );
}
