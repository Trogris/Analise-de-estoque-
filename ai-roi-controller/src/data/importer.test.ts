import { describe, expect, it } from "vitest";
import { emptyDb, type Base } from "@/domain/types";
import { parseCsv, prepareImport, templateCsv } from "./importer";

const base = (id: string): Base => ({ id, createdAt: "", updatedAt: "", source: "manual" });
const db = () => {
  const d = emptyDb();
  d.departments.push({ ...base("rh"), name: "Recursos Humanos" });
  d.tools.push({ ...base("t1"), name: "ChatGPT", usageData: "aggregate" });
  return d;
};

describe("CSV", () => {
  it("lê ponto e vírgula, aspas, quebras de linha e BOM", () => {
    expect(parseCsv('﻿a;b\r\n"x;1";"dito ""assim"""\r\n\r\n"duas\nlinhas";2')).toEqual([["a", "b"], ["x;1", 'dito "assim"'], ["duas\nlinhas", "2"]]);
    expect(parseCsv("a,b\n1,2")).toEqual([["a", "b"], ["1", "2"]]);
  });
  it("o modelo gerado é aceito de volta como cabeçalho válido", () => {
    const [head] = parseCsv(templateCsv("costs"));
    expect(prepareImport("costs", [head], db(), "i1").missingRequired).toEqual([]);
  });
});

describe("importação", () => {
  const head = ["Mês", "Categoria", "Valor", "Departamento", "Ferramenta", "Descrição"];
  it("resolve nomes, formatos brasileiros e registra a origem", () => {
    const r = prepareImport("costs", [head, ["03/2026", "Treinamento", "1.250,50", "recursos humanos", "chatgpt", "Turma 1"]], db(), "i1");
    expect(r).toMatchObject({ imported: 1, failed: 0, duplicated: 0 });
    const m = r.mutations[0];
    expect(m.op === "upsert" && m.row).toMatchObject({ period: "2026-03", category: "training", amount: 1250.5, departmentId: "rh", toolId: "t1", source: "import", importId: "i1" });
  });
  it("relata erro por linha sem interromper as demais", () => {
    const r = prepareImport("costs", [head, ["2026-01", "Licenças", "abc", "", "", ""], ["2026-01", "Licenças", "10", "Marketing", "", ""], ["2026-02", "Outros custos", "99", "", "", "ok"]], db(), "i1");
    expect(r).toMatchObject({ imported: 1, failed: 2 });
    expect(r.rows[0]).toMatchObject({ line: 2, status: "error" });
    expect(r.rows[1].message).toMatch(/Marketing.*não está cadastrado/);
  });
  it("não soma duas vezes: duplicidade dentro do arquivo e contra o que já existe", () => {
    const d = db();
    d.costs.push({ ...base("c1"), period: "2026-01", category: "api", amount: 300, description: "Fatura" });
    const line = ["2026-01", "APIs e tokens", "300,00", "", "", "fatura"];
    const r = prepareImport("costs", [head, line, ["2026-02", "APIs e tokens", "300", "", "", "Fatura"], ["2026-02", "APIs e tokens", "300", "", "", "Fatura"]], d, "i1");
    expect(r).toMatchObject({ imported: 1, duplicated: 2 });
  });
  it("recusa arquivo sem coluna obrigatória", () => {
    const r = prepareImport("costs", [["Mês", "Valor"], ["2026-01", "10"]], db(), "i1");
    expect(r.missingRequired).toEqual(["Categoria"]);
    expect(r.mutations).toEqual([]);
  });
  it("benefício importado nunca entra validado", () => {
    const r = prepareImport("benefits", [["Mês", "Departamento", "Categoria", "Valor realizado", "Evidência", "Situação"], ["2026-01", "Recursos Humanos", "Redução de retrabalho", "500", "NF 12", "Validado"], ["2026-01", "Recursos Humanos", "Aumento de receita", "900", "", ""]], db(), "i1");
    expect(r.mutations.map((m) => m.op === "upsert" && m.row.status)).toEqual(["submitted", "draft"]);
  });
  it("aplica regras de consistência durante a importação", () => {
    const d = db();
    d.processes.push({ ...base("p1"), name: "Triagem", departmentId: "rh", toolId: "t1", baselineMinutes: 10, hourlyCost: 50, startedOn: "2026-01-01" });
    const h = ["Processo", "Mês", "Atividades realizadas", "Tempo médio antes (min)", "Tempo médio com IA (min)", "Custo total da hora (R$)", "Entregas totais", "Entregas aprovadas"];
    const r = prepareImport("measurements", [h, ["Triagem", "2026-01", 100, 10, 4, 50, 100, 120], ["Triagem", "2026-02", 100, 10, 4, 50, 100, 90], ["Triagem", "2026-02", 80, 10, 5, 50, 80, 70]], d, "i1");
    expect(r.rows.map((x) => x.status)).toEqual(["error", "ok", "error"]);
    expect(r.rows[2].message).toMatch(/Já existe uma medição/);
  });
});
