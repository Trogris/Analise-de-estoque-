import streamlit as st
import pandas as pd
import io
import re

def extrair_sufixo_codigo(codigo):
    """
    Extrai o sufixo numérico do código (últimos 7 caracteres)
    Ex: PV0040029 -> 0040029
    """
    if len(codigo) >= 7:
        return codigo[-7:]
    return codigo

def detectar_coluna_valor(estoque):
    """
    Detecta automaticamente a coluna de valor/custo na planilha de estoque
    """
    colunas_valor = ['VALOR TOTAL', 'VALOR', 'CUSTO TOTAL', 'CUSTO', 'PRECO TOTAL', 'PRECO', 'VALOR EM ESTOQUE']
    
    for coluna in colunas_valor:
        if coluna in estoque.columns:
            return coluna
    
    # Busca por colunas que contenham essas palavras
    for col in estoque.columns:
        col_upper = str(col).upper()
        if any(palavra in col_upper for palavra in ['VALOR', 'CUSTO', 'PRECO']):
            return col
    
    return None

def calcular_custo_unitario(estoque, sufixo, coluna_valor):
    """
    Calcula o custo unitário médio baseado no estoque atual
    """
    if not coluna_valor:
        return 0, 0
    
    # Buscar todos os registros do mesmo sufixo
    saldos_item = estoque[estoque['CODIGO'].str.endswith(sufixo, na=False)]
    
    if saldos_item.empty:
        return 0, 0
    
    # Somar quantidade total e valor total
    qtd_total = saldos_item['SALDO EM ESTOQUE'].sum()
    valor_total = saldos_item[coluna_valor].sum()
    
    # Calcular custo unitário
    custo_unitario = valor_total / qtd_total if qtd_total > 0 else 0
    
    return custo_unitario, valor_total

