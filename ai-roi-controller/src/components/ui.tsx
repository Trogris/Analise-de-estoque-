"use client";
import { AlertTriangle, Check, Info, Loader2, X } from "lucide-react";
import {
  createContext, useCallback, useContext, useEffect, useId, useRef, useState,
  type ButtonHTMLAttributes, type ReactNode,
} from "react";

export const cx = (...xs: (string | false | null | undefined)[]) => xs.filter(Boolean).join(" ");

/* ---------- Botão ---------- */
type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "plain" | "danger"; size?: "sm" | "md"; icon?: boolean; loading?: boolean;
};
export function Button({ variant = "ghost", size = "md", icon, loading, className, children, disabled, ...rest }: BtnProps) {
  return (
    <button type="button" {...rest} disabled={disabled || loading}
      className={cx("btn", `btn-${variant}`, size === "sm" && "btn-sm", icon && "btn-icon", className)}>
      {loading ? <Loader2 size={15} className="spin" aria-hidden /> : null}
      {children}
    </button>
  );
}

/* ---------- Pílula de estado (sempre com texto; cor nunca é o único sinal) ---------- */
export type Tone = "pos" | "warn" | "neg" | "info" | "mute";
export function Pill({ tone = "mute", children, title }: { tone?: Tone; children: ReactNode; title?: string }) {
  return <span title={title} className={cx("pill", tone !== "mute" && `pill-${tone}`)}>{children}</span>;
}

/* ---------- Controle segmentado ---------- */
export function Segmented<T extends string>({ value, onChange, options, label }: {
  value: T; onChange: (v: T) => void; options: [T, string][]; label: string;
}) {
  return (
    <div className="seg" role="tablist" aria-label={label}>
      {options.map(([v, l]) => (
        <button key={v} type="button" role="tab" aria-selected={v === value} onClick={() => onChange(v)}>{l}</button>
      ))}
    </div>
  );
}

/* ---------- Estado vazio ---------- */
export function Empty({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center text-center gap-3 px-6 py-12">
      {icon ? <div className="grid place-items-center w-12 h-12 rounded-2xl bg-[var(--accent-soft)] text-[var(--accent-ink)]">{icon}</div> : null}
      <h3 className="text-[17px] font-semibold">{title}</h3>
      {children ? <p className="text-ink-2 max-w-[46ch] text-[14.5px]">{children}</p> : null}
      {action}
    </div>
  );
}

