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
                status = f"🟡 Usar {int(falta)} direto de RP"
            else:
                if codigos['RP'] > 0 and destino == 'PL':
                    alertas.append(f"RP → {destino}: {int(codigos['RP'])} unidades disponíveis ⚠️")
                if codigos['MP'] > 0:
                    alertas.append(f"MP → {destino}: {int(codigos['MP'])} unidades disponíveis ⚠️")
                if codigos['AA'] > 0:
                    alertas.append(f"AA → {destino}: {int(codigos['AA'])} unidades disponíveis ⚠️")

                saldo_alternativo = sum(v for k, v in codigos.items() if k != destino)
                saldo_completo = total_direto + saldo_alternativo

                if saldo_completo < qtde_necessaria:
                    falta_final = qtde_necessaria - saldo_completo
                    status = f"🔴 Comprar {int(falta_final)} unidades"
                else:
                    status = "🟡 Requer decisão"

                if not alertas:
                    alertas.append("Nenhum saldo alternativo disponível ⚠️")
        else:
            status = "🟢 Ok"

        resultado.append({
            'Item': item,
            'Qtd Necessária': qtde_necessaria,
            **codigos,
            'Status': status,
            'Alerta': " | ".join(alertas)
        })

    return pd.DataFrame(resultado)

# Configuração da interface
st.set_page_config(layout="centered")
st.title("📘 Análise de Estoque para Produção")

estrutura_file = st.file_uploader("📥 Importe a Estrutura do Produto (.xlsx ou .csv)", type=["xlsx", "csv"])
estoque_file = st.file_uploader("📥 Importe o Estoque Atual (.xlsx ou .csv)", type=["xlsx", "csv"])

destino = st.selectbox("Código de Destino", ["PL", "PV"])
qtd_equipamentos = st.number_input("Quantidade de Equipamentos a Produzir", min_value=1, value=1)

if estrutura_file and estoque_file:
    # Detecta tipo de arquivo e lê corretamente
    if estrutura_file.name.endswith('.csv'):
        estrutura = pd.read_csv(estrutura_file)
    else:
        estrutura = pd.read_excel(estrutura_file)

    if estoque_file.name.endswith('.csv'):
        estoque = pd.read_csv(estoque_file)
    else:
        estoque = pd.read_excel(estoque_file)

    # Padroniza colunas
    estrutura.columns = [col.upper().strip() for col in estrutura.columns]
    estoque.columns = [col.upper().strip() for col in estoque.columns]

    # Renomeia colunas para padronizar
    estrutura = estrutura.rename(columns={
        'CÓDIGO': 'Item', 'CODIGO': 'Item', 'ITEM': 'Item',
        'QUANTIDADE': 'Quantidade', 'QTD': 'Quantidade'
    })
    estoque = estoque.rename(columns={
        'CÓDIGO': 'Item', 'CODIGO': 'Item', 'ITEM': 'Item',
        'TP': 'Prefixo',
        'SALDO EM ESTOQUE': 'Quantidade', 'SALDO': 'Quantidade'
    })

    # Verificação de colunas obrigatórias
    if not {'Item', 'Quantidade'}.issubset(estrutura.columns):
        st.error("❌ Estrutura precisa ter colunas 'Item' e 'Quantidade'")
    elif not {'Item', 'Prefixo', 'Quantidade'}.issubset(estoque.columns):
        st.error("❌ Estoque precisa ter colunas 'Item', 'Prefixo' e 'Quantidade'")
    else:
        estrutura = estrutura[['Item', 'Quantidade']]
        estoque = estoque[['Item', 'Prefixo', 'Quantidade']]

        if st.button("✅ Executar Análise"):
            with st.spinner("🔍 Analisando os dados..."):
                resultado_df = aplicar_regras_com_alertas(estrutura, estoque, destino, qtd_equipamentos)
                st.success("✅ Análise concluída!")
                st.dataframe(resultado_df)

                # Exportação para Excel
                buffer = io.BytesIO()
                resultado_df.to_excel(buffer, index=False)
                buffer.seek(0)
                st.download_button("📥 Baixar Resultado", data=buffer, file_name="resultado_estoque.xlsx")

        if st.button("🔄 Nova Análise"):
            st.experimental_rerun()

            
