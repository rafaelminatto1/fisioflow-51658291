# FisioFlow - Guia do Desenvolvedor

## 1. Visão Geral Técnica

O FisioFlow é uma aplicação React moderna construída com TypeScript, utilizando Supabase como backend-as-a-service. Este guia fornece informações detalhadas para desenvolvedores que trabalham no projeto.

## 2. Arquitetura do Código

### 2.1 Estrutura de Diretórios

```
src/
├── components/              # Componentes React organizados por domínio
│   ├── ui/                 # Componentes base (shadcn/ui)
│   ├── auth/               # Componentes de autenticação
│   ├── patients/           # Componentes de gestão de pacientes
│   ├── appointments/       # Componentes de agendamento
│   ├── soap/               # Componentes de prontuários SOAP
│   ├── exercises/          # Componentes de exercícios
│   ├── reports/            # Componentes de relatórios
│   ├── dashboard/          # Componentes do dashboard
│   ├── layout/             # Componentes de layout
│   └── modals/             # Componentes de modais
├── hooks/                   # Custom hooks organizados por funcionalidade
│   ├── useAuth.ts          # Hook de autenticação
│   ├── usePatients.tsx     # Hook de gestão de pacientes
│   ├── useAppointments.tsx # Hook de agendamentos
│   ├── useSOAPRecords.tsx  # Hook de registros SOAP
│   └── ...
├── lib/                     # Utilitários e configurações
│   ├── supabase/           # Configuração e tipos do Supabase
│   ├── auth/               # Utilitários de autenticação
│   ├── validations/        # Schemas de validação Zod
│   ├── errors/             # Sistema de tratamento de erros
│   └── utils.ts            # Utilitários gerais
├── pages/                   # Páginas da aplicação
├── types/                   # Definições de tipos TypeScript
├── contexts/                # React contexts
├── services/                # Serviços de integração com APIs
└── test/                    # Testes unitários e de integração
```

### 2.2 Padrões de Código

#### Componentes React

```typescript
// Exemplo de componente bem estruturado
import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { usePatients } from '@/hooks/usePatients';
import { Patient } from '@/types';

interface PatientCardProps {
  patient: Patient;
  onEdit?: (patient: Patient) => void;
  onDelete?: (patientId: string) => void;
}

export function PatientCard({ patient, onEdit, onDelete }: PatientCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  
  const handleEdit = useCallback(() => {
    onEdit?.(patient);
  }, [patient, onEdit]);
  
  const handleDelete = useCallback(async () => {
    setIsLoading(true);
    try {
      await onDelete?.(patient.id);
    } finally {
      setIsLoading(false);
    }
  }, [patient.id, onDelete]);
  
  return (
    <div className="p-4 border rounded-lg">
      <h3 className="font-semibold">{patient.name}</h3>
      <p className="text-sm text-muted-foreground">{patient.email}</p>
      
      <div className="flex gap-2 mt-4">
        <Button onClick={handleEdit} variant="outline">
          Editar
        </Button>
        <Button 
          onClick={handleDelete} 
          variant="destructive"
          disabled={isLoading}
        >
          {isLoading ? 'Excluindo...' : 'Excluir'}
        </Button>
      </div>
    </div>
  );
}
```

#### Custom Hooks

```typescript
// Exemplo de custom hook
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Patient, CreatePatientData } from '@/types';
import { useAuth } from './useAuth';

export function usePatients() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Query para buscar pacientes
  const {
    data: patients,
    isLoading,
    error
  } = useQuery({
    queryKey: ['patients', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Patient[];
    },
    enabled: !!user
  });
  
  // Mutation para criar paciente
  const createPatient = useMutation({
    mutationFn: async (patientData: CreatePatientData) => {
      const { data, error } = await supabase
        .from('patients')
        .insert([patientData])
        .select()
        .single();
      
      if (error) throw error;
      return data as Patient;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    }
  });
  
  return {
    patients,
    isLoading,
    error,
    createPatient: createPatient.mutate,
    isCreating: createPatient.isPending
  };
}
```

#### Validação com Zod

```typescript
// schemas de validação
import { z } from 'zod';

export const patientSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido').optional(),
  phone: z.string().min(10, 'Telefone deve ter pelo menos 10 dígitos'),
  cpf: z.string().regex(/^\d{11}$/, 'CPF deve ter 11 dígitos'),
  birthDate: z.date(),
  gender: z.enum(['masculino', 'feminino', 'outro']),
  address: z.string().optional(),
  medicalHistory: z.string().optional()
});

export type PatientFormData = z.infer<typeof patientSchema>;
```

## 3. Configuração do Ambiente

### 3.1 Pré-requisitos

