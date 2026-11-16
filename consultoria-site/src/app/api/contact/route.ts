/**
 * Recebe o formulário de contato, valida e encaminha para CONTACT_WEBHOOK_URL.
 * Sem a variável configurada, responde 501 e o formulário oferece WhatsApp/e-mail.
 */
type Payload = { name?: unknown; email?: unknown; company?: unknown; message?: unknown; website?: unknown };

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function POST(request: Request) {
  let body: Payload;
  try {
    body = (await request.json()) as Payload;
  } catch {
    return Response.json({ ok: false, code: "invalid_json" }, { status: 400 });
  }

  // Campo-isca: pessoas não o veem; robôs o preenchem.
  if (str(body.website, 200)) return Response.json({ ok: true });

  const data = {
    name: str(body.name, 120),
    email: str(body.email, 200),
    company: str(body.company, 160),
    message: str(body.message, 4000),
  };

  const errors: Record<string, string> = {};
  if (data.name.length < 2) errors.name = "Informe seu nome.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email)) errors.email = "Informe um e-mail válido.";
  if (data.message.length < 10) errors.message = "Conte um pouco mais sobre o desafio (mínimo de 10 caracteres).";
  if (Object.keys(errors).length) {
    return Response.json({ ok: false, code: "validation", errors }, { status: 422 });
  }

  const webhook = process.env.CONTACT_WEBHOOK_URL;
  if (!webhook) return Response.json({ ok: false, code: "not_configured" }, { status: 501 });

  try {
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...data, source: "site", sentAt: new Date().toISOString() }),
    });
    if (!res.ok) throw new Error(`webhook ${res.status}`);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false, code: "delivery_failed" }, { status: 502 });
  }
}
