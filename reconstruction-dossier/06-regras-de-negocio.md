# FisioFlow — Regras de Negócio (Fase 4)

Fonte: análise de código (commit `9b5c76f10`). Detalhe estruturado com evidências em `inventories/business-rules.json` (108 regras). Este documento resume as mais críticas por domínio.

## AGENDA (18 regras)

O agendamento é protegido em **duas camadas**: constraint de banco `no_overlapping_therapist_appointments` (exclusion) impede sobreposição do mesmo terapeuta, e a API checa **capacidade do slot** contando sobreposições (status com `countsTowardCapacity=false` não contam) — ambas viram HTTP 409 com mensagem em PT-BR. Status são **customizáveis por organização** (`appointment_status_settings`, key snake_case + cores hex com CHECK no banco), sobre um enum base de 11 valores (`agendado`…`remarcar`, incluindo 3 variações de falta). Recorrência é por série (tipo/intervalo/dias da semana) com ocorrências materializadas. A régua de confirmação é toda via cron: **D-2** (confirmação), **D-1 urgente com dedup** (`urgent_d1`, template `lembrete_consulta_botoes`), **same-day para não confirmados**, e lembretes configuráveis (regra 5h, tick de 15min). Booking público oferece slots 08:00-18:00 de 30min menos os ocupados — com **fallback permissivo** se o schema não bater (risco). `billing_status` (pending→ready_for_invoice→invoiced) é separado de `payment_status` (pending/paid/partial/refunded).

## EVOLUÇÃO (14 regras)

Sessão clínica tem ciclo `draft → finalized` com `cancelled`; o enum inclui `under_review` (fluxo estagiário→supervisor) **que o handler da API não implementa** — gap real. Autosave é **idempotente** (Idempotency-Key cacheada por org) e com **concorrência otimista por versão** (UPDATE condicionado, version+1). Finalização é única (repetir → 404), grava autor/timestamp (assinatura lógica) e dispara workflow de resumo; edição posterior marca `is_edited`. A observação é **colaborativa em tempo real** (Yjs + Durable Object com auth JWT+org+RBAC, snapshot em `observacao_ydoc`). Ditado por voz é **duplamente gated**: flag `settings.dictation_enabled` (frontend) + **budget mensal de transcrição** por org e por profissional com hard stop (backend). Sessões atendidas sem evolução geram **tarefa automática** diária; sessões >90 dias são arquivadas mensalmente em R2/Iceberg.

## FINANCEIRO (13 regras)

Pacote de sessões: `total_sessions > 0` (CHECK), consumo **atômico** (guard `used < total` no UPDATE), recusa sem saldo, **expiração lazy** (marca `expirado` na tentativa de consumo) e **renewal gate na penúltima sessão** (remaining=1 dispara alerta comercial). ⚠️ Divergência real: migration/API usam status PT (`ativo/esgotado/expirado/cancelado`), o enum Drizzle declara EN (`active/expired/used/cancelled`). Comissões: **default 40%** sem configuração, taxa validada 0-100, payout fecha o período. NFS-e nasce rascunho em homologação com auto-emissão desligada. Pagamento em atraso vira tarefa (cron). Vouchers e pagamentos de eventos são validados **apenas no frontend** (Zod).

## CRM (21 regras)

A regra mestra: **`settings.crm_whatsapp.automations_enabled` default OFF** gateia todas as mensagens automáticas (boas-vindas, feedback, exercício, review, tarefa urgente). **Janela de 24h** do WhatsApp: fora dela só template aprovado (a API cria templates idempotentemente); Instagram tem janela própria (7 dias/Human Agent) com mensagem de erro explicativa. Lead score híbrido determinístico 0-100 (estágio×0.55 + engajamento teto 15 + recência até +20 + intenção do concierge até +20 + origem paga +5), batch diário e on-the-fly. Roteamento round_robin/least_busy. Webchat: **handoff limitado a 1/30min + criação de tarefa**, rate limit, bot silencia 15min após resposta humana, condução de reserva cria tarefa "Efetivar reserva". Campanhas agendadas disparam por cron horário (`agendada→enviando`). Mídia ≤16MB; delete-for-everyone com janela; GET de conversa marca como lida (efeito colateral); lead "frio" após 7 dias.