def aplicar_regras_com_alertas(estrutura, estoque, destino, qtd_equipamentos):
    resultado = []
    estrutura['Quantidade'] = estrutura['Quantidade'] * qtd_equipamentos
    estrutura_group = estrutura.groupby('Item')['Quantidade'].sum().reset_index()
    
    # Detectar coluna de valor
    coluna_valor = detectar_coluna_valor(estoque)

    for _, row in estrutura_group.iterrows():
        item = row['Item']
        qtde_necessaria = row['Quantidade']
        
        # BUSCAR POR SUFIXO DO CÓDIGO (últimos 7 caracteres)
        sufixo = extrair_sufixo_codigo(item)
        saldos_item = estoque[estoque['CODIGO'].str.endswith(sufixo, na=False)]

        # Calcular saldos por prefixo (TP) de TODOS os códigos encontrados
        # INCLUINDO TODOS OS PREFIXOS POSSÍVEIS
        codigos = {
            'PL': saldos_item[saldos_item['TP'] == 'PL']['SALDO EM ESTOQUE'].sum(),
            'PV': saldos_item[saldos_item['TP'] == 'PV']['SALDO EM ESTOQUE'].sum(),
            'RP': saldos_item[saldos_item['TP'] == 'RP']['SALDO EM ESTOQUE'].sum(),
            'MP': saldos_item[saldos_item['TP'] == 'MP']['SALDO EM ESTOQUE'].sum(),
            'AA': saldos_item[saldos_item['TP'] == 'AA']['SALDO EM ESTOQUE'].sum(),
            'OI': saldos_item[saldos_item['TP'] == 'OI']['SALDO EM ESTOQUE'].sum()
        }

        # CORREÇÃO: Incluir TODOS os outros prefixos encontrados (como RE, etc.)
        outros_prefixos = saldos_item[~saldos_item['TP'].isin(['PL', 'PV', 'RP', 'MP', 'AA', 'OI'])]
        outros_total = outros_prefixos['SALDO EM ESTOQUE'].sum()

        # Total disponível = soma de TODOS os prefixos encontrados
        total_disponivel = sum(codigos.values()) + outros_total

        # Lógica de transposição baseada no destino selecionado
        total_direto = codigos[destino]
        falta = qtde_necessaria - total_direto

        status = "Ok" if falta <= 0 else ""
        alertas = []
        qtd_comprar = 0

        if status != "Ok":
            # REGRAS DE TRANSPOSIÇÃO:
            if destino == 'PL' and codigos['PV'] >= falta:
                status = f"🟡 Transpor {int(falta)} de PV para PL"
            elif destino == 'PV' and codigos['PL'] >= falta:
                status = f"🟡 Transpor {int(falta)} de PL para PV"
            elif destino == 'PL' and codigos['RP'] >= falta:  # RP só para PL!
                status = f"🟡 Transpor {int(falta)} de RP para PL"
            else:
                # ALERTAS INFORMATIVOS:
                if codigos['RP'] > 0:
                    alertas.append(f"RP → {destino}: {int(codigos['RP'])} unidades disponíveis ⚠️")
                if codigos['MP'] > 0:
                    alertas.append(f"MP → {destino}: {int(codigos['MP'])} unidades disponíveis ⚠️")
                if codigos['AA'] > 0:
                    alertas.append(f"AA → {destino}: {int(codigos['AA'])} unidades disponíveis ⚠️")
                # OI apenas como alerta informativo (sem transposição)
                if codigos['OI'] > 0:
                    alertas.append(f"OI → {destino}: {int(codigos['OI'])} unidades disponíveis ⚠️")
                # Outros prefixos como alertas
                if outros_total > 0:
                    outros_lista = outros_prefixos['TP'].unique()
                    for prefixo in outros_lista:
                        qtd_prefixo = outros_prefixos[outros_prefixos['TP'] == prefixo]['SALDO EM ESTOQUE'].sum()
                        alertas.append(f"{prefixo} → {destino}: {int(qtd_prefixo)} unidades disponíveis ⚠️")

                saldo_alternativo = sum(v for k, v in codigos.items() if k != destino) + outros_total
                saldo_completo = total_direto + saldo_alternativo

                if saldo_completo < qtde_necessaria:
                    falta_final = qtde_necessaria - saldo_completo
                    qtd_comprar = int(falta_final)
                    status = f"🔴 Comprar {qtd_comprar} unidades"
                else:
                    status = "🟡 Requer decisão"

                if not alertas:
                    alertas.append("Nenhum saldo alternativo disponível ⚠️")

        else:
            status = "🟢 Ok"

        # Calcular custo unitário e custo estimado
        custo_unitario, valor_total_estoque = calcular_custo_unitario(estoque, sufixo, coluna_valor)
        custo_estimado = custo_unitario * qtd_comprar if qtd_comprar > 0 else 0

        # Formatação garantida dos valores
        if custo_unitario > 0:
            custo_unit_formatado = f"R$ {custo_unitario:.2f}"
        else:
            custo_unit_formatado = "N/A"
        
        custo_est_formatado = f"R$ {custo_estimado:.2f}" if custo_estimado > 0 else "R$ 0,00"

        resultado.append({
            'Item': item,
            'Qtd Necessária': int(qtde_necessaria),
            'Total': int(total_disponivel),  # SOMA DE TODOS OS PREFIXOS
            **{k: int(v) for k, v in codigos.items()},  # Prefixos principais
            'Qtd Comprar': qtd_comprar,
            'Custo Unit. (R$)': custo_unit_formatado,
            'Custo Estimado (R$)': custo_est_formatado,
            'Status': status,
            'Alerta': " | ".join(alertas)
        })

    return pd.DataFrame(resultado), coluna_valor

def calcular_estatisticas_finais(resultado_df):
    """
    Calcula as estatísticas específicas solicitadas pelo usuário
    """
    total_itens = len(resultado_df)
    
    # Contar itens que precisam compra vs disponíveis
    itens_compra = len(resultado_df[resultado_df['Status'].str.contains('🔴 Comprar')])
    itens_disponiveis = total_itens - itens_compra
    
    # Total de unidades para comprar
    total_unidades_comprar = resultado_df['Qtd Comprar'].sum()
    
    # Percentuais
    perc_compra = (itens_compra / total_itens * 100) if total_itens > 0 else 0
    
    return {
        'total_itens': total_itens,
        'total_itens_compra': itens_compra,
        'total_unidades_comprar': total_unidades_comprar,
        'perc_compra': perc_compra
    }

