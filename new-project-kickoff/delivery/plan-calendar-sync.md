# Plano de implementação — Sincronização do calendário do paciente

**Status:** plano aprovado para execução futura, **não executável ainda**
**Spec-fonte:** `docs/superpowers/specs/2026-07-14-sincronizacao-calendario-paciente-design.md` (aprovado pelo proprietário em 2026-07-14, DEC-019)
**Decisão de contexto:** DG-00 = uso interno, clínica única (DEC-000). Multi-organização permanece só como isolamento/segurança; não há SaaS.
**Posição no roadmap:** Onda 1, **depois** da fundação (identidade do paciente, agenda canônica, consentimento, outbox, Queue, RLS real).

> Este é um plano de trabalho. Não autoriza escrever código de produção, criar o repositório, provisionar Cloudflare/Neon/Google/Microsoft/Apple, nem ligar feature flags. Cada tarefa vira issue só quando a onda começar e os pré-requisitos estiverem verdes.

---

## 0. Pré-requisitos (bloqueiam TODO o recurso)

Estes itens pertencem à fundação (F0/F1) e à onda, não a este recurso. Sem eles, nenhuma tarefa abaixo começa.

| Pré-req | Por quê | Onde vem |
|---|---|---|
| PRE-1 Identidade de paciente (portal user) com sessão e escopo do próprio registro | toda rota exige `patientPortalUserId`; nenhuma aceita `patientId` do cliente | ADR-0005 / DG-02 |
| PRE-2 Agenda canônica com `appointmentSequence` monotônica por agendamento | vetor de revisão do orquestrador depende dela | núcleo clínico F2 |
| PRE-3 Outbox transacional + Cloudflare Queue + DLQ | entrega assíncrona at-least-once | ADR-0006 (DEC-010) |
| PRE-4 RLS real com role `NOBYPASSRLS` no runtime (`app.org_id`) | feed Apple e isolamento cross-tenant dependem disso | ADR-0004 (DEC-007) |
| PRE-5 Envelope encryption versionado (Worker Secrets: chave AEAD + pepper HMAC de lookup, materiais separados) | refresh tokens e capability do feed | ADR-0008 |
| PRE-6 Registro de consentimento versionado (texto + versão) | critério de aceite 1 | domínio de consentimento F1 |
| PRE-7 Durable Objects habilitados + binding | Calendar Effect Coordinator | ADR-0002 (DEC-005) |

**Gate de saída dos pré-requisitos:** teste de isolamento Org A/Org B passando com role não-owner (o mesmo slice inicial do README do kit).

---

## Incremento A — Contrato, coordenação e feed Apple seguro

Objetivo: máquina de estados, dados, coordenação idempotente e o caminho Apple (feed) ponta a ponta **sem provedor OAuth ainda**. Entrega valor real (Apple) e estabelece a espinha dorsal que B e C reusam. Flag: `patient_calendar_sync` + `patient_calendar_apple_feed`.

