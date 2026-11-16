"use client";

import { motion, useReducedMotion, useScroll, useSpring, useTransform, type MotionValue } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { useRef } from "react";
import { articles, insightTopics, type MotifKind } from "@/config/site";
import { Motif } from "../ui/Motif";
import { Reveal } from "../ui/Reveal";
import { RevealLines } from "../ui/RevealLines";

const ART: MotifKind[] = ["network", "takt", "untangle", "grid", "rings"];
const SKIN = ["bg-graphite text-bone", "bg-accent text-ink", "bg-ink text-bone", "bg-fog text-ink", "bg-graphite text-bone"];

/** INSIGHTS — as linhas editoriais abrem em leque conforme a rolagem. Artigos publicados entram em lista abaixo. */
export function Insights() {
  const ref = useRef<HTMLUListElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.95", "center 0.5"] });
  const open = useSpring(scrollYProgress, { stiffness: 90, damping: 22 });
  const mid = (insightTopics.length - 1) / 2;

  return (
    <section id="insights" aria-labelledby="insights-title" className="relative overflow-hidden bg-bone pb-24 pt-20 text-ink lg:pb-36 lg:pt-28">
      <div className="contours" aria-hidden />
      <div className="gutter relative flex flex-col items-center text-center">
        <p className="t-eyebrow mb-6">Insights</p>
        <RevealLines
          className="t-impact text-[13vw] lg:text-[6.4rem]"
          lines={[
            "Ideias para",
            <span key="b" className="t-serif uppercase [letter-spacing:-0.02em]">
              quem faz acontecer
            </span>,
          ]}
        />
        <h2 id="insights-title" className="sr-only">
          Insights: artigos e análises
        </h2>
      </div>

      <ul ref={ref} className="relative mx-auto mt-14 h-[23rem] w-full max-w-[70rem] lg:mt-20 lg:h-[33rem]">
        {insightTopics.map((t, i) => (
          <FanCard key={t} index={i} offset={i - mid} open={open} still={!!reduce} skin={SKIN[i % SKIN.length]}>
            <div className="flex items-start justify-between">
              <span className="t-eyebrow opacity-70">{String(i + 1).padStart(2, "0")}</span>
              <span className="t-eyebrow rounded-[0.2rem] border border-current/40 px-2 py-1.5">Em breve</span>
            </div>
            <Motif kind={ART[i % ART.length]} live className="mx-auto w-[62%] opacity-80" />
            <h3 className="t-title text-[1.25rem] lg:text-[1.9rem]">{t}</h3>
          </FanCard>
        ))}
      </ul>

      <Reveal className="gutter relative mt-10 flex flex-col items-center gap-3 text-center">
        <p className="t-serif max-w-xl text-[1.5rem] lg:text-[1.9rem]">
          {articles.length
            ? "Artigos sobre IA, produtividade, automação, gestão industrial e eficiência operacional."
            : "Cinco linhas editoriais, escritas para quem toca a operação. As primeiras publicações estão em preparação."}
        </p>
      </Reveal>

      {articles.length ? (
        <ul className="gutter relative mt-14 border-t border-ink/20 text-left">
          {articles.map((a) => (
            <li key={a.href}>
              <a href={a.href} className="row group !border-ink/20">
                <span className="t-eyebrow w-40 shrink-0">{a.topic}</span>
                <span className="t-title flex-1 text-[1.7rem] lg:text-[2.6rem]">{a.title}</span>
                <span className="t-eyebrow hidden lg:block">
                  {a.date} · {a.readingTime}
                </span>
                <ArrowUpRight className="size-7 shrink-0" aria-hidden />
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function FanCard({
  children,
  index,
  offset,
  open,
  still,
  skin,
}: {
  children: React.ReactNode;
  index: number;
  offset: number;
  open: MotionValue<number>;
  still: boolean;
  skin: string;
}) {
  // Fechado: cartas empilhadas. Aberto: giram em torno de um ponto abaixo delas, como um leque.
  const rotate = useTransform(open, [0, 1], [offset * 2, offset * 13]);
  const y = useTransform(open, [0, 1], [120, Math.abs(offset) * 14]);
  return (
    <motion.li
      style={still ? { rotate: offset * 13, y: Math.abs(offset) * 14 } : { rotate, y }}
      whileHover={{ scale: 1.06, zIndex: 20 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      className={`absolute left-1/2 top-0 -ml-[5.25rem] flex h-[15.5rem] w-[10.5rem] origin-[50%_230%] flex-col justify-between rounded-[1.4rem] p-4 shadow-[0_1.5rem_3rem_-1rem_rgba(0,0,0,0.45)] lg:-ml-[8.5rem] lg:h-[25rem] lg:w-[17rem] lg:p-6 ${skin}`}
      data-index={index}
    >
      {children}
    </motion.li>
  );
}
