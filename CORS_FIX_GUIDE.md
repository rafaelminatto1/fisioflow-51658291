# Correção do Problema de CORS

## Problema Identificado

Os agendamentos não aparecem porque as Cloud Functions do Firebase estão bloqueando requisições do `localhost:5175` por política de CORS.

```
Access to fetch at 'https://appointmentservicehttp-tfecm5cqoq-rj.a.run.app/' 
from origin 'http://localhost:5175' has been blocked by CORS policy
```

## Solução 1: Usar Firestore Diretamente (Mais Rápido)

Em vez de usar as Cloud Functions, podemos buscar os dados diretamente do Firestore. Isso é mais rápido para desenvolvimento.

### Passo 1: Verificar se há dados no Firestore

1. Abra o Firebase Console: https://console.firebase.google.com/project/fisioflow-migration/firestore
2. Procure pela coleção `appointments`
3. Verifique se existem documentos com `organization_id = edc6dd27-f4e4-4bb4-bd81-1b43bbd04c82`

### Passo 2: Modificar o código para usar Firestore

Vou criar uma versão alternativa do `appointmentService.ts` que busca diretamente do Firestore.

## Solução 2: Configurar CORS nas Cloud Functions (Produção)

Se você precisa usar as Cloud Functions, precisa configurar CORS nelas.

### Opção A: Via Firebase Console

1. Acesse: https://console.cloud.google.com/run?project=fisioflow-migration
2. Encontre o serviço `appointmentservicehttp`
3. Clique em "Edit & Deploy New Revision"
4. Em "Container" > "Environment Variables", adicione:
   ```
   CORS_ORIGIN=http://localhost:5175,http://localhost:8080
   ```
5. Salve e aguarde o deploy

### Opção B: Atualizar o código da Cloud Function

No código da Cloud Function, adicione os headers CORS:

```typescript
// No início do handler
res.set('Access-Control-Allow-Origin', '*'); // ou 'http://localhost:5175'
res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

// Responder OPTIONS (preflight)
if (req.method === 'OPTIONS') {
  res.status(204).send('');
  return;
}
```

## Solução 3: Usar Proxy Local (Desenvolvimento)

Configure um proxy no Vite para redirecionar as requisições.

### Passo 1: Atualizar vite.config.ts

Adicione a configuração de proxy:

```typescript
export default defineConfig({
  server: {
    port: 5175,
    proxy: {
      '/api': {
        target: 'https://appointmentservicehttp-tfecm5cqoq-rj.a.run.app',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
```

### Passo 2: Atualizar as variáveis de ambiente

Adicione no `.env.local`:

```
VITE_USE_FUNCTIONS_PROXY=true
VITE_FUNCTIONS_PROXY=/api
```

## Recomendação

Para desenvolvimento local, a **Solução 1** (Firestore direto) é a mais rápida e simples.

Vou implementar isso agora criando um serviço alternativo que busca diretamente do Firestore.