| ID | Tarefa | Depende de | Aceite coberto |
|---|---|---|---|
| A1 | Migrations das 4 tabelas: `calendar_connections`, `calendar_event_links`, `calendar_feed_credentials`, `calendar_consent_events`. Incluir FKs compostas (conexão+org), índices parciais de exclusividade (≤1 `primary` e ≤1 `candidate` não-terminal por `org+patient`), unique `(org,connection,appointment)`, unique `(tokenKeyVersion,tokenNonce)`. Ledger de migration registrado. | PRE-3,4,7 | 12, 20, 30, 36 |
| A2 | RLS `default deny` por `organizationId` nas 4 tabelas; policies que exigem coincidência conexão↔org; nenhuma policy autoriza acesso só por `connectionId`; credenciais nunca selecionáveis por endpoint de leitura de UI. | A1 | 9, 10, 12, 30 |
| A3 | Máquina de estados (`role` × `status`) como serviço com transições explícitas e lock na linha do paciente; estados terminais exigem `role=historical`; TTLs (OAuth 10min, candidate Apple 24h). | A1 | 15, 20 |
| A4 | Calendar Connection Service: cria conexão, registra consentimento versionado, cifra/decifra credenciais só no backend, garante uma primary ativa, agenda backfill/revogação/reconciliação. | A3, PRE-5,6 | 1, 15 |
| A5 | Contrato interno do adapter (`provisionCalendar`/`upsertAppointment`/`cancelAppointment`/`reconcileConnection`/`deleteManagedCalendar`/`revokeConnection`) recebendo snapshot mínimo já autorizado. Nenhum adapter conhece tela/RBAC/regra clínica. | A3 | 9 |
| A6 | Calendar Effect Coordinator (Durable Object): `coordinatorId = HMAC(connectionId, appointmentId)` persistido e **nunca recalculado após rotação**; vetor `(connectionGeneration, appointmentSequence, privacyVersion)` com precedência total da geração e `max` componente-a-componente dentro da geração; ≤1 mutação externa em voo por vínculo; persiste intenção antes do `fetch`; sem `blockConcurrencyWhile()` durante I/O; estado `uncertain` após crash; alarm/retry idempotente. | A5, PRE-7 | 7, 8, 19, 29, 33, 34 |
| A7 | Outbox → Queue → orquestrador: consumo at-least-once, releitura do estado canônico por caso de uso autorizado, payload mínimo, classificação de falha (transitória/auth/permanente), efeito+receipt idempotentes. | A6, PRE-3 | 7, 8, 19 |
| A8 | Emissão da capability do feed Apple: envelope `v1.<kid>.<base64url(nonce‖ciphertext‖tag)>` (AES-256-GCM, nonce 96-bit CSPRNG, AAD canônico com finalidade+host+rota+versão+kid, plaintext sem `patientId`/dado clínico); credencial/hash commitada **antes** de entregar o token uma única vez ao app autenticado; nunca persistir/logar o token bruto. | A2, PRE-5 | 10, 11, 35 |
| A9 | Apple Feed Service (rota pública `GET /calendar/subscriptions/{opaqueToken}.ics`): valida tamanho/formato, autentica AEAD **antes** de usar campos, abre transação, `set_config('app.org_id', …, true)` a partir do envelope, lookup por org+credentialId+HMAC(pepper,token) sob RLS, valida geração/versão/consentimento/TTL/revogação, autoriza só estados permitidos; iCalendar válido (`UID`/`DTSTAMP`/`LAST-MODIFIED`/`SEQUENCE`), cancelados omitidos do snapshot; `ETag`/`Last-Modified` sem cache compartilhado; `404` opaco uniforme para qualquer falha, `503 no-store` para Neon indisponível. | A8 | 11, 24, 30, 36 |
| A10 | Modo discreto (padrão): payload externo sem dado clínico (só bloco de tempo/título genérico). | A5 | 9 |
| A11 | API do paciente (subconjunto A): `GET /calendar-connection` (status sem serializar a linha completa), `POST /apple-feed`, `POST /apple-feed/confirm` (idempotente, promove só a candidate da transação autenticada), `PATCH /preferences`, `DELETE /calendar-connection`, `GET /appointments/{id}/calendar-file.ics` (sessão obrigatória, verifica propriedade, conteúdo discreto, estático, sem EventKit). | A4, A10 | 1, 15, 22 |
| A12 | Fluxos assíncronos base: backfill inicial, novo agendamento, remarcação (mesmo evento), cancelamento (sem compromisso ativo incorreto), reconciliação Neon→coordenador, recovery de resultado incerto. | A7 | 3, 4, 5, 6, 7, 29, 34 |
| A13 | Testes do Incremento A: unit (vetor de revisão, máquina de estados), contrato (adapter), integração (RLS cross-patient/cross-tenant com role real), iCalendar (validade + `ETag`), segurança (envelope/opacidade `404`), iPhone real (assinatura do feed no Apple Calendar), resiliência (crash nas fronteiras do efeito). | A9, A11, A12 | 12, 16, 30, 34, 36 |

