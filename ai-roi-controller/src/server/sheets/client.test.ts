import { createVerify, generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createSheetsApi, getAccessToken, sheetsConfigFromEnv } from "./client";

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();

describe("autenticação da conta de serviço", () => {
  it("lê as variáveis de ambiente e restaura as quebras de linha da chave", () => {
    expect(sheetsConfigFromEnv({ NODE_ENV: "test" } as NodeJS.ProcessEnv)).toBeNull();
    const cfg = sheetsConfigFromEnv({ NODE_ENV: "test", GOOGLE_SHEETS_ID: "abc", GOOGLE_SERVICE_ACCOUNT_EMAIL: "a@b.iam", GOOGLE_PRIVATE_KEY: pem.replace(/\n/g, "\\n") } as NodeJS.ProcessEnv);
    expect(cfg?.privateKey).toBe(pem);
  });

  it("envia um JWT RS256 válido e usa o token nas chamadas", async () => {
    const calls: { url: string; auth?: string }[] = [];
    const fake = (async (url: string | URL, init?: RequestInit) => {
      const u = String(url);
      if (u.includes("oauth2.googleapis.com")) {
        const assertion = (init!.body as URLSearchParams).get("assertion")!;
        const [h, c, sig] = assertion.split(".");
        expect(JSON.parse(Buffer.from(h, "base64url").toString())).toEqual({ alg: "RS256", typ: "JWT" });
        const claims = JSON.parse(Buffer.from(c, "base64url").toString());
        expect(claims).toMatchObject({ iss: "svc@x.iam", scope: "https://www.googleapis.com/auth/spreadsheets", aud: "https://oauth2.googleapis.com/token" });
        expect(claims.exp - claims.iat).toBe(3600);
        expect(createVerify("RSA-SHA256").update(`${h}.${c}`).verify(publicKey, Buffer.from(sig, "base64url"))).toBe(true);
        return Response.json({ access_token: "tok-1", expires_in: 3600 });
      }
      calls.push({ url: u, auth: new Headers(init?.headers).get("authorization") ?? undefined });
      return Response.json({ sheets: [{ properties: { title: "custos", sheetId: 7 } }] });
    }) as typeof fetch;
    const cfg = { spreadsheetId: "sheet/1", clientEmail: "svc@x.iam", privateKey: pem };
    expect(await getAccessToken(cfg, fake)).toBe("tok-1");
    const meta = await createSheetsApi(cfg, fake).meta();
    expect(meta.get("custos")).toBe(7);
    expect(calls[0].auth).toBe("Bearer tok-1");
    expect(calls[0].url).toContain("/spreadsheets/sheet%2F1?");
  });

  it("explica o que fazer quando a planilha não foi compartilhada", async () => {
    const fake = (async (url: string | URL) =>
      String(url).includes("oauth2") ? Response.json({ access_token: "t", expires_in: 3600 }) : new Response("denied", { status: 403 })) as typeof fetch;
    await expect(createSheetsApi({ spreadsheetId: "s", clientEmail: "svc@x.iam", privateKey: pem }, fake).meta()).rejects.toThrow(/Compartilhe a planilha/);
  });
});
