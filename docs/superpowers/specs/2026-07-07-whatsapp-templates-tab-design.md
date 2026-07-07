# Aba "Templates" no CRM·WhatsApp — Design

**Data:** 2026-07-07
**Status:** Aprovado (aguardando review do spec)

## Objetivo

Adicionar uma aba **Templates** em `Configurações · CRM·WhatsApp` que permita:

1. Ver os templates existentes e seu status de aprovação na Meta.
2. Criar novos templates pelo front-end e submetê-los à Meta para aprovação.
3. Reduzir a taxa de rejeição da Meta com dicas e validações client-side.

## Contexto / o que já existe

O backend já expõe todos os endpoints necessários (sem mudança de servidor):

- `GET /api/whatsapp/templates` → lista templates armazenados (`fetchTemplates`).
- `POST /api/whatsapp/templates` → submete novo template à Meta; monta `components`
  (HEADER texto / BODY com `example.body_text` / FOOTER / BUTTONS). Aceita
  `{ name, category, language, headerText, body, bodyExample, footer, buttons }`.
- `POST /api/whatsapp/templates/sync` → busca status na Meta (`APPROVED`/`PENDING`/`REJECTED`)
  e atualiza os templates locais (`syncTemplatesWithMeta`).
- `PUT /api/whatsapp/templates/:id` / `DELETE /api/whatsapp/templates/:id`.

O service front (`src/services/whatsapp-api.ts`) já tem `fetchTemplates`,
`createTemplate`, `syncTemplatesWithMeta`, `updateTemplate` e o tipo `Template`
(status normalizado: `APPROVED | PENDING | REJECTED | PAUSED | DISABLED | ACTIVE`).

**Gap:** `createTemplate` não repassa `bodyExample` (a Meta exige exemplos de cada
variável, senão auto-rejeita) e não há `deleteTemplate`.

## Escopo

- **Frontend apenas.** 1 arquivo de página (`src/pages/CrmWhatsAppSettings.tsx`) +
  pequeno ajuste no service (`src/services/whatsapp-api.ts`).
- **Sem migração / sem mudança de backend.**

## Componentes

### 1. Nova aba `templates`

- Posição: entre "Respostas rápidas" e "Funil + Etiquetas". Ícone `LayoutTemplate`
  (lucide). Label "Templates".
- Ao montar a aba (ou ao abrir a página), chama `fetchTemplates()`.
- Botão **"Sincronizar com Meta"** → `syncTemplatesWithMeta()` → recarrega a lista
  e mostra toast com quantos foram atualizados.

### 2. Lista de templates

- Cards sólidos (sem glassmorphism) mostrando: nome, categoria, idioma, preview
  curto do corpo e um **badge de status** colorido:
  - `APPROVED` → verde "Aprovado"
  - `PENDING` → amarelo "Em análise"
  - `REJECTED` → vermelho "Rejeitado" (mostra motivo se a Meta retornar em
    `rejected_reason`/`quality_score`, quando disponível)
  - `PAUSED`/`DISABLED`/`ACTIVE` → neutro
- Ação por card: **excluir** → `deleteTemplate(id)` (remove a cópia local; não
  remove da Meta — comportamento do endpoint atual). Confirmação inline simples
  (sem `window.confirm`, para não travar a UI — usar estado de "confirmar exclusão").
- Sem edição inline: a Meta não permite editar template aprovado; a orientação é
  criar um novo. (Fora de escopo editar o rascunho local.)
- Estado vazio: mensagem + CTA "Novo template".

### 3. Dialog "Novo template" (builder completo + preview)

Campos:

- **Nome** — auto-slug: `toLowerCase()`, espaços/acentos → `_`, remove chars
  inválidos. Regex Meta: `^[a-z0-9_]+$`.
- **Categoria** — `UTILITY` / `MARKETING` / `AUTHENTICATION`, cada uma com uma
  linha explicando quando usar.
