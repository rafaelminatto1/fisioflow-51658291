# Plano de implementação — piloto seguro da Central de Notas

Data: 2026-07-29

## Objetivo

Colocar a Central de Notas em operação controlada, com valor imediato para a equipe e proteção técnica para dados pessoais e clínicos. A implantação ocorre diretamente em produção, com os recursos de maior risco desligados por padrão.

## Fase 1 — Fundação e classificação

- Manter `notes_v1` ativo.
- Classificar notas por `private`, `team`, `operational` e `clinical`.
- Impedir busca semântica e IA em notas clínicas ou com sensibilidade diferente de `internal`.
- Manter RLS, escopo de organização e ACL em todas as leituras e escritas.

Critério: type-check, testes da API e nenhum acesso cross-tenant.

## Fase 2 — Colaboração e ciclo de vida

- Colaboração Yjs via Durable Object com ticket de uso único.
- Revalidação de ACL em cada atualização.
- Revisões imutáveis, restauração criando nova revisão e reset coordenado do documento.
- Favoritos, comentários, menções e tarefas com auditoria.

Critério: persistência Yjs, revogação durante sessão e restauração sem sobrescrita pelo socket antigo.

## Fase 3 — Compartilhamento seguro

- Compartilhamento por usuário, cargo ou organização somente quando permitido pela classificação.
- Portal somente por projeção explícita, paciente correto, validade curta e revogação.
- Exportação autenticada, marcada e sem cache público.
- Sem links públicos ou tokens em URL.

Critério: testes de ACL, paciente incorreto, expiração, revogação e tenant isolation.

## Fase 4 — Piloto operacional

- Começar com equipe interna autorizada.
- Usar IA apenas em notas internas não clínicas.
- Monitorar erros, tentativas bloqueadas, exportações, publicações e revogações.
- Revisar após 30 dias: volume, falhas, incidentes, notas publicadas e solicitações de revogação.

Critério: smoke de produção, ausência de incidentes críticos e feedback dos profissionais.

## Fase 5 — Recursos condicionados

As flags abaixo ficam `false` por padrão:

- `VITE_FEATURE_NOTES_CLINICAL_AI`
- `VITE_FEATURE_NOTES_OFFLINE`
- `VITE_FEATURE_NOTES_PUBLIC_LINKS`

Antes de ativar qualquer uma, exigir minimização, consentimento/legítima finalidade documentada, TTL, revogação, auditoria, teste de logout e revisão humana.

## Entregáveis executáveis

- API de notas, portal, exportação e restauração.
- Schema Neon com RLS.
- Feature flags e bloqueios server-side.
- Testes de rota, colaboração e classificação.
- Documentação de operação e auditoria.
- Deploy direto e smoke de produção.
