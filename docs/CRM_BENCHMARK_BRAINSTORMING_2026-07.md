# CRM FisioFlow — Benchmark de Concorrentes + Brainstorming de Features

**Data:** 23/07/2026 · **Autor:** Rafael + Claude · **Escopo:** clínica única (Activity/Mooca Fisio), uso interno, canais WhatsApp + Instagram + Webchat

---

## 0. O que foi resolvido hoje (contexto)

| Item | Status | Commit |
|---|---|---|
| Abrir conversa já na última mensagem (scroll ao fim, igual WhatsApp Web) | ✅ prod | `a3803d1da` |
| Respostas do Instagram enviadas pelo app do celular não apareciam no CRM | ✅ prod | `0ef548e85` |
| Remoção de binding Vectorize morto (arrastado no deploy) | ✅ prod | `b367c3f70` |

**Nota técnica sobre o bug do Instagram:** o webhook descartava *todos* os echoes (`is_echo`). Segundo a doc oficial da Meta (Messenger Platform), **o Instagram não tem campo `message_echoes` separado — os echoes já chegam pela subscrição `messages`** que a clínica já usa (por isso os DMs inbound funcionam). Ou seja, os echoes já estavam chegando e sendo jogados fora. O fix agora os grava como mensagem `outbound`, com dedup por `meta_message_id` para não duplicar o que o próprio CRM enviou via API. **Não precisa de nenhuma config extra na Meta.**

---

## 1. Benchmark — o que os concorrentes fazem

Analisei **Zenvia Customer Cloud**, **respond.io**, **ManyChat**, **Kommo**, **WATI**, **Chatfuel**, **Landbot** e o open-source **Chatwoot**. Consolidando por categoria:

### Inbox / Atendimento
- Caixa **omnichannel unificada** (WhatsApp, Instagram, Messenger, Webchat, SMS, e-mail, Telegram) — *todos*
- **Multiatendente** no mesmo número, com **filas e distribuição automática** (skill/round-robin/território) — Zenvia, respond.io, WATI, Chatwoot
- **Transbordo bot→humano** com contexto preservado + **resumo de handover** gerado por IA — respond.io (destaque)
- **Notas internas + @menções**, **labels**, **respostas rápidas (canned)**, **command bar / atalhos** — Chatwoot
- **Business hours + auto-responder** de ausência — Chatwoot, Zenvia
- **SLA tracking, CSAT, agent leaderboard** (métricas por atendente) — respond.io, Zenvia
- **Merge de contatos** entre canais — respond.io, Chatwoot

### Automação / Chatbot
- **Construtor visual no-code drag-and-drop** de fluxos — ManyChat, Landbot (destaque), respond.io, Kommo (Salesbot)
- **Chatbot de IA Generativa** treinável por **PDF/URL/FAQ** (RAG) com busca semântica — Zenvia, respond.io, Chatfuel
- **AI Agent autônomo** que qualifica lead, **agenda**, atualiza estágio do funil, dispara workflows, roteia por intenção, escala p/ humano — respond.io (líder), Zenvia (Meta Business Agent)
- **AI Assist**: rascunho de resposta, ajuste de tom, tradução, correção — todos
- **Ice breakers / quick replies** e **Default Reply** (rede de segurança) — ManyChat
- Gatilhos: mensagem recebida, mudança de campo, webhook, resposta de anúncio, agendado — respond.io

### Marketing / Campanhas
- **Broadcast segmentado + agendável** (WhatsApp/SMS/e-mail/RCS) — Zenvia, ManyChat, respond.io
- **Analytics de broadcast profundo**: enviado, entregue, **lido, clicado, falhas**, filtro por canal — respond.io, ManyChat
- **Click-to-WhatsApp / Click-to-Instagram Ads** com **atribuição de campanha** + **Meta Conversions API** — Zenvia, respond.io
- **WhatsApp Flows** (formulários interativos dentro do chat: agendar, coletar dados, confirmar) — Zenvia, respond.io
- **Templates HSM** com submissão/aprovação pela própria plataforma — WATI, todos

### Voz / Outros
- **WhatsApp Business Calling API + VoIP** (chamadas ativas/receptivas, gravação, **Voice AI Agent**) — respond.io, Zenvia
- **Transcrição de áudio inbound** + IA entende áudio — respond.io
- **Links de pagamento + catálogo** no chat — Zenvia
- **CDP nativo** (visão 360º) + integração ERP/CRM — Zenvia

---

## 2. Gap analysis — FisioFlow HOJE vs. concorrentes

**O FisioFlow já cobre uma parte grande do que essas plataformas vendem:**

| Já temos ✅ | Observação |
|---|---|
| Inbox omnichannel (WhatsApp + Instagram + Webchat) | Falta Messenger/Telegram (baixa prioridade p/ clínica) |
| IA no inbox (resumir, sugerir resposta, próxima ação) | via `runAi` + llama 3.1 8B |
| Lead score híbrido + funil de conversão | on-the-fly |
| Roteamento automático (leadRouting, gated) | |
| Templates WhatsApp (builder + submissão à Meta + sync status) | |
| Automações + canvas + `send_webhook` | |
| Concierge auto-reply (WA + IG) com guardas anti-alucinação | |
| Handoff bot→humano + criação de tarefa | |
| RAG clínico (wiki/protocolos) com chunking + busca híbrida | grounding nas telas prof |
| Campanhas + métricas de campanha | |
| NPS dashboard | |
| Ditado de voz (Nova-3 pt-BR) | na evolução |
| Retorno médico + envio WhatsApp | |

**Onde estão os GAPS reais (o que vale a pena considerar):**

