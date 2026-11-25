# CODEX — Tutorial dos Atalhos (iOS 18/26)

Tempo total de montagem: **60–90 minutos**, uma única vez.
Os nomes das ações estão em português (iPhone em PT-BR), com o nome em inglês entre parênteses
para você encontrá-las na busca do app Atalhos caso o aparelho esteja em outro idioma.

> **Como ler os passos.** Cada linha numerada é **uma ação** que você adiciona tocando em
> *Adicionar Ação* e buscando o nome. "→ variável **X**" significa: logo depois, adicione a ação
> **Definir Variável** (*Set Variable*) com o nome X — ou toque no ícone de saída da ação e renomeie.

---

## 0. Preparação (10 min)

1. **Chave da API**: em `console.anthropic.com` → *Billing* (adicione US$ 5–10 de crédito) →
   *Settings → Limits* (defina um **limite de gasto mensal**, ex.: US$ 10) → *API Keys → Create Key*
   (nome "codex-iphone"). Copie a chave para o Notas temporariamente; apague depois.
2. **Pastas no Notas**: crie `CODEX` (conta iCloud) e as 8 subpastas exatamente com estes nomes:
   `01 — Investigações diárias`, `02 — Caderno de curiosidades`, `03 — Descobertas`,
   `04 — Hipóteses e experimentos`, `05 — Reflexões`, `06 — Conexões entre conhecimentos`,
   `07 — Revisões de aprendizagem`, `08 — Biblioteca e referências`.
3. **Lembretes**: crie a lista `CODEX`.
4. **Calendário** (manual, opcional): evento recorrente diário "Hora do CODEX", 30 min, no horário
   que você protege para estudar.
5. **Ajustes → Atalhos → Avançado**: ative *Permitir Compartilhar Grandes Quantidades de Dados*
   (necessário para enviar a semana inteira de notas).
6. **Arquivos de memória**: não precisa criar. O primeiro uso de *Anexar ao Arquivo de Texto*
   cria `iCloud Drive/Atalhos/CODEX/memoria.md` e `curiosidades.md`.

---

## A0 · `CODEX · Chamar Claude` (o único que fala com a API)

Entrada: um **Dicionário** com `prompt`, `esforco` (`low`/`medium`/`high`) e `max` (número).
Saída: o texto da resposta.

Nos *Detalhes* do atalho (ícone ⓘ): desative *Mostrar na Planilha de Compartilhamento*; ative
nada mais. Ele só é chamado pelos outros.

| # | Ação | Parâmetros |
|---|---|---|
| 1 | **Receber** entrada (*Receive*) | Tipo: *Dicionário*, *Texto*. Se não houver entrada: *Parar e Responder* |
| 2 | **Obter Valor do Dicionário** (*Get Dictionary Value*) | Obter *Valor* para chave `prompt` em *Entrada do Atalho* → variável **Prompt** |
| 3 | Obter Valor do Dicionário | chave `esforco` em *Entrada do Atalho* → variável **Esforço** |
| 4 | Obter Valor do Dicionário | chave `max` em *Entrada do Atalho* → variável **Max** |
| 5 | **Texto** | cole o **P0 · Prompt de sistema** de `PROMPTS.md` → variável **Sistema** |
| 6 | **Texto** | cole sua chave `sk-ant-…` → variável **Chave** |
| 7 | **Obter Conteúdo do URL** (*Get Contents of URL*) | ver abaixo |
| 8 | **Obter Valor do Dicionário** | chave `stop_reason` em *Conteúdo do URL* → **Motivo** |
| 9 | **Se** (*If*) **Motivo** *é* `refusal` | **Mostrar Alerta** "O modelo recusou este pedido." → **Parar Este Atalho**. *Fim do Se* |
| 10 | **Obter Valor do Dicionário** | chave `content` em *Conteúdo do URL* → **Blocos** |
| 11 | **Repetir com Cada** (*Repeat with Each*) em **Blocos** | |
| 12 |  ↳ **Obter Valor do Dicionário** | chave `type` em *Item Repetido* |
| 13 |  ↳ **Se** *Valor do Dicionário* *é* `text` | |
| 14 |  ↳↳ **Obter Valor do Dicionário** | chave `text` em *Item Repetido* |
| 15 |  ↳↳ **Adicionar à Variável** (*Add to Variable*) | variável **Resposta** |
| 16 |  ↳ *Fim do Se* · *Fim da Repetição* | |
| 17 | **Se** **Resposta** *não tem nenhum valor* | **Mostrar Resultado** com *Conteúdo do URL* (mostra o erro da API) → **Parar Este Atalho**. *Fim do Se* |
| 18 | **Combinar Texto** (*Combine Text*) | **Resposta**, separador: *Nova Linha* |
| 19 | **Parar e Gerar Saída** (*Stop and Output*) | *Texto Combinado* |

