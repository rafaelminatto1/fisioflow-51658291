# FisioFlow — Product Requirements Document (PRD)

**Documento de Requisitos do Produto (v4.0.0 - Foco em Edge & Neon)**

| Campo | Valor |
|-------|--------|
| Produto | FisioFlow |
| Versão do documento | 4.0 |
| Data | Abril 2026 |
| Status | Produção Estável - Arquitetura Neon-Native |
| Stakeholders | Gestão, equipe técnica, clínicas parceiras |

---

## 1. Visão e contexto

### 1.1 Declaração de visão

O **FisioFlow** é o sistema de gestão de alta performance para clínicas de fisioterapia, operando exclusivamente na borda (Edge) para garantir a menor latência e a melhor experiência de prontuário eletrônico do mercado brasileiro.

### 1.2 Missão

Modernizar a fisioterapia através de uma arquitetura resiliente, offline-first e centrada em dados, permitindo que o profissional foque no paciente enquanto o sistema automatiza a burocracia e a conformidade (LGPD).

### 1.3 Pilares Tecnológicos 2026

- **Edge-First:** Toda a API reside em Cloudflare Workers (Hono), operando a milissegundos do usuário.
- **Serverless Database:** Uso do Neon PostgreSQL com Hyperdrive para escalabilidade infinita e pooling de alta performance.
- **Segurança Nativa:** Isolamento de dados por organização (`organizationId`) garantido via Drizzle ORM e Neon Auth.

---

## 2. Objetivos e métricas de sucesso

### 2.1 Objetivos Primários

1. **Latência Irrelevante:** Prover uma experiência de prontuário (SOAP) que pareça uma aplicação local, com resposta de API (P95) < 200ms.
2. **Resiliência Offline:** Garantir que o fisioterapeuta possa registrar evoluções mesmo em instabilidades de rede, sincronizando automaticamente via PWA.
3. **Segurança de Dados:** 100% de conformidade com LGPD através de auditoria imutável e isolamento de banco de dados.

### 2.2 Métricas de Produto (KPIs)

| Métrica | Meta | Tecnologia de Medição |
|---------|------|------------------------|
| Tempo de Carregamento (LCP) | < 1.2 s | Cloudflare Web Analytics |
| Resposta de API (P95) | < 200 ms | Cloudflare Observability |
| Uptime SLA | > 99,9% | Neon / Cloudflare Status |
| Lighthouse Performance | ≥ 95 | CI Automated Audit |

---

## 3. Usuários e Segurança (RBAC)

O sistema utiliza **Neon Auth (Better Auth)** para autenticação e **Drizzle ORM** para autorização baseada em Roles.

| Role | Acesso |
|------|--------|
| **admin** | Gestão total da organização, faturamento e usuários. |
| **fisioterapeuta** | Agenda própria, prontuários, exercícios e avaliações. |
| **recepcionista** | Agendamento, check-in, financeiro básico. |
| **paciente** | Visualização de exercícios (App Mobile/PWA) e histórico. |

---

## 4. Stack Técnica Consolidada (v4.0)

| Camada | Tecnologia |
|--------|------------|
| **Runtime** | Node.js v20.12.0+ |
| **Frontend** | React 19, Vite 8, Rolldown |
| **Backend API** | Hono.js em Cloudflare Workers |
| **Database** | Neon PostgreSQL (Serverless) |
| **ORM** | Drizzle ORM |
| **Auth** | Neon Auth (JWKS / Better Auth) |
| **Deploy** | Cloudflare Pages (Front) / Workers (API) |
| **Mobile** | Expo / React Native (Capacitor Sync) |

---

## 5. Requisitos Não Funcionais (Segurança)

- **Isolamento de Tenants:** Todas as queries SQL injetam automaticamente o `organizationId` no contexto do Drizzle.
- **Criptografia:** TLS 1.3 em trânsito e criptografia AES-256 em repouso (Neon).
- **Auditoria:** Logs de modificação em tabelas sensíveis (patients, records) persistidos em D1/Neon.

---

*FisioFlow — Excelência clínica através da engenharia de ponta.*