- **Idioma** — default `pt_BR`.
- **Cabeçalho** (opcional) — texto.
- **Corpo** — textarea; suporta `{{1}}`, `{{2}}`… As variáveis são detectadas do
  texto (`/\{\{(\d+)\}\}/g`).
- **Exemplos das variáveis** — um input por variável detectada; **obrigatórios**.
- **Rodapé** (opcional) — texto.
- **Botões** (opcional) — lista dinâmica: tipo (`QUICK_REPLY` / `URL` /
  `PHONE_NUMBER`) + texto + (url ou telefone conforme o tipo).
- **Preview ao vivo** — balão estilo WhatsApp ao lado/abaixo, com as variáveis
  substituídas pelos exemplos; renderiza header/body/footer/botões.

Submit → `createTemplate({ name, category, language, headerText, body,
bodyExample, footer, buttons })` → toast "Enviado para aprovação da Meta 🚀"
→ fecha dialog → `fetchTemplates()` para atualizar a lista (o novo entra como
`PENDING`).

### 4. Dicas + validações anti-rejeição

Painel colapsável no topo da aba ("Como aumentar a chance de aprovação"):

- Escolha a **categoria certa**: `UTILITY` = transacional (confirmações, lembretes,
  recibos); `MARKETING` = promocional e exige opt-in; usar UTILITY com teor
  promocional é a causa nº1 de rejeição.
- **Não** colocar variável no **início nem no fim** do corpo (regra da Meta — já
  documentada no projeto no template de retorno médico).
- Toda variável precisa de **exemplo** realista (não deixar `{{1}}` sem amostra).
- Evitar conteúdo vago/placeholder ("Olá {{1}}" sozinho), erros de gramática,
  URLs encurtadas e excesso de emojis/caixa alta.

Validações client-side que **bloqueiam o submit** (com mensagem inline):

- Nome vazio ou fora de `^[a-z0-9_]+$`.
- Corpo vazio.
- Alguma variável sem exemplo preenchido.
- Variável no início (`^\s*\{\{`) ou no fim (`\}\}\s*$`) do corpo.
- Botão `URL` sem url válida / `PHONE_NUMBER` sem telefone.

### 5. Ajuste no service (`whatsapp-api.ts`)

- Adicionar `bodyExample?: string[]` à assinatura de `createTemplate` (repassado no
  body; o backend já lê `body.bodyExample`).
- Adicionar `export async function deleteTemplate(id: string)` → `DELETE
  /api/whatsapp/templates/${id}`.
- Para botão `PHONE_NUMBER`, enviar `phone` (o backend lê `btn.phone`).

## Fluxo de dados

1. Abre a aba → `fetchTemplates()` popula a lista (status vindos do último sync).
2. "Sincronizar com Meta" → `syncTemplatesWithMeta()` → status atualizados.
3. "Novo template" → valida → `createTemplate(...)` → Meta recebe (assíncrono) →
   template aparece `PENDING` → aprovação chega depois (visível após novo sync).
4. Excluir → `deleteTemplate(id)` → some da lista local.

## Tratamento de erros

- `createTemplate` pode retornar erro da Meta (400/422) com `details.error.message`
  (ex.: nome duplicado, exemplo faltando) → mostrar a mensagem da Meta no toast e
  manter o dialog aberto para correção.
- `503` "WhatsApp credentials not configured" → toast orientando configurar a
  conexão na aba Conexão.
- Falha de rede → toast genérico; não fecha o dialog.

## Testes

- Unit (Vitest) para os helpers puros extraídos: `slugifyTemplateName`,
  `extractTemplateVariables`, `validateTemplateDraft` (retorna lista de erros),
  `renderTemplatePreview`.
- Casos: variável no início/fim, exemplo faltando, nome inválido, slug de nome com
  acento/espaço, preview com substituição de variáveis.

## Fora de escopo (YAGNI)

- Editar template já submetido/aprovado.
- Excluir template na Meta (só remove cópia local).
- Templates de mídia (imagem/vídeo/documento no header) — só header de texto.
- Fluxos/carrossel/templates de autenticação com OTP automático.
