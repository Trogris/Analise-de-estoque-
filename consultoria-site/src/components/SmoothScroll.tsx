"use client";

import Lenis from "lenis";
import { useEffect } from "react";

let instance: Lenis | null = null;

/** Rola até um elemento usando a rolagem suave quando ativa, ou a nativa como reserva. */
export function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  if (instance) instance.scrollTo(el, { duration: 1.4 });
  else el.scrollIntoView({ behavior: "smooth", block: "start" });
}
export const lockScroll = (locked: boolean) => {
  if (instance && locked) instance.stop();
  else if (instance) instance.start();
  document.documentElement.style.overflow = locked ? "hidden" : "";
};

/** Rolagem com inércia no desktop. Desligada com movimento reduzido; no toque, a rolagem nativa é mantida. */
export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({ lerp: 0.11, anchors: true });
    instance = lenis;
    let raf = 0;
    const loop = (t: number) => {
      lenis.raf(t);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
      instance = null;
    };
  }, []);
  return null;
}
