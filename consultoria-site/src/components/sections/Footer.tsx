import Image from "next/image";
import { brand, contact, media, nav, whatsappHref } from "@/config/site";
import { FlowCanvas } from "../FlowCanvas";
import { ParallaxY } from "../ui/ParallaxY";

/** Rodapé: brilho verde-limão ao fundo e um painel escuro com aba, de onde o fundador emerge. */
export function Footer() {
  return (
    <footer className="relative bg-accent text-bone">
      <div className="arc bg-bone" aria-hidden />
      <div className="bg-gradient-to-b from-bone from-10% to-accent px-2 pb-2 pt-24 lg:px-3 lg:pb-3 lg:pt-32">
        <div className="relative">
          {/* Aba central do painel */}
          <div className="absolute -top-[2.4rem] left-1/2 h-[2.5rem] w-[46%] -translate-x-1/2 rounded-t-[2.2rem] bg-graphite lg:w-[30%]" aria-hidden />
          <div className="relative overflow-hidden rounded-[1.6rem] bg-graphite">
            <div className="absolute inset-0 opacity-50" aria-hidden>
              <FlowCanvas />
            </div>
            <div className="gutter relative grid grid-cols-2 gap-x-6 gap-y-10 pb-0 pt-14 lg:grid-cols-12 lg:pt-20">
              <p className="col-span-2 text-center text-[clamp(2.1rem,6vw,5rem)] font-bold uppercase leading-[0.9] tracking-[-0.035em] [font-stretch:80%] lg:col-span-12 lg:[font-stretch:100%]">
                Transformamos IA em <span className="t-serif font-normal text-accent">produtividade real.</span>
              </p>

              <nav aria-label="Rodapé" className="flex flex-col items-center gap-3 lg:col-span-3 lg:pt-10">
                <p className="t-eyebrow text-ash">Páginas</p>
                <ul className="flex flex-col items-center">
                  {nav.map((n) => (
                    <li key={n.id}>
                      <a href={`#${n.id}`} className="text-[1.25rem] font-extrabold uppercase leading-[1.15] tracking-[-0.01em] [font-stretch:88%] hover:text-accent">
                        {n.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>

              <div className="order-last col-span-2 mx-auto h-[19rem] w-full max-w-[26rem] lg:order-none lg:col-span-6 lg:h-[27rem] lg:max-w-none">
                <ParallaxY from={70} to={0} className="relative h-full">
                  {media.cutoutFront ? (
                    <Image src={media.cutoutFront.src} alt={media.cutoutFront.alt} fill sizes="(min-width:1024px) 40vw, 90vw" className="object-contain object-bottom" />
                  ) : null}
                  <a href="#contato" className="btn absolute bottom-6 left-1/2 -translate-x-1/2">
                    Falar com a consultoria
                  </a>
                </ParallaxY>
              </div>

              <div className="flex flex-col items-center gap-3 lg:col-span-3 lg:pt-10">
                <p className="t-eyebrow text-ash">Contato</p>
                <ul className="flex flex-col items-center text-[1.25rem] font-extrabold uppercase leading-[1.15] tracking-[-0.01em] [font-stretch:88%]">
                  <li>
                    <a href={whatsappHref()} target="_blank" rel="noopener noreferrer" className="hover:text-accent">
                      WhatsApp
                    </a>
                  </li>
                  <li>
                    <a href={`mailto:${contact.email}`} className="hover:text-accent">
                      E-mail
                    </a>
                  </li>
                  {contact.social.map((s) => (
                    <li key={s.href}>
                      <a href={s.href} target="_blank" rel="noopener noreferrer" className="hover:text-accent">
                        {s.label}
                      </a>
                    </li>
                  ))}
                  <li>
                    <a href="#top" className="hover:text-accent">
                      Topo
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        <div className="t-eyebrow flex flex-wrap justify-between gap-3 px-2 pb-[max(0.25rem,env(safe-area-inset-bottom,0px))] pt-4 text-ink">
          <span>
            © {new Date().getFullYear()} {brand.name} · {brand.descriptor}
          </span>
          <span className="select-all">{contact.email}</span>
        </div>
      </div>
    </footer>
  );
}