**Gate de saída A:** critérios 1, 3–12, 15, 16, 19, 20, 22, 24, 29, 30, 33, 34, 35, 36 verdes; DLQ + kill switch (`patient_calendar_sync`) operacionais.

---

## Incremento B — Google

Objetivo: primeiro provedor OAuth completo, reusando coordenação/estados/adapters do A. Flag: `patient_calendar_google`.

| ID | Tarefa | Depende de | Aceite coberto |
|---|---|---|---|
| B0 | **Verificação de app do Google** (começar cedo): `calendar.app.created` é escopo *sensitive* (confirmado na doc atual) → exige justificativa por escopo + vídeo demonstrativo do consentimento e revisão do Google, que leva semanas. Iniciar antes do resto do Incremento B para não virar gargalo de liberação. | B1 | 27 |
| B1 | Projeto OAuth Google dedicado do paciente, **isolado** de qualquer outra integração; escopos `calendar.app.created` + `calendar.calendarlist.readonly` — confirmados reais e de menor privilégio (o app só acessa calendários que ele mesmo cria; não vê a agenda pessoal do paciente). | A | 27 |
| B2 | `POST /oauth/start` (state assinado + PKCE) e `GET /google/callback` (autenticado por transação OAuth assinada, não confia em `returnUrl`); tokens nunca retornam ao frontend nem a logs. | B1, A11 | 10 |
| B3 | Adapter Google: `provisionCalendar` (secundário) com `calendarProvisionKey` gravada antes; busca por marcador em resultado ambíguo, nunca segundo POST cego; `upsert`/`cancel`/`delete`. | A5, A6 | 23, 32 |
| B4 | Backfill/upsert/delete Google via orquestrador; reconciliação autoritativa e revogação. | B3, A12 | 3–7 |
| B5 | SLOs Google em ambiente de teste + testes de duplicação (timeout após create não cria 2ª cópia). | B4 | 13, 19, 23 |

**Gate de saída B:** Google funcional documentado; critérios 13, 23, 27, 32 verdes; SLO passando em teste.

---

## Incremento C — Microsoft/Outlook

Objetivo: segundo provedor, espelhando B. Flag: `patient_calendar_microsoft`.

| ID | Tarefa | Depende de | Aceite coberto |
|---|---|---|---|
| C1 | OAuth delegado Microsoft + calendário separado. | B (padrão estabelecido) | 10 |
| C2 | Adapter Microsoft: provision/upsert/cancel/delete com a mesma disciplina de `providerCreateKey`/marcador. | C1, A5 | 23, 32 |
| C3 | Backfill/upsert/delete + reconciliação + SLO. | C2, A12 | 3–7, 13 |
| C4 | Desconexão Microsoft: não promete revogação remota seletiva; elimina **todas** as credenciais locais. | C1, A3 | 25 |

**Gate de saída C:** Outlook funcional documentado; critérios 13, 25 verdes.

---

## Incremento D — Hardening e liberação

Objetivo: robustez multi-provedor, troca de provedor, observabilidade e substituição do fluxo antigo. Flags de modo/rollout.

