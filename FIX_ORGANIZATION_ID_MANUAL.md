# Correção Manual do Organization ID via Firebase Console

## Problema
Os agendamentos não aparecem porque o usuário não tem um `organization_id` definido no perfil.

## Solução Rápida (5 minutos)

### Passo 1: Abrir Firebase Console

Acesse: https://console.firebase.google.com/project/fisioflow-migration/firestore

### Passo 2: Encontrar um Organization ID válido

1. No Firestore, clique na coleção **`organizations`**
2. Você verá uma lista de documentos
3. **Copie o ID** de um dos documentos (é o UUID na primeira coluna)
   - Exemplo: `11111111-1111-1111-1111-111111111111`
   - Ou qualquer outro UUID que aparecer

**Screenshot de referência:**
```
organizations/
  ├─ 11111111-1111-1111-1111-111111111111  ← COPIE ESTE ID
  │   ├─ name: "Minha Clínica"
  │   ├─ created_at: ...
  │   └─ ...
  └─ ...
```

### Passo 3: Encontrar o Perfil do Usuário

1. Volte para a raiz do Firestore
2. Clique na coleção **`profiles`**
3. Procure o documento do seu usuário
   - Você pode buscar pelo email no campo de busca
   - Ou procurar manualmente na lista

### Passo 4: Adicionar/Editar o organization_id

1. Clique no documento do usuário para abri-lo
2. Procure o campo **`organization_id`**
   
   **Se o campo NÃO existe:**
   - Clique em **"Add field"** (+ Adicionar campo)
   - Nome do campo: `organization_id`
   - Tipo: `string`
   - Valor: Cole o UUID que você copiou no Passo 2
   - Clique em **"Add"**
   
   **Se o campo JÁ existe mas está vazio:**
   - Clique no valor do campo `organization_id`
   - Cole o UUID que você copiou no Passo 2
   - Pressione Enter para salvar

3. Clique em **"Save"** ou pressione Ctrl+S

### Passo 5: Atualizar o campo updated_at (Opcional mas recomendado)

1. No mesmo documento, procure o campo `updated_at`
2. Clique no valor
3. Altere para a data/hora atual
4. Ou delete o campo e adicione novamente com o tipo `timestamp` e valor "now"

### Passo 6: Verificar a Correção

1. Volte para a aplicação: http://localhost:8080
2. **Faça logout** (importante!)
3. **Faça login novamente**
4. Navegue para a página de Agenda
5. Os agendamentos devem aparecer agora!

## Verificação Rápida

Após fazer as alterações, você pode verificar se funcionou:

1. Abra o console do navegador (F12)
2. Vá para a aba Console
3. Procure por esta mensagem:
   ```
   [INFO] Schedule page - Organization ID
   {
     hasUser: true,
     organizationId: "11111111-1111-1111-1111-111111111111",
     hasOrganizationId: true  ← Deve ser TRUE agora!
   }
   ```

4. Se `hasOrganizationId: true`, a correção funcionou!

## Troubleshooting

### Problema: Ainda não aparece organization_id após login

**Solução:**
1. Limpe o cache do navegador (Ctrl+Shift+Delete)
2. Ou use uma aba anônima
3. Faça login novamente

### Problema: Não encontro a coleção "organizations"

**Solução:**
1. Verifique se está no projeto correto: `fisioflow-migration`
2. Se a coleção não existe, você precisa criar uma organização primeiro
3. Ou use um UUID de teste: `11111111-1111-1111-1111-111111111111`

### Problema: Não encontro meu usuário na coleção "profiles"

**Solução:**
1. Verifique na aba **Authentication** do Firebase Console
2. Copie o UID do usuário
3. Volte para Firestore > profiles
4. Procure pelo documento com esse UID

## Alternativa: Usar Script Automatizado

Se preferir automatizar, você pode:

1. Baixar a chave de serviço:
   - https://console.firebase.google.com/project/fisioflow-migration/settings/serviceaccounts/adminsdk
   - Clique em "Generate New Private Key"
   - Salve como `serviceAccountKey.json` na raiz do projeto

2. Instalar dependências:
   ```bash
   npm install firebase-admin
   ```

3. Executar o script:
   ```bash
   node scripts/fix-appointments-firestore.js
   ```

## Resultado Esperado

Após a correção, você deve ver:

✅ Diagnostic panel mostra Organization ID
✅ Console mostra `hasOrganizationId: true`
✅ Agendamentos aparecem na página de Agenda
✅ Contador de agendamentos > 0

## Precisa de Ajuda?

Se ainda tiver problemas:

1. Tire um screenshot do Firestore mostrando:
   - A coleção `profiles` com seu usuário
   - O campo `organization_id` do seu perfil
   
2. Tire um screenshot do console do navegador mostrando:
   - As mensagens de log `[INFO]`
   - Qualquer erro `[ERROR]`

3. Compartilhe os screenshots para análise
