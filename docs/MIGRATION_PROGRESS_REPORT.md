# Relatório de Progresso: Migração Supabase → Firebase

**Data:** 24 de Janeiro de 2026  
**Status:** Em andamento (fase 3 de 6)

---

## Resumo Executivo

A migração do FisioFlow de Supabase para Firebase 100% Google Cloud está progredindo. Foram migrados **14 hooks críticos** e **1 workflow**, representando as funcionalidades principais do sistema. O build continua funcionando corretamente.

---

## Hooks Migrados (14)

| Hook | Descrição | Status |
|------|-----------|--------|
| `useUserProfile.ts` | Perfil de usuário e autenticação | ✅ Migrado |
| `useOnlineUsers.ts` | Usuários online em tempo real | ✅ Migrado |
| `useGamificationNotifications.ts` | Notificações de gamificação | ✅ Migrado |
| `useSoapRecords.ts` | Registros SOAP (evolução do paciente) | ✅ Migrado |
| `usePainMaps.ts` | Mapas de dor | ✅ Migrado |
| `useNotifications.ts` | Sistema de notificações | ✅ Migrado |
| `useEventos.ts` | Gestão de eventos | ✅ Migrado |
| `useDashboardStats.ts` | Estatísticas do dashboard | ✅ Migrado |
| `usePagamentos.ts` | Gestão de pagamentos | ✅ Migrado |
| `useGamification.ts` | Sistema de gamificação completo | ✅ Migrado |
| `useUsers.ts` | Gestão de usuários e roles | ✅ Migrado |
| `useAppointmentData.ts` | Dados de agendamentos | ✅ Migrado |
| `usePrescriptions.ts` | Prescrições de exercícios | ✅ Migrado |
| `usePatientAnalytics.ts` | Analytics completo do paciente | ✅ Migrado |

**Total migrado:** 14 hooks

---

## Workflows Migrados (1)

| Workflow | Descrição | Status |
|----------|-----------|--------|
| `appointments.ts` | Workflow de agendamentos | ✅ Já usava Firebase |

---

## Serviços que JÁ Usam Firebase (sem necessidade de migração)

- `patientService.ts` → `patientsApi` (Firebase Functions)
- `appointmentService.ts` → `appointmentsApi` (Firebase Functions)
- `exerciseService.ts` → `exercisesApi` (Firebase Functions)
- `financialService.ts` → Firebase Functions

---

## Arquivos Criados

### Firebase Integration Layer
- `packages/shared-api/src/firebase/presence.ts` - Sistema de presença
- `packages/shared-api/src/firebase/query.ts` - Query builder type-safe
- `packages/shared-constants/src/collections.ts` - Novas coleções (PRESENCE, PROFILES, USER_ROLES)

### Hooks Migrados (versões `.backup` criadas)
- `src/hooks/useUserProfile.ts.backup`
- `src/hooks/useOnlineUsers.ts.backup`
- `src/hooks/useGamificationNotifications.ts.backup`
- `src/hooks/useSoapRecords.ts.backup`
- `src/hooks/usePainMaps.ts.backup`
- `src/hooks/useNotifications.ts.backup`
- `src/hooks/useEventos.ts.backup`
- `src/hooks/useDashboardStats.ts.backup`
- `src/hooks/usePagamentos.ts.backup`
- `src/hooks/useGamification.ts.backup`
- `src/hooks/useUsers.ts.backup`
- `src/hooks/useAppointmentData.ts.backup`
- `src/hooks/usePrescriptions.ts.backup`
- `src/hooks/usePatientAnalytics.ts.backup`

### Lib Files Migrados
- `src/lib/database/profiles.ts` - Funções `ensureProfile`, `fetchProfile`, `updateProfile`

---

## Arquivos Restantes para Migrar

### src/hooks (95 arquivos)
- Hooks de gestão (useOrganizations, useTeams, etc.)
- Hooks clínicos (usePrescriptions, useExercises já usa Firebase, etc.)
- Hooks administrativos (useReports, useAnalytics, etc.)
- Hooks de integração (useWhatsApp, useCalendar, etc.)

### src/lib (15 arquivos)
- Services que usam Supabase diretamente
- Utils de gamification
- Audit middleware
- MFA utilities

---

## Padrões de Migração Estabelecidos

### Supabase → Firebase Mapping

| Supabase | Firebase |
|----------|----------|
| `supabase.from('collection')` | `collection(db, 'collection')` |
| `supabase.auth.getUser()` | `getFirebaseAuth().currentUser` |
| `supabase.storage` | `getFirebaseStorage()` |
| `supabase.channel()` | `onSnapshot()` |
| `.select().eq()` | `query(where(...))` |
| `.insert()` | `addDoc()` |
| `.update()` | `updateDoc()` |
| `.delete()` | `deleteDoc()` |
| `.rpc()` | Cloud Functions (pendente) |

---

## Build Status

✅ **Build funcionando**  
Última verificação: 24/01/2026  
Tempo de build: ~4 minutos

---

## Próximos Passos

1. **Continuar migração de hooks** (95 restantes)
   - Priorizar hooks mais usados
   - Hooks de gestão clínica
   - Hooks administrativos

2. **Migrar lib utils** (15 arquivos)
   - `src/lib/services/*`
   - `src/lib/auth/mfa.ts`
   - `src/lib/audit/auditMiddleware.ts`

3. **Migrar components** (se necessário)
   - Verificar componentes que importam Supabase diretamente

4. **Remover Supabase**
   - `pnpm remove @supabase/supabase-js supabase`
   - Remover `src/integrations/supabase/`
   - Limpar variáveis de ambiente

5. **Testes finais**
   - Testar todas funcionalidades principais
   - Verificar real-time subscriptions
   - Validar autenticação
