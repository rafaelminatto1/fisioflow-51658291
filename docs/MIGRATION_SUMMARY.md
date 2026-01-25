# FisioFlow - Resumo da Migração Supabase → Firebase

## 📊 Análise Real do Projeto

### Descoberta Crítica

A análise inicial identificou **20 arquivos** usando Supabase diretamente. No entanto, uma varredura mais profunda revelou:

| Tipo | Quantidade |
|------|-----------|
| Imports `@supabase/supabase-js` | 20 |
| Imports `@/integrations/supabase/client` | **220** |
| **TOTAL** | **240 arquivos** |

### Estrutura do Projeto Atual

```
FisioFlow
├── apps/
│   ├── patient-ios/         ✅ Já existe (Expo)
│   └── professional-ios/    ✅ Já existe (Expo)
│
├── packages/
│   ├── shared-api/          ✅ Parcialmente migrado
│   ├── shared-constants/    ✅ Já existe
│   ├── shared-types/        ✅ Já existe
│   ├── shared-ui/           ✅ Já existe
│   └── shared-utils/        ✅ Já existe
│
├── src/
│   ├── integrations/
│   │   └── supabase/        ⚠️ 240 arquivos dependem disto
│   ├── hooks/               ⚠️ 120+ hooks usam Supabase
│   ├── inngest/workflows/   ⚠️ 11 workflows usam Supabase
│   └── lib/                 ⚠️ 5 utils usam Supabase
│
└── functions/               ✅ Cloud Functions Firebase
```

## ✅ Migrações Concluídas

### 1. shared-api Expandido

Arquivos criados em `packages/shared-api/src/firebase/`:

| Arquivo | Descrição | Status |
|---------|-----------|--------|
| `presence.ts` | Sistema de presença Firestore | ✅ Criado |
| `query.ts` | Query builder type-safe | ✅ Criado |

### 2. Hooks Migrados

| Hook Original | Hook Migrado | Status |
|---------------|--------------|--------|
| `useUserProfile.ts` | `useUserProfile.migrated.ts` | ✅ Criado |
| `useOnlineUsers.ts` | `useOnlineUsers.migrated.ts` | ✅ Criado |
| `useGamificationNotifications.ts` | `useGamificationNotifications.migrated.ts` | ✅ Criado |

### 3. Inngest Workflows

| Workflow | Status |
|----------|--------|
| `appointments.ts` | ✅ Migrado |

### 4. Ferramentas

| Ferramenta | Descrição | Status |
|------------|-----------|--------|
| `migrate-to-firebase.sh` | Script de migração | ✅ Criado |

## 📈 Esforço de Migração Completo

### Análise por Categoria

| Categoria | Arquivos | Esforço Estimado |
|-----------|----------|------------------|
| **Hooks críticos** | 3 | ✅ Concluído |
| **Hooks restantes** | 117 | 20-30 dias |
| **Inngest workflows** | 1 (de 11) | 2-5 dias |
| **Workflows restantes** | 10 | 15-20 dias |
| **Lib utils** | 0 (de 5) | 3-5 dias |
| **Components** | 120+ | 30-40 dias |
| **Services** | 20+ | 10-15 dias |
| **Limpeza** | - | 2-3 dias |
| **Testes** | - | 10-15 dias |
| **TOTAL** | **~240** | **~90-130 dias** |

## 🎯 Estratégia Recomendada: Migração Incremental

### Opção 1: Migração Completa (90-130 dias)

- Migrar todos os 240 arquivos
- Remover completamente Supabase
- Testes exaustivos

### Opção 2: Migração Híbrida PERMANENTE (Recomendado)

**Manter ambos os backends:**

1. **Firebase para:**
   - Autenticação principal
   - Cloud Functions (API)
   - Apps iOS
   - Firestore para novos recursos

2. **Supabase para:**
   - Consultas complexas existentes
   - Realtime subscriptions
   - Legacy features

3. **Vantagens:**
   - Risco ZERO de regressão
   - Tempo de implementação: 5-10 dias
   - Pode migrar incrementalmente por feature
   - Rollback instantâneo possível

## 🚀 Plano de Ação Imediato

### Se opção MIGRAÇÃO COMPLETA:

```bash
# 1. Continuar migração incremental
# Focar em hooks por feature (ex: hooks de pacientes primeiro)

# 2. Para cada feature:
#    - Migrar hooks
#    - Migrar componentes
#    - Testar feature
#    - Deploy
```

### Se opção MIGRAÇÃO HÍBRIDA (Recomendado):

```bash
# 1. Deixar Supabase como está
# 2. Usar Firebase para NOVAS features
# 3. Migrar features antigas conforme necessidade
#    - Começar por features mais simples
#    - Priorizar features que precisam de melhor performance
```

## 📋 Checklist de Decisão

### Perguntas para o Time:

1. **Qual a urgência de remover Supabase?**
   - [ ] Urgente (custos, contrato, etc.)
   - [ ] Não urgente (pode esperar)

2. **Qual o risco aceitável?**
   - [ ] Alto risco para completar rápido
   - [ ] Baixo risco, demorar mais

3. **Recursos disponíveis?**
   - [ ] 1 desenvolvedor
   - [ ] 2-3 desenvolvedores
   - [ ] Time completo

4. **Custos operacionais?**
   - [ ] Supabase está custando muito
   - [ ] Custo aceitável por enquanto

## 📞 Próximos Passos

### Passo 1: Decisão

- Reunião com stakeholders para definir estratégia
- Escolher entre **Migração Completa** ou **Híbrida**

### Passo 2: Execução

**Se Completa:**
```bash
# Continuar migração sistemática
# Priorizar features críticas
```

**Se Híbrida:**
```bash
# Documentar arquitetura híbrida
# Criar guias para desenvolvedores
# Migrar apenas novos recursos
```

### Passo 3: Documentação

Atualizar toda documentação com a arquitetura escolhida.

---

**Data:** 24 de Janeiro de 2026
**Status:** Análise concluída, aguardando decisão estratégica
**Documentos relacionados:**
- [Plano Original](./MIGRATION_PLAN_ENHANCED.md)
- [Scripts](../scripts/migrate-to-firebase.sh)
