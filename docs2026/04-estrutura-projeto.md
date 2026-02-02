# 04. Estrutura do Projeto

## 📁 Estrutura de Pastas

```
fisioflow/
├── docs2026/                    # Documentação oficial
├── public/                      # Arquivos estáticos
│   ├── locales/                 # Traduções (i18n)
│   └── vite.svg                 # Favicon
├── src/
│   ├── components/              # Componentes React
│   │   ├── ui/                  # shadcn/ui components
│   │   ├── evaluation/          # Componentes de avaliação
│   │   ├── layout/              # Layout components
│   │   └── ...                  # Outros componentes de domínio
│   ├── hooks/                   # Custom React hooks
│   ├── lib/                     # Utilitários e configurações
│   │   ├── firebase.ts          # Cliente Firebase
│   │   └── utils.ts             # Funções utilitárias
│   ├── pages/                   # Páginas (rotas)
│   │   ├── cadastros/           # Páginas de cadastros
│   │   ├── financeiro/          # Páginas financeiras
│   │   ├── relatorios/          # Páginas de relatórios
│   │   └── ...                  # Outras páginas
│   ├── routes/                  # Configuração de rotas
│   ├── stores/                  # Zustand stores
│   ├── types/                   # TypeScript types
│   ├── App.tsx                  # Componente principal
│   └── main.tsx                 # Entry point
├── firebase/                    # Backend Firebase
│   ├── migrations/              # Database migrations
│   └── functions/               # Edge functions
├── e2e/                         # Testes E2E (Playwright)
├── scripts/                     # Scripts utilitários
├── docs/                        # Documentação adicional
└── [config files]               # Arquivos de configuração
```

## 📂 Detalhamento das Principais Pastas

### `/src/components`

```
components/
├── ui/                          # Componentes base (shadcn/ui)
│   ├── button.tsx
│   ├── input.tsx
│   ├── card.tsx
│   ├── dialog.tsx
│   └── index.ts                 # Exportações centralizadas
│
├── layout/                      # Componentes de layout
│   ├── MainLayout.tsx           # Layout principal
│   ├── Sidebar.tsx              # Sidebar navigation
│   ├── Header.tsx               # Header da aplicação
│   └── MobileNav.tsx            # Navegação mobile
│
├── evaluation/                  # Componentes de avaliação
│   ├── EvaluationFormBuilder.tsx
│   ├── EvaluationTemplateSelector.tsx
│   └── DynamicFieldRenderer.tsx
│
├── patients/                    # Componentes de pacientes
│   ├── PatientCard.tsx
│   ├── PatientForm.tsx
│   └── PatientList.tsx
│
├── schedule/                    # Componentes de agenda
│   ├── AppointmentCalendar.tsx
│   ├── AppointmentForm.tsx
│   └── TimeSlotPicker.tsx
│
└── ...                          # Mais componentes de domínio
```

### `/src/hooks`

```typescript
// Hooks de API (TanStack Query)
hooks/
├── usePatients.ts               // useQuery para pacientes
├── useAppointments.ts           // useQuery para agendamentos
├── useExercises.ts              // useQuery para exercícios
├── useEvaluationForms.ts        // useQuery para fichas de avaliação
│
├── useCreatePatient.ts          // useMutation para criar
├── useUpdateAppointment.ts      // useMutation para atualizar
├── useDeleteExercise.ts         // useMutation para deletar
│
└── ...                          // Mais hooks de API

// Hooks customizados
hooks/
├── useAuth.ts                   // Hook de autenticação
├── usePermissions.ts            // Hook de permissões (RBAC)
├── useMediaQuery.ts             // Hook de media queries
├── useDebounce.ts               // Hook de debounce
└── useLocalStorage.ts           // Hook de localStorage
```

### `/src/pages`

```
pages/
├── Auth.tsx                     # Login/Cadastro
├── Welcome.tsx                  # Página de boas-vindas
│
├── Patients.tsx                 # Lista de pacientes
├── Schedule.tsx                 # Agenda
├── MedicalRecord.tsx            # Prontuário SOAP
├── Exercises.tsx                # Biblioteca de exercícios
├── Financial.tsx                # Financeiro
├── Reports.tsx                  # Relatórios
│
├── cadastros/                   # Cadastros do sistema
│   ├── EvaluationFormsPage.tsx  # Fichas de avaliação
│   ├── EvolutionTemplatesPage.tsx
│   ├── ServicosPage.tsx
│   ├── ConveniosPage.tsx
│   └── ...                      # Mais cadastros
│
├── financeiro/                  # Páginas financeiras
│   ├── ContasFinanceirasPage.tsx
│   ├── FluxoCaixaPage.tsx
│   ├── NFSePage.tsx
│   └── ...                      # Mais financeiro
│
├── relatorios/                  # Páginas de relatórios
│   ├── AttendanceReport.tsx
│   ├── TeamPerformance.tsx
│   └── ...                      # Mais relatórios
│
├── admin/                       # Páginas administrativas
│   └── gamification/
│       └── AdminGamificationPage.tsx
│
└── ...                          # Mais páginas
```

