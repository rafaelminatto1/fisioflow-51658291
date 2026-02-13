# Padrões Seguros de Banco de Dados

Este documento contém padrões e anti-padrões para operações de banco de dados que devem ser seguidos para evitar erros em produção.

## 🚨 Erro 409 (Conflict)

O erro HTTP 409 ocorre quando uma operação viola uma restrição de unicidade no banco de dados. Isso geralmente acontece devido a **race conditions** em operações do tipo "check-then-insert".

### Causa Típica

```typescript
// ❌ ANTI-PADRÃO: Suscetível a race condition
const { data: existing } = await supabase
  .from('user_roles')
  .select('role')
  .eq('user_id', userId)
  .maybeSingle();

if (!existing) {
  // Race condition: múltiplas requisições podem chegar aqui simultaneamente
  const { error } = await supabase
    .from('user_roles')
    .insert({ user_id: userId, role: 'paciente' });
  // Erro 409 se outra requisição inseriu o mesmo registro
}
```

### ✅ Padrão Correto: UPSERT com ON CONFLICT

```typescript
// ✅ PADRÃO CORRETO: Upsert ignora duplicatas silenciosamente
const { error } = await supabase
  .from('user_roles')
  .upsert(
    { user_id: userId, role: 'paciente' },
    { onConflict: 'user_id,role', ignoreDuplicates: true }
  );

// Se o registro já existe, o upsert simplesmente ignora sem erro
```

## 📋 Tabelas com Unique Constraints

As seguintes tabelas possuem unique constraints e requerem tratamento especial:

| Tabela | Unique Constraint | Campo para onConflict |
|--------|-------------------|----------------------|
| `user_roles` | `(user_id, role)` | `user_id,role` |
| `profiles` | `user_id` | `user_id` |
| `patients` | Verificar schema | - |
| `appointments` | Verificar schema | - |

## 🧪 Checklist Pre-Deploy

Antes de fazer deploy para produção, execute:

### 1. Teste Local de Race Conditions

```bash
node test-db-constraints.mjs
```

### 2. Verificação Manual

Para cada operação de `insert`, pergunte:

- [ ] A tabela tem unique constraint?
- [ ] Existe possibilidade de race condition?
- [ ] Usei `upsert` com `onConflict`?

### 3. Revisão de Código

```bash
# Buscar inserts que podem ser problemáticos
grep -r "\.from('.*').*\.insert(" src/
```

## 📚 Referência Rápida

### Insert Simples (sem risco de duplicidade)

```typescript
// ✅ OK quando não há unique constraint ou a duplicidade é impossível
await supabase
  .from('audit_logs')
  .insert({ event_type: 'user_login', user_id });
```

### Upsert (com risco de duplicidade)

```typescript
// ✅ Use upsert quando há unique constraint
await supabase
  .from('user_roles')
  .upsert(
    { user_id, role },
    { onConflict: 'user_id,role', ignoreDuplicates: true }
  );
```

### Upsert com Update

```typescript
// ✅ Use upsert sem ignoreDuplicates para atualizar se existir
await supabase
  .from('profiles')
  .upsert(
    { user_id, last_login: new Date().toISOString() },
    { onConflict: 'user_id' }
  );
```

## 🛠️ Ferramentas de Detecção

### 1. Script de Análise Estática

```bash
node test-db-constraints.mjs
```

Este script:
- Lista tabelas com unique constraints
- Busca patterns perigosos no código
- Recomenda correções

### 2. Git Hook (opcional)

Adicione ao `.git/hooks/pre-commit`:

```bash
#!/bin/bash
echo "🔍 Verificando padrões de banco de dados..."
node test-db-constraints.mjs
if [ $? -ne 0 ]; then
  echo "❌ Encontrados problemas potenciais. Revise antes de commit."
  exit 1
fi
```

## 📖 Exemplos Corrigidos

### Exemplo 1: ensureProfile

**Antes (com erro 409):**
```typescript
// ❌ Race condition
const { data: role } = await supabase
  .from('user_roles')
  .select('role')
  .eq('user_id', userId)
  .maybeSingle();

if (!role) {
  await supabase
    .from('user_roles')
    .insert({ user_id: userId, role: 'paciente' });
}
```

**Depois (corrigido):**
```typescript
// ✅ Usa upsert para evitar conflito
await supabase
  .from('user_roles')
  .upsert(
    { user_id: userId, role: 'paciente' },
    { onConflict: 'user_id,role', ignoreDuplicates: true }
  );
```

### Exemplo 2: Adicionar Role

**Antes (com erro 409):**
```typescript
// ❌ Retorna erro 409 se role já existe
const { error } = await supabase
  .from('user_roles')
  .insert({ user_id: userId, role: 'admin' });

if (error && error.code === '23505') {
  // Tratamento de erro necessário
}
```

**Depois (corrigido):**
```typescript
// ✅ Silenciosamente ignora se já existe
const { error } = await supabase
  .from('user_roles')
  .upsert(
    { user_id: userId, role: 'admin' },
    { onConflict: 'user_id,role', ignoreDuplicates: true }
  );

if (!error) {
  toast({ title: 'Função adicionada' });
}
```

## 🔍 Como Identificar o Problema em Produção

### Sintomas

- Erros 409 no console do navegador
- Logs do Supabase mostrando `POST /rest/v1/tabela` com status 409
- Mensagem: "duplicate key value violates unique constraint"

### Diagnóstico

```sql
-- Ver unique constraints de uma tabela
SELECT
  conname AS constraint_name,
  pg_get_constraintdef(c.oid) AS constraint_definition
FROM pg_constraint c
JOIN pg_class cl ON cl.oid = c.conrelid
WHERE cl.relname = 'nome_da_tabela'
AND c.contype = 'u';
```

### Solução Rápida

1. Identifique a tabela e a constraint
2. Encontre o código que faz o insert
3. Substitua `.insert()` por `.upsert()` com `onConflict`

## 📞 Suporte

Se encontrar problemas:
1. Execute `node test-db-constraints.mjs`
2. Consulte este documento
3. Verifique os exemplos acima