**Passo 7 — Obter Conteúdo do URL** (toque na seta para expandir):

- URL: `https://api.anthropic.com/v1/messages`
- Método: **POST**
- Cabeçalhos (*Headers*):
  | Chave | Valor |
  |---|---|
  | `x-api-key` | variável **Chave** |
  | `anthropic-version` | `2023-06-01` |
  | `anthropic-beta` | `server-side-fallback-2026-07-01` |
  | `content-type` | `application/json` |
- Corpo da Solicitação: **JSON**, com os campos:
  | Chave | Tipo | Valor |
  |---|---|---|
  | `model` | Texto | `claude-opus-5-5` |
  | `max_tokens` | Número | variável **Max** |
  | `system` | Texto | variável **Sistema** |
  | `fallbacks` | Texto | `default` |
  | `output_config` | Dicionário | dentro dele: `effort` (Texto) = variável **Esforço** |
  | `messages` | **Matriz** (*Array*) | um item do tipo **Dicionário** com: `role` (Texto) = `user`; `content` (Texto) = variável **Prompt** |

Por que o laço dos passos 11–16: a resposta do Opus 5.5 traz primeiro um bloco de raciocínio
(`thinking`, vazio) e depois o bloco `text`. Pegar "o primeiro item" devolveria o bloco errado.

> 🔐 A chave fica dentro do atalho. **Nunca compartilhe A0 por link do iCloud** (a chave iria junto).
> O limite de gasto do passo 0 protege contra vazamento.

---

## A1 · `CODEX · Investigações do dia`

| # | Ação | Parâmetros |
|---|---|---|
| 1 | **Obter Arquivo** (*Get File*) | Serviço: iCloud Drive · Caminho: `CODEX/memoria.md` (a raiz já é a pasta *Atalhos*) · **desative** *Erro Se Não Encontrado* → variável **Memória** |
| 2 | **Obter Arquivo** | Caminho `CODEX/curiosidades.md`, *Erro Se Não Encontrado* desativado → **Curiosidades** |
| 3 | **Corresponder Texto** (*Match Text*) | Padrão `(?m)^D ` em **Memória** |
| 4 | **Contar** (*Count*) | *Itens* em *Correspondências* |
| 5 | **Calcular** (*Calculate*) | *Contagem* **+** `1` → variável **Número do Dia** |
| 6 | **Data Atual** → **Formatar Data** | Formato personalizado `EEEE, d 'de' MMMM 'de' yyyy`, local pt_BR → **Data Formatada** |
| 7 | **Formatar Data** (Data Atual) | Personalizado `yyyy-MM-dd` → **Data ISO** |
| 8 | **Texto** | cole o **P1** e substitua `«Data Formatada»`, `«Número do Dia»`, `«Memória»`, `«Curiosidades»`, `«Data ISO»` pelas variáveis → **Prompt Diário** |
| 9 | **Dicionário** (*Dictionary*) | `prompt` = **Prompt Diário** · `esforco` = `low` · `max` (Número) = `12000` |
| 10 | **Executar Atalho** (*Run Shortcut*) | `CODEX · Chamar Claude`, entrada: *Dicionário* · desative *Mostrar Ao Executar* → **Resposta** |
| 11 | **Dividir Texto** (*Split Text*) | **Resposta**, separador *Personalizado*: `@@@MEMORIA@@@` |
| 12 | **Obter Item da Lista** | *Primeiro Item* de *Texto Dividido* → **Nota** |
| 13 | **Obter Item da Lista** | *Último Item* de *Texto Dividido* → **Registro** |
| 14 | **Criar Rich Text a partir de Markdown** (*Make Rich Text from Markdown*) | **Nota** |
| 15 | **Criar Nota** (*Create Note*) | Corpo: *Rich Text*; Pasta: `01 — Investigações diárias` (se o campo pasta não aparecer no seu iOS, use o passo 15b); desative *Mostrar Compor* |
| 15b | (só se necessário) **Mover Notas para Pasta** | *Nota* → `01 — Investigações diárias` |
| 16 | **Aparar Espaços** (*Trim Whitespace*) | **Registro** |
| 17 | **Anexar ao Arquivo de Texto** (*Append to Text File*) | Texto aparado → `CODEX/memoria.md` · *Criar Nova Linha* ativado |
| 18 | **Adicionar Novo Lembrete** | "Registrar descobertas do CODEX" · Lista `CODEX` · Alerta: hoje às 21:00 |
| 19 | **Mostrar Notificação** | "5 investigações prontas — {Data Formatada}" |

