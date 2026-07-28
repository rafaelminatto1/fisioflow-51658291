# Mapa de Dor da Avaliação — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remover o "Modo 3D Realista" do mapa de dor, reduzir o boneco corporal para ~300px e corrigir cinco problemas de UX/acessibilidade da aba Mapa de Dor da página de avaliação.

**Architecture:** Todas as mudanças são de front-end, em três arquivos já existentes (`PainMapCanvas.tsx`, `PainMapManager.tsx`, `NewEvaluationPage.tsx`) mais a deleção de `BodyMapRealistic.tsx`. Nenhuma mudança de schema, API, rota ou dado persistido. `PainMapCanvas` é um componente controlado puro (recebe `painPoints` e `onPainPointsChange`), então recebe testes de unidade; `PainMapManager` depende de hooks de rede e é verificado por typecheck + inspeção visual.

**Tech Stack:** React 19.2, TypeScript strict, Tailwind v4, Shadcn/Radix, Vitest + Testing Library.

Spec: `docs/superpowers/specs/2026-07-28-mapa-dor-avaliacao-ux-design.md`

## Global Constraints

- TypeScript strict; sem comentários supérfluos.
- Português (PT-BR) em toda a UI.
- Sem glassmorphism (nada de `backdrop-blur` ou superfícies translúcidas) — superfícies sólidas.
- Otimizar apenas para desktop. Mobile e tablet serão atendidos por app nativo; o site não será acessado pelo celular. Os prefixos `lg:` permanecem no código para não quebrar janelas estreitas, mas esse caminho não é alvo de otimização.
- Não alterar schema, migrations, API ou formato dos dados persistidos.
- Rodar um arquivo de teste: `npx vitest run <caminho>` a partir da raiz do repositório (o `vitest.config.ts` da raiz reexporta o de `apps/web`).
- Typecheck: `npx tsc --noEmit -p tsconfig.json`.
- **Não dar `git push`.** A branch `main` tem auto-deploy para produção; commits locais apenas.

## File Structure

| Arquivo | Responsabilidade após as mudanças |
|---|---|
| `src/components/pain-map/BodyMapRealistic.tsx` | **DELETADO** |
| `src/components/pain-map/index.ts` | Barril público de `pain-map`, sem `BodyMapRealistic` |
| `src/components/evolution/PainMapCanvas.tsx` | Único renderizador do boneco: SVG 2D interativo, seletor Frente/Costas, legenda de intensidade. Sem prop `variant`. |
| `src/components/evolution/PainMapManager.tsx` | Orquestra canvas + painel de edição + abas Mapa/Evolução/Histórico + autosave. Sem estado de 3D. |
| `src/pages/patients/NewEvaluationPage.tsx` | Página de avaliação; só o container da aba `pain-map` e a barra flutuante mudam. |
| `src/components/evolution/__tests__/PainMapCanvas.test.tsx` | **NOVO** — testes de unidade do canvas (readOnly, teclado, ausência do 3D) |

---

### Task 1: Remover o Modo 3D Realista

**Files:**
- Create: `src/components/evolution/__tests__/PainMapCanvas.test.tsx`
- Delete: `src/components/pain-map/BodyMapRealistic.tsx`
- Modify: `src/components/pain-map/index.ts:5`
- Modify: `src/components/evolution/PainMapCanvas.tsx` (imports, `PainMapCanvasProps`, branch `variant === "3d"`)
- Modify: `src/components/evolution/PainMapManager.tsx` (state `is3DMode`, switch, condicionais de layout)

**Interfaces:**
- Consumes: nada de tarefas anteriores.
- Produces: `PainMapCanvasProps` sem a propriedade `variant`. Assinatura final:
  ```ts
  interface PainMapCanvasProps {
    painPoints: PainMapPoint[];
    onPainPointsChange: (points: PainMapPoint[]) => void;
    readOnly?: boolean;
    evolutionData?: PainEvolutionData[];
    selectedRegion?: BodyRegion | null;
    onRegionSelect?: (region: BodyRegion | null) => void;
  }
  ```
  As Tasks 3 e 4 estendem o arquivo de teste criado aqui.

- [ ] **Step 1: Criar o arquivo de teste com o guarda de regressão**

Este teste é um guarda: ele documenta que o canvas sempre renderiza a silhueta SVG e nunca a imagem externa do "3D". Ele passa antes e depois da deleção — o valor está em travar o comportamento, não em falhar primeiro.

