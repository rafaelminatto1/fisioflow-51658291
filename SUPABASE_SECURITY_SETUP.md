# 🔐 FisioFlow - Configuração de Segurança Supabase

## Visão Geral

Este documento detalha como configurar as políticas RLS (Row Level Security) no Supabase para garantir a segurança dos dados da aplicação FisioFlow.

## 🚀 Implementação das Políticas RLS

### 1. Executar o Script SQL

No dashboard do Supabase:

1. Acesse **SQL Editor**
2. Crie uma nova query
3. Cole o conteúdo do arquivo `supabase-rls-policies.sql`
4. Execute o script completo

```sql
-- O script está em: supabase-rls-policies.sql
-- Execute todo o conteúdo de uma vez
```

### 2. Verificar Configuração

Após executar o script, verifique se:

```sql
-- 1. RLS está habilitado em todas as tabelas
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = true;

-- 2. Políticas foram criadas
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public';

-- 3. Funções foram criadas
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname IN ('check_user_role', 'handle_new_user');
```

## 🛡️ Estrutura de Segurança

### Hierarquia de Roles

```
admin (máximo acesso)
├── fisioterapeuta (acesso completo a pacientes)
├── estagiario (acesso limitado a pacientes)
├── paciente (apenas próprios dados)
└── parceiro (acesso específico)
```

### Políticas por Tabela

#### **Profiles**
- ✅ Usuários podem ver/editar próprio perfil
- ✅ Terapeutas podem ver perfis de pacientes
- ✅ Admins podem ver todos os perfis

#### **Patients**
- ✅ Pacientes podem ver próprios dados
- ✅ Terapeutas podem ver/editar pacientes assignados
- ✅ Terapeutas podem criar registros de pacientes

#### **Appointments**
- ✅ Pacientes podem ver próprios agendamentos
- ✅ Terapeutas podem ver/editar próprios agendamentos
- ✅ Terapeutas podem criar agendamentos

#### **Medical Records**
- ✅ Pacientes podem ver próprios prontuários
- ✅ Terapeutas podem ver/criar/editar prontuários
- ✅ Apenas criador pode editar próprios registros

#### **SOAP Records**
- ✅ Pacientes podem ver próprios registros SOAP
- ✅ Terapeutas podem criar/editar registros (apenas não-assinados)
- ✅ Registros assinados não podem ser editados

#### **Exercise Plans**
- ✅ Pacientes podem ver próprios planos
- ✅ Terapeutas podem criar/editar planos de exercícios

#### **Treatment Sessions**
- ✅ Pacientes podem ver próprias sessões
- ✅ Terapeutas podem criar/editar sessões

## 🔧 Funções Utilitárias

### Verificação de Roles

```sql
-- Verificar se usuário tem role específico
SELECT check_user_role('admin');

-- Verificar se usuário tem um dos roles
SELECT check_user_roles(ARRAY['admin', 'fisioterapeuta']);

-- Obter perfil do usuário atual
SELECT * FROM get_current_profile();
```

### Uso no Frontend

```typescript
// Verificar permissão no código
const { user, profile } = useAuth();
const { hasRole, hasAnyRole } = usePermissions();

// Verificar role específico
if (hasRole('admin')) {
  // Código para admin
}

// Verificar múltiplos roles
if (hasAnyRole(['admin', 'fisioterapeuta'])) {
  // Código para admin ou fisioterapeuta
}
```

## 🧪 Testes de Segurança

### 1. Teste de Isolamento de Dados

```sql
-- Como paciente, deve ver apenas próprios dados
SET request.jwt.claim.sub = 'user-id-paciente';
SELECT * FROM medical_records; -- Deve retornar apenas registros do paciente

-- Como terapeuta, deve ver dados de pacientes
SET request.jwt.claim.sub = 'user-id-terapeuta';
SELECT * FROM medical_records; -- Deve retornar registros de todos os pacientes
```

### 2. Teste de Permissões de Escrita

```sql
-- Como paciente, tentar criar appointment (deve falhar)
SET request.jwt.claim.sub = 'user-id-paciente';
INSERT INTO appointments (...) VALUES (...); -- Deve falhar

-- Como terapeuta, criar appointment (deve funcionar)
SET request.jwt.claim.sub = 'user-id-terapeuta';
INSERT INTO appointments (...) VALUES (...); -- Deve funcionar
```

## 🚨 Aspectos de Segurança Críticos

### 1. **Validação no Backend**
```typescript
// Sempre validar no backend
const profile = await supabase
  .from('profiles')
  .select('role')
  .eq('user_id', user.id)
  .single();

if (profile.data?.role !== 'admin') {
  throw new Error('Unauthorized');
}
```

### 2. **Sanitização de Dados**
```typescript
// Sanitizar dados antes de inserir
const sanitizedData = {
  ...data,
  created_by: user.id, // Sempre usar ID do usuário autenticado
  created_at: new Date().toISOString()
};
```

### 3. **Logs de Auditoria**
```typescript
// Log todas as operações sensíveis
await supabase
  .from('audit_log')
  .insert({
    user_id: user.id,
    action: 'UPDATE_PATIENT',
    table_name: 'patients',
    record_id: patientId,
    timestamp: new Date().toISOString()
  });
```

## 🔍 Monitoramento e Auditoria

### Queries Úteis para Monitoramento

```sql
-- Verificar tentativas de acesso negado
SELECT * FROM pg_stat_statements 
WHERE query LIKE '%RLS%' 
AND calls > 0;

-- Verificar políticas mais usadas
SELECT schemaname, tablename, policyname, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_policies 
WHERE schemaname = 'public';

-- Verificar usuários mais ativos
SELECT user_id, role, last_login_at, created_at
FROM profiles 
ORDER BY last_login_at DESC 
LIMIT 10;
```

## 🚀 Próximos Passos

1. **Executar script RLS** - Implementar todas as políticas
2. **Testar em ambiente de desenvolvimento** - Validar comportamentos
3. **Configurar monitoramento** - Implementar logs de auditoria
4. **Configurar alertas** - Detectar tentativas de acesso não autorizadas
5. **Documentar procedimentos** - Criar guias para equipe

## 📋 Checklist de Implementação

- [ ] Script RLS executado no Supabase
- [ ] Políticas testadas para cada role
- [ ] Funções utilitárias funcionando
- [ ] Triggers de perfil automático funcionando
- [ ] Índices de performance criados
- [ ] Testes de segurança validados
- [ ] Logs de auditoria configurados
- [ ] Equipe treinada nos procedimentos

---

## 🆘 Troubleshooting

### Erro: "RLS policy violation"
- Verificar se usuário tem o role correto
- Verificar se política cobre o caso de uso
- Verificar se JWT contém as claims necessárias

### Erro: "Function does not exist"
- Executar novamente a parte do script com as funções
- Verificar se as funções foram criadas no schema correto

### Performance lenta
- Verificar se os índices foram criados
- Analisar planos de execução das queries
- Considerar otimizar políticas mais complexas