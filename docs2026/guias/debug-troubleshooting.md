# Debug e Troubleshooting

## Problemas Comuns

### Erro: "Module not found"

**Solução:**
```bash
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Erro: "Failed to fetch"

**Causa:** Problema de CORS ou credenciais Supabase

**Solução:**
1. Verifique `.env`
2. Verifique RLS policies
3. Verifique se Supabase está rodando

### Erro: "Invalid JWT"

**Causa:** Token expirado ou inválido

**Solução:**
```typescript
// Adicionar refresh automático
const { data: { session } } = await supabase.auth.getSession();
if (!session) {
  await supabase.auth.refreshSession();
}
```

### Performance: Build lenta

**Solução:**
```bash
# Aumentar memória
NODE_OPTIONS='--max-old-space-size=4096' pnpm build
```

### Deploy falhando

**Causa:** Variáveis de ambiente faltando

**Solução:**
```bash
# Verificar no Vercel Dashboard
vercel env ls
```

## Debugging no Browser

### React DevTools

```tsx
// Adicionar nome para debug
const PatientForm = function PatientForm() {
  // ...
};
```

### Console Logs Estruturados

```typescript
// Ao invés de:
console.log(patient);

// Use:
console.log('Patient:', { id: patient.id, name: patient.name });
console.table([patient1, patient2, patient3]);
```

### Network Tab

Monitore:
- Requisições Supabase
- Tempo de resposta
- Status codes

## Debugging Supabase

### Ver Queries

```sql
-- No SQL Editor do Supabase
SELECT * FROM patients LIMIT 10;
```

### Ver RLS Policies

```sql
-- Ver policies de uma tabela
SELECT * FROM pg_policies WHERE tablename = 'patients';
```

### Testar Auth

```typescript
// Verificar user atual
const { data: { user } } = await supabase.auth.getUser();
console.log('User:', user);
```

## Debugging Edge Functions

### Logs

```typescript
// supabase/functions/meu-func/index.ts
console.log('Request:', req.method, req.url);
```

### Testar Localmente

```bash
supabase functions serve meu-func
```

## Debugging Testes

### Vitest (Unitários)

```bash
# Com UI interativa
pnpm test:ui

# Modo watch
pnpm test

# Apenas um arquivo
pnpm test paciente.test
```

### Playwright (E2E)

```bash
# Com UI
pnpm test:e2e:ui

# Apenas um teste
pnpm test:e2e tests/login.spec.ts

# Modo debug
pnpm test:e2e --debug
```

## Performance Issues

### Lighthouse

```bash
# Instalar
pnpm add -D lighthouse

# Rodar
npx lighthouse http://localhost:8080 --view
```

### Bundle Analyzer

```bash
pnpm build:analyze
```

## Error Tracking (Sentry)

Erros são automaticamente reportados ao Sentry.

Ver em: [sentry.io](https://sentry.io)

## Recursos de Suporte

- [GitHub Issues](https://github.com/fisioflow/fisioflow/issues)
- [Discord](https://discord.gg/fisioflow)
- [Email](mailto:suporte@fisioflow.com)
