# Aparência da Agenda v2 — mais opções + UX/UI

**Data:** 2026-06-22
**Status:** Design aprovado (aguardando review do spec)
**Área:** `/agenda/settings` → aba Aparência
**Relacionado:** `2026-06-22-agenda-settings-redesign-design.md`, `docs/AGENDA.md` §8

## Contexto

A aba Aparência hoje expõe só **2** dos **7** ajustes que o modelo `AgendaViewAppearance`
já persiste por-visão (`cardSize`, `heightScale` expostos; `fontScale`, `opacity`,
`paddingScale`, `timeFontScale`, `typeFontScale` salvos mas sem UI). Além disso o CSS da
agenda (`src/styles/schedule.css`) só consome `--agenda-slot-height` — os demais CSS vars
gerados pelo hook (`--agenda-font-scale`, `--agenda-card-padding`, `--agenda-card-opacity`,
etc.) **não são lidos por ninguém**, então mesmo os 2 que sobram seriam inertes.

Objetivo: oferecer mais opções de personalização e melhorar UX/UI, em 4 baldes:
**A** destravar ajustes finos existentes, **B** presets de 1 clique, **C** conteúdo do card,
**D** comportamento da grade.

### Decisões de escopo (definidas no brainstorm)

- **A** (densidade/altura/fonte/espaçamento/opacidade) = **por-visão** (como hoje).
- **C** (conteúdo do card) e **D** (comportamento da grade) = **globais** (um ajuste para a
  agenda toda). Modelo mais simples, menos chance de inconsistência.
- YAGNI cortados: formato AM/PM (BR é 24h), status como texto no card (já é cor),
  "scroll inicial inteligente" (interage com navegação da agenda viva — risco alto, ganho
  médio; fica para uma v3 se pedido).

## Arquitetura

### Camadas tocadas

1. **Modelo/estado** — `src/hooks/useAgendaAppearance.ts`: adicionar bloco global
   `display` ao `AgendaAppearanceState` (irmão de `global/day/week/month`).
2. **Persistência** — `src/hooks/useAgendaAppearancePersistence.ts`: round-trip do
   `display` (já serializa o state inteiro); expor setter `setDisplay(patch)`.
3. **Backend** — `apps/api/src/routes/agendaAppearance.ts`: estender
   `AgendaAppearanceStateSchema` com `display` opcional **(obrigatório: `zValidator`
   descarta chaves desconhecidas → sem isso o PUT perde o bloco silenciosamente)**. Sem
   migração — coluna `appearance_data` é `jsonb`.
4. **UI da aba** — `src/components/schedule/settings/tabs/AparenciaTab.tsx`: reorganizar em
   3 zonas (Presets / Por-visão / Global) + preview melhorado.
5. **CSS** — `src/styles/schedule.css`: consumir `--agenda-font-scale`,
   `--agenda-card-padding`, `--agenda-card-opacity` nos cards do FullCalendar.
6. **Render/props do calendário** — `src/components/schedule/ScheduleCalendar.tsx`:
   `eventContent` condicional (C) + props do FullCalendar (`nowIndicator`, `businessHours`,
   `weekends`/`hiddenDays`) a partir do bloco `display` (D).

### Tipo `display` (global)

```ts
interface AgendaDisplayOptions {
  // C — conteúdo do card
  showDuration: boolean;   // default true
  showType: boolean;       // default true
  showPhone: boolean;      // default false (privacidade/espaço)
  // D — comportamento da grade
  nowIndicator: boolean;   // default true
  businessHours: boolean;  // default true (sombrear fora do expediente)
  hideSunday: boolean;     // default true (clínica fechada domingo)
}
```

`AgendaAppearanceState` passa a ser `{ global, day?, week?, month?, display? }`.
`display` ausente → usa `DEFAULT_DISPLAY` (retrocompat). Defaults preservam o
comportamento visual atual da agenda (nowIndicator/businessHours já são o padrão de fato).

## Detalhe dos baldes

### A — Ajustes finos (por-visão)

- Novos controles em "Ajustes finos" (bloco recolhível, default recolhido) na visão ativa:
  **Altura** (já existe), **Fonte** (`fontScale` 1–10), **Espaçamento** (`paddingScale`
  1–10), **Opacidade** (`opacity` 0–100). `timeFontScale`/`typeFontScale` ficam fora da UI
  v2 (mantidos no modelo; reavaliar se pedirem) para não sobrecarregar.
- Setters por-visão já existem (`setFontScale`, `setOpacity`, `setPaddingScale`) via
  `useAgendaAppearancePersistence(view)`.
