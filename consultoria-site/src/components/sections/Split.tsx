import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { media, split } from "@/config/site";
import { Motif } from "../ui/Motif";
import { ParallaxY } from "../ui/ParallaxY";
import { Reveal } from "../ui/Reveal";

/**
 * Seção dividida, em fundo escuro: à esquerda o fundador de blazer (a indústria, ontem),
 * à direita de camiseta (a IA aplicada, hoje). Cada figura tem um gráfico animado atrás.
 */
export function Split() {
  return (
    <section aria-label="Da indústria à IA aplicada" className="relative bg-bone text-bone">
      <div className="arc bg-ink" aria-hidden />
      <div className="relative overflow-hidden bg-ink">
        <div className="contours" aria-hidden />
        <div className="relative grid min-h-[96svh] grid-cols-2 items-end lg:grid-cols-12">
          {split.map((s, i) => {
            const photo = media[s.photo];
            const left = i === 0;
            return (
              <div
                key={s.title}
                className={`group relative h-[54svh] lg:absolute lg:bottom-0 lg:h-[88%] lg:w-[36vw] ${left ? "lg:left-[-3vw]" : "lg:right-[-3vw]"} ${left ? "order-3" : "order-4"}`}
              >
                <div className={`absolute inset-x-0 top-[4%] aspect-square ${left ? "-left-[20%]" : "-right-[20%] left-auto"} w-[120%] rounded-full bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--color-accent)_22%,transparent),transparent)]`} aria-hidden />
                <ParallaxY from={-40} to={60} className="absolute inset-x-[6%] top-[2%] text-fog/50">
                  <Motif kind={s.motif} live className="w-full" />
                </ParallaxY>
                <ParallaxY from={90} to={-20} className="absolute inset-0">
                  {photo ? (
                    <Image src={photo.src} alt={photo.alt} fill sizes="(min-width:1024px) 36vw, 50vw" className={`object-contain ${left ? "object-left-bottom" : "object-right-bottom"}`} />
                  ) : null}
                </ParallaxY>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[30%] bg-gradient-to-t from-ink to-transparent" aria-hidden />
              </div>
            );
          })}

          <div className="gutter relative z-10 order-1 col-span-2 flex flex-col gap-10 py-20 sm:flex-row sm:justify-center sm:gap-14 lg:col-span-6 lg:col-start-4 lg:self-center lg:gap-20 lg:py-24">
            {split.map((s, i) => (
              <Reveal key={s.title} delay={i * 0.12} className={`flex max-w-[17rem] flex-col gap-4 ${i === 0 ? "sm:items-end sm:text-right" : ""}`}>
                <h2 className="flex flex-col leading-[0.82]">
                  <span className="t-serif text-[4.2rem] uppercase text-accent lg:text-[5.4rem]">{s.over}</span>
                  <span className="t-impact text-[3.1rem] lg:text-[4.1rem]">{s.title}</span>
                </h2>
                <p className="t-body text-fog">{s.text}</p>
                <a
                  href={s.href}
                  aria-label={`${s.over}: ${s.title}`}
                  className="grid size-11 place-items-center rounded-[0.35rem] bg-accent text-ink transition-transform duration-500 ease-brand hover:rotate-45 hover:scale-110 focus-visible:rotate-45"
                >
                  <ArrowUpRight className="size-5" strokeWidth={2.5} aria-hidden />
                </a>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
