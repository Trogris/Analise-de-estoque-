import type { Period } from "./types";

const pad = (n: number) => String(n).padStart(2, "0");
export const toPeriod = (d: Date): Period => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
export const isPeriod = (s: unknown): s is Period => typeof s === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(s);

export function addMonths(p: Period, n: number): Period {
  const [y, m] = p.split("-").map(Number);
  const t = y * 12 + (m - 1) + n;
  return `${Math.floor(t / 12)}-${pad((t % 12) + 1)}`;
}
export function monthsBetween(from: Period, to: Period): number {
  const [y1, m1] = from.split("-").map(Number);
  const [y2, m2] = to.split("-").map(Number);
  return (y2 - y1) * 12 + (m2 - m1) + 1;
}
export function periodRange(from: Period, to: Period): Period[] {
  const n = monthsBetween(from, to);
  return n <= 0 ? [] : Array.from({ length: n }, (_, i) => addMonths(from, i));
}
const NAMES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
export const periodLabel = (p: Period) => `${NAMES[Number(p.slice(5)) - 1]}/${p.slice(2, 4)}`;
/** Datas AAAA-MM-DD → mês de competência. */
export const periodOf = (date: string): Period => date.slice(0, 7);
