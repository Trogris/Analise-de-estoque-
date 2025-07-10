import streamlit as st
import pandas as pd
import io
import re

def aplicar_regras_com_alertas(estrutura, estoque, destino, qtd_equipamentos):
    resultado = []
    estrutura['Quantidade'] = estrutura['Quantidade'] * qtd_equipamentos
    estrutura_group = estrutura.groupby('Item')['Quantidade'].sum().reset_index()

    for _, row in estrutura_group.iterrows():
        item = row['Item']
        qtde_necessaria = row['Quantidade']
        saldos_item = estoque[estoque['CODIGO'] == item]

        codigos = {
            'PL': saldos_item[saldos_item['TP'] == 'PL']['SALDO EM ESTOQUE'].sum(),
            'PV': saldos_item[saldos_item['TP'] == 'PV']['SALDO EM ESTOQUE'].sum(),
            'RP': saldos_item[saldos_item['TP'] == 'RP']['SALDO EM ESTOQUE'].sum(),
            'MP': saldos_item[saldos_item['TP'] == 'MP']['SALDO EM ESTOQUE'].sum(),
            'AA': saldos_item[saldos_item['TP'] == 'AA']['SALDO EM ESTOQUE'].sum()
        }

        # Calcular total disponível
        total_disponivel = sum(codigos.values())

        total_direto = codigos[destino]
        falta = qtde_necessaria - total_direto

        status = "Ok" if falta <= 0 else ""
        alertas = []

        if status != "Ok":
            # REGRAS EXATAS DO CÓDIGO ORIGINAL:
            if destino == 'PL' and codigos['PV'] >= falta:
                status = f"🟡 Transpor {int(falta)} de PV para PL"
            elif destino == 'PV' and codigos['PL'] >= falta:
                status = f"🟡 Transpor {int(falta)} de PL para PV"
            elif destino == 'PL' and codigos['RP'] >= falta:  # RP só para PL!
                status = f"🟡 Transpor {int(falta)} de RP para PL"
            else:
                # ALERTAS EXATOS DO CÓDIGO ORIGINAL:
                if codigos['RP'] > 0:
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
            'Total': total_disponivel,  # COLUNA TOTAL
            **codigos,
            'Status': status,
            'Alerta': " | ".join(alertas)
        })

    return pd.DataFrame(resultado)

def calcular_estatisticas_finais(resultado_df):
    """
    Calcula as estatísticas específicas solicitadas pelo usuário
    """
    total_itens = len(resultado_df)
    
    # Contar itens que precisam compra vs disponíveis
    itens_compra = len(resultado_df[resultado_df['Status'].str.contains('🔴 Comprar')])
    itens_disponiveis = total_itens - itens_compra  # OK + Transposição + Decisão
    
    # Total de unidades para comprar
    total_unidades_comprar = 0
    for _, row in resultado_df.iterrows():
        if '🔴 Comprar' in row['Status']:
            # Extrair número do status
            match = re.search(r'Comprar (\d+)', row['Status'])
            if match:
                total_unidades_comprar += int(match.group(1))
    
    # Percentuais
    perc_compra = (itens_compra / total_itens * 100) if total_itens > 0 else 0
    perc_disponivel = (itens_disponiveis / total_itens * 100) if total_itens > 0 else 0
    
    return {
        'total_itens': total_itens,
        'total_itens_compra': itens_compra,
        'perc_compra': perc_compra,
        'perc_disponivel': perc_disponivel
    }

# Configuração da página para layout responsivo
st.set_page_config(
    page_title="Análise de Estoque",
    layout="wide",
    initial_sidebar_state="collapsed"
)

# CSS personalizado para responsividade
st.markdown("""
<style>
    .main .block-container {
        padding-top: 2rem;
        padding-bottom: 2rem;
        max-width: 100%;
    }
    
    .metric-container {
        background-color: #f8f9fa;
        padding: 1rem;
        border-radius: 0.5rem;
        border-left: 4px solid #007bff;
        margin-bottom: 1rem;
    }
    
    .metric-title {
        font-size: 0.9rem;
        color: #6c757d;
        margin-bottom: 0.25rem;
    }
    
    .metric-value {
        font-size: 1.5rem;
        font-weight: bold;
        color: #212529;
    }
    
    @media (max-width: 768px) {
        .metric-value {
            font-size: 1.2rem;
        }
        .metric-title {
            font-size: 0.8rem;
        }
    }
</style>
""", unsafe_allow_html=True)

