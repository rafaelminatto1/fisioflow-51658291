# Análise Completa do Banco de Dados Supabase - FisioFlow

## Data da Análise: 25/12/2025

## Resumo Executivo

A análise do banco de dados Supabase do projeto FisioFlow identificou vários problemas de segurança e performance que precisam ser corrigidos. Este documento detalha os problemas encontrados e as soluções implementadas.

---

## 1. Estrutura Atual do Banco de Dados

### Tabelas Existentes (62 tabelas)
- `analytics_events` - Eventos de analytics
- `appointments` - Agendamentos
- `assessment_test_configs` - Configurações de testes de avaliação
- `audit_logs` - Logs de auditoria
- `backups` - Backups
- `body_pain_maps` - Mapas de dor corporal
- `conduct_templates` - Templates de conduta
- `exercise_categories` - Categorias de exercícios
- `exercises` - Exercícios
- `knowledge_documents` - Documentos de conhecimento
- `knowledge_search_history` - Histórico de busca
- `landing_pages` - Páginas de landing
- `leads` - Leads
- `marketing_campaigns` - Campanhas de marketing
- `message_templates` - Templates de mensagens
- `notifications` - Notificações
- `organizations` - Organizações
- `package_usage` - Uso de pacotes
- `pain_map_points` - Pontos do mapa de dor
- `pain_maps` - Mapas de dor
- `pathologies` - Patologias
- `patient_goals` - Objetivos dos pacientes
- `patient_packages` - Pacotes de pacientes
- `patients` - Pacientes
- `payments` - Pagamentos
- `prescription_items` - Itens de prescrição
- `prescriptions` - Prescrições
- `profiles` - Perfis de usuários
- `session_packages` - Pacotes de sessões
- `session_templates` - Templates de sessão
- `sessions` - Sessões
- `surgeries` - Cirurgias
- `test_results` - Resultados de testes
- `treatment_goals` - Objetivos de tratamento
- `treatment_procedures` - Procedimentos de tratamento
- `waitlist` - Lista de espera
- `waiting_list` - Lista de espera (legado)
- `whatsapp_connections` - Conexões WhatsApp
- `whatsapp_messages` - Mensagens WhatsApp
- ... e outras tabelas auxiliares

### Migrations Aplicadas (23 no total)
Última migration: `20251225124011_create_views_and_seed`

---

## 2. Problemas de Segurança Identificados

### 2.1 Views com SECURITY DEFINER (CRÍTICO)
**Status:** ⚠️ Pendente de Correção

**Problema:**
- `patient_package_summary` - SECURITY DEFINER
- `today_appointments_with_packages` - SECURITY DEFINER

**Risco:** Views com SECURITY DEFINER executam com as permissões do criador da view, não do usuário que está consultando, o que pode contornar as políticas RLS.

**Solução:** Recriar as views sem SECURITY DEFINER.

### 2.2 Leaked Password Protection Desabilitado (IMPORTANTE)
**Status:** ⚠️ Requer Ação Manual no Dashboard

**Problema:** A proteção contra senhas vazadas está desabilitada no Supabase Auth.

**Solução:** Habilitar no dashboard do Supabase:
1. Ir para Authentication > Settings
2. Habilitar "Leaked Password Protection"
3. Link: https://supabase.com/docs/guides/auth/password-security

---

## 3. Problemas de Performance Identificados

### 3.1 Foreign Keys sem Índice (19 tabelas)
**Status:** ⚠️ Pendente de Correção

**Problema:** As seguintes foreign keys não têm índices de cobertura:

| Tabela | Foreign Key |
|--------|------------|
| exercise_categories | organization_id |
| exercises | created_by |
| message_templates | created_by, organization_id |
| package_usage | appointment_id, organization_id, patient_id, session_id, used_by |
| pain_maps | created_by |
| patient_packages | created_by, organization_id, package_id |
| payments | appointment_id, created_by |
| prescription_items | exercise_id |
| prescriptions | therapist_id |
| session_packages | created_by |
| whatsapp_messages | sent_by |

**Solução:** Criar índices para todas as foreign keys listadas.

### 3.2 RLS Policies com auth.uid() sem SELECT (56+ policies)
**Status:** ⚠️ Pendente de Correção

**Problema:** Políticas RLS usando `auth.uid()` diretamente são re-avaliadas para cada linha, causando performance ruim em tabelas grandes.

**Tabelas Afetadas:**
- patients (3 policies)
- appointments (3 policies)
- knowledge_documents (4 policies)
- knowledge_search_history (2 policies)
- organizations (1 policy)
- sessions (2 policies)
- body_pain_maps (1 policy)
- waitlist (1 policy)
- notifications (1 policy)
- waiting_list (4 policies)
- assessment_test_configs (1 policy)
- audit_logs (1 policy)
- backups (1 policy)
- leads (1 policy)
- landing_pages (1 policy)
- marketing_campaigns (1 policy)
- patient_goals (2 policies)
- analytics_events (1 policy)
- session_templates (1 policy)
- treatment_procedures (1 policy)
- surgeries (1 policy)
- pathologies (1 policy)
- test_results (1 policy)
- conduct_templates (1 policy)

**Solução:** Substituir `auth.uid()` por `(SELECT auth.uid())` em todas as policies.

### 3.3 Políticas RLS Duplicadas (8 tabelas)
**Status:** ⚠️ Pendente de Correção

**Problema:** Múltiplas políticas permissivas para o mesmo role e action causam overhead de performance.

**Tabelas Afetadas:**
- patient_goals - 2 policies duplicadas para cada action
- sessions - 2 policies duplicadas para SELECT

