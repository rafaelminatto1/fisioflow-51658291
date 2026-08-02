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
4. Remover bootstrap automático de `clinical_review` das instalações futuras. O grant automático existente será revogado/quarentenado antes do próximo uso clínico e só poderá ser recriado por operação administrativa auditada.
5. Corrigir IDs determinísticos futuros para UUID RFC; aceitar temporariamente o formato hexadecimal PostgreSQL dos IDs já materializados, sem remapeamento destrutivo.

## API e segurança clínica

1. Definir DTOs explícitos camelCase para fila e detalhe; não devolver linhas SQL cruas.
2. Normalizar pessoa, proveniência, fontes, revisão, prioridade, prazo e validade.
3. Submissão é permitida ao `authoredBy`, responsável ativo da versão ou usuário com `manage_library`. Versões legadas sem autor humano confiável exigem responsável ativo ou `manage_library`. Aprovação é proibida quando o ator coincide com `authoredBy` ou `submittedBy`.
4. Publicar apenas quando existir revisão `action = 'approve'` da mesma organização e versão, com `validUntil` obrigatório e `validUntil >= CURRENT_DATE`, e o aprovador ainda possuir `clinical_review` ativo. Toda a verificação ocorre na mesma operação atômica.
5. Consultar validade da última aprovação, não da última ação editorial.
6. Reservar ou substituir chaves idempotentes expiradas atomicamente; aplicar o mesmo protocolo a atribuições.
7. Validar que o responsável pertence à organização e está ativo; gerar evento de auditoria.
8. Bloquear mutações legadas capazes de contornar capabilities e tornar endpoints de auditoria autoritativa somente leitura.
9. Criar administração de capabilities restrita a `manage_library_policy`: listar, conceder, verificar e revogar. Proibir autoconcessão; `clinical_review` exige perfil ativo, CREFITO preenchido e concessão por outro gestor. Cada operação gera auditoria na mesma transação.
10. Auditoria autoritativa é imutável e contém organização, ator, entidade, ação, request/event ID, estado anterior/posterior estritamente derivado pelo servidor e timestamp. Retenção segue a política clínica da organização; nenhum endpoint aceita `before/after/action` arbitrário do cliente.

## Sincronização legada

- CREATE materializa item, versão e mapa.
- UPDATE cria nova versão canônica em `draft` e preserva o mapa.
- DELETE de `wiki_pages` faz soft-delete do item. Remoção/importação desfeita em `knowledge_articles` e `organization_evidence` inativa somente o vínculo de proveniência; o item é arquivado apenas quando não restar fonte válida nem origem editorial própria. Se houver versão publicada, a operação limpa `published_version_id`, registra uma despublicação auditada e somente então arquiva, atomicamente.
- Cada evento usa chave `<sourceType>:<sourceId>:<sourceUpdatedAt>:<operation>`. Eventos antigos são ignorados; CREATE ausente pode ser reconstruído antes de UPDATE; DELETE vence UPDATE com timestamp anterior. Conflito entre edição canônica e evento legado cria nova versão `draft` para revisão, nunca sobrescreve versão aprovada/publicada.
- Operações são idempotentes e reconciliáveis; falha de sincronização não pode produzir publicação implícita.

## Corte das rotas legadas

- `knowledge` status/review: virar adaptador da máquina canônica; payloads sem `expectedVersion` e idempotency key retornam `409` com instrução de atualização.
- `evidenceWorkspace` review: resolver `knowledge_source_map` e executar transição canônica; o status legado passa a ser projeção derivada.
- Endpoint de criação arbitrária de auditoria em `knowledge`: retornar `410 Gone`; comentários não autoritativos, se necessários, usam contrato e tabela distintos.
- O corte entra no mesmo deploy da API canônica corrigida; não haverá janela com dois escritores autoritativos.

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
- Testes de grant legado não verificado, autoconcessão, concessão/revogação auditada e aprovador desabilitado.
- Testes de publicação sem aprovação, vencida, de outra versão e de outra organização.
- Testes concorrentes da mesma chave, payload conflitante e reutilização pós-expiração.
- Testes de rotas legadas e reconciliação canônica.
- Testes de eventos legados fora de ordem, UPDATE concorrente com edição canônica e bypass de cada endpoint legado afetado.
- Testes SQL de constraints, isolamento organizacional e migration incremental em branch Neon temporário.
- Type-check, lint, suíte completa, build e E2E.
- Aplicar migration pelo fluxo seguro de branch Neon, publicar API/web, executar catch-up idempotente e validar desktop/mobile em produção.
- Fluxos de produção serão testados de modo somente leitura ou com item de teste isolado e reversível; conteúdo clínico real não será aprovado/publicado durante validação.
