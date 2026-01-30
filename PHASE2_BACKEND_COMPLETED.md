# FisioFlow - FASE 2: Backend Finalização (IMPLEMENTADA)

## Data: 2025-01-29

## Resumo das Mudanças Implementadas

Esta documentação descreve as mudanças de backend implementadas na FASE 2 do plano de refatoração.

---

## 1. patient-stats.ts - Validação e Error Handling

### Arquivo: `functions/src/api/patient-stats.ts`

### Mudanças Implementadas:

#### 1.1 Zod Schema Validation
Adicionado schema Zod para validação de entrada:

```typescript
const GetPatientStatsSchema = z.object({
  patientId: z.string().optional(),
  period: z.enum(['7d', '30d', '90d', 'all']).default('30d'),
});
```

#### 1.2 Melhorias na Documentação JSDoc
Adicionada documentação completa:
- Descrição detalhada da função
- Exemplos de uso
- Parâmetros documentados
- Exceções documentadas
- Retorno tipado

#### 1.3 Melhorias no Error Handling
- Validação de schema com erro detalhado
- Verificação de autorização (usuários só podem ver próprias stats)
- Tratamento de erros mais robusto
- Logging aprimorado

#### 1.4 Código Antes/Depois

**Antes:**
```typescript
const { patientId, period = '30d' } = request.data;
// Sem validação
// Sem verificação de permissão
```

**Depois:**
```typescript
const validationResult = GetPatientStatsSchema.safeParse(request.data);
if (!validationResult.success) {
  throw new HttpsError('invalid-argument', `Parâmetros inválidos: ...`);
}

// Verificação de permissão
if (patientId && patientId !== authContext.userId) {
  const isProfessional = ['admin', 'fisioterapeuta', 'estagiario'].includes(authContext.role || '');
  if (!isProfessional) {
    throw new HttpsError('permission-denied', '...');
  }
}
```

---

## 2. Sistema de Migrations

### Novos Arquivos Criados:

#### 2.1 `functions/src/lib/migrations/types.ts`
Define tipos para o sistema de migrations:
- `Migration` - Interface para migrations
- `MigrationStatus` - Status (pending, running, completed, failed, rolled_back)
- `DatabaseType` - PostgreSQL ou Firestore
- `MigrationRecord` - Registro no banco
- `MigrationResult` - Resultado da execução
- `MigrationSummary` - Resumo da execução

#### 2.2 `functions/src/lib/migrations/runner.ts`
Implementa o executor de migrations:
- `runMigrations()` - Executa migrations pendentes
- `rollbackMigration()` - Rollback de migration
- `getMigrationStatus()` - Status das migrations
- `registerMigration()` - Registra nova migration
- `createMigrationTemplate()` - Gera template

#### 2.3 `functions/src/lib/migrations/index.ts`
Exporta todas as funcionalidades do sistema.

### Funcionalidades:

#### Executar Migrations
```typescript
import { runMigrations } from './lib/migrations';

const summary = await runMigrations();
console.log(`Executed ${summary.executed} migrations`);
```

#### Rollback
```typescript
import { rollbackMigration } from './lib/migrations';

await rollbackMigration(); // Rollback última migration
await rollbackMigration('001_add_users'); // Migration específica
```

#### Criar Nova Migration
```typescript
import { registerMigration, DatabaseType } from './lib/migrations';

registerMigration({
  id: '002_add_indexes',
  name: 'Add performance indexes',
  database: DatabaseType.POSTGRESQL,
  up: `CREATE INDEX idx_patients_name ON patients(name);`,
  down: `DROP INDEX idx_patients_name;`,
});
```

### Tabela de Tracking
O sistema cria automaticamente a tabela `schema_migrations`:
```sql
CREATE TABLE schema_migrations (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(500) NOT NULL,
  database VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  error_message TEXT,
  checksum VARCHAR(64),
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);
```

---

## 3. API Key Authentication Middleware

### Arquivo: `functions/src/middleware/api-key.ts`

### Funcionalidades Implementadas:

#### 3.1 Scopes de Permissão
```typescript
enum ApiKeyScope {
  FULL = 'full',
  PATIENTS_READ = 'patients:read',
  PATIENTS_WRITE = 'patients:write',
  APPOINTMENTS_READ = 'appointments:read',
  APPOINTMENTS_WRITE = 'appointments:write',
  WEBHOOKS = 'webhooks',
  REPORTS = 'reports:read',
  FINANCIAL_READ = 'financial:read',
  FINANCIAL_WRITE = 'financial:write',
}
```

#### 3.2 Autenticação
```typescript
export async function authenticateApiKey(request): Promise<ApiKeyContext>
```

Extrai API key de headers:
- `X-API-Key: {key}`
- `Authorization: Bearer {key}`