Criar `src/components/evolution/__tests__/PainMapCanvas.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { PainMapCanvas } from "../PainMapCanvas";
import type { PainMapPoint } from "@/types/painMap";

const noop = vi.fn();

const pontoOmbroDireito: PainMapPoint = {
  region: "ombro_direito",
  intensity: 7,
  painType: "aguda",
  x: 50,
  y: 50,
};

describe("PainMapCanvas", () => {
  test("renderiza a silhueta SVG e nunca a imagem do antigo Modo 3D", () => {
    const { container } = render(
      <PainMapCanvas painPoints={[]} onPainPointsChange={noop} />,
    );

    expect(container.querySelector("svg")).toBeTruthy();
    expect(screen.queryByAltText("Modelo Anatômico 3D")).toBeNull();
  });

  test("renderiza um ponto de dor registrado com a intensidade visível", () => {
    render(
      <PainMapCanvas painPoints={[pontoOmbroDireito]} onPainPointsChange={noop} />,
    );

    expect(screen.getByText("7")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que passa antes da deleção**

Run: `npx vitest run src/components/evolution/__tests__/PainMapCanvas.test.tsx`
Expected: PASS (2 testes). Se falhar aqui, o problema é de setup do teste, não do código de produção — resolver antes de seguir.

- [ ] **Step 3: Deletar o componente e o export do barril**

```bash
git rm src/components/pain-map/BodyMapRealistic.tsx
```

Em `src/components/pain-map/index.ts`, remover a linha:

```ts
export { BodyMapRealistic } from "./BodyMapRealistic";
```

- [ ] **Step 4: Remover o branch 3D do `PainMapCanvas.tsx`**

Remover o import (linha ~20):

```ts
import { BodyMapRealistic } from "@/components/pain-map/BodyMapRealistic";
```

Remover a linha `variant?: "2d" | "3d";` da interface `PainMapCanvasProps` e o `variant,` da desestruturação dos props na assinatura da função.

Remover o bloco inteiro (linhas ~418-433):

```tsx
  if (variant === "3d") {
    return (
      <div className="w-full h-[750px] relative overflow-hidden rounded-2xl border border-border shadow-lg bg-black">
        <BodyMapRealistic
          view={view}
          points={bodyMapPoints}
          onPointAdd={handleBodyMapPointAdd}
          onPointRemove={handleBodyMapPointRemove}
          onPointUpdate={handleBodyMapPointUpdate}
          readOnly={readOnly}
          selectedIntensity={5}
          className="h-full w-full"
          onViewChange={(v) => setView(v)}
          evolutionData={evolutionData}
        />
      </div>
    );
  }
```

Com esse bloco fora, `bodyMapPoints`, `handleBodyMapPointAdd`, `handleBodyMapPointRemove` e `handleBodyMapPointUpdate` ficam sem uso — **remover as quatro declarações também** (elas só existiam para alimentar o `BodyMapRealistic`).

- [ ] **Step 5: Limpar os imports mortos do `PainMapCanvas.tsx`**

O oxlint já acusava 9 imports não utilizados neste arquivo. Remover, do topo do arquivo:

```ts
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PainMapService } from "@/lib/services/painMapService";
import { PainPoint } from "@/components/pain-map/BodyMap";
import { Badge } from "@/components/ui/badge";
```

**Atenção:** o import de `PainMapService` volta na Task 4 (para os `aria-label`). Remover agora mesmo assim — a Task 4 o readiciona explicitamente. Manter `useState`, `Card`, `Label` e os tipos de `@/types/painMap`, que continuam em uso.

Também remover `PainEvolutionData` do import de tipos **apenas se** a prop `evolutionData` tiver ficado sem nenhum uso no arquivo. Conferir com `grep -n "evolutionData" src/components/evolution/PainMapCanvas.tsx`: se as únicas ocorrências forem a declaração da prop e a desestruturação, remover a prop `evolutionData` da interface e da assinatura, e o tipo do import.

- [ ] **Step 6: Remover o estado 3D do `PainMapManager.tsx`**

Remover a linha 52:

```tsx
  const [is3DMode, setIs3DMode] = useState(false);
