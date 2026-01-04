# Análise de Logs - Erro 500 no Login

## Data da Análise
2026-01-04

## Contexto

Usuários de teste foram criados diretamente na tabela `auth.users` usando SQL, mas ao tentar fazer login via API (`signInWithPassword`), ocorre erro HTTP 500 "Database error querying schema".

## Logs Coletados

### Logs da API (via MCP) - 2026-01-04

Os logs da API mostram múltiplos erros 500 no endpoint `/auth/v1/token`:

**Erros 500 encontrados:**
- Total de erros 500: 10+ ocorrências
- Timestamp mais recente: 2026-01-04 04:18:13 (UTC)
- Padrão: `POST | 500 | /auth/v1/token?grant_type=password`

**Detalhes dos erros:**
- Todos os erros são 500 (Internal Server Error)
- Endpoint: `/auth/v1/token`
- Método: POST
- Parâmetro: `grant_type=password`
- IP de origem: 177.140.106.29
- User-Agent: node (scripts de teste)

**Análise temporal:**
- Primeiros erros 500: ~04:17:32 UTC
- Últimos erros 500: ~04:18:13 UTC
- Período de erro: ~40 segundos
- Intervalo entre erros: ~1-5 segundos

**Observação importante:**
- Antes dos erros 500, havia erros 400 (Bad Request)
- Isso sugere que inicialmente as credenciais eram rejeitadas
- Depois, quando tentamos novamente, começaram os erros 500

### Logs do Postgres (via MCP)

Os logs do Postgres mostram que a migration foi aplicada com sucesso, mas não há erros específicos relacionados ao login.

**Observações:**
- Triggers estão habilitados
- Função `update_last_login` existe e está correta
- Função `audit_user_roles_changes` foi corrigida para usar ações permitidas

## Análise do Problema

### Possíveis Causas Identificadas

1. **Formato do Hash de Senha**
   - Usuários foram criados com `crypt()` do PostgreSQL usando `gen_salt('bf')`
   - Formato gerado: `$2a$06$...` (bcrypt)
   - Supabase Auth pode esperar um formato específico ou validações adicionais

2. **Triggers Durante Login**
   - Trigger `on_auth_user_login` executa após UPDATE em `auth.users.last_sign_in_at`
   - Função `update_last_login` tenta atualizar `profiles.last_login_at`
   - Se o profile não existir ou houver problema de permissão, pode causar erro

3. **Validação de Schema**
   - Erro "Database error querying schema" sugere problema na validação do schema
   - Pode estar relacionado a:
     - Validação de formato de hash
     - Validação de estrutura de dados do usuário
     - Validação de triggers ou funções

4. **Problemas com Identities** ⚠️ **CAUSA RAIZ IDENTIFICADA**
   - Supabase Auth usa tabela `auth.identities` para gerenciar métodos de autenticação
   - Usuários criados via SQL podem não ter entries corretas em `auth.identities`
   - **VERIFICAÇÃO:** Consulta SQL confirmou que os usuários de teste NÃO têm entries em `auth.identities`
   - **IMPACTO:** Sem entries em `auth.identities`, o Supabase Auth não consegue autenticar os usuários
   - **ERRO RESULTANTE:** HTTP 500 "Database error querying schema" ao tentar fazer login

## Recomendações

### Solução Recomendada: Usar Admin API

A melhor solução é recriar os usuários usando a Supabase Admin API:

1. **Vantagens:**
   - Garante formato correto do hash
   - Cria entries corretas em `auth.identities`
   - Valida todos os dados necessários
   - Evita problemas com triggers

2. **Implementação:**
   - Usar `supabase.auth.admin.createUser()` com service role key
   - Definir `email_confirm: true` para confirmar email automaticamente
   - Criar/atualizar profiles após criação do usuário

### Verificações Adicionais

1. **Verificar auth.identities:**
   ```sql
   SELECT * FROM auth.identities 
   WHERE user_id IN (
     SELECT id FROM auth.users 
     WHERE email IN ('admin@activityfisio.com', 'fisio@activityfisio.com', 'estagiario@activityfisio.com')
   );
   ```

2. **Verificar triggers:**
   ```sql
   SELECT tgname, tgenabled 
   FROM pg_trigger 
   WHERE tgrelid = 'auth.users'::regclass;
   ```

3. **Testar função update_last_login:**
   ```sql
   SELECT update_last_login();
   ```

## Próximos Passos

1. ✅ Coletar logs (feito)
2. ⏳ Recriar usuários com Admin API
3. ⏳ Testar login após recriação
4. ⏳ Documentar resultados finais

## Referências

- [Supabase Auth Admin API](https://supabase.com/docs/reference/javascript/auth-admin-createuser)
- [Supabase Password Security](https://supabase.com/docs/guides/auth/password-security)
- [Supabase Auth Migrations](https://supabase.com/docs/guides/platform/migrating-to-supabase/auth0)

