import Image from "next/image";
import type { MediaSlot, MotifKind } from "@/config/site";
import { Motif } from "./Motif";

/**
 * Retrato integrado ao site: painel escuro com brilho verde-limão, malha técnica,
 * gráfico animado atrás da figura, recorte da pessoa na frente e uma linha de
 * varredura. Sem foto, fica só o gráfico. Use dentro de um elemento com a classe `group`.
 */
export function Portrait({
  photo,
  motif,
  sizes = "(min-width:1024px) 24rem, 70vw",
  className = "",
  live = false,
  align = "center",
}: {
  photo: MediaSlot;
  motif: MotifKind;
  sizes?: string;
  className?: string;
  /** Mantém o gráfico animando mesmo sem o mouse por cima. */
  live?: boolean;
  align?: "center" | "left" | "right";
}) {
  const pos = align === "left" ? "object-left-bottom" : align === "right" ? "object-right-bottom" : "object-bottom";
  return (
    <div className={`plate relative overflow-hidden ${className}`}>
      <div className="plate-grid" aria-hidden />
      <div className="plate-glow" aria-hidden />
      <Motif
        kind={motif}
        live={live}
        className={`absolute text-fog/60 transition-transform duration-[1.2s] ease-brand group-hover:scale-110 ${photo ? "left-[8%] top-[6%] w-[84%]" : "inset-[14%] h-[72%] w-[72%]"}`}
      />
      {photo ? (
        <Image
          src={photo.src}
          alt={photo.alt}
          fill
          sizes={sizes}
          className={`object-contain ${pos} px-[4%] pt-[10%] transition-transform duration-[1.2s] ease-brand group-hover:scale-[1.04] [filter:drop-shadow(0_1.5rem_2rem_rgba(0,0,0,0.6))]`}
        />
      ) : null}
      <div className="plate-floor" aria-hidden />
      <div className="plate-scan" aria-hidden />
      <span className="plate-tick left-2 top-2 border-l border-t" aria-hidden />
      <span className="plate-tick right-2 top-2 border-r border-t" aria-hidden />
    </div>
  );
}
