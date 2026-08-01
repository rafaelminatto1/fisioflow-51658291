# Plano de implementação — Testes Clínicos com Claude Design

## 1. Reestruturar estado e filtragem da página

- Atualizar `src/pages/ClinicalTestsLibrary.tsx` para suportar seleção exclusiva de categoria, região ou cluster.
- Derivar estatísticas do catálogo real e manter busca bilíngue, React Query e scroll incremental.
- Adicionar foco da busca pelo atalho `/`, sem capturar eventos em campos editáveis.
- Montar a faixa de clusters usando `diagnosticClusters` e filtrar por `cluster_id`.

## 2. Adaptar cabeçalho e filtros ao Claude Design

- Atualizar `src/components/clinical/ClinicalTestsFilter.tsx` com busca compacta, contagens e grupos de chips.
- Manter controles semânticos, foco visível e layout responsivo.
- Expor a referência do input para o atalho de teclado.

## 3. Adaptar grade e cards

- Atualizar `src/components/clinical/ClinicalTestsGrid.tsx` com mídia, overlays, metadados, evidência e tags no padrão visual importado.
- Mostrar apenas métricas existentes no registro.
- Manter os estados de carregamento, vazio e seleção do teste.
- Adicionar fallback para erro de carregamento das imagens.

## 4. Integrar e preservar fluxos atuais

- Manter criação, edição, exclusão, detalhes e vínculo a protocolo.
- Manter erro de sincronização com nova tentativa.
- Garantir que limpar filtros remova busca, filtro estruturado e cluster.

## 5. Verificar

- Executar formatação/lint direcionado nos arquivos alterados.
- Executar testes direcionados existentes e checagem TypeScript do app web.
- Executar build se as verificações direcionadas não cobrirem a integração.
- Registrar separadamente qualquer falha preexistente fora do escopo.
