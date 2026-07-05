# Limpeza e Higiene do Codebase — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remover código morto/órfão, eliminar `console.log` do bundle de produção, e fechar os TODOs funcionais que estão em código realmente conectado ao app — sem tocar no que já funciona.

**Architecture:** Cleanup incremental por fases isoladas. Cada fase é independente e reversível. A Fase 0 estabelece verdade de base com ferramenta (knip) porque a auditoria manual por grep se mostrou não-confiável (3 de 5 findings iniciais eram falsos). Nenhuma fase muda comportamento de features existentes.

**Tech Stack:** pnpm workspace, Vite 8 (Rolldown), TanStack Query v5.101, Vitest, TypeScript strict, Cloudflare Workers (Hono), Neon.

## Global Constraints

- TypeScript strict; sem comentários supérfluos (CLAUDE.md).
- Português (PT-BR) em UI.
- Rodar `pnpm type-check` e `pnpm workers:type-check` antes de cada commit que toca `.ts`/`.tsx`.
- Não misturar deploy manual com CI; apenas commitar — o push na `main` deploya via CI. Trabalhar em branch, não direto na `main`.
- Não bumpar React (pin do React Native).
- Cada remoção de arquivo deve ser precedida de confirmação de zero importadores via knip (Fase 0), nunca por grep manual.

---

## File Structure

Arquivos/áreas tocadas por fase:

- **Fase 0:** `package.json` (devDep + script), `knip.json` (novo) — instrumentação, sem mudança de runtime.
- **Fase 1:** `apps/web/vite.config.ts` — drop de `console` no build de produção.
- **Fase 2:** deleção de módulos órfãos confirmados (`src/lib/skills/**`, `src/lib/ai/rag-clinical.ts`, e o que a Fase 0 apontar). Barrels que os reexportam.
- **Fase 3:** TODOs funcionais em código conectado (`src/hooks/evolution/useEvolutionDashboardData.ts`, `apps/api/src/agents/EvolutionCollaboration.ts`, `src/hooks/mobile/useSafeAreaInsets.ts`, `src/components/exercises/TemplateManager.tsx`).
- **Fase 4 (opcional):** `src/hooks/useMessaging.ts` + `RealtimeContext` — otimização de polling.

---

## Sequência (por que esta ordem)

1. **Fase 0 primeiro** — sem ground truth confiável, qualquer deleção é chute. Knip dá a lista real de exports/arquivos/deps não usados.
2. **Fase 1 depois** — mudança de config isolada e de alto valor/baixo risco; não depende de nada.
3. **Fase 2 depende da 0** — só deletar o que knip confirmou órfão.
4. **Fase 3 por último entre as obrigatórias** — muda comportamento, exige TDD, é a de maior risco.
5. **Fase 4 é opcional** — otimização, não bug; fazer só se houver apetite.

---

## Fase 0 — Ground Truth com knip

### Task 0: Instalar e configurar knip

**Files:**
- Modify: `package.json` (raiz) — devDependency + script
- Create: `knip.json` (raiz)

**Interfaces:**
- Produces: relatório `knip` listando `Unused files`, `Unused exports`, `Unused dependencies` — consumido como fonte da verdade pelas Fases 1–3.

- [ ] **Step 1: Instalar knip como devDependency na raiz**

Run:
```bash
pnpm add -Dw knip
```
Expected: knip aparece em `devDependencies` de `package.json` da raiz.

- [ ] **Step 2: Criar `knip.json` mapeando os entrypoints reais do monorepo**

```json
{
  "$schema": "https://unpkg.com/knip@5/schema.json",
  "workspaces": {
    ".": {
      "entry": ["src/main.tsx", "src/app/**/*.{ts,tsx}", "vite.config.ts"],
      "project": ["src/**/*.{ts,tsx}"]
    },
    "apps/api": {
      "entry": ["src/index.ts", "src/cron.ts"],
      "project": ["src/**/*.ts"]
    }
  },
  "ignore": ["**/*.test.{ts,tsx}", "**/__tests__/**", "src/data/**"]
}
```

- [ ] **Step 3: Adicionar script `deadcode` em `package.json`**

Em `"scripts"` adicionar:
```json
"deadcode": "knip --no-exit-code"
```

- [ ] **Step 4: Rodar e salvar o baseline**

