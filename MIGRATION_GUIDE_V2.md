# Guia de Migração V2 - FisioFlow (Segurança & Sincronização)

Este guia detalha as alterações implementadas para garantir a segurança via Custom Claims e a integridade dos dados entre Firestore e Cloud SQL.

## 1. Alterações de Segurança (Firestore Rules)

As regras de segurança (`firestore.rules`) foram atualizadas para remover IDs hardcoded. Agora, o acesso administrativo depende de **Custom Claims** no token de autenticação do Firebase.

**Nova Regra:**
```javascript
function isAdmin() {
  return request.auth.token.admin == true || request.auth.token.role == 'admin';
}
```

## 2. Configuração de Admin

Para conceder acesso administrativo a um usuário (ex: você), execute o script criado:

```bash
# Instale as dependências se necessário
npm install firebase-admin

# Execute o script (certifique-se de ter o arquivo service-account.json configurado no .env)
node scripts/set-admin-claim.js
```

Este script define `admin: true` e `role: 'admin'` para o email configurado (`rafael.minatto@yahoo.com.br`). O usuário precisará fazer logout/login para atualizar o token.

## 3. Sincronização Bidirecional (Split Brain Mitigation)

Implementamos uma estratégia de "Dual Write" robusta:

1.  **API (Online):** A API (`functions/src/api/patients.ts`) escreve primeiro no Cloud SQL (PostgreSQL) e depois sincroniza para o Firestore.
2.  **Trigger (Offline/Mobile):** Criamos um novo gatilho `syncPatientToSql` em `functions/src/triggers/sync-patients.ts`.
    *   **Função:** Escuta alterações na coleção `patients` do Firestore.
    *   **Ação:** Insere ou atualiza o registro correspondente no Cloud SQL.
    *   **Segurança:** Verifica o timestamp para evitar loops infinitos (se o update no SQL for recente, ignora).

## 4. Próximos Passos (Deploy)

Para aplicar as alterações:

1.  **Deploy das Rules:**
    ```bash
    firebase deploy --only firestore:rules
    ```

2.  **Deploy das Functions:**
    ```bash
    # Deploy da nova trigger e atualização da API
    firebase deploy --only functions:syncPatientToSql,functions:listPatients,functions:createPatient,functions:updatePatient
    ```

3.  **Verificação:**
    *   Tente criar um paciente via App (Firestore direto) e verifique se aparece no Cloud SQL.
    *   Tente criar via API e verifique se aparece no Firestore.

## 5. Notas Técnicas

*   **Arquivo de Sincronização:** `functions/src/triggers/sync-patients.ts`
*   **Script Admin:** `scripts/set-admin-claim.js`
*   **Init SQL:** O script de inicialização do Cloud SQL (`scripts/migration/cloudsql-schema.sql`) deve ser aplicado caso ainda não tenha sido.
