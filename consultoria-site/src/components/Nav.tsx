"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { contact, media, nav, whatsappHref, type MediaSlot, type MotifKind } from "@/config/site";
import { lockScroll, scrollToId } from "./SmoothScroll";
import { Brand } from "./ui/Brand";
import { Magnetic } from "./ui/Magnetic";
import { Portrait } from "./ui/Portrait";
import { EASE } from "./ui/motion";

const MENU_TILES: { photo: MediaSlot; motif: MotifKind }[] = [
  { photo: media.cutTablet, motif: "network" },
  { photo: null, motif: "takt" },
  { photo: media.cutFront, motif: "rings" },
  { photo: media.cutCasual, motif: "grid" },
];

export function Nav() {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(0);
  const reduce = useReducedMotion();
  const firstLink = useRef<HTMLAnchorElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    lockScroll(open);
    if (open) firstLink.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        setOpen(false);
        toggle.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      lockScroll(false);
    };
  }, [open]);

  const go = useCallback((e: React.MouseEvent, id: string) => {
    e.preventDefault();
    setOpen(false);
    lockScroll(false);
    requestAnimationFrame(() => {
      scrollToId(id);
      history.replaceState(null, "", `#${id}`);
    });
  }, []);

  return (
    <>
      <header className="pointer-events-none fixed inset-x-0 top-0 z-50">
        <div className="gutter flex items-start justify-between pt-[max(1rem,env(safe-area-inset-top,0px))]">
          <a
            href="#top"
            aria-label="Voltar ao início"
            className="pointer-events-auto text-white mix-blend-difference"
            onClick={(e) => go(e, "top")}
          >
            <Brand />
          </a>
          <div className="pointer-events-auto flex items-center gap-2">
            <Magnetic>
            <a href="#contato" className="btn !h-[3.1rem] !border-ink/30" onClick={(e) => go(e, "contato")}>
              <span className="roll">
                <span>Contato</span>
                <span aria-hidden>Contato</span>
              </span>
              <ArrowUpRight className="size-4" strokeWidth={2.5} aria-hidden />
            </a>
            </Magnetic>
            <button
              ref={toggle}
              type="button"
              aria-expanded={open}
              aria-controls="menu"
              aria-label={open ? "Fechar menu" : "Abrir menu"}
              onClick={() => setOpen((v) => !v)}
              className="relative grid size-[3.1rem] cursor-pointer place-items-center rounded-[0.4rem] border border-ink/25 bg-bone text-ink"
            >
              <span
                className={`absolute h-[2px] w-5 bg-current transition-transform duration-500 ease-brand ${open ? "rotate-45" : "-translate-y-[4px]"}`}
              />
              <span
                className={`absolute h-[2px] w-5 bg-current transition-transform duration-500 ease-brand ${open ? "-rotate-45" : "translate-y-[4px]"}`}
              />
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            id="menu"
            role="dialog"
            aria-modal="true"
            aria-label="Menu principal"
            className="fixed inset-0 z-[45] overflow-y-auto bg-graphite text-bone"
            initial={reduce ? { opacity: 0 } : { clipPath: "inset(0 0 100% 0)" }}
            animate={reduce ? { opacity: 1 } : { clipPath: "inset(0 0 0% 0)" }}
            exit={reduce ? { opacity: 0 } : { clipPath: "inset(0 0 100% 0)" }}
            transition={{ duration: 0.85, ease: EASE }}
          >
            <div className="gutter grid min-h-full grid-cols-1 gap-10 pb-8 pt-28 lg:grid-cols-12 lg:pt-32">
              {/* Grade de fotos: a foto do link em foco ganha cor, as demais ficam em duotone */}
              <div className="hidden grid-cols-2 gap-4 self-start lg:col-span-5 lg:grid" aria-hidden>
                {MENU_TILES.map((t, i) => (
                  <motion.div
                    key={i}
                    initial={reduce ? false : { opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: EASE, delay: 0.25 + i * 0.07 }}
                    className={`transition-[filter,opacity] duration-700 ease-brand ${hover % MENU_TILES.length === i ? "" : "opacity-45 grayscale"}`}
                  >
                    <Portrait photo={t.photo} motif={t.motif} live={hover % MENU_TILES.length === i} sizes="20vw" className="aspect-[10/11]" />
                  </motion.div>
                ))}
              </div>

              <nav aria-label="Seções" className="flex flex-col justify-between gap-12 lg:col-span-6 lg:col-start-7">
                <ul className="flex flex-col">
                  {nav.map((item, i) => (
                    <li key={item.id} className="overflow-hidden">
                      <motion.a
                        ref={i === 0 ? firstLink : undefined}
                        href={`#${item.id}`}
                        onClick={(e) => go(e, item.id)}
                        onMouseEnter={() => setHover(i)}
                        onFocus={() => setHover(i)}
                        initial={reduce ? false : { y: "110%" }}
                        animate={{ y: 0 }}
                        transition={{ duration: 0.8, ease: EASE, delay: 0.18 + i * 0.05 }}
                        className={`group/link flex items-baseline gap-4 py-1 text-[clamp(2.6rem,11vw,5.2rem)] uppercase leading-[0.94] tracking-[-0.03em] transition-colors duration-300 [font-stretch:80%] lg:[font-stretch:100%] ${hover === i ? "text-bone" : "text-ash"}`}
                      >
                        <span className="t-eyebrow w-6 text-accent">{String(i + 1).padStart(2, "0")}</span>
                        <span className="relative transition-transform duration-500 ease-brand group-hover/link:translate-x-3 group-focus-visible/link:translate-x-3">
                          {item.label}
                          <span className="absolute left-0 top-[52%] h-[0.07em] w-full origin-left scale-x-0 bg-accent transition-transform duration-500 ease-brand group-hover/link:scale-x-100 group-focus-visible/link:scale-x-100" />
                        </span>
                      </motion.a>
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap gap-x-10 gap-y-3 border-t border-steel pt-6">
                  <a className="t-eyebrow text-fog hover:text-accent" href={`mailto:${contact.email}`}>
                    {contact.email}
                  </a>
                  <a className="t-eyebrow text-fog hover:text-accent" href={whatsappHref()} target="_blank" rel="noopener noreferrer">
                    WhatsApp
                  </a>
                  {contact.social.map((s) => (
                    <a key={s.href} className="t-eyebrow text-fog hover:text-accent" href={s.href} target="_blank" rel="noopener noreferrer">
                      {s.label}
                    </a>
                  ))}
                </div>
              </nav>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
