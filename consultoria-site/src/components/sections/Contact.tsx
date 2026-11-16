import { MessageCircle } from "lucide-react";
import { whatsappHref } from "@/config/site";
import { RevealLines } from "../ui/RevealLines";
import { Reveal } from "../ui/Reveal";
import { ContactForm } from "./ContactForm";
import { CopyEmail } from "./CopyEmail";

export function Contact() {
  return (
    <section id="contato" aria-labelledby="contact-title" className="relative bg-ink">
      <div className="arc bg-accent" aria-hidden />
      <div className="bg-accent pb-24 text-ink lg:pb-36">
        <div className="gutter">
          <p className="t-eyebrow pb-6 pt-10 lg:pt-16">Contato</p>
          <RevealLines
            className="t-impact text-[15.5vw] lg:text-[10.6vw]"
            lines={[
              "O próximo",
              "nível começa",
              <span key="c" className="t-serif italic [font-size:1.03em] [letter-spacing:-0.02em]">
                aqui.
              </span>,
            ]}
          />
          <h2 id="contact-title" className="sr-only">
            Contato: o próximo nível começa aqui
          </h2>

          <div className="mt-16 grid grid-cols-1 gap-16 lg:mt-24 lg:grid-cols-12 lg:gap-8">
            <Reveal className="flex flex-col gap-10 lg:col-span-5">
              <p className="t-body max-w-md text-[1.25rem] font-medium">
                Conte onde a sua empresa perde tempo hoje. A primeira conversa serve para entender o processo e dizer, com franqueza, se a
                IA resolve e por onde começar.
              </p>
              <div className="flex flex-col gap-3">
                <p className="t-eyebrow">E-mail</p>
                <CopyEmail />
              </div>
              <div className="flex flex-col gap-3">
                <p className="t-eyebrow">Conversa direta</p>
                <a href={whatsappHref()} target="_blank" rel="noopener noreferrer" className="btn btn-dark self-start">
                  <MessageCircle className="size-4" aria-hidden />
                  <span className="roll">
                    <span>Chamar no WhatsApp</span>
                    <span aria-hidden>Chamar no WhatsApp</span>
                  </span>
                </a>
              </div>
            </Reveal>
            <Reveal className="relative lg:col-span-6 lg:col-start-7" delay={0.12}>
              <ContactForm />
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
