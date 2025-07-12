import streamlit as st
import pandas as pd
import io
import re

def extrair_sufixo_codigo(codigo):
    """
    Extrai o sufixo numérico do código (últimos 7 caracteres)
    Ex: PV0020019 -> 0020019
    """
    if len(codigo) >= 7:
        return codigo[-7:]
    return codigo

def calcular_custo_unitario(estoque, sufixo):
    """
    Calcula o custo unitário médio baseado no valor total do estoque
    """
    # Buscar todos os registros com o mesmo sufixo
    registros_item = estoque[estoque['CODIGO'].str.endswith(sufixo, na=False)]
    
    if registros_item.empty:
        return 0.0
    
    # Verificar se existe coluna de valor (possíveis nomes)
    colunas_valor = ['VALOR TOTAL', 'VALOR_TOTAL', 'VALOR', 'CUSTO TOTAL', 'CUSTO_TOTAL', 'CUSTO']
    coluna_valor = None
    
    for col in colunas_valor:
        if col in registros_item.columns:
            coluna_valor = col
            break
    
    if coluna_valor is None:
        return 0.0  # Sem informação de valor
    
    # Calcular custo unitário médio
    valor_total = registros_item[coluna_valor].sum()
    quantidade_total = registros_item['SALDO EM ESTOQUE'].sum()
    
    if quantidade_total > 0:
        return valor_total / quantidade_total
    else:
        return 0.0