| ID | Tarefa | Depende de | Aceite coberto |
|---|---|---|---|
| D1 | Troca de provedor: fan-out sombra (`shadowSinceOutboxId`), catch-up→watermark, promoção atômica com lock, dedup de eventos, no máx. 3 ciclos senão fica `degraded` sem promover. Nunca duas primary. | B, C | 20, 28 |
| D2 | Mudança de privacidade `detailed`→`discreet`: `privacyVersion` sobe; não marca concluído enquanto qualquer cópia gerenciada puder conter detalhes antigos. Flag `patient_calendar_detailed_mode`. | A10, A12 | 21, 31 |
| D3 | Reconexão (`POST /reconnect`) e estado `reconnect_required` bloqueando chamadas ao provedor. | A3, B2 | 15 |
| D4 | Rotação Apple: exige nova confirmação + nova assinatura; keyring antigo `decrypt-only` enquanto houver feed emitido; feed perdido → revoga credencial não confirmada e cria versão superior. | A8, A9 | 26, 35 |
| D5 | Chaos/replay/DLQ, dashboards, alertas, métricas, runbooks, kill switch por flag. | A13, B5, C3 | 17 |
| D6 | Testes cross-provider + comunicação honesta do atraso do Apple Calendar (sem promessa falsa de tombstone). | D1 | 14, 28 |
| D7 | Rollout gradual por organização; remoção definitiva das rotas/telas antigas inseguras quando o novo sistema as substituir (o fluxo antigo nunca fica exposto no sistema novo). | D5 | 18 |

**Gate de saída D (recurso pronto):** todos os 36 critérios de aceite verdes.

---

## Rastreabilidade de aceite → incremento

| Critério | Onde | | Critério | Onde |
|---|---|---|---|---|
| 1 consentimento | A4/A11 | | 19 timeout sem 2ª cópia | A12/B5 |
| 2 3 provedores documentados | A9+B+C | | 20 sem duas primary | A3/D1 |
| 3 futuros elegíveis entram | A12 | | 21 discreet remove detalhes | D2 |
| 4 criação posterior entra | A12 | | 22 `.ics` sem EventKit | A11 |
| 5 remarcação = mesmo evento | A12 | | 23 provisionamento sem órfão | A6/B3 |
| 6 cancelamento sem ativo errado | A12 | | 24 cancelamento Apple via polling | A9 |
| 7 reprocesso sem duplicar | A7/A12 | | 25 desconectar MS limpa local | C4 |
| 8 fora de ordem | A6/A7 | | 26 rotação Apple reassina | D4 |
| 9 nada clínico externo | A10 | | 27 OAuth Google isolado | B1 |
| 10 tokens nunca ao front/log | A8/B2 | | 28 troca sem perder mudança | D1/D6 |
| 11 feed sem `patientId` | A8/A9 | | 29 sem mutação paralela | A6 |
| 12 cross-tenant com RLS | A2/A13 | | 30 feed com NOBYPASSRLS | A9 |
| 13 SLOs Google/Outlook | B5/C3 | | 31 discreet não conclui cedo | D2 |
| 14 atraso Apple honesto | D6 | | 32 ambíguo sem 2º POST | A6/B3 |
| 15 desconexão para efeitos | A11/D3 | | 33 `coordinatorId` estável | A6 |
| 16 iPhone real | A13 | | 34 crash segue matriz | A6/A13 |
| 17 métricas/DLQ/runbook/kill | D5 | | 35 feed perdido revoga | A8/D4 |
| 18 antigo não exposto | D7 | | 36 `SET LOCAL` na mesma txn | A9 |

---

## Riscos específicos deste plano

- **R1** — Coordenação idempotente (A6) é a parte mais difícil e mais fácil de errar; deve ter os testes de resiliência (A13) antes de qualquer provedor real. Não implementar B/C sem A verde.
- **R2** — Apple não garante tombstone de cancelamento; a UX (D6) precisa comunicar o atraso sem prometer remoção instantânea (critério 14/24).
- **R3** — Rotação de chave AEAD/pepper (D4) não pode migrar token bruto silenciosamente; keyring `decrypt-only` é obrigatório enquanto houver feed vivo.
- **R4** — Dependência da agenda canônica com `appointmentSequence` (PRE-2): se a fundação não expõe sequência monotônica por agendamento, o vetor de revisão não funciona. Verificar antes de A6.

## O que este plano NÃO faz

- Não escreve código, não cria o repositório, não instala dependências.
- Não provisiona Google/Microsoft/Apple, Cloudflare (Queue/DO/Secrets) nem Neon.
- Não liga nenhuma feature flag.
- Não migra nem lê registros atuais (greenfield, dados sintéticos — DEC-015).
