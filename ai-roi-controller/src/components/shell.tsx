"use client";
import {
  Award, Building2, Cloud, Database, FileBarChart2, HardDrive, LayoutDashboard, Loader2, LogOut, Menu, Moon, RefreshCw,
  Search, Settings, Sparkles, Sun, TriangleAlert, Wallet, Workflow, type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { removeDemo } from "@/data/demo";
import { DEMO_DISMISSED_KEY, StoreProvider, useStore } from "@/data/store";
import { FiltersProvider } from "./filters";
import { Button, Confirm, cx, Dialog, Skeleton, ToastProvider, useToast } from "./ui";

export const NAV: { href: string; label: string; icon: LucideIcon; hint: string }[] = [
  { href: "/", label: "Painel", icon: LayoutDashboard, hint: "ROI consolidado e indicadores" },
  { href: "/maturidade", label: "Maturidade", icon: Award, hint: "Índice de maturidade e benchmark entre áreas" },
  { href: "/departamentos", label: "Departamentos", icon: Building2, hint: "Estrutura e resultado por área" },
  { href: "/ferramentas", label: "Ferramentas", icon: Sparkles, hint: "Ferramentas, contratos, rateio e uso" },
  { href: "/processos", label: "Processos", icon: Workflow, hint: "Processos com IA e medições" },
  { href: "/financeiro", label: "Financeiro", icon: Wallet, hint: "Custos e benefícios" },
  { href: "/dados", label: "Dados", icon: Database, hint: "Importar, exportar e histórico" },
  { href: "/relatorio", label: "Relatório", icon: FileBarChart2, hint: "Relatório executivo em PDF e Excel" },
  { href: "/configuracoes", label: "Configurações", icon: Settings, hint: "Empresa, unidades, conexão e auditoria" },
];
const isActive = (path: string, href: string) => (href === "/" ? path === "/" : path.startsWith(href));

function useTheme() {
  const theme = useSyncExternalStore(
    (notify) => {
      const o = new MutationObserver(notify);
      o.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
      return () => o.disconnect();
    },
    () => (document.documentElement.dataset.theme === "dark" ? "dark" : "light"),
    () => "light" as const,
  );
  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("roi-theme", next); } catch { /* tema vale só nesta sessão */ }
  };
  return { theme, toggle };
}

function Palette({ onClose, toggleTheme }: { onClose: () => void; toggleTheme: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [index, setIndex] = useState(0);
  const items = useMemo(() => {
    const all = [
      ...NAV.map((n) => ({ label: `Ir para ${n.label}`, hint: n.hint, icon: n.icon, run: () => router.push(n.href) })),
      { label: "Registrar medição de produtividade", hint: "Processos", icon: Workflow, run: () => router.push("/processos?aba=medicoes") },
      { label: "Lançar custo de IA", hint: "Financeiro", icon: Wallet, run: () => router.push("/financeiro?aba=custos") },
      { label: "Lançar benefício financeiro", hint: "Financeiro", icon: Wallet, run: () => router.push("/financeiro?aba=beneficios") },
      { label: "Importar planilha", hint: "Dados", icon: Database, run: () => router.push("/dados") },
      { label: "Alternar tema claro/escuro", hint: "Aparência", icon: Moon, run: toggleTheme },
    ];
    const n = q.trim().toLowerCase();
    return n ? all.filter((i) => (i.label + i.hint).toLowerCase().includes(n)) : all;
  }, [q, router, toggleTheme]);
  const run = (i: number) => { const it = items[i]; if (it) { onClose(); it.run(); } };
  return (
    <Dialog open onClose={onClose} title="Buscar ou executar">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" aria-hidden />
        <input className="input !pl-9" placeholder="Digite um comando ou uma tela…" aria-label="Comando" value={q}
          onChange={(e) => { setQ(e.target.value); setIndex(0); }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setIndex((i) => Math.min(items.length - 1, i + 1)); }
            if (e.key === "ArrowUp") { e.preventDefault(); setIndex((i) => Math.max(0, i - 1)); }
            if (e.key === "Enter") { e.preventDefault(); run(index); }
          }} />
      </div>
      <ul className="mt-3 flex flex-col gap-0.5" role="listbox" aria-label="Comandos">
        {items.length === 0 ? <li className="text-ink-3 text-sm px-2 py-6 text-center">Nenhum comando encontrado.</li> : null}
        {items.map((it, i) => (
          <li key={it.label} role="option" aria-selected={i === index}>
            <button type="button" tabIndex={-1} onMouseEnter={() => setIndex(i)} onClick={() => run(i)}
              className={cx("w-full flex items-center gap-3 px-2.5 h-10 rounded-[10px] text-left text-[14.5px]", i === index && "bg-[var(--accent-soft)] text-[var(--accent-ink)]")}>
              <it.icon size={16} className="flex-none" /><span className="flex-1 truncate">{it.label}</span><span className="text-ink-3 text-xs">{it.hint}</span>
            </button>
          </li>
        ))}
      </ul>
    </Dialog>
  );
}

