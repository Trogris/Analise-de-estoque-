import { describe, expect, it } from "vitest";
import { expandCostLines, groupBy, monthly, previousScope, summarize, valueOf } from "./engine";
import { buildInsights } from "./insights";
import { addMonths, monthsBetween, periodRange } from "./period";
import { emptyDb, type Base, type Database } from "./types";

const base = (id: string): Base => ({ id, createdAt: "", updatedAt: "", source: "manual" });
const scope = { from: "2026-01", to: "2026-03" };

function fixture(): Database {
  const db = emptyDb();
  db.departments.push({ ...base("rh"), name: "RH" }, { ...base("fin"), name: "Financeiro" });
  db.tools.push({ ...base("t1"), name: "Assistente", usageData: "aggregate" }, { ...base("t2"), name: "Copiloto", usageData: "none" });
  db.subscriptions.push({ ...base("s1"), toolId: "t1", billing: "per_seat", seats: 10, unitPrice: 100, monthlyCost: 1000, contractedOn: "2026-01-10", status: "active" });
  db.allocations.push(
    { ...base("a1"), subscriptionId: "s1", departmentId: "rh", percent: 60, rationale: "6 de 10 licenças" },
    { ...base("a2"), subscriptionId: "s1", departmentId: "fin", percent: 40, rationale: "4 de 10 licenças" },
  );
  db.processes.push({ ...base("p1"), name: "Descrições de cargos", departmentId: "rh", toolId: "t1", baselineMinutes: 60, baselineReworkPct: 20, hourlyCost: 50, startedOn: "2026-01-01", costSharePct: 50 });
  db.measurements.push(
    { ...base("m1"), processId: "p1", period: "2026-01", activities: 40, minutesBefore: 60, minutesAfter: 30, hourlyCost: 50, deliveriesTotal: 40, deliveriesUsed: 36, deliveriesApproved: 30, reworkCount: 4 },
    { ...base("m2"), processId: "p1", period: "2026-02", activities: 60, minutesBefore: 60, minutesAfter: 20, hourlyCost: 50, deliveriesTotal: 60, deliveriesUsed: 57, deliveriesApproved: 54, reworkCount: 3 },
  );
  db.costs.push({ ...base("c1"), period: "2026-01", category: "training", amount: 500, departmentId: "rh", toolId: "t1" });
  db.benefits.push(
    { ...base("b1"), period: "2026-02", departmentId: "rh", processId: "p1", category: "overtime", amount: 4000, status: "validated" },
    { ...base("b2"), period: "2026-03", departmentId: "rh", processId: "p1", category: "outsourcing", amount: 9000, status: "submitted" },
    { ...base("b3"), period: "2026-03", departmentId: "rh", category: "rework", amount: 700, status: "draft" },
    { ...base("b4"), period: "2026-03", departmentId: "rh", category: "rework", amount: 800, status: "rejected" },
  );
  return db;
}

describe("períodos", () => {
  it("soma meses atravessando anos", () => {
    expect(addMonths("2025-11", 3)).toBe("2026-02");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(monthsBetween("2025-11", "2026-02")).toBe(4);
    expect(periodRange("2025-12", "2026-02")).toEqual(["2025-12", "2026-01", "2026-02"]);
  });
  it("período anterior tem o mesmo tamanho", () => {
    expect(previousScope(scope)).toMatchObject({ from: "2025-10", to: "2025-12" });
  });
});