- **CSS (gap a fechar)** em `schedule.css`, nos seletores de card do FullCalendar
  (`.fc-event`, `.fc-event-main`):
  - `font-size: calc(<base> * var(--agenda-font-scale, 1))`
  - `padding: var(--agenda-card-padding, …)`
  - `opacity: var(--agenda-card-opacity, 1)`
  - Os vars já são emitidos por `cssVariables` no hook e aplicados via `style` no container
    do `ScheduleCalendar`.

### B — Presets de 1 clique

- 3 botões no topo. Cada preset aplica um pacote na **visão ativa** (e o botão existente
  "Aplicar a todas" propaga). Implementado com `setAll(patch)` (já existe).

| Preset | cardSize | heightScale | fontScale | paddingScale |
|--------|----------|:--:|:--:|:--:|
| Denso | small | 2 | 4 | 2 |
| Confortável | medium | 5 | 5 | 5 |
| Apresentação | large | 9 | 9 | 8 |

- Indicar preset ativo quando os valores da visão baterem com um preset (badge "Denso"
  etc.); senão "Personalizado".

### C — Conteúdo do card (global)

- Seção "Conteúdo do card" com 3 switches (Duração, Tipo, Telefone) → `setDisplay`.
- `ScheduleCalendar.eventContent`: renderizar duração/tipo/telefone condicionalmente.
  Telefone só aparece se o appointment tiver telefone do paciente disponível no evento;
  caso o campo não exista hoje, incluir no mapeamento de eventos (verificar fonte do dado
  na implementação — pode exigir expor `patient_phone` no objeto do evento).

### D — Comportamento da grade (global)

- Seção "Comportamento" com 3 switches → `setDisplay`.
- Mapear para props do `<FullCalendar>`:
  - `nowIndicator={display.nowIndicator}`
  - `businessHours` = horários de funcionamento (já há fonte em Funcionamento) quando
    `display.businessHours`, senão `false`.
  - `hideSunday` → `hiddenDays={[0]}` quando true (ou `weekends`/`hiddenDays` conforme o
    que a agenda já usa). Conferir interação com a visão Dia (domingo selecionado).

### UI/UX da aba (transversal)

- 3 zonas visuais (ver ASCII no design): Presets → Por-visão (com seletor Semana/Dia/Mês
  já existente) → Global. Superfícies sólidas, azul Activity, sem glassmorphism.
- Preview reflete fonte + espaçamento + opacidade + altura (não só densidade).
- Manter "Restaurar padrões" (reset A + display) e "Herdar global"/"Aplicar a todas".
- Auto-save client-side mantido (contrato de save inerte via `useRegisterTabHandle`).

## Componentes (limites e responsabilidade)

- `useAgendaAppearance` — fonte da verdade do state + `effectiveForView` + `display` +
  setters. Não conhece UI.
- `useAgendaAppearancePersistence` — sync/clamp/debounce; expõe `display` + `setDisplay`.
- `AparenciaTab` — só orquestra UI; deriva preset ativo; chama setters. Continua usando
  sub-componentes com `key={activeView}` e hook de view **fixa** (não condicionar hooks).
- `ScheduleCalendar` — consome `display` para `eventContent` e props; não escreve config.
- `schedule.css` — consome CSS vars; sem lógica.

## Tratamento de erros / retrocompat

- `display` ausente no state salvo (usuários atuais) → `DEFAULT_DISPLAY`.
- Backend clampa números de A; `display` é booleano (sem clamp, mas validar tipos no schema).
- Falha de PUT → rollback + toast (infra já existente em `useAgendaAppearancePersistence`).
- CSS vars com fallback (`var(--x, default)`) → agenda nunca quebra se faltar var.

## Testes

- `useAgendaAppearance`: defaults de `display`, `setDisplay` merge, retrocompat (state sem
  `display`).
- `useAgendaAppearancePersistence`: round-trip de `display` no PUT (estender os testes
  existentes).
- Backend `agendaAppearance.test.ts`: PUT com `display` persiste e volta no GET; PUT sem
  `display` continua válido.
- `AparenciaTab` (novo): preset aplica valores; toggle de `display` chama setter; troca de
  visão não muda contagem de hooks (render sem warning).
- Validação visual em produção ao final (A: fonte/opacidade refletem; C: telefone aparece;
  D: nowIndicator/businessHours/hideSunday refletem; cada visão independente).

## Fora de escopo (v2)

- Cor por status/tipo/profissional (balde E) — subsistema separado (`statusConfig`).
- `timeFontScale`/`typeFontScale` na UI.
- Scroll inicial inteligente.
- Formato AM/PM, status textual no card.
