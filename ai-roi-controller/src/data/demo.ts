/**
 * Dados FICTÍCIOS de demonstração. Todo registro sai com source = "demo",
 * a interface exibe um aviso permanente enquanto existirem e eles podem ser
 * removidos de uma vez. Nenhum número aqui representa uma empresa real.
 */
import { addMonths, toPeriod } from "@/domain/period";
import type { BenefitCategory, Database, TableKey } from "@/domain/types";
import type { Mutation } from "./mutations";
import type { Row } from "./schema";

function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildDemo(today = new Date()): Mutation[] {
  const rand = rng(42);
  const now = today.toISOString();
  const last = addMonths(toPeriod(today), -1);
  const first = addMonths(last, -11);
  const day = (p: string, d = "05") => `${p}-${d}`;
  const muts: Mutation[] = [];
  const add = (table: TableKey, id: string, row: Record<string, unknown>) => {
    muts.push({ op: "upsert", table, row: { ...row, id: `demo-${id}`, source: "demo", createdAt: now, updatedAt: now } as Row });
    return `demo-${id}`;
  };

  add("org", "org", { name: "Indústria Exemplo S.A. (fictícia)", currency: "BRL", operator: "Usuário de demonstração" });
  const matriz = add("units", "matriz", { name: "Matriz", kind: "matriz", city: "Joinville" });
  const cc = Object.fromEntries(
    [["100", "Administrativo"], ["200", "Industrial"], ["300", "Comercial"], ["400", "Tecnologia"]].map(([code, name]) => [code, add("costCenters", code, { code, name })]),
  );
  const D = (id: string, name: string, manager: string, headcount: number, c: string) =>
    add("departments", id, { name, manager, headcount, unitId: matriz, costCenterId: cc[c] });
  const rh = D("rh", "Recursos Humanos", "Patrícia Lemos", 9, "100");
  const fin = D("fin", "Financeiro", "Renato Aguiar", 14, "100");
  const eng = D("eng", "Engenharia", "Camila Furtado", 22, "200");
  const com = D("com", "Comercial", "Thiago Barros", 18, "300");
  const sac = D("sac", "Atendimento ao cliente", "Luana Prates", 26, "300");
  const ti = D("ti", "Tecnologia da Informação", "Edson Vidal", 11, "400");

  const T = (id: string, name: string, vendor: string, category: string, usageData: string) => add("tools", id, { name, vendor, category, usageData });
  const gpt = T("gpt", "ChatGPT", "OpenAI", "Assistente geral", "aggregate");
  const claude = T("claude", "Claude", "Anthropic", "Assistente e API", "detailed");
  const copilot = T("copilot", "Microsoft Copilot", "Microsoft", "Suíte de escritório", "aggregate");
  const gemini = T("gemini", "Google Gemini", "Google", "Assistente geral", "none");

  const S = (id: string, toolId: string, plan: string, seats: number, unitPrice: number, start: string, owner: string, extra = {}) =>
    add("subscriptions", id, {
      toolId, plan, billing: "per_seat", seats, unitPrice, monthlyCost: seats * unitPrice,
      contractedOn: day(start, "01"), renewsOn: day(addMonths(start, 12), "01"), ownerDepartmentId: owner, status: "active", ...extra,
    });
  const sGpt = S("s-gpt", gpt, "Plano corporativo", 40, 150, first, ti);
  const sClaude = S("s-claude", claude, "Plano de equipe", 20, 160, addMonths(first, 2), eng);
  const sCopilot = S("s-copilot", copilot, "Complemento por usuário", 30, 170, addMonths(first, 1), ti, { renewsOn: day(addMonths(last, 2), "10") });
  S("s-gemini", gemini, "Plano empresarial", 15, 120, addMonths(first, 5), com);

  const A = (id: string, subscriptionId: string, departmentId: string, percent: number, rationale: string) =>
    add("allocations", id, { subscriptionId, departmentId, percent, rationale });
  A("a1", sGpt, rh, 20, "8 das 40 licenças atribuídas ao departamento");
  A("a2", sGpt, fin, 25, "10 das 40 licenças atribuídas ao departamento");
  A("a3", sGpt, sac, 40, "16 das 40 licenças atribuídas ao departamento");
  A("a4", sClaude, eng, 75, "15 das 20 licenças atribuídas ao departamento");
  A("a5", sClaude, ti, 25, "5 das 20 licenças atribuídas ao departamento");
  A("a6", sCopilot, fin, 40, "12 das 30 licenças atribuídas ao departamento");
  A("a7", sCopilot, com, 60, "18 das 30 licenças atribuídas ao departamento");

  // id, nome, depto, ferramenta, responsável, início (meses após `first`), min antes, min depois (alvo), R$/h, atividades/mês, retrabalho antes %, % custo
  const procs: [string, string, string, string, string, number, number, number, number, number, number, number | undefined, number][] = [
    ["cargos", "Elaboração de descrições de cargos", rh, gpt, "Patrícia Lemos", 0, 90, 30, 58, 24, 18, 40, 0.93],
    ["triagem", "Triagem de currículos", rh, gpt, "Patrícia Lemos", 2, 12, 4, 58, 420, 10, 60, 0.9],
    ["concilia", "Conciliação de lançamentos contábeis", fin, copilot, "Renato Aguiar", 1, 25, 11, 74, 610, 12, 70, 0.95],
    ["relatorio", "Relatórios gerenciais mensais", fin, gpt, "Renato Aguiar", 3, 240, 95, 74, 14, 22, 100, 0.88],
    ["codigo", "Revisão e documentação de código", eng, claude, "Camila Furtado", 2, 55, 24, 96, 380, 15, 80, 0.94],
    ["proposta", "Elaboração de propostas comerciais", com, copilot, "Thiago Barros", 1, 150, 70, 66, 46, 20, 100, 0.86],
    ["prospec", "Pesquisa de contas para prospecção", com, gemini, "Thiago Barros", 5, 40, 38, 66, 120, 8, 100, 0.62],
    ["resposta", "Respostas a chamados de primeiro nível", sac, gpt, "Luana Prates", 0, 14, 6, 41, 2600, 16, 100, 0.91],
    ["chamadoti", "Diagnóstico de chamados internos", ti, claude, "Edson Vidal", 4, 35, 18, 82, 210, 14, undefined, 0.9],
  ];
  const procId: Record<string, string> = {};
  for (const [id, name, departmentId, toolId, owner, offset, before, after, hourlyCost, freq, rework, share, approval] of procs) {
    const start = addMonths(first, offset);
    procId[id] = add("processes", `p-${id}`, {
      name, departmentId, toolId, owner, startedOn: day(start, "01"), baselineMinutes: before, hourlyCost,
      monthlyFrequency: freq, baselineReworkPct: rework, costSharePct: share,
      description: "Registro fictício para demonstrar o fluxo de medição.",
    });
    for (let m = 0; m + offset < 12; m++) {
      const ramp = 1 - Math.exp(-(m + 1) / 3);
      const minutesAfter = Math.round((before - (before - after) * ramp) * (0.97 + rand() * 0.06));
      const activities = Math.round(freq * (0.85 + rand() * 0.3));
      const approved = Math.round(activities * Math.min(0.99, approval * (0.9 + 0.1 * ramp)));
      add("measurements", `m-${id}-${m}`, {
        processId: procId[id], period: addMonths(start, m), activities, minutesBefore: before, minutesAfter, hourlyCost,
        deliveriesTotal: activities, deliveriesUsed: Math.round(activities * Math.min(1, approval + 0.05)), deliveriesApproved: approved,
        reworkCount: Math.round(activities * (rework / 100) * (1 - 0.6 * ramp) * (approval < 0.7 ? 1.6 : 1)),
      });
    }
  }

  const C = (id: string, period: string, category: string, amount: number, departmentId: string, toolId: string, description: string, processId?: string) =>
    add("costs", id, { period, category, amount, departmentId, toolId, description, processId });
  C("c1", first, "implementation", 28000, ti, gpt, "Implantação e configuração de acesso corporativo");
  C("c2", addMonths(first, 1), "training", 12500, rh, gpt, "Treinamento de gestores em uso de IA (2 turmas)");
  C("c3", addMonths(first, 2), "consulting", 18000, eng, claude, "Consultoria para fluxo de revisão de código");
  C("c4", addMonths(first, 5), "training", 6400, com, gemini, "Treinamento da equipe comercial");
  for (let m = 2; m < 12; m++) C(`api-${m}`, addMonths(first, m), "api", Math.round(900 + m * 140 + rand() * 300), eng, claude, "Consumo de API conforme fatura do fornecedor", procId.codigo);

  const B = (id: string, period: string, departmentId: string, proc: string, category: BenefitCategory, amount: number, description: string, status: string, evidence: string) =>
    add("benefits", id, {
      period, departmentId, processId: procId[proc], category, amount, description, evidence, status,
      ...(status === "validated" ? { validatedBy: "Diretoria financeira (demonstração)", validatedAt: now } : {}),
    });
  for (let m = 3; m < 12; m++) {
    const p = addMonths(first, m);
    const st = m >= 11 ? "submitted" : "validated";
    B(`b-sac-${m}`, p, sac, "resposta", "overtime", Math.round(9800 + m * 520), "Horas extras do atendimento eliminadas", st, "Folha de pagamento: rubrica de horas extras");
    B(`b-fin-${m}`, p, fin, "concilia", "outsourcing", 7200, "Redução do contrato de BPO contábil", st, "Aditivo contratual nº 3 do BPO");
    if (m >= 5) B(`b-eng-${m}`, p, eng, "codigo", "outsourcing", Math.round(11500 + m * 380), "Menos horas de fábrica de software contratadas", st, "Faturas do fornecedor de desenvolvimento");
    if (m >= 6 && m % 2 === 0) B(`b-com-${m}`, p, com, "proposta", "revenue", 14000, "Margem de propostas adicionais fechadas", st, "CRM: oportunidades ganhas no período");
  }
  B("b-rh-1", addMonths(first, 8), rh, "triagem", "avoided_hiring", 21000, "Contratação temporária de recrutador evitada", "validated", "Requisição de vaga cancelada RV-118");
  B("b-rh-2", last, rh, "cargos", "capacity", 3600, "Mais descrições revisadas sem aumento de equipe", "draft", "");

  const U = (id: string, period: string, toolId: string, departmentId: string, activeUsers: number, extra = {}) =>
    add("usage", id, { period, toolId, departmentId, activeUsers, reference: "Painel administrativo do fornecedor (exemplo fictício)", ...extra });
  for (let m = 9; m < 12; m++) {
    const p = addMonths(first, m);
    U(`u-gpt-rh-${m}`, p, gpt, rh, 7); U(`u-gpt-fin-${m}`, p, gpt, fin, 8); U(`u-gpt-sac-${m}`, p, gpt, sac, 15);
    U(`u-cl-eng-${m}`, p, claude, eng, 14, { inputTokens: 41_000_000 + m * 1_000_000, outputTokens: 9_000_000 });
    U(`u-cl-ti-${m}`, p, claude, ti, 4);
    U(`u-co-fin-${m}`, p, copilot, fin, 9); U(`u-co-com-${m}`, p, copilot, com, 10);
  }
  add("audit", "seed", { actor: "Sistema", action: "demo", table: "org", recordId: "demo-org", summary: "Carregou os dados fictícios de demonstração" });
  return muts;
}

export function removeDemo(db: Database): Mutation[] {
  const muts: Mutation[] = [];
  for (const [table, rows] of Object.entries(db) as unknown as [TableKey, Row[]][]) {
    for (const r of rows) if (r.source === "demo") muts.push({ op: "delete", table, id: r.id });
  }
  return muts;
}
