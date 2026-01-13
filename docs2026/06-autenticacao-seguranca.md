# 06. Autenticação e Segurança

## 🔐 Visão Geral

O FisioFlow implementa autenticação segura através do **Supabase Auth** com **Row Level Security (RLS)** para controle granular de acesso aos dados.

## 🛡️ Sistema de Autenticação

### Flow de Autenticação

```
┌──────────────┐
│  Usuário     │
└──────┬───────┘
       │ email + password
       ▼
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                      │
├─────────────────────────────────────────────────────────┤
│  supabase.auth.signInWithPassword({ email, password }) │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                 Supabase Auth Service                   │
├─────────────────────────────────────────────────────────┤
│  1. Valida credenciais                                  │
│  2. Gera JWT (access_token + refresh_token)            │
│  3. Retorna user + tokens                              │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                  Browser (localStorage)                  │
├─────────────────────────────────────────────────────────┤
│  {                                                      │
│    "access_token": "eyJhbGciOiJIUzI1...",              │
│    "refresh_token": "eyJhbGciOiJIUzI1...",             │
│    "user": { id, email, role, organization_id }        │
│  }                                                      │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ Requisições subsequentes
                     ▼
┌─────────────────────────────────────────────────────────┐
│              PostgreSQL (RLS Policy Check)               │
├─────────────────────────────────────────────────────────┤
│  SELECT * FROM patients                                 │
│  WHERE organization_id = auth.jwt()->>'organization_id' │
│  AND auth.jwt()->>'role' = 'physiotherapist'           │
└─────────────────────────────────────────────────────────┘
```

## 👥 Roles e Permissões (RBAC)

### Hierarquia de Roles

```
ADMIN (Máximo acesso)
├── Acesso total ao sistema
├── Gerencia usuários
├── Configurações globais
└── Relatórios administrativos

FISIOTERAPEUTA
├── Gestão de pacientes
├── Agendamentos
├── Prontuário SOAP
├── Prescrição de exercícios
└── Relatórios clínicos

ESTAGIÁRIO
├── Visualização limitada de pacientes
├── Acompanhamento de evoluções
├── Visualização de protocolos
└── Restrição: não pode assinar documentos

PACIENTE
├── Portal do paciente
├── Visualizar próprios dados
├── Exercícios prescritos
├── Histórico de consultas
└── Restrição: apenas dados próprios

PARCEIRO
├── Acesso a informações específicas
├── Dashboard de parcerias
└── Restrição: limitado ao necessário
```

### Configuração de Roles

```typescript
// types/user.ts
export type UserRole =
  | 'admin'
  | 'physiotherapist'
  | 'intern'
  | 'patient'
  | 'partner';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  organization_id: string;
  created_at: string;
}
```

### Verificação de Permissões

```typescript
// hooks/usePermissions.ts
export function usePermissions() {
  const { data: user } = useUser();

  const hasRole = (roles: UserRole[]) => {
    return user?.role && roles.includes(user.role as UserRole);
  };

  const canAccess = (resource: string, action: string) => {
    const permissions = {
      admin: { everything: true },
      physiotherapist: {
        patients: ['read', 'create', 'update'],
        appointments: ['read', 'create', 'update', 'delete'],
        evolutions: ['read', 'create', 'update'],
        exercises: ['read', 'create', 'update'],
      },
      intern: {
        patients: ['read'],
        appointments: ['read'],
        evolutions: ['read'],
        exercises: ['read'],
      },
      patient: {
        self: ['read'],
        exercises: ['read'],
      },
    };

    // Lógica de verificação
    return permissions[user?.role]?.[resource]?.includes(action) || false;
  };

  return { hasRole, canAccess };
}
```

## 🔒 Row Level Security (RLS)

### Ativação do RLS

```sql
-- Ativar RLS em todas as tabelas
alter table patients enable row level security;
alter table appointments enable row level security;
alter table evolutions enable row level security;
-- ... etc
```

### Policies por Role

#### 1. Patients Table

