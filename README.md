# 📦 Análise de Estoque

Ferramenta para análise de estrutura de produto versus estoque atual, com regras de transposição de componentes.

## 🛠️ Como usar

1. Faça upload de dois arquivos:
   - **Estrutura do Produto**: com colunas `Item` e `Quantidade`
   - **Estoque Atual**: com colunas `Item`, `Prefixo`, `Quantidade`
2. Selecione o prefixo de destino (`PL` ou `PV`)
3. Escolha a quantidade de equipamentos a produzir
4. Clique em **Executar Análise**
5. Veja o status de cada item:
   - ✅ Ok
   - ⚠️ Necessário Transposição
   - ❌ Solicitar Compra

## ▶️ Rodar localmente

```bash
pip install -r requirements.txt
streamlit run app.py
```

## 🧾 Regras de Estoque

Prefixos permitidos:
- `PL`: Produto para Locação
- `PV`: Produto para Venda
- `MP`: Matéria-prima
- `AA`: Almoxarifado Auxiliar
- `RP`: Componentes Reparados (uso direto apenas em PL)

Consulte o código para regras de transposição entre prefixos.
