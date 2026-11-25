# CODEX — Custos, testes, limitações e alternativas

## 1. Estimativa de custos

**Configuração escolhida: Claude Pro + "Ask Claude" → custo adicional US$ 0.** O CODEX consome
cerca de 1 mensagem por dia e 1 por semana do seu limite de uso do Pro. Os valores abaixo valem
apenas se você passar o A0 para a API.

Preços da API (Claude Opus 5.5): **US$ 4 por milhão de tokens de entrada, US$ 20 por milhão de
saída**. 1 token ≈ ¾ de palavra em português.

| Uso | Entrada (tokens) | Saída (tokens, incl. raciocínio) | Custo por uso | Por mês |
|---|---|---|---|---|
| A1 diário (1º trimestre) | ~4.000 | ~4.000 | ~US$ 0,10 | ~US$ 3,00 |
| A1 diário (após 1 ano, memória cheia) | ~25.000 | ~4.000 | ~US$ 0,18 | ~US$ 5,40 → use o corte de memória (§3) e volte a ~US$ 3 |
| A3 semanal | ~20.000 | ~7.000 | ~US$ 0,22 | ~US$ 0,95 |
| A4 consulta | ~6.000 | ~2.000 | ~US$ 0,06 | depende do uso |
| A2, A5 | — | — | **US$ 0** (sem IA) | US$ 0 |
| **Total típico** | | | | **US$ 4–5/mês** |

Alternativas de custo (a escolha é sua; edite só o campo `model` do A0):

| Motor | Custo mensal aproximado | Observação |
|---|---|---|
| `claude-opus-5-5` (padrão) | US$ 4–5 | melhor rigor de fontes e profundidade |
| `claude-sonnet-5-5` (US$ 2 / US$ 10) | US$ 2–2,50 | ótimo equilíbrio |
| `claude-haiku-5-5` (US$ 0,10 / US$ 0,50) | < US$ 0,20 | listas mais rasas; menos confiável em fontes |
| Opção B: ação "Ask Claude" do app | US$ 0 extra (usa sua assinatura Claude, conta no limite de uso) | ver §4 |
| Opção C: "Usar Modelo" da Apple | US$ 0 | iOS 26+, iPhone com Apple Intelligence; qualidade menor |

Ferramentas Apple: **US$ 0** (iCloud gratuito de 5 GB basta; a memória ocupa < 1 MB/ano).

---

## 2. Roteiro de testes

Faça na ordem. Cada teste tem o resultado esperado.

| # | Teste | Como | Esperado |
|---|---|---|---|
| T1 | Chave e prompt (opcional, Mac/PC) | `ANTHROPIC_API_KEY=sk-ant-… bash scripts/teste_api.sh` | Imprime investigações + linha `D …` após `@@@MEMORIA@@@` |
| T2 | A0 isolado | Atalho de teste (ver fim do `ATALHOS.md`) | Uma frase de saudação. Se aparecer JSON com `error`, leia `message` (chave errada, sem crédito, campo mal digitado) |
| T3 | A1 manual | Toque em A1 | Nota em *01* com título "Investigações · …", 5 seções, dicas no fim; em Arquivos → iCloud Drive → Atalhos → CODEX, `memoria.md` com 1 linha `D` |
| T4 | Antirrepetição | Rode A1 de novo | Dia nº 2, áreas diferentes das do T3. Depois **apague** a nota de teste e a 2ª linha do `memoria.md` (ou mantenha) |
| T5 | Curiosidade por voz | "E aí Siri, Curiosidade" → dite | Nota em *02*; linha em `curiosidades.md`; no A1 seguinte, uma investigação diz que veio do caderno de curiosidades |
| T6 | Automação noturna | Deixe o iPhone bloqueado até 06:30 | Notificação + nota criada. Se falhar, veja §3 "Automação não rodou" |
| T7 | Autorização | Rode A3 e toque **Cancelar** | Nada enviado: nenhuma linha `S` nova em `memoria.md`, nenhuma nota em *07* |
| T8 | Revisão | Escreva algo sob "Meu registro" em 2 notas; rode A3 → **Enviar** | Nota em *07* citando trechos **seus**; linha `S` com ajuste |
| T9 | Rigor | No A4, pergunte "O que Leonardo disse sobre inteligência artificial?" (termo: *Leonardo*) | Deve dizer que suas notas não contêm isso e **não inventar** citação |
| T10 | Etiquetas | Leia uma nota de A1 | Afirmações marcadas com `[FATO]`, `[TEORIA]`, `[CRENÇA]` etc.; tema bíblico apresentado como "Na tradição…" |
| T11 | Erro controlado | Troque 1 letra da chave no A0 e rode o T2 | Aparece o erro `authentication_error` na tela, não uma nota vazia. Restaure a chave |

---

## 3. Limitações técnicas e alternativas

