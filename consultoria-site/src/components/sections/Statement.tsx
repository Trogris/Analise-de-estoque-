"use client";

import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react";
import { useRef } from "react";
import { brand, frictions, manifesto } from "@/config/site";

/** Letreiro com a proposta de valor + manifesto revelado palavra a palavra conforme a rolagem. */
export function Statement() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.85", "end 0.55"] });
  const words = manifesto.split(" ");

  return (
    <section className="relative z-10 -mt-[20svh] rounded-t-[2rem] bg-graphite pb-28 pt-10 lg:rounded-t-[3.5rem] lg:pb-44" aria-label="Manifesto">
      <div className="overflow-hidden border-b border-steel pb-10" aria-hidden>
        <div className="marquee">
          {[0, 1].map((k) => (
            <div key={k} className="flex shrink-0 items-center">
              {frictions.map((p) => (
                <span key={p} className="flex items-center gap-8 pr-8 text-[1.6rem] font-bold uppercase tracking-[-0.02em] text-fog [font-stretch:85%] lg:text-[2.2rem]">
                  {p}
                  <span className="inline-block size-3 rotate-45 bg-accent" />
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div ref={ref} className="gutter mx-auto max-w-[92rem] pt-24 lg:pt-40">
        <p className="t-eyebrow mb-8 text-accent lg:mb-12">No que acreditamos</p>
        <p className="text-[clamp(2rem,6.6vw,5.6rem)] font-medium uppercase leading-[0.92] tracking-[-0.035em] [font-stretch:76%] lg:[font-stretch:100%]">
          <span className="sr-only">{manifesto}</span>
          <span aria-hidden>
            {words.map((w, i) => (
              <Word key={i} progress={scrollYProgress} range={[i / words.length, (i + 1) / words.length]} still={!!reduce}>
                {w}
              </Word>
            ))}
          </span>
        </p>
        <p className="t-serif mt-14 max-w-3xl text-[clamp(1.5rem,3.2vw,2.6rem)] text-fog lg:mt-20">{brand.tagline}</p>
      </div>
    </section>
  );
}

function Word({
  children,
  progress,
  range,
  still,
}: {
  children: string;
  progress: MotionValue<number>;
  range: [number, number];
  still: boolean;
}) {
  const opacity = useTransform(progress, range, [0.14, 1]);
  return (
    <motion.span style={still ? undefined : { opacity }} className="mr-[0.24em] inline-block">
      {children}
    </motion.span>
  );
}
