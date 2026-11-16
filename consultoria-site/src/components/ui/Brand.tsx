import Image from "next/image";
import { brand } from "@/config/site";

/** Símbolo + nome. Troque em src/config/site.ts (brand.logoSrc ou brand.name). */
export function Brand({ className = "" }: { className?: string }) {
  if (brand.logoSrc) {
    return <Image src={brand.logoSrc} alt={brand.name} width={160} height={48} className={`h-10 w-auto ${className}`} priority />;
  }
  return (
    <span className={`flex flex-col leading-[0.82] ${className}`}>
      <span className="t-serif text-[2.05rem] tracking-[-0.01em]">{brand.name}</span>
      <span className="pl-[0.1em] text-[0.82rem] font-extrabold uppercase tracking-[0.16em] [font-stretch:110%]">{brand.descriptor}</span>
    </span>
  );
}
