"use client";

import { motion, useScroll, useTransform } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { founder, gallery, media } from "@/config/site";
import { CountUp } from "../ui/CountUp";
import { Frame } from "../ui/Frame";
import { Tilt } from "../ui/Tilt";
import { Portrait } from "../ui/Portrait";

const CALLOUTS = founder.callouts;

// Posição vertical de cada moldura na faixa: cria o ritmo irregular da galeria.
const OFFSETS = ["lg:self-start lg:mt-[4vh]", "lg:self-end lg:mb-[2vh]", "lg:self-center", "lg:self-start lg:mt-[10vh]", "lg:self-end lg:mb-[7vh]", "lg:self-start lg:mt-[6vh]"];
const SIZES = ["lg:w-[21rem]", "lg:w-[17rem]", "lg:w-[24rem]", "lg:w-[16rem]", "lg:w-[19rem]", "lg:w-[17rem]"];

/**
 * SOBRE — galeria horizontal.
 * Desktop: a seção fica presa na tela e a rolagem vertical move a faixa na horizontal.
 * Celular, toque ou movimento reduzido: a faixa vira um carrossel de arrastar.
 */
export function About() {
  const section = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [pinned, setPinned] = useState(false);
  const [dist, setDist] = useState(0);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px) and (hover: hover) and (prefers-reduced-motion: no-preference)");
    const measure = () => {
      setPinned(mq.matches);
      if (track.current) setDist(Math.max(0, track.current.scrollWidth - window.innerWidth));
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (track.current) ro.observe(track.current);
    window.addEventListener("resize", measure);
    mq.addEventListener("change", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
      mq.removeEventListener("change", measure);
    };
  }, []);

  const { scrollYProgress } = useScroll({ target: section, offset: ["start start", "end end"] });
  const x = useTransform(scrollYProgress, [0, 1], [0, -dist]);
  const bar = useTransform(scrollYProgress, [0, 1], [0.04, 1]);
  // Troca de tema guiada pela rolagem: grafite -> cinza -> osso.
  const bg = useTransform(scrollYProgress, [0.12, 0.45, 0.78], ["#1c1d1e", "#8b8a83", "#f1efe8"]);
  const fg = useTransform(scrollYProgress, [0.4, 0.5], ["#f1efe8", "#0a0a0b"]);
  const theme = pinned
    ? ({ backgroundColor: bg, color: fg, "--frame-fill": bg, "--frame-line": "color-mix(in srgb, currentColor 28%, transparent)" } as unknown as React.CSSProperties)
    : ({ "--frame-fill": "var(--color-graphite)" } as React.CSSProperties);

  return (
    <section
      id="sobre"
      ref={section}
      aria-labelledby="sobre-title"
      className="relative bg-graphite text-bone"
      style={pinned ? { height: `calc(100svh + ${dist}px)` } : undefined}
    >
      <motion.div style={theme} className={pinned ? "sticky top-0 flex h-svh flex-col justify-center overflow-hidden" : "py-10"}>
        <div className="contours" aria-hidden />
        <div className={pinned ? "" : "no-scrollbar snap-x snap-mandatory overflow-x-auto"}>
          <motion.div
            ref={track}
            style={pinned ? { x } : undefined}
            className="gutter flex w-max items-start gap-6 lg:h-[76svh] lg:items-center lg:gap-[5.5rem] lg:pr-[14vw]"
          >
            {/* Abertura */}
            <div className="flex w-[82vw] shrink-0 snap-start scroll-ml-5 flex-col gap-6 lg:w-[38rem] lg:self-end">
              <p className="t-eyebrow opacity-70">Sobre</p>
              <h2 id="sobre-title" className="t-impact text-[5.2rem] lg:text-[11rem]">
                <span className="flex items-start">
                  <CountUp to={founder.years} />
                  <span className="text-accent [text-shadow:0_0_1px_rgba(0,0,0,0.5)]">+</span>
                </span>
                <span className="t-serif block text-[0.34em] normal-case leading-[1] tracking-[-0.01em] opacity-75">
                  anos de indústria
                </span>
              </h2>
              <p className="t-body max-w-md opacity-75">{founder.bio}</p>
            </div>

            {gallery.map((g, i) => (
              <div key={g.label} className="contents">
                <figure className={`w-[70vw] shrink-0 snap-start scroll-ml-5 ${SIZES[i % SIZES.length]} ${OFFSETS[i % OFFSETS.length]}`}>
                  <Tilt max={7}>
                    <Frame
                      tab={
                        <figcaption className="flex gap-3">
                          <span className="opacity-55">{String(i + 1).padStart(2, "0")}</span>
                          <span>{g.label}</span>
                        </figcaption>
                      }
                    >
                      <Portrait photo={g.photo} motif={g.motif} className="grain m-[1px] aspect-[4/5]" />
                    </Frame>
                  </Tilt>
                </figure>
                {i % 2 === 0 && CALLOUTS[i / 2] ? (
                  <p className="t-serif w-[76vw] shrink-0 snap-start scroll-ml-5 self-center text-[2.1rem] lg:w-[30rem] lg:text-[3.6rem]">
                    {CALLOUTS[i / 2]}
                  </p>
                ) : null}
              </div>
            ))}

            {/* Fundador: painel escuro, com a figura iluminada pela lateral */}
            <article className="group relative flex w-[88vw] shrink-0 snap-start scroll-ml-5 flex-col overflow-hidden rounded-[0.5rem] bg-ink text-bone shadow-[0_2rem_5rem_-2rem_rgba(0,0,0,0.55)] lg:h-full lg:w-[70rem] lg:flex-row">
              <div className="relative z-10 flex flex-col justify-between gap-10 p-6 lg:w-[52%] lg:p-10">
                <p className="t-eyebrow flex flex-wrap justify-between gap-2 text-ash">
                  <span>{founder.role}</span>
                  <span className="text-accent">{founder.stage}</span>
                </p>
                <div className="flex flex-col gap-5">
                  <h3 className="t-title text-[2.6rem] lg:text-[4.2rem]">{founder.name}</h3>
                  <p className="t-serif text-[1.35rem] leading-[1.15] text-fog lg:text-[1.6rem]">{founder.story}</p>
                  <ul className="flex flex-wrap gap-2">
                    {founder.methods.map((d) => (
                      <li key={d} className="t-eyebrow rounded-[0.2rem] border border-steel px-2.5 py-2 text-fog">
                        {d}
                      </li>
                    ))}
                  </ul>
                  <a href="#contato" className="btn mt-2 self-start">
                    <span className="roll">
                      <span>Conversar com o fundador</span>
                      <span aria-hidden>Conversar com o fundador</span>
                    </span>
                    <ArrowUpRight className="size-4" strokeWidth={2.5} aria-hidden />
                  </a>
                </div>
              </div>
              <Portrait
                photo={media.cutFront}
                motif="rings"
                live
                sizes="(min-width:1024px) 36rem, 88vw"
                className="aspect-[12/11] !bg-transparent lg:aspect-auto lg:flex-1"
              />
            </article>
          </motion.div>
        </div>

        {pinned ? (
          <div className="gutter absolute inset-x-0 bottom-6 flex items-center gap-4" aria-hidden>
            <span className="t-eyebrow opacity-60">Role para avançar</span>
            <div className="h-px flex-1 bg-current/25">
              <motion.div style={{ scaleX: bar }} className="h-px origin-left bg-accent" />
            </div>
          </div>
        ) : (
          <p className="gutter t-eyebrow mt-6 opacity-60 lg:hidden" aria-hidden>
            Arraste para o lado →
          </p>
        )}
      </motion.div>
    </section>
  );
}