st.title("🔍 Análise de Estoque")

estrutura_file = st.file_uploader("📦 Importe a Estrutura do Produto (Excel)", type=["xls", "xlsx"])
estoque_file = st.file_uploader("🏷️ Importe o Estoque Atual (Excel)", type=["xls", "xlsx"])

destino = st.selectbox("🔧 Tipo de Produção (Prefixo Destino)", ["PV", "PL"])
qtd_equipamentos = st.number_input("🔢 Quantidade de Equipamentos a Produzir", min_value=1, value=1, step=1)

if estrutura_file and estoque_file:
    estrutura = pd.read_excel(estrutura_file)
    estoque = pd.read_excel(estoque_file)

    # Renomeação robusta de colunas
    if 'Código' in estrutura.columns:
        estrutura = estrutura.rename(columns={'Código': 'Item'})
    if 'CODIGO' in estrutura.columns:
        estrutura = estrutura.rename(columns={'CODIGO': 'Item'})

    if not {'Item', 'Quantidade'}.issubset(estrutura.columns):
        st.error("❌ A planilha de estrutura precisa conter as colunas: 'Item' e 'Quantidade'")
    elif not {'CODIGO', 'TP', 'SALDO EM ESTOQUE'}.issubset(estoque.columns):
        st.error("❌ A planilha de estoque precisa conter as colunas: 'CODIGO', 'TP' e 'SALDO EM ESTOQUE'")
    else:
        estrutura = estrutura[['Item', 'Quantidade']]

        if st.button("✅ Executar Análise"):
            with st.spinner("Analisando os dados..."):
                # Análise detalhada
                resultado_df = aplicar_regras_com_alertas(estrutura, estoque, destino, qtd_equipamentos)
                
                st.success("Análise concluída!")

                st.subheader("📋 Análise Detalhada por Item")
                st.dataframe(resultado_df, use_container_width=True)

                # SEÇÃO: NECESSIDADES DE COMPRA (RESPONSIVA)
                st.subheader("📈 Necessidades de Compra")
                
                # Calcular estatísticas
                stats = calcular_estatisticas_finais(resultado_df)
                
                # Layout responsivo para as métricas
                col1, col2 = st.columns(2)
                
                with col1:
                    # Métrica 1
                    st.markdown(f"""
                    <div class="metric-container">
                        <div class="metric-title">📊 Total de itens analisados</div>
                        <div class="metric-value">{stats['total_itens']}</div>
                    </div>
                    """, unsafe_allow_html=True)
                    
                    # Métrica 3
                    st.markdown(f"""
                    <div class="metric-container">
                        <div class="metric-title">🔴 Percentual de itens que precisam de compra</div>
                        <div class="metric-value">{stats['perc_compra']:.1f}%</div>
                    </div>
                    """, unsafe_allow_html=True)
                
                with col2:
                    # Métrica 2
                    st.markdown(f"""
                    <div class="metric-container">
                        <div class="metric-title">🛒 Total de itens para comprar</div>
                        <div class="metric-value">{stats['total_itens_compra']}</div>
                    </div>
                    """, unsafe_allow_html=True)
                    
                    # Métrica 4
                    st.markdown(f"""
                    <div class="metric-container">
                        <div class="metric-title">🟢 Percentual de itens disponíveis em estoque</div>
                        <div class="metric-value">{stats['perc_disponivel']:.1f}%</div>
                    </div>
                    """, unsafe_allow_html=True)

                # POSIÇÃO ORIGINAL DOS BOTÕES (mantida exatamente como no código original)
                if st.button("🔄 Nova Análise"):
                    st.rerun()

                buffer = io.BytesIO()
                resultado_df.to_excel(buffer, index=False)
                buffer.seek(0)
                st.download_button("⬇️ Baixar Relatório Completo", data=buffer, file_name="analise_estoque.xlsx")



