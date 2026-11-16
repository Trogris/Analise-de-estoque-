# AI ROI Controller

Mede, consolida e demonstra o retorno financeiro e operacional dos investimentos em
inteligência artificial, por departamento:

```
Empresa → Departamento → Processo → Aplicação de IA → Resultado operacional e financeiro
```

Next.js (App Router) · React · TypeScript · Tailwind CSS · Recharts · Google Planilhas como banco de dados.

## Rodar

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # motor de cálculo, importação e camada Google Planilhas
npm run build && npm start
```

Sem configuração nenhuma a aplicação abre em **modo local**: tudo funciona e os dados
ficam no navegador. É o jeito mais rápido de experimentar. Para dados compartilhados,
conecte o Google Planilhas.

## Conectar o Google Planilhas

1. Crie uma planilha vazia e copie o ID da URL (entre `/d/` e `/edit`).
2. No Google Cloud: crie um projeto, ative a **Google Sheets API**, crie uma **conta de
   serviço** e gere uma chave JSON.
3. Compartilhe a planilha com o e-mail da conta de serviço, como **Editor**.
4. Copie `.env.example` para `.env.local` e preencha `GOOGLE_SHEETS_ID`,
   `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY` e `APP_PASSWORD`.
5. Reinicie. As abas e os cabeçalhos são criados sozinhos no primeiro acesso.

Cada tabela é uma aba (`departamentos`, `contratos`, `processos`, `medicoes`, `custos`,
`beneficios`…), com cabeçalho na linha 1 e um registro por linha. As colunas são
localizadas pelo nome, então reordenar ou acrescentar colunas próprias não quebra nada.
Ao editar à mão, preserve o cabeçalho e a coluna `id`, e formate colunas de mês
(`2026-03`) como texto simples.

Em produção com planilha conectada, `APP_PASSWORD` é obrigatória: sem ela a API se
recusa a servir dados.

## O que está implementado

| Módulo | Situação |
|---|---|
| Painel executivo com filtros (período, departamento, ferramenta, processo) | Pronto |
| Empresa, unidades, centros de custo, departamentos | Pronto |
| Ferramentas, contratos, rateio entre departamentos, registros de uso | Pronto |
| Processos com IA e medições mensais (antes × com IA) | Pronto |
| Custos por categoria e benefícios com fluxo de validação e evidência | Pronto |
| Motor de cálculo de ROI com estados de "dados insuficientes" | Pronto, com testes |
| Origem de cada indicador (fórmula + lançamentos que o compõem) | Pronto |
| Importação CSV/Excel com validação, duplicidades, histórico e desfazer | Pronto |
| Relatório executivo: Excel e PDF (pelo diálogo de impressão do navegador) | Pronto |
| Recomendações baseadas nos dados | Pronto |
| Índice de maturidade em IA por departamento e benchmark interno | Pronto, com testes |
| Modo apresentação: a história do ROI em cenas de tela cheia | Pronto |
| Auditoria de ações | Pronto |
| Tema claro e escuro, responsivo, navegação por teclado | Pronto |
| Google Planilhas como banco | Pronto; **não testado contra a API real** (ver abaixo) |
| Usuários individuais, perfis e multiempresa (Supabase Auth + RLS) | Não implementado |
| Integrações com OpenAI, Anthropic, Microsoft e Google | Não implementado |

## Regras que o sistema garante

- Só **benefício validado** entra no ROI. Benefício importado nunca entra validado.
- **Capacidade liberada** (horas × custo da hora) é exibida à parte e nunca somada ao
  benefício financeiro.
- Sem dados suficientes o indicador mostra **"Dados insuficientes"** e diz o que falta.
  Investimento zero nunca vira divisão por zero.
- Nada é estimado: sem registro de uso não há taxa de adoção; sem o percentual de custo
  do processo não há custo por entrega daquele processo.
- Dados de exemplo são marcados como fictícios em todas as telas e no relatório, e saem
  com um clique.
- Todo registro guarda a origem (manual, importado, integração, exemplo).

## Limites conhecidos desta fase

- **Google Planilhas real:** a autenticação (JWT da conta de serviço) e o repositório
  são testados com uma planilha simulada em memória. A primeira conexão com uma
  planilha de verdade ainda precisa ser feita com suas credenciais.
- **Sem transações nem bloqueio:** em gravações simultâneas vence a última. Adequado
  para uma equipe pequena; não para muitos usuários ao mesmo tempo.
- **Uma senha para a equipe**, sem usuários individuais. Quem lança um benefício também
  consegue validá-lo; a separação de funções depende de perfis, que vêm com o Supabase.
  A auditoria registra o nome informado em Configurações → Empresa.
- **Uma empresa por planilha.**
- O custo mensal de um contrato vale para todos os meses entre a contratação e o
  encerramento. Para mudar o preço sem alterar o passado, encerre o contrato e crie outro.

## Arquitetura

```
src/domain/     Regras de negócio puras (motor de cálculo, recomendações, períodos)
src/data/       Esquema das tabelas, validação, importação, estado e gateways
src/server/     Google Planilhas (cliente + repositório) e sessão
src/app/        Telas e rotas de API
src/components/ Interface: casca, cadastros genéricos, gráficos, indicadores
```

- `src/data/schema.ts` é a definição única de cada tabela. Dela saem as colunas da
  planilha, a validação, os formulários, as listas e a importação.
- `src/data/store.tsx` isola a persistência atrás de um *gateway* com duas operações
  (`load` e `apply`). Trocar Google Planilhas por Postgres/Supabase é implementar outro
  gateway; telas e motor de cálculo não mudam.
- O plano completo, incluindo o modelo PostgreSQL com RLS para a fase multiempresa,
  está em [`docs/FASE-1-ARQUITETURA.md`](docs/FASE-1-ARQUITETURA.md).

## Publicar na Vercel

Importe o repositório, defina **Root Directory** como `ai-roi-controller` e cadastre as
variáveis do `.env.example`.
