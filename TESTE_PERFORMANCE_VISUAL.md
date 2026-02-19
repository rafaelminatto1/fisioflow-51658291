# 🎯 Guia Visual de Teste de Performance - FisioFlow

## ✅ Status: Servidor Rodando
- **URL**: http://localhost:5174/
- **Status**: ✅ Online e pronto para testes

---

## 📋 PASSO A PASSO PARA TESTAR

### 1️⃣ Abrir a Aplicação

1. Abra o navegador **Chrome** ou **Edge**
2. Acesse: **http://localhost:5174/**
3. Faça login no sistema

### 2️⃣ Abrir DevTools

1. Pressione **F12** ou **Ctrl+Shift+I**
2. Vá para a aba **Console**
3. Deixe o console aberto durante todos os testes

---

## 🔍 O QUE VOCÊ DEVE VER NO CONSOLE

### ✅ Ao Iniciar a Aplicação:

```
🎯 Performance Monitoring Initialized
📊 Core Web Vitals tracking enabled
⚡ Query performance tracking enabled
🔧 Development warnings enabled
```

### ✅ Ao Navegar para Página de Evolução:

```
🎯 Performance Metrics:
   LCP: XXXms (deve ser < 2500ms)
   FID: XXms (deve ser < 100ms)
   CLS: 0.XX (deve ser < 0.1)
   FCP: XXXms (deve ser < 1800ms)
   TTFB: XXXms (deve ser < 600ms)

📊 Query Performance:
   ✅ Cache hit: [nome-da-query]
   ⏱️ Query duration: XXms
   📦 Queries executed: X
```

### ⚠️ Avisos de Performance (se houver problemas):

```
⚠️ Slow render detected: ComponentName took XXms
⚠️ Excessive re-renders: ComponentName rendered XX times
⚠️ Large state update: XXkb
```

---

## 🎨 TESTE 1: Skeleton Loaders

### Como Testar:
1. Navegue para uma página de evolução do paciente
2. **Recarregue a página** (Ctrl+R ou F5)
3. **Observe rapidamente** nos primeiros 500ms

### O Que Você Deve Ver:
- ✅ **Cabeçalho**: Linhas cinzas animadas (skeleton)
- ✅ **Editor SOAP**: Blocos cinzas animados
- ✅ **Gráficos**: Retângulos cinzas animados
- ✅ **Listas**: Linhas cinzas animadas

### Transição:
- ✅ Skeletons devem **desaparecer suavemente** quando o conteúdo carregar
- ✅ **Sem "pulos"** no layout (CLS < 0.1)

### Screenshot Esperado:
```
┌─────────────────────────────────────┐
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  │ ← Skeleton Header
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  │
├─────────────────────────────────────┤
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  │ ← Skeleton SOAP Editor
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  │
└─────────────────────────────────────┘
```

---

## 🔄 TESTE 2: Troca de Abas

### Como Testar:
1. Na página de evolução, clique em cada aba:
   - **Evolução** (SOAP)
   - **Avaliação** (Medições)
   - **Tratamento** (Exercícios)
   - **Histórico** (Timeline)
   - **Assistente** (IA)

### O Que Você Deve Ver no Console:
```
🔄 Tab switched to: evolucao
⚡ Loading tab data...
✅ Tab data loaded in XXms

🔄 Tab switched to: avaliacao
⚡ Data loaded from cache (instant)
```

### Performance Esperada:
- ✅ **Primeira visita à aba**: Pode mostrar skeleton (< 500ms)
- ✅ **Voltar para aba já visitada**: Instantâneo (< 50ms)
- ✅ **Sem travamentos** durante a troca

### Teste de Velocidade:
1. Clique rapidamente entre as abas
2. A interface deve permanecer **responsiva**
3. Não deve haver **lag** ou **congelamento**

---

## 🐌 TESTE 3: Rede Lenta (Slow 3G)

### Como Configurar:
1. DevTools → Aba **Network**
2. No dropdown de throttling (topo), selecione **Slow 3G**
3. Recarregue a página (Ctrl+R)

