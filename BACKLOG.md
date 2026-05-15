# Backlog — FisioFlow

> Última revisão: 2026-05-12  
> Ciclo atual: Entrega Estratégica e IA Clínica (Roadmap 2026)  
> Status: Sessão Épica Finalizada ✅

---

## Itens concluídos neste ciclo (Sprints 1–16)

| Item                            | Fase      | Entregável                                                     |
| ------------------------------- | --------- | -------------------------------------------------------------- |
| **Estabilização de Build**      | Infra     | OVERRIDES e pnpm hooks corrigidos para Expo/Workers            |
| **AI Studio (Scribe & Vision)** | Clínica   | SOAP por voz e HUD Cinemático 3D (Vision Camera)               |
| **Resiliência Transversal**     | Infra     | Offline-first Pro & Patient com sincronismo automático         |
| **Business Dashboard**          | BI        | Dashboards de CAC, LTV, Ocupação e Metas Reais                 |
| **Performance da Equipe**       | BI        | Produtividade e faturamento individual por fisioterapeuta      |
| **DRE Gerencial**               | Finanças  | Demonstrativo financeiro real com lucro e margem               |
| **AI Concierge WhatsApp**       | Mkt       | Triagem inteligente 24/7 e criação auto de tarefas             |
| **Semantic Knowledge Hub**      | IA        | Busca unificada (cmd+K) e Recomendador de Condutas             |
| **Gestão de Turmas**            | Operação  | Matrículas e Check-in mobile para Pilates/Grupos               |
| **Wearables Integration**       | Clínica   | Sincronismo HealthKit e Google Fit direto na evolução          |
| **Patient Digital Twin**        | IA        | Predição de alta e risco de abandono (Trajetória)              |
| **Chat com Exames (RAG)**       | IA        | Conversa inteligente com laudos PDF via Vectorize              |
| **Disaster Recovery**           | Infra     | Neon branching + R2 cross-region (ENAM)                        |
| **Programa de Indicação (MGM)** | Mkt       | Landing page e widget mobile para indicação premiada           |
| **BI Avançado (Cohorts/Churn)** | BI        | Heatmaps de retenção e lista ativa de possíveis evasões        |
| **Predição de No-Show (IA)**    | Clínica   | Lembretes WhatsApp personalizados conforme risco do paciente   |
| **Dashboard de Recepção (TV)**  | Operação  | Painel em tempo real via D1 para sala de espera                |
| **AI Anomaly Detection (RTM)**  | Clínica   | Monitoramento proativo de wearables com alertas de risco       |
| **Resumo de Telemedicina (IA)** | Clínica   | Resumos estruturados (SOAP) de sessões virtuais                |
| **História de Sucesso (IA)**    | Clínica   | Relatório motivacional ao receber alta clínica                 |
| **Patient 360° Chat**           | Clínica   | RAG completo com contexto de evolução, exames e wearables      |
| **Laudos Médicos (IA)**         | Médica    | Resumo executivo de desfecho funcional para o médico           |
| **Dashboard de Qualidade**      | Clínica   | Auditoria de excelência clínica via AI Peer-Review             |
| **Auto-Wiki**                   | Gestão    | Captura automática de casos de sucesso na base de conhecimento |
| **Previsão de Receita**         | BI        | Projeção preditiva (90 dias) baseada em ciclos IA e no-show    |
| **Dashboard Regional**          | BI        | Visão macro (Enterprise) para redes e franquias                |
| **NPS Sentiment Analysis**      | BI        | Categorização de feedback (Positivo/Neutro/Negativo) via IA    |
| **Comando de Voz (Voice-Task)** | Operação  | Criação de tarefas admin por voz no App do Fisioterapeuta      |
| **Estoque Inteligente**         | Operação  | Monitoramento de itens clínicos com alerta de reposição        |
| **Multi-tenant Hardening**      | Infra     | Isolamento absoluto de Cron Jobs e Agentes IA                  |
| **Metadados de Lançamento**     | Mobile    | ASO e descrições otimizadas para App Store/Google Play         |
| **Golden Path E2E (IA)**        | Hardening | Testes de Omnisearch, Digital Twin e SOAP no Playwright        |

---

## Próximo ciclo — Prioridade Alta (Lançamento)

- [ ] **Submissão para as Stores** — Iniciar processo com os metadados gerados em `docs/mobile/STORE_METADATA.md`
- [ ] **Configurar GitHub Secrets de staging** (`STAGING_TEST_USER_EMAIL`, `STAGING_TEST_USER_PASSWORD`, `STAGING_BASE_URL`)
- [ ] **Baselining de SLOs** — monitorar latência em São Paulo (< 60ms edge)

---

## Próximo ciclo — Prioridade Média (features clínicas)

| Item                                | Impacto | Dependência                                         |
| ----------------------------------- | ------- | --------------------------------------------------- |
| E2E — Fluxo de cadastro de paciente | Alto    | Secrets de staging configurados                     |
| E2E — Fluxo de agendamento          | Alto    | Idem                                                |
| E2E — Fluxo de evolução SOAP        | Alto    | Idem                                                |
| Agendamento pelo Paciente           | Médio   | Re-ativar `POST /booking` após validação da clínica |

---

## Rastreamento

Cada item de próximo ciclo deve ter ao abrir PR/issue:

- Épico / feature
- Critérios de aceitação
- Owner
- Data prevista
- Dependências identificadas
