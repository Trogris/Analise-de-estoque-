"use client";

import { useEffect, useRef } from "react";

/**
 * A tese da marca em movimento: linhas emaranhadas à esquerda (complexidade
 * operacional) que se alinham em faixas paralelas à direita (performance).
 * Canvas 2D leve, pausado quando fora da tela e estático com movimento reduzido.
 */
export function FlowCanvas({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0;
    let h = 0;
    let raf = 0;
    let visible = true;
    // Ponteiro suavizado: as linhas se afastam do cursor.
    const ptr = { x: -9999, y: -9999, tx: -9999, ty: -9999 };
    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      ptr.tx = e.clientX - r.left;
      ptr.ty = e.clientY - r.top;
    };
    let lines: { p1: number; p2: number; p3: number; f1: number; f2: number; hot: boolean }[] = [];

    const seed = (n: number) => {
      // Gerador determinístico: a composição é a mesma a cada visita.
      let s = 7;
      const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
      lines = Array.from({ length: n }, (_, i) => ({
        p1: rnd() * Math.PI * 2,
        p2: rnd() * Math.PI * 2,
        p3: rnd() * Math.PI * 2,
        f1: 0.6 + rnd() * 1.4,
        f2: 1.8 + rnd() * 2.6,
        hot: i % 11 === 5,
      }));
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const r = canvas.getBoundingClientRect();
      w = r.width;
      h = r.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed(w < 700 ? 34 : 64);
      draw(performance.now());
    };

    const draw = (now: number) => {
      const t = now / 1000;
      ctx.clearRect(0, 0, w, h);
      ptr.x += (ptr.tx - ptr.x) * 0.08;
      ptr.y += (ptr.ty - ptr.y) * 0.08;
      const R = Math.max(120, w * 0.11);
      const n = lines.length;
      const top = h * 0.14;
      const band = h * 0.72;
      const step = Math.max(10, w / 110);
      for (let i = 0; i < n; i++) {
        const l = lines[i];
        const base = top + (band * i) / (n - 1);
        ctx.beginPath();
        for (let x = -step; x <= w + step; x += step) {
          const u = Math.min(1, Math.max(0, x / w));
          // Amplitude do caos: máxima à esquerda, zero a partir de ~70% da largura.
          const k = Math.min(1, u / 0.7);
          const amp = (1 - k * k * (3 - 2 * k)) * h * 0.3;
          let y =
            base +
            amp *
              (Math.sin(u * 5 * l.f1 + l.p1 + t * 0.22) * 0.6 +
                Math.sin(u * 5 * l.f2 + l.p2 - t * 0.16) * 0.3 +
                Math.sin(u * 17 + l.p3 + t * 0.3) * 0.1);
          const dx = x - ptr.x;
          const dy = y - ptr.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < R * R * 4) y += (dy >= 0 ? 1 : -1) * 46 * Math.exp(-d2 / (R * R * 0.6));
          if (x <= -step) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.lineWidth = l.hot ? 1.4 : 1;
        ctx.strokeStyle = l.hot ? "rgba(200,242,48,0.95)" : "rgba(241,239,232,0.17)";
        ctx.shadowColor = "rgba(200,242,48,0.7)";
        ctx.shadowBlur = l.hot ? 14 : 0;
        ctx.stroke();
      }
    };

    const loop = (now: number) => {
      if (visible) draw(now);
      raf = requestAnimationFrame(loop);
    };

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(canvas);
    if (!reduce) {
      raf = requestAnimationFrame(loop);
      window.addEventListener("pointermove", onMove, { passive: true });
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  return <canvas ref={ref} aria-hidden className={`block h-full w-full ${className}`} />;
}
