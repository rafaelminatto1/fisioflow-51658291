# Prompt para Antropic IDE - Bug: Widgets Sobrepostos no Grid Layout

## Contexto do Problema

Estamos enfrentando um bug crítico na página de Evolução do Paciente onde os widgets do grid layout estão aparecendo **sobrepostos** uns aos outros, impedindo a interação correta.

## Descrição Detalhada

1. **Localização**: Página de Evolução do Paciente (`PatientEvolution.tsx`)
2. **Componente**: `EvolutionDraggableGrid` que usa `DraggableGrid` (wrapper para `react-grid-layout`)
3. **Sintoma**: Widgets aparecem sobrepostos e não é possível clicar/arrastar alguns deles
4. **Layout Esperado**: Grid de 12 colunas com posições dinâmicas baseadas no estado `showPainDetails`:
   - **Pain Scale colapsado (h:5)**:
     - LINHA 1 (y:0): Nível de Dor (w:4, h:5) | Exercícios (w:8, h:5)
     - LINHA 2 (y:5): SOAP em 2x2 (4 campos, cada w:6, h:7)
     - LINHA 3 (y:19): Registro de Medições (w:6, h:9) | Home Care (w:6, h:9)
     - LINHA 4 (y:28): Sessões Anteriores (w:6, h:10) | Anexos (w:6, h:10)
   - **Pain Scale expandido (h:16)**:
     - LINHA 1 (y:0): Nível de Dor (w:4, h:16) | Exercícios (w:8, h:5)
     - LINHA 2 (y:16): SOAP em 2x2 (4 campos, cada w:6, h:7) - começa em y=16
     - LINHA 3 (y:30): Registro de Medições (w:6, h:9) | Home Care (w:6, h:9)
     - LINHA 4 (y:39): Sessões Anteriores (w:6, h:10) | Anexos (w:6, h:10)

## Arquivos Principais Envolvidos

### 1. `src/components/evolution/EvolutionDraggableGrid.tsx`

