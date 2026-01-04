# Usuários de Teste Criados

## Status

✅ **Usuários criados com sucesso no banco de dados**

Os seguintes usuários foram criados na tabela `auth.users` e `profiles`:

1. **admin@activityfisio.com**
   - Senha: `Admin@123`
   - Role: `admin`
   - User ID: `121bfde8-ab6f-4b3b-9289-8864922020ba`
   - Profile criado com organization_id

2. **fisio@activityfisio.com**
   - Senha: `Fisio@123`
   - Role: `fisioterapeuta`
   - User ID: `6493fe82-3865-458b-bd42-982db77313d3`
   - Profile criado com organization_id

3. **estagiario@activityfisio.com**
   - Senha: `Estagiario@123`
   - Role: `estagiario`
   - User ID: `a047d3a9-e5da-453c-ba46-a77df89e18f9`
   - Profile criado com organization_id

## Organização de Teste

- Nome: "Activity Fisio Test"
- Slug: "activity-fisio-test"
- ID: `ebe5dd27-f4e4-48b4-bd81-1b45b0bd3c02`

## Problema Conhecido e Solução

⚠️ **Erro ao fazer login via API**: Os usuários foram criados, mas ao tentar fazer login via `signInWithPassword`, ocorre o erro "Database error querying schema" (HTTP 500).

### ✅ Correções Aplicadas

1. **Identities criadas**: Migration `fix_users_identities_final` aplicada com sucesso
   - Entries em `auth.identities` foram criadas para todos os usuários
   - Verificação confirmada via SQL

2. **Problema persistente**: Mesmo com identities, o login ainda falha
   - **Causa raiz**: Formato do hash da senha criado via SQL não é compatível
   - **Solução**: Recriar usuários usando Supabase Admin API

### 🔧 Solução Definitiva

**Recriar usuários usando Admin API:**
1. Obter service role key do dashboard Supabase
2. Executar: `node create-test-users-admin.mjs`
3. O script criará usuários com hash correto e testará login automaticamente

**Instruções detalhadas:** Ver `INSTRUCOES_SERVICE_ROLE_KEY.md`

### Possíveis Causas

1. O formato do hash bcrypt pode não estar 100% compatível com o que o Supabase Auth espera
2. Pode haver um problema com triggers ou funções que são executadas durante o login
3. O Supabase Auth pode ter validações adicionais que não estão sendo satisfeitas

### Soluções Recomendadas

1. **Usar Supabase Admin API** (Recomendado):
   - Criar os usuários usando `supabase.auth.admin.createUser()` com a service role key
   - Isso garante que o formato do hash seja o correto
   - Exemplo:
     ```javascript
     const { data, error } = await supabaseAdmin.auth.admin.createUser({
       email: 'admin@activityfisio.com',
       password: 'Admin@123',
       email_confirm: true,
       user_metadata: { full_name: 'Admin', role: 'admin' }
     });
     ```

2. **Testar login manualmente na interface**:
   - Os usuários podem funcionar corretamente na interface web da aplicação
   - O problema pode ser específico da API

3. **Verificar logs do Supabase**:
   - Verificar logs detalhados do erro 500 no dashboard do Supabase
   - Pode revelar o problema específico

## Migrations Aplicadas

1. `fix_audit_log_action_for_user_creation` - Corrige função `audit_user_roles_changes` para usar ações permitidas
2. `create_test_users_final` - Cria os usuários e profiles (executado via SQL direto)

## Próximos Passos

1. Obter a service role key do Supabase
2. Usar a Admin API para recriar os usuários (ou atualizar as senhas)
3. Testar login via interface web da aplicação
4. Verificar logs detalhados do erro 500

## Verificação

Para verificar se os usuários existem:

```sql
-- Verificar usuários
SELECT id, email, email_confirmed_at 
FROM auth.users 
WHERE email IN ('admin@activityfisio.com', 'fisio@activityfisio.com', 'estagiario@activityfisio.com');

-- Verificar profiles
SELECT p.user_id, p.email, p.full_name, p.role, p.organization_id
FROM profiles p
WHERE p.email IN ('admin@activityfisio.com', 'fisio@activityfisio.com', 'estagiario@activityfisio.com');
```

