# 🧪 Como Testar as Otimizações da Agenda

## 📋 Checklist de Testes

### ✅ 1. Teste de Carregamento Inicial

**O que testar**: Carregamento mais rápido da página

**Como testar**:
1. Abra o DevTools (F12)
2. Vá para a aba **Network**
3. Marque "Disable cache"
4. Recarregue a página (Ctrl+Shift+R)
5. Observe:
   - ✅ Skeleton aparece imediatamente
   - ✅ Query com `dateFrom` e `dateTo` (não carrega todos os dados)
   - ✅ Resposta menor (~150KB ao invés de ~500KB)
   - ✅ Página carrega em < 2s

**Resultado esperado**: Carregamento 60-70% mais rápido

---

### ✅ 2. Teste de Navegação entre Períodos

**O que testar**: Navegação instantânea (dados já em cache)

**Como testar**:
1. Na agenda, clique em "Próximo" (seta direita)
2. Observe no Network:
   - ✅ Nova query para próximo período
3. Clique em "Anterior" (seta esquerda) duas vezes
4. Observe no Network:
   - ✅ **SEM nova query** (usa cache!)
5. Navegue entre dia/semana/mês
6. Observe:
   - ✅ Transição suave
   - ✅ Skeleton aparece brevemente
   - ✅ Dados carregam rapidamente

**Resultado esperado**: Navegação instantânea quando dados estão em cache

---

### ✅ 3. Teste de Prefetch

**O que testar**: Prefetch automático de períodos adjacentes

**Como testar**:
1. Carregue a agenda
2. Aguarde 1 segundo
3. Observe no Network:
   - ✅ Queries automáticas para próximo e anterior período
   - ✅ Queries marcadas como "prefetch" ou aparecem após delay
4. Clique em "Próximo"
5. Observe:
   - ✅ Dados aparecem instantaneamente (já estavam em cache)

**Resultado esperado**: Prefetch silencioso após 500ms

---

### ✅ 4. Teste de Filtros

**O que testar**: Filtros aplicados rapidamente (< 200ms)

**Como testar**:
1. Na agenda, abra os filtros
2. Selecione um status (ex: "Confirmado")
3. Observe:
   - ✅ Filtro aplicado em < 200ms
   - ✅ Nova query no Network com filtro
4. Digite nome de paciente na busca
5. Observe:
   - ✅ Busca com debounce (aguarda 300ms antes de buscar)
   - ✅ Query apenas após parar de digitar
6. Limpe os filtros
7. Observe:
   - ✅ Restauração instantânea (usa cache)
   - ✅ **SEM nova query**

**Resultado esperado**: Filtros < 200ms, busca com debounce, restauração instantânea

---

### ✅ 5. Teste de Mutações (Criar/Editar/Deletar)

**O que testar**: Invalidação seletiva de cache

**Como testar**:
1. Crie um novo agendamento para hoje
2. Observe no Network:
   - ✅ Apenas períodos afetados são refetchados
   - ✅ Não invalida cache de outros meses
3. Navegue para outro mês
4. Observe:
   - ✅ Dados aparecem instantaneamente (cache preservado)
5. Volte para o mês atual
6. Observe:
   - ✅ Novo agendamento aparece

**Resultado esperado**: 80-90% menos refetches desnecessários

---

### ✅ 6. Teste de Lazy Loading

**O que testar**: Modais carregam apenas quando necessário

**Como testar**:
1. Abra o DevTools (F12)
2. Vá para a aba **Network**
3. Filtre por "JS"
4. Recarregue a página
5. Observe:
   - ✅ Chunks de modais **NÃO** são carregados inicialmente
6. Clique em "Novo Agendamento"
7. Observe:
   - ✅ Chunk do AppointmentModal é carregado agora
   - ✅ Modal aparece rapidamente
8. Feche e abra novamente
9. Observe:
   - ✅ Chunk não é carregado novamente (já está em cache)

**Resultado esperado**: Bundle inicial ~30% menor

---

### ✅ 7. Teste de Skeleton Loaders

**O que testar**: Feedback visual durante carregamento

