# Tasks: Sync incremental ZenFisio → MoocaFisio

## T001 — Mapear schema real
- [x] Consultar colunas de `patients`, `appointments`, `sessions`, `medical_records`, `servicos`.
- [x] Confirmar campos JSONB estruturados em `sessions`.

## T002 — Evoluções clínicas
- [x] Importar evoluções/avaliações para `sessions.observacao`.
- [x] Remover duplicidades.
- [x] Limpar texto sujo/boilerplate.

## T003 — Procedimentos e exercícios
- [x] Classificar procedimentos.
- [x] Classificar exercícios realizados.
- [x] Classificar exercícios domiciliares explícitos.
- [x] Validar idempotência.

## T004 — Agenda
- [ ] Criar script incremental para `appointments` a partir dos JSONs do ZenFisio.
- [ ] Deduplicar eventos duplicados do HTML.
- [ ] Mapear status/tipo:
  - `Agendado` → `appointments.status='agendado'`, `type='session'`.
  - `Evolução` com texto → `appointments.status='atendido'`, `type='session'`.
  - `Avaliação` → `type='evaluation'`; se tiver texto, `status='atendido'`, senão `status='agendado'`.
- [ ] Linkar `sessions.appointment_id`.
- [ ] Rodar dry-run.
- [ ] Rodar apply.
- [ ] Validar idempotência.

## T005 — Prontuário/medical_records
- [ ] Analisar avaliações com texto suficiente.
- [ ] Gerar proposta de mapeamento para `medical_records`.
- [ ] Só aplicar quando a extração for confiável.

## T006 — Relatório final
- [ ] Gerar relatório de cobertura: pacientes, appointments, sessões, procedimentos, exercícios.
- [ ] Documentar limitações e próximos passos.
