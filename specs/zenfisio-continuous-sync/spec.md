# Spec: Sync incremental ZenFisio → MoocaFisio

## Objetivo
Manter o MoocaFisio o mais atualizado possível com dados do ZenFisio, cobrindo agenda, pacientes, prontuário/evoluções e dados estruturados de procedimentos/exercícios.

## Decisão de produto/engenharia
Usar o MoocaFisio como fonte operacional, mas ZenFisio como fonte temporária de atualização durante a migração. O sync deve ser incremental, idempotente e conservador: nunca apagar dado manual do MoocaFisio e nunca sobrescrever texto clínico editado sem evidência clara.

## Escopo P1
- Importar/atualizar pacientes encontrados no ZenFisio.
- Importar eventos de agenda em `appointments`.
- Importar evoluções/avaliações em `sessions`.
- Linkar `sessions.appointment_id` ao `appointments.id` correspondente.
- Preservar texto clínico completo em `sessions.observacao`.
- Separar itens estruturados:
  - `sessions.procedures`
  - `sessions.exercises`
  - `sessions.home_exercises`
- Rodar dry-run antes de apply.
- Produzir relatório de cobertura.

## Escopo P2
- Extrair campos de prontuário inicial/anamnese para `medical_records` quando houver texto de avaliação suficientemente estruturado.
- Reclassificar procedimentos/exercícios com dicionário auditável.
- Criar catálogo mestre clínico no futuro, se necessário, mas sem bloquear a entrega atual.

## Fora de escopo imediato
- Apagar/cancelar automaticamente appointments existentes que não aparecem mais no ZenFisio.
- Criar migration de catálogo clínico novo agora.
- Importar financeiro/boletos do ZenFisio.

## User stories
### P1 — Agenda atualizada
Como clínica, quero que agendamentos do ZenFisio apareçam na agenda do MoocaFisio para evitar dupla operação.

Aceitação:
- Evento `Agendado` vira `appointments.status = 'agendado'`.
- Evento com evolução/avaliação preenchida vira appointment `status = 'atendido'` e sessão finalizada vinculada.
- Reexecução do sync não duplica appointments.

### P1 — Evoluções completas
Como fisioterapeuta, quero ver o texto livre original da evolução para não perder informação clínica.

Aceitação:
- Texto livre fica em `sessions.observacao`.
- Texto contaminado por rodapé/scripts do ZenFisio é removido.
- Sessões são idempotentes por paciente + data/hora.

### P1 — Dados estruturados
Como fisioterapeuta, quero procedimentos e exercícios separados do texto livre.

Aceitação:
- Procedimentos são gravados em `sessions.procedures`.
- Exercícios realizados são gravados em `sessions.exercises`.
- Exercícios explicitamente orientados para casa são gravados em `sessions.home_exercises`.
- Texto livre continua intacto em `observacao`.

### P2 — Prontuário
Como clínica, quero que avaliações iniciais alimentem `medical_records` quando houver dados suficientes.

Aceitação:
- Avaliações com conteúdo estruturável geram/atualizam `medical_records` sem duplicar.
- Caso não haja estrutura confiável, o conteúdo permanece em `sessions.observacao`.

## Critérios de segurança/LGPD
- Scripts locais não imprimem secrets no relatório final.
- Dados clínicos só são escritos no tenant correto (`organization_id`).
- Todas as operações têm dry-run.
- Logs contêm contagens e IDs técnicos, não dumps desnecessários de PHI.
