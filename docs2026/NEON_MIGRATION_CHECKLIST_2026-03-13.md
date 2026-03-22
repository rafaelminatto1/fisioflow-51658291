# Neon Migration Checklist - 13/03/2026

## Resumo executivo

O Neon esta com drift de schema. Parte das migracoes recentes ja foi aplicada, mas o banco ainda nao esta alinhado com o contrato atual de `patients` e com a limpeza final de colunas legadas.

Conclusao pratica:

- aplicar agora o alinhamento aditivo de `patients`
- validar os fluxos do app e Workers
- so depois remover `firestore_id`

## O que foi confirmado no Neon

### Ja existe

- `doctors`
- `patient_medical_returns`
- `medical_records`
- `patient_pathologies`
- `patient_surgeries`
- `transacoes`
- `contas_financeiras`
- `pagamentos`
- outras tabelas financeiras e clinicas recentes

### Ainda falta ou esta incompleto

- colunas de vinculacao e portal em `patients`
- colunas novas de alinhamento do dominio de pacientes
- remocao das colunas legadas `firestore_id`

### Problema estrutural adicional

Nao existe historico de migration no banco:

- sem `__drizzle_migrations`
- sem `schema_migrations`

Isso significa que hoje o banco nao informa com confiabilidade quais migracoes ja foram aplicadas. O controle esta disperso entre SQLs manuais, Drizzle e o schema real.

## Migrations pendentes mais importantes

### 1. Alinhamento do dominio de pacientes

Arquivo:

[0033_patients_neon_alignment.sql](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/migrations/0033_patients_neon_alignment.sql#L1)

Entrega:

- `phone_secondary`
- `address`
- `profession`
- `incomplete_registration`
- `referred_by`
- tabelas como `medical_records` e `patient_pathologies`

### 2. Vinculacao portal/paciente/profissional

Arquivo:

[0036_patient_portal_identity_links.sql](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/migrations/0036_patient_portal_identity_links.sql#L1)

Entrega:

- `profile_id`
- `user_id`
- `professional_id`
- `professional_name`
- indices para busca dessas vinculacoes

### 3. Limpeza final de legado Firestore

Arquivo:

[0037_drop_legacy_firestore_columns.sql](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/migrations/0037_drop_legacy_firestore_columns.sql#L1)

Entrega:

- remove `firestore_id` de tabelas legadas

Observacao:

Essa etapa deve ser executada por ultimo.

## Ordem segura de aplicacao

### Etapa 0. Antes de qualquer mudanca

- criar branch ou backup no Neon
- garantir que o deploy atual dos Workers esteja estavel
- nao misturar essa aplicacao com outras alteracoes de schema no mesmo horario

### Etapa 1. Aplicar bundle aditivo

Usar o arquivo:

[20260313_neon_patients_alignment_and_cleanup.sql](/home/rafael/Documents/fisioflow/fisioflow-51658291/scripts/migration/20260313_neon_patients_alignment_and_cleanup.sql)

Executar somente a `PHASE 1`.

Motivo:

- ela e aditiva
- e idempotente
- reduz risco operacional
- alinha o banco com o contrato atual do `patientPortal`

### Etapa 2. Validar fluxos principais

Testar pelo menos:

- login do paciente
- vinculacao do paciente ao profissional
- criacao ou atualizacao de perfil do paciente
- listagem e leitura basica no portal do paciente
- criacao/edicao de paciente no fluxo profissional

Ponto de codigo mais sensivel:

[patientPortal.ts](/home/rafael/Documents/fisioflow/fisioflow-51658291/apps/api/src/routes/patientPortal.ts#L326)

Hoje esse arquivo faz fallback se as colunas nao existem. Apos a migration, ele passa a conseguir usar `profile_id`, `user_id`, `professional_id` e `professional_name` corretamente.

### Etapa 3. Aplicar limpeza legada

Se a Etapa 2 passar, descomentar e executar a `PHASE 2` do bundle.

Motivo:

- remove lixo legado
- simplifica o schema
- evita manter campos que ja nao deveriam ser usados

### Etapa 4. Validacao final

Conferir:

- colunas novas de `patients` presentes
- `firestore_id` ausente das tabelas alvo
- fluxos web e mobile sem regressao

## Por que essa ordem e a mais segura

- `0033` e `0036` sao essencialmente aditivas e tolerantes a reexecucao
- `0037` e destrutiva no sentido de schema, apesar de simples
- manter a remocao por ultimo permite validar o ambiente antes de limpar legado

## O que eu nao recomendo fazer agora

- nao recomendo rodar `scripts/apply-migrations.mjs` cegamente

Arquivo:

[apply-migrations.mjs](/home/rafael/Documents/fisioflow/fisioflow-51658291/scripts/apply-migrations.mjs#L1)

Razoes:

- ele usa connection string fixa no script
- ele tenta aplicar toda a pasta `src/server/db/migrations`
- nao existe historico consistente no banco para saber o que ja entrou
- isso aumenta risco de aplicar SQL desnecessario em producao

## O que eu recomendo padronizar depois

### 1. Escolher uma trilha oficial de migration

Hoje existem pelo menos tres sinais de schema:

- `drizzle/`
- `src/server/db/migrations/`
- `scripts/migration/`

Isso precisa convergir.

### 2. Criar historico no proprio banco

Sem tabela de historico, todo diagnostico futuro vira inferencia.

### 3. Documentar o estado real de producao

Depois desta aplicacao, vale registrar:

- o que foi aplicado
- quando foi aplicado
- quem aplicou
- qual verificacao foi feita

## Arquivos para usar agora

- Bundle para executar no Neon:
  [20260313_neon_patients_alignment_and_cleanup.sql](/home/rafael/Documents/fisioflow/fisioflow-51658291/scripts/migration/20260313_neon_patients_alignment_and_cleanup.sql)

- Migration de alinhamento de pacientes:
  [0033_patients_neon_alignment.sql](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/migrations/0033_patients_neon_alignment.sql#L1)

- Migration de vinculacao portal:
  [0036_patient_portal_identity_links.sql](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/migrations/0036_patient_portal_identity_links.sql#L1)

- Cleanup legado:
  [0037_drop_legacy_firestore_columns.sql](/home/rafael/Documents/fisioflow/fisioflow-51658291/src/server/db/migrations/0037_drop_legacy_firestore_columns.sql#L1)

## Conclusao

O caminho seguro e:

1. aplicar `PHASE 1`
2. validar fluxo
3. aplicar `PHASE 2`

Se voce quiser, o proximo passo pode ser eu executar uma revisao final do SQL consolidado com foco em risco de lock e compatibilidade antes de voce rodar no Neon.
