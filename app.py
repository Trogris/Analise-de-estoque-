import streamlit as st
import pandas as pd
import io
import unicodedata
import re

def normalizar_texto(texto):
    """
    Normaliza texto removendo acentos, espaços extras e convertendo para minúsculas
    """
    if pd.isna(texto):
        return ""
    
    # Converter para string e minúsculas
    texto = str(texto).lower().strip()
    
    # Remover acentos
    texto = unicodedata.normalize('NFD', texto)
    texto = ''.join(char for char in texto if unicodedata.category(char) != 'Mn')
    
    # Remover espaços extras e caracteres especiais
    texto = re.sub(r'[^a-z0-9]', '', texto)
    
    return texto

def detectar_coluna(colunas, padroes_busca):
    """
    Detecta uma coluna baseada em padrões de busca flexíveis
    """
    colunas_normalizadas = {normalizar_texto(col): col for col in colunas}
    
    for padrao in padroes_busca:
        padrao_normalizado = normalizar_texto(padrao)
        
        # Busca exata
        if padrao_normalizado in colunas_normalizadas:
            return colunas_normalizadas[padrao_normalizado]
        
        # Busca parcial (contém o padrão)
        for col_norm, col_orig in colunas_normalizadas.items():
            if padrao_normalizado in col_norm:
                return col_orig
    
    return None

def mapear_colunas_automaticamente(df, tipo_arquivo):
    """
    Mapeia automaticamente as colunas baseado no tipo de arquivo
    """
    colunas = list(df.columns)
    mapeamento = {}
    
    if tipo_arquivo == "estrutura":
        # Padrões para identificar coluna de código/item
        padroes_codigo = [
            'codigo', 'código', 'item', 'cod', 'code', 'product', 'produto',
            'part', 'parte', 'material', 'componente', 'id'
        ]
        
        # Padrões para identificar coluna de quantidade
        padroes_quantidade = [
            'quantidade', 'qtd', 'qty', 'quant', 'qtde', 'qnt',
            'volume', 'total', 'amount', 'valor'
        ]
        
        mapeamento['Item'] = detectar_coluna(colunas, padroes_codigo)
        mapeamento['Quantidade'] = detectar_coluna(colunas, padroes_quantidade)
        
    elif tipo_arquivo == "estoque":
        # Padrões para identificar coluna de código/item
        padroes_codigo = [
            'codigo', 'código', 'item', 'cod', 'code', 'product', 'produto',
            'part', 'parte', 'material', 'componente', 'id'
        ]
        
        # Padrões para identificar coluna de tipo/prefixo
        padroes_tipo = [
            'tp', 'tipo', 'type', 'prefixo', 'prefix', 'categoria',
            'class', 'classe', 'group', 'grupo'
        ]
        
        # Padrões para identificar coluna de saldo/quantidade
        padroes_saldo = [
            'saldo', 'saldoemestoque', 'saldo em estoque', 'estoque',
            'quantidade', 'qtd', 'qty', 'quant', 'qtde', 'qnt',
            'balance', 'stock', 'inventory', 'disponivel'
        ]
        
        mapeamento['Item'] = detectar_coluna(colunas, padroes_codigo)
        mapeamento['Prefixo'] = detectar_coluna(colunas, padroes_tipo)
        mapeamento['Quantidade'] = detectar_coluna(colunas, padroes_saldo)
    
    return mapeamento

def aplicar_mapeamento_colunas(df, mapeamento):
    """
    Aplica o mapeamento de colunas ao DataFrame
    """
    # Criar um novo DataFrame apenas com as colunas mapeadas
    df_mapeado = pd.DataFrame()
    
    for nome_padrao, coluna_original in mapeamento.items():
        if coluna_original and coluna_original in df.columns:
            df_mapeado[nome_padrao] = df[coluna_original]
    
    return df_mapeado

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

def calcular_saldo_total_estoque(estoque):
    """
    Calcula o saldo total do estoque somando apenas os prefixos PL, PV, RP, MP e AA
    """
    prefixos_alvo = ['PL', 'PV', 'RP', 'MP', 'AA']
    
    # Filtrar apenas os itens com os prefixos desejados
    estoque_filtrado = estoque[estoque['Prefixo'].isin(prefixos_alvo)]
    
    # Calcular soma por prefixo
    soma_por_prefixo = estoque_filtrado.groupby('Prefixo')['Quantidade'].sum()
    
    # Calcular total
    total_saldo_estoque = soma_por_prefixo.sum()
    
    return soma_por_prefixo, total_saldo_estoque

# Configuração da interface
st.set_page_config(layout="centered")
st.title("📘 Análise de Estoque para Produção")

# Botão Nova Análise no topo
col1, col2 = st.columns([3, 1])
with col2:
    if st.button("🔄 Nova Análise", type="secondary"):
        # Limpar cache e reiniciar a aplicação
        st.cache_data.clear()
        st.rerun()

