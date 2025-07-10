import streamlit as st
import pandas as pd
import io

# Função principal de análise
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

        status = "🟢 Ok" if falta <= 0 else ""
        alertas = []

        if status != "🟢 Ok":
            transposicao = 0
            usar = 0

            # Tentativas de transposição
            if destino == 'PL':
                for origem in ['MP', 'AA', 'PV']:
                    usar = min(falta, codigos[origem])
                    if usar > 0:
                        falta -= usar
                        transposicao += usar
                        alertas.append(f"{usar} unid de {origem} → PL")
                if falta > 0 and codigos['RP'] >= falta:
                    alertas.append(f"{falta} unid de RP → uso direto")
                    falta = 0
            elif destino == 'PV':
                for origem in ['MP', 'AA', 'PL']:
                    usar = min(falta, codigos[origem])
                    if usar > 0:
                        falta -= usar
                        transposicao += usar
                        alertas.append(f"{usar} unid de {origem} → PV")

            if falta > 0:
                status = f"🔴 Comprar {int(falta)}"
            else:
                status = "🟡 Necessário Transposição"

        resultado.append({
            'Item': item,
            'Qtd Necessária': qtde_necessaria,
            **codigos,
            'Status': status,
            'Transposição': " | ".join(alertas) if alertas else ""
        })

    return pd.DataFrame(resultado)

# Interface Streamlit
st.set_page_config(layout="centered")
st.title("📘 Análise de Estoque para Produção")

estrutura_file = st.file_uploader("📥 Estrutura do Produto (.xlsx)", type=["xls", "xlsx"])
estoque_file = st.file_uploader("📥 Saldo em Estoque (.xlsx)", type=["xls", "xlsx"])

destino = st.selectbox("🎯 Código de Destino", ["PL", "PV"])
qtd_equipamentos = st.number_input("🔢 Quantidade de Equipamentos a Produzir", min_value=1, value=1)

if estrutura_file and estoque_file:
    estrutura = pd.read_excel(estrutura_file)
    estoque = pd.read_excel(estoque_file)

    # Renomeando colunas conforme nomes presentes nos arquivos enviados
    estrutura = estrutura.rename(columns={'CÓDIGO': 'Item', 'QUANTIDADE': 'Quantidade'})
    estoque = estoque.rename(columns={'CODIGO': 'Item', 'TP': 'Prefixo', 'SALDO EM ESTOQUE': 'Quantidade'})

    estrutura = estrutura[['Item', 'Quantidade']]
    estoque = estoque[['Item', 'Prefixo', 'Quantidade']]

    if st.button("✅ Executar Análise"):
        with st.spinner("🔍 Analisando os dados..."):
            resultado_df = aplicar_regras_com_alertas(estrutura, estoque, destino, qtd_equipamentos)
            st.success("✅ Análise concluída!")

            st.subheader("📊 Resultado")
            st.dataframe(resultado_df)

            buffer = io.BytesIO()
            resultado_df.to_excel(buffer, index=False)
            buffer.seek(0)
            st.download_button("📥 Baixar Resultado", data=buffer, file_name="resultado_estoque.xlsx")

        if st.button("🔄 Nova Análise"):
            st.experimental_rerun()
            
            
