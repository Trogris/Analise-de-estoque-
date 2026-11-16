"use client";

import { motion, useMotionValue, useSpring } from "motion/react";
import { useEffect, useState } from "react";

/**
 * Anel que acompanha o cursor e cresce sobre elementos interativos.
 * Só aparece com mouse e sem preferência por movimento reduzido; o cursor nativo continua visível.
 */
export function Cursor() {
  const [on, setOn] = useState(false);
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const scale = useMotionValue(1);
  const sx = useSpring(x, { stiffness: 420, damping: 34, mass: 0.5 });
  const sy = useSpring(y, { stiffness: 420, damping: 34, mass: 0.5 });
  const ss = useSpring(scale, { stiffness: 300, damping: 22 });

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)");
    if (!mq.matches) return;
    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      setOn(true);
      x.set(e.clientX);
      y.set(e.clientY);
      const t = e.target as Element | null;
      scale.set(t?.closest("a, button, input, textarea, label, .frame") ? (t.closest(".frame") && !t.closest("a, button") ? 1.6 : 0.45) : 1);
    };
    const leave = () => setOn(false);
    window.addEventListener("pointermove", move, { passive: true });
    document.documentElement.addEventListener("pointerleave", leave);
    return () => {
      window.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("pointerleave", leave);
    };
  }, [x, y, scale]);

  return <motion.div aria-hidden className="cursor" style={{ x: sx, y: sy, scale: ss, opacity: on ? 1 : 0 }} />;
}
