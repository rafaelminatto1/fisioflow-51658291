# Análise de Colunas Duplicadas no Banco de Dados - FisioFlow

## Data da Análise: 08/01/2026

## Resumo Executivo

Foram encontrados **vários problemas de colunas duplicadas e inconsistências** no esquema do banco de dados, sendo o mais crítico na tabela `appointments` que possui **pares de colunas duplicadas** para data e horário.

---

## Problema 1: Tabela `appointments` - Colunas Duplicadas (CRÍTICO)

### Descrição
A tabela `appointments` possui **pares de colunas duplicadas** para representar a mesma informação:

```sql
-- Colunas antigas (usadas no código TypeScript):
appointment_date DATE,      -- Usada nas queries, views, tipos
appointment_time TIME,      -- Usada nas queries, views, tipos

-- Colunas novas (criadas mas pouco usadas):
date DATE,                  -- Nullable, criada em migration mas não removida as antigas
start_time TIME,            -- Nullable, criada em migration mas não removida as antigas
```

### Evidências

#### Migration `20250109000010_agenda_appointments_schema.sql`
```sql
CREATE TABLE IF NOT EXISTS appointments (
    ...
    date DATE,                    -- ← NOVA coluna
    appointment_date DATE,        -- ← ANTIGA coluna
    start_time TIME,              -- ← NOVA coluna
    appointment_time TIME,        -- ← ANTIGA coluna
    ...
);

-- Linhas 28-50: Migration cria colunas novas e tenta migrar dados,
-- mas NÃO remove as colunas antigas
ALTER TABLE appointments ADD COLUMN date DATE;
UPDATE appointments SET date = appointment_date WHERE date IS NULL;

ALTER TABLE appointments ADD COLUMN start_time TIME;
UPDATE appointments SET start_time = appointment_time WHERE start_time IS NULL;
```

#### Uso no Código TypeScript
```typescript
// src/hooks/useAppointments.tsx (linhas 156-160)
if (!apt.appointment_date) return new Date();
const [y, m, d] = apt.appointment_date.split('-').map(Number);
return new Date(y, m - 1, d, 12, 0, 0);
// ...
time: apt.appointment_time || '',

// src/hooks/useAppointments.tsx (linhas 364-365)
appointment_date: data.appointment_date,
appointment_time: data.appointment_time,
```

#### Views usando COALESCE para lidar com ambas
```sql
-- supabase/migrations/20260102232026_6755321b-214a-4d70-96ab-355e95f09809.sql
COALESCE(a.date, a.appointment_date) AS date,
COALESCE(a.start_time, a.appointment_time) AS start_time,
```

#### Função de verificação de conflitos
```sql
-- supabase/migrations/20250109000010_agenda_appointments_schema.sql (linhas 148-153)
WHERE therapist_id = p_therapist_id
  AND COALESCE(date, appointment_date) = p_date
  AND (
    (COALESCE(start_time, appointment_time) < p_end_time
     AND COALESCE(end_time, COALESCE(start_time, appointment_time) + INTERVAL '1 hour') > p_start_time)
  );
```

### Tipos TypeScript (inconsistente)
```typescript
// src/types/appointment.ts (linhas 8-9)
export interface AppointmentBase {
  date: Date;      // ← Nome diferente da coluna do banco
  time: string;    // ← Nome diferente da coluna do banco
  // ...
}

// src/integrations/supabase/types.ts (linhas 886-896, 911-912)
Row: {
  appointment_date: string  // ← Coluna real no banco
  appointment_time: string  // ← Coluna real no banco
  date: string | null       // ← Coluna duplicada no banco
  start_time: string | null // ← Coluna duplicada no banco
}
```

### Impacto

1. **Confusão de desenvolvimento**: Desenvolvedores não sabem quais colunas usar
2. **Inconsistência de dados**: Pode haver diferenças entre as colunas se não são sincronizadas
3. **Performance**: Uso de `COALESCE` em queries diminui performance
4. **Índices potencialmente ineficientes**: Índices em colunas que não são usadas
5. **Manutenção**: Dificulta mudanças futuras no esquema