| Limitação | Efeito | Contorno |
|---|---|---|
| Claude não acessa o Notas | — | Por desenho: os Atalhos leem e enviam só o que você autoriza |
| Corpo da nota vem como texto simples (sem imagens/desenhos) | Desenhos e fotos não vão para a revisão | Escreva 1 linha descrevendo o desenho ("Desenho: alavanca de 2ª classe, braço 3:1"); ou, na v2, envie fotos à API (ela aceita imagens) |
| *Criar Nota* sem campo de pasta em algumas versões | Nota cai em "Notas" | Ação *Mover Notas para Pasta* logo em seguida |
| *Criar Rich Text a partir de Markdown* imperfeito no Notas | Formatação parcial | Remova o passo; texto puro funciona |
| *Buscar Notas* não combina "qualquer pasta" + "data" | Filtro errado | 6 buscas, uma por pasta, somadas em uma variável |
| Memória cresce com o tempo | Custo sobe devagar | Após `Obter Arquivo` em A1: **Dividir Texto** por novas linhas → **Obter Itens da Lista** *Itens no Intervalo* (últimas 120 linhas) → **Combinar Texto**. Mantém ~4 meses de histórico, suficiente para não repetir; o arquivo inteiro continua salvo |
| Requisição demorada pode estourar o tempo do Atalhos | Erro de tempo esgotado | A1 já usa `esforco: low`; reduza `max` para 8000; em último caso troque o modelo para `claude-sonnet-5-5` |
| Automação não rodou | Sem nota de manhã | Verifique: *Executar Imediatamente* ativo; Modo de Pouca Energia desligado; iPhone com internet. A notificação de erro aparece; rode manualmente |
| Chave da API dentro do atalho | Risco se compartilhar | Nunca compartilhe A0; limite de gasto mensal no Console; revogue e recrie a chave se suspeitar |
| Desenhos à mão não são "lidos" | — | Escreva a conclusão do desenho em texto |
| Sem iCloud Drive | Memória não salva | Ative iCloud Drive (Ajustes → seu nome → iCloud) |
| Sem crédito na API | Erro 400/402 de faturamento | Recarregue no Console ou ative recarga automática |

---

## 4. Motores alternativos (sem chave de API)

### Opção B — app Claude ("Ask Claude")
Substitua, **dentro do A0**, os passos 5–17 por: **Texto** = P0 + duas linhas em branco + **Prompt**
→ ação **Ask Claude** (app Claude) com esse texto → use a saída como **Resposta**.
- Custo: incluído na sua assinatura; conta no limite de uso.
- Teste T3 e T6 obrigatoriamente: confirme que a resposta volta como variável e que a ação roda
  com o iPhone bloqueado. Se a automação exigir desbloqueio, mude o gatilho de A1 para *Ao
  desligar o alarme* (Automação → *Alarme* → *É Interrompido*) — você estará com o iPhone na mão.
- Não é possível fixar modelo, esforço ou fallback por essa via.

### Opção C — Apple Intelligence ("Usar Modelo", iOS 26+)
Substitua os passos 5–17 do A0 por **Usar Modelo** (*Use Model*) → *Nuvem Privada* (ou *ChatGPT*),
com o mesmo texto da Opção B. Gratuito; bom para A2 v2 (lapidar curiosidade); fraco para a
revisão semanal e para rigor de fontes. Exige iPhone compatível com Apple Intelligence.

---

## 5. Integrações complementares — avaliação

| Ferramenta | Necessária na v1? | Quando vale a pena |
|---|---|---|
| **Gmail** | Não | Arquivo externo: no fim de A3, ação **Enviar E-mail** (desative *Mostrar Compor*) com a revisão para você mesmo. Útil como backup pesquisável |
| **Telegram** | Não | v3: diálogo socrático (você responde, a IA réplica). Exige bot + servidor (n8n) |
| **Notion** | Não | Se quiser um banco de dados com filtros, níveis e gráficos. Substitui o `memoria.md`, não o caderno |
| **n8n** | Não | v3: gerar no servidor, independente do iPhone; orquestrar Telegram/Gmail/Notion. Custo: US$ 0 self-hosted (+ VPS ~US$ 5) ou plano cloud |

---

## 6. Privacidade

- O que sai do iPhone: o prompt do dia (sua memória em texto curto, suas curiosidades) e, **só
  quando você toca em Enviar**, o texto das notas do CODEX da semana ou da busca.
- Pelos termos comerciais da API, a Anthropic por padrão não usa dados da API para treinar
  modelos — confira a política vigente em `anthropic.com/legal`.
- Nunca entram: notas fora da pasta CODEX (o filtro é por pasta), notas bloqueadas, outros apps.

---

## 7. Rotina sugerida (15–40 min/dia)

1. **Manhã (5 min)**: leia as 5 investigações; escolha 1 a 3.
2. **Durante o dia**: capture curiosidades por voz (A2).
3. **Hora do CODEX (20–30 min)**: faça a investigação com as mãos — escreva, desenhe, calcule
   *antes* de pesquisar. Depois pesquise e confira.
4. **21:00**: no lembrete, escreva sob "Meu registro": o que descobri, o que errei, nova pergunta.
5. **Domingo**: revisão semanal; responda as 5 perguntas de recuperação **sem consultar**.