def aplicar_regras_com_alertas(estrutura, estoque, destino, qtd_equipamentos):
    resultado = []
    estrutura['Quantidade'] = estrutura['Quantidade'] * qtd_equipamentos
    estrutura_group = estrutura.groupby('Item')['Quantidade'].sum().reset_index()

    for _, row in estrutura_group.iterrows():
        item = row['Item']
        qtde_necessaria = row['Quantidade']
        
        # CORREÇÃO PRINCIPAL: Buscar por sufixo do código
        sufixo = extrair_sufixo_codigo(item)
        saldos_item = estoque[estoque['CODIGO'].str.endswith(sufixo, na=False)]

        # Calcular saldos por prefixo (TP) de TODOS os códigos encontrados
        # INCLUINDO OI (Outros Insumos)
        codigos = {
            'PL': saldos_item[saldos_item['TP'] == 'PL']['SALDO EM ESTOQUE'].sum(),
            'PV': saldos_item[saldos_item['TP'] == 'PV']['SALDO EM ESTOQUE'].sum(),
            'RP': saldos_item[saldos_item['TP'] == 'RP']['SALDO EM ESTOQUE'].sum(),
            'MP': saldos_item[saldos_item['TP'] == 'MP']['SALDO EM ESTOQUE'].sum(),
            'AA': saldos_item[saldos_item['TP'] == 'AA']['SALDO EM ESTOQUE'].sum(),
            'OI': saldos_item[saldos_item['TP'] == 'OI']['SALDO EM ESTOQUE'].sum()  # NOVO: OI incluído
        }

        # Total disponível = soma de TODOS os prefixos encontrados (incluindo OI)
        total_disponivel = sum(codigos.values())

        # Lógica de transposição baseada no destino selecionado
        total_direto = codigos[destino]
        falta = qtde_necessaria - total_direto

        status = "Ok" if falta <= 0 else ""
        alertas = []
        qtd_comprar = 0  # NOVO: Quantidade para comprar

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
                # NOVO: OI apenas como alerta informativo (sem transposição)
                if codigos['OI'] > 0:
                    alertas.append(f"OI → {destino}: {int(codigos['OI'])} unidades disponíveis ⚠️")

                saldo_alternativo = sum(v for k, v in codigos.items() if k != destino)
                saldo_completo = total_direto + saldo_alternativo

                if saldo_completo < qtde_necessaria:
                    falta_final = qtde_necessaria - saldo_completo
                    qtd_comprar = falta_final  # NOVO: Quantidade para comprar
                    status = f"🔴 Comprar {int(falta_final)} unidades"
                else:
                    status = "🟡 Requer decisão"

                if not alertas:
                    alertas.append("Nenhum saldo alternativo disponível ⚠️")

        else:
            status = "🟢 Ok"

        # NOVO: Calcular custo estimado da compra
        custo_unitario = calcular_custo_unitario(estoque, sufixo)
        custo_estimado = custo_unitario * qtd_comprar if qtd_comprar > 0 else 0.0

        resultado.append({
            'Item': item,
            'Qtd Necessária': qtde_necessaria,
            'Total': total_disponivel,  # Soma de TODOS os prefixos encontrados (incluindo OI)
            **codigos,  # Mostra cada prefixo individualmente (incluindo OI)
            'Status': status,
            'Alerta': " | ".join(alertas),
            'Qtd Comprar': qtd_comprar,  # NOVO: Quantidade para comprar
            'Custo Unit. (R$)': custo_unitario,  # NOVO: Custo unitário
            'Custo Estimado (R$)': custo_estimado  # NOVO: Custo estimado da compra
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
    total_unidades_comprar = resultado_df['Qtd Comprar'].sum()
    
    # NOVO: Custo total estimado da compra
    custo_total_estimado = resultado_df['Custo Estimado (R$)'].sum()
    
    # Percentuais
    perc_compra = (itens_compra / total_itens * 100) if total_itens > 0 else 0
    perc_disponivel = (itens_disponiveis / total_itens * 100) if total_itens > 0 else 0
    
    return {
        'total_itens': total_itens,
        'total_itens_compra': itens_compra,
        'total_unidades_comprar': total_unidades_comprar,
        'custo_total_estimado': custo_total_estimado,  # NOVO
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
    
    .metric-subtitle {
        font-size: 0.85rem;
        color: #6c757d;
        margin-top: 0.5rem;
    }
    
    .metric-subvalue {
        font-size: 1.2rem;
        font-weight: bold;
        color: #495057;
        margin-top: 0.25rem;
    }
    
    .cost-container {
        background-color: #e8f5e8;
        padding: 1rem;
        border-radius: 0.5rem;
        border-left: 4px solid #28a745;
        margin-bottom: 1rem;
    }
    
    @media (max-width: 768px) {
        .metric-value {
            font-size: 1.2rem;
        }
        .metric-subvalue {
            font-size: 1rem;
        }
        .metric-title {
            font-size: 0.8rem;
        }
        .metric-subtitle {
            font-size: 0.75rem;
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

                # TÍTULO ALTERADO CONFORME SOLICITADO
                st.subheader("📋 Análise detalhada")
                
                # CONFIGURAR TABELA PARA COMEÇAR DO ÍNDICE 1
                resultado_df_display = resultado_df.copy()
                resultado_df_display.index = range(1, len(resultado_df_display) + 1)
                
                # Formatar colunas de custo para exibição
                resultado_df_display['Custo Unit. (R$)'] = resultado_df_display['Custo Unit. (R$)'].apply(lambda x: f"R$ {x:.2f}" if x > 0 else "N/A")
                resultado_df_display['Custo Estimado (R$)'] = resultado_df_display['Custo Estimado (R$)'].apply(lambda x: f"R$ {x:.2f}" if x > 0 else "-")
                
                st.dataframe(resultado_df_display, use_container_width=True)

                # SEÇÃO: NECESSIDADES DE COMPRA (RESPONSIVA COM NOVA ORGANIZAÇÃO)
                st.subheader("📈 Necessidades de Compra")
                
                # Calcular estatísticas
                stats = calcular_estatisticas_finais(resultado_df)
                
                # Layout responsivo para as métricas - NOVA ORGANIZAÇÃO
                col1, col2 = st.columns(2)
                
                with col1:
                    # Métrica 1: Total analisados + % disponíveis
                    st.markdown(f"""
                    <div class="metric-container">
                        <div class="metric-title">📊 Total de itens analisados</div>
                        <div class="metric-value">{stats['total_itens']}</div>
                        <div class="metric-subtitle">🟢 Percentual de itens disponíveis em estoque</div>
                        <div class="metric-subvalue">{stats['perc_disponivel']:.1f}%</div>
                    </div>
                    """, unsafe_allow_html=True)
                
                with col2:
                    # Métrica 2: Total para comprar + % precisam comprar
                    st.markdown(f"""
                    <div class="metric-container">
                        <div class="metric-title">🛒 Total de itens para comprar</div>
                        <div class="metric-value">{stats['total_itens_compra']}</div>
                        <div class="metric-subtitle">🔴 Percentual de itens que precisam ser comprados</div>
                        <div class="metric-subvalue">{stats['perc_compra']:.1f}%</div>
                    </div>
                    """, unsafe_allow_html=True)

                # NOVO: Seção de Custo Estimado
                if stats['custo_total_estimado'] > 0:
                    st.subheader("💰 Custo Estimado da Compra")
                    
                    col1, col2 = st.columns(2)
                    
                    with col1:
                        st.markdown(f"""
                        <div class="cost-container">
                            <div class="metric-title">💵 Total de unidades para comprar</div>
                            <div class="metric-value">{int(stats['total_unidades_comprar'])}</div>
                        </div>
                        """, unsafe_allow_html=True)
                    
                    with col2:
                        st.markdown(f"""
                        <div class="cost-container">
                            <div class="metric-title">💰 Custo total estimado</div>
                            <div class="metric-value">R$ {stats['custo_total_estimado']:,.2f}</div>
                        </div>
                        """, unsafe_allow_html=True)
                    
                    st.info("💡 **Custo calculado baseado no valor médio do estoque atual. Valores reais podem variar conforme fornecedor e condições de mercado.**")

                # POSIÇÃO ORIGINAL DOS BOTÕES (mantida exatamente como no código original)
                if st.button("🔄 Nova Análise"):
                    st.rerun()

                buffer = io.BytesIO()
                resultado_df.to_excel(buffer, index=False)
                buffer.seek(0)
                st.download_button("⬇️ Baixar Relatório Completo", data=buffer, file_name="analise_estoque.xlsx")