- Node.js 18+ (recomendado: 20+)
- npm, yarn ou pnpm
- Git
- Conta no Supabase

### 3.2 Setup Local

```bash
# 1. Clonar o repositório
git clone <repository-url>
cd fisioflow-51658291

# 2. Instalar dependências
npm install

# 3. Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com suas credenciais

# 4. Executar em modo desenvolvimento
npm run dev
```

### 3.3 Variáveis de Ambiente

```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# APIs Externas (opcional)
VITE_OPENAI_API_KEY=your-openai-key
VITE_STRIPE_PUBLISHABLE_KEY=your-stripe-key

# Configurações de desenvolvimento
VITE_APP_ENV=development
VITE_DEBUG_MODE=true
```

## 4. Banco de Dados (Supabase)

### 4.1 Estrutura Principal

```sql
-- Tabelas principais
profiles              -- Perfis de usuários
patients              -- Dados dos pacientes
appointments          -- Agendamentos
soap_records          -- Registros SOAP
exercises             -- Biblioteca de exercícios
exercise_plans        -- Planos de exercícios
treatment_sessions    -- Sessões de tratamento
notifications         -- Sistema de notificações
audit_logs            -- Logs de auditoria
```

### 4.2 Row Level Security (RLS)

```sql
-- Exemplo de política RLS para pacientes
CREATE POLICY "Users can view their own patients" ON patients
  FOR SELECT USING (
    auth.uid() = created_by OR 
    auth.uid() IN (
      SELECT user_id FROM patient_access 
      WHERE patient_id = patients.id
    )
  );

-- Política para fisioterapeutas
CREATE POLICY "Therapists can manage patients" ON patients
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('fisioterapeuta', 'admin')
    )
  );
```

### 4.3 Triggers e Functions

```sql
-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar em todas as tabelas relevantes
CREATE TRIGGER update_patients_updated_at 
  BEFORE UPDATE ON patients 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## 5. Autenticação e Segurança

### 5.1 Sistema de Autenticação

```typescript
// AuthProvider implementation
import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, userData: any) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Verificar sessão atual
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });
    
    // Escutar mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );
    
    return () => subscription.unsubscribe();
  }, []);
  
  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;
  };
  
  const signUp = async (email: string, password: string, userData: any) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData
      }
    });
    if (error) throw error;
  };
  
  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };
  
  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      signIn,
      signUp,
      signOut
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

### 5.2 Controle de Permissões

```typescript
// Sistema de permissões baseado em roles
export enum UserRole {
  ADMIN = 'admin',
  FISIOTERAPEUTA = 'fisioterapeuta',
  ESTAGIARIO = 'estagiario',
  PACIENTE = 'paciente',
  PARCEIRO = 'parceiro'
}

export const permissions = {
  [UserRole.ADMIN]: {
    canViewAllPatients: true,
    canManageUsers: true,
    canViewFinancials: true,
    canManageSettings: true
  },
  [UserRole.FISIOTERAPEUTA]: {
    canViewAllPatients: true,
    canManageUsers: false,
    canViewFinancials: false,
    canManageSettings: false
  },
  [UserRole.ESTAGIARIO]: {
    canViewAllPatients: false,
    canManageUsers: false,
    canViewFinancials: false,
    canManageSettings: false
  },
  [UserRole.PACIENTE]: {
    canViewAllPatients: false,
    canManageUsers: false,
    canViewFinancials: false,
    canManageSettings: false
  },
  [UserRole.PARCEIRO]: {
    canViewAllPatients: false,
    canManageUsers: false,
    canViewFinancials: true,
    canManageSettings: false
  }
};

export function usePermissions() {
  const { user } = useAuth();
  const userRole = user?.user_metadata?.role as UserRole;
  
  return permissions[userRole] || permissions[UserRole.PACIENTE];
}
```

## 6. Testes

### 6.1 Configuração de Testes

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
```

### 6.2 Exemplo de Teste

```typescript
// src/test/components/PatientCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { PatientCard } from '@/components/patients/PatientCard';
import { Patient } from '@/types';

const mockPatient: Patient = {
  id: '1',
  name: 'João Silva',
  email: 'joao@example.com',
  phone: '11999999999',
  cpf: '12345678901',
  birthDate: new Date('1990-01-01'),
  gender: 'masculino',
  createdAt: new Date(),
  updatedAt: new Date()
};

