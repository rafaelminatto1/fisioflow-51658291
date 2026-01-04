# Guia de Teste Manual de Login

## Objetivo

Testar o login manualmente na interface web da aplicação para verificar se os usuários de teste conseguem fazer login corretamente.

## Pré-requisitos

1. Servidor de desenvolvimento rodando (`npm run dev`)
2. Navegador web (Chrome, Firefox, Edge, etc.)
3. Console do navegador aberto (F12)

## Credenciais de Teste

### Admin
- **Email:** `admin@activityfisio.com`
- **Senha:** `Admin@123`
- **Role:** `admin`

### Fisioterapeuta
- **Email:** `fisio@activityfisio.com`
- **Senha:** `Fisio@123`
- **Role:** `fisioterapeuta`

### Estagiário
- **Email:** `estagiario@activityfisio.com`
- **Senha:** `Estagiario@123`
- **Role:** `estagiario`

## Passos para Teste

### 1. Iniciar Servidor de Desenvolvimento

```bash
npm run dev
```

O servidor deve iniciar em `http://localhost:5173` (ou porta similar).

### 2. Acessar Página de Login

1. Abra o navegador
2. Acesse: `http://localhost:5173/auth`
3. Ou acesse a URL de produção: `https://fisioflow.lovable.app/auth`

### 3. Testar Login - Admin

1. **Preencher formulário:**
   - Email: `admin@activityfisio.com`
   - Senha: `Admin@123`

2. **Clicar em "Entrar"**

3. **Verificações:**
   - ✅ Login bem-sucedido (sem erros)
   - ✅ Redirecionamento para dashboard/página principal
   - ✅ Perfil carregado (verificar se nome/role aparecem)
   - ✅ Sem erros no console do navegador (F12)
   - ✅ Dados da organização carregados corretamente

4. **Fazer logout** e testar próximo usuário

### 4. Testar Login - Fisioterapeuta

1. **Preencher formulário:**
   - Email: `fisio@activityfisio.com`
   - Senha: `Fisio@123`

2. **Clicar em "Entrar"**

3. **Verificações:**
   - ✅ Login bem-sucedido
   - ✅ Redirecionamento correto
   - ✅ Perfil carregado com role `fisioterapeuta`
   - ✅ Acesso apenas aos dados da organização

4. **Fazer logout**

### 5. Testar Login - Estagiário

1. **Preencher formulário:**
   - Email: `estagiario@activityfisio.com`
   - Senha: `Estagiario@123`

2. **Clicar em "Entrar"**

3. **Verificações:**
   - ✅ Login bem-sucedido
   - ✅ Redirecionamento correto
   - ✅ Perfil carregado com role `estagiario`
   - ✅ Permissões corretas (acesso limitado)

4. **Fazer logout**

## O que Verificar

### Console do Navegador (F12)

- ❌ **Erros JavaScript:** Não deve haver erros vermelhos
- ❌ **Erros de rede:** Verificar se há requisições falhando
- ✅ **Logs de autenticação:** Verificar se há logs de sucesso
- ✅ **Requisições ao Supabase:** Verificar se as requisições retornam 200

### Interface do Usuário

- ✅ **Redirecionamento:** Após login, deve sair da página `/auth`
- ✅ **Menu de usuário:** Deve aparecer nome/email do usuário
- ✅ **Dados carregados:** Dashboard/página inicial deve carregar dados
- ✅ **Permissões:** Verificar se as permissões por role estão corretas

### Dados Carregados

- ✅ **Profile:** Nome, email, role devem estar corretos
- ✅ **Organization ID:** Deve estar presente no profile
- ✅ **Isolamento:** Dados mostrados devem ser apenas da organização do usuário

## Problemas Comuns

### Erro: "Invalid login credentials"
- **Causa:** Senha incorreta ou usuário não existe
- **Solução:** Verificar credenciais ou recriar usuário via Admin API

### Erro: "Database error querying schema"
- **Causa:** Problema com formato de hash ou triggers
- **Solução:** Recriar usuário via Admin API

### Erro: "Profile not found"
- **Causa:** Profile não foi criado após criação do usuário
- **Solução:** Verificar se profile existe e criar se necessário

### Página fica carregando infinitamente
- **Causa:** Problema ao carregar perfil ou dados
- **Solução:** Verificar console do navegador e logs do Supabase

## Como Reportar Problemas

1. **Capturar informações:**
   - Screenshot do erro (se houver)
   - Logs do console do navegador (F12 → Console)
   - Logs de rede (F12 → Network → Filtrar por falhas)
   - Timestamp do erro

2. **Documentar:**
   - Qual usuário estava testando
   - O que estava fazendo quando o erro ocorreu
   - Mensagem de erro exata
   - Passos para reproduzir

3. **Verificar logs do Supabase:**
   - Acessar dashboard do Supabase
   - Verificar logs da API e Postgres
   - Documentar erros encontrados

## Resultados Esperados

Após todos os testes, você deve ter:

- ✅ 3 usuários testados com sucesso
- ✅ Login funcionando para todos
- ✅ Perfis carregados corretamente
- ✅ Dados isolados por organização
- ✅ Permissões por role funcionando
- ✅ Sem erros no console ou logs

## Próximos Passos

Após testar manualmente:

1. Se login funcionar: Documentar sucesso e atualizar `USUARIOS_TESTE_CRIADOS.md`
2. Se login falhar: Executar `create-test-users-admin.mjs` para recriar usuários
3. Verificar logs detalhados no dashboard do Supabase
4. Corrigir problemas identificados

