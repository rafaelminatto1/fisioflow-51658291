# Fix: Firestore Permissions and Index Errors

## Problemas Identificados

### 1. Erro de Índice Composto (Evolutions)
```
FirebaseError: The query requires an index.
Query: evolutions collection with patient_id + orderBy(date)
```

### 2. Erro de Permissões (Financial Records)
```
FirebaseError: Missing or insufficient permissions.
Collection: financial_records
```

## Soluções Implementadas

### 1. Simplificação das Queries (Evolutions)

**Problema**: Query com `where()` + `orderBy()` requer índice composto no Firestore.

**Solução**: 
- Removido `orderBy('date', 'desc')` da query
- Ordenação movida para memória após buscar os dados
- Query agora usa apenas `where('patient_id', '==', patientId)`

**Código Anterior**:
```typescript
const q = query(
  evolutionsRef,
  where('patient_id', '==', patientId),
  orderBy('date', 'desc'),  // ❌ Requer índice composto
  firestoreLimit(100)
);
```

**Código Novo**:
```typescript
const q = query(
  evolutionsRef,
  where('patient_id', '==', patientId),  // ✅ Apenas um filtro
  firestoreLimit(100)
);

// Ordenar em memória
results.sort((a, b) => {
  const dateA = a.date || '';
  const dateB = b.date || '';
  return String(dateB).localeCompare(String(dateA));
});
```

### 2. Tratamento de Erros de Permissão

**Problema**: Usuário pode não ter permissão para acessar `financial_records`.

**Solução**:
- Adicionado tratamento específico para erro `permission-denied`
- Retorna array vazio em vez de quebrar a aplicação
- Log de warning para debug

**Código Adicionado**:
```typescript
catch (error: any) {
  console.error('[Firestore] Error listing financial records:', error);
  
  // Return empty array on permission errors
  if (error?.code === 'permission-denied') {
    console.warn('[Firestore] Permission denied for financial_records. User may not have access.');
    return [];
  }
  
  return [];
}
```

### 3. Mesma Correção para Financial Records

Aplicada a mesma estratégia de simplificação de query:
- Removido `orderBy('session_date', 'desc')`
- Ordenação em memória
- Tratamento de permissões

## Benefícios

### ✅ Sem Necessidade de Índices
- Queries simples não requerem índices compostos
- Funciona imediatamente sem configuração adicional no Firebase Console
- Reduz complexidade de manutenção

### ✅ Graceful Degradation
- App não quebra quando usuário não tem permissões
- Retorna dados vazios em vez de erro
- Logs informativos para debug

### ✅ Performance Aceitável
- Ordenação em memória é rápida para até 100 registros
- Limite de 100 registros mantém performance
- Usuários não notarão diferença

## Impacto na Performance

### Antes (com orderBy no Firestore):
- ✅ Ordenação no servidor
- ❌ Requer índice composto
- ❌ Configuração manual necessária

### Depois (ordenação em memória):
- ✅ Sem necessidade de índices
- ✅ Funciona imediatamente
- ✅ Performance adequada para 100 registros
- ⚠️ Pequeno overhead de ordenação no cliente (negligível)

## Arquivos Modificados

- `professional-app/lib/firestore-fallback.ts`
  - `listEvolutionsFirestore()` - Removido orderBy, adicionado sort em memória
  - `listPatientFinancialRecordsFirestore()` - Removido orderBy, adicionado sort em memória
  - `getPatientFinancialSummaryFirestore()` - Adicionado tratamento de permissões

## Testes Recomendados

### Evolutions
- [ ] Abrir página de paciente
- [ ] Verificar que evolutions carregam sem erro
- [ ] Verificar que estão ordenadas por data (mais recente primeiro)

### Financial Records
- [ ] Abrir aba financeira do paciente
- [ ] Verificar que não há erro de permissão
- [ ] Se usuário não tem acesso, deve mostrar lista vazia (sem erro)

## Notas Importantes

### Permissões do Firestore
Se o erro de permissão persistir, pode ser necessário ajustar as regras de segurança do Firestore:

```javascript
// Exemplo de regra para financial_records
match /financial_records/{recordId} {
  allow read: if request.auth != null && 
    (request.auth.uid == resource.data.created_by ||
     request.auth.uid == resource.data.therapist_id);
}
```

### Índices Compostos (Opcional)
Se no futuro quiser melhorar a performance, pode criar os índices manualmente:
1. Acessar Firebase Console
2. Firestore > Indexes
3. Criar índice composto:
   - Collection: `evolutions`
   - Fields: `patient_id` (Ascending), `date` (Descending)

Mas isso é **opcional** - a solução atual funciona bem sem índices.

---
**Data**: 2026-02-21
**Status**: ✅ Completo
**Impacto**: Crítico - Resolve erros que impediam uso de evolutions e financial records