```

Remover o bloco do switch (linhas ~287-294):

```tsx
          <div className="flex justify-end mb-2">
            <div className="flex items-center space-x-2 bg-muted/30 px-3 py-1.5 rounded-xl border border-border/50">
              <Label htmlFor="3d-mode" className="text-sm font-medium cursor-pointer">
                Modo 3D Realista
              </Label>
              <Switch id="3d-mode" checked={is3DMode} onCheckedChange={setIs3DMode} />
            </div>
          </div>
```

Substituir o bloco das colunas (linhas ~296-312) por:

```tsx
          <div className="flex flex-col lg:flex-row gap-6 items-stretch">
            {/* Left Column: Body Map Canvas */}
            <div className="w-full lg:w-7/12">
              <PainMapCanvas
                painPoints={painPoints}
                onPainPointsChange={setPainPoints}
                readOnly={readOnly}
                evolutionData={painEvolution}
                selectedRegion={selectedRegion}
                onRegionSelect={setSelectedRegion}
              />
            </div>

            {/* Right Column: Pain Control & Editor Dashboard */}
            <Card className="w-full lg:w-5/12 p-6 flex flex-col justify-between gap-6 border shadow-sm rounded-2xl bg-card">
```

(As proporções 7/12 e 5/12 ficam como estão nesta task; a Task 2 as inverte.)

Como o `{!is3DMode && (` que abria o `<Card>` sumiu, o `)}` que fechava esse condicional depois do `</Card>` também precisa sair. Localizar o fechamento correspondente (logo após o `</Card>` do painel direito, antes do fechamento da `<div>` das colunas) e trocar `)}` por nada, mantendo `</Card>`.

Se o import de `evolutionData`/`Switch` ficar órfão, remover `Switch` do import de `@/components/ui/switch`. Remover também o import `Sparkles` (linha 32), já acusado como morto pelo oxlint.

- [ ] **Step 7: Verificar que nenhuma referência ao 3D sobrou**

Run: `grep -rn "BodyMapRealistic\|is3DMode\|Modo 3D\|variant.*\"3d\"" src`
Expected: nenhuma saída (exit code 1).

- [ ] **Step 8: Rodar teste e typecheck**

Run: `npx vitest run src/components/evolution/__tests__/PainMapCanvas.test.tsx`
Expected: PASS (2 testes).

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: 0 erros.

- [ ] **Step 9: Commit**

```bash
git add -A src/components/pain-map src/components/evolution
git commit -m "refactor(pain-map): remover Modo 3D Realista e imports mortos do canvas"
```

---

### Task 2: Reduzir o boneco para ~300px e reequilibrar as colunas

**Files:**
- Modify: `src/components/evolution/PainMapCanvas.tsx` (container do SVG, ~linha 477-481)
- Modify: `src/components/evolution/PainMapManager.tsx` (larguras das colunas)

**Interfaces:**
- Consumes: `PainMapCanvasProps` sem `variant` (Task 1).
- Produces: nenhuma mudança de API — só classes Tailwind.

- [ ] **Step 1: Encolher o SVG no `PainMapCanvas.tsx`**

Substituir o bloco atual:

```tsx
      <div className="relative bg-muted/20 border border-border/40 rounded-2xl p-6 flex items-center justify-center flex-1 min-h-[460px]">
        <svg
          viewBox="0 0 100 240"
          className="w-full max-w-[360px] mx-auto drop-shadow-xl transition-all duration-300"
          style={{ minHeight: "460px" }}
        >
```

por:

```tsx
      <div className="relative bg-muted/20 border border-border/40 rounded-2xl p-6 flex items-center justify-center flex-1 min-h-[380px]">
        <svg
          viewBox="0 0 100 240"
          className="w-full max-w-[300px] mx-auto drop-shadow-xl transition-all duration-300"
        >