**Pontos chave:**
- Linha 249: `showPainDetails` state controla a expansão do Pain Scale
- Linha 365: Pain Scale `defaultLayout` define altura dinâmica: `h: showPainDetails ? 16 : 5`
- Linha 406: SOAP widgets calculam Y baseado em `showPainDetails`: `y: (showPainDetails ? 16 : 5) + Math.floor(index / 2) * 7`
- Linha 438, 460, 571, 601: Outros widgets também calculam Y baseado em `showPainDetails`
- Linha 661: `key` prop força remount: `key={`grid-${showPainDetails ? 'expanded' : 'collapsed}`}`

**Problema potencial:**
O `useMemo` na linha 302 tem `showPainDetails` nas dependências, mas o memo pode não estar recalculando as posições corretamente quando o estado muda.

### 2. `src/components/ui/DraggableGrid.tsx`

**Pontos chave:**
- Linha 38: Usa `memo` para otimização
- Linha 48: `layouts` state armazena os layouts calculados
- Linha 55-109: `useEffect` calcula layouts baseados em `items`, `savedLayout`, `forceReset`
- Linha 85-106: Lógica de merge que compara posições salvas com padrão
- Linha 95: Se `yDiff > 2 || xDiff > 1`, usa posição padrão

**Problema identificado:**
Quando `showPainDetails` muda, o `EvolutionDraggableGrid` cria novos `items` com posições diferentes. O `DraggableGrid` memoizado pode não estar detectando essa mudança porque:
1. O `memo` usa comparação shallow das props
2. O `useEffect` pode não estar sendo disparado novamente quando apenas as posições internas dos `items` mudam
3. O `key` prop no `EvolutionDraggableGrid` força remount do grid inteiro, mas pode haver race condition

## Causa Raiz Provável

**O problema está no `DraggableGrid.tsx` linha 55-109:**

Quando `showPainDetails` muda de `false` para `true`:
1. O `EvolutionDraggableGrid` recalcula os `defaultLayout` dos items com novas posições Y
2. O `key` prop muda de `grid-collapsed` para `grid-expanded`
3. O React desmonta o `DraggableGrid` antigo e monta um novo
4. **O problema**: O novo `DraggableGrid` ainda pode ter um `savedLayout` no localStorage com as posições antigas
5. O `useEffect` (linha 85-106) verifica `yDiff > 2` e pode estar usando posições salvas antigas que agora estão incorretas

**Evidência:**
- Linha 77: `if (savedLayout.length !== items.length)` - verifica apenas quantidade
- Linha 95: `if (yDiff > 2 || xDiff > 1)` - verifica diferença de posição
- Quando Pain Scale expande de h:5 para h:16, a diferença em Y é 11 (16-5=11), o que deveria disparar a condição
- **MAS**: o `savedLayout` pode ter posições muito diferentes que passam nessa verificação

## Tarefas para Resolução

### 1. Análise Inicial
- [ ] Abrir o navegador na página de Evolução do Paciente
- [ ] Abrir React DevTools e verificar as props do `DraggableGrid`
- [ ] Verificar no console se há warnings sobre posições
- [ ] Verificar o localStorage para ver o que está salvo em `evolution_layout_v1`

### 2. Debug
- [ ] Adicionar `console.log` no `DraggableGrid.tsx` linha 56 para ver quando layouts são recalculados
- [ ] Adicionar `console.log` para mostrar as posições padrão vs salvas
- [ ] Verificar se o `key` prop está realmente forçando o remount

### 3. Soluções Propostas

**Solução 1: Melhorar a validação do saved layout**
No `DraggableGrid.tsx`, linha 85-106, melhorar a lógica para detectar quando o saved layout é incompatível com o estado atual:

```typescript
// Adicionar verificação para detectar mudanças drásticas nas posições Y dos primeiros items
// Se o Pain Scale (primeiro item) tem Y=0 mas H diferente do esperado, descartar saved layout
const firstItemDefault = defaultLayouts[0];
const firstItemSaved = savedLayout.find(l => l.i === firstItemDefault.i);
if (firstItemSaved && Math.abs((firstItemSaved.h || 0) - firstItemDefault.h) > 5) {
    console.warn('[DraggableGrid] Pain Scale height changed significantly, using defaults');
    setLayouts({ lg: defaultLayouts });
    return;
}
```

**Solução 2: Usar layouts prop em vez de depender apenas de data-grid**
Em vez de usar `data-grid` em cada item, usar a prop `layouts` do `ResponsiveReactGridLayout`:

```typescript
// No EvolutionDraggableGrid.tsx, passar layouts calculados:
<DraggableGrid
    layouts={{ lg: calculatedLayouts }}
    // ...
/>
```

**Solução 3: Forçar reset quando showPainDetails muda**
Adicionar uma prop `forceReset` ou usar um efeito para limpar o saved layout quando Pain Scale expande/colapsa:

```typescript
useEffect(() => {
    // Quando showPainDetails muda, limpar o saved layout temporariamente
    setSavedLayout([]);
}, [showPainDetails]);
```

### 4. Testes
- [ ] Testar com Pain Scale colapsado - widgets não devem sobrepor
- [ ] Expandir Pain Scale - widgets devem se ajustar para baixo
- [ ] Colapsar Pain Scale - widgets devem voltar à posição original
- [ ] Arrastar widgets e salvar layout
- [ ] Recarregar página e verificar se layout mantém
- [ ] Clicar em todos os widgets para verificar se são interativos

## Output Esperado

1. **Diagnóstico claro** da causa raiz com evidências do console/DevTools
2. **Correção implementada** e testada
3. **Verificação** de que o layout funciona corretamente em ambos os estados
4. **Commit** com as correções e comentários explicativos

## Informações Técnicas Adicionais

- **react-grid-layout versão**: usando `ResponsiveReactGridLayout` do módulo `legacy`
- **rowHeight**: 50px (configurado no EvolutionDraggableGrid)
- **margin**: [16, 16]
- **cols**: 12 colunas no breakpoint lg
- **breakpoints**: lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0

## NOTA IMPORTANTE

Por favor, investigue profundamente o código usando:
- **React DevTools** para inspecionar props e state
- **Console do navegador** para ver logs e warnings
- **Debugger** para passo-a-passo se necessário

Não faça apenas alterações superficiais - encontre a causa raiz do problema e implemente uma solução robusta que previna regressões.
