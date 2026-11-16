import { ArrowUpRight } from "lucide-react";
import { articles, insightTopics } from "@/config/site";
import { Reveal } from "../ui/Reveal";
import { RevealLines } from "../ui/RevealLines";

export function Insights() {
  const hasArticles = articles.length > 0;
  return (
    <section id="insights" aria-labelledby="insights-title" className="relative bg-graphite">
      <div className="arc bg-ink" aria-hidden />
      <div className="bg-ink pb-28 lg:pb-44">
        <div className="gutter">
          <header className="grid grid-cols-1 gap-8 pb-14 pt-10 lg:grid-cols-12 lg:pb-20 lg:pt-16">
            <div className="lg:col-span-8">
              <p className="t-eyebrow mb-6 text-accent">Insights</p>
              <RevealLines
                className="t-impact text-[15vw] lg:text-[8.2rem]"
                lines={[
                  "Ideias para",
                  <span key="b" className="t-serif normal-case text-fog [letter-spacing:-0.02em]">
                    quem faz acontecer.
                  </span>,
                ]}
              />
              <h2 id="insights-title" className="sr-only">
                Insights: artigos e análises
              </h2>
            </div>
            <Reveal className="self-end lg:col-span-4" delay={0.15}>
              <p className="t-body max-w-md text-fog">
                {hasArticles
                  ? "Artigos sobre IA, produtividade, automação, gestão industrial e eficiência operacional."
                  : "Cinco linhas editoriais, escritas para quem toca a operação. As primeiras publicações estão em preparação."}
              </p>
            </Reveal>
          </header>

          <ul className="border-t border-steel">
            {hasArticles
              ? articles.map((a, i) => (
                  <li key={a.href}>
                    <Reveal delay={i * 0.05}>
                      <a href={a.href} className="row group">
                        <span className="t-eyebrow w-40 shrink-0 text-accent group-hover:text-ink">{a.topic}</span>
                        <span className="t-title flex-1 text-[1.7rem] lg:text-[2.6rem]">{a.title}</span>
                        <span className="t-eyebrow hidden lg:block">
                          {a.date} · {a.readingTime}
                        </span>
                        <ArrowUpRight className="size-7 shrink-0" aria-hidden />
                      </a>
                    </Reveal>
                  </li>
                ))
              : insightTopics.map((t, i) => (
                  <li key={t}>
                    <Reveal delay={i * 0.05}>
                      <div className="row group">
                        <span className="t-eyebrow w-8 shrink-0 text-ash group-hover:text-ink">{String(i + 1).padStart(2, "0")}</span>
                        <span className="t-title flex-1 text-[2rem] lg:text-[3.6rem]">{t}</span>
                        <span className="t-eyebrow text-ash group-hover:text-ink">Em breve</span>
                      </div>
                    </Reveal>
                  </li>
                ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