```

A remoção do `style={{ minHeight: "460px" }}` faz a altura passar a derivar da proporção do `viewBox` (100×240), em vez de ser forçada.

- [ ] **Step 2: Inverter as proporções das colunas no `PainMapManager.tsx`**

Na `<div>` da coluna do canvas: `className="w-full lg:w-7/12"` → `className="w-full lg:w-5/12"`.

No `<Card>` do painel de edição: `className="w-full lg:w-5/12 p-6 flex flex-col justify-between gap-6 border shadow-sm rounded-2xl bg-card"` → trocar `lg:w-5/12` por `lg:w-7/12`, mantendo o resto da string idêntico.

- [ ] **Step 3: Rodar teste e typecheck**

Run: `npx vitest run src/components/evolution/__tests__/PainMapCanvas.test.tsx`
Expected: PASS (2 testes).

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: 0 erros.

- [ ] **Step 4: Commit**

```bash
git add src/components/evolution/PainMapCanvas.tsx src/components/evolution/PainMapManager.tsx
git commit -m "style(pain-map): reduzir boneco para 300px e dar mais espaço ao painel de edição"
```

---

### Task 3: Seletor Frente/Costas visível em modo leitura

**Files:**
- Modify: `src/components/evolution/__tests__/PainMapCanvas.test.tsx` (novos testes)
- Modify: `src/components/evolution/PainMapCanvas.tsx` (condicional `{!readOnly && ...}` do seletor)

**Interfaces:**
- Consumes: o arquivo de teste e `PainMapCanvasProps` da Task 1.
- Produces: nenhuma mudança de API.

**Contexto do bug:** os botões "Frente" e "Costas" estão dentro de `{!readOnly && (...)}`. Numa avaliação já finalizada (`readOnly`), as dores registradas nas costas ficam inacessíveis — não há como virar o boneco.

- [ ] **Step 1: Escrever os testes que falham**

Adicionar ao `describe("PainMapCanvas", ...)` existente:

```tsx
  test("mostra o seletor Frente/Costas mesmo em modo leitura", () => {
    render(
      <PainMapCanvas painPoints={[]} onPainPointsChange={noop} readOnly />,
    );

    expect(screen.getByRole("button", { name: "Frente" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Costas" })).toBeTruthy();
  });

  test("em modo leitura, virar o boneco não altera nem seleciona nada", async () => {
    const user = userEvent.setup();
    const onPainPointsChange = vi.fn();
    const onRegionSelect = vi.fn();

    render(
      <PainMapCanvas
        painPoints={[]}
        onPainPointsChange={onPainPointsChange}
        onRegionSelect={onRegionSelect}
        readOnly
      />,
    );

    await user.click(screen.getByRole("button", { name: "Costas" }));

    expect(onPainPointsChange).not.toHaveBeenCalled();
    expect(onRegionSelect).not.toHaveBeenCalled();
  });
```

Adicionar o import no topo do arquivo de teste:

```tsx
import userEvent from "@testing-library/user-event";
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npx vitest run src/components/evolution/__tests__/PainMapCanvas.test.tsx`
Expected: FAIL nos dois testes novos, com "Unable to find an accessible element with the role 'button' and name 'Frente'" — porque o seletor não é renderizado quando `readOnly`.

- [ ] **Step 3: Renderizar o seletor sempre**

No `PainMapCanvas.tsx`, remover apenas o wrapper condicional `{!readOnly && (` ... `)}` em volta da `<div className="flex bg-muted/60 p-1 rounded-xl border border-border/50">`, mantendo os dois `<button>` de Frente e Costas exatamente como estão. O resultado é:

```tsx
        <div className="flex bg-muted/60 p-1 rounded-xl border border-border/50">
          <button
            onClick={() => setView("front")}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              view === "front"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Frente
          </button>
          <button
            onClick={() => setView("back")}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              view === "back"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Costas
          </button>
        </div>
```

A edição continua bloqueada: `handleRegionClick` já começa com `if (readOnly) return;`.

Ajustar também o subtítulo do cabeçalho, que hoje sempre diz "Clique nas regiões para registrar ou editar a dor" — em modo leitura isso é falso:

```tsx
          <p className="text-xs text-muted-foreground">
            {readOnly
              ? "Visualização das regiões com dor registrada"
              : "Clique nas regiões para registrar ou editar a dor"}
          </p>
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npx vitest run src/components/evolution/__tests__/PainMapCanvas.test.tsx`
Expected: PASS (4 testes).

- [ ] **Step 5: Commit**

```bash
git add src/components/evolution/PainMapCanvas.tsx src/components/evolution/__tests__/PainMapCanvas.test.tsx
git commit -m "fix(pain-map): permitir ver as costas em avaliações somente leitura"
```

---

### Task 4: Acessibilidade por teclado nas regiões do SVG

**Files:**
- Modify: `src/components/evolution/__tests__/PainMapCanvas.test.tsx` (novos testes)
- Modify: `src/components/evolution/PainMapCanvas.tsx` (`<path>` das regiões)

**Interfaces:**
- Consumes: `handleRegionClick(region: BodyRegion)` e o state `hoveredRegion` já existentes no `PainMapCanvas`.
- Produces: nenhuma mudança de API.

**Contexto:** os `<path>` de região respondem só a `onClick`/`onMouseEnter`. Não há como marcar uma região sem mouse, e leitores de tela não anunciam nada.

- [ ] **Step 1: Escrever os testes que falham**

Adicionar ao `describe` existente:

```tsx
  test("as regiões são botões acessíveis com rótulo em português", () => {
    render(<PainMapCanvas painPoints={[]} onPainPointsChange={noop} />);

    expect(screen.getByRole("button", { name: /Ombro Direito/ })).toBeTruthy();
  });

  test("a região anuncia a intensidade quando há dor registrada", () => {
    render(
      <PainMapCanvas painPoints={[pontoOmbroDireito]} onPainPointsChange={noop} />,
    );

    expect(
      screen.getByRole("button", { name: "Ombro Direito, dor 7 de 10" }),
    ).toBeTruthy();
  });

  test("Enter numa região dispara a seleção", async () => {
    const user = userEvent.setup();
    const onRegionSelect = vi.fn();

    render(
      <PainMapCanvas
        painPoints={[]}
        onPainPointsChange={noop}
        onRegionSelect={onRegionSelect}
      />,
    );

    const regiao = screen.getByRole("button", { name: /Ombro Direito/ });
    regiao.focus();
    await user.keyboard("{Enter}");

    expect(onRegionSelect).toHaveBeenCalledWith("ombro_direito");
  });

  test("em modo leitura as regiões não são focáveis", () => {
    render(
      <PainMapCanvas painPoints={[]} onPainPointsChange={noop} readOnly />,
    );

    expect(screen.queryByRole("button", { name: /Ombro Direito/ })).toBeNull();
  });
```

**Nota:** "Ombro Direito" existe no `frontPaths` (vista Frente é o padrão) e `PainMapService.getRegionLabel("ombro_direito")` devolve exatamente `"Ombro Direito"`.

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npx vitest run src/components/evolution/__tests__/PainMapCanvas.test.tsx`
Expected: FAIL nos quatro testes novos — nenhum elemento tem `role="button"` dentro do SVG.

- [ ] **Step 3: Readicionar o import do `PainMapService`**

No topo do `PainMapCanvas.tsx` (removido na Task 1, Step 5):

```ts
import { PainMapService } from "@/lib/services/painMapService";
```

- [ ] **Step 4: Adicionar o handler de teclado**

Junto dos outros handlers do componente, logo depois de `handleRegionClick`:

```tsx
  const handleRegionKeyDown = (event: React.KeyboardEvent<SVGPathElement>, region: BodyRegion) => {
    if (readOnly) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    handleRegionClick(region);
  };
```

Adicionar `import type { KeyboardEvent } from "react";` **não é necessário** — usar `React.KeyboardEvent` exige o import de `React`. Para não mexer no estilo de import do arquivo (que usa `import { useState } from "react"`), trocar por:

```tsx
  const handleRegionKeyDown = (event: ReactKeyboardEvent<SVGPathElement>, region: BodyRegion) => {
```

e ajustar a primeira linha do arquivo para:

```tsx
import { useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
```

- [ ] **Step 5: Tornar os `<path>` de região acessíveis**

No `<path>` interativo de cada região (o segundo `<path>`, o que tem `fill={fillColor}` e `onClick`), adicionar os atributos abaixo. Manter todos os atributos existentes:

```tsx
                <path
                  d={path}
                  fill={fillColor}
                  role={readOnly ? undefined : "button"}
                  tabIndex={readOnly ? undefined : 0}
                  aria-label={
                    painPoint && painPoint.intensity > 0
                      ? `${PainMapService.getRegionLabel(region)}, dor ${painPoint.intensity} de 10`
                      : PainMapService.getRegionLabel(region)
                  }
                  aria-pressed={readOnly ? undefined : isSelected}
                  stroke={
                    isSelected
                      ? "hsl(var(--primary))"
                      : isHovered
                        ? "hsl(var(--primary)/0.6)"
                        : "hsl(var(--border))"
                  }
                  strokeWidth={isSelected ? 1.8 : 0.6}
                  className={
                    readOnly
                      ? ""
                      : "cursor-pointer transition-all duration-200 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--primary))]"
                  }
                  onClick={() => handleRegionClick(region)}
                  onKeyDown={(e) => handleRegionKeyDown(e, region)}
                  onMouseEnter={() => !readOnly && setHoveredRegion(region)}
                  onMouseLeave={() => setHoveredRegion(null)}
                  onFocus={() => !readOnly && setHoveredRegion(region)}
                  onBlur={() => setHoveredRegion(null)}
                  filter={isSelected ? "url(#selectedGlow)" : undefined}
                />
```

O primeiro `<path>` (o de contorno, dentro do `<g filter="url(#bodyShadow)">`) é decorativo — adicionar `aria-hidden="true"` nele para não poluir o leitor de tela.

- [ ] **Step 6: Rodar e confirmar que passa**

Run: `npx vitest run src/components/evolution/__tests__/PainMapCanvas.test.tsx`
Expected: PASS (8 testes).

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: 0 erros.

- [ ] **Step 7: Commit**

```bash
git add src/components/evolution/PainMapCanvas.tsx src/components/evolution/__tests__/PainMapCanvas.test.tsx
git commit -m "feat(a11y): navegar e marcar regiões do mapa de dor pelo teclado"
```

---

### Task 5: Estatísticas para a aba Evolução e abas internas compactas

**Files:**
- Modify: `src/components/evolution/PainMapManager.tsx` (card de estatísticas, `TabsList`)

**Interfaces:**
- Consumes: `stats`, `painMaps`, `getTrendIcon()`, `getTrendLabel()` — todos já existentes no `PainMapManager`.
- Produces: nenhuma mudança de API.

**Contexto:** o card "Dor Média / Redução / Tendência / Registros" é renderizado acima do `<Tabs>`, empurrando o boneco para fora da viewport. É informação histórica e não pertence à aba "Mapa Atual". E o `TabsList` com `grid w-full grid-cols-3` compete visualmente com as 6 abas da própria página de avaliação.

- [ ] **Step 1: Recortar o card de estatísticas**

Remover o bloco inteiro que hoje fica logo depois de `<div className="space-y-6">` (linhas ~251-277), começando em `{stats && painMaps.length > 0 && (` e terminando no `)}` correspondente. Guardar o conteúdo — ele volta no Step 2.

- [ ] **Step 2: Colar o card no topo da aba Evolução**

Localizar o `<TabsContent value="evolution" ...>` e inserir o card como primeiro filho, com o mesmo conteúdo de antes:

```tsx
          {stats && painMaps.length > 0 && (
            <Card className="p-4 bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-2xl">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Dor Média</p>
                  <p className="text-2xl font-bold">{stats.averagePainLevel.toFixed(1)}/10</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Redução</p>
                  <p className="text-2xl font-bold text-green-600">
                    -{stats.painReduction.toFixed(0)}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Tendência</p>
                  <div className="flex items-center gap-2">
                    {getTrendIcon()}
                    <span className="text-lg font-semibold">{getTrendLabel()}</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Registros</p>
                  <p className="text-2xl font-bold">{painMaps.length}</p>
                </div>
              </div>
            </Card>
          )}
```

- [ ] **Step 3: Compactar as abas internas**

Substituir:

```tsx
        <TabsList className="grid w-full grid-cols-3 rounded-xl p-1 bg-muted/60">
          <TabsTrigger value="current" className="rounded-lg font-medium">Mapa Atual</TabsTrigger>
          <TabsTrigger value="evolution" className="rounded-lg font-medium">Evolução</TabsTrigger>
          <TabsTrigger value="history" className="rounded-lg font-medium">Histórico</TabsTrigger>
        </TabsList>
```

por:

```tsx
        <TabsList className="inline-flex w-auto rounded-xl p-1 bg-muted/60">
          <TabsTrigger value="current" className="rounded-lg px-4 text-sm font-medium">Mapa Atual</TabsTrigger>
          <TabsTrigger value="evolution" className="rounded-lg px-4 text-sm font-medium">Evolução</TabsTrigger>
          <TabsTrigger value="history" className="rounded-lg px-4 text-sm font-medium">Histórico</TabsTrigger>
        </TabsList>
```

- [ ] **Step 4: Verificar typecheck e testes**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: 0 erros.

Run: `npx vitest run src/components/evolution/__tests__/PainMapCanvas.test.tsx`
Expected: PASS (8 testes).

- [ ] **Step 5: Commit**

```bash
git add src/components/evolution/PainMapManager.tsx
git commit -m "style(pain-map): mover estatísticas para a aba Evolução e compactar abas internas"
```

---

### Task 6: Barra flutuante para de cobrir o rodapé do mapa

**Files:**
- Modify: `src/pages/patients/NewEvaluationPage.tsx` (container da aba `pain-map`, barra flutuante)

**Interfaces:**
- Consumes: nada de tarefas anteriores.
- Produces: nenhuma mudança de API.

**Contexto:** a pill `fixed bottom-6 left-1/2` fica por cima da legenda de intensidade no fim do card do mapa. Além disso, o texto "Ação Rápida" + "Finalizou o preenchimento?" repete o que o próprio botão já diz.

- [ ] **Step 1: Dar respiro ao conteúdo da aba**

No `<TabsContent value="pain-map" className="m-0 print:break-before-page">`, a `<div>` interna hoje é:

```tsx
                    <div className="max-w-5xl mx-auto print:max-w-full">
```

Trocar por:

```tsx
                    <div className="max-w-5xl mx-auto pb-24 print:pb-0 print:max-w-full">
```

- [ ] **Step 2: Enxugar a barra flutuante**

Dentro do bloco `<div className="bg-card border border-blue-100/50 dark:border-blue-900/50 shadow-premium-md rounded-full px-6 py-3 flex items-center gap-4">`, remover o bloco de texto redundante e o separador que vinha logo depois:

```tsx
                <div className="hidden sm:block">
                  <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                    Ação Rápida
                  </p>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    Finalizou o preenchimento?
                  </p>
                </div>
                <Separator orientation="vertical" className="h-8 hidden sm:block mx-2" />
```

O botão de salvar permanece intacto. Se `Separator` não for mais usado em nenhum outro ponto do arquivo, remover o import — conferir com `grep -n "Separator" src/pages/patients/NewEvaluationPage.tsx` antes de remover.

- [ ] **Step 3: Verificar typecheck**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: 0 erros.

- [ ] **Step 4: Commit**

```bash
git add src/pages/patients/NewEvaluationPage.tsx
git commit -m "style(avaliacao): barra flutuante deixa de cobrir o rodapé do mapa de dor"
```

---

### Task 7: Verificação final

**Files:** nenhum (só verificação).

- [ ] **Step 1: Suíte de testes de componentes**

Run: `npx vitest run src/components/evolution/__tests__/`
Expected: PASS em todos os arquivos, incluindo `collaboration-fallback.test.tsx`, `EvolutionHeaderV3.scribe.test.tsx` e `MeasurementDiagramYBalance.test.tsx` — nenhuma regressão nos vizinhos.

- [ ] **Step 2: Typecheck completo**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: 0 erros.

- [ ] **Step 3: Lint sem novos avisos**

Run: `npx oxlint src/components/evolution src/components/pain-map src/pages/patients/NewEvaluationPage.tsx`
Expected: nenhum aviso nos arquivos tocados. Os avisos pré-existentes em `src/components/evolution/v3-unified/EvolutionBlockV3.tsx` e `src/components/evolution/SurgeryTimeline.tsx` continuam — não fazem parte deste escopo.

- [ ] **Step 4: Conferência visual (manual, pelo Rafael)**

Abrir `/patients/:patientId/evaluations/new`, aba **Mapa de Dor**, e confirmar:
- não existe mais o switch "Modo 3D Realista";
- o boneco está visivelmente menor e o painel de edição à direita, mais largo;
- a legenda "Escala de Intensidade da Dor" não fica coberta pela barra flutuante;
- Tab move o foco entre as regiões do boneco, com contorno visível, e Enter seleciona;
- as estatísticas aparecem só na aba "Evolução";
- em uma avaliação já finalizada, os botões "Frente"/"Costas" aparecem e funcionam.

Conferir também a tela de evolução (`src/components/evolution/tabs/AvaliacaoTab.tsx`), que usa o mesmo `PainMapManager` — o boneco menor e o card de estatísticas movido também aparecem lá, e é o comportamento desejado.

- [ ] **Step 5: Não dar push**

A branch `main` tem auto-deploy para produção. Deixar os commits locais e avisar o Rafael que está pronto para revisão.