## TAREFAS (5 regras)

Conclusão bloqueada por **dependências abertas (409)**; **recorrência on-complete** (série por `recurrence_parent_id`, checklist zerado na nova instância); acknowledgment obrigatório opcional; urgentes vencendo hoje notificam (in-app + WhatsApp gated); automações por vencimento e estagnação. Tarefas são o "escape hatch" do sistema: nascem de evolução pendente, cobrança, handoff, evasão e reservas.

## PACIENTE (8) / NPS (4) / EXERCÍCIO (5) / RETORNO-MÉDICO (2)

- Dedup por telefone E.164; pré-cadastro por token com conversão; aniversários, reativação e **evasão na 3ª sessão** automatizados por cron.
- NPS: token público, score inteiro 0-10, classificação promoter/passive/detractor, NPS = %prom − %detr, expiração e resposta única, disparo diário automático.
- HEP nasce `ativo`, acessível por **QR sem login**; exercícios carregam contraindicações/CID-10; lembretes gated (WhatsApp) + push 18h BRT; embeddings 1024d.
- Retorno médico: card vermelho persistente até `report_sent`; envio wa.me ou template `relatorio_fisioterapia`.

## IA (6) / AUTH-RBAC (7) / SISTEMA (4)

- IA: modelos só via registry `workersAi.ts` (deprecações centralizadas), spend limits no AI Gateway, rate limit em `/api/ai/*`, config por org com CHECKs, briefings/resumos do ClinicAgent por org ativa.
- AUTH: roles admin/fisioterapeuta/estagiario/paciente/parceiro; guarda de rota **no frontend** (ProtectedRoute) + `requireRole` no backend (403 `admin_only`, default role `viewer`); RLS multi-tenant via `app.org_id` é a intenção arquitetural, mas o banco vivo tem cobertura inconsistente e o Worker de produção usa uma role BYPASSRLS; aprovação pendente de novos profissionais; auditoria de acessos clínicos. ⚠️ `/settings` está sem ProtectedRoute no router.
- SISTEMA: cron */5 é DB-free (scale-to-zero Neon; violar quebra o Quality Gate); SLO monitorado (uptime <99.5% ou p95 >2s alerta); offline-first no frontend; cron só usa templates aprovados na WABA.

## Regras que existem SÓ no frontend (atenção na reconstrução)

| Regra | Evidência |
|---|---|
| Validações de agendamento (HH:MM, YYYY-MM-DD, limites de texto) | `src/lib/validations/agenda.ts` |
| Validações de paciente (nome/telefone/email/preço) | `src/lib/validations/agenda.ts:66-99` |
| Voucher (tipos/validade/preço) | `src/lib/validations/voucher.ts` |
| Pagamento de evento (valor > 0) | `src/lib/validations/pagamento.ts` |
| Template Meta: variável não inicia/termina body | `templateValidation.ts` |
| Guarda de rotas por role (allowedRoles) | `src/components/ProtectedRoute.tsx` |
| Autosave semi-controlado TipTap (debounce, emitUpdate:false) | `richTextSync.ts` |
| Exibição do ditado (dictation_enabled) | `src/hooks/useDictationEnabled.ts` |
| Offline-first / badge Pendente | `usePendingSyncIds` |

## Índice por ID

