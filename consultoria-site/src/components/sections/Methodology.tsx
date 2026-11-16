"use client";

import { motion, useReducedMotion, useScroll, useSpring } from "motion/react";
import { useRef } from "react";
import { methodology } from "@/config/site";
import { Reveal } from "../ui/Reveal";
import { RevealLines } from "../ui/RevealLines";

export function Methodology() {
  const ref = useRef<HTMLOListElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.8", "end 0.6"] });
  const progress = useSpring(scrollYProgress, { stiffness: 90, damping: 24 });

  return (
    <section id="metodologia" aria-labelledby="methodology-title" className="relative bg-ink">
      <div className="arc bg-bone" aria-hidden />
      <div className="bg-bone pb-28 text-ink lg:pb-44">
        <div className="gutter">
          <header className="grid grid-cols-1 gap-8 pb-16 pt-10 lg:grid-cols-12 lg:pb-28 lg:pt-16">
            <div className="lg:col-span-9">
              <p className="t-eyebrow mb-6">Metodologia</p>
              <RevealLines
                className="t-impact text-[15vw] lg:text-[8.2rem]"
                lines={[
                  "Quatro verbos.",
                  <span key="b" className="t-serif normal-case [letter-spacing:-0.02em]">
                    Um ciclo que <em className="text-accent">se repete.</em>
                  </span>,
                ]}
              />
              <h2 id="methodology-title" className="sr-only">
                Metodologia em quatro etapas
              </h2>
            </div>
          </header>

          <ol ref={ref} className="relative grid grid-cols-1 gap-y-14 lg:grid-cols-4 lg:gap-x-6">
            {/* Linha de progresso: horizontal no desktop, vertical no celular */}
            <div className="absolute left-0 top-0 hidden h-px w-full bg-ink/15 lg:block" aria-hidden>
              <motion.div style={reduce ? undefined : { scaleX: progress }} className="h-[3px] origin-left -translate-y-px bg-accent" />
            </div>
            <div className="absolute bottom-0 left-0 top-0 w-px bg-ink/15 lg:hidden" aria-hidden>
              <motion.div style={reduce ? undefined : { scaleY: progress }} className="h-full w-[3px] origin-top -translate-x-px bg-accent" />
            </div>

            {methodology.map((s, i) => (
              <li key={s.n} className="pl-6 lg:pl-0 lg:pt-8">
                <Reveal delay={i * 0.1} className="flex flex-col gap-5">
                  <span className="t-impact t-outline text-[6.5rem] leading-[0.8] text-ink lg:text-[10.5rem]" aria-hidden>
                    {s.n}
                  </span>
                  <h3 className="t-title text-[2.4rem] lg:text-[3rem]">
                    <span className="sr-only">Etapa {s.n}: </span>
                    {s.title}
                  </h3>
                  <p className="t-body max-w-xs text-ink/75">{s.text}</p>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
