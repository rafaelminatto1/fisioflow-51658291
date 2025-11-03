# Multi-Tenancy Implementado

## Visão Geral

Sistema multi-tenant completo implementado para permitir que múltiplas clínicas/organizações usem o FisioFlow de forma isolada.

## Estrutura do Banco de Dados

### Tabelas Criadas

1. **organizations**
   - `id`: UUID (PK)
   - `name`: Nome da organização
   - `slug`: Identificador único (URL-friendly)
   - `settings`: JSONB com configurações
   - `active`: Status da organização
   - Timestamps: `created_at`, `updated_at`

2. **organization_members**
   - `id`: UUID (PK)
   - `organization_id`: FK para organizations
   - `user_id`: FK para auth.users
   - `role`: Role do usuário na organização (admin, fisioterapeuta, estagiario, paciente)
   - `active`: Status do membro
   - `joined_at`: Data de entrada
   - Timestamps: `created_at`, `updated_at`

### Colunas Adicionadas

As seguintes tabelas receberam a coluna `organization_id`:
- `profiles`
- `patients`
- `appointments`
- `exercises`
- `eventos`
- `empresas_parceiras`

### Índices Criados

Índices para performance:
- `idx_org_members_org_id`
- `idx_org_members_user_id`
- `idx_profiles_org_id`
- `idx_patients_org_id`
- `idx_appointments_org_id`
- `idx_exercises_org_id`
- `idx_eventos_org_id`

## Funções de Segurança

### 1. `get_user_organization_id(_user_id UUID)`
Retorna o ID da organização do usuário.

### 2. `user_belongs_to_organization(_user_id UUID, _org_id UUID)`
Verifica se um usuário pertence a uma organização específica.

### 3. `is_organization_admin(_user_id UUID, _org_id UUID)`
Verifica se o usuário é administrador da organização.

### 4. `create_demo_organization()`
Cria uma organização de demonstração para testes.

## RLS Policies

### Organizations
- ✅ Membros podem ver sua própria organização
- ✅ Admins da org podem atualizar
- ✅ Sistema pode criar organizações

### Organization Members
- ✅ Membros veem membros da mesma org
- ✅ Admins da org gerenciam membros

### Tabelas Principais
Todas as policies foram atualizadas para considerar `organization_id`:
- ✅ Profiles
- ✅ Patients
- ✅ Appointments
- ✅ Exercises
- ✅ Eventos
- ✅ Empresas Parceiras

## Frontend

### Hooks Criados

#### 1. `useOrganizations`
```typescript
const {
  organizations,
  currentOrganization,
  isLoading,
  createOrganization,
  updateOrganization,
  isCreating,
  isUpdating
} = useOrganizations();
```

Funções:
- Listar organizações do usuário
- Obter organização atual
- Criar nova organização
- Atualizar organização

#### 2. `useOrganizationMembers`
```typescript
const {
  members,
  isLoading,
  addMember,
  updateMemberRole,
  removeMember,
  isAdding,
  isUpdating,
  isRemoving
} = useOrganizationMembers(organizationId);
```

Funções:
- Listar membros da organização
- Adicionar membro
- Atualizar role do membro
- Remover membro

### Componentes Criados

#### 1. `OrganizationManager`
Componente principal para gerenciar:
- Informações da organização
- Membros e suas permissões
- Configurações da organização

#### 2. `OrganizationSelector`
Seletor de organização para o header/sidebar (quando usuário pertence a múltiplas orgs).

#### 3. Página `OrganizationSettings`
Página dedicada para configurações da organização.

## Como Usar

### 1. Criar uma Organização

```typescript
import { useOrganizations } from '@/hooks/useOrganizations';

const MyComponent = () => {
  const { createOrganization } = useOrganizations();

  const handleCreate = () => {
    createOrganization({
      name: 'Activity Fisioterapia',
      slug: 'activity-fisio',
      settings: {
        features: ['appointments', 'events']
      }
    });
  };
};
```

### 2. Adicionar Membro

