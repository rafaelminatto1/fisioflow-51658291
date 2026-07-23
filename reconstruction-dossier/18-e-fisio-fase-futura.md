# 18 — E-Fisio (Fase Futura, Baixa Prioridade)

> Fonte externa: https://e-fisio.wiki.br/ — **NÃO** foi feito crawl nesta auditoria (fase opcional, não deve atrasar o dossiê principal). Este documento registra apenas o enquadramento conceitual e um fluxo proposto. Nada foi copiado.

## Escopo desta passada

Apenas o enquadramento. Não inspecionamos estrutura/sitemap/taxonomia da e-fisio.wiki.br nesta rodada (registrado como lacuna — QA-EFISIO-01). A integração com a base de conhecimento interna (`wiki_pages`, `knowledge_articles`, `clinical_embeddings`) é candidata futura, não requisito da reconstrução.

## Fluxo proposto para conteúdo (quando/se autorizado)

1. **Respeitar autorização, licença, termos e robots.txt** da fonte antes de qualquer coleta.
2. **Manter proveniência**: URL, autoria e data de cada fonte.
3. **Produzir conteúdo próprio** a partir de **fontes científicas primárias** (PubMed/NCBI/Europe PMC — já integrados), não paráfrase disfarçada.
4. **Citações** obrigatórias; distinguir educação de recomendação clínica individual.
5. **Versão e data de revisão** por artigo; **revisão por fisioterapeuta qualificado** antes de publicar.
6. **Correção/expiração/remoção** suportadas.
7. **Anti-alucinação**: IA não inventa evidências; usar RAG/busca só quando tecnicamente apropriado (a stack já tem AI Search + Vectorize + PubMed MCP).
8. **Sincronização futura** autorizada e incremental (com rate limiting e validação humana).

## Papel do Hermes (futuro)

Inventário e monitoramento de mudanças na fonte, sempre com limites, rate limiting e validação humana. Hermes indisponível nesta sessão.

## Recomendação

Tratar como iniciativa separada, pós-reconstrução do núcleo. Não bloquear nada por ela.
