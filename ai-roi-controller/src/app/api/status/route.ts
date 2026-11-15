import { connection } from "next/server";
import { sheetsConfigFromEnv } from "@/server/sheets/client";
import { accessPassword } from "@/server/session";

/** Informa ao navegador onde os dados ficam. Nunca expõe credenciais. */
export async function GET() {
  await connection();
  const sheets = sheetsConfigFromEnv();
  return Response.json({
    mode: sheets ? "sheets" : "local",
    protected: !!accessPassword(),
    serviceAccount: sheets?.clientEmail ?? null,
  });
}
