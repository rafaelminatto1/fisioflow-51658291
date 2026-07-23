# 17 — Estratégia de Migração de Dados (proposta — não executar)

> Como migrar os dados reais (986 pacientes, 13.941 agendamentos, 11.054 sessões etc.) do Neon atual (`purple-union-72678311`, db `neondb`) para o schema reconstruído, sem executar nada nesta fase.

## Princípios

- **Nunca** executar DDL/DML de migração sem autorização e sem branch Neon de teste.
- Migração idempotente e reconciliável (contagens + checksums).
- Redução de duplicidade PT/EN acontece **na migração** (mapear origem→destino unificado).
- Dados sensíveis nunca saem do ambiente controlado; nada de dump para o repo.

## Ordem de migração (respeita FKs)

1. **Referência sem FK**: organizations, enums/catálogos (exercises, pathologies, servicos, appointment_types, feriados).
2. **Identidade**: neon_auth.* (ou novo auth), profiles, organization_members, user_invitations. ⚠️ Resolver `profiles`=1 vs usuários reais em `neon_auth.user` (QA-DB-01).
3. **Clínico**: patients → medical_records → avaliações (evaluation_*) → appointments → sessions (+observacao/observacao_ydoc) → evolution_versions/measurements → anexos.
4. **Financeiro**: session_package_templates → patient_packages → package_usage → payments/transactions (unificar) → recibos → therapist_commissions → nfse_config (records vazio).
5. **CRM/mensageria**: contacts → leads → wa_conversations → wa_messages (decidir se migra trilho legado whatsapp_*).
6. **Satélites**: tarefas/boards, gamification, wiki, knowledge/embeddings (pgvector — re-embeddar se dimensão mudar), biomechanics.
7. **Logs/auditoria**: audit_logs, clinical_access_logs, ai_usage_logs — ou arquivar em R2 em vez de migrar.

## Mapeamentos de unificação (duplicidade PT/EN)

| Origem (manter dados) | Destino unificado |
|---|---|
| pagamentos + payments/transactions | payments |
| salas + rooms | rooms |
| centros_custo + cost_centers | cost_centers |
| fornecedores + suppliers | suppliers |
| empresas_parceiras + partner_companies | partner_companies |
| financial_accounts + contas_financeiras | financial_accounts |
| precadastros/precadastro_tokens + pre_registrations/pre_registration_tokens | pre_registrations |
| whatsapp_* (legado) + wa_* | wa_* |
| appointment_status (17 valores EN/PT) | enum único (mapa de-para explícito) |

Para cada par: definir a fonte canônica, deduplicar por chave natural, registrar linhas descartadas.

## Enum `appointment_status` — mapa de-para (exemplo a validar com o time)

`agendado→scheduled`, `presenca_confirmada→confirmed`, `atendido→completed`, `faltou`/`faltou_sem_aviso→no_show`, `faltou_com_aviso→no_show(aviso=true)`, `nao_atendido*→cancelled`, `remarcar→rescheduled`, `avaliacao→(type=evaluation)`. Confirmar semântica de `nao_atendido_sem_cobranca` (afeta financeiro).

## Validação (obrigatória, sem escrever em prod)

1. Migrar para **branch Neon efêmero** (não prod).
2. Contagem origem×destino por tabela (tolerância explícita onde houver dedup).
3. Checksum de colunas-chave por tabela.
4. Reconciliação de FKs (nenhuma órfã nova).
5. Amostragem de integridade clínica/financeira (saldos de pacote, valores de comissão).
6. Rollback do branch ao final.

## Riscos

- `profiles` subpopulada (QA-DB-01) pode quebrar FKs de autoria.
- Snapshot Yjs (`sessions.observacao_ydoc`, binário) — validar desserialização no novo editor.
- Embeddings pgvector — o banco atual mistura **768d, 1024d e 1536d** (`exercise_protocols/wiki_pages`, `exercises/agent_memories/evidence_articles` e `clinical_embeddings`, respectivamente). Inventariar modelo + dimensão + finalidade por coluna e re-gerar na migração; não converter vetores entre dimensões.
- created_at histórico de imports ZenFisio — preservar (não sobrescrever com data de migração).