def calcular_valor_total_estimado(resultado_df):
    """
    Calcula o valor total estimado para compra
    """
    valor_total = 0
    for _, row in resultado_df.iterrows():
        if row['Qtd Comprar'] > 0:
            # Extrair valor numérico do custo estimado
            custo_str = str(row['Custo Estimado (R$)']).replace('R$ ', '').replace(',', '.')
            try:
                valor_total += float(custo_str)
            except:
                pass
    
    return valor_total

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
    
    .cost-title {
        font-size: 1.1rem;
        color: #155724;
        margin-bottom: 0.5rem;
        font-weight: bold;
    }
    
    .cost-value {
        font-size: 1.8rem;
        font-weight: bold;
        color: #155724;
    }
    
    .cost-warning {
        font-size: 0.8rem;
        color: #856404;
        margin-top: 0.5rem;
        font-style: italic;
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
        .cost-value {
            font-size: 1.5rem;
        }
        .cost-title {
            font-size: 1rem;
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
                resultado_df, coluna_valor = aplicar_regras_com_alertas(estrutura, estoque, destino, qtd_equipamentos)
                
                st.success("Análise concluída!")

                # Análise detalhada
                st.subheader("📋 Análise detalhada")
                
                # CONFIGURAR TABELA PARA COMEÇAR DO ÍNDICE 1
                resultado_df_display = resultado_df.copy()
                resultado_df_display.index = range(1, len(resultado_df_display) + 1)
                
                st.dataframe(resultado_df_display, use_container_width=True)

                # SEÇÃO: NECESSIDADES DE COMPRA (COM NOVA ORGANIZAÇÃO)
                st.subheader("📈 Necessidades de Compra")
                
                # Calcular estatísticas
                stats = calcular_estatisticas_finais(resultado_df)
                valor_total_estimado = calcular_valor_total_estimado(resultado_df)
                
                # Layout responsivo para as métricas - NOVA ORGANIZAÇÃO
                col1, col2 = st.columns(2)
                
                with col1:
                    # Métrica 1: Total analisados + VALOR TOTAL ESTIMADO (NOVO!)
                    st.markdown(f"""
                    <div class="metric-container">
                        <div class="metric-title">📊 Total de itens analisados</div>
                        <div class="metric-value">{stats['total_itens']}</div>
                        <div class="metric-subtitle">💵 Valor total estimado para compra</div>
                        <div class="metric-subvalue">R$ {valor_total_estimado:,.2f}</div>
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

                # SEÇÃO: CUSTO ESTIMADO DA COMPRA (mantida)
                if coluna_valor:
                    st.subheader("💰 Custo Estimado da Compra")
                    
                    col1, col2 = st.columns(2)
                    
                    with col1:
                        st.markdown(f"""
                        <div class="cost-container">
                            <div class="cost-title">📦 Total de unidades para comprar</div>
                            <div class="cost-value">{stats['total_unidades_comprar']} unidades</div>
                        </div>
                        """, unsafe_allow_html=True)
                    
                    with col2:
                        st.markdown(f"""
                        <div class="cost-container">
                            <div class="cost-title">💵 Custo total estimado</div>
                            <div class="cost-value">R$ {valor_total_estimado:,.2f}</div>
                        </div>
                        """, unsafe_allow_html=True)
                    
                    # Aviso sobre a estimativa
                    st.markdown(f"""
                    <div class="cost-warning">
                        ⚠️ Custo calculado baseado no valor médio do estoque atual (coluna: {coluna_valor}). 
                        Valores reais podem variar conforme fornecedor e condições de mercado.
                    </div>
                    """, unsafe_allow_html=True)
                
                else:
                    st.info("💡 Para calcular o custo estimado da compra, inclua uma coluna de valor/custo na planilha de estoque.")

                # POSIÇÃO ORIGINAL DOS BOTÕES
                if st.button("🔄 Nova Análise"):
                    st.rerun()

                buffer = io.BytesIO()
                resultado_df.to_excel(buffer, index=False)
                buffer.seek(0)
                st.download_button("⬇️ Baixar Relatório Completo", data=buffer, file_name="analise_estoque.xlsx")
