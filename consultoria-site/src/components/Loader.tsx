"use client";

import { useEffect, useRef } from "react";

/** Cortina de abertura: tela cheia na cor da marca, contador e saída para cima (animação em CSS). */
export function Loader() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / 1050);
      el.textContent = String(Math.round((1 - Math.pow(1 - p, 3)) * 100)).padStart(3, "0");
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div className="loader" aria-hidden>
      <span className="loader-bar" />
      <span className="text-sm font-extrabold uppercase [font-stretch:88%]">Ajustando a cadência</span>
      <span ref={ref} className="font-mono text-sm font-semibold tabular-nums">
        100
      </span>
    </div>
  );
}
