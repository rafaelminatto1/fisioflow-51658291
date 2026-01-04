# Instruções para Obter Service Role Key e Recriar Usuários

## Por que precisamos da Service Role Key?

Os usuários foram criados via SQL, mas o formato do hash da senha não é 100% compatível com o Supabase Auth. A solução definitiva é recriar os usuários usando a **Supabase Admin API**, que garante o formato correto.

## Como Obter a Service Role Key

### Passo 1: Acessar Dashboard do Supabase

1. Acesse: https://supabase.com/dashboard/project/ycvbtjfrchcyvmkvuocu/settings/api
2. Ou navegue: Dashboard → Settings → API

### Passo 2: Encontrar a Service Role Key

1. Role a página até a seção **"Project API keys"**
2. Procure pela chave **"service_role"** (secret)
3. Clique no ícone de olho 👁️ para revelar a chave
4. Copie a chave completa

### Passo 3: Configurar Variável de Ambiente

**Windows PowerShell:**
```powershell
$env:SUPABASE_SERVICE_ROLE_KEY="sua-service-role-key-aqui"
```

**Windows CMD:**
```cmd
set SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key-aqui
```

**Linux/Mac:**
```bash
export SUPABASE_SERVICE_ROLE_KEY="sua-service-role-key-aqui"
```

**Ou criar arquivo .env:**
```env
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key-aqui
```

⚠️ **IMPORTANTE:** 
- Nunca commite a service role key no código
- Não compartilhe a key publicamente
- A key dá acesso total ao banco de dados

## Executar Script de Criação

Após configurar a variável de ambiente:

```bash
node create-test-users-admin.mjs
```

O script irá:
1. Remover usuários existentes (se houver)
2. Criar novos usuários via Admin API
3. Criar/atualizar profiles
4. Testar login de cada usuário
5. Salvar resultados em `usuarios-criados-admin-api.json`

## Resultado Esperado

Após executar o script, você deve ver:

```
✅ Usuários criados/atualizados: 3
   ✅ admin@activityfisio.com (criado) - Login: OK
   ✅ fisio@activityfisio.com (criado) - Login: OK
   ✅ estagiario@activityfisio.com (criado) - Login: OK
```

## Alternativa: Usar Dashboard do Supabase

Se preferir criar manualmente:

1. Acesse: https://supabase.com/dashboard/project/ycvbtjfrchcyvmkvuocu/auth/users
2. Clique em "Add user" → "Create new user"
3. Preencha:
   - Email: `admin@activityfisio.com`
   - Password: `Admin@123`
   - Auto Confirm User: ✅ (marcar)
4. Repita para os outros usuários
5. Depois, atualize os profiles via SQL ou interface

## Verificação

Após criar os usuários, teste o login:

```bash
node test-login-simple.mjs
```

Ou teste manualmente na interface web seguindo `TESTE_LOGIN_MANUAL.md`.

