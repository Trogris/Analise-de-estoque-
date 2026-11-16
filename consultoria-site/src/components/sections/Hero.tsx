"use client";

import Image from "next/image";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { ArrowDown } from "lucide-react";
import { useRef } from "react";
import { hero, media } from "@/config/site";
import { FlowCanvas } from "../FlowCanvas";
import { Frame } from "../ui/Frame";
import { RevealLines } from "../ui/RevealLines";
import { EASE } from "../ui/motion";

const INTRO = 1.25; // espera a cortina de abertura sair

const serif = "t-serif italic text-accent [font-size:1.03em] [letter-spacing:-0.02em]";

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.86]);
  const opacity = useTransform(scrollYProgress, [0.25, 0.95], [1, 0]);
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "18%"]);
  const delay = reduce ? 0 : INTRO;

  const [a, b] = hero.headline;
  const split = (s: string) => {
    const i = s.indexOf(" ");
    return [s.slice(0, i), s.slice(i + 1)];
  };

  return (
    <section id="top" ref={ref} className="relative h-[165svh]" aria-label="Início">
      <motion.div
        style={reduce ? undefined : { scale, opacity }}
        className="grain sticky top-0 flex h-svh origin-top flex-col justify-end overflow-hidden bg-ink"
      >
        <motion.div style={reduce ? undefined : { y: bgY }} className="absolute inset-0">
          {media.hero ? (
            <Image src={media.hero.src} alt={media.hero.alt} fill priority sizes="100vw" className="object-cover opacity-60 grayscale" />
          ) : null}
          <FlowCanvas className={media.hero ? "absolute inset-0 opacity-70" : "absolute inset-0"} />
          <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_70%_40%,transparent_30%,var(--color-ink)_100%)]" />
          <div className="absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-ink via-ink/70 to-transparent" />
        </motion.div>

        {/* Legendas do diagrama: o que as linhas representam */}
        <motion.div
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2, delay: delay + 0.9 }}
          className="gutter t-eyebrow absolute inset-x-0 top-[19svh] flex justify-between gap-6 text-ash"
        >
          <span>{hero.labels.from}</span>
          <span className="text-right text-accent lg:pr-3">{hero.labels.to}</span>
        </motion.div>

        <div className="gutter relative flex flex-col gap-8 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] lg:gap-10 lg:pb-8">
          <h1 className="sr-only">{hero.headline.join(" ")}</h1>
          {/* Desktop: duas linhas. Celular: quatro, com a largura condensada da fonte. */}
          <RevealLines
            as="div"
            immediate
            delay={delay}
            className="t-impact hidden text-[7.25vw] lg:block"
            lines={[a, <span key="b" className={serif}>{b}</span>]}
          />
          <RevealLines
            as="div"
            immediate
            delay={delay}
            className="t-impact text-[12.2vw] lg:hidden"
            lines={[
              ...split(a),
              ...split(b).map((w, i) => (
                <span key={i} className={serif}>
                  {w}
                </span>
              )),
            ]}
          />

          <motion.div
            initial={reduce ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: EASE, delay: delay + 0.55 }}
            className="grid grid-cols-1 items-end gap-6 lg:grid-cols-12"
          >
            <div className="flex flex-col gap-6 lg:col-span-5">
              <p className="t-body max-w-md text-fog lg:text-[1.2rem]">{hero.sub}</p>
              <a href="#solucoes" className="btn self-start">
                <span className="roll">
                  <span>{hero.cta}</span>
                  <span aria-hidden>{hero.cta}</span>
                </span>
                <ArrowDown className="size-4" strokeWidth={2.5} aria-hidden />
              </a>
            </div>
            <Frame className="hidden text-fog lg:col-span-3 lg:col-start-10 lg:block" tab={<span className="text-accent">Como atuamos</span>}>
              <ol className="flex flex-col gap-2 p-4 pb-2">
                {hero.pillars.map((p, i) => (
                  <li key={p} className="flex items-baseline gap-3 text-[1.35rem] font-bold uppercase tracking-[-0.02em] [font-stretch:88%]">
                    <span className="t-eyebrow text-ash">{String(i + 1).padStart(2, "0")}</span>
                    {p}
                  </li>
                ))}
              </ol>
            </Frame>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
