"use client";

import { animate } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Frame } from "../ui/Frame";
import { Reveal } from "../ui/Reveal";
import { RevealLines } from "../ui/RevealLines";

/** Cálculo da demonstração. Todos os valores são hipotéticos e ajustáveis pelo visitante. */
export function simulate(v: { people: number; hours: number; share: number; hourCost: number; tools: number }) {
  const hoursSaved = v.people * v.hours * 4.33 * (v.share / 100); // 4,33 semanas por mês
  const value = hoursSaved * v.hourCost;
  const net = value - v.tools;
  const multiple = v.tools > 0 ? value / v.tools : null;
  return { hoursSaved, value, net, multiple };
}

const FIELDS = [
  { key: "people", label: "Pessoas envolvidas no processo", min: 1, max: 60, step: 1, unit: "" },
  { key: "hours", label: "Horas por semana, por pessoa, em tarefas repetitivas", min: 1, max: 20, step: 1, unit: "h" },
  { key: "share", label: "Parte dessas horas que a automação elimina", min: 10, max: 80, step: 5, unit: "%" },
  { key: "hourCost", label: "Custo médio da hora de trabalho", min: 20, max: 250, step: 5, unit: "R$" },
  { key: "tools", label: "Custo mensal das ferramentas de IA", min: 100, max: 6000, step: 100, unit: "R$" },
] as const;

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const int = (n: number) => Math.round(n).toLocaleString("pt-BR");

export function RoiDemo() {
  const [v, setV] = useState({ people: 8, hours: 6, share: 40, hourCost: 45, tools: 800 });
  const r = simulate(v);

  return (
    <section aria-labelledby="demo-title" className="relative bg-bone">
      <div className="arc bg-graphite" aria-hidden />
      <div className="bg-graphite pb-28 lg:pb-40">
        <div className="gutter">
          <header className="grid grid-cols-1 gap-8 pb-14 pt-10 lg:grid-cols-12 lg:pb-20 lg:pt-16">
            <div className="lg:col-span-8">
              <p className="t-eyebrow mb-6 text-accent">Demonstração · valores hipotéticos</p>
              <RevealLines
                className="t-impact text-[15vw] lg:text-[8.2rem]"
                lines={[
                  "Faça a conta.",
                  <span key="b" className="t-serif normal-case text-fog [letter-spacing:-0.02em]">
                    Quanto tempo está parado?
                  </span>,
                ]}
              />
              <h2 id="demo-title" className="sr-only">
                Simulador de retorno: demonstração com valores hipotéticos
              </h2>
            </div>
            <Reveal className="self-end lg:col-span-4" delay={0.15}>
              <p className="t-body max-w-md text-fog">
                Um simulador para dimensionar a oportunidade com os números da sua empresa. É uma conta ilustrativa: não representa
                resultado de cliente nem promessa de ganho.
              </p>
            </Reveal>
          </header>

          <Reveal>
            <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-8">
              <form className="flex flex-col gap-7 lg:col-span-5" onSubmit={(e) => e.preventDefault()}>
                {FIELDS.map((f) => (
                  <div key={f.key} className="flex flex-col gap-3">
                    <div className="flex items-baseline justify-between gap-4">
                      <label htmlFor={`sim-${f.key}`} className="text-[1rem] text-fog">
                        {f.label}
                      </label>
                      <output htmlFor={`sim-${f.key}`} className="shrink-0 font-mono text-[1.05rem] font-semibold tabular-nums text-bone">
                        {f.unit === "R$" ? brl(v[f.key]) : `${v[f.key]}${f.unit}`}
                      </output>
                    </div>
                    <input
                      id={`sim-${f.key}`}
                      type="range"
                      min={f.min}
                      max={f.max}
                      step={f.step}
                      value={v[f.key]}
                      onChange={(e) => setV((s) => ({ ...s, [f.key]: Number(e.target.value) }))}
                      className="range"
                      style={{ "--p": `${((v[f.key] - f.min) / (f.max - f.min)) * 100}%` } as React.CSSProperties}
                    />
                  </div>
                ))}
              </form>

              <Frame
                className="text-fog lg:col-span-6 lg:col-start-7"
                fill="var(--color-graphite)"
                tab={<span className="text-accent">Simulação ilustrativa</span>}
                style={{ "--tab": "50%" } as React.CSSProperties}
              >
                <div className="flex h-full flex-col justify-between gap-10 p-5 lg:p-8" aria-live="polite">
                  <div>
                    <p className="t-eyebrow text-ash">Horas liberadas por mês</p>
                    <p className="t-impact mt-3 flex items-start text-[6rem] text-bone lg:text-[11rem]">
                      <Animated value={r.hoursSaved} format={int} />
                      <span className="pt-[0.12em] text-[0.3em] text-accent">h</span>
                    </p>
                  </div>
                  <dl className="grid grid-cols-1 gap-x-6 border-t border-steel pb-4 sm:grid-cols-3">
                    <Stat label="Valor desse tempo">
                      <Animated value={r.value} format={brl} />
                    </Stat>
                    <Stat label="Saldo após as ferramentas">
                      <Animated value={r.net} format={brl} />
                    </Stat>
                    <Stat label="Retorno por real investido">
                      {r.multiple === null ? "—" : <Animated value={r.multiple} format={(n) => `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}×`} />}
                    </Stat>
                  </dl>
                </div>
              </Frame>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 border-b border-steel py-4 sm:border-b-0">
      <dt className="t-eyebrow text-ash">{label}</dt>
      <dd className="text-[1.7rem] font-bold tracking-[-0.02em] text-bone tabular-nums [font-stretch:88%]">{children}</dd>
    </div>
  );
}

/** Número que desliza até o novo valor a cada ajuste. */
function Animated({ value, format }: { value: number; format: (n: number) => string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(value);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.textContent = format(value);
      prev.current = value;
      return;
    }
    const controls = animate(prev.current, value, {
      duration: 0.5,
      ease: [0.65, 0.05, 0, 1],
      onUpdate: (n) => (el.textContent = format(n)),
    });
    prev.current = value;
    return () => controls.stop();
  }, [value, format]);
  return (
    <span ref={ref} className="tabular-nums">
      {format(value)}
    </span>
  );
}
