# Passos Rápidos para Corrigir Agendamentos

## Organization ID Encontrado
```
edc6dd27-f4e4-4bb4-bd81-1b43bbd04c82
```
Nome: "Clínica Principal"

## Próximos Passos no Firebase Console

### 1. Ir para a coleção Profiles
- No menu lateral esquerdo, clique em "Firestore Database"
- Na lista de coleções, procure e clique em **`profiles`**

### 2. Encontrar seu usuário
- Procure pelo documento do seu usuário
- Você pode buscar pelo seu email: `rafael.mrsantos@yahoo.com.br`
- Ou procurar pelo UID do usuário

### 3. Adicionar o campo organization_id

**Se o campo NÃO existe:**
1. Clique no documento do seu usuário
2. Clique em "Adicionar campo" (+ Add field)
3. Preencha:
   - Nome do campo: `organization_id`
   - Tipo: `string`
   - Valor: `edc6dd27-f4e4-4bb4-bd81-1b43bbd04c82`
4. Clique em "Adicionar"

**Se o campo JÁ existe mas está vazio:**
1. Clique no documento do seu usuário
2. Clique no valor do campo `organization_id`
3. Cole: `edc6dd27-f4e4-4bb4-bd81-1b43bbd04c82`
4. Pressione Enter

### 4. Salvar
- Clique em "Salvar" ou pressione Ctrl+S

### 5. Testar na aplicação
1. Volte para: http://localhost:8080
2. **IMPORTANTE: Faça LOGOUT**
3. Faça LOGIN novamente
4. Vá para a página de Agenda
5. Os agendamentos devem aparecer!

## Verificação
O painel de diagnóstico no topo da página deve mostrar:
- ✅ Organization ID: edc6dd27-f4e4-4bb4-bd81-1b43bbd04c82
- ✅ Agendamentos carregados: [número > 0]

## Se ainda não funcionar
1. Limpe o cache do navegador (Ctrl+Shift+Delete)
2. Ou use uma aba anônima
3. Faça login novamente
