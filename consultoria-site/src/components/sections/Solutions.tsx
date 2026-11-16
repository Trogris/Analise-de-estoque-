import { Check } from "lucide-react";
import { audience, solutions } from "@/config/site";
import { Frame } from "../ui/Frame";
import { Tilt } from "../ui/Tilt";
import { Motif } from "../ui/Motif";
import { Reveal } from "../ui/Reveal";
import { RevealLines } from "../ui/RevealLines";

export function Solutions() {
  return (
    <section id="solucoes" aria-labelledby="solucoes-title" className="relative bg-ink pb-28 pt-8 lg:pb-44">
      <div className="arc bg-ink" aria-hidden />
      <div className="gutter">
        <header className="grid grid-cols-1 gap-8 pb-14 pt-10 lg:grid-cols-12 lg:pb-24 lg:pt-16">
          <div className="lg:col-span-8">
            <p className="t-eyebrow mb-6 text-accent">Soluções</p>
            <RevealLines
              className="t-impact text-[15vw] lg:text-[8.2rem]"
              lines={[
                "Três serviços.",
                <span key="b" className="t-serif normal-case text-fog [letter-spacing:-0.02em]">
                  Do diagnóstico ao retorno.
                </span>,
              ]}
            />
            <h2 id="solucoes-title" className="sr-only">
              Soluções: três serviços de IA aplicada à produtividade
            </h2>
          </div>
          <Reveal className="flex flex-col gap-4 self-end lg:col-span-4" delay={0.15}>
            <p className="t-eyebrow text-ash">Para quem</p>
            <ul className="flex flex-wrap gap-2">
              {audience.map((a) => (
                <li key={a} className="t-eyebrow rounded-[0.2rem] border border-steel px-2.5 py-2 text-fog">
                  {a}
                </li>
              ))}
            </ul>
          </Reveal>
        </header>

        <ul className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-5">
          {solutions.map((s, i) => (
            <li key={s.title}>
              <Reveal delay={i * 0.1} className="h-full">
                <Tilt className="h-full">
                <Frame className="h-full text-fog" tab={<span className="text-bone">{s.tag}</span>} style={{ "--tab": "58%" } as React.CSSProperties}>
                  <article tabIndex={0} className="flex h-full flex-col gap-8 p-5 outline-none lg:p-8">
                    <div className="flex items-start justify-between">
                      <Motif kind={s.motif} className="size-40 transition-colors duration-700 group-hover:text-bone lg:size-56" />
                      <span className="t-eyebrow text-ash">{String(i + 1).padStart(2, "0")} / 03</span>
                    </div>
                    <div className="flex flex-1 flex-col gap-5 pb-6">
                      <h3 className="t-title text-[2.1rem] text-bone lg:text-[2.7rem]">{s.title}</h3>
                      <p className="t-body">{s.lead}</p>
                      <ul className="mt-auto flex flex-col border-t border-steel">
                        {s.items.map((item) => (
                          <li key={item} className="flex items-center gap-3 border-b border-steel py-3 text-[1rem] text-bone">
                            <Check className="size-4 shrink-0 text-accent" strokeWidth={2.5} aria-hidden />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </article>
                </Frame>
                </Tilt>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
