#!/usr/bin/env bash
# Teste do CODEX fora do iPhone: envia o prompt diário (P1) com o prompt de sistema (P0)
# exatamente como o atalho A0 faz, e imprime o texto da resposta.
# Uso: ANTHROPIC_API_KEY=sk-ant-... bash codex/scripts/teste_api.sh [modelo] [esforco]
set -euo pipefail

: "${ANTHROPIC_API_KEY:?Defina ANTHROPIC_API_KEY}"
MODELO="${1:-claude-opus-5-5}"
ESFORCO="${2:-low}"
DIR="$(cd "$(dirname "$0")/.." && pwd)"

python3 - "$DIR/PROMPTS.md" "$MODELO" "$ESFORCO" > /tmp/codex_req.json <<'PY'
import json, re, sys, datetime
prompts, modelo, esforco = sys.argv[1], sys.argv[2], sys.argv[3]
blocos = re.findall(r"```text\n(.*?)```", open(prompts, encoding="utf-8").read(), re.S)
sistema, diario = blocos[0], blocos[1]
hoje = datetime.date.today()
troca = {
    "«Data Formatada»": hoje.strftime("%d/%m/%Y"),
    "«Data ISO»": hoje.isoformat(),
    "«Número do Dia»": "1",
    "«Memória»": "(vazia — primeiro dia)",
    "«Curiosidades»": "- Por que o céu escurece à noite se há infinitas estrelas?",
}
for k, v in troca.items():
    diario = diario.replace(k, v)
print(json.dumps({
    "model": modelo,
    "max_tokens": 12000,
    "system": sistema,
    "fallbacks": "default",
    "output_config": {"effort": esforco},
    "messages": [{"role": "user", "content": diario}],
}, ensure_ascii=False))
PY

curl -sS https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "anthropic-beta: server-side-fallback-2026-07-01" \
  -H "content-type: application/json" \
  --data-binary @/tmp/codex_req.json \
| python3 -c '
import json, sys
r = json.load(sys.stdin)
if "error" in r:
    sys.exit("ERRO: " + json.dumps(r["error"], ensure_ascii=False))
if r.get("stop_reason") == "refusal":
    sys.exit("Recusado: " + json.dumps(r.get("stop_details"), ensure_ascii=False))
print("".join(b["text"] for b in r["content"] if b["type"] == "text"))
u = r["usage"]
custo = u["input_tokens"] * 4e-6 + u["output_tokens"] * 20e-6
ent, sai = u["input_tokens"], u["output_tokens"]
print(f"\n--- tokens: entrada {ent}, saida {sai} - custo aprox. US$ {custo:.3f} (preco Opus 5.5)", file=sys.stderr)
'
