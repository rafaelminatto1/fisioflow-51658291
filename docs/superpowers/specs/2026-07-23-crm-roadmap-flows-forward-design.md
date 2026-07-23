# FisioFlow CRM — Roadmap de Implementação (Flows-forward)

**Data:** 2026-07-23 · **Autor:** Rafael + Claude · **Status:** design para revisão

## Escopo e princípios

- **Canais:** WhatsApp + Instagram + Webchat. **Excluídos:** SMS, RCS, Messenger, Telegram.
- **Estratégia:** trazer **WhatsApp Flows para a fase de fundação** (não como evolução tardia). O agendamento nasce como Flow nativo, com fallback conversacional (list message) para dentro da janela de 24h.
- **Reuso máximo do que já está em produção:** `publicBooking` (disponibilidade/slots/check-in), `ai-concierge` (condução conversacional/handoff), Campanhas, motor de Queue/Cron, TemplateBuilder + submissão à Meta, `hepDailyReminder`, módulo de Exercícios, NPS.
- **Novo core compartilhado:** endpoint de Flows criptografado no Worker (WebCrypto) + helper de mensagens interativas + infra de agendamento outbound.
- **Convenção:** cada feature vira seu próprio `specs/<slug>/{spec,plan,tasks}.md` quando entrar em execução (este doc é o roadmap-mestre).

## Arquitetura — blocos compartilhados (Fase 0)

Estes três blocos destravam várias features e por isso vêm primeiro:

### B1. Endpoint de WhatsApp Flows (criptografado) no Worker
- Rota nova `POST /api/whatsapp/flows/data` no `apps/api`.
- **Criptografia via WebCrypto** (nativo no Workers, sem lib): decripta `encrypted_aes_key` com RSA-OAEP-SHA256 (chave privada em Secret), decripta `encrypted_flow_data` com AES-128-GCM (tag de 16 bytes no fim), responde encriptando com o mesmo AES key e IV invertido (XOR 0xFF). Valida assinatura `X-Hub-Signature-256` (app secret).
- Chaves: gerar par RSA-2048; **subir a pública** via `POST /PHONE_NUMBER_ID/whatsapp_business_encryption`. Privada em `wrangler secret` (`FLOWS_PRIVATE_KEY` + `FLOWS_KEY_PASSPHRASE`).
- Suporta os requests: `INIT`, `data_exchange`, `BACK`, `ping` (health check).
- Referências: template "Book an Appointment" (Meta) + repo `mekari-engineering/whatsapp-flow-tools` (endpoint hospitalar com encriptação).

### B2. Helper de mensagens interativas (list / reply buttons)
- `sendInteractiveList()` e `sendInteractiveButtons()` no lib de WhatsApp (irmãos de `sendInstagramMessage`).
- Limites reforçados no código: buttons ≤3 (título ≤20), list ≤10 linhas / ≤10 seções (título ≤24, desc ≤72).
- Parser no webhook para `interactive.list_reply` / `button_reply` / `nfm_reply` (resposta de Flow) → despacha para o handler da feature via `id`/`flow_token`.

### B3. Infra de agendamento outbound + tracking
- Tabela `wa_scheduled_sends` (agendamento de disparos) processada pelo Cron (`tick` DB-free continua; job separado lê a fila — cuidado com a lição do `cron.test.ts`).
- Tracking de entrega/leitura a partir do status webhook (`sent`/`delivered`/`read`/`failed`) já parcialmente existente → consolidar em métricas por mensagem/campanha.

## Fase 1 — P0 (após Fase 0)

### F1. Agendar consulta pelo WhatsApp ⭐ (âncora, Flows-first)
- **Superfície:** WhatsApp Flow "Book an Appointment" (endpoint data_exchange) — telas: serviço → data (date-picker) → horário (slots dinâmicos) → confirmação.
- **Dados dinâmicos:** o endpoint (B1) lê disponibilidade do `publicBooking` (slots livres por fisio/data, já desconta agendados e feriados D1).
- **Fallback:** dentro da janela de 24h, se o paciente resistir ao Flow, `ai-concierge` oferece **list message** de horários (B2) que cria o mesmo agendamento.
- **Conclusão:** `nfm_reply` → cria appointment na Agenda + confirma + agenda lembretes (24h/1h).
- **Integração:** `publicBooking.ts`, Agenda (`appointments`), `ai-concierge.ts`. **Esforço:** L (depende de B1). **Gate:** Flow publicado na Meta (ação sua, confirmável).

### F2. Win-back de pacientes inativos
- Cron detecta paciente sem sessão há N dias → **template com botão** (fora da janela) → ao responder, abre F1 (Flow/lista) para reagendar.
- **Integração:** motor de automações/queue, templates aprovados, `leadScoring`/pacientes. **Esforço:** M. Reusa F1.

### F3. Broadcast agendado + analytics
- Estende **Campanhas**: agendar disparo (B3) + painel de entregue/lido/clicado/falha por contato.
- **Integração:** Campanhas, status webhook, B3. **Esforço:** M.

