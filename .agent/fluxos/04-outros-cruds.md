# RELATÓRIO: OUTROS CRUDS

## DATA: 2025-02-01

## PROTOCOLOS

### Arquivos Analisados
| Arquivo | Status |
|---------|--------|
| `src/pages/Protocols.tsx` | ✅ Migrado para Firebase |
| `src/components/protocols/ProtocolCardEnhanced.tsx` | ⚠️ #004, #010 |
| `src/components/protocols/ProtocolDetailView.tsx` | ⚠️ Migração pendente |

### Funcionalidades
- ✅ Listar protocolos (grid/list)
- ✅ Criar protocolos
- ✅ Editar protocolos
- ✅ Deletar protocolos
- ✅ Filtros por categoria e músculo
- ✅ Sistema de favoritos
- ✅ Duplicação de protocolos

### Problemas
**#004 - asChild + onClick incorreto** (Ver relatório consolidado)

**#010 - Migração Supabase em ProtocolDetailView**:
```tsx
// Ainda usando Supabase diretamente
const { data, error } = await supabase
  .from('clinical_test_templates')
  .select('id, name, target_joint, category')
  .in('id', testIds);
```

---

## PLANOS DE EXERCÍCIOS

### Arquivos Analisados
| Arquivo | Status |
|---------|--------|
| `src/components/exercises/ExerciseLibrary.tsx` | ✅ OK |
| `src/components/exercises/ExerciseFiltersPanel.tsx` | ✅ OK |
| `src/hooks/useExerciseProtocols.ts` | ⚠️ Otimização sugerida |

### Funcionalidades
- ✅ Listar exercícios
- ✅ Criar exercícios
- ✅ Editar exercícios
- ✅ Filtros avançados
- ✅ Sistema de categorias

### Problemas
- Otimização de cache: gcTime de 24h pode ser muito longo

---

## FINANCEIRO

### Arquivos Analisados
| Arquivo | Status |
|---------|--------|
| `functions/src/api/financial.ts` | ✅ OK |
| `functions/src/api/payments.ts` | ✅ OK |
| `src/pages/Vouchers.tsx` | ✅ Migrado |

### Funcionalidades
- ✅ CRUD de transações
- ✅ Relatórios financeiros
- ✅ Integração Stripe
- ✅ Gestão de vouchers

### Problemas
- Validação de saldo negativo pendente
- Falta controle de transações atômicas

---

## USUÁRIOS

### Arquivos Analisados
| Arquivo | Status |
|---------|--------|
| `src/pages/UserManagement.tsx` | ✅ OK |
| `functions/src/api/users.ts` | ✅ OK |
| `functions/src/api/profile.ts` | ✅ OK |

### Funcionalidades
- ✅ Listagem de usuários
- ✅ Atualização de funções (admin)
- ✅ Filtros por busca e função

### Problemas
- Atualização de função não remove permissões antigas
- Falta auditoria de mudanças de permissão

---

## AVALIAÇÕES

### Arquivos Analisados
| Arquivo | Status |
|---------|--------|
| `src/pages/cadastros/EvaluationFormsPage.tsx` | ✅ OK |
| `src/components/evaluation/EvaluationTemplateSelector.tsx` | ✅ OK |

### Funcionalidades
- ✅ Criar formulários de avaliação
- ✅ Editar formulários
- ✅ Templates de avaliação

---

## RESUMO POR CRUD

| CRUD | Criar | Editar | Visualizar | Deletar | Status |
|------|-------|--------|------------|---------|--------|
| Protocolos | ✅ | ✅ | ✅ | ⚠️ | Migr. pendente |
| Exercícios | ✅ | ✅ | ✅ | ✅ | OK |
| Vouchers | ✅ | - | ✅ | - | OK |
| Transações | ✅ | ✅ | ✅ | ✅ | OK |
| Usuários | ✅ | ✅ | ✅ | - | OK |
| Avaliações | ✅ | ✅ | ✅ | ✅ | OK |
