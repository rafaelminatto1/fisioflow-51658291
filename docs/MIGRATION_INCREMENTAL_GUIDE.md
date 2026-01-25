# Guia de Migração Incremental - FisioFlow

## 🎯 Estratégia Híbrida Recomendada

Este guia detalha como manter **ambos os backends** (Supabase + Firebase) e migrar incrementalmente.

---

## 📋 Visão Geral da Arquitetura Híbrida

### Estado Atual

```
┌─────────────────────────────────────────────────────────┐
│                    FisioFlow                            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────┐      ┌──────────────┐               │
│  │   Supabase   │      │   Firebase   │               │
│  │              │      │              │               │
│  │  - Auth      │      │  - Auth      │               │
│  │  - DB (PG)   │      │  - Firestore │               │
│  │  - Realtime  │      │  - Functions │               │
│  │  - Storage   │      │  - Storage   │               │
│  └──────────────┘      └──────────────┘               │
│         │                      │                       │
│         └──────────┬───────────┘                       │
│                    ▼                                    │
│         ┌────────────────────┐                         │
│         │  Camada de Abstração│                        │
│         │  (shared-api)      │                         │
│         └────────────────────┘                         │
│                    │                                    │
│         ┌────────────────────┐                         │
│         │   Aplicação Web    │                         │
│         │   + Apps iOS       │                         │
│         └────────────────────┘                         │
└─────────────────────────────────────────────────────────┘
```

### Estratégia

1. **Manter Supabase** para features existentes estáveis
2. **Usar Firebase** para novos recursos
3. **Migrar features antigas** apenas quando necessário

---

## 🚀 Implementação

### Passo 1: Configurar Abstração

Criar uma camada de serviço que decide qual backend usar:

```typescript
// packages/shared-api/src/hybrid/backend-selector.ts

export enum Backend {
  SUPABASE = 'supabase',
  FIREBASE = 'firebase',
}

export class BackendSelector {
  private static featureBackendMap: Record<string, Backend> = {
    // Features que usam Firebase
    'auth': Backend.FIREBASE,
    'appointments': Backend.FIREBASE,
    'notifications': Backend.FIREBASE,
    'mobile-apps': Backend.FIREBASE,

    // Features que continuam com Supabase
    'patients': Backend.SUPABASE,
    'soap-records': Backend.SUPABASE,
    'financial': Backend.SUPABASE,
    'gamification': Backend.SUPABASE,
  };

  static getBackend(feature: string): Backend {
    return this.featureBackendMap[feature] || Backend.SUPABASE;
  }

  static useFirebase(feature: string): boolean {
    return this.getBackend(feature) === Backend.FIREBASE;
  }

  static useSupabase(feature: string): boolean {
    return this.getBackend(feature) === Backend.SUPABASE;
  }
}
```

### Passo 2: Hooks Híbridos

Criar wrappers que decidem qual backend usar:

```typescript
// src/hooks/useAuthHybrid.ts

import { useUserProfile as useFirebaseProfile } from './useUserProfile';
import { useUserProfile as useSupabaseProfile } from './useUserProfile.supabase';
import { BackendSelector } from '@fisioflow/shared-api';

export function useAuth() {
  const useFirebase = BackendSelector.useFirebase('auth');

  if (useFirebase) {
    return useFirebaseProfile();
  }

  return useSupabaseProfile();
}
```

### Passo 3: Configuração de Ambiente

```bash
# .env.local

# Supabase (mantido)
VITE_SUPABASE_URL=***
VITE_SUPABASE_ANON_KEY=***

# Firebase (ativo)
EXPO_PUBLIC_FIREBASE_API_KEY=***
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=***
EXPO_PUBLIC_FIREBASE_PROJECT_ID=***
```

---

## 📊 Plano de Migração por Feature

### Fase 1: Features Simples (Semanas 1-2)

| Feature | Backend Atual | Complexidade | Prioridade |
|---------|---------------|--------------|------------|
| Auth | Supabase | Baixa | Alta |
| Profile | Supabase | Baixa | Alta |
| Online Users | Supabase | Média | Média |

### Fase 2: Features Médias (Semanas 3-6)

| Feature | Backend Atual | Complexidade | Prioridade |
|---------|---------------|--------------|------------|
| Appointments | Supabase | Média | Alta |
| Notifications | Supabase | Média | Alta |
| Calendar | Supabase | Média | Média |

### Fase 3: Features Complexas (Semanas 7+)

