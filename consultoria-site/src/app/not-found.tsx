import Link from "next/link";

export default function NotFound() {
  return (
    <main className="gutter flex min-h-svh flex-col items-start justify-center gap-8">
      <p className="t-eyebrow text-accent">Erro 404</p>
      <h1 className="t-impact text-[18vw] lg:text-[11rem]">Fora de rota.</h1>
      <p className="t-body max-w-md text-fog">Esta página não existe ou foi movida.</p>
      <Link href="/" className="btn">Voltar ao início</Link>
    </main>
  );
}
