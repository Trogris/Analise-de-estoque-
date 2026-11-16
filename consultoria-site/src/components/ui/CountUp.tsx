"use client";

import { animate, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";
import { EASE } from "./motion";

/** Número que conta até o valor quando entra na tela. */
export function CountUp({ to, duration = 1.8, className = "" }: { to: number; duration?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -15% 0px" });
  const reduce = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || !inView) return;
    if (reduce) {
      el.textContent = String(to);
      return;
    }
    const controls = animate(0, to, {
      duration,
      ease: EASE,
      onUpdate: (v) => (el.textContent = String(Math.round(v))),
    });
    return () => controls.stop();
  }, [inView, to, duration, reduce]);

  // O valor final é renderizado no servidor: sem JavaScript o número continua correto.
  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      {to}
    </span>
  );
}