describe("investimento", () => {
  it("soma licenças dos contratos e lançamentos por categoria", () => {
    const s = summarize(fixture(), scope);
    expect(s.investment).toBe(3500); // 3 × 1000 + 500
    expect(s.byCategory.license).toBe(3000);
    expect(s.byCategory.training).toBe(500);
  });
  it("rateia o contrato entre departamentos conforme o percentual", () => {
    const db = fixture();
    expect(summarize(db, { ...scope, departmentIds: ["rh"] }).investment).toBe(2300); // 60% de 3000 + 500
    expect(summarize(db, { ...scope, departmentIds: ["fin"] }).investment).toBe(1200);
  });
  it("a soma das partes rateadas é igual ao custo do contrato, mesmo com dízima", () => {
    const db = fixture();
    db.subscriptions[0].monthlyCost = 100;
    db.allocations = [
      { ...base("a1"), subscriptionId: "s1", departmentId: "rh", percent: 33.33, rationale: "x" },
      { ...base("a2"), subscriptionId: "s1", departmentId: "fin", percent: 33.33, rationale: "x" },
    ];
    const lines = expandCostLines(db, "2026-01", "2026-01").filter((l) => l.origin.kind === "subscription");
    expect(lines.reduce((a, l) => a + l.amount, 0)).toBeCloseTo(100, 2);
    expect(summarize(db, { from: "2026-01", to: "2026-01" }).unassigned).toBeCloseTo(33.34, 2);
  });
  it("saldo não rateado vai para o departamento responsável", () => {
    const db = fixture();
    db.allocations.pop();
    db.subscriptions[0].ownerDepartmentId = "fin";
    expect(summarize(db, { ...scope, departmentIds: ["fin"] }).investment).toBe(1200);
    expect(summarize(db, scope).unassigned).toBe(0);
  });
  it("rateio acima de 100% é reduzido proporcionalmente, nunca infla o custo", () => {
    const db = fixture();
    db.allocations[1].percent = 90; // 60 + 90
    expect(summarize(db, scope).byCategory.license).toBe(3000);
  });
  it("contrato não gera custo antes da contratação nem depois do encerramento", () => {
    const db = fixture();
    db.subscriptions[0].contractedOn = "2026-02-01";
    db.subscriptions[0].endedOn = "2026-02-28";
    expect(summarize(db, scope).byCategory.license).toBe(1000);
  });
});

describe("produtividade e qualidade", () => {
  const s = summarize(fixture(), scope);
  it("horas economizadas = (antes − depois) × atividades", () => {
    expect(s.hoursSaved).toBe(60); // 40×30min + 60×40min = 3600 min
  });
  it("capacidade liberada = horas × custo da hora", () => {
    expect(s.capacityValue).toBe(3000);
  });
  it("taxa de aprovação e de aproveitamento", () => {
    expect(valueOf(s.approvalRate)).toBeCloseTo(84 / 100);
    expect(valueOf(s.usageRate)).toBeCloseTo(93 / 100);
  });
  it("redução de retrabalho em pontos percentuais", () => {
    expect(valueOf(s.reworkReduction)).toBeCloseTo(0.2 - 7 / 100);
  });
  it("tempo depois maior que antes gera horas negativas, sem esconder", () => {
    const db = fixture();
    db.measurements = [{ ...db.measurements[0], minutesAfter: 90 }];
    expect(summarize(db, scope).hoursSaved).toBe(-20);
  });
  it("sem entregas informadas, taxa de aprovação é dado insuficiente", () => {
    const db = fixture();
    db.measurements.forEach((m) => { delete m.deliveriesTotal; delete m.deliveriesApproved; });
    const r = summarize(db, scope);
    expect(r.approvalRate.state).toBe("insufficient");
    expect(r.costPerApproved.state).toBe("insufficient");
  });
});

describe("ROI", () => {
  it("usa apenas benefício validado", () => {
    const s = summarize(fixture(), scope);
    expect(s.benefitValidated).toBe(4000);
    expect(s.benefitPending).toBe(9000);
    expect(s.benefitDraft).toBe(700);
    expect(valueOf(s.roi)).toBeCloseTo((4000 - 3500) / 3500);
    expect(valueOf(s.net)).toBe(500);
    expect(valueOf(s.benefitPerReal)).toBeCloseTo(4000 / 3500);
  });
  it("capacidade liberada não entra no ROI", () => {
    const db = fixture();
    db.benefits = [];
    const s = summarize(db, scope);
    expect(s.capacityValue).toBe(3000);
    expect(s.benefitValidated).toBe(0);
    expect(s.roi).toEqual({ state: "insufficient", missing: ["benefícios financeiros validados"] });
  });
  it("sem custos: dados insuficientes", () => {
    const db = fixture();
    db.subscriptions = []; db.costs = []; db.benefits = [];
    expect(summarize(db, scope).roi.state).toBe("insufficient");
    expect(summarize(db, scope).net.state).toBe("insufficient");
  });
  it("investimento zero com benefício: não divide por zero", () => {
    const db = fixture();
    db.subscriptions = []; db.costs = [];
    const s = summarize(db, scope);
    expect(s.roi).toEqual({ state: "no_investment" });
    expect(s.benefitPerReal).toEqual({ state: "no_investment" });
    expect(valueOf(s.net)).toBe(4000);
  });
  it("ROI negativo é exibido como é", () => {
    const db = fixture();
    db.benefits[0].amount = 700;
    expect(valueOf(summarize(db, scope).roi)).toBeCloseTo(-0.8);
  });
  it("taxa de realização = benefício validado ÷ capacidade liberada", () => {
    expect(valueOf(summarize(fixture(), scope).realizationRate)).toBeCloseTo(4000 / 3000);
  });
  it("payback em meses", () => {
    expect(valueOf(summarize(fixture(), scope).paybackMonths)).toBeCloseTo(3500 / (4000 / 3));
  });
});

