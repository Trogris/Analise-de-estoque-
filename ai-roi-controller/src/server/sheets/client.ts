/**
 * Cliente mínimo da API do Google Planilhas (sem SDK): autenticação por conta de
 * serviço (JWT RS256) e as quatro chamadas de que o repositório precisa.
 * As credenciais ficam apenas em variáveis de ambiente do servidor.
 */
import { createSign } from "node:crypto";

export interface SheetsConfig { spreadsheetId: string; clientEmail: string; privateKey: string }

export function sheetsConfigFromEnv(env: NodeJS.ProcessEnv = process.env): SheetsConfig | null {
  const spreadsheetId = env.GOOGLE_SHEETS_ID, clientEmail = env.GOOGLE_SERVICE_ACCOUNT_EMAIL, key = env.GOOGLE_PRIVATE_KEY;
  if (!spreadsheetId || !clientEmail || !key) return null;
  return { spreadsheetId, clientEmail, privateKey: key.replace(/\\n/g, "\n") };
}

const b64url = (s: string | Buffer) => Buffer.from(s).toString("base64url");
let cached: { token: string; exp: number; email: string } | null = null;

export async function getAccessToken(cfg: SheetsConfig, fetchImpl: typeof fetch = fetch): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.email === cfg.clientEmail && cached.exp - 60 > now) return cached.token;
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(JSON.stringify({
    iss: cfg.clientEmail, scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600,
  }));
  const signature = createSign("RSA-SHA256").update(`${header}.${claims}`).sign(cfg.privateKey).toString("base64url");
  const res = await fetchImpl("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${header}.${claims}.${signature}` }),
  });
  if (!res.ok) throw new SheetsError(`Falha ao autenticar a conta de serviço no Google (${res.status}). Confira e-mail e chave privada.`, res.status);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cached = { token: json.access_token, exp: now + json.expires_in, email: cfg.clientEmail };
  return cached.token;
}

export class SheetsError extends Error {
  constructor(message: string, public status = 500) { super(message); }
}

export type Cell = string | number | boolean;
export interface SheetsApi {
  /** Abas existentes: título → sheetId. */
  meta(): Promise<Map<string, number>>;
  batchGet(ranges: string[]): Promise<Cell[][][]>;
  batchUpdateValues(data: { range: string; values: Cell[][] }[]): Promise<void>;
  append(range: string, values: Cell[][]): Promise<void>;
  batchUpdate(requests: unknown[]): Promise<void>;
}

export function createSheetsApi(cfg: SheetsConfig, fetchImpl: typeof fetch = fetch): SheetsApi {
  const root = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(cfg.spreadsheetId)}`;
  async function call<T>(path: string, init?: RequestInit): Promise<T> {
    const token = await getAccessToken(cfg, fetchImpl);
    const res = await fetchImpl(root + path, {
      ...init, cache: "no-store",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json", ...(init?.headers ?? {}) },
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      const hint = res.status === 403 ? " Compartilhe a planilha com o e-mail da conta de serviço como Editor."
        : res.status === 404 ? " Confira o ID da planilha em GOOGLE_SHEETS_ID." : "";
      throw new SheetsError(`Google Planilhas respondeu ${res.status}.${hint} ${detail.slice(0, 300)}`.trim(), res.status);
    }
    return (await res.json()) as T;
  }
  const q = (params: [string, string][]) => "?" + params.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
  return {
    async meta() {
      const r = await call<{ sheets: { properties: { title: string; sheetId: number } }[] }>("?fields=sheets.properties(title,sheetId)");
      return new Map(r.sheets.map((s) => [s.properties.title, s.properties.sheetId]));
    },
    async batchGet(ranges) {
      if (!ranges.length) return [];
      const r = await call<{ valueRanges: { values?: Cell[][] }[] }>(
        "/values:batchGet" + q([...ranges.map((x) => ["ranges", x] as [string, string]), ["valueRenderOption", "UNFORMATTED_VALUE"], ["majorDimension", "ROWS"]]),
      );
      return r.valueRanges.map((v) => v.values ?? []);
    },
    async batchUpdateValues(data) {
      if (!data.length) return;
      // RAW: nada é interpretado como fórmula — evita injeção via planilha.
      await call("/values:batchUpdate", { method: "POST", body: JSON.stringify({ valueInputOption: "RAW", data }) });
    },
    async append(range, values) {
      if (!values.length) return;
      await call(`/values/${encodeURIComponent(range)}:append` + q([["valueInputOption", "RAW"], ["insertDataOption", "INSERT_ROWS"]]), {
        method: "POST", body: JSON.stringify({ values }),
      });
    },
    async batchUpdate(requests) {
      if (!requests.length) return;
      await call(":batchUpdate", { method: "POST", body: JSON.stringify({ requests }) });
    },
  };
}
