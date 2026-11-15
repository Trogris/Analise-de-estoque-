/**
 * Proteção de acesso nesta fase: uma senha única da equipe (APP_PASSWORD).
 * Perfis por usuário e isolamento por empresa chegam com Supabase Auth + RLS.
 */
export const SESSION_COOKIE = "roi_session";

const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

export async function sessionToken(password: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(password), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", key, enc.encode("ai-roi-controller:session:v1")));
}

/** Comparação em tempo constante. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export const accessPassword = () => process.env.APP_PASSWORD || null;

export async function isAuthorized(cookie: string | undefined): Promise<boolean> {
  const password = accessPassword();
  if (!password) return true;
  return !!cookie && safeEqual(cookie, await sessionToken(password));
}
