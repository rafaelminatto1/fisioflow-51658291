# Revisão visual da Biblioteca de Protocolos

## Objetivo

Alinhar a Biblioteca de Protocolos ao design system FisioFlow/Activity preservando filtros, regras clínicas, rotas, dados e operações de criação, edição e exclusão.

## Decisão de produto

Manter todos os filtros: tipo, região, evidência, duração, ordenação e filtros rápidos. Esses critérios são necessários para descoberta clínica e triagem de segurança; serão reorganizados, não removidos.

## Design

- Cabeçalho com título, total e ação primária “Novo Protocolo”.
- Indicadores compactos de total, alta evidência, pós-operatório e restrições.
- Busca e filtros principais visíveis; filtros rápidos em chips e feedback claro para critérios ativos e limpeza.
- Cards planos com borda sutil, raio de 16px e sombra somente em hover.
- Azul Activity limitado a ações e seleção; evidência e segurança usam cores semânticas.
- Grade, lista e detalhe atual permanecem, assim como estados de carregamento, vazio e confirmação de exclusão.

## Limites e validação

- Não alterar hook, APIs, dados, critérios de filtragem, ordenação ou modal de detalhe.
- Não remover filtros nem mudar URLs.
- Validar typecheck, lint e os fluxos de busca, filtros, seleção de visualização, abertura, edição e exclusão.
