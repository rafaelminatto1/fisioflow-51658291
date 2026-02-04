# FisioFlow - Troubleshooting Guide

> **Versão**: 2.0.0
> **Projeto**: fisioflow-migration

---

## Índice

1. [Cloud Functions](#cloud-functions)
2. [Cloud SQL](#cloud-sql)
3. [Firebase Auth](#firebase-auth)
4. [Firestore](#firestore)
5. [Storage](#storage)
6. [Integrações](#integrações)
7. [Performance](#performance)
8. [Segurança](#segurança)
9. [Console e logs em desenvolvimento](#console-e-logs-em-desenvolvimento)

---

## Cloud Functions

### Função não retorna ou timeout

**Sintomas**:
- Função trava sem resposta
- Erro `DEADLINE_EXCEEDED`

**Diagnóstico**:
```bash
# Ver logs da função
firebase functions:log --only nomeDaFuncao

# Ver métricas de latência
gcloud functions metrics list --filter=nomeDaFuncao
```

**Causas Comuns**:
1. Conexão com banco lenta
2. Query complexa sem índice
3. Loop infinito no código
4. Memória insuficiente

**Soluções**:
```typescript
// 1. Aumentar timeout
export const myFunction = onCall({
  timeoutSeconds: 540,  // máximo Gen 2
}, handler);

// 2. Aumentar memória/CPU
export const myFunction = onCall({
  memory: '1GiB',
  cpu: 2,
}, handler);

// 3. Adicionar retry
export const myFunction = onCall({
  retryConfig: {
    retryCount: 3,
    maxRetryDelay: 60,
  },
}, handler);
```

### Erro: "Function execution failed"

**Sintoma**: Log mostra erro genérico sem detalhes

**Diagnóstico**:
```bash
# Ver logs detalhados
firebase functions:log --only nomeDaFuncao --limit 10

# No Cloud Console, habilite "Error Reporting"
```

**Solução**:
```typescript
// Adicionar try-catch com logging detalhado
export const myFunction = onCall(async (request) => {
  try {
    // código
  } catch (error) {
    logger.error('[myFunction] Error:', {
      message: error.message,
      stack: error.stack,
      data: request.data,
      userId: request.auth?.uid,
    });
    throw new HttpsError('internal', error.message);
  }
});
```

### Cold start excessivo

**Sintoma**: Primeira chamada demora >5 segundos

**Diagnóstico**:
```bash
# Ver logs de cold start
gcloud logging read 'resource.type="cloud_function" AND protoPayload.@type="type.googleapis.com/google.cloud.audit.AuditLog"'
```

**Soluções**:
```typescript
// Manter instâncias mínimas
export const myFunction = onCall({
  minInstances: 1,  // previne cold start
}, handler);

// Para funções críticas
export const criticalFunction = onCall({
  minInstances: 2,
  maxInstances: 10,
}, handler);
```

---

## Cloud SQL

### Erro: "Connection refused"

**Sintoma**: `Error: connect ECONNREFUSED`

**Diagnóstico**:
```bash
# Ver se instância está rodando
gcloud sql instances describe fisioflow-db --region=southamerica-east1

# Testar conexão
gcloud sql connect fisioflow-db --user=postgres --region=southamerica-east1
```

**Soluções**:
1. Verifique se o IP está autorizado
2. Verifique se a instância está em estado `RUNNABLE`
3. Confirme as secrets (`DB_HOST_IP_PUBLIC`, `DB_PASS`)

### Erro: "password authentication failed"

**Sintoma**: `FATAL: password authentication failed for user`

**Solução**:
```bash
# Resetar senha do PostgreSQL
gcloud sql users set-password postgres \
  --instance=fisioflow-db \
  --region=southamerica-east1 \
  --prompt-for-password

# Atualizar secret
echo "new_password" | gcloud secrets versions add DB_PASS --data-file=-
```

### Conexões esgotadas

**Sintoma**: `sorry, too many clients already`

**Diagnóstico**:
```sql
-- Ver conexões ativas
SELECT count(*), state FROM pg_stat_activity GROUP BY state;

-- Ver configuração
SHOW max_connections;
```

**Solução**:
```typescript
// Ajustar pool configuration
const pool = new Pool({
  max: 20,                  // reduzir se necessário
  idleTimeoutMillis: 30000,  // fechar conexões ociosas
  connectionTimeoutMillis: 10000,
});

// Ou aumentar limite no Cloud SQL
gcloud sql instances patch fisioflow-db \
  --region=southamerica-east1 \
  --database-flags "max-connections=200"
```

### Query lenta

**Diagnóstico**:
```sql
-- Ver queries ativas
SELECT pid, now() - query_start as duration, query
FROM pg_stat_activity
WHERE state = 'active'
ORDER BY duration DESC;

-- Analisar query específica
EXPLAIN ANALYZE SELECT ...;
```

**Solução**:
```sql
-- Adicionar índice
CREATE INDEX idx_patients_org_status
ON patients(organization_id, status) WHERE is_active = true;

-- Analizar tabelas
ANALYZE patients;
VACUUM ANALYZE patients;
```

---

## Firebase Auth

### Token expirado

**Sintoma**: `auth/id-token-expired`

**Solução**:
```typescript
// Forçar refresh do token
import { getAuth } from 'firebase/auth';

const auth = getAuth();
const user = auth.currentUser;
if (user) {
  const token = await user.getIdToken(true);  // forceRefresh
}
```

### Custom claims não atualizados

**Sintoma**: Token não contém `role` ou `organization_id`

**Solução**:
```typescript
// Via Cloud Function (admin)
await admin.auth().setCustomUserClaims(uid, {
  role: 'admin',
  organization_id: 'org-xxx'
});

// Forçar refresh no cliente
await user.getIdToken(true);
```

### MFA não funciona

**Sintoma**: Erro ao configurar MFA

**Solução**:
```typescript
// Verificar se MFA está habilitado no projeto
const auth = getAuth();
const multiFactorResolver = getMultiFactorResolver(error);

// Requisitar segundo fator
const hint = multiFactorResolver.hints[0];
if (hint.factorId === TOTP_FACTOR_ID) {
  // ... implementação TOTP
}
```

---

## Firestore

### Erro: "Missing or insufficient permissions"

**Sintoma**: Cliente não consegue ler/gravar

**Diagnóstico**:
```bash
# Ver security rules
firebase firestore:rules .firestore.rules
```

**Solução**:
```javascript
// Verificar regras no firestore.rules
// Exemplo para pacientes:
match /patients/{patientId} {
  allow read: if isProfessional() ||
                 (isPatient() && isOwner('userId'));
  allow create: if isProfessional();
}
```

### Documento muito grande

**Sintoma**: Erro ao salvar documento grande

**Limite**: 1MB por documento

**Solução**:
```typescript
// Dividir em subcoleções
// Ao invés de um documento grande:
patients/{patientId}/records/{recordId}

// Ou usar Storage para dados grandes
const bucket = getStorage().bucket();
const file = bucket.file(`patients/${patientId}/large-data.json`);
```

### Index composto faltando

**Sintoma**: `The query requires an index`

**Solução**:
```bash
# Criar índice via CLI
firebase firestore:indexes firestore.indexes.json

# Ou via Console
# https://console.firebase.google.com/project/fisioflow-migration/firestore/indexes
```

---

## Storage

### Erro CORS

**Sintoma**: Browser bloqueia upload

**Solução**:
```typescript
// Configurar CORS
const storage = getStorage();
const bucket = storage.bucket();

await bucket.cors.set([{
  origin: ['https://moocafisio.com.br', 'http://localhost:5173'],
  responseHeader: ['Content-Type', 'Authorization'],
  method: ['GET', 'POST', 'PUT', 'DELETE'],
  maxAgeSeconds: 3600
}]);
```

### Arquivo não encontrado

**Sintoma**: 404 ao baixar arquivo

**Diagnóstico**:
```bash
# Ver se arquivo existe
gsutil ls gs://fisioflow-migration.appspot.com/path/to/file
```

**Solução**:
```typescript
// Verificar caminho correto
const path = `patients/${patientId}/documents/${documentId}/${filename}`;

// Ou listar arquivos do paciente
const [files] = await storage.bucket().getFiles({
  prefix: `patients/${patientId}/`
});
```

---

## Integrações

### WhatsApp não envia

**Sintoma**: Mensagens não chegam

**Diagnóstico**:
```bash
# Ver logs da função
firebase functions:log --only sendWhatsAppAppointmentConfirmation

# Testar manualmente
firebase functions:shell
> call('testWhatsAppMessage', { phone: '5511999999999' })
```

**Soluções**:
1. Verifique se `WHATSAPP_ACCESS_TOKEN` está correto
2. Verifique se o template foi aprovado pelo Meta
3. Confirme se o número está formatado corretamente (55DDDDDDDDD)

### Stripe webhook falha

**Sintoma**: Webhook retorna erro

**Diagnóstico**:
```typescript
// Verificar assinatura
import crypto from 'crypto';

const signature = crypto
  .createHmac('sha256', webhookSecret)
  .update(rawBody)
  .digest('hex');

if (signature !== request.headers['stripe-signature']) {
  throw new Error('Invalid signature');
}
```

### Ably desconectado

**Sintoma**: Atualizações em tempo real não funcionam

**Solução**:
```typescript
// Verificar API key
const ably = new Ably.Rest(process.env.ABLY_API_KEY);

// Testar conexão
ably.connection.on('connected', () => {
  console.log('Ably connected');
});

ably.connection.on('failed', (error) => {
  console.error('Ably failed:', error);
});
```

### Gemini AI rate limit

**Sintoma**: `resource-exhausted` na AI

**Solução**:
```typescript
// Implementar fila com retry
import { Firestore } from '@google-cloud/firestore';

const queue = new Firestore().collection('ai_queue');

// Adicionar job
await queue.add({
  type: 'exercise_suggestion',
  data: {...},
  retryCount: 0,
  scheduledAt: new Date(),
});

// Processar com cloud function agendada
```

---

## Performance

### Latência alta nas funções

**Diagnóstico**:
```bash
# Ver tempo de execução
gcloud logging read '
  resource.type="cloud_function"
  protoPayload.serviceName="cloudfunctions.googleapis.com"
' --freshness=1h
```

**Soluções**:
1. Implementar cache em memória
2. Usar Firestore para cache de queries frequentes
3. Implementar CDN para assets estáticos

### Frontend lento

**Diagnóstico**:
```bash
# Lighthouse audit
npm run lighthouse
```

**Soluções**:
1. Implementar code splitting
2. Lazy loading de componentes
3. Otimizar imagens (WebP, lazy loading)
4. Usar service worker para cache

### Console e logs em desenvolvimento

O app usa um logger central (`src/lib/errors/logger.ts`) que respeita o nível mínimo em dev.

**Variáveis de ambiente** (ex.: `.env.development`):

- **`VITE_LOG_LEVEL`**: Nível mínimo de log no console em desenvolvimento. Valores: `error`, `warn`, `info`, `debug`. Padrão: `info`. Para console mais limpo use `VITE_LOG_LEVEL=warn` ou `error`; para depuração use `VITE_LOG_LEVEL=debug`.

**LocalStorage** (DevTools → Application → Local Storage):

- **`DEBUG_LONG_TASKS`**: Se definido como `1`, o logger emite avisos de "Long Task Detected" (tarefas > 50 ms no main thread) mesmo quando `VITE_LOG_LEVEL` não é `debug`. Útil para investigar travamentos de UI.

---

## Segurança

### Vulnerabilidade de segurança

**Diagnóstico**:
```bash
# Scan de dependências
npm audit
cd functions && npm audit

# Ver vulnerabilidades
gcloud beta container images list \
  --filter="name~gcr.io/fisioflow-migration/*"
```

**Solução**:
```bash
# Atualizar dependências
npm update
npm audit fix

# Para deps críticas
npm audit fix --force
```

### Dados expostos nos logs

**Sintoma**: Informações sensíveis nos logs

**Solução**:
```typescript
// Não logar dados sensíveis
logger.error('Error:', {
  message: error.message,
  // NÃO incluir: password, token, cpf, etc
});

// Para debug, use campo debug removido depois
logger.error('Error:', {
  message: error.message,
  debug: isDev() ? error.stack : undefined,
});
```

---

## Comandos Úteis

```bash
# Logs em tempo real
firebase functions:log

# Logs específicos
firebase functions:log --only nomeDaFuncao

# Descrever função
gcloud functions describe nomeDaFuncao \
  --region=southamerica-east1 --gen2

# Ver memória/CPU
gcloud functions describe nomeDaFuncao \
  --region=southamerica-east1 \
  --format="value(serviceConfig.resourceSize, serviceConfig.availableMemory)"

# Testar função localmente
firebase functions:shell

# Conectar ao banco
gcloud sql connect fisioflow-db \
  --user=postgres --region=southamerica-east1

# Ver status da instância SQL
gcloud sql instances describe fisioflow-db \
  --region=southamerica-east1

# Listar secrets
gcloud secrets list

# Ver versão de secret
gcloud secrets versions access latest --secret DB_PASS

# Deploy com rollback
git checkout HEAD~1
firebase deploy --only functions
```

---

## Contatos e Suporte

- **Documentação**: /.agent/docs/
- **Firebase Console**: https://console.firebase.google.com/project/fisioflow-migration
- **Cloud Console**: https://console.cloud.google.com/project/fisioflow-migration
- **Issues**: Criar issue no GitHub

---

**Documento atualizado**: Janeiro 2026
