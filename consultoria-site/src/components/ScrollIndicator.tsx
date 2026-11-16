"use client";

import { motion, useScroll, useSpring, useTransform } from "motion/react";

/** Barra vertical fixa que acompanha o progresso da rolagem. */
export function ScrollIndicator() {
  const { scrollYProgress } = useScroll();
  const smooth = useSpring(scrollYProgress, { stiffness: 120, damping: 28, mass: 0.4 });
  const y = useTransform(smooth, [0, 1], ["0%", "233%"]);
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed right-[5px] top-1/2 z-40 hidden h-[44vh] w-[4px] -translate-y-1/2 overflow-hidden rounded-full mix-blend-difference lg:block"
    >
      <div className="absolute inset-0 rounded-full bg-white/15" />
      <motion.div style={{ y }} className="absolute inset-x-0 top-0 h-[30%] rounded-full bg-white/80" />
    </div>
  );
}
