---
inclusion: always
---

# FisioFlow — Visão Geral do Produto

FisioFlow é um sistema completo de gestão para clínicas de fisioterapia, construído com stack moderna baseada em Cloudflare Workers + Neon PostgreSQL.

## Propósito

Solução digital para clínicas de fisioterapia que cobre gestão de pacientes, agendamento, prontuário eletrônico (SOAP), prescrição de exercícios, controle financeiro e analytics clínico.

## Funcionalidades Principais

- **Gestão de Pacientes**: Ciclo completo com conformidade LGPD, histórico médico, uploads e acompanhamento de progresso
- **Agenda**: Calendário avançado com detecção de conflitos, agendamentos recorrentes, notificações WhatsApp e sync Google Calendar
- **Prontuário Eletrônico**: Notas SOAP com assinatura digital, trilha de auditoria e controle de sessões
- **Biblioteca de Exercícios**: Base de exercícios com vídeos, prescrição e monitoramento de progresso
- **Financeiro**: Transações, pagamentos (Stripe), vouchers e relatórios
- **Analytics**: Dashboards em tempo real, métricas de retenção e performance da clínica
- **IA**: Recomendação de exercícios (Gemini), geração de SOAP, análise clínica e de movimento
- **Multi-tenant**: Isolamento por organização com controle de acesso baseado em roles (RBAC)

## Roles de Usuário

- **Admin**: Acesso total, gestão de usuários, relatórios financeiros
- **Fisioterapeuta**: Gestão de pacientes, prescrição de exercícios, prontuários SOAP
- **Estagiário**: Acesso limitado a pacientes, visualização de protocolos
- **Recepcionista**: Agendamentos e tarefas de recepção
- **Paciente**: Portal self-service com acesso a exercícios e histórico de consultas

## Público-Alvo

Clínicas de fisioterapia brasileiras que buscam digitalizar operações, melhorar a qualidade do atendimento e manter conformidade regulatória (LGPD).

## Plataforma

- **Web**: React SPA hospedada no Cloudflare Pages (`moocafisio.com.br`)
- **Mobile**: Capacitor 8 (iOS/Android) embutido no app web
- **API**: Cloudflare Workers com Hono (`api-pro.moocafisio.com.br`)
- **Banco de Dados**: Neon PostgreSQL (serverless, região `sa-east-1`) via Hyperdrive
- **Auth**: Neon Auth (JWT/JWKS) — **não usa Firebase**
- **Storage**: Cloudflare R2 (`media.moocafisio.com.br`)

## Arquitetura de Alto Nível

```
Browser/Mobile (React + Capacitor)
        │
        ▼
Cloudflare Pages (frontend estático)
        │
        ▼ REST (Hono)
Cloudflare Workers (apps/api)
        │
        ├── Neon PostgreSQL via Hyperdrive (dados relacionais)
        ├── Cloudflare D1 (edge cache, rate limiting, índices)
        ├── Cloudflare KV (config global)
        ├── Cloudflare R2 (mídia/documentos)
        ├── Cloudflare Durable Objects (estado real-time, agentes)
        ├── Cloudflare Queues (tarefas assíncronas)
        └── Cloudflare Workflows (automações duráveis multi-step)
```

## Convenções Críticas para IA

- **Nunca sugerir Firebase** — o projeto não usa Firebase em nenhuma camada
- **Auth é Neon Auth** — JWT verificado via JWKS no Worker; `profileId` e `organizationId` vêm do token
- **ORM é Drizzle** — schemas em `packages/db/src/schema/`, migrations via `drizzle-kit`
- **API é Hono** — rotas em `apps/api/src/`, validação com `@hono/zod-validator` + Zod
- **Isolamento multi-tenant** — toda query deve filtrar por `organization_id`
- **Linter é oxlint** — não ESLint; formatter é oxfmt
