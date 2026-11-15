/**
 * Definição única das tabelas: dirige as colunas da planilha, a validação,
 * os formulários, as listas e a importação. Alterar aqui altera tudo junto.
 */
import { isPeriod } from "@/domain/period";
import type { Database, TableKey } from "@/domain/types";
import { parseNumber } from "@/lib/format";

export type FieldType = "text" | "longtext" | "number" | "int" | "money" | "percent" | "date" | "month" | "select" | "ref";
export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: [value: string, label: string][];
  ref?: TableKey;
  min?: number;
  max?: number;
  help?: string;
  placeholder?: string;
  /** Aparece na listagem. */
  list?: boolean;
  /** false = preenchido pelo sistema, fora do formulário e da importação. */
  form?: boolean;
  /** Largura no formulário: metade ou inteira. */
  wide?: boolean;
}
export type Row = Record<string, unknown> & { id: string };
export interface TableDef {
  key: TableKey;
  /** Nome da aba no Google Planilhas. */
  sheet: string;
  singular: string;
  plural: string;
  fem?: boolean;
  fields: FieldDef[];
  title: (row: Row, db: Database) => string;
  check?: (row: Row, db: Database) => Record<string, string>;
  importable?: boolean;
}

const f = (key: string, label: string, type: FieldType, extra: Partial<FieldDef> = {}): FieldDef => ({ key, label, type, ...extra });
const name = (db: Database, table: TableKey, id: unknown) =>
  ((db[table] as unknown as Row[]).find((r) => r.id === id)?.name as string | undefined) ?? "—";

export const COST_CATEGORIES: [string, string][] = [
  ["license", "Licenças"], ["api", "APIs e tokens"], ["implementation", "Implantação"],
  ["training", "Treinamento"], ["consulting", "Consultoria"], ["other", "Outros custos"],
];
export const BENEFIT_CATEGORIES: [string, string][] = [
  ["overtime", "Redução de horas extras"], ["avoided_hiring", "Contratações evitadas"],
  ["outsourcing", "Redução de serviços terceirizados"], ["operating_costs", "Redução de custos operacionais"],
  ["waste", "Redução de desperdícios"], ["rework", "Redução de retrabalho"],
  ["capacity", "Aumento de capacidade produtiva"], ["revenue", "Aumento de receita"],
  ["service_time", "Redução de tempo de atendimento"],
];
export const BENEFIT_STATUS: [string, string][] = [
  ["draft", "Rascunho"], ["submitted", "Aguardando validação"], ["validated", "Validado"], ["rejected", "Recusado"],
];

