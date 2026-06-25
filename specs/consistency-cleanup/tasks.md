# Tarefas: Limpeza de Consistência do Projeto

## Estado atual

- ✅ Type-check web: sem erros
- ✅ Type-check api: sem erros (C1 `IG_GRAPH` já corrigido)
- ✅ Testes: 1594 passando (1186 web + 408 api)
- ⚠️ Lint: 0 errors, 12 warnings restantes

---

## Fase 1 — Correções rápidas (prefixo `_` em não-usados)

- [ ] T001 Corrigir `catch` sem uso em `src/components/evolution/blocks/EvolutionBlocksEditor.tsx:113` — `catch (e)` → `catch (_e)`
- [ ] T002 Corrigir `catch` sem uso em `src/pages/automations/AutomationBuilderPage.tsx:127` — `catch (_e)` → `catch { }` (sem parâmetro)
- [ ] T003 Corrigir `catch` sem uso em `src/pages/automations/AutomationBuilderPage.tsx:214` — mesmo padrão
- [ ] T004 Corrigir variável `meta` não usada em `src/pages/automations/AutomationBuilderPage.tsx:365` — prefixar com `_`
- [ ] T005 Corrigir variável `isFetching` não usada em `src/pages/CrmWhatsApp.tsx:506` — prefixar com `_`
- [ ] T006 Corrigir parâmetro `newTransaction` não usado em `src/hooks/useFinancialPage.ts:113` — prefixar com `_`
- [ ] T007 Corrigir parâmetro `c` não usado em `apps/api/src/routes/webchat.ts:165` — prefixar com `_`

## Fase 2 — Remover imports/functions não usados

- [ ] T008 Remover `Loader2` importado mas não usado em `src/components/evolution/v2-improved/SessionTimelineStrip.tsx:16`
- [ ] T009 Remover função `painLabel` declarada mas não usada em `src/components/evolution/v2-improved/SessionTimelineStrip.tsx:46`
- [ ] T010 Remover função `isUnsupportedTransactionError` declarada mas não usada em `apps/api/src/routes/import.ts:124`
- [ ] T011 Remover função `fetchEventDetail` declarada mas não usada em `scripts/zenfisio-scraper/auto_extract.js:34`

## Fase 3 — Ajustes de estilo (unicorn warnings)

- [ ] T012 Remover fallback vazio em spread `apps/api/src/routes/whatsapp-inbox.ts:76` — `...((obj as object) ?? {})` → `...(obj as object)`
- [ ] T013 Remover fallback vazio em spread `apps/api/src/routes/whatsapp-inbox.ts:2047` — mesmo padrão

---

## Dependências

- Fase 1, 2 e 3 são **independentes** — podem ser executadas em paralelo

## Arquivos afetados

| Arquivo | Tarefas |
|---------|---------|
| `src/components/evolution/blocks/EvolutionBlocksEditor.tsx` | T001 |
| `src/pages/automations/AutomationBuilderPage.tsx` | T002, T003, T004 |
| `src/pages/CrmWhatsApp.tsx` | T005 |
| `src/hooks/useFinancialPage.ts` | T006 |
| `apps/api/src/routes/webchat.ts` | T007 |
| `src/components/evolution/v2-improved/SessionTimelineStrip.tsx` | T008, T009 |
| `apps/api/src/routes/import.ts` | T010 |
| `scripts/zenfisio-scraper/auto_extract.js` | T011 |
| `apps/api/src/routes/whatsapp-inbox.ts` | T012, T013 |

## Validação

Após todas as correções:
```bash
pnpm lint  # deve mostrar 0 errors e 0 warnings
```
