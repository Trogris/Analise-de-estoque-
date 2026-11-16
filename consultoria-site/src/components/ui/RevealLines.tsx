"use client";

import { motion, useReducedMotion } from "motion/react";
import { EASE } from "./motion";

/** Título revelado linha a linha, subindo por trás de uma máscara. */
export function RevealLines({
  lines,
  className = "",
  lineClassName = "",
  delay = 0,
  as: Tag = "h2",
  immediate = false,
}: {
  lines: React.ReactNode[];
  className?: string;
  lineClassName?: string;
  delay?: number;
  as?: "h1" | "h2" | "h3" | "p" | "div";
  /** Anima ao montar (hero) em vez de ao entrar na tela. */
  immediate?: boolean;
}) {
  const reduce = useReducedMotion();
  const MotionTag = motion[Tag];
  return (
    <MotionTag
      className={className}
      initial={reduce ? false : "hidden"}
      {...(immediate ? { animate: "show" } : { whileInView: "show", viewport: { once: true, margin: "0px 0px -12% 0px" } })}
      transition={{ staggerChildren: 0.09, delayChildren: delay }}
    >
      {lines.map((line, i) => (
        <span key={i} className={`block overflow-hidden pb-[0.2em] pt-[0.08em] -mb-[0.2em] -mt-[0.08em] ${lineClassName}`}>
          <motion.span
            className="block will-change-transform"
            variants={{ hidden: { y: "112%" }, show: { y: "0%", transition: { duration: 1.05, ease: EASE } } }}
          >
            {line}
          </motion.span>
        </span>
      ))}
    </MotionTag>
  );
}