describe("visão por processo", () => {
  it("atribui ao processo a parte informada do custo da ferramenta no departamento", () => {
    const s = summarize(fixture(), { ...scope, processIds: ["p1"] });
    // 50% de (60% de 3000 de licença + 500 de treinamento) = 1150
    expect(s.investment).toBe(1150);
    expect(valueOf(s.costPerApproved)).toBeCloseTo(1150 / 84);
  });
  it("custo lançado direto no processo entra integral", () => {
    const db = fixture();
    db.costs.push({ ...base("c2"), period: "2026-02", category: "consulting", amount: 300, processId: "p1" });
    expect(summarize(db, { ...scope, processIds: ["p1"] }).investment).toBe(1450);
    expect(summarize(db, { ...scope, departmentIds: ["rh"] }).investment).toBe(2600);
  });
  it("sem percentual informado, não estima: dado insuficiente", () => {
    const db = fixture();
    delete db.processes[0].costSharePct;
    const s = summarize(db, { ...scope, processIds: ["p1"] });
    expect(s.missingCostShare).toEqual(["p1"]);
    expect(s.costPerApproved.state).toBe("insufficient");
  });
});

describe("agregações", () => {
  it("departamentos somam o total da empresa", () => {
    const db = fixture();
    const total = summarize(db, scope);
    const parts = groupBy(db, scope, "department");
    expect(parts.reduce((a, g) => a + g.summary.investment, 0) + total.unassigned).toBeCloseTo(total.investment, 2);
    expect(parts.reduce((a, g) => a + g.summary.benefitValidated, 0)).toBe(total.benefitValidated);
  });
  it("meses somam o período", () => {
    const db = fixture();
    const m = monthly(db, scope);
    expect(m).toHaveLength(3);
    expect(m.reduce((a, x) => a + x.summary.investment, 0)).toBe(3500);
    expect(m[0].summary.roi.state).toBe("insufficient"); // jan: sem benefício validado
    expect(m[1].summary.roi.state).toBe("ok");
  });
  it("filtro por ferramenta inclui benefícios pelo processo", () => {
    const db = fixture();
    expect(summarize(db, { ...scope, toolIds: ["t1"] }).benefitValidated).toBe(4000);
    expect(summarize(db, { ...scope, toolIds: ["t2"] }).benefitValidated).toBe(0);
  });
});

describe("adoção", () => {
  it("só calcula com usuários ativos informados", () => {
    const db = fixture();
    expect(summarize(db, scope).adoptionRate.state).toBe("insufficient");
    db.usage.push({ ...base("u1"), period: "2026-02", toolId: "t1", departmentId: "rh", activeUsers: 7, reference: "Painel do fornecedor" });
    expect(valueOf(summarize(db, scope).adoptionRate)).toBeCloseTo(0.7);
    expect(summarize(db, { ...scope, departmentIds: ["rh"] }).adoptionRate.state).toBe("unavailable");
  });
});

describe("recomendações", () => {
  it("apontam benefícios pendentes e licenças ociosas com os números de origem", () => {
    const db = fixture();
    db.usage.push({ ...base("u1"), period: "2026-03", toolId: "t1", departmentId: "rh", activeUsers: 6, reference: "Painel do fornecedor" });
    const ids = buildInsights(db, scope, "2026-03-20").map((i) => i.id);
    expect(ids).toContain("pending");
    expect(ids).toContain("idle-t1");
  });
  it("não geram nada sem dados", () => {
    expect(buildInsights(emptyDb(), scope, "2026-03-20")).toEqual([]);
  });
});
