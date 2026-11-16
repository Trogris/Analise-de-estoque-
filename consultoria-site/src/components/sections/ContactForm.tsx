"use client";

import { ArrowUpRight, Check, Mail, MessageCircle } from "lucide-react";
import { useState } from "react";
import { contact, whatsappHref } from "@/config/site";

type Status = "idle" | "sending" | "sent" | "fallback" | "error";
type Errors = Partial<Record<"name" | "email" | "message", string>>;

const validate = (d: Record<string, string>): Errors => {
  const e: Errors = {};
  if (d.name.trim().length < 2) e.name = "Informe seu nome.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email.trim())) e.email = "Informe um e-mail válido, como nome@empresa.com.br.";
  if (d.message.trim().length < 10) e.message = "Conte um pouco mais sobre o desafio (mínimo de 10 caracteres).";
  return e;
};

export function ContactForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<Errors>({});
  const [draft, setDraft] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form)) as Record<string, string>;
    const found = validate(data);
    setErrors(found);
    if (Object.keys(found).length) {
      const first = Object.keys(found)[0];
      (form.elements.namedItem(first) as HTMLElement | null)?.focus();
      return;
    }

    // Texto pronto para WhatsApp ou e-mail, caso o envio direto não esteja disponível.
    setDraft(
      `Olá! Sou ${data.name.trim()}${data.company?.trim() ? `, da ${data.company.trim()}` : ""}.\n\n${data.message.trim()}\n\nContato: ${data.email.trim()}`,
    );
    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; code?: string; errors?: Errors };
      if (json.ok) {
        setStatus("sent");
        form.reset();
      } else if (json.code === "validation" && json.errors) {
        setErrors(json.errors);
        setStatus("idle");
      } else if (json.code === "not_configured") {
        setStatus("fallback");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div role="status" className="flex flex-col gap-5 border-t-[1.5px] border-ink pt-8">
        <Check className="size-10" strokeWidth={2} aria-hidden />
        <p className="t-title text-[2.6rem]">Mensagem enviada.</p>
        <p className="t-body max-w-md">Recebemos seu contato e responderemos pelo e-mail informado.</p>
        <button type="button" className="btn btn-dark self-start" onClick={() => setStatus("idle")}>
          Enviar outra mensagem
        </button>
      </div>
    );
  }

  const direct = status === "fallback" || status === "error";

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-8" aria-describedby="form-status">
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
        <Field id="name" label="Nome" error={errors.name}>
          <input id="name" name="name" type="text" autoComplete="name" placeholder="Seu nome" required aria-invalid={!!errors.name} aria-describedby={errors.name ? "name-error" : undefined} />
        </Field>
        <Field id="company" label="Empresa">
          <input id="company" name="company" type="text" autoComplete="organization" placeholder="Nome da empresa" />
        </Field>
      </div>
      <Field id="email" label="E-mail" error={errors.email}>
        <input id="email" name="email" type="email" autoComplete="email" inputMode="email" placeholder="nome@empresa.com.br" required aria-invalid={!!errors.email} aria-describedby={errors.email ? "email-error" : undefined} />
      </Field>
      <Field id="message" label="Onde a sua empresa perde mais tempo hoje?" error={errors.message}>
        <textarea id="message" name="message" rows={4} placeholder="Ex.: relatórios feitos à mão, lançamentos repetidos, documentos que demoram a ser analisados" required aria-invalid={!!errors.message} aria-describedby={errors.message ? "message-error" : undefined} />
      </Field>
      {/* Campo-isca contra robôs: invisível para pessoas */}
      <div className="absolute -left-[9999px]" aria-hidden>
        <label htmlFor="website">Não preencha este campo</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" className="btn btn-dark" disabled={status === "sending"}>
          <span className="roll">
            <span>{status === "sending" ? "Enviando" : "Enviar mensagem"}</span>
            <span aria-hidden>{status === "sending" ? "Enviando" : "Enviar mensagem"}</span>
          </span>
          <ArrowUpRight className="size-4" strokeWidth={2.5} aria-hidden />
        </button>
        <p className="t-eyebrow">Resposta pelo e-mail informado</p>
      </div>

      <div id="form-status" role="status" aria-live="polite">
        {direct ? (
          <div className="flex flex-col gap-4 border-t-[1.5px] border-ink pt-6">
            <p className="text-[1.15rem] font-bold leading-snug">
              {status === "fallback"
                ? "O envio direto por este formulário ainda não está ativo. Sua mensagem está pronta: escolha por onde enviar."
                : "Não foi possível enviar agora. Sua mensagem está pronta: envie por um dos canais abaixo ou tente de novo."}
            </p>
            <div className="flex flex-wrap gap-3">
              <a className="btn btn-dark" href={whatsappHref(draft)} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="size-4" aria-hidden /> Enviar por WhatsApp
              </a>
              <a
                className="btn btn-ghost !border-ink"
                href={`mailto:${contact.email}?subject=${encodeURIComponent("Contato pelo site")}&body=${encodeURIComponent(draft)}`}
              >
                <Mail className="size-4" aria-hidden /> Enviar por e-mail
              </a>
            </div>
          </div>
        ) : null}
      </div>
    </form>
  );
}

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="field">
      <label htmlFor={id} className="t-eyebrow">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-sm font-bold">
          {error}
        </p>
      ) : null}
    </div>
  );
}
