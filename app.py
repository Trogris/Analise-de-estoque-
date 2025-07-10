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
        saldos_item = estoque[estoque['Item'] == item]

        codigos = {
            'PL': saldos_item[saldos_item['Prefixo'] == 'PL']['Quantidade'].sum(),
            'PV': saldos_item[saldos_item['Prefixo'] == 'PV']['Quantidade'].sum(),
            'RP': saldos_item[saldos_item['Prefixo'] == 'RP']['Quantidade'].sum(),
            'MP': saldos_item[saldos_item['Prefixo'] == 'MP']['Quantidade'].sum(),
            'AA': saldos_item[saldos_item['Prefixo'] == 'AA']['Quantidade'].sum()
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

def calcular_resumo_necessidades(estrutura, estoque, destino, qtd_equipamentos):
    """
    Calcula resumo consolidado das necessidades por prefixo
    """
    # Calcular necessidades totais por item
    estrutura_calc = estrutura.copy()
    estrutura_calc['Quantidade'] = estrutura_calc['Quantidade'] * qtd_equipamentos
    estrutura_group = estrutura_calc.groupby('Item')['Quantidade'].sum().reset_index()
    
    # Inicializar contadores
    necessidades_por_prefixo = {
        'PL': 0, 'PV': 0, 'RP': 0, 'MP': 0, 'AA': 0
    }
    
    disponivel_por_prefixo = {
        'PL': 0, 'PV': 0, 'RP': 0, 'MP': 0, 'AA': 0
    }
    
    # Para cada item necessário
    for _, row in estrutura_group.iterrows():
        item = row['Item']
        qtde_necessaria = row['Quantidade']
        
        # Buscar no estoque
        saldos_item = estoque[estoque['Item'] == item]
        
        if not saldos_item.empty:
            # Somar disponível por prefixo para este item
            for prefixo in ['PL', 'PV', 'RP', 'MP', 'AA']:
                disponivel = saldos_item[saldos_item['Prefixo'] == prefixo]['Quantidade'].sum()
                disponivel_por_prefixo[prefixo] += disponivel
        
        # A necessidade vai para o prefixo de destino
        necessidades_por_prefixo[destino] += qtde_necessaria
    
    # Calcular saldo (disponível - necessário)
    saldo_por_prefixo = {}
    for prefixo in ['PL', 'PV', 'RP', 'MP', 'AA']:
        saldo_por_prefixo[prefixo] = disponivel_por_prefixo[prefixo] - necessidades_por_prefixo[prefixo]
    
    return necessidades_por_prefixo, disponivel_por_prefixo, saldo_por_prefixo

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
        'total_unidades_comprar': total_unidades_comprar,
        'perc_compra': perc_compra,
        'perc_disponivel': perc_disponivel
    }

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
                # Resumo consolidado
                necessidades, disponivel, saldo = calcular_resumo_necessidades(estrutura, estoque, destino, qtd_equipamentos)
                
                # Análise detalhada original
                resultado_df = aplicar_regras_com_alertas(estrutura, estoque, destino, qtd_equipamentos)
                
                st.success("Análise concluída!")

                # Mostrar resumo consolidado primeiro
                st.subheader("📊 Resumo Consolidado por Prefixo")
                
                # Criar DataFrame do resumo
                resumo_df = pd.DataFrame({
                    'Prefixo': ['PL', 'PV', 'RP', 'MP', 'AA'],
                    'Necessário': [necessidades[p] for p in ['PL', 'PV', 'RP', 'MP', 'AA']],
                    'Disponível': [disponivel[p] for p in ['PL', 'PV', 'RP', 'MP', 'AA']],
                    'Saldo': [saldo[p] for p in ['PL', 'PV', 'RP', 'MP', 'AA']]
                })
                
                # Destacar o prefixo de destino
                def highlight_destino(row):
                    if row['Prefixo'] == destino:
                        return ['background-color: #e6f3ff'] * len(row)
                    return [''] * len(row)
                
                st.dataframe(
                    resumo_df.style.apply(highlight_destino, axis=1).format({
                        'Necessário': '{:.0f}',
                        'Disponível': '{:.0f}',
                        'Saldo': '{:.0f}'
                    }),
                    use_container_width=True
                )
                
                # Métricas principais
                col1, col2, col3 = st.columns(3)
                with col1:
                    st.metric(
                        f"🎯 Necessário para {destino}",
                        f"{necessidades[destino]:.0f}",
                        help=f"Total necessário para produzir {qtd_equipamentos} equipamento(s)"
                    )
                with col2:
                    st.metric(
                        f"📦 Disponível em {destino}",
                        f"{disponivel[destino]:.0f}",
                        help=f"Total disponível no estoque com prefixo {destino}"
                    )
                with col3:
                    saldo_destino = saldo[destino]
                    delta_color = "normal" if saldo_destino >= 0 else "inverse"
                    st.metric(
                        f"⚖️ Saldo {destino}",
                        f"{saldo_destino:.0f}",
                        delta=f"{'Sobra' if saldo_destino >= 0 else 'Falta'}: {abs(saldo_destino):.0f}",
                        delta_color=delta_color,
                        help="Diferença entre disponível e necessário"
                    )

                st.subheader("📋 Análise Detalhada por Item")
                st.dataframe(resultado_df)

                # NOVA SEÇÃO: ESTATÍSTICAS FINAIS
                st.subheader("📈 Necessidades de Compra")
                
                # Calcular estatísticas
                stats = calcular_estatisticas_finais(resultado_df)
                
                # Mostrar estatísticas em formato de métricas
                col1, col2, col3, col4 = st.columns(4)
                
                with col1:
                    st.metric(
                        "📊 Total de itens analisados",
                        f"{stats['total_itens']}",
                        help="Número total de itens únicos analisados"
                    )
                
                with col2:
                    st.metric(
                        "🛒 Total de unidades para comprar",
                        f"{stats['total_unidades_comprar']:,}",
                        help="Soma de todas as unidades que precisam ser compradas"
                    )
                
                with col3:
                    st.metric(
                        "🔴 Percentual de itens que precisam de compra",
                        f"{stats['perc_compra']:.1f}%",
                        help="Percentual de itens que requerem compra"
                    )
                
                with col4:
                    st.metric(
                        "🟢 Percentual de itens disponíveis em estoque",
                        f"{stats['perc_disponivel']:.1f}%",
                        help="Percentual de itens que já estão disponíveis ou podem ser resolvidos com transposição"
                    )

                # POSIÇÃO ORIGINAL DOS BOTÕES (mantida exatamente como no código original)
                if st.button("🔄 Nova Análise"):
                    st.rerun()

                buffer = io.BytesIO()
                resultado_df.to_excel(buffer, index=False)
                buffer.seek(0)
                st.download_button("⬇️ Baixar Relatório Completo", data=buffer, file_name="analise_estoque.xlsx")

