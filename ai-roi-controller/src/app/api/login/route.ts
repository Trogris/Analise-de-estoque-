import { accessPassword, safeEqual, SESSION_COOKIE, sessionToken } from "@/server/session";

const attempts = new Map<string, { count: number; until: number }>();

export async function POST(request: Request) {
  const password = accessPassword();
  if (!password) return Response.json({ ok: true });
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  const now = Date.now();
  const a = attempts.get(ip);
  if (a && a.count >= 8 && a.until > now) {
    return Response.json({ error: "Muitas tentativas. Aguarde alguns minutos e tente de novo." }, { status: 429 });
  }
  const body = (await request.json().catch(() => ({}))) as { password?: unknown };
  if (typeof body.password !== "string" || !safeEqual(await sessionToken(body.password), await sessionToken(password))) {
    attempts.set(ip, { count: (a && a.until > now ? a.count : 0) + 1, until: now + 10 * 60_000 });
    return Response.json({ error: "Senha incorreta." }, { status: 401 });
  }
  attempts.delete(ip);
  const res = Response.json({ ok: true });
  const secure = process.env.NODE_ENV === "production" ? " Secure;" : "";
  res.headers.append("set-cookie", `${SESSION_COOKIE}=${await sessionToken(password)}; Path=/; HttpOnly;${secure} SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`);
  return res;
}