**Solução:** Consolidar políticas duplicadas em uma única política por table/role/action.

### 3.4 Índices Não Utilizados (80+ índices)
**Status:** ℹ️ Informativo

**Observação:** Muitos índices foram criados mas nunca utilizados. Isso pode indicar:
1. Sistema ainda em desenvolvimento/testes
2. Índices criados preventivamente
3. Patterns de acesso diferentes do esperado

**Recomendação:** Monitorar uso após o sistema entrar em produção e considerar remoção após análise de queries.

### 3.5 Conexões Auth com Número Absoluto
**Status:** ℹ️ Requer Ação Manual

**Problema:** Auth server configurado com número absoluto de conexões (10) ao invés de percentual.

**Solução:** Ajustar no dashboard do Supabase para usar percentual.

---

## 4. Migrations Criadas

### 4.1 Migration para Índices e RLS (Local)
**Arquivo:** `supabase/migrations/20251225200002_fix_remaining_issues.sql`

**Conteúdo:**
- Criação de 19 índices para foreign keys
- Correção de 56+ políticas RLS
- Recriação de 2 views sem SECURITY DEFINER

### 4.2 Migration Anterior (Já Aplicada)
**Arquivo:** `supabase/migrations/20251225123756_database_optimization_v3.sql`

**Conteúdo:**
- Otimizações iniciais do banco de dados
- Índices para tabelas principais

---

## 5. Ações Necessárias

### Imediatas (Alta Prioridade)

1. **Aplicar migration pendente:**
```bash
npx supabase db push
```

2. **Habilitar Leaked Password Protection:**
   - Dashboard Supabase > Authentication > Settings

### Curto Prazo (Média Prioridade)

3. **Monitorar performance após aplicação:**
   - Verificar advisors do Supabase
   - Rodar `get_advisors` para validar correções

4. **Ajustar estratégia de conexões Auth:**
   - Mudar de número absoluto para percentual

### Longo Prazo (Baixa Prioridade)

5. **Revisar índices não utilizados:**
   - Após 30 dias de produção, analisar e remover índices não utilizados

---

## 6. Tabelas Novas Criadas (v3.0)

As seguintes tabelas foram criadas para a versão 3.0:

| Tabela | Descrição | RLS | Triggers |
|--------|-----------|-----|----------|
| pain_maps | Mapas de dor detalhados | ✅ | ✅ updated_at |
| pain_map_points | Pontos do mapa de dor | ✅ | - |
| waitlist | Lista de espera inteligente | ✅ | ✅ updated_at |
| session_packages | Pacotes de sessões | ✅ | ✅ updated_at |
| patient_packages | Pacotes por paciente | ✅ | ✅ updated_at |
| package_usage | Uso de pacotes | ✅ | - |
| whatsapp_connections | Conexões WhatsApp | ✅ | ✅ updated_at |
| whatsapp_messages | Mensagens WhatsApp | ✅ | - |
| message_templates | Templates de mensagem | ✅ | ✅ updated_at |
| exercises | Banco de exercícios | ✅ | ✅ updated_at |
| exercise_categories | Categorias de exercícios | ✅ | - |
| prescriptions | Prescrições | ✅ | ✅ updated_at |
| prescription_items | Itens de prescrição | ✅ | - |
| payments | Pagamentos | ✅ | ✅ updated_at |
| medical_records | Prontuários médicos | ✅ | ✅ updated_at |
| patient_pathologies | Patologias por paciente | ✅ | ✅ updated_at |
| patient_surgeries | Cirurgias por paciente | ✅ | - |
| treatment_goals | Objetivos de tratamento | ✅ | ✅ updated_at |
| session_attachments | Anexos de sessão | ✅ | - |

---

## 7. Views Criadas

| View | Descrição | SECURITY |
|------|-----------|----------|
| patient_package_summary | Resumo de pacotes por paciente | INVOKER (após correção) |
| today_appointments_with_packages | Agendamentos do dia com pacotes | INVOKER (após correção) |

---

## 8. Edge Functions Existentes

O projeto possui as seguintes Edge Functions:

- `ai-chat` - Chat com IA
- `api-appointments` - API de agendamentos
- `api-patients` - API de pacientes
- `api-sessions` - API de sessões
- `api-reports` - API de relatórios
- `generate-conduct` - Geração de conduta
- `send-email` - Envio de emails
- `stripe-webhook` - Webhook do Stripe
- `webhook-handler` - Handler de webhooks
- ... e outras

---

## 9. Comandos Úteis

### Verificar advisors de segurança:
```bash
# Via Supabase CLI
npx supabase inspect db lint

# Via dashboard
# Settings > Database > Advisors
```

### Aplicar migrations:
```bash
npx supabase db push
```

### Ver migrations aplicadas:
```bash
npx supabase migration list
```

### Reset do banco (cuidado!):
```bash
npx supabase db reset
```

---

## 10. Conclusão

O banco de dados do FisioFlow está bem estruturado, mas precisa de algumas otimizações de performance e correções de segurança. As migrations criadas devem resolver a maioria dos problemas identificados pelos advisors do Supabase.

**Prioridades:**
1. ✅ Estrutura de tabelas - Completa
2. ⚠️ Índices para FKs - Pendente aplicação
3. ⚠️ RLS Policies otimizadas - Pendente aplicação
4. ⚠️ Views sem SECURITY DEFINER - Pendente aplicação
5. ⚠️ Leaked Password Protection - Requer ação manual
6. ℹ️ Índices não utilizados - Monitorar

---

*Documento gerado automaticamente pela análise do projeto FisioFlow*


