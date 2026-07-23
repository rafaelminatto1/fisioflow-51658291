# FisioFlow — Jornadas, Telas e Estados (Fase 3)

Base: análise de código do commit `9b5c76f10`. App vivo = `src/` (createBrowserRouter em `src/App.tsx` → `src/routes/router.tsx`). Inventário completo de telas em `inventories/screens.csv`.

Convenções transversais:
- **Guarda de rota**: `ProtectedRoute` (`src/components/ProtectedRoute.tsx`) com `allowedRoles`; bloqueio exibe "Página restrita para: <roles>". Wrappers: AdminRoute, TherapistRoute, PatientRoute, PartnerRoute.
- **Offline-first**: PersistQueryClient + mutations otimistas; badge "Pendente" (usePendingSyncIds) e banner global de offline.
- **Erros de rota**: `RouteErrorBoundary` por rota + `RouterErrorElement` global; `/error` e `*`→NotFound.
- **UI em PT-BR, superfícies sólidas (sem glassmorphism), fonte Nunito, azul Activity.**

---

## 1. Agenda (`/agenda`)

**Objetivo:** gerenciar agendamentos (FullCalendar dia/semana/mês) com status customizáveis por org, recorrência e pagamento.

**Jornada principal (criar atendimento):**
1. Usuário (admin/fisio) abre `/agenda` → skeleton enquanto carrega `GET /api/appointments`.
2. Clica em slot vazio → modal de criação rápida (paciente, terapeuta, tipo, duração default 60min).
3. Submit → `POST /api/appointments`. Backend valida conflito do terapeuta (constraint `no_overlapping_therapist_appointments`) e capacidade do slot.
4. Sucesso → evento aparece com cor do status "agendado" (cores de `appointment_status_settings`).
5. Drag-and-drop/resize → `PATCH` persiste horário e duração.
6. No dia: `AppointmentQuickView` → mudar status (presenca_confirmada → atendido / faltou_*) e registrar pagamento.

**Estados de erro/vazio/bloqueio:**
- 409 "Conflito de horário: o terapeuta já possui um agendamento neste período." (`apps/api/src/routes/appointments.ts:371`).
- 409 de capacidade quando `conflicts >= capacity` (`appointmentHelpers.ts:280-296`).
- Offline: card com badge "Pendente" até sincronizar.
- Recorrência (`RecurringAppointmentModal`): preview de ocorrências; conflitos individuais reportados.

**Validações/máscaras (Zod, `src/lib/validations/agenda.ts`):** horário `HH:MM` (regex), data `YYYY-MM-DD`, notas ≤1000 chars, payment_method ∈ cash/card/pix/transfer. **Só no frontend.**

**Configurações** (`/agenda/settings`, 5 abas, save unificado TabSaveHandle/SettingsSaveBar): funcionamento, status (key snake_case 2-80 + cores hex — CHECKs no banco), notificações (lembrete 5h + exceções), aparência.

## 2. Pacientes (`/patients`, `/patients/:id`)

**Objetivo:** cadastro e hub 360º do paciente.

**Jornada:** lista com busca → `NewPatientModal` (nome 2-100, telefone 10-15 com dedup E.164, email ≤255) → perfil com abas (histórico, evoluções, pacotes, mídia, mapas de dor). Pré-cadastro público via link (`/pre-cadastro/:token`) revisado em `/pre-cadastro-admin` e convertido em paciente.

**Estados:** lista vazia com CTA de cadastro; duplicado por telefone detectado; token de pré-cadastro inválido.

**Mensagens:** validações Zod em PT-BR ("Nome deve ter pelo menos 2 caracteres", "Telefone deve ter pelo menos 10 caracteres").

## 3. Evolução clínica (`/evolucao-clinica`, `/patient-evolution/:appointmentId`)

**Objetivo:** registrar a evolução da sessão (observação livre TipTap + blocos estruturados + procedimentos), com colaboração em tempo real e ditado por voz.

**Jornada de sucesso:**
1. Fisio abre `/evolucao-clinica` → fila dos atendimentos do dia (vazio = "sem atendimentos").
2. Abre a evolução → sessão `draft` criada/carregada; painel NotionEvolutionPanel/EvolutionNoScrollPanel.
3. Digita → autosave debounce 300/800ms → `POST /api/sessions/autosave` com Idempotency-Key e controle de versão otimista (version+1 condicionado).
4. (Opcional) Ditado por voz — só se `settings.dictation_enabled`; bloqueado se budget mensal de transcrição estourar com hard_stop.
5. (Opcional) Colaboração: WebSocket no DO `EvolutionCollaborationSql` (auth JWT+org+RBAC), presença e cursores; snapshot Yjs em `sessions.observacao_ydoc`.
6. Finaliza → `POST /api/sessions/:id/finalize` → `finalized` com finalizedAt/By; dispara SessionSummaryWorkflow.

