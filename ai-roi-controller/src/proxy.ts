import { NextResponse, type NextRequest } from "next/server";
import { isAuthorized, SESSION_COOKIE } from "@/server/session";

/** Com APP_PASSWORD definida, nada além da tela de entrada é servido sem sessão. */
export async function proxy(request: NextRequest) {
  if (await isAuthorized(request.cookies.get(SESSION_COOKIE)?.value)) return NextResponse.next();
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Sessão expirada. Entre novamente." }, { status: 401 });
  }
  const url = request.nextUrl.clone();
  url.pathname = "/entrar";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/|favicon.ico|entrar|api/login|api/status).*)"],
};
