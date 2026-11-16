"use client";

import Image from "next/image";
import { motion, useScroll, useTransform } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { founder, media, type MotifKind } from "@/config/site";
import { CountUp } from "../ui/CountUp";
import { Frame } from "../ui/Frame";
import { Motif } from "../ui/Motif";

const CALLOUTS = founder.callouts;
// Arte gerada para as molduras sem foto.
const PLATES: MotifKind[] = ["rings", "takt", "grid", "steps", "untangle", "network"];

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

  return (
    <section
      id="sobre"
      ref={section}
      aria-labelledby="sobre-title"
      className="relative bg-graphite"
      style={pinned ? { height: `calc(100svh + ${dist}px)` } : undefined}
    >
      <div className={pinned ? "sticky top-0 flex h-svh flex-col justify-center overflow-hidden" : "py-10"}>
        <div className={pinned ? "" : "no-scrollbar snap-x snap-mandatory overflow-x-auto"}>
          <motion.div
            ref={track}
            style={pinned ? { x } : undefined}
            className="gutter flex w-max items-start gap-6 lg:h-[76svh] lg:items-center lg:gap-[5.5rem] lg:pr-[14vw]"
          >
            {/* Abertura */}
            <div className="flex w-[82vw] shrink-0 snap-start scroll-ml-5 flex-col gap-6 lg:w-[38rem] lg:self-end">
              <p className="t-eyebrow text-accent">Sobre</p>
              <h2 id="sobre-title" className="t-impact text-[5.2rem] lg:text-[11rem]">
                <span className="flex items-start">
                  <CountUp to={founder.years} />
                  <span className="text-accent">+</span>
                </span>
                <span className="t-serif block text-[0.34em] normal-case leading-[1] tracking-[-0.01em] text-fog">
                  anos de indústria
                </span>
              </h2>
              <p className="t-body max-w-md text-fog">{founder.bio}</p>
            </div>

            {founder.disciplines.map((label, i) => {
              const photo = media.gallery[i] ?? null;
              return (
                <div key={label} className="contents">
                  <figure className={`w-[70vw] shrink-0 snap-start scroll-ml-5 ${SIZES[i]} ${OFFSETS[i]}`}>
                    <Frame
                      className="text-fog"
                      fill="var(--color-graphite)"
                      tab={
                        <figcaption className="flex gap-3">
                          <span className="text-ash">{String(i + 1).padStart(2, "0")}</span>
                          <span className="text-bone">{label}</span>
                        </figcaption>
                      }
                    >
                      <div className="grain relative m-[1px] aspect-[4/5] overflow-hidden bg-coal">
                        {photo ? (
                          <Image src={photo.src} alt={photo.alt} fill sizes="(min-width:1024px) 24rem, 70vw" className="photo object-cover" />
                        ) : (
                          <div className="grid h-full place-items-center p-8">
                            <Motif kind={PLATES[i % PLATES.length]} className="h-full w-full" />
                          </div>
                        )}
                      </div>
                    </Frame>
                  </figure>
                  {i % 2 === 0 && CALLOUTS[i / 2] ? (
                    <p className="t-serif w-[76vw] shrink-0 snap-start scroll-ml-5 self-center text-[2.1rem] text-bone lg:w-[30rem] lg:text-[3.6rem]">
                      {CALLOUTS[i / 2]}
                    </p>
                  ) : null}
                </div>
              );
            })}

            {/* Fundador: painel claro, na cor do fundo da foto, para o retrato se fundir ao cartão */}
            <article
              className="relative flex w-[88vw] shrink-0 snap-start scroll-ml-5 flex-col overflow-hidden rounded-[0.5rem] text-ink lg:h-full lg:w-[70rem] lg:flex-row"
              style={{ background: media.founderBackdrop }}
            >
              <div className="flex flex-col justify-between gap-10 p-6 lg:w-[50%] lg:p-10">
                <p className="t-eyebrow flex flex-wrap justify-between gap-2">
                  <span>{founder.role}</span>
                  <span>{founder.stage}</span>
                </p>
                <div className="flex flex-col gap-5">
                  <h3 className="t-title text-[2.6rem] lg:text-[4.2rem]">{founder.name}</h3>
                  <p className="t-serif text-[1.35rem] leading-[1.15] lg:text-[1.6rem]">{founder.story}</p>
                  <ul className="flex flex-wrap gap-2">
                    {founder.methods.map((d) => (
                      <li key={d} className="t-eyebrow rounded-[0.2rem] border border-ink/40 px-2.5 py-2">
                        {d}
                      </li>
                    ))}
                  </ul>
                  <a href="#contato" className="btn btn-dark mt-2 self-start">
                    <span className="roll">
                      <span>Conversar com o fundador</span>
                      <span aria-hidden>Conversar com o fundador</span>
                    </span>
                    <ArrowUpRight className="size-4" strokeWidth={2.5} aria-hidden />
                  </a>
                </div>
              </div>
              <div className="relative aspect-[12/11] lg:aspect-auto lg:flex-1">
                {media.founder ? (
                  <Image
                    src={media.founder.src}
                    alt={media.founder.alt}
                    fill
                    sizes="(min-width:1024px) 36rem, 88vw"
                    className="object-cover object-bottom [mask-image:linear-gradient(to_right,transparent,black_18%,black_82%,transparent),linear-gradient(to_bottom,transparent,black_14%)] [mask-composite:intersect]"
                  />
                ) : (
                  <div className="grid h-full place-items-center p-10 text-ink/60">
                    <Motif kind="rings" live className="h-full max-h-80 w-full" />
                  </div>
                )}
              </div>
            </article>
          </motion.div>
        </div>

        {pinned ? (
          <div className="gutter absolute inset-x-0 bottom-6 flex items-center gap-4" aria-hidden>
            <span className="t-eyebrow text-ash">Role para avançar</span>
            <div className="h-px flex-1 bg-steel">
              <motion.div style={{ scaleX: bar }} className="h-px origin-left bg-accent" />
            </div>
          </div>
        ) : (
          <p className="gutter t-eyebrow mt-6 text-ash lg:hidden" aria-hidden>
            Arraste para o lado →
          </p>
        )}
      </div>
    </section>
  );
}
