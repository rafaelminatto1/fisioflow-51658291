# Plano de Implementação: Patient App + Professional App

## 1. Contexto atual
- `patient-app/STATUS.md` mostra que o MVP do paciente está pronto, mas ainda faltam os fluxos de notificações em nuvem (Cloud Functions + lembretes) e toda cadência de entrega via App Store (certificados, screenshots, TestFlight, submissão). O restante das funcionalidades do app paciente está completo, com testes automatizados em 93 suites.
- `professional-app/README.md` lista os bloqueios críticos: cadastro/gestão ativa de pacientes, criação e edição de consultas, evoluções/prescrições, notificações push e relatórios. Nada disso foi implementado ao nível do MVP.

## 2. Objetivo
Documentar um plano de execução de 12 semanas que finalize o patient app e entregue o MVP do professional app, com sinais de qualidade (tests, deploy, compliance) e linhas futuras para integrações avançadas. Cada fase leva em conta dependências técnicas (backend, Firebase, EAS) e prioridades do negócio (experiência paciente > profissional > integrações extras).

## 3. Roadmap condensado

| Fase | Duração | Foco | Principais entregas |
|---|---|---|---|
| Fase 1 | Semanas 1-2 | Finalizar notificações e pipeline de entrega do patient app | Cloud Functions de lembretes, lembretes personalizados, conf. de certificados e TestFlight, assets da App Store |
| Fase 2 | Semanas 3-6 | MVP completo do professional app | Gestão de pacientes, criação de consultas, evoluções, prescrição de exercícios, notificações push, relatórios básicos |
| Fase 3 | Semanas 7-9 | Qualidade, compliance e infra | QA (unitários + integrações + Playwright), LGPD/HIPAA docs, monitoramento, deploy automático via EAS + CI/CD |
| Fase 4 | Semanas 10-12 | Integrações avançadas + polimento | AI Coach básico, Apple Health, liderboards, marketing prep |

### 3.1 Fase 1 — Patient App final

**Sprint 1 (Semana 1)**
- `patient-app` cria/ou completa Cloud Functions responsáveis por lembretes automáticos e envios inteligentes
- Implementar lógica de lembretes baseados em histórico de adesão e possibilidade de reagendamento automático
- Validar triggers (apontadores Firebase, EAS project ID, tokens IoS/Android) e instrumentar logs contínuos

**Sprint 2 (Semana 2)**
- Completar fluxo de notificações (configurações de canais Android, modais, hooks `usePatientNotifications`)
- Gerar assets de App Store, preencher App Store Connect (descrições, keywords, policy)
- Executar Build TestFlight (`eas build --platform ios`), validar com QA e abrir submissão
- Atualizar `STATUS.md` para refletir aprovação/testFlight e coordenação com marketing

### 3.2 Fase 2 — Professional App MVP

**Sprint 3 (Semanas 3-4)**
- Módulo de Gestão de Pacientes
  - Tela `patients.tsx` com busca avançada e filtros (status tratamento, última consulta)
  - Perfil completo (dados pessoais, histórico de tratamentos, anotações clínicas)
  - Integração com backend (Firestore/Realtime) via `services/patientService`
- Módulo de Comunicação (chat básico e envio de fotos/vídeos)

**Sprint 4 (Semanas 5-6)**
- Módulo de Criação de Planos
  - Biblioteca de exercícios com `expo-av` e uploads
  - Editor visual drag-and-drop (pode ser MVP leve usando `FlatList` + ordenação manual)
  - Templates reutilizáveis e compartilhamento (envio de link ou QR code)
- Módulo de Acompanhamento
  - Dashboard de pacientes com métricas (progress, alertas não-adesão)
  - Reports exportáveis (CSV/PDF, via `expo-file-system`/`expo-print`)
- Notificações push para profissionais (alertas de pacientes inativos)

### 3.3 Fase 3 — Qualidade, compliance e CI/CD

- Cobertura de testes consistentemente >80%: hooks, services, componentes
- Playwright/E2E: fluxo login profissional, criação de consulta, prescrição + agendamento
- Documentação LGPD/HIPAA para mobile (política, consentimento, portabilidade)
- Pipeline CI (GitHub Actions) que roda `npm run lint`, `npm run typecheck`, `npm test`, builds `pnpm build` `patient`, `professional`
- Monitoramento: Sentry/Amplitude + alertas para erros críticos no patient/professional apps

### 3.4 Fase 4 — Integrações avançadas e polimento

- AI Assistant leve (sugestão de exercícios baseada em dados históricos, alertas de risco)
- Apple Health integrando leituras (passos, distância) e escritas de workouts (`expo-health` + `react-native-health`)
- Gamificação: streaks visíveis, níveis, badges e leaderboard por clínica
- Preparação de marketing (telas para landing page, vídeos, materiais para clínicas parceiras)

## 4. Organização prática

1. **Backlog principal** (módulos listados acima) deve ser transformado em issues individuais no GitHub com labels `patient-app` / `professional-app` e prioridade. Cada issue precisa conter critérios de aceitação e dono.
2. **Dailies**: checkpoints curtos sobre status (ex: notificações do patient, gestão de pacientes, QA). Documentos `STATUS.md` devem ser atualizados semanalmente.
3. **Indicadores de sucesso**: baseados nas métricas do roadmap — `DAU/MAU`, `Taxa de conclusão de exercícios`, `Planos criados por profissional`, `Tempo para criar plano < 5 min`, `Crash-free rate > 99%`.
4. **Tarefas críticas**: `professional-app` precisa de pelo menos 3 usuários profissionais para testar funcionalidades básicas antes de avançarmos para AI/Health.

## 5. Próximos passos imediatos (48h)
1. Finalizar os lembretes e Cloud Functions do `patient-app` para notificações inteligentes.
2. Atualizar `STATUS.md` e `README.md` com os checkpoints próximos da App Store (TestFlight, assets, informações de compliance).
3. Criar issues no GitHub para cada item do `professional-app` MVP (cadastro, consultas, evoluções, notificações, reports).
4. Estabelecer pipelines de CI/CD compartilhados (`pnpm test && npm run lint && npm run typecheck`).

## 6. Observações
- Os desenvolvimentos do `professional-app` dependem de APIs e serviços já existentes (Firebase, Supabase, etc.). Garanta que as chaves/testes estejam atualizados.
- Sempre considere LGPD/Privacidade ao lidar com uploads de fotos/vídeos e geração de relatórios.
- A comunicação continua via `STATUS.md` e `PLEANEJAMENTO.md` (este arquivo serve para alinhamento de estratégia). Continue consultando o roadmap de releases e use este plano como fonte de verdade para os próximos 90 dias.