### Soluções Recomendadas

#### Opção 1: Remover colunas antigas (RECOMENDADO)
```sql
-- Migration para remover colunas duplicadas
ALTER TABLE appointments DROP COLUMN IF EXISTS appointment_date;
ALTER TABLE appointments DROP COLUMN IF EXISTS appointment_time;

-- Atualizar código TypeScript para usar date/time
ALTER TABLE appointments ALTER COLUMN date SET NOT NULL;
ALTER TABLE appointments ALTER COLUMN start_time SET NOT NULL;
```

**Vantagens**:
- Elimina redundância
- Simplifica código
- Melhora performance
- Padrão mais moderno

**Desvantagens**:
- Require mudança em todo código TypeScript
- Migration complexa para garantir integridade

#### Opção 2: Remover colunas novas e manter antigas
```sql
-- Migration para remover colunas novas
ALTER TABLE appointments DROP COLUMN IF EXISTS date;
ALTER TABLE appointments DROP COLUMN IF EXISTS start_time;

-- Manter appointment_date/appointment_time
```

**Vantagens**:
- Código TypeScript não precisa mudar
- Migration mais simples

**Desvantagens**:
- Nomes não seguem padrões modernos
- Views continuam com COALESCE

---

## Problema 2: Inconsistência de Nomes - `name` vs `full_name`

### Descrição
Tabelas `patients` e `profiles` usam nomes diferentes para o mesmo conceito:

```sql
-- tabela profiles:
full_name TEXT NOT NULL,

-- tabela patients:
name TEXT NOT NULL,
```

### Evidências

#### Views usando ambos
```sql
-- supabase/migrations/20250902040739_3b486eb8-6695-4ffa-8990-2e974bf22b53.sql (linhas 40, 43)
p.name as patient_name,      -- ← patients.name
pr.full_name as therapist_name -- ← profiles.full_name
```

#### Código TypeScript
```typescript
// src/hooks/useAppointments.tsx (linha 153)
patientName: apt.patients?.name || 'Paciente não identificado',

// Views não usam therapist_name diretamente, mas sim full_name
```

### Impacto
- Confusão ao escrever queries
- Erros comuns de referência
- Inconsistência em joins

### Solução Recomendada
Padronizar para `full_name` em ambas as tabelas:

```sql
ALTER TABLE patients RENAME COLUMN name TO full_name;

-- Atualizar código TypeScript
```

---

## Problema 3: Inconsistência em `patient_id` - Foreign Key Incorreta

### Descrição
Algumas tabelas usam `patient_id` com FK incorreta para `auth.users` em vez de `patients`:

```sql
-- supabase/migrations/20260107203000_prom_snapshots.sql (linha 8)
patient_id UUID NOT NULL REFERENCES auth.users(id),  -- ← INCORRETO!

-- Comentário na própria migration reconhece o erro:
-- -- If I enforce UUID FK, the seed will fail unless I have those users.
-- -- I will use TEXT for patient_id for now to support the "Mock" nature
```

### Solução Recomendada
```sql
ALTER TABLE prom_snapshots 
DROP CONSTRAINT prom_snapshots_patient_id_fkey,
ADD CONSTRAINT prom_snapshots_patient_id_fkey 
FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;
```

---

## Problema 4: Views Dependentes de COALESCE

### Descrição
Múltiplas views usam `COALESCE` para lidar com colunas duplicadas, criando dependência dessa duplicação:

```sql
-- view patient_appointment_summary
COALESCE(a.date, a.appointment_date) AS date,
COALESCE(a.start_time, a.apointment_time) AS start_time,

-- Function check_appointment_conflict
COALESCE(date, appointment_date) = p_date
COALESCE(start_time, appointment_time) < p_end_time
```