| ID | Nome | Domínio |
|---|---|---|
| BR-AGENDA-001 | Enum de status do agendamento | AGENDA |
| BR-AGENDA-002 | Conflito de horário do terapeuta (constraint DB) | AGENDA |
| BR-AGENDA-003 | Capacidade do slot/sala | AGENDA |
| BR-AGENDA-004 | Duração padrão 60min | AGENDA |
| BR-AGENDA-005 | Tipos de agendamento | AGENDA |
| BR-AGENDA-006 | Agendamento em grupo — legado, excluído do alvo | AGENDA |
| BR-AGENDA-007 | Status customizáveis por org | AGENDA |
| BR-AGENDA-008 | Recorrência em séries | AGENDA |
| BR-AGENDA-009 | Confirmação D-2 WhatsApp | AGENDA |
| BR-AGENDA-010 | Confirmação urgente D-1 com dedup | AGENDA |
| BR-AGENDA-011 | Lembrete same-day não confirmados | AGENDA |
| BR-AGENDA-012 | Lembretes configuráveis (5h + exceções) | AGENDA |
| BR-AGENDA-013 | Booking público 08-18h/30min | AGENDA |
| BR-AGENDA-014 | Escalas weekday 0-6 | AGENDA |
| BR-AGENDA-015 | Fila de espera | AGENDA |
| BR-AGENDA-016 | Pipeline de billing_status | AGENDA |
| BR-AGENDA-017 | Check-in público | AGENDA |
| BR-AGENDA-018 | Validações do form (frontend) | AGENDA |
| BR-EVOLUCAO-001 | Ciclo de vida da sessão | EVOLUCAO |
| BR-EVOLUCAO-002 | Autosave idempotente | EVOLUCAO |
| BR-EVOLUCAO-003 | Concorrência otimista por versão | EVOLUCAO |
| BR-EVOLUCAO-004 | is_edited pós-finalização | EVOLUCAO |
| BR-EVOLUCAO-005 | Finalização única com autor | EVOLUCAO |
| BR-EVOLUCAO-006 | Normalização de status legados | EVOLUCAO |
| BR-EVOLUCAO-007 | Colaboração Yjs em tempo real | EVOLUCAO |
| BR-EVOLUCAO-008 | Ditado gated por flag | EVOLUCAO |
| BR-EVOLUCAO-009 | Budget de transcrição hard stop | EVOLUCAO |
| BR-EVOLUCAO-010 | Sessão sem evolução vira tarefa | EVOLUCAO |
| BR-EVOLUCAO-011 | Arquivamento >90 dias | EVOLUCAO |
| BR-EVOLUCAO-012 | Autosave semi-controlado (frontend) | EVOLUCAO |
| BR-EVOLUCAO-013 | Alertas clínicos (severidade/ciclo) | EVOLUCAO |
| BR-EVOLUCAO-014 | Histórico de versões | EVOLUCAO |
| BR-PACIENTE-001 | Dedup telefone E.164 | PACIENTE |
| BR-PACIENTE-002 | Pré-cadastro por token | PACIENTE |
| BR-PACIENTE-003 | Aniversários automatizados | PACIENTE |
| BR-PACIENTE-004 | Reativação/recall | PACIENTE |
| BR-PACIENTE-005 | Evasão na 3ª sessão | PACIENTE |
| BR-PACIENTE-006 | Portal restrito ao próprio dado | PACIENTE |
| BR-PACIENTE-007 | Validações de paciente (frontend) | PACIENTE |
| BR-FINANCEIRO-001 | Pacote ≥1 sessão (CHECK) | FINANCEIRO |
| BR-FINANCEIRO-002 | Estados do pacote (+ divergência PT/EN) | FINANCEIRO |
| BR-FINANCEIRO-003 | Consumo atômico com guard | FINANCEIRO |
| BR-FINANCEIRO-004 | Expiração lazy | FINANCEIRO |
| BR-FINANCEIRO-005 | Renewal gate remaining=1 | FINANCEIRO |
| BR-FINANCEIRO-006 | Comissão default 40% | FINANCEIRO |
| BR-FINANCEIRO-007 | Taxa 0-100 | FINANCEIRO |
| BR-FINANCEIRO-008 | Payout por período | FINANCEIRO |
| BR-FINANCEIRO-009 | Voucher (frontend) | FINANCEIRO |
| BR-FINANCEIRO-010 | Pagamento de evento (frontend) | FINANCEIRO |
| BR-FINANCEIRO-011 | NFS-e rascunho/homologação | FINANCEIRO |
| BR-FINANCEIRO-012 | Atraso vira tarefa | FINANCEIRO |
| BR-FINANCEIRO-013 | Defaults pending/paid | FINANCEIRO |
| BR-CRM-001 | Automations gate default OFF | CRM |
| BR-CRM-002 | Janela 24h + templates | CRM |
| BR-CRM-003 | Janela Instagram 7d/Human Agent | CRM |
| BR-CRM-004 | Delete-for-everyone com janela | CRM |
| BR-CRM-005 | Mídia ≤16MB | CRM |
| BR-CRM-006 | Lead frio >7 dias | CRM |
| BR-CRM-007 | Lead score híbrido 0-100 | CRM |
| BR-CRM-008 | Roteamento round_robin/least_busy | CRM |
| BR-CRM-009 | Campanha agendada por cron | CRM |
| BR-CRM-010 | SLA de leads com breach flags | CRM |
| BR-CRM-011 | Concierge IG + token refresh | CRM |
| BR-CRM-012 | Handoff 1/30min + tarefa | CRM |
| BR-CRM-013 | Rate limit webchat | CRM |
| BR-CRM-014 | Janela humana 15min | CRM |
| BR-CRM-015 | Auto-reply webchat delay 0-20s | CRM |
| BR-CRM-016 | Guardas anti-alucinação | CRM |
| BR-CRM-017 | Templates Meta (frontend validation) | CRM |
| BR-CRM-018 | GET marca como lida | CRM |
| BR-CRM-019 | Status conversa/mensagem | CRM |
| BR-CRM-020 | Webhook por phone_number_id | CRM |
| BR-CRM-021 | Condução de reserva | CRM |
| BR-TAREFAS-001 | Bloqueio por dependências (409) | TAREFAS |
| BR-TAREFAS-002 | Recorrência on-complete | TAREFAS |
| BR-TAREFAS-003 | Acknowledgment | TAREFAS |
| BR-TAREFAS-004 | Urgência notificada | TAREFAS |
| BR-TAREFAS-005 | Automations due/stalled | TAREFAS |
| BR-NPS-001 | Score inteiro 0-10 via token | NPS |
| BR-NPS-002 | Classificação e cálculo NPS | NPS |
| BR-NPS-003 | Disparo automático diário | NPS |
| BR-NPS-004 | Expiração/resposta única | NPS |
| BR-EXERCICIO-001 | HEP nasce ativo | EXERCICIO |
| BR-EXERCICIO-002 | QR sem login | EXERCICIO |
| BR-EXERCICIO-003 | Contraindicações/CID-10 | EXERCICIO |
| BR-EXERCICIO-004 | Lembretes gated + push | EXERCICIO |
| BR-EXERCICIO-005 | Embeddings 1024d | EXERCICIO |
| BR-RETORNO-001 | Card até report_sent | RETORNO-MEDICO |
| BR-RETORNO-002 | Envio WhatsApp/template | RETORNO-MEDICO |
| BR-IA-001 | Registry central de modelos | IA |
| BR-IA-002 | Spend limits gateway | IA |
| BR-IA-003 | ai_config CHECKs | IA |
| BR-IA-004 | Rate limit /api/ai/* | IA |
| BR-IA-005 | Briefings ClinicAgent | IA |
| BR-IA-006 | IA no inbox | IA |
| BR-AUTH-001 | Roles + guarda de rotas | AUTH |
| BR-AUTH-002 | Fisio sem CRM/mkt/financeiro | AUTH |
| BR-AUTH-003 | requireRole backend | AUTH |
| BR-AUTH-004 | RLS app.org_id | AUTH |
| BR-AUTH-005 | Aprovação pendente | AUTH |
| BR-AUTH-006 | Logout POST /sign-out | AUTH |
| BR-AUTH-007 | Auditoria de acessos clínicos | AUTH |
| BR-SISTEMA-001 | Cron */5 DB-free | SISTEMA |
| BR-SISTEMA-002 | SLO com alerta | SISTEMA |
| BR-SISTEMA-003 | Offline-first (frontend) | SISTEMA |
| BR-SISTEMA-004 | Cron só templates aprovados | SISTEMA |
| BR-GAMIFICACAO-001 | Pontos/conquistas | GAMIFICACAO |
| BR-DOCS-001 | Assinatura por token | PACIENTE |
