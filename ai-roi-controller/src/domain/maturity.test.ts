import { describe, expect, it } from "vitest";
import { benchmark, companyIndex, levelOf, maturity, opportunities, scoreOf } from "./maturity";
import { emptyDb, type Base, type Database } from "./types";

const base = (id: string): Base => ({ id, createdAt: "", updatedAt: "", source: "manual" });
const scope = { from: "2026-01", to: "2026-02" };

function fixture(): Database {
  const db = emptyDb();
  db.departments.push({ ...base("a"), name: "Atendimento", headcount: 10 }, { ...base("b"), name: "Comercial", headcount: 10 }, { ...base("c"), name: "Jurídico" });
  db.tools.push({ ...base("t"), name: "Assistente", usageData: "aggregate" }, { ...base("t2"), name: "Copiloto", usageData: "aggregate" });
  for (const [d, cost] of [["a", 1000], ["b", 1000]] as const) {
    db.costs.push({ ...base(`c-${d}`), period: "2026-01", category: "license", amount: cost, departmentId: d, toolId: "t" });
  }
  db.processes.push(
    { ...base("pa"), name: "Chamados", departmentId: "a", toolId: "t", baselineMinutes: 30, hourlyCost: 40, startedOn: "2026-01-01" },
    { ...base("pb"), name: "Propostas", departmentId: "b", toolId: "t", baselineMinutes: 30, hourlyCost: 40, startedOn: "2026-01-01" },
  );
  // A: 320 h liberadas em 2 meses → 320 ÷ (10 × 160 × 2) = 10% da capacidade; 95% de aprovação
  db.measurements.push({ ...base("ma"), processId: "pa", period: "2026-01", activities: 960, minutesBefore: 30, minutesAfter: 10, hourlyCost: 40, deliveriesTotal: 100, deliveriesApproved: 95 });
  // B: 32 h → 1%; 50% de aprovação
  db.measurements.push({ ...base("mb"), processId: "pb", period: "2026-01", activities: 96, minutesBefore: 30, minutesAfter: 10, hourlyCost: 40, deliveriesTotal: 100, deliveriesApproved: 50 });
  db.benefits.push(
    { ...base("ba"), period: "2026-02", departmentId: "a", category: "overtime", amount: 2000, status: "validated" }, // ROI +100%
    { ...base("bb"), period: "2026-02", departmentId: "b", category: "overtime", amount: 500, status: "validated" }, // ROI −50%
  );
  db.usage.push(
    { ...base("ua"), period: "2026-02", toolId: "t", departmentId: "a", activeUsers: 8, reference: "painel" },
    { ...base("ua2"), period: "2026-02", toolId: "t2", departmentId: "a", activeUsers: 5, reference: "painel" },
    { ...base("ua0"), period: "2026-01", toolId: "t", departmentId: "a", activeUsers: 2, reference: "painel" },
    { ...base("ub"), period: "2026-02", toolId: "t", departmentId: "b", activeUsers: 2, reference: "painel" },
  );
  return db;
}

describe("pontuação", () => {
  it("converte cada medida para 0–100 dentro da faixa e limita os extremos", () => {
    expect(scoreOf("quality", 0.5)).toBe(0);
    expect(scoreOf("quality", 0.95)).toBe(100);
    expect(scoreOf("quality", 0.725)).toBe(50);
    expect(scoreOf("financial", -2)).toBe(0);
    expect(scoreOf("financial", 0.25)).toBe(50);
    expect(scoreOf("financial", 9)).toBe(100);
    expect(scoreOf("productivity", 0.05)).toBe(50);
  });
  it("classifica em níveis", () => {
    expect(levelOf(85).label).toBe("Referência");
    expect(levelOf(60).label).toBe("Consolidado");
    expect(levelOf(59).label).toBe("Em desenvolvimento");
    expect(levelOf(10).label).toBe("Inicial");
  });
});

describe("índice de maturidade", () => {
  const rows = maturity(fixture(), scope);
  const [a, b, c] = rows;
  it("calcula as quatro dimensões a partir dos dados registrados", () => {
    expect(a.dimensions.adoption.value).toBeCloseTo(0.8); // maior entre as ferramentas no mês mais recente, sem somar
    expect(a.dimensions.productivity.value).toBeCloseTo(0.1);
    expect(a.dimensions.quality.value).toBeCloseTo(0.95);
    expect(a.dimensions.financial.value).toBeCloseTo(1);
    expect(a.score).toBe(100);
    expect(b.dimensions).toMatchObject({ adoption: { score: 25 }, productivity: { score: 10 }, quality: { score: 0 }, financial: { score: 0 } });
    expect(b.score).toBe(9);
  });
  it("sem dados suficientes não inventa nota", () => {
    expect(c.score).toBeNull();
    expect(c.measured).toBe(0);
    expect(c.dimensions.adoption.missing).toMatch(/colaboradores/);
  });
  it("com três dimensões calcula a média só do que existe", () => {
    const db = fixture();
    db.usage = [];
    const [x] = maturity(db, scope);
    expect(x.dimensions.adoption.score).toBeNull();
    expect(x.measured).toBe(3);
    expect(x.score).toBe(100);
  });
  it("índice da empresa é a média dos departamentos avaliados", () => {
    expect(companyIndex(rows)).toBe(55); // (100 + 9) ÷ 2, arredondado
    expect(companyIndex([c])).toBeNull();
  });
});

describe("benchmark", () => {
  const db = fixture();
  const rows = maturity(db, scope);
  it("aponta referência, mediana e menor resultado por dimensão", () => {
    const q = benchmark(rows).find((x) => x.key === "quality")!;
    expect(q.leader?.name).toBe("Atendimento");
    expect(q.laggard?.name).toBe("Comercial");
    expect(q.median).toBeCloseTo(0.725);
    expect(q.count).toBe(2);
  });
  it("gera uma oportunidade por departamento, na maior distância, citando os números", () => {
    const ops = opportunities(db, scope, rows);
    expect(ops).toHaveLength(1);
    expect(ops[0]).toMatchObject({ department: "Comercial", reference: "Atendimento", gap: 100 });
    expect(ops[0].title).toMatch(/50%.*95%|−?-?50%.*100%/);
  });
  it("não compara quando só um departamento tem dados", () => {
    const one = maturity(db, scope).slice(0, 1);
    expect(opportunities(db, scope, one)).toEqual([]);
    expect(benchmark(one)[0].laggard).toBeNull();
  });
});
