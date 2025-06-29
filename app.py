import streamlit as st
import pandas as pd
import io

st.set_page_config(layout="centered")
st.title("📦 Análise de Estoque")

def aplicar_regras(estrutura, estoque, destino, qtd_equipamentos):
    resultado = []

    regras_transposicao = {
        'PL': ['PV', 'MP', 'AA'],
        'PV': ['PL', 'MP', 'AA'],
        'MP': ['PL', 'PV'],
        'AA': ['PV', 'MP']
    }

    estrutura['Quantidade'] = estrutura['Quantidade'] * qtd_equipamentos
    estrutura_group = estrutura.groupby('Item')['Quantidade'].sum().reset_index()

    for _, row in estrutura_group.iterrows():
        item = row['Item']
        qtde_necessaria = row['Quantidade']
        saldos_item = estoque[estoque['Item'] == item]

        codigos = {'PL': 0, 'MP': 0, 'AA': 0, 'PV': 0, 'RP': 0}
        for cod in codigos:
            codigos[cod] = saldos_item[saldos_item['Prefixo'] == cod]['Quantidade'].sum()

        saldo_direto = codigos[destino]

        if saldo_direto >= qtde_necessaria:
            status = "✅ Ok"
        else:
            falta = qtde_necessaria - saldo_direto
            transposicoes_possiveis = 0

            for origem in regras_transposicao.get(destino, []):
                transposicoes_possiveis += codigos[origem]

            if (saldo_direto + transposicoes_possiveis) >= qtde_necessaria:
                falta_trans = qtde_necessaria - saldo_direto
                status = f"⚠️ Necessário Transposição: {falta_trans} unidades para o {destino}"
            elif destino == 'PL' and (saldo_direto + transposicoes_possiveis + codigos['RP']) >= qtde_necessaria:
                falta_trans = qtde_necessaria - (saldo_direto + transposicoes_possiveis)
                status = f"⚠️ Necessário Transposição: {falta_trans} unidades para o PL (inclui RP)"
            else:
                falta_total = qtde_necessaria - (saldo_direto + transposicoes_possiveis + (codigos['RP'] if destino == 'PL' else 0))
                status = f"❌ Solicitar Compra ({falta_total} unid.)"

        resultado.append({
            'Item': item,
            'Qtd Necessária': qtde_necessaria,
            'Qtd PL': codigos['PL'],
            'Qtd MP': codigos['MP'],
            'Qtd AA': codigos['AA'],
            'Qtd PV': codigos['PV'],
            'Qtd RP': codigos['RP'],
            'Status': status
        })

    return pd.DataFrame(resultado)

def colorir_status(val):
    if "Ok" in val:
        return "background-color: #d4edda;"  # verde claro
    elif "Transposição" in val:
        return "background-color: #fff3cd;"  # amarelo claro
    elif "Compra" in val:
        return "background-color: #f8d7da;"  # vermelho claro
    return ""

estrutura_file = st.file_uploader("📦 Importe a Estrutura do Produto (Excel)", type=["xls", "xlsx"])
estoque_file = st.file_uploader("🏷️ Importe o Estoque Atual (Excel - Protheus)", type=["xls", "xlsx"])

destino = st.selectbox("🔧 Tipo de Produção (Prefixo Destino)", ["PV", "PL"])
qtd_equipamentos = st.number_input("🔢 Quantidade de Equipamentos a Produzir", min_value=1, value=1, step=1)

if estrutura_file and estoque_file:
    estrutura = pd.read_excel(estrutura_file)
    estoque = pd.read_excel(estoque_file)

    if 'Código' in estrutura.columns:
        estrutura = estrutura.rename(columns={'Código': 'Item'})
    if 'CODIGO' in estoque.columns:
        estoque = estoque.rename(columns={'CODIGO': 'Item', 'TP': 'Prefixo', 'ESTOQUE': 'Quantidade'})

    if not {'Item', 'Quantidade'}.issubset(estrutura.columns):
        st.error("❌ A planilha de estrutura deve conter as colunas: 'Item' e 'Quantidade'")
    elif not {'Item', 'Prefixo', 'Quantidade'}.issubset(estoque.columns):
        st.error("❌ A planilha de estoque deve conter as colunas: 'Item', 'Prefixo' e 'Quantidade'")
    else:
        estrutura = estrutura[['Item', 'Quantidade']]
        estoque = estoque[['Item', 'Prefixo', 'Quantidade']]

        if st.button("✅ Executar Análise"):
            with st.spinner("Analisando os dados..."):
                resultado_df = aplicar_regras(estrutura, estoque, destino, qtd_equipamentos)
                st.success("Análise concluída!")

                st.subheader("📊 Resultado da Análise")
                st.dataframe(resultado_df.style.applymap(colorir_status, subset=["Status"]))

                buffer = io.BytesIO()
                resultado_df.to_excel(buffer, index=False)
                buffer.seek(0)

                col1, col2 = st.columns(2)
                with col1:
                    st.button("🔄 Nova Análise", on_click=lambda: st.experimental_rerun())
                with col2:
                    st.download_button("⬇️ Baixar Relatório Completo", data=buffer, file_name="relatorio_estoque.xlsx")