### Views Afetadas
- `patient_appointment_summary`
- `appointments_full` (embora use apenas as colunas antigas)
- Qualquer view que use dados de `appointments`

### Solução
Após resolver o Problema 1, remover todos os `COALESCE` das views e usar as colunas padronizadas.

---

## Problema 5: Tipos TypeScript Desatualizados

### Descrição
O arquivo `src/integrations/supabase/types.ts` define ambas as colunas, mas o código usa apenas as antigas:

```typescript
// src/integrations/supabase/types.ts
Row: {
  appointment_date: string  // ← Usada no código
  appointment_time: string  // ← Usada no código
  date: string | null       // ← Existe no banco mas não usada
  start_time: string | null // ← Existe no banco mas não usada
}
```

### Solução
Após resolver o Problema 1, atualizar os tipos para refletir a estrutura correta.

---

## Tabela Resumo de Problemas

| Problema | Tabela | Colunas Duplicadas | Impacto | Prioridade |
|----------|--------|-------------------|---------|------------|
| 1 | `appointments` | `date`/`appointment_date`, `start_time`/`appointment_time` | Alto | **CRÍTICO** |
| 2 | `patients`/`profiles` | `name`/`full_name` | Médio | Alta |
| 3 | `prom_snapshots` | `patient_id` FK incorreta | Alto | Alta |
| 4 | Múltiplas views | Dependência de COALESCE | Médio | Alta |
| 5 | Tipos TypeScript | Definição de ambas colunas | Baixo | Média |

---

## Plano de Ação Recomendado

### Fase 1: Preparação (IMEDIATO)
1. Backup completo do banco de dados
2. Análise de impacto em todo o código
3. Identificar todos os pontos que usam as colunas

### Fase 2: Correção da Tabela appointments
1. Escolher estratégia (Opção 1 ou Opção 2)
2. Criar migration de migração de dados
3. Criar migration de remoção de colunas
4. Atualizar índices
5. Atualizar views

### Fase 3: Atualização de Código
1. Atualizar TypeScript interfaces
2. Atualizar queries em hooks
3. Atualizar components
4. Atualizar validações
5. Testar completamente

### Fase 4: Correções Adicionais
1. Padronizar `name` → `full_name` em `patients`
2. Corrigir FK de `prom_snapshots.patient_id`
3. Remover todos os `COALESCE` desnecessários
4. Regerar tipos TypeScript do Supabase

---

## Arquivos Afetados (Parcial)

### Migrations
- `supabase/migrations/20250109000010_agenda_appointments_schema.sql`
- `supabase/migrations/20260102232026_6755321b-214a-4d70-96ab-355e95f09809.sql`
- `supabase/migrations/20250902040739_3b486eb8-6695-4ffa-8990-2e974bf22b53.sql`

### TypeScript Source
- `src/hooks/useAppointments.tsx`
- `src/components/schedule/AppointmentModalRefactored.tsx`
- `src/types/appointment.ts`
- `src/integrations/supabase/types.ts`
- `src/lib/validations/agenda.ts`

### Views (SQL)
- `appointments_full`
- `patient_appointment_summary`
- `therapist_stats`

---

## Notas Importantes

1. **Não é um problema recente**: As colunas duplicadas existem desde migrations antigas
2. **Código está funcionando**: O sistema usa as colunas antigas e ignora as novas
3. **Dúvidas sobre intenção original**: Não está claro se a migração foi planejada ou incompleta
4. **Views usam COALESCE**: Isso permite que ambas as colunas funcionem, mas cria overhead

---

## Recursos Relacionados

- Documento `ANALISE_SUPABASE_DB_COMPLETA.md` - Análise completa do banco
- Documento `DEPLOY_STATUS.md` - Status de deploy com problemas em migrations
- Migration `20250902040739_3b486eb8-6695-4ffa-8990-2e974bf22b53.sql` - Views com COALESCE
- Migration `20250109000010_agenda_appointments_schema.sql` - Criação das colunas duplicadas
