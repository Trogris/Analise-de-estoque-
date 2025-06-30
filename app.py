import streamlit as st
import pandas as pd
import io

def aplicar_regras_com_alertas(estrutura, estoque, destino, qtd_equipamentos):
    resultado = []
    estrutura['Quantidade'] = estrutura['Quantidade'] * qtd_equipamentos
    estrutura_group = estrutura.groupby('Item')['Quantidade'].sum().reset_index()

    for _, row in estrutura_group.iterrows():
        item = row['Item']
        qtde_necessaria = row['Quantidade']
        saldos_item = estoque[estoque['Item'] == item]

        codigos = {
            'PL': saldos_item[saldos_item['Prefixo'] == 'PL']['Quantidade'].sum(),
            'PV': saldos_item[saldos_item['Prefixo'] == 'PV']['Quantidade'].sum(),
            'RP': saldos_item[saldos_item['Prefixo'] == 'RP']['Quantidade'].sum(),
            'MP': saldos_item[saldos_item['Prefixo'] == 'MP']['Quantidade'].sum(),
            'AA': saldos_item[saldos_item['Prefixo'] == 'AA']['Quantidade'].sum()
        }

        total_direto = codigos[destino]
        falta = qtde_necessaria - total_direto

        status = "Ok" if falta <= 0 else ""
        alertas = []

        if status != "Ok":
            if destino == 'PL' and codigos['PV'] >= falta:
                status = f"🟡 Transpor {int(falta)} de PV para PL"
            elif destino == 'PV' and codigos['PL'] >= falta:
                status = f"🟡 Transpor {int(falta)} de PL para PV"
            elif destino == 'PL' and codigos['RP'] >= falta:
                status = f"🟡 Transpor {int(falta)} de RP para PL"
            else:
                if destino == 'PV' and codigos['RP'] > 0:
                    alertas.append(f"RP → PV: {int(codigos['RP'])} unidades disponíveis ⚠️")
                if codigos['MP'] > 0:
                    alertas.append(f"MP → {destino}: {int(codigos['MP'])} unidades disponíveis ⚠️")
                if codigos['AA'] > 0:
                    alertas.append(f"AA → {destino}: {int(codigos['AA'])} unidades disponíveis ⚠️")

                saldo_completo = total_direto + codigos['PV'] + codigos['PL'] + codigos['RP'] + codigos['MP'] + codigos['AA']
                if saldo_completo < qtde_necessaria:
                    falta_final = qtde_necessaria - saldo_completo
                    status = f"🔴 Comprar {int(falta_final)} unidades"
                else:
                    status = "🟡 Requer decisão"

        else:
            status = "🟢 Ok"

        resultado.append({
            'Item': item,
            'Qtd Necessária': qtde_necessaria,
            **codigos,
            'Status': status,
            'Alerta': " | ".join(alertas) if alertas else ""
        })

    return pd.DataFrame(resultado)

st.set_page_config(layout="centered")
st.title("🔍 Análise de Estoque")

estrutura_file = st.file_uploader("📦 Importe a Estrutura do Produto (Excel)", type=["xls", "xlsx"])
estoque_file = st.file_uploader("🏷️ Importe o Estoque Atual (Excel)", type=["xls", "xlsx"])

destino = st.selectbox("🔧 Tipo de Produção (Prefixo Destino)", ["PV", "PL"])
qtd_equipamentos = st.number_input("🔢 Quantidade de Equipamentos a Produzir", min_value=1, value=1, step=1)

if estrutura_file and estoque_file:
    estrutura = pd.read_excel(estrutura_file)
    estoque = pd.read_excel(estoque_file)

    if 'Código' in estrutura.columns:
        estrutura = estrutura.rename(columns={'Código': 'Item'})
    if 'CODIGO' in estrutura.columns:
        estrutura = estrutura.rename(columns={'CODIGO': 'Item'})
    if 'CODIGO' in estoque.columns:
        estoque = estoque.rename(columns={'CODIGO': 'Item'})
    if 'TP' in estoque.columns:
        estoque = estoque.rename(columns={'TP': 'Prefixo'})
    if 'SALDO EM ESTOQUE' in estoque.columns:
        estoque = estoque.rename(columns={'SALDO EM ESTOQUE': 'Quantidade'})

    if not {'Item', 'Quantidade'}.issubset(estrutura.columns):
        st.error("❌ A planilha de estrutura precisa conter as colunas: 'Item' e 'Quantidade'")
    elif not {'Item', 'Prefixo', 'Quantidade'}.issubset(estoque.columns):
        st.error("❌ A planilha de estoque precisa conter as colunas: 'Item', 'Prefixo' e 'Quantidade'")
    else:
        estrutura = estrutura[['Item', 'Quantidade']]
        estoque = estoque[['Item', 'Prefixo', 'Quantidade']]

        if st.button("✅ Executar Análise"):
            with st.spinner("Analisando os dados..."):
                resultado_df = aplicar_regras_com_alertas(estrutura, estoque, destino, qtd_equipamentos)
                st.success("Análise concluída!")

                st.subheader("📊 Resultado da Análise")
                st.dataframe(resultado_df)

                if st.button("🔄 Nova Análise"):
                    st.experimental_rerun()

                buffer = io.BytesIO()
                resultado_df.to_excel(buffer, index=False)
                buffer.seek(0)
                st.download_button("⬇️ Baixar Relatório Completo", data=buffer, file_name="analise_estoque.xlsx")
            
