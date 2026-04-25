# Guia de Contribuição - FisioFlow

Este guia descreve as convenções e melhores práticas para manter o código do FisioFlow organizado e fácil de manter.

## 📁 Estrutura do Projeto

```
src/
├── api/                    # Camada de API
│   └── v2/                 # API v2 (Cloudflare Workers)
├── components/             # Componentes React
│   ├── ui/                 # Componentes base (shadcn/ui)
│   ├── schedule/           # Componentes da Agenda ⭐
│   ├── patients/           # Componentes de Pacientes
│   └── ...
├── hooks/                  # Hooks customizados
│   ├── appointments/       # Hooks de agendamentos
│   ├── patients/           # Hooks de pacientes
│   ├── financial/          # Hooks financeiros
│   └── ui/                 # Hooks de UI
├── lib/                    # Utilitários e configurações
├── pages/                  # Páginas/rotas
├── routes/                 # Rotas modularizadas ⭐
│   ├── index.tsx           # Barrel export
│   ├── auth.tsx            # Rotas de autenticação
│   ├── core.tsx            # Rotas do núcleo
│   ├── patients.tsx        # Rotas de pacientes
│   ├── cadastros.tsx       # Rotas de cadastros
│   ├── financial.tsx       # Rotas financeiras
│   ├── reports.tsx         # Rotas de relatórios
│   ├── admin.tsx           # Rotas administrativas
│   ├── marketing.tsx       # Rotas de marketing
│   ├── ai.tsx              # Rotas de IA
│   ├── gamification.tsx    # Rotas de gamificação
│   └── enterprise.tsx      # Rotas enterprise
├── types/                  # Tipos TypeScript
├── utils/                  # Funções utilitárias
└── contexts/               # Context providers
```

## 🎯 Área Principal: Agenda

A página de Agenda (`src/pages/Schedule.tsx`) é a mais utilizada. Sua estrutura:

### Hooks de Agenda

```typescript
// src/hooks/appointments/
import {
  useFilteredAppointments, // Agendamentos com filtros
  useScheduleState, // Estado sincronizado com URL
  useScheduleHandlers, // Handlers de ações
  useWaitlist, // Lista de espera
} from "@/hooks/appointments";
```

### Componentes de Agenda

```typescript
// src/components/schedule/
import {
  CalendarView, // Visualização principal
  AppointmentCard, // Card de agendamento
  AppointmentModal, // Modal de criação/edição
  QuickFilters, // Filtros rápidos
} from "@/components/schedule";
```

## 📝 Convenções de Código

### Importações

```typescript
// ✅ Ordem recomendada:
// 1. React e bibliotecas externas
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

// 2. Componentes UI
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

// 3. Componentes de domínio
import { CalendarView } from "@/components/schedule";

// 4. Hooks
import { useAppointments } from "@/hooks/appointments";

// 5. Tipos
import type { Appointment } from "@/types";

// 6. Utilitários
import { formatDate } from "@/utils/dateUtils";
```

### Nomenclatura

| Tipo                   | Convenção        | Exemplo               |
| ---------------------- | ---------------- | --------------------- |
| Componentes            | PascalCase       | `AppointmentCard`     |
| Hooks                  | camelCase + use  | `useAppointments`     |
| Funções                | camelCase        | `formatDate`          |
| Constantes             | UPPER_SNAKE_CASE | `MAX_RETRIES`         |
| Tipos/Interfaces       | PascalCase       | `Appointment`         |
| Arquivos de componente | PascalCase       | `AppointmentCard.tsx` |
| Arquivos de hook       | camelCase        | `useAppointments.ts`  |
| Arquivos de utilitário | camelCase        | `dateUtils.ts`        |

### Componentes

```typescript
/**
 * ComponentName - Descrição breve
 *
 * @description Descrição detalhada se necessário
 * @example
 * <ComponentName prop="value" />
 */

import { useState } from "react";
import { cn } from "@/lib/utils";

interface ComponentNameProps {
  /** Descrição da prop obrigatória */
  requiredProp: string;
  /** Descrição da prop opcional */
  optionalProp?: number;
  /** Callback */
  onAction?: () => void;
  /** Classes CSS adicionais */
  className?: string;
}

export function ComponentName({
  requiredProp,
  optionalProp = 0,
  onAction,
  className,
}: ComponentNameProps) {
  // Implementação
}
```

### Hooks

```typescript
/**
 * useFeatureName - Descrição breve
 *
 * @description Descrição detalhada
 * @param options - Opções de configuração
 * @returns Objeto com dados e funções
 * @example
 * const { data, isLoading } = useFeatureName({ id: '123' });
 */

import { useQuery } from "@tanstack/react-query";

interface UseFeatureNameOptions {
  id: string;
  enabled?: boolean;
}

export function useFeatureName(options: UseFeatureNameOptions) {
  const { id, enabled = true } = options;

  return useQuery({
    queryKey: ["feature", id],
    queryFn: () => fetchFeature(id),
    enabled,
  });
}
```