| Falta / imaturo | Impacto p/ clínica | Concorrente-referência |
|---|---|---|
| **Agendamento dentro do WhatsApp** (paciente escolhe horário no chat) | 🔥 Alto — reduz ida-e-volta manual | WhatsApp Flows (Zenvia/respond.io) |
| **Broadcast agendado + analytics de leitura/clique** | 🔥 Alto — reativação e campanhas | ManyChat, respond.io |
| **Reativação de pacientes inativos (win-back)** automatizada | 🔥 Alto — receita recorrente | (todos via workflow) |
| **Pesquisa de satisfação pós-sessão (CSAT)** automática | Médio — já tem NPS, falta CSAT por sessão | Zenvia, respond.io |
| **Construtor visual de fluxos no-code** | Médio — hoje automação é mais "código" | Landbot, ManyChat |
| **Transcrição de áudio inbound** (paciente manda áudio) | Médio — agilidade do atendente | respond.io |
| **Métricas por atendente / SLA / tempo de 1ª resposta** | Médio — gestão da equipe | respond.io, Zenvia |
| **Link de pagamento no chat** (pacote/sessão) | Médio — fecha venda no canal | Zenvia |
| **Business hours + auto-responder de ausência** | Baixo/Médio — expectativa fora de horário | Chatwoot |
| **Envio de programa de exercícios (HEP) via WhatsApp** | 🔥 Alto — específico de fisio, diferencial | (nenhum concorrente genérico) |

---

## 3. Brainstorming — features priorizadas para o FisioFlow

Priorização por **valor × esforço**, focada no contexto real (clínica de fisioterapia, uso interno, já com base sólida de CRM):

### 🥇 P0 — Alto valor, esforço baixo/médio (fazer primeiro)

1. **Agendar consulta pelo WhatsApp (WhatsApp Flows)**
   Paciente recebe um formulário interativo no chat: escolhe serviço → vê horários livres (já temos disponibilidade + feriados D1) → confirma. Cria o agendamento direto na Agenda. *Elimina o "pode ser às 10h" manual que hoje vira tarefa.*

2. **Win-back de pacientes inativos**
   Workflow que detecta paciente sem sessão há N dias e dispara template de reengajamento (com opt-in). Reaproveita o motor de automações + templates já existentes. *Receita recorrente com quase zero esforço operacional.*

3. **Broadcast agendado + analytics de entrega/leitura**
   Agendar disparo de campanha para data/hora e mostrar entregue/lido/clicado/falha por contato. Estende o que já existe em Campanhas. *Base para qualquer ação de marketing séria.*

4. **CSAT pós-sessão automático**
   Após `report_sent`/alta da sessão, dispara 1 pergunta ("de 0 a 10, como foi seu atendimento?") e alimenta um painel. Complementa o NPS. *Sinal de qualidade por atendente e por paciente.*

### 🥈 P1 — Alto valor, esforço médio/alto

5. **Envio de Programa de Exercícios (HEP) pelo WhatsApp** *(diferencial de fisio)*
   O fisio monta o programa (já existe módulo de Exercícios) e envia como mensagem estruturada/PDF com vídeos. Nenhum concorrente genérico faz isso — é vantagem de nicho.

6. **Transcrição de áudio inbound**
   Paciente manda áudio → transcreve (já temos Nova-3 pt-BR no ditado) → atendente lê e a IA já sugere resposta. Reaproveita `scribeConfig`.

7. **Painel de produtividade da equipe** (tempo de 1ª resposta, conversas resolvidas, ranking) — gestão.

8. **Link de pagamento no chat** (pacote de 10 sessões / avaliação) — fecha venda sem sair do WhatsApp.

### 🥉 P2 — Estratégico, avaliar depois

9. **Construtor visual de fluxos no-code** (drag-and-drop) — grande esforço; só se a operação crescer e precisar que não-devs montem bots.
10. **WhatsApp Business Calling API / Voice AI** — só faz sentido com volume alto de ligações.
11. **AI Agent totalmente autônomo de agendamento** (evolução do concierge) — depende de maturidade dos guardas anti-alucinação.

---

## 4. Repositório open-source como base?

**Recomendação: NÃO trocar de base — o FisioFlow já está à frente para o caso de uso.**

- **Chatwoot** (MIT, `github.com/chatwoot/chatwoot`) é a referência open-source de inbox omnichannel: WhatsApp/IG/Messenger/Telegram, notas internas, labels, canned responses, auto-assignment, campanhas, custom attributes, AI agent "Captain", self-host. É **excelente como fonte de inspiração de UX e de features** (a lista de "o que um inbox maduro tem" acima veio muito dele).
- **Mas** é Ruby on Rails + Vue, arquitetura própria — **incompatível** com a stack do FisioFlow (Cloudflare Workers + Hono + React 19 + Neon + Drizzle). Migrar significaria jogar fora a integração profunda com Agenda, Evolução, RBAC, RAG clínico e o app mobile. Não compensa.

**Como usar o Chatwoot:** garimpar features e padrões de UX (ex.: command bar, canned responses, business hours, agent capacity, merge de contatos) e reimplementar pontualmente sobre a base atual. Considerar rodar uma instância só para estudar a UX.

---

## 5. Próximos passos sugeridos

1. **Validar o fix do Instagram em produção** — responder um DM pelo app do celular e confirmar que aparece no CRM como mensagem enviada.
2. Escolher **1–2 itens P0** para virar spec (recomendo **#1 Agendar pelo WhatsApp** + **#2 Win-back**).
3. Para o item escolhido, seguir o fluxo Spec-Driven (`specs/<slug>/spec.md` → `plan.md` → `tasks.md`) conforme o CLAUDE.md.

> Diz qual(is) item(ns) você quer atacar que eu faço o brainstorming detalhado + spec do primeiro.