```sql
-- SELECT: Ver pacientes da própria org ou se for admin
create policy "patients_select_org" on patients
  for select
  using (
    organization_id = auth.jwt()->>'organization_id'
    or auth.jwt()->>'role' = 'admin'
  );

-- INSERT: Criar pacientes na própria org
create policy "patients_insert_org" on patients
  for insert
  with check (
    organization_id = auth.jwt()->>'organization_id'
  );

-- UPDATE: Atualizar pacientes da própria org
create policy "patients_update_org" on patients
  for update
  using (
    organization_id = auth.jwt()->>'organization_id'
  )
  with check (
    organization_id = auth.jwt()->>'organization_id'
  );

-- DELETE: Soft delete apenas admin
create policy "patients_delete_admin" on patients
  for delete
  using (auth.jwt()->>'role' = 'admin');
```

#### 2. Evolutions Table (SOAP)

```sql
-- SELECT: Ver evoluções da própria org
create policy "evolutions_select_org" on evolutions
  for select
  using (
    organization_id = auth.jwt()->>'organization_id'
  );

-- INSERT: Criar evoluções (apenas fisioterapeutas)
create policy "evolutions_insert_therapist" on evolutions
  for insert
  with check (
    organization_id = auth.jwt()->>'organization_id'
    and therapist_id = auth.uid()
    and auth.jwt()->>'role' in ('physiotherapist', 'admin')
  );

-- UPDATE: Editar apenas drafts próprios
create policy "evolutions_update_draft" on evolutions
  for update
  using (
    therapist_id = auth.uid()
    and status = 'draft'
  )
  with check (
    therapist_id = auth.uid()
    and status = 'draft'
  );

-- UPDATE: Assinar evolução (transição para final)
create policy "evolutions_sign_own" on evolutions
  for update
  using (
    therapist_id = auth.uid()
    and status = 'draft'
  )
  with check (
    therapist_id = auth.uid()
    and status = 'final'
    and signature_data is not null
  );
```

#### 3. Appointments Table

```sql
-- SELECT: Ver agendamentos da própria org
create policy "appointments_select_org" on appointments
  for select
  using (
    organization_id = auth.jwt()->>'organization_id'
  );

-- INSERT: Criar agendamentos
create policy "appointments_insert_org" on appointments
  for insert
  with check (
    organization_id = auth.jwt()->>'organization_id'
  );

-- UPDATE: Atualizar agendamentos
create policy "appointments_update_org" on appointments
  for update
  using (
    organization_id = auth.jwt()->>'organization_id'
  );

-- DELETE: Cancelar agendamentos
create policy "appointments_delete_org" on appointments
  for delete
  using (
    organization_id = auth.jwt()->>'organization_id'
  );
```

## 🔐 Segurança de Dados

### Criptografia

```typescript
// Dados sensíveis no banco são criptografados
interface Patient {
  // ...
  cpf?: string;              // Criptografado no banco
  insurance_info?: {         -- Criptografado como jsonb
    card_number: string;     -- Criptografado
    expiration: string;
  };
}
```

### Masking de Dados

```typescript
// lib/mask.ts
export function maskCPF(cpf: string): string {
  return cpf.replace(/(\d{3})\d{3}(\d{3})(\d{2})/, '$1.***.$2-$3');
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  return `${local[0]}***@${domain}`;
}
```

## 📋 Auditoria

### Audit Logs Table

```sql
create table audit_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id),
  organization_id uuid references organizations(id),
  action text not null,           -- 'create', 'update', 'delete'
  table_name text not null,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Índice para consultas
create index idx_audit_logs_user on audit_logs(user_id, created_at desc);
create index idx_audit_logs_org on audit_logs(organization_id, created_at desc);
```

### Trigger de Auditoria

