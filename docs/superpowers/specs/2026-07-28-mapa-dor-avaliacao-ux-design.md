# Mapa de Dor na Avaliação — enxugar boneco, remover Modo 3D e corrigir UX

Data: 2026-07-28
Status: aprovado (aguardando plano de implementação)

## Contexto

A aba **Mapa de Dor** da página de avaliação (`/patients/:patientId/evaluations/new`)
ocupa espaço vertical demais e oferece um "Modo 3D Realista" que não entrega o que
promete. A cadeia de componentes é:

```
src/pages/patients/NewEvaluationPage.tsx   (aba "pain-map")
  └── src/components/evolution/PainMapManager.tsx      (switch 3D, colunas, painel de edição)
        └── src/components/evolution/PainMapCanvas.tsx (SVG 2D | branch 3D)
              └── src/components/pain-map/BodyMapRealistic.tsx  (o "3D")
```

O mesmo `PainMapManager` também é usado por `src/components/evolution/tabs/AvaliacaoTab.tsx`
(tela de evolução), então as mudanças beneficiam as duas telas.

### O que o "Modo 3D Realista" realmente é

`BodyMapRealistic.tsx` (1008 linhas) não usa nenhuma biblioteca 3D. É um `<img>` com
zoom/pan cujo `src` aponta para uma URL externa do Google
(`lh3.googleusercontent.com/aida-public/...`, imagem gerada no Stitch). A vista "Costas"
é a mesma imagem espelhada com `scale-x-[-1]`. O componente já carrega um estado de erro
("Erro ao carregar modelo 3D") — evidência de que a quebra do host externo era esperada.

Quando ligado, o modo esconde toda a coluna de edição (EVA, região, tipo de dor,
observações, lista de pontos), deixando o profissional sem os controles clínicos.

## Decisões

| # | Decisão | Justificativa |
|---|---|---|
| D1 | Remover o Modo 3D do sistema (deletar o componente, não apenas esconder o switch) | Elimina dependência de host externo que pode expirar; remove ~30KB de fonte do chunk da avaliação; nenhum dado persistido depende do modo |
| D2 | Boneco em `max-w-[300px]`, sem `minHeight` forçado | Boneco + painel de edição cabem juntos sem rolagem |
| D3 | Otimizar apenas para desktop | Mobile e tablet serão atendidos por app nativo; o site não será acessado pelo celular |
| D4 | Colunas passam de 7/12 + 5/12 para 5/12 (canvas) + 7/12 (edição) | O espaço deve ir para onde o profissional digita |

**Fora de escopo:** legenda de cores no rodapé do canvas (redundante com o EVA, mas é
referência clínica útil na impressão) e o fluxo de autosave (funciona corretamente).
Nenhuma mudança em schema, API ou dados persistidos.

## Mudanças

### M1 — Remover o Modo 3D

- **Deletar** `src/components/pain-map/BodyMapRealistic.tsx`.
- `src/components/pain-map/index.ts`: remover a linha `export { BodyMapRealistic } from "./BodyMapRealistic";`.
- `src/components/evolution/PainMapCanvas.tsx`: remover o import de `BodyMapRealistic`,
  a prop `variant?: "2d" | "3d"` da interface e o bloco `if (variant === "3d") { ... }`.
- `src/components/evolution/PainMapManager.tsx`: remover o state `is3DMode`, o bloco do
  `<Switch id="3d-mode">` com o `<Label>` "Modo 3D Realista", e os condicionais
  `is3DMode ? ... : ...` nas classes das colunas e no `{!is3DMode && (...)}` do painel direito.
- Remover imports que ficarem órfãos (`Switch`, e no `PainMapCanvas` o que só o branch 3D usava).

Verificação: `grep -rn "BodyMapRealistic\|is3DMode\|Modo 3D" src` não retorna nada.

### M2 — Reduzir o boneco

Em `PainMapCanvas.tsx`, no bloco do SVG:

| Antes | Depois |
|---|---|
| container `min-h-[460px]` | container `min-h-[380px]` |
| `className="w-full max-w-[360px] mx-auto ..."` | `max-w-[300px]` |
| `style={{ minHeight: "460px" }}` | removido (altura derivada do `viewBox="0 0 100 240"`) |

