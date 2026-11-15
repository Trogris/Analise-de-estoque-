import { connection } from "next/server";
import { createSheetsApi, sheetsConfigFromEnv, SheetsError } from "@/server/sheets/client";
import { applyToSheets, loadDatabase, validateMutations } from "@/server/sheets/repository";
import { accessPassword } from "@/server/session";

function api() {
  const cfg = sheetsConfigFromEnv();
  if (!cfg) throw new SheetsError("Google Planilhas não está configurado neste servidor.", 404);
  // Padrão seguro: dados financeiros nunca ficam abertos na internet sem senha.
  if (process.env.NODE_ENV === "production" && !accessPassword()) {
    throw new SheetsError("Defina a variável APP_PASSWORD para liberar o acesso aos dados em produção.", 503);
  }
  return createSheetsApi(cfg);
}
const fail = (e: unknown) => {
  const status = e instanceof SheetsError ? e.status : 500;
  const error = e instanceof Error ? e.message : "Erro inesperado ao acessar o Google Planilhas.";
  return Response.json({ error }, { status: status >= 400 && status < 600 ? status : 500 });
};

// Uma gravação por vez nesta instância: evita que duas alterações calculem a mesma linha.
let queue: Promise<unknown> = Promise.resolve();

export async function GET() {
  await connection();
  try {
    return Response.json(await loadDatabase(api()));
  } catch (e) {
    return fail(e);
  }
}

export async function POST(request: Request) {
  try {
    const sheets = api();
    const muts = validateMutations(await request.json());
    const run = queue.then(() => applyToSheets(sheets, muts));
    queue = run.catch(() => undefined);
    await run;
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