### `/src/lib`

```typescript
lib/
├── firebase.ts                  # Cliente Firebase configurado
│
├── api/                         # Funções de API
│   ├── patients.ts
│   ├── appointments.ts
│   ├── exercises.ts
│   └── ...                      # Mais APIs
│
├── validations/                 # Schemas Zod
│   ├── patient.ts
│   ├── appointment.ts
│   └── ...                      # Mais validações
│
├── utils.ts                     # Funções utilitárias (cn, etc)
├── constants.ts                 # Constantes globais
├── format.ts                    # Formatação (moeda, data, etc)
└── logger.ts                    # Sistema de logging
```

### `/src/types`

```typescript
types/
├── index.ts                     # Exportações centralizadas
├── database.types.ts            # Tipos do Firebase (gerado)
│
├── clinical-forms.ts            # Tipos de fichas clínicas
│   ├── EvaluationForm
│   ├── EvaluationFormField
│   └── ClinicalFieldType
│
├── patient.ts                   # Tipos de paciente
├── appointment.ts               # Tipos de agendamento
├── exercise.ts                  # Tipos de exercício
├── evolution.ts                 # Tipos de evolução
└── ...                          # Mais tipos
```

### `/firebase`

```
firebase/
├── migrations/                  # Database migrations
│   ├── 20240101000000_initial_schema.sql
│   ├── 20250109000001_push_notifications_schema.sql
│   ├── 20260113220000_seed_evaluation_templates.sql
│   └── ...                      # Mais migrations
│
└── functions/                   # Edge Functions (Deno)
    ├── prescribe-exercise/
    ├── analyze-evolution/
    └── ...                      # Mais functions
```

## 🔄 Convenções de Nomenclatura

### Arquivos

| Tipo | Convenção | Exemplo |
|------|-----------|---------|
| Componentes | PascalCase | `PatientCard.tsx` |
| Hooks | camelCase com `use` | `usePatients.ts` |
| Utilitários | camelCase | `formatCurrency.ts` |
| Tipos | PascalCase | `PatientForm.ts` |
| Páginas | PascalCase | `PatientsPage.tsx` |

### Variáveis

```typescript
// Componentes: PascalCase
const PatientForm: React.FC<Props> = ({ ... }) => { ... };

// Hooks: camelCase com "use"
const usePatients = () => { ... };

// Funções: camelCase, verbos
const fetchPatients = async () => { ... };
const handleSubmit = () => { ... };

// Constantes: UPPER_SNAKE_CASE
const MAX_PATIENTS = 100;
const API_BASE_URL = '...';

// Tipos/Interfaces: PascalCase
interface Patient { ... }
type PatientStatus = 'active' | 'inactive';

// Enums: PascalCase
enum UserRole { Admin, Physiotherapist, Patient }
```

### Pastas

```
// Plural para coleções
components/
hooks/
pages/
types/

// Singular para domínios específicos
layout/
evaluation/
schedule/
```

## 📝 Organização de Imports

```typescript
// 1. Imports de bibliotecas externas
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';

// 2. Imports de componentes internos (alias @/)
import { PatientCard } from '@/components/patients/PatientCard';
import { usePatients } from '@/hooks/usePatients';

// 3. Imports de tipos
import type { Patient } from '@/types/patient';

// 4. Imports de estilos
import './PatientList.css';
```

## 🔗 Alias de Importação

Configurado em `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/hooks/*": ["./src/hooks/*"],
      "@/lib/*": ["./src/lib/*"],
      "@/types/*": ["./src/types/*"],
      "@/pages/*": ["./src/pages/*"]
    }
  }
}
```

Uso:

```typescript
// Em vez de:
import { Button } from '../../../components/ui/button';

// Use:
import { Button } from '@/components/ui/button';
```

## 🎯 Padrões de Organização

### Componente com Múltiplos Arquivos

```
components/evaluation/
├── EvaluationFormBuilder.tsx    # Componente principal
├── EvaluationFormBuilder.types.ts  # Types específicos
├── EvaluationFormBuilder.test.tsx  # Testes
└── index.ts                     # Exportações
```

### Página com Sub-componentes

```
pages/
├── Patients.tsx                 # Página principal
├── patients/
│   ├── PatientList.tsx          # Sub-componente
│   ├── PatientCard.tsx          # Sub-componente
│   ├── PatientForm.tsx          # Sub-componente
│   └── index.ts                 # Exportações
```

## 🔗 Recursos Relacionados

- [Arquitetura](./02-arquitetura.md) - Arquitetura técnica
- [Componentes UI](./08-componentes-ui.md) - Design System
- [Tipos TypeScript](./referencias/tipos-ts.md) - Referência de tipos
- [Hooks Customizados](./referencias/hooks-customizados.md) - Hooks disponíveis