| Feature | Backend Atual | Complexidade | Prioridade |
|---------|---------------|--------------|------------|
| Patients | Supabase | Alta | Alta |
| SOAP Records | Supabase | Alta | Alta |
| Financial | Supabase | Alta | Média |
| Gamification | Supabase | Alta | Baixa |

---

## 🔄 Processo de Migração de uma Feature

### Checklist

- [ ] **1. Análise**
  - [ ] Listar todos os arquivos da feature
  - [ ] Identificar dependências
  - [ ] Documentar queries Supabase

- [ ] **2. Preparação**
  - [ ] Criar collections Firestore
  - [ ] Configurar security rules
  - [ ] Criar índices necessários

- [ ] **3. Migração de Dados**
  - [ ] Script de migração Supabase → Firestore
  - [ ] Validar dados migrados
  - [ ] Backup dos dados originais

- [ ] **4. Código**
  - [ ] Criar hooks Firebase
  - [ ] Migrar componentes
  - [ ] Atualizar types

- [ ] **5. Testes**
  - [ ] Testes unitários
  - [ ] Testes de integração
  - [ ] Testes E2E

- [ ] **6. Deploy**
  - [ ] Deploy em staging
  - [ ] Testes de aceitação
  - [ ] Deploy em produção

- [ ] **7. Limpeza**
  - [ ] Remover código Supabase da feature
  - [ ] Atualizar documentação
  - [ ] Comunicar time

---

## 📝 Template de Script de Migração de Dados

```typescript
// scripts/migrate-feature-to-firebase.ts

import { createClient } from '@supabase/supabase-js';
import { getFirestore, collection, addDoc } from 'firebase/firestore';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const db = getFirestore();

async function migrateFeature() {
  // 1. Buscar dados do Supabase
  const { data: supabaseData } = await supabase
    .from('collection_name')
    .select('*');

  if (!supabaseData) {
    console.log('No data found');
    return;
  }

  // 2. Migrar para Firestore
  const batch = [];

  for (const record of supabaseData) {
    const docRef = doc(collection(db, 'collection_name'));
    batch.push(setDoc(docRef, {
      ...record,
      migratedAt: new Date().toISOString(),
    })));
  }

  await Promise.all(batch);
  console.log(`Migrated ${batch.length} records`);
}

migrateFeature().catch(console.error);
```

---

## 🎓 Exemplos Práticos

### Exemplo 1: Migrar uma Query Simples

**Antes (Supabase):**
```typescript
const { data } = await supabase
  .from('patients')
  .select('*')
  .eq('id', patientId)
  .single();
```

**Depois (Firebase):**
```typescript
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@fisioflow/shared-api';

const docRef = doc(db, 'patients', patientId);
const docSnap = await getDoc(docRef);
const data = docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
```

### Exemplo 2: Migrar uma Query com Relações

**Antes (Supabase):**
```typescript
const { data } = await supabase
  .from('appointments')
  .select('*, patient:patients(*)')
  .eq('id', appointmentId);
```

**Depois (Firebase):**
```typescript
// Buscar appointment
const appointmentRef = doc(db, 'appointments', appointmentId);
const appointmentSnap = await getDoc(appointmentRef);
const appointment = { id: appointmentSnap.id, ...appointmentSnap.data() };

// Buscar paciente separadamente
const patientRef = doc(db, 'patients', appointment.patient_id);
const patientSnap = await getDoc(patientRef);
const patient = patientSnap.exists() ? { id: patientSnap.id, ...patientSnap.data() } : null;
```

---

## 📈 Métricas de Sucesso

### Por Feature

- [ ] Todos os testes passando
- [ ] Performance mantida ou melhorada
- [ ] Zero erros em produção
- [ ] Documentação atualizada

### Geral

- [ ] % de features migradas
- [ ] Economia de custos
- [ ] Satisfação do time de desenvolvimento
- [ ] Feedback dos usuários

---

## 🆘 Troubleshooting

### Problema: Dados inconsistentes

**Solução:**
- Verificar script de migração
- Validar tipos de dados
- Comparar count de registros

### Problema: Performance piorou

**Solução:**
- Adicionar índices Firestore
- Usar queries paginadas
- Implementar cache

### Problema: Realtime não funciona

**Solução:**
- Usar Firestore onSnapshot
- Verificar security rules
- Implementar presença alternativa

---

**Última atualização:** 24 de Janeiro de 2026
**Status:** Pronto para uso