```sql
-- Trigger automático para tabelas críticas
create or replace function audit_trigger()
returns trigger as $$
begin
  if (TG_OP = 'DELETE') then
    insert into audit_logs (user_id, organization_id, action, table_name, record_id, old_data)
    values (
      auth.uid(),
      auth.jwt()->>'organization_id',
      'delete',
      TG_TABLE_NAME,
      old.id,
      to_jsonb(old)
    );
    return old;
  elsif (TG_OP = 'UPDATE') then
    insert into audit_logs (user_id, organization_id, action, table_name, record_id, old_data, new_data)
    values (
      auth.uid(),
      auth.jwt()->>'organization_id',
      'update',
      TG_TABLE_NAME,
      new.id,
      to_jsonb(old),
      to_jsonb(new)
    );
    return new;
  elsif (TG_OP = 'INSERT') then
    insert into audit_logs (user_id, organization_id, action, table_name, record_id, new_data)
    values (
      auth.uid(),
      auth.jwt()->>'organization_id',
      'create',
      TG_TABLE_NAME,
      new.id,
      to_jsonb(new)
    );
    return new;
  end if;
end;
$$ language plpgsql security definer;

-- Aplicar trigger
create trigger audit_patients
  after insert or update or delete on patients
  for each row execute function audit_trigger();
```

## 🛡️ LGPD Compliance

### Direitos dos Titulares

```typescript
// hooks/useLGPD.ts
export function useLGPD() {
  // 1. Direito de acesso
  const exportPersonalData = async (patientId: string) => {
    const { data } = await supabase
      .from('patients')
      .select('*')
      .eq('id', patientId)
      .single();

    return data;
  };

  // 2. Direito de correção
  const updatePersonalData = async (patientId: string, updates: any) => {
    const { data } = await supabase
      .from('patients')
      .update(updates)
      .eq('id', patientId);

    // Log de consentimento
    await logDataProcessing(patientId, 'update', updates);
  };

  // 3. Direito de exclusão (anonimização)
  const deletePersonalData = async (patientId: string) => {
    // Anonimiza em vez de deletar (preserva integridade referencial)
    const { data } = await supabase
      .from('patients')
      .update({
        full_name: 'Paciente Removido',
        email: null,
        phone: null,
        cpf: null,
        anonymous: true,
      })
      .eq('id', patientId);
  };

  // 4. Direito de portabilidade
  const exportDataPortability = async (patientId: string) => {
    // Exporta em formato legível por máquina (JSON, XML, etc)
    const [patient, appointments, evolutions] = await Promise.all([
      supabase.from('patients').select('*').eq('id', patientId).single(),
      supabase.from('appointments').select('*').eq('patient_id', patientId),
      supabase.from('evolutions').select('*').eq('patient_id', patientId),
    ]);

    return {
      patient: patient.data,
      appointments: appointments.data,
      evolutions: evolutions.data,
      exported_at: new Date().toISOString(),
    };
  };

  return {
    exportPersonalData,
    updatePersonalData,
    deletePersonalData,
    exportDataPortability,
  };
}
```

### Consent Management

```sql
create table consent_records (
  id uuid default gen_random_uuid() primary key,
  patient_id uuid references patients(id),
  consent_type text not null,      -- 'data_processing', 'email_marketing', etc
  granted boolean not null,
  granted_at timestamp with time zone,
  revoked_at timestamp with time zone,
  ip_address inet,
  document_id uuid                -- PDF do termo assinado
);
```

## 🔒 Rate Limiting

### Edge Function Middleware

```typescript
// supabase/functions/_shared/rate-limit.ts
const rateLimiter = new Map<string, { count: number; reset: number }>();

export async function rateLimit(
  identifier: string,
  limit: number = 100,
  window: number = 60000 // 1 minuto
) {
  const now = Date.now();
  const record = rateLimiter.get(identifier);

  if (!record || now > record.reset) {
    rateLimiter.set(identifier, { count: 1, reset: now + window });
    return { allowed: true, remaining: limit - 1 };
  }

  if (record.count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  record.count++;
  return { allowed: true, remaining: limit - record.count };
}

// Uso
export async function POST(req: Request) {
  const authHeader = req.headers.get('Authorization');
  const userId = getUserIdFromToken(authHeader);

  const { allowed } = await rateLimit(userId, 100, 60000);
  if (!allowed) {
    return new Response('Too many requests', { status: 429 });
  }

  // ... lógica da função
}
```

## 🔗 Recursos Relacionados

- [Banco de Dados](./05-banco-dados.md) - Schema e RLS policies
- [APIs e Integrações](./07-api-integracoes.md) - Edge Functions
- [Deploy Produção](./11-deploy-producao.md) - Monitoramento e segurança
