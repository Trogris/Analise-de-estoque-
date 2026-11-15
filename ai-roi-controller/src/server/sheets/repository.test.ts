import { describe, expect, it } from "vitest";
import { TABLES } from "@/data/schema";
import type { Cell, SheetsApi } from "./client";
import { applyToSheets, ensureSchema, loadDatabase, validateMutations } from "./repository";

/** Planilha em memória que imita as chamadas usadas pelo repositório. */
function fakeSheets(initial: Record<string, Cell[][]> = {}) {
  const tabs = new Map<string, Cell[][]>(Object.entries(initial));
  const ids = new Map<string, number>([...tabs.keys()].map((t, i) => [t, i + 1]));
  const parse = (range: string) => {
    const m = /^'(.+)'!(.+)$/.exec(range)!;
    return { title: m[1], a1: m[2] };
  };
  const api: SheetsApi = {
    async meta() { return new Map(ids); },
    async batchGet(ranges) {
      return ranges.map((r) => {
        const { title, a1 } = parse(r);
        const rows = tabs.get(title);
        if (!rows) throw new Error("Unable to parse range " + r);
        if (a1 === "1:1") return rows.slice(0, 1);
        if (a1 === "A:A") return rows.map((x) => [x[0] ?? ""]);
        return rows.map((x) => [...x]);
      });
    },
    async batchUpdateValues(data) {
      for (const d of data) {
        const { title, a1 } = parse(d.range);
        const rows = tabs.get(title)!;
        const at = a1 === "1:1" ? 0 : Number(/^A(\d+)$/.exec(a1)![1]) - 1;
        rows[at] = d.values[0];
      }
    },
    async append(range, values) { tabs.get(parse(range).title)!.push(...values); },
    async batchUpdate(requests) {
      for (const r of requests as { addSheet?: { properties: { title: string } }; deleteDimension?: { range: { sheetId: number; startIndex: number } } }[]) {
        if (r.addSheet) { const t = r.addSheet.properties.title; tabs.set(t, []); ids.set(t, ids.size + 1); }
        if (r.deleteDimension) {
          const { sheetId, startIndex } = r.deleteDimension.range;
          const title = [...ids].find(([, id]) => id === sheetId)![0];
          tabs.get(title)!.splice(startIndex, 1);
        }
      }
    },
  };
  return { api, tabs };
}
const dept = (id: string, name: string) => ({ id, name, source: "manual", createdAt: "t", updatedAt: "t" });

describe("repositório Google Planilhas", () => {
  it("prepara uma planilha vazia com todas as abas e cabeçalhos", async () => {
    const { api, tabs } = fakeSheets();
    const { created } = await ensureSchema(api);
    expect(created).toContain("departamentos");
    expect(tabs.get("beneficios")![0]).toContain("status");
    expect(tabs.get("departamentos")![0].slice(0, 2)).toEqual(["id", "name"]);
    expect((await ensureSchema(api)).created).toEqual([]); // idempotente
  });

  it("grava, lê, atualiza e exclui registros", async () => {
    const { api, tabs } = fakeSheets();
    await applyToSheets(api, [
      { op: "upsert", table: "departments", row: dept("d1", "RH") },
      { op: "upsert", table: "departments", row: { ...dept("d2", "Financeiro"), headcount: 12 } },
      { op: "upsert", table: "departments", row: dept("d3", "Compras") },
    ]);
    let db = await loadDatabase(api);
    expect(db.departments.map((d) => d.name)).toEqual(["RH", "Financeiro", "Compras"]);
    expect(db.departments[1].headcount).toBe(12);
    expect(db.departments[0].headcount).toBeUndefined();

    await applyToSheets(api, [
      { op: "upsert", table: "departments", row: dept("d2", "Controladoria") },
      { op: "delete", table: "departments", id: "d1" },
      { op: "delete", table: "departments", id: "d3" },
    ]);
    db = await loadDatabase(api);
    expect(db.departments.map((d) => d.name)).toEqual(["Controladoria"]);
    expect(tabs.get("departamentos")).toHaveLength(2);
  });

  it("localiza colunas pelo cabeçalho, mesmo reordenadas à mão, e preserva colunas extras", async () => {
    const { api } = fakeSheets({ departamentos: [["name", "anotacao", "id"], ["RH", "coluna do usuário", "d1"]] });
    const db = await loadDatabase(api);
    expect(db.departments[0]).toMatchObject({ id: "d1", name: "RH" });
    await applyToSheets(api, [{ op: "upsert", table: "departments", row: dept("d9", "TI") }]);
    expect((await loadDatabase(api)).departments.map((d) => d.id)).toEqual(["d1", "d9"]);
  });

  it("ignora linhas sem id e números inválidos digitados na planilha", async () => {
    const cols = ["id", "name", "headcount"];
    const { api } = fakeSheets({ departamentos: [cols, ["d1", "RH", "muitos"], ["", "linha solta", 3]] });
    const db = await loadDatabase(api);
    expect(db.departments).toHaveLength(1);
    expect(db.departments[0].headcount).toBeUndefined();
  });

  it("valida no servidor e recusa dados inválidos", () => {
    expect(() => validateMutations([{ op: "upsert", table: "costs", row: { id: "c1", period: "2026-13", category: "api", amount: 10 } }])).toThrow(/AAAA-MM/);
    expect(() => validateMutations([{ op: "upsert", table: "costs", row: { id: "c1", period: "2026-01", category: "api", amount: -5 } }])).toThrow(/mínimo/);
    expect(() => validateMutations([{ op: "upsert", table: "nada", row: { id: "x" } }])).toThrow(/desconhecida/);
    expect(() => validateMutations([{ op: "upsert", table: "costs", row: { id: "=cmd|x", period: "2026-01", category: "api", amount: 1 } }])).toThrow(/inválido/);
    const [m] = validateMutations([{ op: "upsert", table: "benefits", row: { id: "b1", period: "2026-01", departmentId: "d1", category: "rework", amount: "1.250,50", status: "validated", validatedBy: "Ana", hack: "x", source: "manual" } }]);
    expect(m.op === "upsert" && m.row).toMatchObject({ amount: 1250.5, status: "validated", validatedBy: "Ana", source: "manual" });
    expect(m.op === "upsert" && "hack" in m.row).toBe(false);
  });

  it("todas as tabelas têm aba com nome único", () => {
    const names = Object.values(TABLES).map((t) => t.sheet);
    expect(new Set(names).size).toBe(names.length);
  });
});