**Automação** (aba *Automação* → *Nova Automação* → *Hora do Dia*): 06:30, *Diariamente*,
**Executar Imediatamente**, desative *Notificar Ao Executar* se preferir → ação **Executar Atalho**
`CODEX · Investigações do dia`.

---

## A2 · `Curiosidade` (Siri)

Nome curto e falável: "E aí Siri, **Curiosidade**".

| # | Ação | Parâmetros |
|---|---|---|
| 1 | **Ditar Texto** (*Dictate Text*) | Idioma: Português (Brasil) · Parar de escutar: *Após Pausa* → **Curiosidade** |
| 2 | **Formatar Data** (Data Atual) | `yyyy-MM-dd HH:mm` → **Quando** |
| 3 | **Texto** | `❓ {Curiosidade}` ⏎ ⏎ `Registrada em {Quando}` ⏎ ⏎ `Hipótese inicial:` ⏎ ⏎ `Como eu poderia descobrir?` |
| 4 | **Criar Nota** | Corpo: *Texto* · Pasta `02 — Caderno de curiosidades` |
| 5 | **Anexar ao Arquivo de Texto** | `- {Quando} · {Curiosidade}` → `CODEX/curiosidades.md`, nova linha |
| 6 | **Falar Texto** (*Speak Text*) ou **Mostrar Notificação** | "Anotado." |

A1 lê `curiosidades.md` e transforma uma curiosidade por dia em investigação.
**Atalho extra**: adicione A2 à tela inicial, à Central de Controle ou ao **botão de Ação**
(iPhone 15 Pro ou posterior) para captura em 1 toque.

Versão 2 (opcional): após o passo 1, um **Dicionário** com `prompt` = P4 (com `«Texto Ditado»` =
**Curiosidade**), `esforco` = `low`, `max` = `2000` → **Executar Atalho** A0 → acrescente o
resultado ao texto do passo 3.

---

## A3 · `CODEX · Revisão semanal`

| # | Ação | Parâmetros |
|---|---|---|
| 1 | **Buscar Notas** (*Find Notes*) | Filtros (*Qualquer* das condições): *Pasta é* `01 — Investigações diárias`; *Pasta é* `02 —…`; `03`; `04`; `05`; `06` · **e** *Data de Modificação está nos últimos* `7 dias` · Ordenar: data de criação · Limite: desativado → **Notas** |

> Se o editor não permitir misturar "qualquer" (pastas) com "todas" (data), faça 6 ações *Buscar
> Notas* (uma por pasta, cada uma com *Data de Modificação nos últimos 7 dias*) e
> **Adicionar à Variável** **Notas** depois de cada uma.

| # | Ação | Parâmetros |
|---|---|---|
| 2 | **Contar** | *Itens* em **Notas** → **Qtd** |
| 3 | **Se** **Qtd** *é* `0` | **Mostrar Notificação** "Nenhuma anotação nesta semana." → **Parar Este Atalho** · *Fim do Se* |
| 4 | **Repetir com Cada** em **Notas** | |
| 5 |  ↳ **Obter Detalhes das Notas** (*Get Details of Notes*) | *Nome* do *Item Repetido* → **Título** |
| 6 |  ↳ **Texto** | `### {Título}` ⏎ `{Item Repetido}` (o corpo da nota) ⏎ `---` |
| 7 |  ↳ *Fim da Repetição* | |
| 8 | **Combinar Texto** | *Resultados da Repetição*, separador nova linha → **Notas da Semana** |
| 9 | **Repetir com Cada** em **Notas** → Obter Detalhes *Nome* → *Fim* → **Combinar Texto** | separador nova linha → **Lista de Títulos** |
| 10 | **Escolher do Menu** (*Choose from Menu*) | Pergunta: `Enviar {Qtd} notas ao Claude para a revisão semanal?` ⏎ `{Lista de Títulos}` · Opções: **Enviar** / **Cancelar** |
| 11 | ↳ *Cancelar*: **Parar Este Atalho** | |
| 12 | ↳ *Enviar*: continue abaixo | |
| 13 | **Obter Arquivo** `CODEX/memoria.md` (erro desativado) | → **Memória** |
| 14 | **Formatar Data** ×2 | **Data Formatada**, **Data ISO** (como em A1) |
| 15 | **Texto** | cole o **P2** e insira as variáveis → **Prompt Semanal** |
| 16 | **Dicionário** | `prompt` = **Prompt Semanal** · `esforco` = `medium` · `max` = `16000` |
| 17 | **Executar Atalho** `CODEX · Chamar Claude` | → **Resposta** |
| 18–22 | Igual A1 passos 11–17 | Nota na pasta `07 — Revisões de aprendizagem`; registro `S …` anexado a `memoria.md` |
| 23 | **Mostrar Nota** (*Show Note*) | a nota criada |

