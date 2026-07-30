# Revisão visual da Avaliação Inicial

## Escopo

Alterar somente `src/pages/AvaliacaoInicial.tsx`, com referência em `design-system-handoff/fisioflow-design-system/project/ui_kits/web/avaliacao-inicial.html`. A rota e o fluxo de formulário atuais permanecem inalterados.

## Requisitos

Preservar formulário, campos, persistência, mapa de dor, goniometria e resultados clínicos. Usar `bg-card`, `border-border`, `bg-primary`, `text-primary-foreground`, `bg-primary/10`, `rounded-xl`/`rounded-2xl`, e `shadow-none`; não usar gradientes decorativos. O avatar usa `bg-primary/10 text-primary`. A navegação de etapas mantém estados ativo, concluído e pendente, com azul, verde semântico e neutro respectivamente. “Finalizar avaliação” é a única ação primária; imprimir é secundária. EVA e testes positivos/negativos preservam cores semânticas.

## Aceite e validação

- Desktop: navegação, formulário e resumo permanecem em três colunas a partir de `lg`; abaixo disso, empilham sem ocultar dados ou ações.
- Foco de teclado permanece visível em controles e a cópia não usa emoji.
- Sem alterações de APIs, validação, dados ou rotas.
- Executar `pnpm type-check` e `pnpm lint`. No momento, o lint global é bloqueado por `scripts/zenfisio-scraper/lib/evaluation-insights.mjs:184:635` (escape Unicode inválido), fora deste escopo; distinguir esse erro preexistente de erros da página.
