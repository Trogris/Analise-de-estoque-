"use client";
/**
 * Modo apresentação: a história do retorno da IA em cenas de tela cheia,
 * montada com os mesmos números do painel (nenhum valor é próprio desta tela).
 */
import { ArrowDown, ArrowRight, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useFilters } from "@/components/filters";
import { COST_CATEGORIES } from "@/data/schema";
import { useStore } from "@/data/store";
import { groupBy, summarize, valueOf, type Indicator } from "@/domain/engine";
import { buildInsights } from "@/domain/insights";
import { HOURS_PER_MONTH, levelOf, maturity } from "@/domain/maturity";
import { periodLabel } from "@/domain/period";
import { fmt, indicatorText, type Fmt } from "@/lib/format";

/** Conta até o valor quando entra na tela (uma vez). */
function Count({ value, format }: { value: number; format: Fmt }) {
  const ref = useRef<HTMLSpanElement>(null);
  const still = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [shown, setShown] = useState(() => (still() ? value : 0));
  useEffect(() => {
    const el = ref.current;
    if (!el || still()) return;
    let raf = 0, done = false;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting || done) return;
      done = true;
      const t0 = performance.now();
      const tick = (now: number) => {
        const k = Math.min(1, (now - t0) / 1400);
        setShown(value * (1 - Math.pow(1 - k, 4)));
        if (k < 1) raf = requestAnimationFrame(tick); else setShown(value);
      };
      raf = requestAnimationFrame(tick);
    }, { threshold: 0.5 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [value]);
  return <span ref={ref}>{format(shown)}</span>;
}

function Big({ value, format, className }: { value: Indicator | number; format: Fmt; className?: string }) {
  if (typeof value === "number") return <span className={className}><Count value={value} format={format} /></span>;
  if (value.state === "ok") return <span className={className}><Count value={value.value} format={format} /></span>;
  const t = indicatorText(value, format);
  return <span className="block"><span className="mega-title outline block" style={{ fontSize: "clamp(34px, 7vw, 96px)" }}>{t.text}</span><span className="block text-ink-2 text-[17px] mt-4 max-w-[46ch] font-sans normal-case tracking-normal leading-snug font-normal">{t.hint}</span></span>;
}

function Scene({ no, label, children, id, arc }: { no?: string; label?: string; children: ReactNode; id: string; arc?: boolean }) {
  return (
    <section className={`scene ${arc ? "scene-arc" : ""}`} id={id} data-scene>
      <div className="scene-inner">
        {label ? <div className="scene-no fd">{no ? <span>{no}</span> : null}<span>{label}</span></div> : null}
        {children}
      </div>
    </section>
  );
}
const Line = ({ children, i = 0, className }: { children: ReactNode; i?: number; className?: string }) => (
  <span className={`rv ${className ?? ""}`} style={{ "--i": i } as React.CSSProperties}><span>{children}</span></span>
);
const Fade = ({ children, i = 0, className }: { children: ReactNode; i?: number; className?: string }) => (
  <div className={`fd ${className ?? ""}`} style={{ "--i": i } as React.CSSProperties}>{children}</div>
);