**Como testar**:
1. Recarregue a página
2. Observe:
   - ✅ Skeleton do calendário aparece imediatamente
   - ✅ Estrutura corresponde ao calendário final
   - ✅ Animação shimmer suave
3. Troque de visualização (dia/semana/mês)
4. Observe:
   - ✅ Skeleton adapta à visualização
   - ✅ Transição suave para conteúdo real

**Resultado esperado**: Feedback visual profissional

---

### ✅ 8. Teste de Performance Geral

**O que testar**: Métricas de performance

**Como testar**:
1. Abra o DevTools (F12)
2. Vá para a aba **Performance**
3. Clique em "Record" (círculo)
4. Recarregue a página
5. Aguarde carregamento completo
6. Pare a gravação
7. Observe:
   - ✅ LCP (Largest Contentful Paint) < 1.5s
   - ✅ FCP (First Contentful Paint) < 1s
   - ✅ TTI (Time to Interactive) < 2s

**Resultado esperado**: Métricas dentro das metas

---

## 🔍 Testes Avançados

### Teste de Conexão Lenta

1. DevTools → Network → Throttling → "Slow 3G"
2. Recarregue a página
3. Observe:
   - ✅ Prefetch **NÃO** acontece (network-aware)
   - ✅ Página ainda carrega dados do período atual
   - ✅ Skeleton aparece durante carregamento

### Teste de Cache

1. Carregue a agenda (semana atual)
2. Navegue para próxima semana
3. Navegue para semana seguinte
4. Volte para semana atual
5. Observe:
   - ✅ Dados aparecem instantaneamente (cache de 5-10 min)
6. Aguarde 6 minutos
7. Volte para semana atual
8. Observe:
   - ✅ Refetch automático (cache expirou)

### Teste de Múltiplos Filtros

1. Aplique filtro de status
2. Aplique filtro de tipo
3. Aplique filtro de terapeuta
4. Digite nome de paciente
5. Observe:
   - ✅ Cada filtro tem cache separado
   - ✅ Combinações de filtros funcionam corretamente
6. Limpe todos os filtros
7. Observe:
   - ✅ Restauração instantânea para cache base

---

## 📊 Métricas Esperadas

| Métrica | Antes | Depois | Como Medir |
|---------|-------|--------|------------|
| **Dados Transferidos** | ~500KB | ~150KB | Network tab → Size |
| **Tempo de Carregamento** | 2-5s | 0.5-1.5s | Performance tab → Load |
| **LCP** | 3-5s | < 1.5s | Lighthouse |
| **Navegação** | 500ms+ | Instantâneo | Observação visual |
| **Filtros** | 1s+ | < 200ms | Observação visual |
| **Bundle Inicial** | ? | -30% | Network tab → JS size |

---

## 🐛 Problemas Conhecidos

### Nenhum problema conhecido no momento

Todas as otimizações implementadas são:
- ✅ Compatíveis com funcionalidade existente
- ✅ Testadas localmente
- ✅ Sem erros de compilação
- ✅ Sem quebra de funcionalidades

---

## 📝 Notas

- **Cache**: Dados ficam em cache por 5-10 minutos
- **Prefetch**: Acontece após 500ms de inatividade
- **Network-aware**: Prefetch desabilitado em 3G/2G
- **Lazy loading**: Modais carregam apenas quando abertos
- **Skeleton**: Aparece durante lazy loading e carregamento de dados

---

## ✅ Checklist Final

Antes de considerar os testes completos, verifique:

- [ ] Carregamento inicial < 2s
- [ ] Navegação entre períodos instantânea (quando em cache)
- [ ] Prefetch automático funcionando
- [ ] Filtros aplicados em < 200ms
- [ ] Busca de paciente com debounce (300ms)
- [ ] Invalidação seletiva de cache (não invalida tudo)
- [ ] Lazy loading de modais funcionando
- [ ] Skeleton loaders aparecem durante carregamento
- [ ] Sem erros no console
- [ ] Todas as funcionalidades existentes funcionando

---

## 🎉 Conclusão

Se todos os testes passarem, as otimizações estão funcionando corretamente! 

A página de agendamentos deve estar **60-70% mais rápida**, com **navegação instantânea** entre períodos e **filtros otimizados**.