estrutura_file = st.file_uploader("📥 Importe a Estrutura do Produto (.xlsx ou .csv)", type=["xlsx", "csv"])
estoque_file = st.file_uploader("📥 Importe o Estoque Atual (.xlsx ou .csv)", type=["xlsx", "csv"])

destino = st.selectbox("Código de Destino", ["PL", "PV"])
qtd_equipamentos = st.number_input("Quantidade de Equipamentos a Produzir", min_value=1, value=1)

if estrutura_file and estoque_file:
    try:
        # Detecta tipo de arquivo e lê corretamente
        if estrutura_file.name.endswith('.csv'):
            estrutura_original = pd.read_csv(estrutura_file)
        else:
            estrutura_original = pd.read_excel(estrutura_file)

        if estoque_file.name.endswith('.csv'):
            estoque_original = pd.read_csv(estoque_file)
        else:
            estoque_original = pd.read_excel(estoque_file)

        # NOVO: Detecção automática de colunas
        st.info("🔍 Detectando colunas automaticamente...")
        
        # Mapear colunas automaticamente
        mapeamento_estrutura = mapear_colunas_automaticamente(estrutura_original, "estrutura")
        mapeamento_estoque = mapear_colunas_automaticamente(estoque_original, "estoque")
        
        # Mostrar mapeamento detectado
        with st.expander("🔧 Mapeamento de Colunas Detectado", expanded=False):
            st.write("**Estrutura do Produto:**")
            for padrao, original in mapeamento_estrutura.items():
                if original:
                    st.write(f"  • {padrao}: `{original}`")
                else:
                    st.write(f"  • {padrao}: ❌ Não encontrada")
            
            st.write("**Estoque:**")
            for padrao, original in mapeamento_estoque.items():
                if original:
                    st.write(f"  • {padrao}: `{original}`")
                else:
                    st.write(f"  • {padrao}: ❌ Não encontrada")
        
        # Aplicar mapeamento
        estrutura = aplicar_mapeamento_colunas(estrutura_original, mapeamento_estrutura)
        estoque = aplicar_mapeamento_colunas(estoque_original, mapeamento_estoque)
        
        # Verificação de colunas obrigatórias
        estrutura_ok = {'Item', 'Quantidade'}.issubset(estrutura.columns) and not estrutura.empty
        estoque_ok = {'Item', 'Prefixo', 'Quantidade'}.issubset(estoque.columns) and not estoque.empty
        
        if not estrutura_ok:
            st.error("❌ Não foi possível identificar as colunas necessárias na Estrutura do Produto")
            st.write("**Colunas necessárias:** Item/Código e Quantidade")
            st.write(f"**Colunas encontradas:** {list(estrutura_original.columns)}")
        elif not estoque_ok:
            st.error("❌ Não foi possível identificar as colunas necessárias no Estoque")
            st.write("**Colunas necessárias:** Item/Código, Tipo/Prefixo e Saldo/Quantidade")
            st.write(f"**Colunas encontradas:** {list(estoque_original.columns)}")
        else:
            st.success("✅ Colunas identificadas com sucesso!")
            
            # NOVA FUNCIONALIDADE: Mostrar saldo total do estoque por prefixos
            st.subheader("📊 Saldo Total do Estoque por Prefixos")
            
            soma_por_prefixo, total_saldo_estoque = calcular_saldo_total_estoque(estoque)
            
            # Criar DataFrame para exibição
            df_saldo_resumo = pd.DataFrame({
                'Prefixo': soma_por_prefixo.index,
                'Saldo em Estoque': soma_por_prefixo.values
            })
            
            # Adicionar linha de total
            df_total = pd.DataFrame({
                'Prefixo': ['TOTAL (PL+PV+RP+MP+AA)'],
                'Saldo em Estoque': [total_saldo_estoque]
            })
            
            df_saldo_completo = pd.concat([df_saldo_resumo, df_total], ignore_index=True)
            
            # Exibir tabela com formatação
            st.dataframe(
                df_saldo_completo.style.format({'Saldo em Estoque': '{:,.2f}'}),
                use_container_width=True
            )
            
            # Destacar o total
            st.metric(
                label="🎯 Saldo Total do Estoque (PL+PV+RP+MP+AA)",
                value=f"{total_saldo_estoque:,.2f}"
            )

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
    
    except Exception as e:
        st.error(f"❌ Erro ao processar os arquivos: {str(e)}")
        st.write("Verifique se os arquivos estão no formato correto e tente novamente.")

# Rodapé com informações
st.markdown("---")
st.markdown("💡 **Dica:** O sistema detecta automaticamente diferentes variações nos nomes das colunas (código/CÓDIGO/Código, quantidade/QTD/qtde, etc.)")
st.markdown("🔧 **Suporte:** Aceita arquivos Excel (.xlsx) e CSV (.csv) com diferentes formatos de coluna")
