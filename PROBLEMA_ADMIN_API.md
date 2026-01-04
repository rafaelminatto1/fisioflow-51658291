# Problema com Admin API - Erro 500

## Erro Encontrado

Ao tentar criar usuários via Supabase Admin API, ocorre erro HTTP 500 "Database error creating new user".

## Logs Identificados

### API Logs
- `POST | 500 | /auth/v1/admin/users` - Múltiplas ocorrências
- Erro ocorre ao tentar criar qualquer usuário via Admin API

### Postgres Logs
- Múltiplos erros: `column "user_id" does not exist`
- Erros ocorrem em triggers ou funções durante criação de usuário
- Alguns erros relacionados a `notification_preferences` table

## Possíveis Causas

1. **Triggers com referências incorretas**: Algum trigger está tentando acessar `user_id` em uma tabela que não tem essa coluna
2. **Funções de criação de profile**: Funções que criam profiles automaticamente podem estar com referências incorretas
3. **Tabela notification_preferences**: Pode não existir ou ter estrutura incorreta

## Próximos Passos

1. Verificar triggers relacionados a criação de usuários
2. Verificar funções que criam profiles automaticamente
3. Verificar se tabela `notification_preferences` existe
4. Corrigir referências incorretas a `user_id`

## Solução Temporária

Enquanto o problema não é resolvido, os usuários podem ser criados manualmente via dashboard do Supabase:
1. Acesse: https://supabase.com/dashboard/project/ycvbtjfrchcyvmkvuocu/auth/users
2. Clique em "Add user" → "Create new user"
3. Preencha email e senha
4. Marque "Auto Confirm User"
5. Depois, atualize o profile via SQL ou interface

