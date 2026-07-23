# 05 — Revisão técnica (docs atuais) e oportunidades

**Data:** 2026-07-14
**Fontes:** documentação oficial atual via Context7, Exa e MCP Cloudflare (docs + OpenAPI). Cada afirmação abaixo foi conferida contra doc atual, não memória.
**Regra:** propostas novas entram como **Proposta** no registro de decisões; nada vira compromisso sem sua aprovação. Nenhum código foi escrito.

---

## Parte 1 — Verificação do que já está no kit

### 1.1 Identidade: Better Auth em Cloudflare + Neon — ✅ confirmado, é padrão

- Existe **exemplo oficial do Hono** ("Better Auth on Cloudflare", jul/2026) com exatamente a nossa pilha: Hono + Better Auth + Drizzle + **Neon**. O handler monta em `/api/auth/*` no Worker.
- Adapter: `drizzleAdapter(db, { provider: 'pg' })`. Conexão ao Neon pode ser via `neon-http` **ou via Hyperdrive** (`postgres-js`) — usar **Hyperdrive** mantém coerência com o baseline (DEC-004) e reduz latência de conexão.
- Biblioteca `better-auth-cloudflare` já integra **KV** (rate limiting/secondary storage), **R2** (upload de arquivos), **Hyperdrive**, geolocalização e detecção de IP — tudo com um wrapper `withCloudflare(...)`. Templates prontos existem (Hono starter, saas-on-cf).
- **Rate limiting nativo** do Better Auth usa KV (janela mín. 60s) — cobre parte da lacuna A4 do legado (OTP sem rate limit).
- **Melhoria aplicável:** o plugin **Organization** do Better Auth dá multi-tenant (org + membership + convites) pronto — encaixa direto no isolamento por `organization_id`/RLS do kit. Adotar em vez de reconstruir do zero.

Conclusão: decisão DEC-008 (Better Auth) está tecnicamente sólida e é caminho batido. Sem mudança.

### 1.2 Calendário: escopo Google `calendar.app.created` — ✅ confirmado e é o mais privado

- Escopo real e atual: "Make secondary Google calendars, and see, create, change, and delete events on them." O app só enxerga/edita **os calendários que ele mesmo criou** — não vê a agenda pessoal do paciente. É a escolha de menor privilégio, exatamente o que a spec pede.
- **Melhoria operacional (nova tarefa):** esse escopo é **"sensitive"** no Google → o projeto OAuth precisa passar por **verificação do Google** (justificativa por escopo + vídeo demonstrativo no consentimento). É trabalho de semanas de calendário, então tem que começar cedo no Incremento B. Adicionei isso ao `delivery/plan-calendar-sync.md`.

### 1.3 Pilha Cloudflare declarada — ✅ tudo atual

Realtime SFU, Containers (GA abr/2026), Images, Email Service, Turnstile, Workers/DO/Queues/Workflows/Hyperdrive/R2/KV/Vectorize/AI — todos confirmados como produtos vigentes. Nada do que o kit assume saiu de linha.

---

## Parte 2 — Oportunidades (propostas para você decidir)

Ordenadas por valor/esforço para **clínica única, uso interno**. Cada uma diz o que resolve e qual produto Cloudflare usa.

### 🔴 Alta prioridade (resolvem lacuna real do legado)

**O1 — Telemedicina no Cloudflare Realtime (RealtimeKit) em vez de Jitsi.**
O legado usa Jitsi com **sala pública sem senha** (lacuna A12 do dossiê). O Cloudflare **Realtime SFU** é um WebRTC na rede global da Cloudflare, e o **RealtimeKit** (UI Kit + Core SDK) adiciona vídeo/voz "em minutos", com controle de participantes, gravação e webhooks. Fica tudo na mesma conta/rede, com auth do nosso backend controlando quem entra na sala. Encaixa na Onda de telemedicina (A1). **Resolve segurança + reduz um vendor.**

**O2 — Turnstile no OTP do paciente e no agendamento público.**
Lacuna A4: OTP do portal sem rate limit nem CAPTCHA. **Turnstile** é o CAPTCHA invisível da Cloudflare (desafio em background, valida pelo Siteverify no Worker). Baixíssimo esforço, alto ganho. **Proposta: virar requisito de baseline**, não opcional, em toda superfície pública (login/OTP, reconexão de calendário, agendamento público, feed). Já existe skill `turnstile-spin` para montar.

