import streamlit as st
import pandas as pd
import io

st.set_page_config(layout="centered")
st.title("🔍 Análise de Estrutura")

def aplicar_regras(estrutura, estoque, destino, qtd_equipamentos):
    resultado = []
    estrutura['Quantidade'] = estrutura['Quantidade'] * qtd_equipamentos
    estrutura_group = estrutura.groupby('Item')['Quantidade'].sum().reset_index()

    for _, row in estrutura_group.iterrows():
        item = row['Item']
        qtde_necessaria = row['Quantidade']
        saldos = estoque[estoque['Item'] == item]

        codigos = {'PL': 0, 'MP': 0, 'AA': 0, 'PV': 0, 'RP': 0}
        for codigo in codigos:
            codigos[codigo] = saldos[saldos['Prefixo'] == codigo]['Quantidade'].sum()

        saldo_utilizavel = codigos['PL'] + codigos['MP'] + codigos['AA'] + codigos['PV']
        saldo_rp = codigos['RP']

        if destino == 'PL':
            if saldo_utilizavel >= qtde_necessaria:
                status = "Ok"
            elif saldo_utilizavel + saldo_rp >= qtde_necessaria:
                falta = qtde_necessaria - saldo_utilizavel
                status = f"Necessário Transposição: {falta} unidades para o PV"
            else:
                falta = qtde_necessaria - (saldo_utilizavel + saldo_rp)
                status = f"Solicitar Compra ({falta} unid.)"
        else:
            if codigos[destino] >= qtde_necessaria:
                status = "Ok"
            else:
                falta = qtde_necessaria - codigos[destino]
                transposicao = saldo_utilizavel - codigos[destino]
                if transposicao >= falta:
                    status = f"Necessário Transposição: {falta} unidades para o {destino}"
                else:
                    status = f"Solicitar Compra ({falta} unid.)"

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
                st.dataframe(resultado_df[resultado_df['Status'] != "Ok"])

                if st.button("🔄 Nova Análise"):
                    st.experimental_rerun()

                buffer = io.BytesIO()
                resultado_df.to_excel(buffer, index=False)
                buffer.seek(0)
                st.download_button("⬇️ Baixar Relatório Completo", data=buffer, file_name="relatorio_estoque.xlsx")