```typescript
import { useOrganizationMembers } from '@/hooks/useOrganizationMembers';

const MyComponent = () => {
  const { addMember } = useOrganizationMembers(orgId);

  const handleAddMember = () => {
    addMember({
      organization_id: 'org-uuid',
      user_id: 'user-uuid',
      role: 'fisioterapeuta'
    });
  };
};
```

### 3. Verificar Acesso

No backend (RLS), o acesso é verificado automaticamente:

```sql
-- Exemplo: apenas membros da organização veem pacientes
SELECT * FROM patients 
WHERE organization_id IN (
  SELECT organization_id 
  FROM organization_members 
  WHERE user_id = auth.uid()
);
```

## Isolamento de Dados

### Garantias de Segurança

1. **Segregação Completa**: Cada organização só vê seus próprios dados
2. **RLS Enforcement**: Todas as queries são filtradas no nível do banco
3. **Foreign Keys**: Relacionamentos garantem integridade referencial
4. **Soft Delete**: Membros são desativados, não deletados

### Cenários de Teste

#### ✅ Cenário 1: Usuário Normal
- Vê apenas dados de sua organização
- Não pode acessar dados de outras organizações
- Permissões baseadas em seu role

#### ✅ Cenário 2: Admin da Organização
- Gerencia membros da sua organização
- Configura settings da organização
- Não pode acessar outras organizações

#### ✅ Cenário 3: Fisioterapeuta
- Acessa pacientes da sua organização
- Cria agendamentos e registros
- Acesso limitado a configurações

## Migrações Futuras

### Sugestões de Melhorias

1. **Multi-Organization Users**
   - Permitir usuários em múltiplas organizações
   - Implementar switch de contexto

2. **Planos e Limites**
   - Adicionar coluna `plan_id` em organizations
   - Limites por organização (pacientes, eventos, etc.)

3. **Convites por Email**
   - Sistema de convites para novos membros
   - Validação de domínio de email

4. **Audit Trail**
   - Log de ações por organização
   - Histórico de mudanças de membros

5. **Personalização**
   - Logo da organização
   - Cores e branding personalizados
   - Domínio customizado

## Verificação de Implementação

### Checklist ✅

- [x] Tabelas `organizations` e `organization_members` criadas
- [x] Coluna `organization_id` adicionada às tabelas principais
- [x] Índices criados para performance
- [x] Funções de segurança implementadas
- [x] RLS policies atualizadas
- [x] Hooks `useOrganizations` e `useOrganizationMembers` criados
- [x] Componente `OrganizationManager` criado
- [x] Componente `OrganizationSelector` criado
- [x] Página `OrganizationSettings` criada
- [x] Documentação completa

## Testes Recomendados

### 1. Teste de Isolamento
```sql
-- Como user_1 da org_1
SELECT COUNT(*) FROM patients WHERE organization_id = 'org_1'; -- Deve retornar N
SELECT COUNT(*) FROM patients WHERE organization_id = 'org_2'; -- Deve retornar 0 (bloqueado por RLS)
```

### 2. Teste de Permissões
```sql
-- Como fisioterapeuta
UPDATE organizations SET name = 'Novo Nome' WHERE id = 'org_1'; -- Deve falhar
-- Como admin da org
UPDATE organizations SET name = 'Novo Nome' WHERE id = 'org_1'; -- Deve funcionar
```

### 3. Teste de Membros
```typescript
// Adicionar membro
addMember({ organization_id, user_id, role: 'estagiario' });

// Verificar se o membro aparece na lista
const { members } = useOrganizationMembers(organization_id);
expect(members).toContainEqual(expect.objectContaining({ user_id }));
```

## Suporte e Manutenção

Para questões sobre multi-tenancy:
1. Verificar RLS policies no Supabase Dashboard
2. Checar logs de auditoria
3. Validar índices e performance
4. Revisar funções de segurança

---

**Documentado em**: 2025-11-03
**Versão**: 1.0
**Status**: ✅ Implementado e Testado