**Automação**: *Hora do Dia* → domingo 18:00, *Semanalmente*. Use **Executar Imediatamente**: o
menu do passo 10 aparece como notificação e **nada é enviado sem o seu toque em "Enviar"**. Essa é
a autorização explícita a cada semana.

> Privacidade: o filtro por pasta garante que só notas do CODEX são lidas. Notas bloqueadas
> nunca são acessíveis aos Atalhos.

---

## A4 · `CODEX · Perguntar ao caderno`

| # | Ação | Parâmetros |
|---|---|---|
| 1 | **Pedir Entrada** (*Ask for Input*) | Texto: "O que você quer perguntar ao seu caderno?" → **Pergunta** |
| 2 | **Pedir Entrada** | "Palavra-chave para buscar nas notas" (ex.: *entropia*) → **Termo** |
| 3 | **Buscar Notas** | *Corpo contém* **Termo** · Limite 15 → **Notas** (opcional: restrinja às pastas do CODEX como em A3) |
| 4–9 | Como A3 passos 2–12 | Montar **Notas Encontradas**, mostrar títulos, pedir *Enviar / Cancelar* |
| 10 | **Texto** P3 → **Dicionário** (`esforco` `medium`, `max` `6000`) → **Executar Atalho** A0 | → **Resposta** |
| 11 | **Criar Rich Text a partir de Markdown** → **Visualização Rápida** (*Quick Look*) | |
| 12 | **Escolher do Menu** "Salvar em 06 — Conexões?" | *Sim*: **Criar Nota** na pasta 06 · *Não*: nada |

---

## A5 · `Registrar` (Siri)

| # | Ação | Parâmetros |
|---|---|---|
| 1 | **Escolher do Menu** | `Descoberta`, `Hipótese / experimento`, `Reflexão`, `Conexão`, `Referência` |
| 2 | em cada opção: **Texto** com o nome da pasta correspondente (`03 — Descobertas`, `04 — …`, `05 — …`, `06 — …`, `08 — …`) | |
| 3 | após o menu: **Definir Variável** **Pasta** = *Resultado do Menu* | |
| 4 | **Ditar Texto** → **Conteúdo** | |
| 5 | **Texto** com modelo por tipo (exemplos abaixo) | |
| 6 | **Criar Nota** na pasta **Pasta** (ou *Mover Notas para Pasta*) | |

Modelos sugeridos (escolha pelo menu):
- **Hipótese**: `Hipótese:` / `Previsão (se for verdade, então…):` / `Experimento:` / `Resultado:` / `Conclusão:`
- **Conexão**: `Área A:` / `Área B:` / `O que as une:` / `Pergunta nova:`
- **Referência**: `Autor:` / `Obra:` / `Trecho (conferido na fonte? s/n):` / `Por que importa:`

---

## Dicas de montagem

- **Teste A0 sozinho primeiro**: crie um atalho de teste com um Dicionário (`prompt` = "Diga olá
  em uma frase", `esforco` = `low`, `max` = `500`) → *Executar Atalho* A0 → *Mostrar Resultado*.
- Para depurar, insira **Mostrar Resultado** temporariamente após qualquer ação.
- Se *Criar Rich Text a partir de Markdown* deixar a nota estranha, remova o passo e crie a nota
  com o texto puro — os `#` e `**` ficam visíveis, mas tudo funciona.
- Para mudar o modelo, o esforço ou as regras: edite **só o A0** (campo `model` ou o texto P0).
