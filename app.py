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
        saldos = estoque[estoque['Item'] == item]

        # Coletar saldo por prefixo
        codigos = {p: saldos[saldos['Prefixo'] == p]['Quantidade'].sum() for p in ['PL', 'PV', 'RP', 'MP', 'AA']}
        total_direto = codigos[destino]  # Estoque no destino
        falta = qtde_necessaria - total_direto

        status = "Ok" if falta <= 0 else ""
        alertas = []

        if status != "Ok":
            # Tentativas de transposição sem alerta
            if destino == 'PL' and codigos['PV'] >= falta:
                status = f"Transpor {falta} de PV para PL"
            elif destino == 'PV' and codigos['PL'] >= falta:
                status = f"Transpor {falta} de PL para PV"
            elif destino == 'PL' and codigos['RP'] >= falta:
                status = f"Transpor {falta} de RP para PL"
            else:
                # Verificar possibilidades com alerta
                if destino == 'PV' and codigos['RP'] > 0:
                    alertas.append(f"Possível transpor {codigos['RP']} de RP para PV ⚠️")
                if codigos['MP'] > 0:
                    alertas.append(f"Possível transpor {codigos['MP']} de MP para {destino} ⚠️")
                if codigos['AA'] > 0:
                    alertas.append(f"Possível transpor {codigos['AA']} de AA para {destino} ⚠️")

                saldo_completo = total_direto + codigos['PV'] + codigos['PL'] + codigos['RP'] + codigos['MP'] + codigos['AA']
                if saldo_completo < qtde_necessaria:
                    falta_final = qtde_necessaria - saldo_completo
                    status = f"Comprar {falta_final} unidades"
                elif status == "":
                    status = "Requer decisão"

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
    if 'CODIGO' in estoque.columns:
        estoque = estoque.rename(columns={'CODIGO': 'Item'})
    if 'TP' in estoque.columns:
        estoque = estoque.rename(columns={'TP': 'Prefixo'})
    if 'SALDO EM ESTOQUE' in estoque.columns:
        estoque = estoque.rename(columns={'SALDO EM ESTOQUE': 'Quantidade'})

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
            
