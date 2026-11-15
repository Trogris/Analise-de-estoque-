"use client";
import { Cloud, HardDrive, Pencil, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Crud, EntityForm } from "@/components/crud";
import { Button, Empty, PageHeader, Pill, Segmented, useQueryParam } from "@/components/ui";
import { TABLES, type Row } from "@/data/schema";
import { useStore } from "@/data/store";
import { TABLE_KEYS, type TableKey } from "@/domain/types";
import { fmt } from "@/lib/format";

const ACTION: Record<string, string> = { create: "Criação", update: "Alteração", delete: "Exclusão", validate: "Validação", reject: "Recusa", import: "Importação", demo: "Exemplo" };

export default function Configuracoes() {
  const store = useStore();
  const { db } = store;
  const [tab, setTab] = useQueryParam("aba", "empresa");
  const [editOrg, setEditOrg] = useState(false);
  const org = db.org[0] as unknown as Row | undefined;
  const sheets = store.mode === "sheets";
  const code = (s: string) => <code className="px-1.5 py-0.5 rounded-md bg-[var(--sunken)] border border-line text-[12.5px]">{s}</code>;
  return (
    <>
      <PageHeader title="Configurações" subtitle="Empresa, estrutura, conexão com o Google Planilhas e registro de ações." />
      <Segmented label="Seção" value={tab} onChange={setTab} options={[["empresa", "Empresa"], ["unidades", "Unidades"], ["centros", "Centros de custo"], ["conexao", "Conexão"], ["auditoria", "Auditoria"]]} />
      {tab === "empresa" ? (
        <section className="solid p-5">
          {org ? (
            <div className="flex flex-wrap items-start gap-4">
              <dl className="grid sm:grid-cols-3 gap-x-8 gap-y-3 flex-1 basis-80">
                <div><dt className="text-[12.5px] text-ink-3">Empresa</dt><dd className="font-semibold text-[17px]">{String(org.name)}</dd></div>
                <div><dt className="text-[12.5px] text-ink-3">Moeda</dt><dd className="font-medium">Real (R$)</dd></div>
                <div><dt className="text-[12.5px] text-ink-3">Operador</dt><dd className="font-medium">{org.operator ? String(org.operator) : <span className="text-[var(--warn)]">Não informado</span>}</dd></div>
              </dl>
              <Button onClick={() => setEditOrg(true)}><Pencil size={15} />Editar</Button>
            </div>
          ) : (
            <Empty title="Identifique a empresa" action={<Button variant="primary" onClick={() => setEditOrg(true)}>Cadastrar empresa</Button>}>
              O nome aparece no cabeçalho e nos relatórios. Seu nome identifica quem lança e valida informações.
            </Empty>
          )}
          <EntityForm table="org" open={editOrg} onClose={() => setEditOrg(false)} initial={org ?? null} defaults={{ currency: "BRL" }} title="Dados da empresa" />
        </section>
      ) : tab === "unidades" ? (
        <Crud table="units" defaults={{ kind: "matriz" }} emptyHint="Matriz e filiais. Cada departamento pode pertencer a uma unidade." />
      ) : tab === "centros" ? (
        <Crud table="costCenters" emptyHint="Centros de custo usados para classificar departamentos e contratos." />
      ) : tab === "conexao" ? (
        <section className="solid p-5 flex flex-col gap-4 max-w-[860px]">
          <div className="flex items-center gap-3">
            <span className="grid place-items-center w-10 h-10 rounded-[12px] bg-[var(--accent-soft)] text-[var(--accent-ink)]">{sheets ? <Cloud size={20} /> : <HardDrive size={20} />}</span>
            <div className="flex-1"><div className="font-semibold">{sheets ? "Conectado ao Google Planilhas" : "Modo local"}</div>
              <div className="text-ink-2 text-[13.5px]">{sheets ? "Cada cadastro é gravado na planilha, uma aba por tabela." : "Os dados ficam apenas neste navegador, neste computador."}</div></div>
            <Pill tone={sheets ? "pos" : "warn"}>{sheets ? "Ativo" : "Sem servidor de dados"}</Pill>
          </div>
          {sheets ? (
            <ul className="text-[14px] text-ink-2 flex flex-col gap-1.5">
              <li>Conta de serviço: {code(store.serviceAccount ?? "—")}</li>
              <li className="flex items-center gap-1.5"><ShieldCheck size={15} className={store.protectedAccess ? "text-pos" : "text-[var(--warn)]"} />{store.protectedAccess ? "Acesso protegido por senha." : "Sem senha de acesso. Defina APP_PASSWORD antes de publicar."}</li>
              <li>Abas: {TABLE_KEYS.map((k) => TABLES[k].sheet).join(", ")}.</li>
              <li>Você pode consultar a planilha livremente. Ao editar à mão, mantenha a linha de cabeçalho e a coluna {code("id")}.</li>
            </ul>
          ) : (
            <ol className="text-[14px] text-ink-2 list-decimal pl-5 flex flex-col gap-2">
              <li>Crie uma planilha vazia no Google Planilhas e copie o ID da URL (o trecho entre {code("/d/")} e {code("/edit")}).</li>
              <li>No Google Cloud, crie uma conta de serviço, ative a API do Google Sheets e gere uma chave JSON.</li>
              <li>Compartilhe a planilha com o e-mail da conta de serviço, como Editor.</li>
              <li>No servidor (arquivo {code(".env.local")} ou variáveis da Vercel), defina {code("GOOGLE_SHEETS_ID")}, {code("GOOGLE_SERVICE_ACCOUNT_EMAIL")}, {code("GOOGLE_PRIVATE_KEY")} e {code("APP_PASSWORD")}.</li>
              <li>Reinicie a aplicação. As abas e os cabeçalhos são criados automaticamente no primeiro acesso.</li>
            </ol>
          )}
          <p className="text-[13px] text-ink-3">As credenciais ficam só no servidor e nunca são enviadas ao navegador. Antes de migrar do modo local, exporte seus dados em Dados → Exportar.</p>
        </section>
      ) : (
        <section className="solid">
          {db.audit.length === 0 ? <Empty title="Nenhuma ação registrada">Criações, alterações, exclusões, validações e importações aparecem aqui.</Empty> : (
            <div className="table-wrap">
              <table className="table"><thead><tr><th>Quando</th><th>Quem</th><th>Ação</th><th>O quê</th></tr></thead>
                <tbody>{[...db.audit].reverse().slice(0, 300).map((a) => (
                  <tr key={a.id}><td className="whitespace-nowrap num">{fmt.dateTime(a.createdAt)}</td><td>{a.actor}</td>
                    <td><Pill tone={a.action === "delete" || a.action === "reject" ? "neg" : a.action === "validate" ? "pos" : "mute"}>{ACTION[a.action] ?? a.action}</Pill></td>
                    <td><span className="text-ink-3">{TABLES[a.table as TableKey]?.plural ?? a.table} · </span>{a.summary}</td></tr>
                ))}</tbody></table>
            </div>
          )}
        </section>
      )}
    </>
  );
}
