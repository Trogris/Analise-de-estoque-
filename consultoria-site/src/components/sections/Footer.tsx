import { ArrowUp } from "lucide-react";
import { brand, contact, nav } from "@/config/site";

export function Footer() {
  return (
    <footer className="relative bg-accent text-ink">
      <div className="arc bg-bone" aria-hidden />
      <div className="bg-bone">
        <div className="gutter flex flex-col gap-14 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] pt-12 lg:pt-20">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
            <p className="t-serif max-w-xl text-[clamp(1.7rem,3.4vw,3rem)] lg:col-span-6">{brand.tagline}</p>
            <nav aria-label="Rodapé" className="lg:col-span-3 lg:col-start-8">
              <ul className="grid grid-cols-2 gap-x-6 gap-y-2">
                {nav.map((n) => (
                  <li key={n.id}>
                    <a href={`#${n.id}`} className="text-[1.1rem] font-bold uppercase tracking-[-0.01em] underline-offset-4 [font-stretch:88%] hover:underline">
                      {n.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="flex lg:col-span-2 lg:justify-end">
              <a href="#top" className="btn btn-dark self-start">
                Topo <ArrowUp className="size-4" strokeWidth={2.5} aria-hidden />
              </a>
            </div>
          </div>

          <p aria-hidden className="t-impact -mb-[0.06em] whitespace-nowrap pt-[0.12em] text-[23vw] leading-[0.8] lg:text-[17.6vw]">
            {brand.name}
          </p>

          <div className="t-eyebrow flex flex-wrap justify-between gap-3 border-t border-ink/20 pt-5">
            <span>
              © {new Date().getFullYear()} {brand.name} · {brand.descriptor}
            </span>
            <a href={`mailto:${contact.email}`} className="hover:underline">
              {contact.email}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