### O Que Você Deve Ver:
- ✅ **Skeleton loaders aparecem imediatamente** (< 100ms)
- ✅ **Cabeçalho e dados do paciente carregam primeiro** (dados críticos)
- ✅ **Abas não visitadas NÃO carregam dados** (economia de banda)
- ✅ **Interface permanece responsiva** (não trava)

### No Console:
```
📊 Loading strategy: tab-based
⚡ Loading critical data only...
✅ Critical data loaded: patient, appointment
⏳ Tab data will load on demand
```

### Tempo Esperado:
- **Skeleton visível**: < 100ms
- **Dados críticos**: < 2s (mesmo em Slow 3G)
- **Primeira aba**: < 3s
- **Outras abas**: Carregam sob demanda

---

## ⌨️ TESTE 4: Editor SOAP (Responsividade)

### Como Testar:
1. Vá para a aba **Evolução**
2. Clique no editor SOAP (campo de texto)
3. **Digite rapidamente** várias palavras

### O Que Você Deve Ver:
- ✅ **Digitação fluida** (sem lag)
- ✅ **Caracteres aparecem instantaneamente**
- ✅ **Sem atrasos** entre tecla pressionada e caractere na tela

### Auto-Save:
1. Digite algo
2. **Pare de digitar**
3. Aguarde 5 segundos
4. No console deve aparecer:
```
💾 Auto-saving SOAP draft...
✅ SOAP draft saved successfully
```

### Performance Esperada:
- **Input latency**: < 50ms
- **Auto-save delay**: 5 segundos após última tecla
- **Sem re-renders desnecessários**

---

## 📊 TESTE 5: Lighthouse Performance Score

### Como Executar:
1. DevTools → Aba **Lighthouse**
2. Selecione:
   - ✅ **Performance**
   - ✅ **Desktop** (ou Mobile)
3. Clique em **Analyze page load**
4. Aguarde o relatório

### Scores Esperados:

#### 🎯 ANTES da Otimização:
```
Performance: 60-70 ⚠️
LCP: 4-6s ⚠️
FID: 100-300ms ⚠️
CLS: 0.1-0.3 ⚠️
```

#### ✅ DEPOIS da Otimização:
```
Performance: 90-100 ✅
LCP: < 2.5s ✅
FID: < 100ms ✅
CLS: < 0.1 ✅
TTI: < 3s ✅
```

---

## 📦 TESTE 6: Bundle Size

### Como Verificar:
1. DevTools → Aba **Network**
2. Recarregue a página (Ctrl+R)
3. Filtre por **JS** (JavaScript)
4. Ordene por **Size** (tamanho)

### O Que Você Deve Ver:

#### Chunks Principais:
```
✅ index-[hash].js         ~250-300KB (gzipped)
✅ EvolucaoTab-[hash].js   ~50-100KB (lazy)
✅ AvaliacaoTab-[hash].js  ~50-100KB (lazy)
✅ TratamentoTab-[hash].js ~50-100KB (lazy)
✅ HistoricoTab-[hash].js  ~50-100KB (lazy)
✅ AssistenteTab-[hash].js ~50-100KB (lazy)
```

#### Comportamento Esperado:
- ✅ **Chunk principal carrega primeiro**
- ✅ **Chunks de abas carregam sob demanda** (lazy loading)
- ✅ **Ao clicar em uma aba**, o chunk correspondente é baixado
- ✅ **Chunks já baixados não são baixados novamente**

### Verificação Visual:
1. Limpe o Network (ícone 🚫)
2. Clique na aba **Avaliação**
3. Deve aparecer: `AvaliacaoTab-[hash].js` sendo baixado
4. Volte para **Evolução** e depois **Avaliação** novamente
5. **Não deve baixar novamente** (cache)

---

## 🎯 TESTE 7: Prefetch Inteligente

### Como Testar:
1. Navegue para página de evolução
2. Fique na aba **Evolução** por 3 segundos
3. Observe a aba **Network** no DevTools

### O Que Você Deve Ver:
```
⏳ Aguardando 2 segundos...
🔮 Prefetching next tab: avaliacao
✅ Prefetch completed
```

### No Network:
- ✅ Após 2 segundos, queries da próxima aba começam a carregar
- ✅ Prioridade: **Low** (não bloqueia a aba atual)
- ✅ Se você clicar na aba antes do prefetch terminar, não há problema

