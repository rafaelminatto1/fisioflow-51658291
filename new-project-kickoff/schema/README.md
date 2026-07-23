# Schema alvo — instruções

## Estado

`0000-foundation-draft.sql` é um **rascunho de discussão**. Não foi executado, não foi comparado contra um provedor de auth escolhido e não deve ser aplicado em banco algum. O objetivo é tornar auditáveis as decisões do primeiro slice: identidade, contexto, pacientes somente leitura, idempotência, outbox e auditoria protegida.

## Fonte de verdade proposta

1. schema Drizzle em `packages/db`, exportado por módulo;
2. SQL complementar versionado para policies, funções, triggers e recursos Postgres;
3. migrations imutáveis e uma tabela de ledger aplicada pelo migrator;
4. introspecção em CI para detectar drift de schema, owner, grants, RLS e `BYPASSRLS`;
5. contratos de API e testes de autorização como evidência adicional, nunca substitutos das constraints.

O inventário `reconstruction-dossier/inventories/database-objects.csv` é evidência do AS-IS, não fonte de geração: ele não contém definições completas de CHECK, UNIQUE, defaults, funções e policies.

## Topologia de roles

As roles abaixo são capabilities/owners `NOLOGIN NOBYPASSRLS`. Elas não são credenciais do Hyperdrive.

| Capability | Uso | Acesso direto |
|---|---|---|
| `app_owner` | owner dos objetos | `NOLOGIN`; nunca pela aplicação |
| `app_migrator` | migrations controladas | único caminho autorizado a assumir `app_owner` |
| `app_auth_definer` | owner dos resolvers estreitos | somente SELECT mínimo sob RLS próprio |
| `app_auth_runtime` | chamador dos resolvers | somente EXECUTE |
| `app_audit_definer` | owner dos writers de auditoria | somente INSERT protegido |
| `app_staff_runtime` | casos de uso staff | grants + RLS do primeiro slice |
| `app_patient_runtime` | casos de uso do paciente | grants menores e vínculo ativo |
| `app_jobs_runtime` | dispatcher/consumidores | outbox/receipts, sem PHI bruta |

O bootstrap de infraestrutura cria credenciais reais por ambiente, por exemplo `fisioflow_staff_login LOGIN NOBYPASSRLS INHERIT IN ROLE app_staff_runtime`. Há logins separados para auth resolver, staff, paciente, jobs e migrator, cada um membro apenas da capability necessária; somente o migrator controlado pode assumir `app_owner` para DDL. Senhas ficam no Neon/secret store e **nunca** em migration ou Git. Hyperdrive se conecta às roles `LOGIN`, não às capabilities `NOLOGIN`.

Não existe `app_readonly` no foundation. BI só será criado sobre views/agregações aprovadas, com política de células pequenas e sem acesso bruto a PHI por padrão. A API nunca conecta como owner e nenhuma role de aplicação pode ter `BYPASSRLS`.

## Bootstrap de identidade e contexto RLS

O fluxo evita a circularidade “preciso do tenant para ler a membership, mas preciso ler a membership para descobrir o tenant”:

1. validar issuer, audience, assinatura, expiração e subject externo;
2. chamar `resolve_staff_context` ou `resolve_patient_context` com a credencial de auth, que só devolve candidatos e estados;
3. no staff web, expor os candidatos do próprio subject por `GET /auth/contexts` e aceitar em `POST /auth/context` somente um `membershipId`; organização ativa, estado, papéis e versão são revalidados no servidor;
4. abrir nova transação com a credencial correta e definir via `set_config(..., true)`:
   - `app.org_id`;
   - `app.identity_id`;
   - `app.membership_id` para staff;
   - `app.patient_id` para paciente;
   - `app.authorization_version`;
   - `app.request_id` para correlação/auditoria;
5. as policies revalidam tenant + organização ativa + identidade do tipo correto + membership/vínculo ativo + versão; paciente excluído não reaparece pela API comum;
6. commit/rollback limpa o contexto local antes de a conexão voltar ao pool.

O token não é autoridade suficiente após revogação. Mudanças de role, status ou vínculo incrementam `authorization_version` e invalidam o contexto anterior. RLS protege inclusive contra query sem filtro de tenant; não torna SQL arbitrário seguro nem substitui autorização do caso de uso.

## Matrizes

- `rls-policy-matrix.csv`: acesso **realmente presente** no SQL do primeiro slice, por tabela/operação;
- `application-authorization-matrix.csv`: permissions de caso de uso/DTO; registra o que a API pode fazer mesmo quando a role de banco possui grant técnico.

Uma célula vazia significa sem acesso. Capacidade futura não aparece como policy antecipada.

## Ordem sugerida

1. organizations/identities/memberships + convites/sync de auth após decisão do provedor;
2. patients e patient access links;
3. appointments;
4. episodes, sessions e outcomes;
5. exercise plans/executions;
6. documents/messaging/finance;
7. projeções autorizadas do Care Radar;
8. arquivos, retenção, views analíticas e logs.
9. ERP/fiscal, projetos, CRM/marketing, site builder, commerce e inventário, um bounded context por vez;
10. gamificação e ledgers de moeda/inventário virtual separados dos livros financeiros reais;
11. colaboração, telemedicina, IA/agentes, wearables, biomecânica e Digital Twin conforme gates de suas ondas.

Cada fase inclui policies, grants, testes Org A/B, rollback lógico e classificação LGPD; RLS nunca fica “para depois”.

Essa ordem não autoriza tabelas vazias no foundation. O modelo completo e as dependências estão em `target-model.md`; grupos/turmas e DICOM/PACS não possuem modelo alvo.

## Gates para tornar o SQL executável

- escolher auth, issuer/audience e ciclo de convite/sincronização de identidade;
- validar roles `LOGIN`/`NOLOGIN`, owners e grants com um branch Neon descartável;
- escolher UUID v4/v7;
- definir política de CPF/telefone, dedup e endpoints de busca sensíveis;
- confirmar papéis, catálogo imutável de permissions e supervisionamento;
- implementar claim/TTL de idempotência e leasing/sequência da outbox;
- modelar retenção, legal hold, exportação e anonimização;
- revisar com segurança, DPO/responsável LGPD e responsável clínico;
- testar cada login real e falhar se estiver como owner ou `rolbypassrls`.
