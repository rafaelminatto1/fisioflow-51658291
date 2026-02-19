# 🎯 Checklist Manual de Performance - Página de Evolução do Paciente

## 1️⃣ Preparação

1. Abra o navegador Chrome ou Edge
2. Acesse: **http://localhost:5174**
3. Faça login no sistema
4. Abra o DevTools (F12)
5. Vá para a aba **Console**

## 2️⃣ Verificações Automáticas (Console)

Ao navegar para uma página de evolução do paciente, você deve ver no console:

### ✅ Métricas de Performance Esperadas:

```
🎯 Performance Metrics:
   - LCP (Largest Contentful Paint): < 2.5s
   - FID (First Input Delay): < 100ms
   - CLS (Cumulative Layout Shift): < 0.1
   - FCP (First Contentful Paint): < 1.8s
   - TTFB (Time to First Byte): < 600ms
```

### ✅ Informações de Carregamento:

```
📊 Query Performance:
   - Cache hits: XX%
   - Query duration: XXms
   - Queries executed: X
```

### ⚠️ Avisos de Performance (Dev Mode):

Se houver problemas, você verá avisos como:
```
⚠️ Slow render detected: ComponentName took XXms
⚠️ Excessive re-renders: ComponentName rendered XX times
⚠️ Large state update: XXkb
```

## 3️⃣ Teste de Skeleton Loaders

1. **Recarregue a página** (Ctrl+R)
2. **Observe rapidamente** - você deve ver:
   - ✅ Skeleton do cabeçalho (linhas animadas cinzas)
   - ✅ Skeleton do editor SOAP
   - ✅ Skeleton dos gráficos
   - ✅ Skeleton das listas
3. **Transição suave** - os skeletons devem desaparecer suavemente quando o conteúdo carregar

## 4️⃣ Teste de Troca de Abas

1. **Clique em cada aba** (Evolução, Avaliação, Tratamento, Histórico, Assistente)
2. **Observe**:
   - ✅ Troca deve ser **instantânea** (< 100ms)
   - ✅ Primeira vez em cada aba pode mostrar skeleton loader
   - ✅ Voltar para aba já visitada deve ser instantâneo (dados em cache)
3. **Verifique no console** - deve mostrar:
   ```
   🔄 Tab switched to: [nome-da-aba]
   ⚡ Data loaded from cache
   ```

## 5️⃣ Teste de Rede Lenta

1. Abra DevTools → **Network** tab
2. Selecione **Slow 3G** no dropdown de throttling
3. Recarregue a página (Ctrl+R)
4. **Observe**:
   - ✅ Skeleton loaders aparecem imediatamente
   - ✅ Conteúdo crítico (cabeçalho, paciente) carrega primeiro
   - ✅ Abas não visitadas não carregam dados
   - ✅ Página permanece responsiva durante carregamento

## 6️⃣ Teste de Performance do Editor SOAP

1. Vá para a aba **Evolução**
2. **Digite no editor SOAP** (campo de texto)
3. **Observe**:
   - ✅ Digitação deve ser fluida (sem lag)
   - ✅ Auto-save deve acontecer após 5 segundos de inatividade
   - ✅ Console deve mostrar: `💾 Auto-saving SOAP draft...`

## 7️⃣ Análise de Bundle Size

1. Abra DevTools → **Network** tab
2. Recarregue a página (Ctrl+R)
3. Filtre por **JS**
4. **Verifique**:
   - ✅ Chunk principal: < 300KB (gzipped)
   - ✅ Chunks de abas: < 200KB cada (gzipped)
   - ✅ Chunks carregam sob demanda (lazy loading)

## 8️⃣ Teste de Virtualização de Listas

1. Vá para a aba **Histórico**
2. Se houver mais de 20 itens na lista:
   - ✅ Apenas itens visíveis devem estar no DOM
   - ✅ Scroll deve ser suave
   - ✅ Inspecione o DOM - deve ter menos elementos que o total de itens

## 9️⃣ Lighthouse Performance Score

1. Abra DevTools → **Lighthouse** tab
2. Selecione:
   - ✅ Performance
   - ✅ Desktop ou Mobile
3. Clique em **Analyze page load**
4. **Meta**: Score > 90

## 🎯 Resultados Esperados

### Antes da Otimização:
- ⏱️ Tempo de carregamento: 4-6 segundos
- 📦 Bundle size: > 500KB
- 🐌 Troca de abas: 200-500ms
- 📊 Lighthouse Score: 60-70

### Depois da Otimização:
- ⚡ Tempo de carregamento: < 2 segundos
- 📦 Bundle size: < 300KB (principal)
- 🚀 Troca de abas: < 100ms
- 📊 Lighthouse Score: > 90

## 📝 Checklist de Verificação

- [ ] Console mostra métricas de Core Web Vitals
- [ ] Skeleton loaders aparecem durante carregamento
- [ ] Troca de abas é instantânea
- [ ] Editor SOAP é responsivo (sem lag)
- [ ] Auto-save funciona após 5 segundos
- [ ] Rede lenta não trava a interface
- [ ] Listas longas usam virtualização
- [ ] Bundle size está dentro dos limites
- [ ] Lighthouse Score > 90
- [ ] Sem avisos de performance no console (ou poucos)

## 🐛 Problemas Comuns

### Skeleton não aparece:
- Verifique se está em modo desenvolvimento
- Limpe o cache do navegador (Ctrl+Shift+Delete)

### Métricas não aparecem no console:
- Verifique se `initPerformanceMonitoring()` está sendo chamado em `main.tsx`
- Abra o console antes de navegar para a página

### Troca de abas lenta:
- Verifique a aba Network - pode haver queries desnecessárias
- Verifique se o prefetch está funcionando

### Editor SOAP com lag:
- Verifique se há re-renders excessivos no console
- Verifique se o debounce de 5s está ativo

## 📞 Suporte

Se encontrar problemas, documente:
1. Screenshot do console
2. Screenshot da aba Network
3. Lighthouse report
4. Descrição do comportamento esperado vs atual
