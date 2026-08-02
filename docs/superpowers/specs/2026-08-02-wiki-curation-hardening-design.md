# Endurecimento da curadoria operacional da Wiki

## Objetivo

Tornar a Gestão da Biblioteca utilizável em produção e clinicamente segura, eliminando divergências entre banco, API e frontend, sem promover conteúdo legado ou modificar decisões clínicas automaticamente.

## Princípios

- O modelo `knowledge_*` é a fonte canônica do workflow editorial.
- Conteúdo e revisão são versionados; auditoria é produzida apenas pelo servidor.
- Autor e submissor não podem aprovar a própria versão.
- Publicação exige aprovação vigente e explícita.
- Toda mutação operacional usa organização, optimistic locking, idempotência e auditoria.
- Compatibilidade legada deve gerar nova versão canônica ou arquivamento, nunca sobrescrever silenciosamente a história.

## Banco e migrations

1. Criar migration incremental, nunca reexecutar ou reescrever o que já foi aplicado em produção.
2. Alinhar o schema Drizzle às FKs compostas, cascatas, checks, índices parciais, idempotência e ponteiros diferidos do DDL real.
3. Adicionar índices para validade por versão, limpeza de idempotência e busca de título.
4. Remover bootstrap automático de `clinical_review` das instalações futuras. Em produção, preservar o grant existente até existir operação administrativa auditada, evitando indisponibilidade silenciosa.
5. Corrigir IDs determinísticos futuros para UUID RFC; aceitar temporariamente o formato hexadecimal PostgreSQL dos IDs já materializados, sem remapeamento destrutivo.

## API e segurança clínica

1. Definir DTOs explícitos camelCase para fila e detalhe; não devolver linhas SQL cruas.
2. Normalizar pessoa, proveniência, fontes, revisão, prioridade, prazo e validade.
3. Validar autoria/submissão na máquina de estados.
4. Publicar apenas uma versão aprovada com revisão vigente na mesma operação atômica.
5. Consultar validade da última aprovação, não da última ação editorial.
6. Reservar ou substituir chaves idempotentes expiradas atomicamente; aplicar o mesmo protocolo a atribuições.
7. Validar que o responsável pertence à organização e está ativo; gerar evento de auditoria.
8. Bloquear mutações legadas capazes de contornar capabilities e tornar endpoints de auditoria autoritativa somente leitura.

## Sincronização legada

- CREATE materializa item, versão e mapa.
- UPDATE cria nova versão canônica em `draft` e preserva o mapa.
- DELETE/arquivo marca o item canônico como arquivado ou removido conforme a semântica da origem.
- Operações devem ser idempotentes e reconciliáveis; falha de sincronização não pode produzir publicação implícita.

## Frontend

1. Consumir apenas DTOs normalizados.
2. Corrigir filtros de validade e tipo com a taxonomia canônica.
3. Implementar atribuição de responsável, prioridade e prazo.
4. Exibir múltiplas fontes e histórico de revisão.
5. Corrigir interpretação de erros estruturados e conflitos 409.
6. Sincronizar busca e filtros com URL e navegação do navegador.
7. Adicionar retry, limpar filtros, estados vazios distintos e atualização sem substituir toda a lista.
8. Completar semântica de tabs, foco, regiões `aria-live` e ações móveis compactas.
9. Não privilegiar aprovação como ação clínica automática.

## Testes e implantação

- Testes unitários dos DTOs, filtros, transitions, autoria, vigência, idempotência e atribuições.
- Testes de rotas legadas e reconciliação canônica.
- Testes SQL de constraints, isolamento organizacional e migration incremental em branch Neon temporário.
- Type-check, lint, suíte completa, build e E2E.
- Aplicar migration pelo fluxo seguro de branch Neon, publicar API/web, executar catch-up idempotente e validar desktop/mobile em produção.
- Fluxos de produção serão testados de modo somente leitura ou com item de teste isolado e reversível; conteúdo clínico real não será aprovado/publicado durante validação.
