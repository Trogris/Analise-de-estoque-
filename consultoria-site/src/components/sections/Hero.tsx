"use client";

import Image from "next/image";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { ArrowDown } from "lucide-react";
import { useRef } from "react";
import { hero, media } from "@/config/site";
import { BlobReveal } from "../BlobReveal";
import { Frame } from "../ui/Frame";
import { Magnetic } from "../ui/Magnetic";
import { RevealLines } from "../ui/RevealLines";
import { EASE } from "../ui/motion";

const INTRO = 1.25; // espera a cortina de abertura sair
const serif = "t-serif italic text-accent [font-size:1.03em] [letter-spacing:-0.02em]";

/**
 * INÍCIO — coreografia em três atos, guiada pela rolagem:
 * 1. Retrato em tela cheia sobre fundo claro; a máscara orgânica revela a "visão de máquina".
 * 2. O fundo escurece e o retrato encolhe para uma moldura; dois letreiros passam por trás dele.
 * 3. O retrato perde a cor e recua, dando lugar ao manifesto.
 */
export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ["start start", "end end"] });

  const bg = useTransform(p, [0.06, 0.36], ["#0a0a0b", "#1c1d1e"]);
  const plate = useTransform(p, [0.05, 0.3], [0, 1]);
  const scale = useTransform(p, [0.05, 0.42], [1, 0.46]);
  const clip = useTransform(p, [0.05, 0.42], ["inset(0% 0% 0% 0%)", "inset(9% 3% 31% 3%)"]);
  const lift = useTransform(p, [0.05, 0.42], ["0%", "11%"]);
    const introOpacity = useTransform(p, [0, 0.14], [1, 0]);
  const introY = useTransform(p, [0, 0.14], [0, -60]);
  const revealOpacity = useTransform(p, [0.08, 0.26], [1, 0]);
  const bandOpacity = useTransform(p, [0.26, 0.38, 0.5, 0.6], [0, 1, 1, 0]);
  const boxOpacity = useTransform(p, [0.5, 0.62], [1, 0]);
  const bandA = useTransform(p, [0.2, 1], ["4%", "-38%"]);
  const bandB = useTransform(p, [0.2, 1], ["-40%", "0%"]);
  const gray = useTransform(p, [0.42, 0.52], ["grayscale(0) brightness(1)", "grayscale(1) brightness(0.6)"]);
    const delay = reduce ? 0 : INTRO;

  const [a, b] = hero.headline;
  const split = (s: string) => {
    const i = s.indexOf(" ");
    return [s.slice(0, i), s.slice(i + 1)];
  };
  const band = [...hero.marquees, ...hero.marquees, ...hero.marquees];

  if (reduce) return <HeroStatic />;

  return (
    <section id="top" ref={ref} className="relative h-[290svh]" aria-label="Início">
      <motion.div style={{ backgroundColor: bg }} className="sticky top-0 h-svh overflow-hidden">
        <div className="contours text-bone" aria-hidden />
        {/* Brilho atrás do retrato e malha técnica, visíveis enquanto ele ocupa a tela */}
        <motion.div style={{ opacity: introOpacity }} className="absolute inset-0" aria-hidden>
          <div className="absolute left-1/2 top-[8%] aspect-square w-[150vw] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--color-accent)_24%,transparent),transparent)] lg:top-[-6%] lg:w-[62vw]" />
          <div className="plate-grid" />
        </motion.div>

        {/* Letreiros por trás do retrato */}
        <motion.div style={{ opacity: bandOpacity }} className="absolute inset-x-0 top-1/2 -translate-y-1/2 select-none" aria-hidden>
          <motion.div style={{ x: bandA }} className="flex w-max bg-accent py-1 text-ink">
            {band.map((t, i) => (
              <span key={i} className="t-serif px-5 text-[clamp(3rem,7.4vw,7rem)] uppercase leading-[1]">
                {t}
              </span>
            ))}
          </motion.div>
          <motion.div style={{ x: bandB }} className="flex w-max py-1 text-bone">
            {band.map((t, i) => (
              <span key={i} className="t-impact t-outline px-5 text-[clamp(3rem,7.4vw,7rem)] leading-[1]">
                {t}
              </span>
            ))}
          </motion.div>
        </motion.div>

        {/* Retrato */}
        <motion.div
          style={{ scale, clipPath: clip, y: lift, opacity: boxOpacity }}
          className="absolute left-1/2 top-14 aspect-square w-[118vw] -translate-x-1/2 will-change-transform lg:bottom-0 lg:top-auto lg:h-full lg:w-auto"
        >
          {/* Fundo próprio da moldura: aparece quando o retrato encolhe */}
          <motion.div style={{ opacity: plate }} className="plate absolute inset-0" aria-hidden>
            <div className="plate-grid" />
            <div className="plate-glow" />
          </motion.div>
          <motion.div style={{ filter: gray }} className="absolute inset-0">
            {media.hero ? (
              <Image src={media.hero.src} alt={media.hero.alt} fill priority sizes="(min-width:1024px) 100vh, 118vw" className="object-cover" />
            ) : null}
            <motion.div style={{ opacity: revealOpacity }} className="absolute inset-0">
              <BlobReveal src={media.heroReveal} />
              <div className="plate-scan is-live" aria-hidden />
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Faixa escura inferior + título */}
        <motion.div style={{ opacity: introOpacity }} className="pointer-events-none absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-ink from-45% via-ink/80 to-transparent lg:h-[48%] lg:from-38%" aria-hidden />
        <motion.div
          style={{ opacity: introOpacity, y: introY }}
          className="gutter absolute inset-x-0 bottom-0 flex flex-col gap-5 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] text-bone lg:gap-8 lg:pb-8"
        >
          <h1 className="sr-only">{hero.headline.join(" ")}</h1>
          <RevealLines as="div" immediate delay={delay} className="t-impact hidden text-[5.7vw] lg:block" lines={[a, <span key="b" className={serif}>{b}</span>]} />
          <RevealLines
            as="div"
            immediate
            delay={delay}
            className="t-impact text-[10.6vw] lg:hidden"
            lines={[...split(a), ...split(b).map((w, i) => <span key={i} className={serif}>{w}</span>)]}
          />
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: EASE, delay: delay + 0.55 }}
            className="grid grid-cols-1 items-end gap-6 lg:grid-cols-12"
          >
            <div className="flex flex-col gap-4 lg:col-span-5 lg:gap-6">
              <p className="max-w-md text-[0.95rem] leading-[1.4] text-fog lg:text-[1.2rem]">{hero.sub}</p>
              <Magnetic className="self-start">
                <a href="#solucoes" className="btn">
                  <span className="roll">
                    <span>{hero.cta}</span>
                    <span aria-hidden>{hero.cta}</span>
                  </span>
                  <ArrowDown className="size-4" strokeWidth={2.5} aria-hidden />
                </a>
              </Magnetic>
            </div>
            <Pillars className="hidden lg:col-span-3 lg:col-start-10 lg:block" />
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  );
}