describe('PatientCard', () => {
  it('should render patient information', () => {
    render(<PatientCard patient={mockPatient} />);
    
    expect(screen.getByText('João Silva')).toBeInTheDocument();
    expect(screen.getByText('joao@example.com')).toBeInTheDocument();
  });
  
  it('should call onEdit when edit button is clicked', () => {
    const onEdit = vi.fn();
    render(<PatientCard patient={mockPatient} onEdit={onEdit} />);
    
    fireEvent.click(screen.getByText('Editar'));
    expect(onEdit).toHaveBeenCalledWith(mockPatient);
  });
});
```

## 7. Performance e Otimização

### 7.1 Code Splitting

```typescript
// Lazy loading de páginas
import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

const PatientsPage = lazy(() => import('@/pages/Patients'));
const AppointmentsPage = lazy(() => import('@/pages/Appointments'));
const ReportsPage = lazy(() => import('@/pages/Reports'));

export function AppRoutes() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/patients" element={<PatientsPage />} />
        <Route path="/appointments" element={<AppointmentsPage />} />
        <Route path="/reports" element={<ReportsPage />} />
      </Routes>
    </Suspense>
  );
}
```

### 7.2 Otimização de Queries

```typescript
// Prefetch de dados relacionados
export function usePatientWithAppointments(patientId: string) {
  const queryClient = useQueryClient();
  
  return useQuery({
    queryKey: ['patient', patientId, 'with-appointments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patients')
        .select(`
          *,
          appointments (
            id,
            appointment_date,
            status,
            type
          )
        `)
        .eq('id', patientId)
        .single();
      
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    onSuccess: (data) => {
      // Prefetch appointments individuais
      data.appointments?.forEach((appointment) => {
        queryClient.setQueryData(
          ['appointment', appointment.id],
          appointment
        );
      });
    }
  });
}
```

## 8. Deploy e CI/CD

### 8.1 Build de Produção

```json
// package.json scripts
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "build:analyze": "npm run build && npx vite-bundle-analyzer dist/stats.html",
    "preview": "vite preview",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "lint:fix": "eslint . --ext ts,tsx --fix",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

### 8.2 GitHub Actions

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - run: npm ci
      - run: npm run lint
      - run: npm run test
      - run: npm run build
  
  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - run: npm ci
      - run: npm run build
      
      - name: Deploy to Vercel
        uses: vercel/action@v1
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

## 9. Debugging e Troubleshooting

### 9.1 Logs e Monitoramento

```typescript
// Sistema de logging
export class Logger {
  static info(message: string, data?: any) {
    if (import.meta.env.DEV) {
      console.log(`[INFO] ${message}`, data);
    }
  }
  
  static error(message: string, error?: Error, data?: any) {
    console.error(`[ERROR] ${message}`, { error, data });
    
    // Em produção, enviar para serviço de monitoramento
    if (import.meta.env.PROD) {
      // Sentry, LogRocket, etc.
    }
  }
  
  static warn(message: string, data?: any) {
    console.warn(`[WARN] ${message}`, data);
  }
}
```

### 9.2 Error Boundaries

```typescript
// Error boundary para capturar erros React
import { Component, ErrorInfo, ReactNode } from 'react';
import { Logger } from '@/lib/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }
  
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    Logger.error('Error boundary caught an error', error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-4 text-center">
          <h2 className="text-lg font-semibold text-red-600">
            Algo deu errado
          </h2>
          <p className="text-sm text-gray-600 mt-2">
            Ocorreu um erro inesperado. Tente recarregar a página.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
          >
            Recarregar
          </button>
        </div>
      );
    }
    
    return this.props.children;
  }
}
```

## 10. Contribuição e Padrões

### 10.1 Git Workflow

```bash
# Fluxo de desenvolvimento
git checkout develop
git pull origin develop
git checkout -b feature/nova-funcionalidade

# Fazer alterações...
git add .
git commit -m "feat: adicionar nova funcionalidade"
git push origin feature/nova-funcionalidade

# Criar Pull Request para develop
# Após aprovação, merge para main
```

### 10.2 Convenções de Commit

```
feat: nova funcionalidade
fix: correção de bug
docs: atualização de documentação
style: formatação, sem mudança de lógica
refactor: refatoração de código
test: adição ou correção de testes
chore: tarefas de manutenção
```

### 10.3 Code Review Checklist

- [ ] Código segue os padrões estabelecidos
- [ ] Testes unitários foram adicionados/atualizados
- [ ] Documentação foi atualizada se necessário
- [ ] Performance foi considerada
- [ ] Segurança foi considerada
- [ ] Acessibilidade foi considerada
- [ ] Responsividade foi testada
- [ ] Não há console.logs ou código de debug
- [ ] Tipos TypeScript estão corretos
- [ ] Não há dependências desnecessárias

---

**Última atualização**: Janeiro 2024
**Versão**: 2.0

Para dúvidas ou sugestões, abra uma issue no repositório ou entre em contato com a equipe de desenvolvimento.