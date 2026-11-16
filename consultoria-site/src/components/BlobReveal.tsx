"use client";

import { useEffect, useRef } from "react";

/**
 * Máscara orgânica que revela uma segunda imagem sobre a primeira.
 * Bolhas que se fundem (metaballs) seguem o cursor em cadeia e outras
 * vagam sozinhas, então o efeito também acontece no toque.
 * O campo é calculado em baixa resolução e ampliado com suavização.
 */
export function BlobReveal({ src, className = "" }: { src: string; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const MW = 150;
    const MH = 150;
    const maskCanvas = document.createElement("canvas");
    maskCanvas.width = MW;
    maskCanvas.height = MH;
    const mctx = maskCanvas.getContext("2d")!;
    const mask = mctx.createImageData(MW, MH);

    const img = new Image();
    img.decoding = "async";
    img.src = src;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ptr = { x: 0.62, y: 0.4, active: false };
    // Cadeia que segue o cursor: cada elo é mais lento e menor que o anterior.
    const chain = [
      { x: 0.62, y: 0.4, r: 0.1, k: 0.14 },
      { x: 0.62, y: 0.4, r: 0.078, k: 0.075 },
      { x: 0.62, y: 0.4, r: 0.06, k: 0.045 },
      { x: 0.62, y: 0.4, r: 0.046, k: 0.028 },
    ];
    let w = 0;
    let h = 0;
    let raf = 0;
    let visible = true;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const r = canvas.getBoundingClientRect();
      w = Math.max(1, Math.round(r.width * dpr));
      h = Math.max(1, Math.round(r.height * dpr));
      canvas.width = w;
      canvas.height = h;
      if (reduce) draw(0);
    };

    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      ptr.x = (e.clientX - r.left) / r.width;
      ptr.y = (e.clientY - r.top) / r.height;
      ptr.active = true;
    };

    const draw = (now: number) => {
      if (!img.complete || !img.naturalWidth) return;
      const t = now / 1000;
      // Sem cursor, a cadeia percorre o retrato sozinha.
      const tx = ptr.active ? ptr.x : 0.5 + Math.cos(t * 0.45) * 0.26;
      const ty = ptr.active ? ptr.y : 0.42 + Math.sin(t * 0.6) * 0.2;
      let px = tx;
      let py = ty;
      for (const c of chain) {
        c.x += (px - c.x) * c.k;
        c.y += (py - c.y) * c.k;
        px = c.x;
        py = c.y;
      }
      const blobs = [
        ...chain,
        { x: 0.3 + Math.sin(t * 0.31) * 0.16, y: 0.3 + Math.cos(t * 0.27) * 0.14, r: 0.05 },
        { x: 0.72 + Math.cos(t * 0.23) * 0.14, y: 0.66 + Math.sin(t * 0.35) * 0.12, r: 0.056 },
        { x: 0.48 + Math.sin(t * 0.19 + 2) * 0.22, y: 0.82 + Math.cos(t * 0.29) * 0.08, r: 0.042 },
      ];
      const d = mask.data;
      let i = 0;
      for (let y = 0; y < MH; y++) {
        const v = y / MH;
        for (let x = 0; x < MW; x++) {
          const u = x / MW;
          let f = 0;
          for (let b = 0; b < blobs.length; b++) {
            const dx = u - blobs[b].x;
            const dy = v - blobs[b].y;
            f += (blobs[b].r * blobs[b].r) / (dx * dx + dy * dy + 1e-4);
          }
          // Borda firme, mas sem serrilhado.
          const a = f <= 0.92 ? 0 : f >= 1.08 ? 255 : ((f - 0.92) / 0.16) * 255;
          d[i + 3] = a;
          i += 4;
        }
      }
      mctx.putImageData(mask, 0, 0);
      ctx.globalCompositeOperation = "source-over";
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      ctx.globalCompositeOperation = "destination-in";
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(maskCanvas, 0, 0, w, h);
    };

    const loop = (now: number) => {
      if (visible) draw(now);
      raf = requestAnimationFrame(loop);
    };

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(canvas);
    img.onload = () => reduce && draw(0);
    if (!reduce) {
      raf = requestAnimationFrame(loop);
      window.addEventListener("pointermove", onMove, { passive: true });
    }
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
    };
  }, [src]);

  return <canvas ref={ref} aria-hidden className={`block h-full w-full ${className}`} />;
}