**Estados de erro/bloqueio:**
- Conflito de versão: update com `version` desatualizada não aplica (recuperável na UI).
- Refinalizar → 404 "Sessão não encontrada ou já finalizada".
- Edição pós-finalização marca `is_edited=true` (trilha).
- Ditado indisponível (flag OFF) ou budget excedido (`*_monthly_transcription_budget_exceeded`).
- Fallback do editor colaborativo para o clássico se WS falhar.

**Modais associados:** MedicalReturnFormModal (retorno médico), SurgeryFormModal/PathologyFormModal (cirurgias/patologias), SessionImageUpload, GoalsManager.

## 4. Avaliação inicial (`/avaliacao-inicial`, fichas dinâmicas)

**Objetivo:** anamnese + exame físico + objetivos, com fichas de avaliação montadas pelo admin (`/cadastros/fichas-avaliacao` builder de campos). Preenchimento em `/patients/:patientId/evaluations/new/:formId`. Autosave como sessão draft; validação por tipo de campo.

## 5. Exercícios / HEP / Prescrições (`/exercises/*`)

**Objetivo:** biblioteca (filtros por corpo/equipamento/dificuldade), vídeos (Stream), templates, protocolos, IA (sugestão e busca semântica 1024d), analytics de aderência.

**Jornada (prescrever HEP):**
1. Biblioteca → seleciona exercícios (respeitando `pathologies_contraindicated`).
2. Monta plano (ou usa template) → `POST /api/exercise-plans` (status `ativo`).
3. Paciente acessa via portal ou QR público `/prescricoes/publica/:qrCode` (sem login).
4. Lembretes: WhatsApp (gated por automations_enabled) + push diário 18h BRT.

**Estados:** busca sem resultados; upload de vídeo com barra de progresso/erro; curadoria com fila vazia; exercício privado da org (`is_public=false`).

## 6. Financeiro (`/financeiro/*`)

**Objetivo:** contas, fluxo de caixa, NFS-e (SP), recibos, demonstrativo, simulador, comissões, pacotes e vouchers.

**Jornada (pacote de sessões):**
1. Admin cria template de pacote (CHECK total_sessions > 0) e vende ao paciente (`patient_packages`, status `ativo`).
2. A cada sessão realizada, consumo atômico (`used_sessions+1` com guard) — na penúltima sessão (remaining=1) dispara alerta de renovação.
3. Saldo zerado → `esgotado`; validade vencida no consumo → marca `expirado` e recusa ("Pacote expirado").

**Comissões:** resumo mensal com default 40% quando não configurado; taxa validada 0-100; payout marca período pago.

**Estados de erro:** "Pacote sem sessões restantes" (400); NFS-e em rascunho/homologação até config de produção; pagamento em atraso vira tarefa automática (cron 12h UTC).

**Validações Zod frontend:** voucher (tipo pacote/avulso/mensal, validade_dias > 0, preço ≥ 0), pagamento de evento (valor > 0, "Valor deve ser maior que zero").

## 7. CRM WhatsApp / Instagram / Webchat (`/crm-whatsapp`, `/crm`)

**Objetivo:** inbox multicanal, campanhas, lead score, roteamento e automações.

**Jornada (atender lead):**
1. Webhook Meta roteia por `phone_number_id` → conversa `open` no inbox; roteamento auto (round_robin/least_busy) se habilitado.
2. Atendente abre a conversa (GET marca como lida) → responde texto livre **dentro da janela de 24h**; fora dela, UI orienta template aprovado.
3. Ações IA: resumir / sugerir resposta / próxima ação (llama 8B via runAi).
4. Lead score 0-100 exibido (estágio, engajamento, recência, intenção, origem); temperatura "frio" após 7 dias sem inbound.
5. Resolução ou handoff → status da conversa.