Run:
```bash
pnpm deadcode | tee docs/superpowers/plans/knip-baseline-2026-07-05.txt
```
Expected: arquivo gerado com seções `Unused files`, `Unused exports`, `Unused dependencies`. Confirmar que aponta (ou não) `src/lib/skills/fase4-conteudo/video-exercise-import.ts` e `src/lib/ai/rag-clinical.ts` como unused files.

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml knip.json docs/superpowers/plans/knip-baseline-2026-07-05.txt
git commit -m "chore: add knip for dead-code ground truth"
```

---

## Fase 1 — Drop de `console` no bundle de produção

### Task 1: Remover console.* do build de produção do cliente

**Files:**
- Modify: `apps/web/vite.config.ts` — bloco `build`

**Interfaces:**
- Consumes: nada.
- Produces: bundle de produção sem chamadas `console.log`/`console.debug`. `console.error` e `console.warn` mantidos (úteis para triagem em prod).

- [ ] **Step 1: Verificar o mecanismo correto de drop no Rolldown/Vite 8**

Run:
```bash
npx ctx7@latest docs /vitejs/vite "rolldown build minify drop console pure functions production"
```
Expected: identificar a opção correta (esperado: `build.rolldownOptions.output.minify` com `compress.drop_console` / `pure` ou `esbuild.pure`). NÃO assumir `esbuild.drop` — memória do projeto indica que o minifier default (oxc) o ignora. Usar a API que a doc confirmar.

- [ ] **Step 2: Aplicar a config confirmada, condicionada a `isProduction`**

Exemplo (ajustar ao que a doc do Step 1 confirmar — este é o shape esperado para Rolldown):
```ts
// dentro de build.rolldownOptions.output, ou build.minify conforme a doc:
...(isProduction && {
  minify: {
    compress: {
      drop_console: ["log", "debug"],
    },
  },
}),
```

- [ ] **Step 3: Build de produção e verificar ausência de console.log**

Run:
```bash
pnpm --filter fisioflow-web build && grep -rc "console.log" apps/web/dist/assets/*.js | awk -F: '{s+=$2} END {print "console.log no dist:", s+0}'
```
Expected: `console.log no dist: 0`.

- [ ] **Step 4: Verificar que console.error ainda existe (não removemos triagem)**

Run:
```bash
grep -rl "console.error" apps/web/dist/assets/*.js | head -1
```
Expected: pelo menos 1 arquivo (mantido).

- [ ] **Step 5: Commit**

```bash
git add apps/web/vite.config.ts
git commit -m "build(web): drop console.log/debug from production bundle"
```

---

## Fase 2 — Remover código órfão confirmado por knip

### Task 2: Deletar módulos sem importadores

**Files:**
- Delete: arquivos que a Fase 0 (`knip-baseline`) listou em `Unused files` — candidatos verificados manualmente como órfãos: `src/lib/skills/fase4-conteudo/video-exercise-import.ts`, `src/lib/ai/rag-clinical.ts`, e demais `src/lib/skills/**` órfãos.
- Modify: qualquer barrel `index.ts` que reexporte os arquivos deletados.

**Interfaces:**
- Consumes: `docs/superpowers/plans/knip-baseline-2026-07-05.txt` (lista `Unused files`).
- Produces: árvore sem os módulos mortos; `pnpm deadcode` com menos entradas.

- [ ] **Step 1: Listar os candidatos confirmados pelo knip**

Run:
```bash
grep -A100 "Unused files" docs/superpowers/plans/knip-baseline-2026-07-05.txt | grep -E "src/lib/(skills|ai)/"
```
Expected: lista de arquivos. **Só prosseguir com os que aparecem aqui** — não deletar por intuição.

- [ ] **Step 2: Para cada arquivo, reconfirmar zero importadores fora de si mesmo**

Run (exemplo para um arquivo):
```bash
f="src/lib/ai/rag-clinical.ts"; base=$(basename "$f" .ts); grep -rln "$base" src apps --include="*.ts" --include="*.tsx" | grep -v "$f"
```
Expected: saída vazia. Se aparecer importador, **remover o arquivo da lista de deleção** e investigar.

- [ ] **Step 3: Deletar os arquivos confirmados**

```bash
git rm src/lib/ai/rag-clinical.ts src/lib/skills/fase4-conteudo/video-exercise-import.ts
# + demais confirmados nos Steps 1–2
```

- [ ] **Step 4: Limpar reexports órfãos em barrels**

Run para achar barrels quebrados:
```bash
pnpm type-check 2>&1 | grep -iE "cannot find module|has no exported member" | head
```
Expected: se algum barrel reexportava o deletado, corrigir a linha do `export ... from` correspondente. Meta: saída vazia.

- [ ] **Step 5: type-check limpo dos dois lados**

Run:
```bash
pnpm type-check && pnpm workers:type-check
```
Expected: 0 erros.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: remove orphaned experimental modules (skills/rag-clinical, unwired)"
```

---

## Fase 3 — Fechar TODOs funcionais em código conectado

> Só os TODOs cujo arquivo TEM importadores reais. TDD obrigatório (muda comportamento).

### Task 3: Polaridade de testes no dashboard de evolução

**Files:**
- Modify: `src/hooks/evolution/useEvolutionDashboardData.ts:128`
- Test: `src/hooks/evolution/__tests__/useEvolutionDashboardData.test.ts` (criar se não existir)

**Interfaces:**
- Consumes: catálogo de testes (o mesmo já usado no hook).
- Produces: campo de tendência que respeita polaridade — para testes onde "menor é melhor" (ex.: escala de dor VAS), uma queda no valor conta como **melhora**, não piora.

- [ ] **Step 1: Ler o contexto exato do TODO e o formato do dado**

Run:
```bash
sed -n '100,160p' src/hooks/evolution/useEvolutionDashboardData.ts
```
Expected: entender como a tendência é computada hoje (assume "maior é melhor").

- [ ] **Step 2: Escrever o teste que falha (polaridade invertida)**

```ts
import { computeTrend } from "@/hooks/evolution/useEvolutionDashboardData";

it("trata queda de valor como melhora quando menor-é-melhor (ex.: dor)", () => {
  const trend = computeTrend({ values: [8, 5, 3], lowerIsBetter: true });
  expect(trend.direction).toBe("improving");
});

it("mantém maior-é-melhor por padrão", () => {
  const trend = computeTrend({ values: [3, 5, 8], lowerIsBetter: false });
  expect(trend.direction).toBe("improving");
});
```
> Se a lógica hoje estiver inline (não exportada), o Step 3 extrai `computeTrend` como função pura exportada.

- [ ] **Step 3: Rodar o teste e confirmar que falha**

Run:
```bash
pnpm --dir apps/web exec vitest run src/hooks/evolution/__tests__/useEvolutionDashboardData.test.ts
```
Expected: FAIL (função não existe ou ignora `lowerIsBetter`).

- [ ] **Step 4: Implementar — extrair `computeTrend` puro e usar polaridade**

Extrair a lógica de tendência para `export function computeTrend({ values, lowerIsBetter }: { values: number[]; lowerIsBetter: boolean }): { direction: "improving" | "worsening" | "stable" }` e, no consumidor (linha ~128), passar `lowerIsBetter` a partir da definição do teste. Remover o comentário TODO.

- [ ] **Step 5: Rodar o teste e confirmar passe**

Run:
```bash
pnpm --dir apps/web exec vitest run src/hooks/evolution/__tests__/useEvolutionDashboardData.test.ts
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/evolution/useEvolutionDashboardData.ts src/hooks/evolution/__tests__/useEvolutionDashboardData.test.ts
git commit -m "feat(evolucao): tendência respeita polaridade do teste (menor-é-melhor)"
```

### Task 4: Debounce/persistência parcial no save colaborativo (Worker)

**Files:**
- Modify: `apps/api/src/agents/EvolutionCollaboration.ts:60`
- Test: `apps/api/src/agents/__tests__/EvolutionCollaboration.test.ts` (criar se não existir)

**Interfaces:**
- Consumes: mecanismo de save no Neon já presente no agente.
- Produces: método de save com debounce — múltiplas edições em janela curta resultam em 1 escrita, não N.

- [ ] **Step 1: Ler o contexto do TODO**

Run:
```bash
sed -n '40,90p' apps/api/src/agents/EvolutionCollaboration.ts
```
Expected: entender onde o save é chamado por edição.

- [ ] **Step 2: Escrever teste que falha (N edições → 1 save)**

```ts
it("faz debounce: 3 edições rápidas geram 1 persistência", async () => {
  const saves: number[] = [];
  const agent = makeTestAgent({ onPersist: () => saves.push(Date.now()) });
  agent.onEdit("a"); agent.onEdit("b"); agent.onEdit("c");
  await sleep(600);
  expect(saves.length).toBe(1);
});
```

- [ ] **Step 3: Rodar e confirmar falha**

Run:
```bash
pnpm --dir apps/api exec vitest run src/agents/__tests__/EvolutionCollaboration.test.ts
```
Expected: FAIL (hoje persiste a cada edição, `saves.length === 3`).

- [ ] **Step 4: Implementar debounce (300–500ms) no save; remover TODO**

Introduzir um timer por sessão que agenda o `persist` e cancela o anterior a cada `onEdit`. Persistir também em flush explícito (ex.: fechamento de sessão).

- [ ] **Step 5: Rodar e confirmar passe**

Run:
```bash
pnpm --dir apps/api exec vitest run src/agents/__tests__/EvolutionCollaboration.test.ts
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/agents/EvolutionCollaboration.ts apps/api/src/agents/__tests__/EvolutionCollaboration.test.ts
git commit -m "feat(worker): debounce no save colaborativo de evolução"
```

### Task 5: Dialog de confirmação de exclusão em TemplateManager

**Files:**
- Modify: `src/components/exercises/TemplateManager.tsx:131`
- Test: `src/components/exercises/__tests__/TemplateManager.test.tsx` (criar se não existir)

**Interfaces:**
- Consumes: `AlertDialog` do design system (Radix) já usado no projeto.
- Produces: exclusão de template passa por confirmação; clicar "Excluir" só dispara a mutation após confirmar.

- [ ] **Step 1: Ver o handler atual (hoje é no-op com TODO)**

Run:
```bash
sed -n '120,145p' src/components/exercises/TemplateManager.tsx
```
Expected: `// TODO: task 13 — open delete confirmation dialog`.

- [ ] **Step 2: Teste que falha — confirmação obrigatória**

```tsx
it("não exclui sem confirmação; exclui após confirmar", async () => {
  const onDelete = vi.fn();
  render(<TemplateManager templates={[fakeTemplate]} onDelete={onDelete} />);
  await userEvent.click(screen.getByLabelText(/excluir template/i));
  expect(onDelete).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole("button", { name: /confirmar/i }));
  expect(onDelete).toHaveBeenCalledWith(fakeTemplate.id);
});
```

- [ ] **Step 3: Rodar e confirmar falha**

Run:
```bash
pnpm --dir apps/web exec vitest run src/components/exercises/__tests__/TemplateManager.test.tsx
```
Expected: FAIL.

- [ ] **Step 4: Implementar `AlertDialog` de confirmação; remover TODO**

Substituir o no-op por estado `templateToDelete` + `AlertDialog` (padrão já existente em outros componentes do projeto). PT-BR na cópia.

- [ ] **Step 5: Rodar e confirmar passe**

Run:
```bash
pnpm --dir apps/web exec vitest run src/components/exercises/__tests__/TemplateManager.test.tsx
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/exercises/TemplateManager.tsx src/components/exercises/__tests__/TemplateManager.test.tsx
git commit -m "feat(exercises): confirmação ao excluir template"
```

### Task 6: Safe-area insets no mobile (decisão + execução)

**Files:**
- Modify: `src/hooks/mobile/useSafeAreaInsets.ts:19`

**Interfaces:**
- Produces: insets reais no app Capacitor, ou remoção do stub se o app não usa mais Capacitor safe-area.

- [ ] **Step 1: Decidir escopo — o hook é usado?**

Run:
```bash
grep -rln "useSafeAreaInsets" src --include="*.ts" --include="*.tsx" | grep -v "useSafeAreaInsets.ts"
```
Expected: se **vazio**, o hook é órfão → deletar (mover para Fase 2). Se **tiver consumidores**, seguir Step 2.

- [ ] **Step 2 (se usado): Verificar o plugin correto**

Run:
```bash
npx ctx7@latest library "Capacitor" "safe area insets plugin"
cat package.json | grep -i "safe-area\|@capacitor"
```
Expected: confirmar se `@capacitor-community/safe-area` (ou equivalente) está instalado. Se não estiver, esta task vira "instalar plugin" ou fica registrada como pendência explícita — não deixar TODO silencioso.

- [ ] **Step 3: Implementar com o plugin OU converter o TODO em fallback documentado**

Se o plugin existe: ler insets reais. Se não: retornar `env(safe-area-inset-*)` via CSS custom properties como fallback e substituir o `// TODO` por comentário que declara a limitação real.

- [ ] **Step 4: type-check**

Run:
```bash
pnpm type-check
```
Expected: 0 erros.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/mobile/useSafeAreaInsets.ts
git commit -m "fix(mobile): safe-area insets reais (ou fallback CSS documentado)"
```

---

## Fase 4 — (OPCIONAL) Consolidar polling pesado no WebSocket

> Otimização, **não** bug. O polling atual já pausa em abas ocultas (default TanStack v5). O ganho aqui é reduzir carga quando a aba está **visível** o dia todo (cenário clínica). Fazer só se houver apetite.

### Task 7: Substituir o poll de 5s da conversa ativa por invalidação via RealtimeContext

**Files:**
- Modify: `src/hooks/useMessaging.ts:30`
- Test: `src/hooks/__tests__/useMessaging.test.ts` (criar)

**Interfaces:**
- Consumes: `RealtimeContext` (WebSocket já existente — confirmar canal de mensagens).
- Produces: `useConversationMessages` sem `refetchInterval` fixo; invalida a query ao receber evento WS da conversa.

- [ ] **Step 1: Confirmar que o WS já emite evento de nova mensagem**

Run:
```bash
grep -rn "RealtimeContext\|useRealtime\|new message\|message:new\|whatsapp" src/contexts src/hooks/useRealtime* 2>/dev/null | head
```
Expected: identificar o evento. Se o WS **não** cobre mensagens, **abortar a task** (manter polling é correto) e registrar como não-aplicável.

- [ ] **Step 2: Teste — invalidação ao receber evento WS**

```tsx
it("invalida a query de mensagens ao receber evento realtime da conversa", () => {
  const qc = new QueryClient();
  const invalidate = vi.spyOn(qc, "invalidateQueries");
  renderHook(() => useConversationMessages("p1"), { wrapper: withRealtime(qc) });
  emitRealtime({ type: "message:new", participantId: "p1" });
  expect(invalidate).toHaveBeenCalledWith(
    expect.objectContaining({ queryKey: expect.arrayContaining(["messaging", "messages"]) }),
  );
});
```

- [ ] **Step 3: Rodar e confirmar falha**

Run:
```bash
pnpm --dir apps/web exec vitest run src/hooks/__tests__/useMessaging.test.ts
```
Expected: FAIL.

- [ ] **Step 4: Implementar — trocar `refetchInterval: 5000` por subscription ao evento WS**

Manter um `refetchInterval` de fallback longo (ex.: `30000`) para robustez, mas remover o poll agressivo de 5s. Invalidar a query no handler do evento.

- [ ] **Step 5: Rodar e confirmar passe**

Run:
```bash
pnpm --dir apps/web exec vitest run src/hooks/__tests__/useMessaging.test.ts
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useMessaging.ts src/hooks/__tests__/useMessaging.test.ts
git commit -m "perf(messaging): conversa ativa via WebSocket em vez de poll de 5s"
```

---

## Self-Review

- **Cobertura:** cada item verdadeiro da auditoria corrigida tem task — console.log (Task 1), código órfão (Task 2), TODOs funcionais em código vivo (Tasks 3–6), polling pesado (Task 7, opcional). Itens falsos (#1 background polling, #3 dead components, #4a NPS) foram removidos do escopo por não existirem.
- **Sem placeholders:** cada step tem comando/código concreto. Onde há incerteza real (API de drop do Rolldown, existência do plugin Capacitor, cobertura do WS), o step é uma **verificação via doc/grep**, não um "implementar depois".
- **Dependências:** Fase 2 depende do baseline da Fase 0; Fases 1, 3 são independentes; Fase 4 depende de o WS cobrir mensagens (com abort explícito se não cobrir).
- **Risco:** Fases 0–2 são não-comportamentais (config/deleção). Fase 3 muda comportamento e é 100% TDD. Fase 4 é opcional.