export default function Apresentacao() {
  const { db, hasDemo } = useStore();
  const { scope } = useFilters();
  const router = useRouter();
  const root = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [intro, setIntro] = useState(0); // 0..100; 101 = saiu
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / 1100);
      setIntro(k < 1 ? Math.round(100 * (1 - Math.pow(1 - k, 3))) : 101);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const s = useMemo(() => summarize(db, { from: scope.from, to: scope.to }), [db, scope.from, scope.to]);
  const depts = useMemo(() => {
    const m = new Map(maturity(db, scope).map((r) => [r.id, r.score]));
    return groupBy(db, { from: scope.from, to: scope.to }, "department")
      .map((g) => ({ ...g, score: m.get(g.id) ?? null }))
      .sort((a, b) => (valueOf(b.summary.roi) ?? -Infinity) - (valueOf(a.summary.roi) ?? -Infinity));
  }, [db, scope]);
  const tools = useMemo(() => groupBy(db, { from: scope.from, to: scope.to }, "tool"), [db, scope.from, scope.to]);
  const insights = useMemo(() => buildInsights(db, { from: scope.from, to: scope.to }, new Date().toISOString().slice(0, 10)).slice(0, 3), [db, scope.from, scope.to]);
  const roi = valueOf(s.roi);
  const fte = s.months ? s.hoursSaved / (HOURS_PER_MONTH * s.months) : 0;
  const funnelMax = Math.max(s.capacityValue, s.benefitValidated + s.benefitPending, 1);
  const org = db.org[0]?.name ?? "Sua empresa";
  const period = `${periodLabel(scope.from)} — ${periodLabel(scope.to)}`;
  const scenes = ["Abertura", "Investimento", "Tempo", "Caixa", "Retorno", "Departamentos", "Próximos passos", "Fim"];

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    el.focus();
    const nodes = [...el.querySelectorAll<HTMLElement>("[data-scene]")];
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add("in");
        setActive(nodes.indexOf(e.target as HTMLElement));
      }
    }, { root: el, threshold: 0.35 });
    nodes.forEach((n) => io.observe(n));
    const onScroll = () => el.style.setProperty("--p", String(el.scrollTop / Math.max(1, el.scrollHeight - el.clientHeight)));
    el.addEventListener("scroll", onScroll, { passive: true });
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") router.push("/"); };
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { io.disconnect(); el.removeEventListener("scroll", onScroll); window.removeEventListener("keydown", onKey); document.body.style.overflow = overflow; };
  }, [router, depts.length, tools.length, insights.length]);

  const go = (i: number) => root.current?.querySelectorAll<HTMLElement>("[data-scene]")[i]?.scrollIntoView({ behavior: "smooth" });

  return (
    <div ref={root} className="story" tabIndex={-1} aria-label="Modo apresentação">
      <div className={`intro ${intro > 100 ? "out" : ""}`} aria-hidden>
        <div className="text-center"><div className="intro-count">{Math.min(100, intro)}</div><div className="scene-no justify-center mt-4 !text-white/80"><span>Carregando resultados</span></div></div>
      </div>
      <div className="story-progress" aria-hidden />
      <div className="story-line" aria-hidden><i /></div>
      <div className="story-bg" aria-hidden><i /><i /></div>

      <header className="fixed top-0 inset-x-0 z-[4] flex items-center gap-3 px-5 sm:px-8 h-16">
        <span className="brand-mark" aria-hidden />
        <span className="font-semibold tracking-tight hidden sm:block">AI ROI <span className="text-ink-3 font-medium">Controller</span></span>
        {hasDemo ? <span className="pill pill-warn ml-1">Dados fictícios de exemplo</span> : null}
        <span className="flex-1" />
        <span className="text-ink-3 text-[13px] num hidden sm:block">{String(active + 1).padStart(2, "0")} / {String(scenes.length).padStart(2, "0")} · {scenes[active]}</span>
        <Link href="/" className="btn btn-ghost" aria-label="Sair da apresentação"><X size={16} /><span className="hidden sm:inline">Sair</span></Link>
      </header>

      <nav className="fixed right-4 top-1/2 -translate-y-1/2 z-[4] hidden md:flex flex-col gap-2.5" aria-label="Cenas">
        {scenes.map((n, i) => (
          <button key={n} type="button" onClick={() => go(i)} aria-label={`Ir para ${n}`} aria-current={i === active ? "step" : undefined} title={n}
            className={`w-2 rounded-full transition-all duration-300 ${i === active ? "h-7 bg-white" : "h-2 bg-white/30 hover:bg-white/60"}`} />
        ))}
      </nav>

      <Scene id="abertura">
        <Fade className="scene-no"><span>{org}</span><span>{period}</span></Fade>
        <h1 className="mega mega-title mt-6">
          <Line>O retorno da</Line>
          <Line i={1}><span className="serif">inteligência</span></Line>
          <Line i={2}><span className="glow-blue">artificial</span></Line>
        </h1>
        <Fade i={4} className="mt-8 flex flex-wrap items-center gap-4">
          <p className="text-ink-2 text-[17px] sm:text-[19px] max-w-[44ch] leading-snug">Quanto foi investido, quanto tempo voltou para as equipes e quanto disso virou resultado financeiro comprovado.</p>
        </Fade>
        <button type="button" onClick={() => go(1)} className="fd absolute left-1/2 -translate-x-1/2 bottom-7 flex flex-col items-center gap-2 text-ink-3 text-[12px] uppercase tracking-[0.18em]" style={{ "--i": 6 } as React.CSSProperties}>
          Role para começar<ArrowDown size={18} className="animate-bounce" />
        </button>
      </Scene>

      <Scene id="investimento" no="01" label="Investimento">
        <h2 className="mega mt-5"><Line><Big value={s.investment} format={fmt.moneyShort} className="glow-blue" /></Line></h2>
        <Fade i={2} className="mt-7 text-[19px] sm:text-[22px] text-ink-2 max-w-[40ch] leading-snug">investidos em inteligência artificial no período, somando licenças e todos os outros custos.</Fade>
        <Fade i={3} className="mt-7 flex flex-wrap gap-2.5">
          {COST_CATEGORIES.filter(([k]) => s.byCategory[k as keyof typeof s.byCategory] > 0).map(([k, l]) => (
            <span key={k} className="rounded-full border border-[var(--line-strong)] px-4 py-2 text-[14.5px]"><span className="text-ink-3">{l} </span><b className="num">{fmt.moneyShort(s.byCategory[k as keyof typeof s.byCategory])}</b></span>
          ))}
        </Fade>
      </Scene>

      <Scene id="tempo" no="02" label="Tempo devolvido">
        <h2 className="mega mt-5"><Line><Big value={s.hoursSaved} format={(v) => fmt.int(v)} /></Line><Line i={1}><span className="sub-serif">horas liberadas para as equipes</span></Line></h2>
        <Fade i={3} className="mt-8 grid gap-4 sm:grid-cols-3 max-w-[900px]">
          <div className="frame"><div className="display text-[40px] num">{fmt.num(Math.round(fte * 10) / 10)}</div><div className="text-ink-2 text-[14px] mt-1.5">pessoas em tempo integral durante o período</div><span className="frame-tab">Equivale a <b>pessoas</b></span></div>
          <div className="frame"><div className="display text-[40px] num">{fmt.moneyShort(s.capacityValue)}</div><div className="text-ink-2 text-[14px] mt-1.5">horas × custo da hora. Ainda não é dinheiro em caixa.</div><span className="frame-tab">Capacidade <b>liberada</b></span></div>
          <div className="frame"><span className="frame-tab">Processos <b>medidos</b></span><div className="display text-[40px] num">{s.measuredProcessCount}</div><div className="text-ink-2 text-[14px] mt-1.5">{s.measuredProcessCount === 1 ? "processo medido" : "processos medidos"}, com {indicatorText(s.approvalRate, fmt.pct).ok ? `${indicatorText(s.approvalRate, fmt.pct).text} das entregas aprovadas` : "aprovação ainda não informada"}</div></div>
        </Fade>
      </Scene>

      <Scene id="caixa" no="03" label="O que virou caixa">
        <h2 className="mega mt-5"><Line><Big value={s.benefitValidated} format={fmt.moneyShort} className="glow-pos" /></Line></h2>
        <Fade i={2} className="mt-7 text-[19px] sm:text-[22px] text-ink-2 max-w-[42ch] leading-snug">em benefício financeiro validado, com evidência. Só este valor entra no cálculo do retorno.</Fade>
        <Fade i={3} className="mt-8 max-w-[760px] flex flex-col gap-4">
          {([["Capacidade liberada", s.capacityValue, "rgba(255,255,255,.45)"], ["Benefícios lançados", s.benefitValidated + s.benefitPending, "#4a90ff"], ["Benefício validado", s.benefitValidated, "var(--pos)"]] as const).map(([l, v, c]) => (
            <div key={l}><div className="flex justify-between text-[15px]"><span className="text-ink-2">{l}</span><b className="num">{fmt.moneyShort(v)}</b></div>
              <div className="h-2.5 rounded-full bg-white/10 mt-2 overflow-hidden"><i className="block h-full rounded-full" style={{ width: `${Math.min(100, (v / funnelMax) * 100)}%`, background: c }} /></div></div>
          ))}
          <p className="text-ink-3 text-[14px]">Taxa de realização: <b className="text-ink">{indicatorText(s.realizationRate, fmt.pct).text}</b> da capacidade liberada virou benefício validado.{s.benefitPending > 0 ? ` Há ${fmt.moneyShort(s.benefitPending)} aguardando validação.` : ""}</p>
        </Fade>
      </Scene>

      <Scene id="retorno" no="04" label="Retorno sobre o investimento">
        <h2 className="mega mt-5"><Line><Big value={s.roi} format={fmt.pct} className={roi === null ? undefined : roi >= 0 ? "glow-pos" : "glow-neg"} /></Line>{roi !== null ? <Line i={1}><span className="sub-serif">de retorno sobre o investimento</span></Line> : null}</h2>
        {roi !== null ? (
          <Fade i={3} className="mt-8 grid gap-4 sm:grid-cols-3 max-w-[900px]">
            <div className="frame frame-blue"><span className="frame-tab" dangerouslySetInnerHTML={{ __html: "Por real <b>investido</b>" }} /><div className="display text-[40px] num">{indicatorText(s.benefitPerReal, fmt.ratio).text}</div></div>
            <div className="frame frame-blue"><span className="frame-tab" dangerouslySetInnerHTML={{ __html: "Resultado <b>líquido</b>" }} /><div className="display text-[40px] num">{indicatorText(s.net, fmt.moneyShort).text}</div></div>
            <div className="frame frame-blue"><span className="frame-tab" dangerouslySetInnerHTML={{ __html: "Tempo de <b>payback</b>" }} /><div className="display text-[40px] num">{indicatorText(s.paybackMonths, fmt.months).text}</div></div>
          </Fade>
        ) : null}
        {tools.length ? (
          <Fade i={4} className="marquee mt-10 -mx-5">
            <div className="marquee-track" style={{ "--marquee-s": `${Math.max(24, tools.length * 9)}s` } as React.CSSProperties}>
              {[0, 1].map((copy) => (
                <div key={copy} className="flex" aria-hidden={copy === 1}>
                  {[...tools, ...tools].map((t, i) => { const r = valueOf(t.summary.roi); return (
                    <span key={`${t.id}-${i}`} className="wide text-[26px] sm:text-[40px] px-7 whitespace-nowrap flex items-center gap-4">
                      <span className="outline">{t.name}</span>
                      <span className={r === null ? "text-ink-3" : r >= 0 ? "text-pos" : "text-neg"} style={{ fontSize: "0.6em" }}>{r === null ? "sem ROI" : `${r >= 0 ? "+" : ""}${fmt.pct(r)}`}</span>
                      <span className="text-ink-3" aria-hidden>✦</span>
                    </span>); })}
                </div>
              ))}
            </div>
          </Fade>
        ) : null}
      </Scene>

      <Scene id="departamentos" no="05" label="Departamentos" arc>
        <h2 className="mega mega-title mt-5" style={{ fontSize: "clamp(40px, 8vw, 120px)" }}><Line>Onde o <span className="serif">retorno</span></Line><Line i={1}>acontece</Line></h2>
        <Fade i={2} className="mt-8">
          {depts.length ? (
            <div className="rail" tabIndex={0} aria-label="Departamentos, deslize para o lado">
              {depts.map((d, i) => { const r = valueOf(d.summary.roi); return (
                <article key={d.id} className="frame flex flex-col min-h-[320px]">
                  <div className="flex items-start justify-between gap-3"><span className="wide text-[44px] outline">{String(i + 1).padStart(2, "0")}</span>
                    {d.score !== null ? <span className="pill pill-info" title="Índice de maturidade em IA">Maturidade {d.score} · {levelOf(d.score).label}</span> : null}</div>
                  <h3 className="display text-[22px] mt-3 leading-tight">{d.name}</h3>
                  <div className={`display text-[52px] leading-none mt-auto pt-5 num ${r === null ? "text-ink-3 !text-[22px]" : r >= 0 ? "glow-pos" : "glow-neg"}`}>{r === null ? indicatorText(d.summary.roi, fmt.pct).text : `${r >= 0 ? "+" : ""}${fmt.pct(r)}`}</div>
                  <div className="text-ink-3 text-[13px] mt-1">ROI no período</div>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4 pt-4 border-t border-[var(--line)] text-[13.5px]">
                    <div><dt className="text-ink-3">Investido</dt><dd className="font-semibold num">{fmt.moneyShort(d.summary.investment)}</dd></div>
                    <div><dt className="text-ink-3">Validado</dt><dd className="font-semibold num">{fmt.moneyShort(d.summary.benefitValidated)}</dd></div>
                    <div><dt className="text-ink-3">Horas liberadas</dt><dd className="font-semibold num">{fmt.hours(d.summary.hoursSaved)}</dd></div>
                    <div><dt className="text-ink-3">Aprovação</dt><dd className="font-semibold num">{indicatorText(d.summary.approvalRate, fmt.pct).ok ? indicatorText(d.summary.approvalRate, fmt.pct).text : "—"}</dd></div>
                  </dl>
                  <span className="frame-tab">{d.name.length > 22 ? `${d.name.slice(0, 21)}…` : d.name} <b>{periodLabel(scope.to)}</b></span>
                </article>); })}
            </div>
          ) : <p className="text-ink-2 text-[18px]">Nenhum departamento com dados no período.</p>}
          {depts.length > 1 ? <p className="text-ink-3 text-[13px] mt-1 flex items-center gap-2">Deslize para o lado <ArrowRight size={14} /></p> : null}
        </Fade>
      </Scene>

      <Scene id="proximos" no="06" label="Próximos passos">
        <h2 className="mega mega-title mt-5" style={{ fontSize: "clamp(40px, 8vw, 120px)" }}><Line>O que fazer</Line><Line i={1}><span className="serif">agora</span></Line></h2>
        <ol className="mt-9 flex flex-col max-w-[980px]">
          {insights.length === 0 ? <Fade i={2} className="text-ink-2 text-[18px]">Sem recomendações para o período. Elas aparecem conforme custos, medições e benefícios são registrados.</Fade> : null}
          {insights.map((it, i) => (
            <Fade key={it.id} i={i + 2}>
              <li className="grid grid-cols-[auto_1fr] gap-x-5 sm:gap-x-8 py-5 border-t border-[var(--line-strong)]">
                <span className="wide text-[30px] sm:text-[44px] outline">{String(i + 1).padStart(2, "0")}</span>
                <span><span className="display block text-[20px] sm:text-[26px] leading-tight">{it.title}</span><span className="block text-ink-2 text-[15px] sm:text-[16px] mt-2 max-w-[70ch]">{it.detail}</span></span>
              </li>
            </Fade>
          ))}
        </ol>
      </Scene>

      <Scene id="fim">
        <div className="panel">
        <h2 className="mega mega-title"><Line>Medir <span className="serif">para</span></Line><Line i={1}><span className="glow-blue">decidir.</span></Line></h2>
        <Fade i={4} className="mt-9 flex flex-wrap gap-3">
          <Link href="/relatorio" className="btn btn-primary !h-12 !px-6 !text-[15.5px]">Gerar relatório executivo<ArrowRight size={17} /></Link>
          <Link href="/" className="btn btn-ghost !h-12 !px-6 !text-[15.5px]">Voltar ao painel</Link>
        </Fade>
        <Fade i={5} className="mt-8 text-ink-3 text-[13px] max-w-[70ch]">Todos os números desta apresentação vêm dos mesmos registros do painel. ROI considera apenas benefícios validados; capacidade liberada não é somada ao benefício financeiro.{hasDemo ? " Os dados exibidos são fictícios, de demonstração." : ""}</Fade>
        </div>
      </Scene>
    </div>
  );
}
