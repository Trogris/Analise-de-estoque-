import type { Indicator } from "@/domain/engine";

const nf = (o: Intl.NumberFormatOptions) => new Intl.NumberFormat("pt-BR", o);
const n0 = nf({ maximumFractionDigits: 0 });
const n1 = nf({ minimumFractionDigits: 1, maximumFractionDigits: 1 });
const n2 = nf({ minimumFractionDigits: 2, maximumFractionDigits: 2 });

function compact(v: number): string | null {
  const a = Math.abs(v);
  if (a >= 1e6) return `${n2.format(v / 1e6)} mi`;
  if (a >= 1e5) return `${n0.format(v / 1e3)} mil`;
  if (a >= 1e4) return `${n1.format(v / 1e3)} mil`;
  return null;
}
export const fmt = {
  int: (v: number) => n0.format(v),
  num: (v: number) => (Number.isInteger(v) ? n0.format(v) : n2.format(v)),
  money: (v: number) => `R$ ${n2.format(v)}`,
  moneyShort: (v: number) => `R$ ${compact(v) ?? n0.format(v)}`,
  hours: (v: number) => `${compact(v) ?? (Math.abs(v) < 100 ? n1.format(v) : n0.format(v))} h`,
  pct: (v: number) => `${(Math.abs(v) < 0.1 ? n1 : n0).format(v * 100)}%`,
  pp: (v: number) => `${n1.format(v * 100)} p.p.`,
  ratio: (v: number) => `R$ ${n2.format(v)}`,
  months: (v: number) => `${n1.format(v)} ${v >= 1.95 || v < 0.95 ? "meses" : "mês"}`,
  date: (iso?: string) => (iso ? iso.slice(0, 10).split("-").reverse().join("/") : "—"),
  dateTime: (iso?: string) => (iso ? new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—"),
};
export type Fmt = (v: number) => string;

/** Texto exibido quando o indicador não pode ser calculado. */
export function indicatorText(i: Indicator, f: Fmt): { text: string; hint?: string; ok: boolean } {
  switch (i.state) {
    case "ok": return { text: f(i.value), ok: true };
    case "insufficient": return { text: "Dados insuficientes", hint: `Falta registrar: ${i.missing.join("; ")}.`, ok: false };
    case "no_investment": return { text: "Sem investimento", hint: "Há benefício validado, mas nenhum investimento registrado. O ROI não se aplica.", ok: false };
    case "unavailable": return { text: "Não disponível", hint: i.reason, ok: false };
  }
}

/** Aceita "1.234,56", "1234.56", "R$ 1.234,56", "12%". */
export function parseNumber(input: unknown): number | null {
  if (typeof input === "number") return Number.isFinite(input) ? input : null;
  if (typeof input !== "string") return null;
  let s = input.trim().replace(/[R$\s%]/g, "");
  if (!s) return null;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID().slice(0, 13).replace("-", "") : Math.random().toString(36).slice(2, 14);
