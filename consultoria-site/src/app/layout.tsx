import type { Metadata, Viewport } from "next";
import "./globals.css";
import { brand, contact } from "@/config/site";

const title = `${brand.name} — Inteligência artificial aplicada à produtividade empresarial`;

export const metadata: Metadata = {
  metadataBase: new URL(brand.url),
  title: { default: title, template: `%s · ${brand.name}` },
  description: brand.description,
  keywords: [
    "consultoria de inteligência artificial",
    "IA para empresas",
    "produtividade empresarial",
    "automação de processos",
    "assistentes de IA",
    "IA na indústria",
    "diagnóstico de produtividade",
    "ROI de inteligência artificial",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: brand.locale,
    url: "/",
    siteName: brand.name,
    title,
    description: brand.tagline,
  },
  twitter: { card: "summary_large_image", title, description: brand.tagline },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0b",
  viewportFit: "cover",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  name: brand.name,
  description: brand.description,
  slogan: brand.tagline,
  url: brand.url,
  email: contact.email,
  areaServed: "BR",
  knowsAbout: [
    "Inteligência artificial aplicada",
    "Produtividade empresarial",
    "Automação de processos",
    "Gestão industrial",
    "Lean Manufacturing",
    "Eficiência operacional",
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:bg-bone focus:px-4 focus:py-3 focus:text-ink"
        >
          Pular para o conteúdo
        </a>
        {children}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </body>
    </html>
  );
}