function Frame({ children }: { children: ReactNode }) {
  const path = usePathname();
  const store = useStore();
  const toast = useToast();
  const { theme, toggle } = useTheme();
  const [palette, setPalette] = useState(false);
  const [more, setMore] = useState(false);
  const [dropDemo, setDropDemo] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPalette((v) => !v); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const org = store.db.org[0];
  const sheets = store.mode === "sheets";
  const refresh = async () => {
    setRefreshing(true);
    await store.reload();
    setRefreshing(false);
    toast(store.loadError ? "error" : "ok", store.loadError ?? (sheets ? "Dados recarregados do Google Planilhas." : "Dados recarregados."));
  };
  const mobileNav = [NAV[0], NAV[1], NAV[4], NAV[5]];

  return (
    <div className="relative z-[1] min-h-dvh lg:grid lg:grid-cols-[auto_minmax(0,1fr)] lg:gap-5 lg:p-5 print-root">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:z-[90] focus:top-3 focus:left-3 btn btn-primary">Pular para o conteúdo</a>

      <aside className="glass no-print hidden lg:flex flex-col gap-1 p-3 w-[232px] sticky top-5 h-[calc(100dvh-40px)]" aria-label="Navegação principal">
        <Link href="/" className="flex items-center gap-2.5 px-2 h-12 mb-2">
          <span className="brand-mark" aria-hidden />
          <span className="font-semibold tracking-tight text-[15.5px]">AI ROI <span className="text-ink-3 font-medium">Controller</span></span>
        </Link>
        <nav className="flex flex-col gap-0.5">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="nav-item" aria-current={isActive(path, n.href) ? "page" : undefined}>
              <n.icon size={18} strokeWidth={1.8} className="flex-none" />{n.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto rounded-[14px] bg-[var(--sunken)] border border-line p-3 text-[12.5px] text-ink-2">
          <div className="flex items-center gap-1.5 font-semibold text-ink mb-1">
            {sheets ? <Cloud size={14} /> : <HardDrive size={14} />}{sheets ? "Google Planilhas" : "Modo local"}
          </div>
          {sheets ? "Os dados são lidos e gravados na planilha conectada." : "Os dados ficam só neste navegador. Conecte o Google Planilhas em Configurações."}
        </div>
      </aside>

      <div className="min-w-0 flex flex-col gap-4 lg:gap-5 px-4 pt-3 pb-28 lg:p-0">
        <header className="glass no-print sticky top-3 lg:top-5 z-40 flex items-center gap-2 px-3 h-14">
          <span className="brand-mark lg:hidden" aria-hidden />
          <div className="min-w-0 flex-1">
            <div className="font-semibold truncate leading-tight">{org?.name ?? "AI ROI Controller"}</div>
            <div className="text-xs text-ink-3 truncate flex items-center gap-1">
              {store.syncing ? <><Loader2 size={11} className="spin" />Gravando…</> : sheets ? "Sincronizado com Google Planilhas" : "Dados neste navegador"}
            </div>
          </div>
          <button type="button" onClick={() => setPalette(true)} aria-label="Buscar ou executar um comando"
            className="hidden sm:flex items-center gap-2 h-9 px-3 rounded-[11px] bg-[var(--sunken)] border border-line text-ink-3 text-sm hover:text-ink w-[220px]">
            <Search size={15} /><span className="flex-1 text-left truncate">Buscar…</span><kbd className="text-[11px] border border-line rounded-md px-1.5 py-0.5 bg-solid">Ctrl K</kbd>
          </button>
          <Button variant="plain" icon aria-label="Buscar" className="sm:hidden" onClick={() => setPalette(true)}><Search size={18} /></Button>
          <Button variant="plain" icon aria-label="Recarregar dados" title="Recarregar dados" onClick={refresh}><RefreshCw size={17} className={cx(refreshing && "spin")} /></Button>
          <Button variant="plain" icon aria-label={theme === "dark" ? "Usar tema claro" : "Usar tema escuro"} title="Alternar tema" onClick={toggle}>
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </Button>
          {store.protectedAccess ? (
            <Button variant="plain" icon aria-label="Sair" title="Sair" onClick={async () => { await fetch("/api/logout", { method: "POST" }); window.location.assign("/entrar"); }}><LogOut size={17} /></Button>
          ) : null}
        </header>

        {store.hasDemo ? (
          <div className="no-print flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[14px] px-4 py-2.5 bg-[var(--warn-soft)] text-[var(--warn)] border border-[color-mix(in_srgb,var(--warn)_25%,transparent)] text-[14px]" role="note">
            <TriangleAlert size={17} className="flex-none" />
            <span className="flex-1 basis-60 font-medium">Você está vendo dados fictícios de demonstração. Nenhum número aqui é resultado real.</span>
            <Button size="sm" onClick={() => setDropDemo(true)}>Remover dados de exemplo</Button>
          </div>
        ) : null}

        <main id="conteudo" tabIndex={-1} className="flex flex-col gap-4 lg:gap-5 outline-none">
          {!store.ready ? (
            <div className="flex flex-col gap-4" aria-busy="true" aria-label="Carregando dados">
              <Skeleton className="h-10 w-64" /><Skeleton className="h-44" />
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4"><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /></div>
            </div>
          ) : store.loadError ? (
            <div className="solid p-6 flex flex-col gap-3 items-start">
              <div className="flex items-center gap-2 text-neg font-semibold"><TriangleAlert size={18} />Não foi possível carregar os dados</div>
              <p className="text-ink-2">{store.loadError}</p>
              <Button variant="primary" onClick={refresh} loading={refreshing}>Tentar de novo</Button>
            </div>
          ) : <FiltersProvider>{children}</FiltersProvider>}
        </main>
      </div>

      <nav className="glass glass-strong no-print lg:hidden fixed z-50 left-3 right-3 bottom-[calc(10px+env(safe-area-inset-bottom,0px))] grid grid-cols-5 p-1.5 rounded-[26px]" aria-label="Navegação">
        {mobileNav.map((n) => (
          <Link key={n.href} href={n.href} aria-current={isActive(path, n.href) ? "page" : undefined}
            className={cx("flex flex-col items-center justify-center gap-0.5 h-[52px] rounded-[18px] text-[10.5px] tracking-tight font-medium text-ink-2 min-w-0", isActive(path, n.href) && "tab-active")}>
            <n.icon size={20} strokeWidth={1.8} />{n.label}
          </Link>
        ))}
        <button type="button" onClick={() => setMore(true)} className={cx("flex flex-col items-center justify-center gap-0.5 h-[52px] rounded-[18px] text-[10.5px] tracking-tight font-medium text-ink-2 min-w-0", !mobileNav.some((n) => isActive(path, n.href)) && "tab-active")}>
          <Menu size={20} strokeWidth={1.8} />Mais
        </button>
      </nav>

      <Dialog open={more} onClose={() => setMore(false)} title="Navegação">
        <div className="flex flex-col gap-0.5">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} onClick={() => setMore(false)} className="nav-item !h-12" aria-current={isActive(path, n.href) ? "page" : undefined}>
              <n.icon size={19} strokeWidth={1.8} /><span className="flex-1">{n.label}</span><span className="text-xs text-ink-3 font-normal truncate max-w-[55%]">{n.hint}</span>
            </Link>
          ))}
        </div>
      </Dialog>
      {palette ? <Palette onClose={() => setPalette(false)} toggleTheme={toggle} /> : null}
      <Confirm open={dropDemo} onClose={() => setDropDemo(false)} title="Remover dados de exemplo?" confirmLabel="Remover"
        onConfirm={async () => {
          const r = await store.commit(removeDemo(store.db));
          if (r.ok) { try { localStorage.setItem(DEMO_DISMISSED_KEY, "1"); } catch { /* segue sem lembrar */ } }
          toast(r.ok ? "ok" : "error", r.ok ? "Dados de exemplo removidos. Seus cadastros reais foram mantidos." : r.message);
          setDropDemo(false);
        }}>
        Todos os registros marcados como exemplo fictício serão apagados. O que você cadastrou ou importou permanece.
      </Confirm>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <StoreProvider>
      <ToastProvider>
        <Frame>{children}</Frame>
      </ToastProvider>
    </StoreProvider>
  );
}