function Pillars({ className = "" }: { className?: string }) {
  return (
    <Frame className={`text-fog ${className}`} tab={<span className="text-accent">Como atuamos</span>}>
      <ol className="flex flex-col gap-2 p-4 pb-2">
        {hero.pillars.map((p, i) => (
          <li key={p} className="flex items-baseline gap-3 text-[1.35rem] font-bold uppercase tracking-[-0.02em] [font-stretch:88%]">
            <span className="t-eyebrow text-ash">{String(i + 1).padStart(2, "0")}</span>
            {p}
          </li>
        ))}
      </ol>
    </Frame>
  );
}

/** Versão sem animação de rolagem, para quem prefere movimento reduzido. */
function HeroStatic() {
  return (
    <section id="top" className="relative overflow-hidden bg-ink" aria-label="Início">
      <div className="relative mx-auto aspect-square w-[138vw] max-w-none -translate-x-[14%] lg:h-[80svh] lg:w-auto lg:translate-x-0">
        {media.hero ? <Image src={media.hero.src} alt={media.hero.alt} fill priority sizes="100vw" className="object-cover" /> : null}
      </div>
      <div className="gutter flex flex-col gap-7 bg-ink pb-10 pt-10 text-bone">
        <h1 className="t-impact text-[12.2vw] lg:text-[7.25vw]">
          {hero.headline[0]} <span className={serif}>{hero.headline[1]}</span>
        </h1>
        <p className="t-body max-w-md text-fog">{hero.sub}</p>
        <a href="#solucoes" className="btn self-start">
          {hero.cta} <ArrowDown className="size-4" strokeWidth={2.5} aria-hidden />
        </a>
      </div>
    </section>
  );
}
