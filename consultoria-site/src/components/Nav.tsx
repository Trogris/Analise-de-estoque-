"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { contact, nav, whatsappHref } from "@/config/site";
import { Brand } from "./ui/Brand";
import { Frame } from "./ui/Frame";
import { Motif } from "./ui/Motif";
import { EASE } from "./ui/motion";

const MENU_MOTIFS = ["network", "steps", "rings", "grid", "untangle"] as const;

export function Nav() {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(0);
  const reduce = useReducedMotion();
  const firstLink = useRef<HTMLAnchorElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
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
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  const go = useCallback((e: React.MouseEvent, id: string) => {
    e.preventDefault();
    setOpen(false);
    document.documentElement.style.overflow = "";
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
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
            <a href="#contato" className="btn !h-[3.1rem] !border-ink/30" onClick={(e) => go(e, "contato")}>
              <span className="roll">
                <span>Contato</span>
                <span aria-hidden>Contato</span>
              </span>
              <ArrowUpRight className="size-4" strokeWidth={2.5} aria-hidden />
            </a>
            <button
              ref={toggle}
              type="button"
              aria-expanded={open}
              aria-controls="menu"
              aria-label={open ? "Fechar menu" : "Abrir menu"}
              onClick={() => setOpen((v) => !v)}
              className="relative grid size-[3.1rem] cursor-pointer place-items-center rounded-[0.4rem] bg-bone text-ink"
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
              {/* Painel de prévia: muda conforme o link em foco */}
              <div className="hidden lg:col-span-5 lg:block">
                <Frame className="h-[62vh] text-fog" fill="var(--color-graphite)" tab={<span>{nav[hover].hint}</span>}>
                  <div className="grid h-full place-items-center p-10">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={hover}
                        initial={{ opacity: 0, scale: 0.92 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.05 }}
                        transition={{ duration: 0.35, ease: EASE }}
                        className="h-full w-full"
                      >
                        <Motif kind={MENU_MOTIFS[hover % MENU_MOTIFS.length]} live className="h-full w-full" />
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </Frame>
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
                        <span className="transition-transform duration-500 ease-brand group-hover/link:translate-x-3 group-focus-visible/link:translate-x-3">
                          {item.label}
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