## 🔄 Fluxo de Trabalho

### Adicionando Nova Feature

1. **Criar tipos** em `src/types/` se necessário
2. **Criar hook** em `src/hooks/[dominio]/`
3. **Criar componentes** em `src/components/[dominio]/`
4. **Adicionar exports** nos `index.ts`
5. **Criar página** em `src/pages/` se necessário
6. **Adicionar rota** (veja seção Rotas abaixo)
7. **Testar**

### Adicionando Nova Rota

As rotas estão organizadas por domínio em `src/routes/`:

```typescript
// src/routes/patients.tsx
import { lazy } from 'react';
import { Route } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';

// Lazy load da página
const NewPage = lazy(() => import(/* webpackChunkName: "new-page" */ "@/pages/NewPage"));

export const patientsRoutes = (
  <>
    <Route path="/new-page" element={<ProtectedRoute><NewPage /></ProtectedRoute>} />
  </>
);
```

**Ao adicionar uma nova rota:**

1. Identifique o domínio correto (patients, financial, admin, etc.)
2. Use lazy loading com webpackChunkName
3. Envolva com `ProtectedRoute` se necessário
4. Adicione ao arquivo do domínio ou crie um novo
5. Exporte no `src/routes/index.tsx`

### Corrigindo Bug

1. **Identificar o componente/hook** afetado
2. **Ler a documentação** do módulo
3. **Fazer a correção**
4. **Testar cenários**
5. **Atualizar documentação** se necessário

## 📚 Documentação

### READMEs por Módulo

- [Hooks](src/hooks/README.md)
- [Components](src/components/README.md)
- [Schedule Components](src/components/schedule/README.md)
- [Appointments Hooks](src/hooks/appointments/README.md)

### JSDoc

Use JSDoc para documentar:

- Componentes e suas props
- Hooks e seus parâmetros
- Funções utilitárias
- Tipos complexos

## 🧪 Testes

### Estrutura

```
src/
├── components/
│   └── schedule/
│       └── __tests__/
│           ├── CalendarView.test.tsx
│           └── AppointmentCard.test.tsx
└── hooks/
    └── __tests__/
        └── useAppointments.test.ts
```

### Executar Testes

```bash
# Todos os testes
npm test

# Testes específicos
npm test -- schedule

# Com coverage
npm test -- --coverage
```

## 🚀 Performance

### Lazy Loading

Use lazy loading para componentes pesados:

```typescript
const HeavyComponent = lazy(() => import('./HeavyComponent'));

function Parent() {
  return (
    <Suspense fallback={<Skeleton />}>
      <HeavyComponent />
    </Suspense>
  );
}
```

### Query Keys

Centralize as chaves do React Query:

```typescript
// src/hooks/queryKeys.ts
export const appointmentKeys = {
  all: ["appointments"] as const,
  list: (filters: Filters) => [...appointmentKeys.all, "list", filters] as const,
  detail: (id: string) => [...appointmentKeys.all, "detail", id] as const,
};
```

### Cache

Configure cache apropriadamente:

```typescript
useQuery({
  queryKey: appointmentKeys.list(filters),
  queryFn: fetchAppointments,
  staleTime: 5 * 60 * 1000, // 5 minutos
  gcTime: 30 * 60 * 1000, // 30 minutos
});
```

## 🔒 Segurança

### Nunca Fazer

- ❌ Commitar secrets ou API keys
- ❌ Usar `any` sem necessidade
- ❌ Ignorar erros sem tratamento
- ❌ Armazenar dados sensíveis em localStorage

### Sempre Fazer

- ✅ Validar inputs do usuário
- ✅ Usar tipos específicos
- ✅ Tratar erros adequadamente
- ✅ Usar HTTPS para APIs

## 📦 Dependências

### Adicionando Dependência

```bash
# Dependência de produção
npm install package-name

# Dependência de desenvolvimento
npm install -D package-name
```

### Verificando Dependências

```bash
# Verificar dependências desatualizadas
npm outdated

# Verificar vulnerabilidades
npm audit
```

## 🐛 Debug

### Logs

Use o logger do projeto:

```typescript
import { fisioLogger as logger } from "@/lib/errors/logger";

logger.info("Mensagem informativa", { data });
logger.error("Erro ocorrido", { error }, "Contexto");
logger.warn("Aviso", { details });
```

### React Query DevTools

Em desenvolvimento, as DevTools do React Query estão disponíveis.

## 📞 Contato

Em caso de dúvidas:

1. Consulte a documentação
2. Verifique os READMEs dos módulos
3. Pergunte à equipe

---

**Última atualização:** Março 2026
