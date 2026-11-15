"use client";
import { Check, RotateCcw, Send, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Crud } from "@/components/crud";
import { FilterBar, useFilters } from "@/components/filters";
import { Button, Dialog, PageHeader, Pill, Segmented, useQueryParam, useToast, type Tone } from "@/components/ui";
import { BENEFIT_STATUS, type Row } from "@/data/schema";
import { useStore } from "@/data/store";
import { summarize } from "@/domain/engine";
import { fmt } from "@/lib/format";

const STATUS_TONE: Record<string, Tone> = { draft: "mute", submitted: "warn", validated: "pos", rejected: "neg" };

export default function Financeiro() {
  const { db, save, actor } = useStore();
  const { scope } = useFilters();
  const toast = useToast();
  const [tab, setTab] = useQueryParam("aba", "custos");
  const [status, setStatus] = useState("all");
  const [rejecting, setRejecting] = useState<Row | null>(null);
  const [reason, setReason] = useState("");
  const s = useMemo(() => summarize(db, { ...scope, processIds: undefined }), [db, scope]);
  const inScope = (r: Row) => String(r.period) >= scope.from && String(r.period) <= scope.to
    && (!scope.departmentIds || scope.departmentIds.includes(String(r.departmentId))) && (!scope.toolIds || !r.toolId || scope.toolIds.includes(String(r.toolId)));
  const operatorSet = !!db.org[0]?.operator;

  async function move(row: Row, next: string, extra: Record<string, unknown>, audit: string, action: string, okText: string) {
    const r = await save("benefits", { ...row, ...extra, status: next }, { audit, action });
    toast(r.ok ? "ok" : "error", r.ok ? okText : r.message ?? Object.values(r.errors)[0] ?? "Não foi possível atualizar.");
  }
  const title = (r: Row) => String(r.description || "benefício");

  const cards: [string, number, string, Tone][] = [
    ["Investimento no período", s.investment, "Licenças dos contratos + lançamentos", "info"],
    ["Benefício validado", s.benefitValidated, "Entra no ROI", "pos"],
    ["Aguardando validação", s.benefitPending, "Fora do ROI até validar", "warn"],
    ["Capacidade liberada", s.capacityValue, "Tempo disponível, não é caixa", "mute"],
  ];
  return (
    <>
      <PageHeader title="Custos e benefícios" subtitle="Tudo o que foi investido em IA e o que voltou em dinheiro. Benefício só conta no ROI depois de validado, com evidência." />
      <FilterBar process={false} />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map(([label, value, hint, tone]) => (
          <div key={label} className="glass p-4">
            <div className="text-[13px] text-ink-2 font-medium">{label}</div>
            <div className="text-[24px] font-semibold tracking-tight mt-1.5 num">{fmt.moneyShort(value)}</div>
            <div className={`mt-1.5 text-[12.5px] font-medium leading-snug ${tone === "pos" ? "text-pos" : tone === "warn" ? "text-warn" : "text-ink-3"}`}>{hint}</div>
          </div>
        ))}
      </div>
      <Segmented label="Seção" value={tab as "custos" | "beneficios"} onChange={setTab} options={[["custos", "Custos"], ["beneficios", "Benefícios"]]} />
      {tab === "custos" ? (
        <Crud table="costs" filter={inScope} defaults={{ period: scope.to }} addLabel="Lançar custo"
          emptyHint="Lance aqui APIs e tokens (conforme fatura), implantação, treinamento, consultoria e outros. As licenças vêm dos contratos automaticamente — não lance de novo." />
      ) : (
        <>
          {!operatorSet ? (
            <p className="rounded-[14px] px-4 py-2.5 bg-[var(--warn-soft)] text-[var(--warn)] text-[14px] font-medium">Informe seu nome em Configurações → Empresa para que as validações fiquem identificadas.</p>
          ) : null}
          <Crud table="benefits" defaults={{ period: scope.to }} addLabel="Lançar benefício"
            columns={["period", "departmentId", "category", "amount"]}
            filter={(r) => inScope(r) && (status === "all" || r.status === status)}
            canEdit={(r) => r.status !== "validated"}
            toolbar={
              <select className="input !w-auto" aria-label="Situação" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="all">Todas as situações</option>{BENEFIT_STATUS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            }
            emptyHint="Registre o ganho financeiro efetivo (horas extras eliminadas, terceirização reduzida, receita adicional…) com a evidência. Horas liberadas sozinhas não são benefício financeiro."
            extraColumns={[
              { label: "Evidência", render: (r) => r.evidence ? <span className="text-ink-2 text-[13px] line-clamp-2 max-w-[220px] inline-block">{String(r.evidence)}</span> : <span className="text-ink-3">Sem evidência</span> },
              {
                label: "Situação", sort: (r) => String(r.status),
                render: (r) => <Pill tone={STATUS_TONE[String(r.status)]} title={r.status === "validated" ? `Validado por ${r.validatedBy} em ${fmt.dateTime(String(r.validatedAt))}` : r.status === "rejected" ? `Motivo: ${r.rejectionReason}` : undefined}>{BENEFIT_STATUS.find(([v]) => v === r.status)?.[1]}</Pill>,
              },
            ]}
            rowActions={(r) => r.status === "draft" || r.status === "rejected" ? (
              <Button size="sm" title={r.evidence ? "Enviar para validação" : "Adicione a evidência antes de enviar"} disabled={!r.evidence}
                onClick={() => move(r, "submitted", { rejectionReason: "" }, `Enviou para validação: ${title(r)}`, "update", "Benefício enviado para validação.")}><Send size={14} />Enviar</Button>
            ) : r.status === "submitted" ? (<>
              <Button size="sm" variant="primary" onClick={() => move(r, "validated", { validatedBy: actor, validatedAt: new Date().toISOString() }, `Validou benefício de ${fmt.money(Number(r.amount))}: ${title(r)}`, "validate", "Benefício validado. Ele passa a contar no ROI.")}><Check size={14} />Validar</Button>
              <Button size="sm" onClick={() => { setReason(""); setRejecting(r); }}><X size={14} />Recusar</Button>
            </>) : (
              <Button size="sm" title="Reabrir para correção (deixa de contar no ROI)"
                onClick={() => move(r, "submitted", { validatedBy: "", validatedAt: "" }, `Reabriu benefício validado: ${title(r)}`, "update", "Benefício reaberto. Ele saiu do ROI até nova validação.")}><RotateCcw size={14} />Reabrir</Button>
            )} />
        </>
      )}
      <Dialog open={!!rejecting} onClose={() => setRejecting(null)} title="Recusar benefício"
        footer={<><Button onClick={() => setRejecting(null)}>Cancelar</Button>
          <Button variant="danger" disabled={reason.trim().length < 3} onClick={async () => {
            await move(rejecting!, "rejected", { rejectionReason: reason.trim() }, `Recusou benefício: ${title(rejecting!)} — ${reason.trim()}`, "reject", "Benefício recusado.");
            setRejecting(null);
          }}>Recusar</Button></>}>
        <label htmlFor="motivo" className="label">Motivo da recusa</label>
        <textarea id="motivo" className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex.: a evidência não comprova a redução informada" />
        <p className="help">O motivo fica visível para quem lançou e é registrado na auditoria.</p>
      </Dialog>
    </>
  );
}