export const TABLES: Record<TableKey, TableDef> = {
  org: {
    key: "org", sheet: "empresa", singular: "empresa", plural: "empresa", fem: true,
    title: (r) => String(r.name),
    fields: [
      f("name", "Nome da empresa", "text", { required: true, wide: true }),
      f("currency", "Moeda", "select", { required: true, options: [["BRL", "Real (R$)"]] }),
      f("operator", "Seu nome", "text", { help: "Usado no registro de ações e na validação de benefícios." }),
    ],
  },
  units: {
    key: "units", sheet: "unidades", singular: "unidade", plural: "unidades", fem: true, importable: true,
    title: (r) => String(r.name),
    fields: [
      f("name", "Nome", "text", { required: true, list: true }),
      f("kind", "Tipo", "select", { required: true, list: true, options: [["matriz", "Matriz"], ["filial", "Filial"]] }),
      f("city", "Cidade", "text", { list: true }),
    ],
  },
  costCenters: {
    key: "costCenters", sheet: "centros_de_custo", singular: "centro de custo", plural: "centros de custo", importable: true,
    title: (r) => `${r.code} · ${r.name}`,
    fields: [f("code", "Código", "text", { required: true, list: true }), f("name", "Nome", "text", { required: true, list: true })],
  },
  departments: {
    key: "departments", sheet: "departamentos", singular: "departamento", plural: "departamentos", importable: true,
    title: (r) => String(r.name),
    fields: [
      f("name", "Nome", "text", { required: true, list: true, placeholder: "Ex.: Recursos Humanos" }),
      f("manager", "Responsável", "text", { list: true }),
      f("headcount", "Colaboradores", "int", { min: 0, list: true }),
      f("unitId", "Unidade", "ref", { ref: "units" }),
      f("costCenterId", "Centro de custo", "ref", { ref: "costCenters", list: true }),
      f("parentId", "Departamento superior", "ref", { ref: "departments" }),
    ],
    check: (r): Record<string, string> => (r.parentId && r.parentId === r.id ? { parentId: "Um departamento não pode ser superior a si mesmo." } : {}),
  },
  tools: {
    key: "tools", sheet: "ferramentas", singular: "ferramenta", plural: "ferramentas", fem: true, importable: true,
    title: (r) => String(r.name),
    fields: [
      f("name", "Nome", "text", { required: true, list: true, placeholder: "Ex.: ChatGPT, Claude, Microsoft Copilot, Gemini" }),
      f("vendor", "Fornecedor", "text", { list: true }),
      f("category", "Categoria", "text", { list: true, placeholder: "Ex.: Assistente geral, API, Plataforma especializada" }),
      f("usageData", "Dados de uso disponíveis", "select", {
        required: true, list: true,
        options: [["none", "Não fornece"], ["aggregate", "Agregados (usuários ativos)"], ["detailed", "Detalhados (tokens, créditos)"]],
        help: "Nem toda ferramenta fornece métricas de uso. Marque só o que o fornecedor realmente disponibiliza.",
      }),
      f("notes", "Observações", "longtext", { wide: true }),
    ],
  },
  subscriptions: {
    key: "subscriptions", sheet: "contratos", singular: "contrato", plural: "contratos", importable: true,
    title: (r, db) => `${name(db, "tools", r.toolId)}${r.plan ? ` · ${r.plan}` : ""}`,
    fields: [
      f("toolId", "Ferramenta", "ref", { ref: "tools", required: true, list: true }),
      f("plan", "Plano contratado", "text", { list: true }),
      f("billing", "Tipo de cobrança", "select", {
        required: true,
        options: [["per_seat", "Por licença"], ["flat", "Valor fixo"], ["usage", "Por consumo"], ["hybrid", "Fixo + consumo"]],
      }),
      f("status", "Situação", "select", {
        required: true, list: true,
        options: [["active", "Ativa"], ["trial", "Em teste"], ["cancelled", "Cancelada"], ["expired", "Expirada"]],
      }),
      f("seats", "Quantidade de licenças", "int", { min: 0, list: true }),
      f("unitPrice", "Valor unitário mensal", "money", { min: 0 }),
      f("monthlyCost", "Custo mensal", "money", {
        required: true, min: 0, list: true,
        help: "Parte fixa mensal do contrato. Consumo variável de API deve ser lançado em Custos, mês a mês.",
      }),
      f("contractedOn", "Data de contratação", "date", { required: true }),
      f("renewsOn", "Data de renovação", "date", { list: true }),
      f("endedOn", "Data de encerramento", "date", { help: "Depois dessa data o contrato deixa de gerar custo." }),
      f("ownerDepartmentId", "Departamento responsável", "ref", { ref: "departments", help: "Recebe o custo que não for rateado." }),
      f("costCenterId", "Centro de custo", "ref", { ref: "costCenters" }),
    ],
    check: (r) => {
      const e: Record<string, string> = {};
      if (r.endedOn && r.contractedOn && String(r.endedOn) < String(r.contractedOn)) e.endedOn = "O encerramento não pode ser anterior à contratação.";
      if ((r.status === "cancelled" || r.status === "expired") && !r.endedOn) e.endedOn = "Informe a data de encerramento para contratos cancelados ou expirados.";
      return e;
    },
  },
  allocations: {
    key: "allocations", sheet: "rateios", singular: "regra de rateio", plural: "regras de rateio", fem: true, importable: true,
    title: (r, db) => `${name(db, "departments", r.departmentId)} · ${r.percent}%`,
    fields: [
      f("subscriptionId", "Contrato", "ref", { ref: "subscriptions", required: true, list: true }),
      f("departmentId", "Departamento", "ref", { ref: "departments", required: true, list: true }),
      f("percent", "Percentual do custo", "percent", { required: true, min: 0.01, max: 100, list: true }),
      f("rationale", "Critério de rateio", "longtext", {
        required: true, list: true, wide: true, placeholder: "Ex.: 12 das 40 licenças são usadas pelo departamento",
      }),
    ],
    check: (r, db) => {
      const others = db.allocations.filter((a) => a.subscriptionId === r.subscriptionId && a.id !== r.id);
      const e: Record<string, string> = {};
      const used = others.reduce((a, x) => a + x.percent, 0);
      if (used + Number(r.percent) > 100.0001) e.percent = `Este contrato já tem ${used}% rateados; restam ${Math.max(0, 100 - used)}%.`;
      if (others.some((a) => a.departmentId === r.departmentId)) e.departmentId = "Este departamento já tem uma regra para o contrato.";
      return e;
    },
  },
  processes: {
    key: "processes", sheet: "processos", singular: "processo", plural: "processos", importable: true,
    title: (r) => String(r.name),
    fields: [
      f("name", "Nome do processo", "text", { required: true, list: true, wide: true, placeholder: "Ex.: Elaboração de descrições de cargos" }),
      f("departmentId", "Departamento", "ref", { ref: "departments", required: true, list: true }),
      f("toolId", "Ferramenta de IA", "ref", { ref: "tools", required: true, list: true }),
      f("owner", "Responsável", "text", { list: true }),
      f("startedOn", "Início do uso de IA", "date", { required: true }),
      f("baselineMinutes", "Tempo médio antes da IA (min)", "number", { required: true, min: 0, help: "Por atividade, antes de usar IA." }),
      f("hourlyCost", "Custo total da hora (R$)", "money", { required: true, min: 0, help: "Salário + encargos + benefícios, por hora." }),
      f("monthlyFrequency", "Atividades por mês (esperado)", "int", { min: 0 }),
      f("baselineReworkPct", "Retrabalho antes da IA (%)", "percent", { min: 0, max: 100 }),
      f("costSharePct", "% do custo da ferramenta neste processo", "percent", {
        min: 0, max: 100,
        help: "Quanto do custo da ferramenta no departamento cabe a este processo. Sem isso, o custo por entrega fica como dado insuficiente.",
      }),
      f("description", "Descrição da atividade", "longtext", { wide: true }),
      f("notes", "Evidências ou observações", "longtext", { wide: true }),
    ],
  },
  measurements: {
    key: "measurements", sheet: "medicoes", singular: "medição", plural: "medições", fem: true, importable: true,
    title: (r, db) => `${name(db, "processes", r.processId)} · ${r.period}`,
    fields: [
      f("processId", "Processo", "ref", { ref: "processes", required: true, list: true }),
      f("period", "Mês", "month", { required: true, list: true }),
      f("activities", "Atividades realizadas", "int", { required: true, min: 0, list: true }),
      f("minutesBefore", "Tempo médio antes (min)", "number", { required: true, min: 0, list: true }),
      f("minutesAfter", "Tempo médio com IA (min)", "number", { required: true, min: 0, list: true }),
      f("hourlyCost", "Custo total da hora (R$)", "money", { required: true, min: 0 }),
      f("deliveriesTotal", "Entregas totais", "int", { min: 0 }),
      f("deliveriesUsed", "Entregas aproveitadas", "int", { min: 0 }),
      f("deliveriesApproved", "Entregas aprovadas", "int", { min: 0, list: true }),
      f("reworkCount", "Entregas com retrabalho", "int", { min: 0 }),
      f("notes", "Observações", "longtext", { wide: true }),
    ],
    check: (r, db) => {
      const e: Record<string, string> = {};
      const total = r.deliveriesTotal as number | undefined;
      for (const k of ["deliveriesUsed", "deliveriesApproved", "reworkCount"]) {
        const v = r[k] as number | undefined;
        if (v === undefined) continue;
        if (total === undefined) e.deliveriesTotal = "Informe as entregas totais.";
        else if (v > total) e[k] = "Não pode ser maior que as entregas totais.";
      }
      if (db.measurements.some((m) => m.processId === r.processId && m.period === r.period && m.id !== r.id)) {
        e.period = "Já existe uma medição deste processo neste mês. Edite a existente.";
      }
      return e;
    },
  },
  costs: {
    key: "costs", sheet: "custos", singular: "custo", plural: "custos", importable: true,
    title: (r) => String(r.description || "Custo"),
    fields: [
      f("period", "Mês", "month", { required: true, list: true }),
      f("category", "Categoria", "select", { required: true, list: true, options: COST_CATEGORIES }),
      f("amount", "Valor", "money", { required: true, min: 0, list: true }),
      f("departmentId", "Departamento", "ref", { ref: "departments", list: true }),
      f("toolId", "Ferramenta", "ref", { ref: "tools", list: true }),
      f("processId", "Processo", "ref", { ref: "processes", help: "Preencha só se o custo for exclusivo de um processo." }),
      f("description", "Descrição", "text", { list: true, wide: true, placeholder: "Ex.: Fatura de API de março, NF 1234" }),
    ],
  },
  benefits: {
    key: "benefits", sheet: "beneficios", singular: "benefício", plural: "benefícios", importable: true,
    title: (r) => String(r.description || "Benefício"),
    fields: [
      f("period", "Mês", "month", { required: true, list: true }),
      f("departmentId", "Departamento", "ref", { ref: "departments", required: true, list: true }),
      f("category", "Categoria", "select", { required: true, list: true, options: BENEFIT_CATEGORIES }),
      f("amount", "Valor realizado", "money", { required: true, min: 0, list: true }),
      f("processId", "Processo", "ref", { ref: "processes" }),
      f("toolId", "Ferramenta", "ref", { ref: "tools" }),
      f("description", "Descrição", "text", { wide: true, placeholder: "Ex.: Horas extras do fechamento mensal eliminadas" }),
      f("evidence", "Evidência", "longtext", {
        wide: true, placeholder: "Link, número do documento ou onde a comprovação pode ser conferida",
        help: "Exigida para enviar à validação.",
      }),
      f("status", "Situação", "select", { options: BENEFIT_STATUS, list: true, form: false }),
      f("validatedBy", "Validado por", "text", { form: false }),
      f("validatedAt", "Validado em", "text", { form: false }),
      f("rejectionReason", "Motivo da recusa", "text", { form: false }),
    ],
  },
  usage: {
    key: "usage", sheet: "uso", singular: "registro de uso", plural: "registros de uso", importable: true,
    title: (r, db) => `${name(db, "tools", r.toolId)} · ${r.period}`,
    fields: [
      f("period", "Mês", "month", { required: true, list: true }),
      f("toolId", "Ferramenta", "ref", { ref: "tools", required: true, list: true }),
      f("departmentId", "Departamento", "ref", { ref: "departments", required: true, list: true }),
      f("activeUsers", "Usuários ativos", "int", { min: 0, list: true }),
      f("inputTokens", "Tokens de entrada", "int", { min: 0 }),
      f("outputTokens", "Tokens de saída", "int", { min: 0 }),
      f("reference", "Fonte do dado", "text", {
        required: true, list: true, wide: true, placeholder: "Ex.: Relatório do painel administrativo do fornecedor, 05/03",
        help: "Registre apenas números obtidos de fonte confiável. Não estime.",
      }),
    ],
    check: (r, db) => {
      const tool = db.tools.find((t) => t.id === r.toolId);
      const e: Record<string, string> = {};
      if (tool?.usageData === "none") e.toolId = "Esta ferramenta está cadastrada como “não fornece dados de uso”. Ajuste o cadastro se isso mudou.";
      if ((r.inputTokens !== undefined || r.outputTokens !== undefined) && tool && tool.usageData !== "detailed") {
        e.inputTokens = "Tokens só podem ser registrados para ferramentas com dados detalhados.";
      }
      if (r.activeUsers === undefined && r.inputTokens === undefined && r.outputTokens === undefined) e.activeUsers = "Informe ao menos um número.";
      return e;
    },
  },
  imports: {
    key: "imports", sheet: "importacoes", singular: "importação", plural: "importações", fem: true,
    title: (r) => String(r.fileName),
    fields: [
      f("table", "Tabela", "text", { form: false }), f("fileName", "Arquivo", "text", { form: false }),
      f("fileHash", "Hash", "text", { form: false }), f("rowsTotal", "Linhas", "int", { form: false }),
      f("rowsImported", "Importadas", "int", { form: false }), f("rowsDuplicated", "Duplicadas", "int", { form: false }),
      f("rowsFailed", "Com erro", "int", { form: false }), f("errors", "Erros", "longtext", { form: false }),
    ],
  },
  audit: {
    key: "audit", sheet: "auditoria", singular: "registro", plural: "registros",
    title: (r) => String(r.summary),
    fields: [
      f("actor", "Quem", "text", { form: false }), f("action", "Ação", "text", { form: false }),
      f("table", "Tabela", "text", { form: false }), f("recordId", "Registro", "text", { form: false }),
      f("summary", "Resumo", "text", { form: false }),
    ],
  },
};

