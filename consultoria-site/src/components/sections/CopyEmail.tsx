"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { contact } from "@/config/site";

export function CopyEmail() {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <a
        href={`mailto:${contact.email}`}
        className="t-serif break-all text-[clamp(1.6rem,3.4vw,2.8rem)] underline decoration-1 underline-offset-[0.18em] hover:decoration-2"
      >
        {contact.email}
      </a>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(contact.email);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {
            /* sem acesso à área de transferência: o endereço segue visível e selecionável */
          }
        }}
        className="t-eyebrow inline-flex cursor-pointer items-center gap-2 rounded-[0.2rem] border border-ink/50 px-2.5 py-2 hover:bg-ink hover:text-bone"
      >
        {copied ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
        <span aria-live="polite">{copied ? "Copiado" : "Copiar"}</span>
      </button>
    </div>
  );
}
