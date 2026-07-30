# Central de Notas — conclusão segura das fases condicionadas

Data: 2026-07-29

## Objetivo

Concluir as capacidades não clínicas pendentes da Central de Notas sem liberar IA clínica, offline clínico ou links públicos. A implementação deve manter o isolamento por organização, separar projeções do portal do conteúdo interno e tornar operações sensíveis auditáveis e revogáveis.

## Escopo

1. Restauração de revisão com permissão de gerenciamento e coordenação segura com Yjs.
2. Publicação de uma projeção explícita para o portal do paciente, com expiração, revogação e auditoria.
3. Exportação autenticada e auditada, sem compartilhamento público.
4. Testes de autorização, tenant isolation, revogação e regressão.
5. Feature flags e métricas para as operações sensíveis.

## Fora do escopo

IA sobre notas clínicas, persistência offline de dados clínicos e links públicos/externos. Essas capacidades permanecem bloqueadas até RIPD, aprovação do DPO e política organizacional formal.

## Arquitetura e fluxo

- Restauração: `POST /api/notes/:id/revisions/:revisionId/restore`; exige capability `manage`, cria uma nova revisão apontando para a origem, grava auditoria e sinaliza o Durable Object para resetar o documento colaborativo antes de aceitar novas edições.
- Portal: publicação gera uma permissão `patient_portal` com payload mínimo e expiração. O endpoint do portal lê somente a projeção publicada e verifica paciente, organização, status e prazo.
- Exportação: `GET /api/notes/:id/export` verifica `export`, gera representação marcada com usuário/data e audita sucesso ou bloqueio.
- Auditoria: toda publicação, revogação, restauração, exportação e tentativa negada registra organização, nota, paciente quando aplicável, usuário, resultado e motivo.

## Segurança

- Nenhum endpoint usa `organizationId` vindo do cliente para autorizar acesso.
- Notas clínicas não podem ser publicadas para organização inteira, portal sem paciente correspondente ou link público.
- Revogação invalida imediatamente a projeção do portal.
- Exportação não cria URL pública nem usa cache público.
- Operações de restauração são rejeitadas enquanto o estado colaborativo não puder ser invalidado/resetado com segurança.

## Validação

- Testes unitários para escopo, expiração, revogação e classificação.
- Testes de rota para owner, membro autorizado, paciente correto, paciente incorreto e outra organização.
- Teste de persistência Yjs após restauração.
- Type-check, suíte da API, build web, deploy direto e smoke de produção.