#### 3.3 Verificação de Scopes
```typescript
// Requer scope específico
requireApiKeyScope(context, ApiKeyScope.PATIENTS_READ);

// Requer qualquer um dos scopes
requireAnyApiKeyScope(context, [
  ApiKeyScope.PATIENTS_READ,
  ApiKeyScope.FULL
]);
```

#### 3.4 Gestão de API Keys
```typescript
// Criar nova key
const { key, record } = await createApiKey({
  name: 'Production Integration',
  organizationId: 'org-123',
  scopes: [ApiKeyScope.PATIENTS_READ, ApiKeyScope.APPOINTMENTS_WRITE],
  createdBy: 'user-123',
  rateLimit: 1000,
});

// Listar keys
const keys = await listApiKeys('org-123');

// Revogar key
await revokeApiKey('key-id-123');

// Rotacionar key
const { key: newKey } = await rotateApiKey('old-key-id', 'admin-user');
```

#### 3.5 Tabela de API Keys
```sql
CREATE TABLE api_keys (
  id UUID PRIMARY KEY,
  key_hash VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  organization_id VARCHAR(255) NOT NULL,
  scopes TEXT[] NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  rate_limit INTEGER DEFAULT 1000,
  last_used_at TIMESTAMP,
  expires_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL,
  created_by VARCHAR(255) NOT NULL,
  metadata JSONB DEFAULT '{}',
  FOREIGN KEY (organization_id) REFERENCES organizations(id)
);
```

### Exemplo de Uso em Cloud Function
```typescript
export const externalIntegration = onCall(async (request) => {
  // Autenticar com API key
  const apiKeyCtx = await authenticateApiKey(request);

  // Verificar permissão
  requireApiKeyScope(apiKeyCtx, ApiKeyScope.PATIENTS_READ);

  // Usar organizationId da API key
  const patients = await getPatients(apiKeyCtx.organizationId);

  return { data: patients };
});
```

---

## 4. Rate Limiting Middleware (Já Existia)

### Arquivo: `functions/src/middleware/rate-limit.ts`

Este middleware já estava completo e funcional. Possui:
- Rate limiting por usuário
- Rate limiting por IP
- PostgreSQL-backed counters
- Cleanup automático de registros expirados
- Fail-open em caso de erro

**Status:** ✅ JÁ IMPLEMENTADO (sem mudanças necessárias)

---

## 5. WhatsApp Service (Já Estava Documentado)

### Arquivo: `functions/src/communications/whatsapp.ts`

Este serviço já possuía documentação JSDoc adequada. Possui:
- Templates de WhatsApp documentados
- Funções com JSDoc completo
- Exemplos de uso nos testes
- Error handling implementado

**Status:** ✅ JÁ DOCUMENTADO (sem mudanças necessárias)

---

## Scripts de Package.json Recomendados

Adicionar ao `functions/package.json`:

```json
{
  "scripts": {
    "migration:run": "node -r ts-node/register functions/src/lib/migrations/runner.ts run",
    "migration:rollback": "node -r ts-node/register functions/src/lib/migrations/runner.ts rollback",
    "migration:status": "node -r ts-node/register functions/src/lib/migrations/runner.ts status",
    "migration:create": "node -r ts-node/register functions/scripts/create-migration.ts"
  }
}
```

---

## Próximos Passos

### Tarefas Pendentes da FASE 1:

**Task #1: Revogar API Keys Expostas** - AÇÃO MANUAL NECESSÁRIA

Arquivo: `.env`

Instruções detalhadas em `PHASE1_SECURITY_COMPLETED.md`

---

## Verificação de Deploy

Antes de fazer deploy para produção, verificar:

- [ ] patient-stats.ts com validação Zod
- [ ] Sistema de migrations configurado
- [ ] Tabela `schema_migrations` criada
- [ ] API key middleware implementado
- [ ] Tabela `api_keys` criada
- [ ] Rate limit ativo (já estava funcionando)
- [ ] Testes manuais executados

---

## Breaking Changes

### Potenciais Impactos:

1. **patient-stats.ts:**
   - Parâmetros agora são validados estritamente
   - Usuários sem permissão não podem mais ver stats de outros pacientes
   - Pode quebrar integrações que enviavam parâmetros inválidos

2. **API Keys:**
   - Novo middleware pode afetar endpoints que usam API key
   - Necessário configurar scopes corretamente

3. **Migrations:**
   - Primeira execução criará tabelas de tracking
   - Pode aumentar tempo de inicialização

### Mitigações:

- Testar todas as funcionalidades após deploy
- Comunicar mudanças aos consumidores da API
- Implementar graceful migration

---

## Referências

- Plano completo: `REFACTORING_PLAN.md`
- FASE 1 (Segurança): `PHASE1_SECURITY_COMPLETED.md`
- Firestore Security Rules: https://firebase.google.com/docs/firestore/security/rules-structure
- Zod Validation: https://zod.dev/
