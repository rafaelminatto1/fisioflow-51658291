# 09. Gerenciamento de Estado e Forms

## 📊 Visão Geral

O FisioFlow utiliza uma combinação de **TanStack Query** (server state), **Zustand** (client state), e **React Hook Form + Zod** (forms) para gerenciar o estado da aplicação.

## 🗄️ Server State (TanStack Query)

### Configuração

```typescript
// lib/queryClient.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,        // 5 minutos
      gcTime: 1000 * 60 * 60 * 24,     // 24 horas
      retry: (failureCount, error) => {
        // Não retry em erros 4xx
        if (error && typeof error === 'object' && 'status' in error) {
          const status = (error as { status: number }).status;
          if (status >= 400 && status < 500) return false;
        }
        return failureCount < 3;
      },
      refetchOnWindowFocus: false,
    },
  },
});
```

### Hooks de API

```typescript
// hooks/usePatients.ts
export function usePatients() {
  return useQuery({
    queryKey: ['patients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });
}

// hooks/usePatient.ts
export function usePatient(id: string) {
  return useQuery({
    queryKey: ['patient', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}
```

### Mutations

```typescript
// hooks/useCreatePatient.ts
export function useCreatePatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (patient: PatientInsert) => {
      const { data, error } = await supabase
        .from('patients')
        .insert(patient)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      toast.success('Paciente cadastrado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao cadastrar paciente');
      console.error(error);
    },
  });
}
```

## 💾 Client State (Zustand)

### Store Principal

```typescript
// stores/useAppStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppStore {
  // Estado
  theme: 'light' | 'dark';
  sidebarOpen: boolean;
  currentPage: string;

  // Ações
  setTheme: (theme: 'light' | 'dark') => void;
  toggleSidebar: () => void;
  setCurrentPage: (page: string) => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      theme: 'light',
      sidebarOpen: true,
      currentPage: '',

      setTheme: (theme) => set({ theme }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setCurrentPage: (currentPage) => set({ currentPage }),
    }),
    {
      name: 'fisioflow-storage',
    }
  )
);
```

### Store de UI

```typescript
// stores/useUIStore.ts
interface UIStore {
  modals: {
    patientForm: boolean;
    appointmentForm: boolean;
  };
  openModal: (name: keyof UIStore['modals']) => void;
  closeModal: (name: keyof UIStore['modals']) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  modals: {
    patientForm: false,
    appointmentForm: false,
  },
  openModal: (name) => set((state) => ({
    modals: { ...state.modals, [name]: true },
  })),
  closeModal: (name) => set((state) => ({
    modals: { ...state.modals, [name]: false },
  })),
}));
```

## 📝 Forms (React Hook Form + Zod)

### Schema de Validação

```typescript
// lib/validations/patient.ts
import { z } from 'zod';

export const patientSchema = z.object({
  full_name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().regex(/^\d{10,11}$/, 'Telefone inválido'),
  date_of_birth: z.string().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  address: z.object({
    street: z.string().optional(),
    number: z.string().optional(),
    complement: z.string().optional(),
    neighborhood: z.string().optional(),
    city: z.string().optional(),
    state: z.string().length(2, 'Estado deve ter 2 caracteres').optional(),
    zip_code: z.string().regex(/^\d{5}-?\d{3}$/, 'CEP inválido').optional(),
  }).optional(),
  insurance_info: z.object({
    provider: z.string().optional(),
    card_number: z.string().optional(),
    expiration: z.string().optional(),
  }).optional(),
});

export type PatientFormValues = z.infer<typeof patientSchema>;
```

### Componente de Form

```typescript
// components/patients/PatientForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { patientSchema, type PatientFormValues } from '@/lib/validations/patient';

interface PatientFormProps {
  initialData?: PatientFormValues;
  onSubmit: (data: PatientFormValues) => void;
}

export function PatientForm({ initialData, onSubmit }: PatientFormProps) {
  const form = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
    defaultValues: initialData || {
      full_name: '',
      email: '',
      phone: '',
    },
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="full_name">Nome completo *</Label>
        <Input
          id="full_name"
          {...form.register('full_name')}
        />
        {form.formState.errors.full_name && (
          <p className="text-sm text-destructive mt-1">
            {form.formState.errors.full_name.message}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...form.register('email')} />
        </div>
        <div>
          <Label htmlFor="phone">Telefone *</Label>
          <Input id="phone" {...form.register('phone')} />
        </div>
      </div>

      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? 'Salvando...' : 'Salvar'}
      </Button>
    </form>
  );
}
```

## 🔄 Real-time Updates

```typescript
// hooks/useRealtimeSubscription.ts
export function useRealtimePatients() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('patients-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'patients',
        },
        (payload) => {
          // Invalida cache para refetch
          queryClient.invalidateQueries({ queryKey: ['patients'] });

          // OU atualiza cache manualmente (otimização)
          queryClient.setQueryData(['patients', payload.new.id], payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
```

## 🔗 Recursos Relacionados

- [Arquitetura](./02-arquitetura.md) - Camadas de estado
- [Tipos TypeScript](./referencias/tipos-ts.md) - Definições de tipos
- [Validações](./referencias/validacoes.md) - Schemas completos
