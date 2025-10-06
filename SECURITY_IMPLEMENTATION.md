# Sistema de Segurança FisioFlow

## 📋 Resumo Executivo

Implementação completa de um sistema de segurança robusto baseado em RBAC (Role-Based Access Control) com auditoria e controle de convites.

**Status da Segurança:** ✅ **SEGURO**

---

## 🎯 Objetivos Alcançados

### 1. Arquitetura de Roles Segura ✅
- **Separação completa**: Roles armazenados em tabela `user_roles` isolada
- **Sem privilege escalation**: Usuários não podem modificar seus próprios roles
- **Security definer functions**: Evita recursão infinita em políticas RLS
- **Migração de dados**: Todos os roles existentes migrados de `profiles.role`

### 2. Signup Seguro ✅
- **Role padrão seguro**: Novos usuários recebem apenas role `'paciente'`
- **Validação robusta**: Senha com 8+ caracteres, maiúscula, minúscula, número e caractere especial
- **Feedback visual**: Indicadores em tempo real dos requisitos de senha
- **Validação de confirmação**: Senhas devem coincidir

### 3. Sistema de Convites ✅
- **Controle administrativo**: Apenas admins podem criar convites
- **Tokens únicos**: Convites com tokens criptográficos seguros
- **Expiração automática**: Convites expiram em 7 dias
- **Rastreamento completo**: Todas as ações registradas em audit log

### 4. Auditoria e Monitoramento ✅
- **Audit log**: Registra todas as ações críticas (criação, atualização, exclusão de roles)
- **Triggers automáticos**: Mudanças em `user_roles` geram logs automaticamente
- **View de segurança**: `security_events` para visualização fácil de eventos
- **Performance otimizada**: Índices em todas as colunas relevantes

---

## 🏗️ Arquitetura do Sistema

### Tabelas Principais

#### `user_roles`
```sql
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
```

**Roles disponíveis:**
- `admin`: Acesso total ao sistema
- `fisioterapeuta`: Gerenciamento de pacientes e eventos
- `estagiario`: Operações guiadas (participantes, checklist)
- `paciente`: Visualização dos próprios dados

#### `user_invitations`
```sql
CREATE TABLE public.user_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  role app_role NOT NULL,
  token text NOT NULL UNIQUE,
  invited_by uuid REFERENCES auth.users(id) NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

#### `audit_log`
```sql
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  timestamp timestamptz NOT NULL DEFAULT now()
);
```

### Funções Security Definer

```sql
-- Verificar role específico
user_has_role(_user_id uuid, _role app_role) RETURNS boolean

-- Verificar múltiplos roles
user_has_any_role(_user_id uuid, _roles app_role[]) RETURNS boolean

-- Verificar se é admin
user_is_admin(_user_id uuid) RETURNS boolean

-- Criar convite (admin only)
create_user_invitation(_email text, _role app_role) RETURNS jsonb

-- Validar e usar convite
validate_invitation(_token text, _user_id uuid) RETURNS boolean

-- Registrar evento de auditoria
log_audit_event(_action text, _table_name text, _record_id uuid, 
                _old_data jsonb, _new_data jsonb) RETURNS void
```

---

## 🔐 Políticas RLS

### Princípios de Segurança

1. **user_roles**: Apenas admins gerenciam roles
2. **user_invitations**: Apenas admins criam convites
3. **audit_log**: Apenas admins visualizam logs
4. **Todas as tabelas**: Usam funções security definer para evitar recursão

### Exemplo de Política

```sql
CREATE POLICY "Admins e fisios podem ver todos os eventos"
ON public.eventos FOR SELECT
USING (
  public.user_has_any_role(auth.uid(), ARRAY['admin'::app_role, 'fisioterapeuta'::app_role])
);
```

---

## 💻 Frontend

### Componentes Criados

#### `InviteUserModal` (`src/components/admin/InviteUserModal.tsx`)
- Modal para criação de convites
- Validação de email
- Seleção de role
- Cópia de link de convite

#### Página Settings Atualizada (`src/pages/Settings.tsx`)
- Seção de gerenciamento de usuários (admin only)
- Botão para criar convites
- Alertas de segurança

### Hook `usePermissions` Atualizado

```typescript
const { isAdmin, isFisio, isEstagiario, isPaciente, canWrite, canDelete } = usePermissions();
```

**Funcionalidades:**
- Cache de 5 minutos
- Carrega roles de `user_roles`
- Helpers para verificações de permissão

### Validações (`src/lib/validations/auth.ts`)

```typescript
passwordSchema: 
  - Mínimo 8 caracteres
  - Letra maiúscula
  - Letra minúscula
  - Número
  - Caractere especial

emailSchema:
  - Email válido
  - Tamanho entre 5-255 caracteres

fullNameSchema:
  - Mínimo 3 caracteres
  - Apenas letras
