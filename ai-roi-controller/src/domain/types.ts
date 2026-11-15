/**
 * Modelo de domínio do AI ROI Controller.
 * Estrutura de análise: Empresa → Departamento → Processo → Aplicação de IA → Resultado.
 */
export type ID = string;
/** Mês de competência no formato AAAA-MM. */
export type Period = string;
/** Origem do dado — todo registro informa de onde veio. */
export type Source = "manual" | "import" | "integration" | "demo";

export interface Base {
  id: ID;
  createdAt: string;
  updatedAt: string;
  source: Source;
  importId?: ID;
}

export interface Org extends Base {
  name: string;
  currency: string;
  /** Nome de quem opera o sistema nesta fase (sem autenticação por usuário). */
  operator?: string;
}
export interface Unit extends Base { name: string; kind: "matriz" | "filial"; city?: string }
export interface CostCenter extends Base { code: string; name: string }
export interface Department extends Base {
  name: string;
  unitId?: ID;
  parentId?: ID;
  costCenterId?: ID;
  manager?: string;
  headcount?: number;
}
export interface Tool extends Base {
  name: string;
  vendor?: string;
  category?: string;
  /** Nem toda ferramenta fornece dados de uso; nunca presumir. */
  usageData: "none" | "aggregate" | "detailed";
  notes?: string;
}
export interface Subscription extends Base {
  toolId: ID;
  plan?: string;
  billing: "per_seat" | "flat" | "usage" | "hybrid";
  seats?: number;
  unitPrice?: number;
  monthlyCost: number;
  ownerDepartmentId?: ID;
  costCenterId?: ID;
  contractedOn: string;
  renewsOn?: string;
  endedOn?: string;
  status: "trial" | "active" | "cancelled" | "expired";
}
export interface Allocation extends Base {
  subscriptionId: ID;
  departmentId: ID;
  percent: number;
  /** Critério de rateio por extenso (obrigatório). */
  rationale: string;
}
export interface Process extends Base {
  name: string;
  departmentId: ID;
  toolId: ID;
  owner?: string;
  description?: string;
  monthlyFrequency?: number;
  /** Tempo médio por atividade antes da IA, em minutos. */
  baselineMinutes: number;
  /** Retrabalho antes da IA, em % das entregas. */
  baselineReworkPct?: number;
  hourlyCost: number;
  startedOn: string;
  /** % do custo da ferramenta no departamento atribuído a este processo. */
  costSharePct?: number;
  notes?: string;
}
export interface Measurement extends Base {
  processId: ID;
  period: Period;
  activities: number;
  minutesBefore: number;
  minutesAfter: number;
  hourlyCost: number;
  deliveriesTotal?: number;
  deliveriesUsed?: number;
  deliveriesApproved?: number;
  reworkCount?: number;
  notes?: string;
}
export type CostCategory = "license" | "api" | "implementation" | "training" | "consulting" | "other";
export interface Cost extends Base {
  period: Period;
  category: CostCategory;
  amount: number;
  departmentId?: ID;
  toolId?: ID;
  processId?: ID;
  description?: string;
}
export type BenefitCategory =
  | "overtime" | "avoided_hiring" | "outsourcing" | "operating_costs" | "waste"
  | "rework" | "capacity" | "revenue" | "service_time";
export type BenefitStatus = "draft" | "submitted" | "validated" | "rejected";
export interface Benefit extends Base {
  period: Period;
  departmentId: ID;
  processId?: ID;
  toolId?: ID;
  category: BenefitCategory;
  amount: number;
  description?: string;
  /** Evidência: link, número de documento ou descrição da comprovação. */
  evidence?: string;
  status: BenefitStatus;
  validatedBy?: string;
  validatedAt?: string;
  rejectionReason?: string;
}
export interface Usage extends Base {
  period: Period;
  toolId: ID;
  departmentId: ID;
  activeUsers?: number;
  inputTokens?: number;
  outputTokens?: number;
  /** De onde veio o número (ex.: "Painel de administração do fornecedor"). */
  reference: string;
}
export interface ImportBatch extends Base {
  table: string;
  fileName: string;
  fileHash: string;
  rowsTotal: number;
  rowsImported: number;
  rowsDuplicated: number;
  rowsFailed: number;
  /** JSON: [{ row, message }] */
  errors?: string;
}
export interface AuditEntry extends Base {
  actor: string;
  action: "create" | "update" | "delete" | "validate" | "reject" | "import" | "demo";
  table: string;
  recordId: ID;
  summary: string;
}

export interface Database {
  org: Org[];
  units: Unit[];
  costCenters: CostCenter[];
  departments: Department[];
  tools: Tool[];
  subscriptions: Subscription[];
  allocations: Allocation[];
  processes: Process[];
  measurements: Measurement[];
  costs: Cost[];
  benefits: Benefit[];
  usage: Usage[];
  imports: ImportBatch[];
  audit: AuditEntry[];
}
export type TableKey = keyof Database;
export const TABLE_KEYS: TableKey[] = [
  "org", "units", "costCenters", "departments", "tools", "subscriptions", "allocations",
  "processes", "measurements", "costs", "benefits", "usage", "imports", "audit",
];
export const emptyDb = (): Database =>
  Object.fromEntries(TABLE_KEYS.map((k) => [k, []])) as unknown as Database;
