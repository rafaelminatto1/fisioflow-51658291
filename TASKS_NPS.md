# NPS Feature Continuation Tasks

Este arquivo rastreia o progresso da implementação do loop de feedback (NPS), continuando o trabalho do Claude Code.

## Status Atual
- [x] In-app `NpsPrompt` e `useNpsPrompt` implementados.
- [x] `NpsPromptPortal` integrado ao `AppShellLayout` em `RouterLayouts.tsx`.
- [x] Cron job para disparo de NPS via WhatsApp configurado em `apps/api/src/cron.ts` (Usando `moocafisio.com.br`).
- [x] Dashboard de NPS (privado) criado em `src/pages/Surveys.tsx`.
- [x] Componente `NPSSurveyForm.tsx` criado e integrado.
- [x] Rota pública `/satisfacao` registrada em `src/routes/router.tsx`.
- [x] Página `/surveys` tornada pública com lógica condicional para Dashboard vs. Pesquisa.
- [x] Endpoint `POST /api/satisfaction-surveys/public` criado para submissões sem autenticação.
- [x] Hook `useCreateSurvey` atualizado para suportar submissões públicas.
- [x] **Rate Limiting (Anti-Spam)**: Implementado no edge (D1) para todos os endpoints de NPS públicos.

## Tarefas Concluídas

### 1. Página de Pesquisa Pública
- [x] Modificar `src/pages/Surveys.tsx` para detectar parâmetros `?nps=1&org=...` (Profissional) e `?p=...` (Paciente).
- [x] Renderizar o formulário apropriado (NPS simples para profissionais, `NPSSurveyForm` para pacientes).
- [x] Garantir que a página de pesquisa pública seja acessível sem autenticação.

### 2. Integração do NPSSurveyForm
- [x] Revisar `src/components/surveys/NPSSurveyForm.tsx` e garantir que ele envia os dados para o endpoint correto.
- [x] Adicionar suporte a campos adicionais (Qualidade, Profissionalismo, Comunicação) no formulário de paciente.

### 3. Ajustes na API
- [x] Verificar endpoint `POST /api/satisfaction-surveys/nps` (Profissional).
- [x] Criar endpoint `POST /api/satisfaction-surveys/public` (Paciente) que busca `organization_id` pelo `patient_id`.
- [x] Garantir que os endpoints aceitam submissões públicas (sem token de usuário).
- [x] Aplicar `rateLimit` (IP-based) nos endpoints públicos para evitar spam.

### 4. Analytics & Dashboards
- [x] Verificar se os gráficos em `CRMAnalytics.tsx` e `Surveys.tsx` estão refletindo os novos dados corretamente (Ambos usam a mesma tabela).

### 5. Validação & Testes
- [x] Implementado fluxo in-app (modal que aparece após 7 dias).
- [x] Implementado fluxo externo via `/surveys?nps=1` e `/satisfacao?p=...`.
- [x] Validada persistência no banco de dados Neon.
- [x] Configurado domínio de produção `moocafisio.com.br` nos links de WhatsApp.

---
*Última atualização: 30 de abril de 2026*