export const SYSTEM_COLUMNS = ["source", "importId", "createdAt", "updatedAt"];
/** Ordem das colunas na planilha. */
export const columnsOf = (def: TableDef) => ["id", ...def.fields.map((x) => x.key), ...SYSTEM_COLUMNS];
const NUMERIC: FieldType[] = ["number", "int", "money", "percent"];
export const isNumeric = (fd: FieldDef) => NUMERIC.includes(fd.type);

/** Converte e valida um registro. Devolve o valor limpo ou os erros por campo. */
export function validate(
  def: TableDef, input: Record<string, unknown>, db: Database | null,
): { ok: true; value: Record<string, unknown> } | { ok: false; errors: Record<string, string> } {
  const value: Record<string, unknown> = {};
  const errors: Record<string, string> = {};
  for (const fd of def.fields) {
    let v = input[fd.key];
    if (typeof v === "string") v = v.trim();
    if (v === undefined || v === null || v === "") {
      if (fd.required && fd.form !== false) errors[fd.key] = "Campo obrigatório.";
      continue;
    }
    if (isNumeric(fd)) {
      const n = parseNumber(v);
      if (n === null) { errors[fd.key] = "Informe um número válido."; continue; }
      if (fd.type === "int" && !Number.isInteger(n)) { errors[fd.key] = "Informe um número inteiro."; continue; }
      if (fd.min !== undefined && n < fd.min) { errors[fd.key] = `O valor mínimo é ${fd.min}.`; continue; }
      if (fd.max !== undefined && n > fd.max) { errors[fd.key] = `O valor máximo é ${fd.max}.`; continue; }
      value[fd.key] = n;
    } else if (fd.type === "month") {
      const s = String(v).slice(0, 7);
      if (!isPeriod(s)) { errors[fd.key] = "Use o formato AAAA-MM."; continue; }
      value[fd.key] = s;
    } else if (fd.type === "date") {
      const s = String(v).slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || Number.isNaN(Date.parse(s))) { errors[fd.key] = "Data inválida. Use AAAA-MM-DD."; continue; }
      value[fd.key] = s;
    } else if (fd.type === "select") {
      if (!fd.options!.some(([o]) => o === v)) { errors[fd.key] = "Opção inválida."; continue; }
      value[fd.key] = v;
    } else if (fd.type === "ref") {
      if (db && !(db[fd.ref!] as unknown as Row[]).some((r) => r.id === v)) { errors[fd.key] = "Registro não encontrado."; continue; }
      value[fd.key] = v;
    } else {
      const s = String(v);
      if (s.length > 2000) { errors[fd.key] = "Texto muito longo (máximo de 2.000 caracteres)."; continue; }
      value[fd.key] = s;
    }
  }
  if (!Object.keys(errors).length && def.check && db) {
    Object.assign(errors, def.check({ id: String(input.id ?? ""), ...value }, db));
  }
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value };
}

/** Registros de outras tabelas que apontam para este — impede exclusão que deixaria dados órfãos. */
export function referencesTo(db: Database, table: TableKey, id: string): { def: TableDef; count: number }[] {
  const out: { def: TableDef; count: number }[] = [];
  for (const def of Object.values(TABLES)) {
    const keys = def.fields.filter((fd) => fd.type === "ref" && fd.ref === table).map((fd) => fd.key);
    if (!keys.length) continue;
    const count = (db[def.key] as unknown as Row[]).filter((r) => r.id !== id && keys.some((k) => r[k] === id)).length;
    if (count) out.push({ def, count });
  }
  return out;
}
