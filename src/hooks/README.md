# FisioFlow Hooks

Este diretório contém todos os hooks customizados do React para o FisioFlow.

## Estrutura

```
src/hooks/
├── index.ts              # Barrel export principal
├── README.md             # Esta documentação
│
├── appointments/         # Hooks de agendamentos
│   ├── index.ts
│   └── README.md
│
├── patients/             # Hooks de pacientes
│   └── index.ts
│
├── financial/            # Hooks financeiros
│   └── index.ts
│
├── ui/                   # Hooks de UI/UX
│   ├── index.ts
│   ├── useCommandPalette.tsx
│   ├── useImagePreload.ts
│   ├── useInView.ts
│   └── useVirtualizedList.ts
│
├── accessibility/        # Hooks de acessibilidade
│   ├── useMainContentProps.ts
│   └── useFocusVisibleHandler.ts
│
├── calendar/             # Hooks de calendário
│   ├── useAppointmentGroups.ts
│   └── useAppointmentPositioning.ts
│
├── ai/                   # Hooks de IA
├── chatbot/              # Hooks de chatbot
├── database/             # Hooks de banco de dados
├── error/                # Hooks de tratamento de erro
├── evolution/            # Hooks de evolução
├── mobile/               # Hooks específicos mobile
├── onboarding/           # Hooks de onboarding
├── performance/          # Hooks de performance
├── settings/             # Hooks de configurações
├── telemedicine/         # Hooks de telemedicina
│
└── [hooks avulsos]       # Hooks na raiz (serão migrados gradualmente)
```

## Como Usar

### Importação

```typescript
// ✅ Recomendado: importar de submódulos
import { useAppointments, useScheduleHandlers } from "@/hooks/appointments";
import { usePatients, usePatientCrud } from "@/hooks/patients";
import { useFinancial, useContasFinanceiras } from "@/hooks/financial";
import { useToast, useMobile } from "@/hooks/ui";

// ✅ Aceitável: importar do barrel principal
import { useAuth, usePatients, useExercises } from "@/hooks";

// ❌ Evitar: importar diretamente do arquivo
import { useAppointments } from "@/hooks/useAppointments";
```

### Exemplo Completo

```typescript
import { useFilteredAppointments, useScheduleState } from "@/hooks/appointments";
import { usePatientProfileOptimized } from "@/hooks/patients";
import { useToast } from "@/hooks/ui";

function MyComponent() {
  const { currentDate, viewType } = useScheduleState();
  const { data: appointments } = useFilteredAppointments({
    viewType,
    date: currentDate,
    organizationId: "org-123",
  });

  const { data: patient } = usePatientProfileOptimized({
    patientId: "patient-123",
    activeTab: "overview",
  });

  const { toast } = useToast();

  // ...
}
```

## Módulos

### 📅 appointments/

Hooks para gerenciamento de agendamentos, calendário e lista de espera.

**Principais hooks:**

- `useAppointments` - Lista de agendamentos
- `useFilteredAppointments` - Agendamentos com filtros
- `useScheduleState` - Estado da agenda (sincronizado com URL)
- `useScheduleHandlers` - Handlers para ações da agenda
- `useWaitlist` - Lista de espera

[Ver documentação completa →](./appointments/README.md)

### 👤 patients/

Hooks para gerenciamento de pacientes, documentos, evolução e prontuário.

**Principais hooks:**

- `usePatients` - Lista de pacientes
- `usePatientCrud` - Operações CRUD
- `usePatientDocuments` - Documentos do paciente
- `useSoapRecords` - Registros SOAP
- `usePainMaps` - Mapas de dor

### 💰 financial/

Hooks para gestão financeira, contas a pagar/receber e relatórios.

**Principais hooks:**

- `useFinancial` - Dados financeiros
- `useContasFinanceiras` - Contas a pagar/receber
- `useFluxoCaixa` - Fluxo de caixa
- `useRecibos` - Geração de recibos

### 🎨 ui/

Hooks para UI/UX, responsividade, acessibilidade e interações.

**Principais hooks:**

- `useToast` - Notificações toast
- `useMobile` - Detecção de dispositivo móvel
- `useDebounce` - Debounce de valores
- `useThrottle` - Throttle de funções
- `useIntersectionObserver` - Lazy loading

## Convenções

### Nomenclatura

- **Hooks**: Prefixo `use` + PascalCase (ex: `useAppointments`)
- **Arquivos**: camelCase com prefixo `use` (ex: `useAppointments.tsx`)

### Estrutura do Hook

```typescript
/**
 * Descrição breve do hook
 *
 * @description Descrição detalhada se necessário
 * @param {Type} paramName - Descrição do parâmetro
 * @returns {ReturnType} Descrição do retorno
 * @example
 * const { data, isLoading } = useMyHook(param);
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/v2/base";

interface UseMyHookOptions {
  param1: string;
  enabled?: boolean;
}

export function useMyHook(options: UseMyHookOptions) {
  const { param1, enabled = true } = options;

  return useQuery({
    queryKey: ["myKey", param1],
    queryFn: () => api.get(`/endpoint/${param1}`),
    enabled,
  });
}
```

### Query Keys

Use o arquivo `queryKeys.ts` para centralizar as chaves do React Query:

```typescript
// src/hooks/queryKeys.ts
export const appointmentKeys = {
  all: ["appointments"] as const,
  lists: () => [...appointmentKeys.all, "list"] as const,
  list: (filters: Record<string, unknown>) => [...appointmentKeys.lists(), filters] as const,
  details: () => [...appointmentKeys.all, "detail"] as const,
  detail: (id: string) => [...appointmentKeys.details(), id] as const,
};
```

## Manutenção

### Adicionando Novo Hook

1. **Identifique o domínio**: appointments, patients, financial, ui, ou outro
2. **Crie o arquivo**:
   - Se for de um domínio existente: `src/hooks/dominio/useNovoHook.ts`
   - Se for um novo domínio: crie uma pasta em `src/hooks/novo-dominio/`
3. **Adicione o export** no `index.ts` do domínio
4. **Documente** com JSDoc
5. **Atualize** o README do domínio se necessário

### Migrando Hooks

Para migrar hooks da raiz para submódulos:

1. **Não mova o arquivo** - mantenha na raiz para compatibilidade
2. **Adicione re-export** no `index.ts` do submódulo
3. **Atualize imports** gradualmente nos componentes
4. **Documente** a migração no README

### Depreciando Hooks

```typescript
/**
 * @deprecated Use useNewHook em vez deste
 * @see useNewHook
 */
export function useOldHook() {
  console.warn("useOldHook está depreciado. Use useNewHook.");
  return useNewHook();
}
```

## Boas Práticas

1. **Prefira composição**: Hooks pequenos e focados são melhores que um hook gigante
2. **Cache inteligente**: Use React Query com staleTime e cacheTime apropriados
3. **Otimistic updates**: Para melhor UX, use updates otimistas
4. **Error boundaries**: Trate erros adequadamente
5. **Loading states**: Sempre forneça estados de loading

## Veja Também

- [React Query Documentation](https://tanstack.com/query/latest)
- [Componentes](../components/README.md)
- [Tipos](../types/README.md)
- [API v2](../api/v2/README.md)
