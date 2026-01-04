# Problema Detalhado com Admin API - Erro 500

## Status Atual

Ao tentar criar usuários via Supabase Admin API, ocorre erro HTTP 500 "Database error creating new user".

## Análise dos Logs

### Erros Identificados no Postgres

1. **Múltiplos erros "column user_id does not exist"**
   - Ocorrem durante tentativas de criação de usuário
   - Não especificam qual tabela está causando o problema

2. **Erros "relation notification_preferences does not exist"**
   - Ocorrem intermitentemente
   - Sugerem problema com search_path ou schema

### Triggers Identificados

1. **`on_auth_user_created`** → executa `handle_new_user()`
   - Cria profile automaticamente
   - Tenta criar role em `user_roles`

2. **`on_auth_user_created_notification_preferences`** → executa `create_default_notification_preferences()`
   - Tenta criar preferências de notificação
   - ✅ **CORRIGIDO**: Função atualizada para incluir todos os campos

3. **`on_auth_user_login`** → executa `update_last_login()`
   - Atualiza `last_login_at` no profile

## Correções Aplicadas

1. ✅ **Função `create_default_notification_preferences` corrigida**
   - Agora inclui todos os campos necessários
   - Migration: `fix_create_default_notification_preferences`

2. ✅ **Função `handle_new_user` melhorada**
   - Adicionado tratamento de exceções
   - Verificação se `user_roles` existe antes de inserir
   - Migration: `fix_handle_new_user_without_user_roles`

## Problema Persistente

Mesmo após as correções, o erro 500 persiste. Os logs mostram muitos erros "column user_id does not exist" mas não especificam qual tabela ou função está causando o problema.

## Possíveis Causas

1. **Problema com search_path**: Alguma função pode estar tentando acessar tabelas sem especificar o schema
2. **Trigger ou função oculta**: Pode haver outro trigger ou função que não foi identificado
3. **Problema com RLS policies**: Alguma política RLS pode estar causando o erro
4. **Problema com validações do Supabase Auth**: O próprio Supabase Auth pode estar rejeitando a criação

## Próximos Passos Recomendados

1. **Verificar todas as funções e triggers relacionados a auth.users**
2. **Verificar logs detalhados no dashboard do Supabase** para identificar a tabela específica
3. **Testar criação manual via dashboard** para verificar se o problema é específico da API
4. **Considerar criar usuários via SQL direto** (como foi feito anteriormente) e depois criar as identities

## Solução Alternativa

Enquanto o problema não é resolvido, criar usuários manualmente via dashboard do Supabase:
1. Acesse: https://supabase.com/dashboard/project/ycvbtjfrchcyvmkvuocu/auth/users
2. Clique em "Add user" → "Create new user"
3. Preencha email e senha
4. Marque "Auto Confirm User"
5. Depois, atualize o profile via SQL ou interface

