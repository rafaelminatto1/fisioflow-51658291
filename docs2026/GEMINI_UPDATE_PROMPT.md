# Prompt para Gemini CLI — Atualizar Documentação FisioFlow (Março 2026)

Use este prompt no Gemini CLI para atualizar a documentação e as regras/memória do Gemini
com as mudanças de major versions realizadas nesta sessão.

---

## PROMPT PARA O GEMINI CLI

```
Você é o assistente técnico do projeto FisioFlow. Preciso que você atualize a documentação
e suas próprias regras/memória com base nas seguintes migrações de major versions que foram
realizadas com sucesso em Março de 2026.

## Migrações Realizadas

### 1. Tailwind CSS v3 → v4
**O que mudou:**
- Plugin: agora usa `@tailwindcss/vite` no `apps/web/vite.config.ts` (não mais via PostCSS)
- `postcss.config.js` só contém `autoprefixer` (tailwindcss removido)
- Configuração CSS-first: `src/index.css` usa bloco `@theme { ... }` nativo (sem `tailwind.config.js`)
- Arquivos CSS secundários precisam de `@reference "../index.css"` no topo para usar Tailwind em `@apply`
- Nomes de `@utility` devem ser alfanuméricos (sem `:` ou `/`)
- Utilities depreciadas: `border-opacity-N` → `border-X/N`, `bg-opacity-N` → `bg-X/N`
- Custom CSS classes (ex: `animate-fade-in-up`) NÃO funcionam em `@apply` — inlinar o valor CSS diretamente

**Arquivos-chave modificados:**
- `apps/web/vite.config.ts` — plugin tailwindcss()
- `apps/web/postcss.config.js` — removido tailwindcss entry
- `src/index.css` — @theme block completo com cores, breakpoints, animações, @utility
- `src/styles/schedule.css` — @reference + inlined animations

### 2. lucide-react v0.x → v1
**O que mudou:**
- Todos os brand icons foram removidos: Instagram, Facebook, Linkedin, Twitter, Youtube
- Substituições adotadas no projeto:
  - Instagram → Camera
  - Facebook → Users
  - Linkedin → Briefcase
  - Twitter → MessageCircle
  - Youtube → Share2

**Arquivos corrigidos:**
- `src/pages/marketing/ContentGenerator.tsx`
- `src/components/wiki/WikiEditor.tsx`
- `src/components/ui/RichTextToolbar.tsx`
- `src/components/marketing/MarketingConsentForm.tsx`

### 3. react-resizable-panels v3 → v4
**O que mudou:**
- `PanelGroup` → `Group`
- `PanelResizeHandle` → `Separator`

**Arquivo corrigido:**
- `src/components/ui/resizable.tsx`

### 4. Zod v3 → v4
**O que mudou:**
- `ZodError.errors` → `ZodError.issues` (renomeado)
- `z.number({ invalid_type_error: "..." })` → `z.number({ error: "..." })`

**Arquivos corrigidos:**
- `src/lib/validation-utils.ts`
- `src/lib/validation/dynamicCompare.ts`
- `src/lib/validations/__tests__/validations.test.ts`
- `src/components/admin/InvitationsManager.tsx`
- `src/components/admin/InviteUserModal.tsx`
- `src/components/evolution/TreatmentCycleFormModal.tsx`

### 5. Recharts v2 → v3
**O que mudou:**
- `Formatter` type agora tem 5 parâmetros — usar `// @ts-expect-error -- recharts v3 formatter type`
- `TooltipProps<N, S>` não expõe mais `payload`/`label` diretamente — usar `TooltipContentProps<N, S>`
- `MouseHandlerDataParam.activePayload` removido — cast `data` to `any`

**Arquivos corrigidos (9 total):**
- `src/components/ai/ActivityLabChart.tsx`
- `src/components/ai/ActivityLabComparisonChart.tsx`
- `src/components/analytics/PatientRetention.tsx`
- `src/components/metrics/MetricsTrendChart.tsx`
- `src/components/system/PerformanceDashboard.tsx`
- `src/components/patients/analytics/PatientAnalyticsDashboard.tsx`
- `src/components/dashboard/RevenueChart.tsx`
- `src/components/admin/gamification/EngagementReports.tsx`
- `src/components/admin/gamification/GamificationDashboard.tsx`
- `src/components/analysis/panels/GoniometerPanel.tsx`

### 6. React Router v7 — Modo Library (CRÍTICO)
**O que mudou:**
- O projeto usa **library mode** (`createBrowserRouter` + `RouterProvider` em `src/routes/router.tsx`)
- O plugin `reactRouter()` de `@react-router/dev/vite` é para **framework mode** (file-based routing Remix-style) — NÃO deve ser usado neste projeto
- `react-router` (pacote base) adicionado ao root `package.json` para resolver imports de `react-router` direto em `src/`
- `react-router.config.ts` existe em `apps/web/` mas é ignorado sem o plugin ativo
- Build: `pnpm --filter fisioflow-web build` ✅ 0 erros

### 7. Vite 8 + Rolldown
**Stack atual:**
- Vite 8.0.2 + Rolldown 1.0.0-rc.11
- Para code splitting: usar `rolldownOptions.output.codeSplitting: { groups: [...] }` (não `manualChunks`)
- Resolução de módulos: pacotes usados em `src/` (root) mas instalados em subpacote precisam estar no root `package.json`

## Ação Solicitada

1. **Atualize sua memória/regras** com todas as informações acima para que em futuras sessões você:
   - Saiba que Tailwind v4 usa `@tailwindcss/vite` e `@theme {}` CSS-first
   - Saiba que lucide-react v1 não tem brand icons (Instagram etc.) — use as substituições listadas
   - Saiba que `ZodError.errors` não existe mais — é `.issues`
   - Saiba que Recharts v3 formatters precisam de @ts-expect-error
   - Saiba que este projeto usa React Router em LIBRARY MODE (não framework mode)
   - Nunca sugira `reactRouter()` plugin para este projeto

2. **Atualize o arquivo de documentação** `docs2026/MIGRACAO_CLOUDFLARE_NEON_2026.md` adicionando
   uma seção "## Major Version Upgrades (Março 2026)" com um resumo das mudanças acima.

3. **Verifique se há outros arquivos de documentação** que mencionam as versões antigas
   (tailwind.config.js, lucide brand icons, recharts TooltipProps, react-router framework mode)
   e atualize-os.

Confirme cada ação realizada.
```

---

## Como usar

```bash
# No terminal, na raiz do projeto:
gemini < docs2026/GEMINI_UPDATE_PROMPT.md

# Ou diretamente:
cat docs2026/GEMINI_UPDATE_PROMPT.md | gemini
```

---

## Resumo das mudanças para referência rápida

| Pacote | Versão antiga | Versão nova | Mudança principal |
|--------|--------------|-------------|-------------------|
| tailwindcss | v3 | v4 | @tailwindcss/vite, CSS @theme, @reference |
| lucide-react | v0.x | v1 | Brand icons removidos |
| react-resizable-panels | v3 | v4 | PanelGroup→Group, PanelResizeHandle→Separator |
| zod | v3 | v4 | .errors→.issues, invalid_type_error→error |
| recharts | v2 | v3 | Formatter 5 params, TooltipContentProps |
| react-router | v6 | v7 | Library mode (createBrowserRouter), NÃO framework mode |
| vite | v7 | v8 | Rolldown bundler, rolldownOptions |
