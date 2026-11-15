"use client";
import { Lock } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui";

export default function Entrar() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password }) });
      if (res.ok) { window.location.assign("/"); return; }
      setError(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Não foi possível entrar.");
    } catch { setError("Sem conexão com o servidor. Verifique a rede e tente de novo."); }
    setBusy(false);
  }
  return (
    <main className="relative z-[1] min-h-dvh grid place-items-center p-4">
      <form onSubmit={submit} className="glass float w-full max-w-[400px] p-7 flex flex-col gap-4">
        <div className="flex items-center gap-3"><span className="brand-mark" aria-hidden /><span className="font-semibold text-[17px] tracking-tight">AI ROI <span className="text-ink-3 font-medium">Controller</span></span></div>
        <div><h1 className="text-[24px] font-semibold">Entrar</h1><p className="text-ink-2 mt-1">Informe a senha de acesso da sua equipe.</p></div>
        <div>
          <label htmlFor="senha" className="label">Senha</label>
          <div className="relative">
            <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" aria-hidden />
            <input id="senha" type="password" autoComplete="current-password" autoFocus className="input !pl-9" value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={!!error} aria-describedby="senha-erro" />
          </div>
          <p id="senha-erro" className="error" role="alert">{error}</p>
        </div>
        <Button variant="primary" type="submit" loading={busy} disabled={!password}>Entrar</Button>
      </form>
    </main>
  );
}