### F4. CSAT pós-sessão
- Após `report_sent`/alta → **Flow curto de feedback** (nota 0–10 + comentário) ou list rápida; alimenta painel (complementa NPS).
- **Integração:** `sessions`, NPS dashboard, B1/B2. **Esforço:** S–M.

## Fase 2 — P1

### F5. Envio de Programa de Exercícios (HEP) pelo WhatsApp ⭐ diferencial fisio
- Fisio monta programa (módulo Exercícios) → envia mensagem estruturada/PDF com vídeos. Reusa `hepDailyReminder` (hoje envia lembrete via push) estendido para conteúdo via WhatsApp + reminder semanal por tag de condição.
- **Esforço:** M.

### F6. Transcrição de áudio inbound
- Áudio do paciente → transcreve (reusa Nova-3 pt-BR do `scribeConfig`) → IA já sugere resposta. **Esforço:** M.

### F7. Painel de produtividade / SLA
- Tempo de 1ª resposta, conversas resolvidas, ranking por atendente. **Esforço:** M.

### F8. Link de pagamento no chat
- Enviar link de pagamento (pacote 10 sessões / avaliação) no WhatsApp; conciliar status. **Esforço:** M (depende do provedor de pagamento).

## Fase 3 — P2 (estratégico, incluído no roadmap)

### F9. Construtor visual de fluxos no-code
- Editor drag-and-drop para não-devs montarem bots/fluxos (reaproveita o canvas de automações existente como base). **Esforço:** L/XL. **Quando:** se a operação crescer e exigir edição por não-técnicos.

### F10. WhatsApp Business Calling API / Voice AI
- Chamadas ativas/receptivas via API + agente de voz (transcrição/roteamento). **Esforço:** XL. **Quando:** só com volume alto de ligações.

### F11. AI Agent autônomo de agendamento
- Evolução do concierge: qualifica, agenda (via F1), atualiza estágio do funil e faz handoff sozinho, com guardas anti-alucinação reforçados. **Esforço:** L. **Depende:** maturidade de F1 + guardas.

## Flows extras descobertos na pesquisa (candidatos, priorizar sob demanda)
- **Intake/anamnese pré-consulta + consentimento** (Flow antes da 1ª visita; salva no prontuário) — alto valor clínico, reusa B1.
- **Onboarding de paciente** (dados + consentimento LGPD).
- **Agendamento de turma/grupo de reabilitação** (se a clínica oferecer aulas em grupo).

## Sequenciamento & dependências

```
Fase 0 (B1 endpoint Flows, B2 interativas, B3 scheduling+tracking)
   └─> F1 (Flow agendamento)  ─> F2 (win-back reusa F1) ─> F11
   └─> F4 (CSAT Flow)
B2/B3 ─> F3 (broadcast)
Independentes: F5, F6, F7, F8
Estratégicos: F9, F10 (avaliar depois)
```

## Checklist do painel da Meta (fase de implementação — ações suas confirmáveis)
1. Gerar par RSA-2048 (eu faço via script) e **subir a pública** (Graph API — token de sistema).
2. Criar Flow "Agendar Consulta" no WhatsApp Manager (Flow Builder, template Appointment).
3. Configurar `endpoint_uri` = rota do Worker + conectar o Meta App.
4. Health check (preview "Request data").
5. **Publicar o Flow** ⚠️ irreversível (não editável depois) — confirmo com você antes.
6. Submeter/aprovar templates novos (win-back, lembretes) — reusa fluxo do TemplateBuilder.

> Observação de acesso: farei o trabalho no painel dirigindo o navegador com você logado (precisaremos da extensão Claude-in-Chrome conectada, ou uso o chrome-devtools). Nenhuma senha é digitada por mim; ações irreversíveis passam por sua confirmação.

## Repositórios de referência
- `mekari-engineering/whatsapp-flow-tools` — endpoint de booking hospitalar com encriptação (base p/ B1).
- Meta "Book an Appointment" Flow JSON template + exemplo Node.js de endpoint.

## Riscos & mitigações
- **Encriptação do endpoint** — usar WebCrypto do Workers; validar com o preview/health check da Meta antes de publicar.
- **Flow imutável pós-publicação** — versionar Flow JSON no repo; publicar só após teste em draft.
- **Janela de 24h** — list/buttons só dentro da janela; fora dela sempre template com botão primeiro.
- **`cron.test.ts` bloqueia deploy** — jobs novos do Cron não podem tocar DB no `tick`; usar job separado.
- **Dedup/idempotência** — Flows usam `flow_token` como sessão; agendamentos idempotentes por token.

## Próximos passos
1. Revisar este roadmap.
2. `writing-plans` para **Fase 0 (B1+B2+B3)** + **F1** (o primeiro incremento de ponta a ponta).
3. Executar Fase 0 → F1 (inclui o trabalho no painel da Meta com sua confirmação).