Em `PainMapManager.tsx`: coluna do canvas `lg:w-7/12` → `lg:w-5/12`; coluna do painel
`lg:w-5/12` → `lg:w-7/12`. Os prefixos `lg:` permanecem para não quebrar o layout em
janelas estreitas, mas esse caminho não é alvo de otimização (D3).

### M3 — Seletor Frente/Costas visível em modo leitura (bug)

Em `PainMapCanvas.tsx`, os botões "Frente"/"Costas" estão dentro de `{!readOnly && (...)}`.
Numa avaliação finalizada isso torna as dores registradas nas costas inacessíveis.

Correção: renderizar o seletor sempre. `readOnly` continua bloqueando apenas a edição
(o `handleRegionClick` já retorna cedo quando `readOnly`).

### M4 — Estatísticas migram para a aba "Evolução"

Em `PainMapManager.tsx`, o `<Card>` com "Dor Média / Redução / Tendência / Registros" é
renderizado acima do `<Tabs>`, empurrando o boneco para fora da viewport. É informação
histórica e não pertence à aba "Mapa Atual".

Correção: mover o card para dentro de `<TabsContent value="evolution">`, no topo. A
condição de exibição (`stats && painMaps.length > 0`) permanece.

### M5 — Acessibilidade por teclado nas regiões do SVG

Os `<path>` de região em `PainMapCanvas.tsx` respondem apenas a `onClick`/`onMouseEnter`.

Correção, para cada `<path>` de região interativa quando `!readOnly`:
- `role="button"`
- `tabIndex={0}`
- `aria-label` com o rótulo da região (`PainMapService.getRegionLabel(region)`) e, quando
  houver dor registrada, a intensidade
- `aria-pressed={isSelected}`
- `onKeyDown` tratando `Enter` e `Espaço` (com `preventDefault` no Espaço) chamando o mesmo
  `handleRegionClick`
- `onFocus`/`onBlur` espelhando o realce visual de `hover`

Quando `readOnly`, os paths não recebem `tabIndex` nem `role="button"`.

### M6 — Barra flutuante para de cobrir o rodapé

Em `NewEvaluationPage.tsx` a pill "Ação Rápida" é `fixed bottom-6`, sobrepondo a legenda
de intensidade no fim do card.

Correção: adicionar `pb-24` ao container do `TabsContent value="pain-map"` e remover o
bloco de texto redundante `"Ação Rápida" / "Finalizou o preenchimento?"` — o próprio botão
já comunica a ação. A barra fica só com o botão e o separador some junto.

### M7 — Abas internas como segmented control compacto

Em `PainMapManager.tsx`, o `<TabsList className="grid w-full grid-cols-3">` compete
visualmente com as 6 abas da página.

Correção: `inline-flex w-auto` alinhado à esquerda, com `TabsTrigger` em `px-4 text-sm`,
mantendo o fundo `bg-muted/60` e os cantos arredondados atuais.

## Testes

Não há testes hoje para `PainMapManager`/`PainMapCanvas`. Cobertura mínima a criar em
`src/components/evolution/__tests__/PainMapCanvas.test.tsx` (Vitest + Testing Library):

1. O seletor "Frente"/"Costas" é renderizado com `readOnly` — cobre M3.
2. Com `readOnly`, clicar numa região não dispara `onPainPointsChange` — garante que M3 não
   afrouxou a permissão.
3. Uma região com `role="button"` responde a `Enter` chamando a seleção — cobre M5.
4. O componente não aceita mais `variant="3d"` (o SVG 2D é renderizado independentemente) — cobre M1.

Verificação manual em `/patients/:patientId/evaluations/new`, aba Mapa de Dor: boneco menor,
sem switch 3D, painel de edição mais largo, legenda não coberta pela barra flutuante.

## Riscos

- **`PainMapCanvas` é compartilhado com a tela de evolução** (`AvaliacaoTab`). M2 e M4 mudam
  a aparência lá também — é o comportamento desejado, mas deve ser conferido visualmente.
- **`PainDetailsForm` e `bodyMuscles.ts`** continuam usados por outros componentes
  (`PainMapEditor`, `PainPointsManager`); a remoção do M1 não deve tocá-los.
- `BodyMap.tsx` e `BodyMapAnatomical.tsx` seguem no repo — `BodyMap` ainda é usado por
  `PainMapEditor`/`PainMapComparison`. Avaliar `BodyMapAnatomical` como código morto fica
  para outra tarefa, fora deste escopo.