**Estados de erro/bloqueio:**
- Instagram fora da janela: "A conversa do Instagram está fora da janela permitida..." (Human Agent/7 dias).
- Delete-for-everyone fora da janela: "Delete for everyone window expired".
- Mídia >16MB rejeitada.
- Automations gated: tudo silencioso com `automations_enabled=false` (default OFF).
- Webchat: handoff no máx. 1/30min + tarefa; rate limit em message/poll; bot silencia 15min após resposta humana.

**Templates Meta:** builder com validação frontend (variável não pode iniciar/terminar o body) + estados PENDING/APPROVED/REJECTED sincronizados via `/templates/sync`.

**Campanhas:** rascunho → agendada → enviando (cron horário) → enviada, com contadores sent/failed.

## 8. Tarefas / Kanban (`/boards`, `/boards/:boardId`)

**Objetivo:** kanban com dependências, recorrência, checklist, anexos e acknowledgment.

**Jornada:** board → coluna → TaskQuickCreateModal/TarefaModal → drag entre colunas → concluir.

**Estados de erro/bloqueio:** concluir com dependências abertas → 409 "Tarefa bloqueada por dependências abertas"; recorrência on-complete cria a próxima instância com checklist zerado; tarefas urgentes vencendo hoje notificam responsável (WhatsApp gated). Tarefas também nascem de automações (sessão sem evolução, pagamento em atraso, handoff do webchat, evasão sessão-3, efetivar reserva).

## 9. Retorno médico

**Objetivo:** garantir que o pedido de retorno do médico gere relatório e seja enviado.

**Jornada:** fisio registra pedido (MedicalReturnFormModal, com anexo) → card vermelho persistente na coluna 3 da evolução clínica → gera relatório → envia via wa.me (texto editável) ou template Meta `relatorio_fisioterapia` → `report_sent` remove o card.

## 10. NPS e pesquisas

**Jornada:** cron diário (11h BRT) cria surveys elegíveis com token → paciente abre `/nps/:token` (público) → responde score inteiro 0-10 + comentário → classificação promoter/passive/detractor → stats no admin (NPS = %prom − %detr). Estados: já respondido, expirado, token inválido; score fora de 0-10 → 400.

## 11. IA (Copilot, Evidence, Briefing, Automations)

- `/copiloto`: chat clínico com tools (streaming; erro de geração exibido).
- `/briefing`: briefing matinal por IA (cron); vazio se não gerado.
- `/inteligencia`: hub com tabs (overview/analytics/assistant/studio) — várias rotas antigas redirecionam para cá.
- `/automacoes`: canvas de automações (trigger→ações, incl. send_webhook).
- Regras: modelos só via registry `workersAi.ts`; spend limits no AI Gateway; rate limit em `/api/ai/*`; ai_config por org com CHECKs de provider/thinking_budget.

## 12. Configurações e Admin

- `/admin/users` + `/admin/usuarios-pendentes`: convites e aprovação de cadastros (novos profissionais ficam em `/pending-approval` até aprovação; email ao admin).
- `/admin/organization`, `/admin/audit-logs`, `/admin/security*`, `/admin/lgpd/ropa`, `/admin/system-health` — todos admin-only.
- `/settings` e `/profile`: preferências do usuário (nota: `/settings` não tem ProtectedRoute no router — `src/routes/core.tsx:355` — possível gap de guarda).

## 13. Portal do paciente (`/portal`) e público

- Portal: agenda própria, exercícios, documentos — role `paciente`.
- Público sem login: `/agendar/:slug` (booking, slots 08:00-18:00/30min), `/checkin`, `/assinar/:token` (assinatura digital com expiração), `/nps/:token`, `/prescricoes/publica/:qrCode`, `/tv/recepcao` (TV kiosk), `/indicacao/:code`.

## 14. Outros módulos

- **Eventos** (`/eventos`): eventos externos com prestadores, pagamentos (Zod: valor > 0), checklist e vouchers.
- **Wiki** (`/wiki/*`): base de conhecimento interna com analytics de template.
- **Telemedicina** (`/telemedicine`, `/telemedicine-room/:roomId`): salas de vídeo — presente e roteado, profundidade não auditada.
- **Inventário** (`/inventory`): estoque básico.
- **Gamificação** (`/gamification/*`): pontos/conquistas/quests/loja/leaderboard para pacientes; config admin.
- **Biomecânica** (`/clinical/biomechanics/*`): 6 análises por vídeo (jump/gait/running/treadmill/posture/functional).
- **Marketing** (`/marketing/*`, 17 telas): reviews, gerador de conteúdo, SEO, referral, ROI, reativação — admin.