/* ---------- Modal e painel lateral ---------- */
function useOverlay(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const el = ref.current;
    const focusables = () => [...(el?.querySelectorAll<HTMLElement>('button:not(:disabled), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])') ?? [])];
    (el?.querySelector<HTMLElement>("[data-autofocus], input, select, textarea") ?? focusables()[0])?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); onClose(); }
      if (e.key === "Tab") {
        const f = focusables();
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = overflow; previous?.focus?.(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  return ref;
}

export function Dialog({ open, onClose, title, subtitle, children, footer, wide }: {
  open: boolean; onClose: () => void; title: string; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode; wide?: boolean;
}) {
  const ref = useOverlay(open, onClose);
  const id = useId();
  if (!open) return null;
  return (
    <div className="scrim grid place-items-end sm:place-items-center p-0 sm:p-6" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={id}
        className={cx("dialog glass glass-strong float w-full flex flex-col max-h-[92dvh] rounded-b-none sm:rounded-b-[20px]", wide ? "sm:max-w-3xl" : "sm:max-w-xl")}>
        <header className="flex items-start gap-3 px-5 pt-5 pb-3">
          <div className="min-w-0 flex-1">
            <h2 id={id} className="text-[18px] font-semibold">{title}</h2>
            {subtitle ? <p className="text-ink-2 text-[13.5px] mt-0.5">{subtitle}</p> : null}
          </div>
          <Button variant="plain" size="sm" icon aria-label="Fechar" onClick={onClose}><X size={17} /></Button>
        </header>
        <div className="px-5 pb-4 overflow-y-auto min-h-0">{children}</div>
        {footer ? <footer className="flex flex-wrap justify-end gap-2 px-5 py-3.5 border-t border-line">{footer}</footer> : null}
      </div>
    </div>
  );
}

export function Drawer({ open, onClose, title, subtitle, children }: {
  open: boolean; onClose: () => void; title: string; subtitle?: ReactNode; children: ReactNode;
}) {
  const ref = useOverlay(open, onClose);
  const id = useId();
  if (!open) return null;
  return (
    <div className="scrim flex justify-end p-0 sm:p-3" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={id}
        className="drawer glass glass-strong float w-full sm:max-w-[560px] h-full flex flex-col rounded-none sm:rounded-[20px]">
        <header className="flex items-start gap-3 px-5 pt-5 pb-3 border-b border-line">
          <div className="min-w-0 flex-1">
            <h2 id={id} className="text-[18px] font-semibold">{title}</h2>
            {subtitle ? <div className="text-ink-2 text-[13.5px] mt-0.5">{subtitle}</div> : null}
          </div>
          <Button variant="plain" size="sm" icon aria-label="Fechar" data-autofocus onClick={onClose}><X size={17} /></Button>
        </header>
        <div className="p-5 overflow-y-auto min-h-0 flex-1">{children}</div>
      </div>
    </div>
  );
}

/* ---------- Confirmação ---------- */
export function Confirm({ open, onClose, onConfirm, title, children, confirmLabel = "Excluir", danger = true }: {
  open: boolean; onClose: () => void; onConfirm: () => Promise<void> | void; title: string; children: ReactNode; confirmLabel?: string; danger?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={open} onClose={onClose} title={title}
      footer={<>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant={danger ? "danger" : "primary"} loading={busy}
          onClick={async () => { setBusy(true); try { await onConfirm(); } finally { setBusy(false); } }}>{confirmLabel}</Button>
      </>}>
      <div className="text-ink-2 text-[14.5px]">{children}</div>
    </Dialog>
  );
}

/* ---------- Avisos (toasts) ---------- */
type ToastKind = "ok" | "error" | "info";
interface ToastItem { id: number; kind: ToastKind; text: string }
const ToastCtx = createContext<(kind: ToastKind, text: string) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = useCallback((kind: ToastKind, text: string) => {
    const id = Date.now() + Math.random();
    setItems((xs) => [...xs.slice(-3), { id, kind, text }]);
    setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), kind === "error" ? 8000 : 4000);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="no-print fixed z-[80] bottom-[calc(84px+env(safe-area-inset-bottom,0px))] lg:bottom-6 inset-x-4 sm:inset-x-auto sm:right-6 flex flex-col gap-2 sm:w-[380px]" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className="toast glass glass-strong float flex items-start gap-2.5 px-3.5 py-3 text-[14px] rounded-[14px]">
            <span className={cx("mt-0.5 flex-none", t.kind === "ok" && "text-pos", t.kind === "error" && "text-neg", t.kind === "info" && "text-[var(--accent-ink)]")}>
              {t.kind === "ok" ? <Check size={17} /> : t.kind === "error" ? <AlertTriangle size={17} /> : <Info size={17} />}
            </span>
            <span className="flex-1 min-w-0 break-words">{t.text}</span>
            <button aria-label="Dispensar aviso" className="text-ink-3 hover:text-ink flex-none" onClick={() => setItems((xs) => xs.filter((x) => x.id !== t.id))}><X size={15} /></button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/* ---------- Cabeçalho de página ---------- */
export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
      <div className="min-w-0 flex-1 basis-64">
        <h1 className="text-[26px] sm:text-[30px] font-semibold leading-tight">{title}</h1>
        {subtitle ? <p className="text-ink-2 mt-1 max-w-[70ch]">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2 no-print">{actions}</div> : null}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("skeleton", className)} aria-hidden />;
}

/** Lê e grava um parâmetro da URL sem depender de dados de requisição no servidor. */
export function useQueryParam(key: string, fallback: string): [string, (v: string) => void] {
  // As telas só são montadas no navegador, depois da carga dos dados; ler a URL aqui é seguro.
  const [value, setValue] = useState(() => (typeof window === "undefined" ? fallback : new URLSearchParams(window.location.search).get(key) || fallback));
  const set = useCallback((v: string) => {
    setValue(v);
    const url = new URL(window.location.href);
    if (v === fallback) url.searchParams.delete(key); else url.searchParams.set(key, v);
    window.history.replaceState(null, "", url);
  }, [key, fallback]);
  return [value, set];
}
