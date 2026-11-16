import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "AI ROI Controller", template: "%s · AI ROI Controller" },
  description: "Meça, consolide e demonstre o retorno dos investimentos em inteligência artificial.",
};
export const viewport: Viewport = {
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#edf1f8" }, { media: "(prefers-color-scheme: dark)", color: "#050912" }],
  viewportFit: "cover",
};

// Aplica o tema antes da primeira pintura, sem flash.
const themeScript = `try{var t=localStorage.getItem("roi-theme");if(t!=="light"&&t!=="dark")t="dark";document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <div className="backdrop" aria-hidden><i /><i /><i /></div>
        {children}
      </body>
    </html>
  );
}
