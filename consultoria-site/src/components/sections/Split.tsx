import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { media, split } from "@/config/site";
import { Motif } from "../ui/Motif";
import { ParallaxY } from "../ui/ParallaxY";
import { Reveal } from "../ui/Reveal";

/** Seção dividida: dois elementos grandes nas laterais e, ao centro, o "antes e agora" do fundador. */
export function Split() {
  return (
    <section aria-label="Da indústria à IA aplicada" className="relative overflow-hidden bg-bone text-ink">
      <div className="contours" aria-hidden />
      <div className="relative grid min-h-[92svh] grid-cols-1 items-center lg:grid-cols-12">
        {/* Esquerda: engrenagem da operação, cortada pela borda */}
        <ParallaxY from={90} to={-90} className="pointer-events-none absolute -left-[34vw] top-[6%] w-[78vw] text-ink/70 lg:-left-[15vw] lg:top-auto lg:w-[40vw]">
          <Motif kind="rings" live className="h-full w-full" />
        </ParallaxY>

        <div className="gutter relative z-10 flex flex-col gap-10 py-24 sm:flex-row sm:justify-center sm:gap-14 lg:col-span-6 lg:col-start-4 lg:gap-20">
          {split.map((s, i) => (
            <Reveal key={s.title} delay={i * 0.12} className={`flex max-w-[17rem] flex-col gap-4 ${i === 0 ? "sm:items-end sm:text-right" : ""}`}>
              <h2 className="flex flex-col leading-[0.82]">
                <span className="t-serif text-[4.2rem] uppercase lg:text-[5.4rem]">{s.over}</span>
                <span className="t-impact text-[3.1rem] lg:text-[4.1rem]">{s.title}</span>
              </h2>
              <p className="t-body text-ink/75">{s.text}</p>
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

        {/* Direita: recorte do fundador entrando pela borda */}
        {media.cutoutSide ? (
          <ParallaxY from={140} to={-40} className="pointer-events-none absolute -right-[18vw] bottom-0 hidden h-[86%] w-[46vw] sm:block lg:-right-[6vw] lg:w-[34vw]">
            <Image src={media.cutoutSide.src} alt={media.cutoutSide.alt} fill sizes="34vw" className="object-contain object-bottom" />
          </ParallaxY>
        ) : null}
      </div>
    </section>
  );
}