**O3 — Cloudflare Images para mídia de paciente e biblioteca de exercícios.**
Suporta **HEIC** (formato nativo das fotos de iPhone — hoje daria dor de cabeça), gera variantes/resize automático, e tem **Direct Creator Upload** (o paciente/fisio envia foto sem expor seu token de API). Substitui manuseio manual de imagem. Bom para fotos clínicas, avatares, capas de exercício.

### 🟡 Média prioridade (simplificam e cortam vendors)

**O4 — Cloudflare Email Service para e-mail transacional.**
`env.EMAIL.send()` direto do Worker (HTML, anexos, imagens inline). Cobre os fluxos de e-mail do Better Auth (**magic link, verificação, reset**) e notificações (confirmação de consulta, retorno). Em beta pública, no plano Workers Paid. **Reduz dependência de SendGrid/terceiro.** Par natural do DEC-008.

**O5 — Cloudflare Containers para biomecânica/pose detection.**
No legado a biomecânica é **mock**. Detecção de pose e processamento de vídeo são pesados demais para o Worker. **Containers** (GA, até 100 vCPU / 400 GiB, preço por CPU ativa, imagens Docker Hub) roda modelos de pose (ex.: ffmpeg + python) sob demanda, acionado pelo Worker. **Destrava o módulo de biomecânica de verdade** na Onda A3.

**O6 — OTP de login por WhatsApp (reuso do Meta que já existe).**
Já registrado no ADR-0005: o plugin de telefone do Better Auth deixa você escolher o remetente do código. Como a clínica já paga a **WhatsApp Business API**, enviar o OTP por WhatsApp evita o custo de SMS e usa o canal que o paciente já usa. SMS (Twilio) como reserva.

### 🟢 Aprovadas para as respectivas ondas

**O7 — Transcrição de teleconsulta via Realtime → Workers AI.**
O adapter WebSocket do Realtime SFU entrega o áudio da chamada como frames PCM para um Worker/DO. Dá para transcrever a teleconsulta e alimentar a evolução clínica — reusando o Voice Scribe/ditado que já existe. Casa telemedicina (O1) com a IA clínica.

**O8 — Cloudflare Access (Zero Trust) no Painel Admin.**
Camada extra de proteção para as telas administrativas mais sensíveis, sem construir nada. Opcional; avaliar se o RBAC + Better Auth já bastam.

### Já em uso no legado (manter, não reintroduzir do zero)

Workers AI, AI Gateway, Vectorize, AI Search/AutoRAG, Stream, Browser Rendering, Durable Objects, Workflows, Queues, R2, KV, Analytics Engine, Hyperdrive — o dossiê confirma que a clínica já opera quase todo o catálogo. A reconstrução reusa esses padrões; a novidade aqui é **Realtime (telemedicina), Turnstile, Images, Email Service e Containers**.

---

## Parte 3 — Melhorias que já apliquei ao kit

1. `delivery/plan-calendar-sync.md`: nova tarefa **B0 — verificação de app do Google** (escopo sensível) começando cedo. (Turnstile fica no domínio de auth/portal, não no calendário: o feed é URL opaca sem formulário, então CAPTCHA não se aplica ali — ver DEC-024.)
2. `decisions/decision-register.md`: **DEC-023 a DEC-030** (Realtime, Turnstile baseline, Images, Email Service, Containers, OTP WhatsApp, transcrição de teleconsulta, Cloudflare Access) registradas como **Aceitas** (2026-07-14). Todas as 8 oportunidades foram aprovadas pelo proprietário; nenhuma opcional.
3. `ADR-0005`: nota de que o Better Auth roda via Hyperdrive + KV (rate limit) + plugin Organization, conforme docs atuais.

## Status

Todas as 8 oportunidades (O1–O8) foram **aprovadas** pelo proprietário em 2026-07-14 (DEC-023 a DEC-030). Distribuição por onda:

- **Baseline (Onda 1/fundação):** O2 Turnstile, O4 Email Service, O6 OTP por WhatsApp (junto do login).
- **Ondas de módulo:** O1 Realtime + O7 transcrição (telemedicina), O3 Images (mídia clínica/exercícios), O5 Containers (biomecânica), O8 Cloudflare Access (hardening do admin).

Nenhuma implementação iniciada — aguardando autorização explícita para criar o repositório e o primeiro slice.
