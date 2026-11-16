"use client";

import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react";
import { useRef } from "react";
import { brand, manifesto } from "@/config/site";

/** Manifesto centralizado, revelado palavra a palavra; os trechos marcados alternam para serifa verde-limão. */
export function Statement() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.9", "end 0.6"] });

  // "*trecho*" -> palavras com destaque
  const words = manifesto.split("*").flatMap((chunk, i) =>
    chunk
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => ({ w, em: i % 2 === 1 })),
  );
  const plain = manifesto.replaceAll("*", "");

  return (
    <section className="relative z-10 -mt-[80svh] bg-graphite pb-28 pt-[14svh] text-bone lg:pb-44" aria-label="Manifesto">
      <div className="contours" aria-hidden />
      <div ref={ref} className="gutter relative mx-auto flex max-w-[86rem] flex-col items-center text-center">
        <p className="t-eyebrow mb-10 text-accent lg:mb-14">No que acreditamos</p>
        <p className="text-[clamp(2rem,6.2vw,5.6rem)] font-semibold uppercase leading-[0.94] tracking-[-0.035em] [font-stretch:76%] lg:[font-stretch:100%]">
          <span className="sr-only">{plain}</span>
          <span aria-hidden>
            {words.map((x, i) => (
              <Word key={i} em={x.em} progress={scrollYProgress} range={[i / words.length, (i + 1) / words.length]} still={!!reduce}>
                {x.w}
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
  em,
}: {
  children: string;
  progress: MotionValue<number>;
  range: [number, number];
  still: boolean;
  em: boolean;
}) {
  const opacity = useTransform(progress, range, [0.13, 1]);
  return (
    <motion.span
      style={still ? undefined : { opacity }}
      className={`mx-[0.12em] inline-block ${em ? "t-serif font-normal text-accent [font-size:1.06em] [letter-spacing:-0.02em]" : ""}`}
    >
      {children}
    </motion.span>
  );
}