### Teste de Rede Lenta:
1. Configure **Slow 3G**
2. O prefetch **NÃO deve acontecer** (economia de dados)
3. Console deve mostrar:
```
⚠️ Prefetch skipped: slow connection detected
```

---

## 📈 RESUMO DE MÉTRICAS ESPERADAS

### ⚡ Performance Geral:
| Métrica | Antes | Depois | Meta |
|---------|-------|--------|------|
| **Tempo de Carregamento** | 4-6s | < 2s | ✅ |
| **Bundle Principal** | > 500KB | < 300KB | ✅ |
| **Troca de Abas** | 200-500ms | < 100ms | ✅ |
| **Input Latency** | 100-200ms | < 50ms | ✅ |
| **Lighthouse Score** | 60-70 | > 90 | ✅ |

### 🎯 Core Web Vitals:
| Métrica | Meta | Status |
|---------|------|--------|
| **LCP** | < 2.5s | ✅ |
| **FID** | < 100ms | ✅ |
| **CLS** | < 0.1 | ✅ |
| **FCP** | < 1.8s | ✅ |
| **TTFB** | < 600ms | ✅ |

---

## 🐛 PROBLEMAS COMUNS E SOLUÇÕES

### ❌ Skeleton não aparece:
**Solução**: 
- Limpe o cache do navegador (Ctrl+Shift+Delete)
- Recarregue com cache limpo (Ctrl+Shift+R)

### ❌ Métricas não aparecem no console:
**Solução**:
- Verifique se está em modo **desenvolvimento** (não production)
- Abra o console **antes** de navegar para a página
- Verifique se não há erros de JavaScript

### ❌ Troca de abas lenta:
**Solução**:
- Verifique a aba **Network** - pode haver queries desnecessárias
- Verifique se o cache está funcionando (deve mostrar "from cache")
- Verifique se há erros no console

### ❌ Editor SOAP com lag:
**Solução**:
- Verifique se há avisos de "excessive re-renders" no console
- Verifique se o auto-save está com delay de 5 segundos
- Pode ser problema de hardware (CPU/RAM)

### ❌ Bundle muito grande:
**Solução**:
- Execute: `npm run build`
- Verifique o relatório de bundle size
- Procure por dependências grandes não utilizadas

---

## 📸 CAPTURAS DE TELA RECOMENDADAS

Para documentar os testes, tire screenshots de:

1. ✅ **Console com métricas de performance**
2. ✅ **Skeleton loaders visíveis**
3. ✅ **Network tab mostrando lazy loading**
4. ✅ **Lighthouse report com score > 90**
5. ✅ **Bundle analysis mostrando chunks**

---

## 🎉 CHECKLIST FINAL

Marque cada item após testar:

- [ ] Servidor rodando em http://localhost:5174/
- [ ] Console mostra métricas de performance
- [ ] Skeleton loaders aparecem durante carregamento
- [ ] Troca de abas é rápida (< 100ms)
- [ ] Editor SOAP é responsivo (sem lag)
- [ ] Auto-save funciona após 5 segundos
- [ ] Rede lenta não trava a interface
- [ ] Prefetch funciona (após 2s de inatividade)
- [ ] Bundle size está dentro dos limites
- [ ] Lighthouse Score > 90
- [ ] Sem avisos críticos no console

---

## 📞 PRÓXIMOS PASSOS

Após completar todos os testes:

1. ✅ Documente os resultados (screenshots)
2. ✅ Compare com métricas anteriores
3. ✅ Identifique possíveis melhorias adicionais
4. ✅ Teste em dispositivos móveis (se possível)
5. ✅ Teste em diferentes navegadores (Chrome, Firefox, Safari)

---

## 🚀 COMANDOS ÚTEIS

```bash
# Parar o servidor
Ctrl+C no terminal

# Reiniciar o servidor
npm run dev

# Build de produção
npm run build

# Preview do build de produção
npm run preview

# Análise de bundle
npm run build -- --mode analyze
```

---

**Última atualização**: Agora
**Status do servidor**: ✅ Online em http://localhost:5174/