```

---

## 🚀 Fluxo de Uso

### Criar Convite (Admin)

1. Admin acessa Settings → Segurança
2. Clica em "Criar Convite"
3. Preenche email e seleciona role
4. Sistema gera token único
5. Admin copia link e envia ao usuário

### Aceitar Convite (Novo Usuário)

1. Usuário acessa link de convite
2. Preenche formulário de cadastro (com validação robusta)
3. Sistema valida token
4. Role é atribuído automaticamente
5. Convite marcado como usado
6. Evento registrado em audit log

### Monitoramento (Admin)

1. Admin acessa view `security_events`
2. Visualiza todas as mudanças de roles
3. Vê quem criou/usou convites
4. Identifica tentativas de privilege escalation

---

## 📊 View de Segurança

```sql
SELECT * FROM public.security_events
ORDER BY timestamp DESC;
```

**Retorna:**
- ID do evento
- Timestamp
- Ação (ROLE_CREATED, ROLE_UPDATED, ROLE_DELETED, INVITATION_CREATED, INVITATION_USED)
- Nome e email do usuário
- Dados antigos e novos (JSON)

---

## ⚠️ Avisos de Segurança Resolvidos

### ✅ Recursão Infinita em RLS
**Problema:** Política `user_roles` referenciava a própria tabela  
**Solução:** Funções security definer

### ✅ Privilege Escalation
**Problema:** Usuários podiam modificar `profiles.role`  
**Solução:** Roles movidos para tabela separada com RLS restrito

### ✅ Senha Fraca
**Problema:** Validação apenas de comprimento mínimo (6)  
**Solução:** Schema Zod robusto com múltiplos requisitos

### ✅ Role Hardcodado no Signup
**Problema:** Todos novos usuários recebiam role 'fisioterapeuta'  
**Solução:** Role padrão 'paciente' + sistema de convites

### ✅ Security Definer View
**Problema:** View `security_events` usava SECURITY DEFINER  
**Solução:** Alterada para `security_invoker = true`

---

## 🧪 Testes Recomendados

### 1. Teste de Privilege Escalation
```sql
-- Como usuário paciente, tentar atribuir role admin
INSERT INTO user_roles (user_id, role) 
VALUES (auth.uid(), 'admin'::app_role);
-- Deve FALHAR com RLS violation
```

### 2. Teste de Convite
```sql
-- Criar convite
SELECT create_user_invitation('novo@exemplo.com', 'fisioterapeuta');

-- Verificar expiração
SELECT * FROM user_invitations WHERE expires_at < now();
```

### 3. Teste de Auditoria
```sql
-- Criar role
INSERT INTO user_roles (user_id, role) VALUES (...);

-- Verificar log
SELECT * FROM audit_log WHERE action = 'ROLE_CREATED';
```

### 4. Teste de Validação de Senha
- Testar senha com < 8 caracteres
- Testar senha sem maiúscula
- Testar senha sem caractere especial
- Verificar indicadores visuais

---

## 📚 Documentação Adicional

### Queries Úteis

```sql
-- Listar todos os admins
SELECT p.full_name, p.email 
FROM profiles p
JOIN user_roles ur ON ur.user_id = p.user_id
WHERE ur.role = 'admin';

-- Convites pendentes
SELECT * FROM user_invitations 
WHERE used_at IS NULL AND expires_at > now();

-- Últimas 50 ações de segurança
SELECT * FROM security_events LIMIT 50;

-- Usuários por role
SELECT role, COUNT(*) 
FROM user_roles 
GROUP BY role;
```

### Manutenção

**Limpeza de convites expirados (executar mensalmente):**
```sql
DELETE FROM user_invitations 
WHERE expires_at < now() - interval '30 days';
```

**Limpeza de logs antigos (executar trimestralmente):**
```sql
DELETE FROM audit_log 
WHERE timestamp < now() - interval '90 days';
```

---

## 🎓 Treinamento de Equipe

### Administradores

1. Criar convites apenas para pessoas confiáveis
2. Verificar logs de auditoria semanalmente
3. Revogar acessos de usuários inativos
4. Nunca compartilhar credenciais de admin

### Fisioterapeutas

1. Manter senha segura e atualizada
2. Reportar atividades suspeitas
3. Não tentar modificar próprios roles

### Estagiários

1. Acesso limitado a operações guiadas
2. Reportar qualquer problema de acesso
3. Seguir procedimentos de segurança

---

## ✅ Checklist de Segurança

- [x] Roles em tabela separada
- [x] RLS policies sem recursão
- [x] Validação robusta de senha
- [x] Sistema de convites com expiração
- [x] Audit log completo
- [x] Triggers automáticos
- [x] View de monitoramento
- [x] Frontend atualizado
- [x] Hooks com cache
- [x] Documentação completa

---

## 🔄 Próximos Passos Recomendados

1. **Implementar 2FA** (Autenticação de Dois Fatores)
2. **Rate Limiting** em endpoints críticos
3. **Alertas automáticos** para tentativas de privilege escalation
4. **Dashboard de segurança** com métricas
5. **Backup automático** de audit_log
6. **Política de rotação de senhas** (ex: a cada 90 dias)
7. **Sessões com timeout** configurável
8. **IP Whitelist** para admins (opcional)

---

## 📞 Suporte

Para questões de segurança, consulte:
- **Logs de Auditoria**: View `security_events`
- **Políticas RLS**: Arquivo `supabase-rls-policies.sql`
- **Funções**: Scripts de migração em `supabase/migrations/`

---

**Última atualização:** 2025-10-06  
**Versão:** 1.0.0  
**Status:** ✅ Produção Ready
