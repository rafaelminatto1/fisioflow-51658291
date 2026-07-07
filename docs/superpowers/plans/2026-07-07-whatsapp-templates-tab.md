# Aba "Templates" no CRM·WhatsApp — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar uma aba "Templates" em `Configurações · CRM·WhatsApp` para ver templates + status na Meta, criar novos e submetê-los para aprovação, com dicas e validações anti-rejeição.

**Architecture:** Frontend-only. Lógica pura (slug, extração de variáveis, validação, preview) num módulo testável isolado; o service `whatsapp-api.ts` ganha `bodyExample` + `deleteTemplate`; a página `CrmWhatsAppSettings.tsx` ganha a aba com lista, botão de sync, e um dialog builder com preview. Backend já existente, sem mudanças.

**Tech Stack:** React 19, Vite, Tailwind v4, Shadcn/Radix (Tabs/Dialog/Badge/Collapsible), Vitest.

## Global Constraints

- TypeScript strict; sem comentários supérfluos.
- UI em Português (PT-BR).
- Sem glassmorphism (sem `backdrop-blur`/transparências) — superfícies sólidas (`bg-card`, `border-border`).
- Não usar `window.confirm`/`alert` (trava a UI) — usar estado de confirmação.
- Categorias Meta exatas: `UTILITY` | `MARKETING` | `AUTHENTICATION`.
- Regra Meta: variável **não** pode estar no início nem no fim do corpo; toda variável precisa de exemplo.
- Nome do template: `^[a-z0-9_]+$`.
- Endpoints já existentes (não alterar backend): `GET/POST /api/whatsapp/templates`, `POST /api/whatsapp/templates/sync`, `DELETE /api/whatsapp/templates/:id`.
- Sem push na `main` (auto-deploy) — só commits locais; o usuário decide o push.

---

## File Structure

- **Create** `src/lib/whatsapp/templateValidation.ts` — helpers puros (slug, variáveis, validação, preview).
- **Create** `src/lib/whatsapp/__tests__/templateValidation.test.ts` — testes dos helpers.
- **Modify** `src/services/whatsapp-api.ts` — `bodyExample` em `createTemplate`; nova `deleteTemplate`; botão `PHONE_NUMBER` com `phone`.
- **Create** `src/components/crm/TemplateBuilderDialog.tsx` — dialog builder + preview + dicas + validação.
- **Modify** `src/pages/CrmWhatsAppSettings.tsx` — nova aba `templates` (lista + sync + delete + abre o dialog).

---

### Task 1: Helpers puros de template (slug, variáveis, validação, preview)

**Files:**
- Create: `src/lib/whatsapp/templateValidation.ts`
- Test: `src/lib/whatsapp/__tests__/templateValidation.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `slugifyTemplateName(name: string): string`
  - `extractPositionalVariables(body: string): number[]` — números únicos, ordenados, de `{{1}}`, `{{2}}`…
  - `type TemplateButtonDraft = { type: "QUICK_REPLY" | "URL" | "PHONE_NUMBER"; text: string; url?: string; phone?: string }`
  - `type TemplateDraft = { name: string; category: "UTILITY" | "MARKETING" | "AUTHENTICATION"; language: string; headerText?: string; body: string; examples: Record<number, string>; footer?: string; buttons: TemplateButtonDraft[] }`
  - `validateTemplateDraft(draft: TemplateDraft): string[]` — lista de mensagens de erro (vazia = válido).
  - `renderTemplatePreview(body: string, examples: Record<number, string>): string` — substitui `{{n}}` pelo exemplo (ou mantém `{{n}}` se sem exemplo).

- [ ] **Step 1: Escrever os testes que falham**

```ts
// src/lib/whatsapp/__tests__/templateValidation.test.ts
import { describe, expect, it } from "vitest";
import {
  slugifyTemplateName,
  extractPositionalVariables,
  validateTemplateDraft,
  renderTemplatePreview,
  type TemplateDraft,
} from "../templateValidation";

const baseDraft = (over: Partial<TemplateDraft> = {}): TemplateDraft => ({
  name: "retorno_medico",
  category: "UTILITY",
  language: "pt_BR",
  body: "Olá {{1}}, seu retorno está agendado para {{2}}.",
  examples: { 1: "Maria", 2: "10/07 às 09h" },
  buttons: [],
  ...over,
});

describe("slugifyTemplateName", () => {
  it("normaliza acentos, espaços e maiúsculas", () => {
    expect(slugifyTemplateName("Retorno Médico 2")).toBe("retorno_medico_2");
  });
  it("remove caracteres inválidos e underscores repetidos", () => {
    expect(slugifyTemplateName("  Olá!! mundo--x ")).toBe("ola_mundo_x");
  });
});

describe("extractPositionalVariables", () => {
  it("retorna números únicos e ordenados", () => {
    expect(extractPositionalVariables("{{2}} oi {{1}} {{2}}")).toEqual([1, 2]);
  });
  it("retorna vazio sem variáveis", () => {
    expect(extractPositionalVariables("sem variaveis")).toEqual([]);
  });
});

describe("validateTemplateDraft", () => {
  it("aceita um rascunho válido", () => {
    expect(validateTemplateDraft(baseDraft())).toEqual([]);
  });
  it("rejeita nome fora de [a-z0-9_]", () => {
    expect(validateTemplateDraft(baseDraft({ name: "Retorno Médico" }))).toContain(
      "O nome deve conter apenas letras minúsculas, números e _ (use o botão de gerar).",
    );
  });
  it("rejeita corpo vazio", () => {
    expect(validateTemplateDraft(baseDraft({ body: "   ", examples: {} }))).toContain(
      "O corpo da mensagem é obrigatório.",
    );
  });
  it("rejeita variável no início do corpo", () => {
    const errs = validateTemplateDraft(
      baseDraft({ body: "{{1}} bem-vindo", examples: { 1: "Maria" } }),
    );
    expect(errs).toContain("A mensagem não pode começar nem terminar com uma variável — a Meta rejeita.");
  });
  it("rejeita variável no fim do corpo", () => {
    const errs = validateTemplateDraft(
      baseDraft({ body: "Olá, tudo bem {{1}}", examples: { 1: "Maria" } }),
    );
    expect(errs).toContain("A mensagem não pode começar nem terminar com uma variável — a Meta rejeita.");
  });
  it("exige exemplo para cada variável", () => {
    const errs = validateTemplateDraft(baseDraft({ examples: { 1: "Maria" } }));
    expect(errs).toContain("Preencha um exemplo para a variável {{2}}.");
  });
  it("rejeita botão URL sem url", () => {
    const errs = validateTemplateDraft(
      baseDraft({ buttons: [{ type: "URL", text: "Site", url: "" }] }),
    );
    expect(errs).toContain('O botão "Site" precisa de uma URL válida.');
  });
  it("rejeita botão de telefone sem número", () => {
    const errs = validateTemplateDraft(
      baseDraft({ buttons: [{ type: "PHONE_NUMBER", text: "Ligar", phone: "" }] }),
    );
    expect(errs).toContain('O botão "Ligar" precisa de um telefone.');
  });
});

describe("renderTemplatePreview", () => {
  it("substitui variáveis pelos exemplos", () => {
    expect(
      renderTemplatePreview("Olá {{1}}, dia {{2}}", { 1: "Maria", 2: "10/07" }),
    ).toBe("Olá Maria, dia 10/07");
  });
  it("mantém {{n}} quando não há exemplo", () => {
    expect(renderTemplatePreview("Olá {{1}}", {})).toBe("Olá {{1}}");
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm vitest run src/lib/whatsapp/__tests__/templateValidation.test.ts`
Expected: FAIL — `Cannot find module '../templateValidation'`.

- [ ] **Step 3: Implementar o módulo**

```ts
// src/lib/whatsapp/templateValidation.ts
export type TemplateButtonDraft = {
  type: "QUICK_REPLY" | "URL" | "PHONE_NUMBER";
  text: string;
  url?: string;
  phone?: string;
};

export type TemplateDraft = {
  name: string;
  category: "UTILITY" | "MARKETING" | "AUTHENTICATION";
  language: string;
  headerText?: string;
  body: string;
  examples: Record<number, string>;
  footer?: string;
  buttons: TemplateButtonDraft[];
};

export function slugifyTemplateName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
}

export function extractPositionalVariables(body: string): number[] {
  const found = new Set<number>();
  for (const match of body.matchAll(/\{\{\s*(\d+)\s*\}\}/g)) {
    found.add(Number(match[1]));
  }
  return [...found].sort((a, b) => a - b);
}

export function validateTemplateDraft(draft: TemplateDraft): string[] {
  const errors: string[] = [];
  const body = draft.body.trim();

  if (!/^[a-z0-9_]+$/.test(draft.name)) {
    errors.push("O nome deve conter apenas letras minúsculas, números e _ (use o botão de gerar).");
  }
  if (!body) {
    errors.push("O corpo da mensagem é obrigatório.");
  } else if (/^\s*\{\{\s*\d+\s*\}\}/.test(draft.body) || /\{\{\s*\d+\s*\}\}\s*$/.test(draft.body)) {
    errors.push("A mensagem não pode começar nem terminar com uma variável — a Meta rejeita.");
  }

  for (const index of extractPositionalVariables(draft.body)) {
    if (!draft.examples[index]?.trim()) {
      errors.push(`Preencha um exemplo para a variável {{${index}}}.`);
    }
  }

  for (const button of draft.buttons) {
    if (button.type === "URL" && !button.url?.trim()) {
      errors.push(`O botão "${button.text || "sem nome"}" precisa de uma URL válida.`);
    }
    if (button.type === "PHONE_NUMBER" && !button.phone?.trim()) {
      errors.push(`O botão "${button.text || "sem nome"}" precisa de um telefone.`);
    }
  }

  return errors;
}

export function renderTemplatePreview(body: string, examples: Record<number, string>): string {
  return body.replace(/\{\{\s*(\d+)\s*\}\}/g, (whole, digits) => {
    const example = examples[Number(digits)];
    return example?.trim() ? example : whole;
  });
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `pnpm vitest run src/lib/whatsapp/__tests__/templateValidation.test.ts`
Expected: PASS (todos).

- [ ] **Step 5: Commit**

```bash
git add src/lib/whatsapp/templateValidation.ts src/lib/whatsapp/__tests__/templateValidation.test.ts
git commit -m "feat(crm): helpers puros de validação/preview de templates WhatsApp

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Service — `bodyExample`, `deleteTemplate`, botão de telefone

**Files:**
- Modify: `src/services/whatsapp-api.ts` (função `createTemplate` ~789-803; adicionar `deleteTemplate` logo após)
- Test: `src/services/__tests__/whatsapp-api.test.ts` (adicionar bloco `describe("template payload", …)`)

**Interfaces:**
- Consumes: `request` de `@/api/v2/base` (já importado no arquivo).
- Produces:
  - `createTemplate(data: { name; category: "MARKETING" | "UTILITY" | "AUTHENTICATION"; language?: string; headerText?: string; body: string; bodyExample?: string[]; footer?: string; buttons?: Array<{ type: string; text: string; url?: string; phone?: string }> })`
  - `deleteTemplate(id: string): Promise<void>`

- [ ] **Step 1: Escrever o teste que falha**

Adicionar ao fim de `src/services/__tests__/whatsapp-api.test.ts`:

```ts
import { buildCreateTemplatePayload } from "../whatsapp-api";

describe("buildCreateTemplatePayload", () => {
  it("inclui bodyExample e mantém phone nos botões", () => {
    const payload = buildCreateTemplatePayload({
      name: "retorno_medico",
      category: "UTILITY",
      body: "Olá {{1}}",
      bodyExample: ["Maria"],
      buttons: [{ type: "PHONE_NUMBER", text: "Ligar", phone: "+5511998888888" }],
    });
    expect(payload).toMatchObject({
      name: "retorno_medico",
      category: "UTILITY",
      body: "Olá {{1}}",
      bodyExample: ["Maria"],
      buttons: [{ type: "PHONE_NUMBER", text: "Ligar", phone: "+5511998888888" }],
    });
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm vitest run src/services/__tests__/whatsapp-api.test.ts`
Expected: FAIL — `buildCreateTemplatePayload` não exportado.

- [ ] **Step 3: Implementar**

Substituir a função `createTemplate` (linhas ~789-803) por (extrai um builder puro e adiciona `deleteTemplate`):

```ts
export function buildCreateTemplatePayload(data: {
  name: string;
  category: "MARKETING" | "UTILITY" | "AUTHENTICATION";
  language?: string;
  headerText?: string;
  body: string;
  bodyExample?: string[];
  footer?: string;
  buttons?: Array<{ type: string; text: string; url?: string; phone?: string }>;
}) {
  return {
    name: data.name,
    category: data.category,
    language: data.language ?? "pt_BR",
    ...(data.headerText ? { headerText: data.headerText } : {}),
    body: data.body,
    ...(data.bodyExample?.length ? { bodyExample: data.bodyExample } : {}),
    ...(data.footer ? { footer: data.footer } : {}),
    ...(data.buttons?.length ? { buttons: data.buttons } : {}),
  };
}

export async function createTemplate(data: {
  name: string;
  category: "MARKETING" | "UTILITY" | "AUTHENTICATION";
  language?: string;
  headerText?: string;
  body: string;
  bodyExample?: string[];
  footer?: string;
  buttons?: Array<{ type: string; text: string; url?: string; phone?: string }>;
}) {
  const res = await request<{ data: unknown }>("/api/whatsapp/templates", {
    method: "POST",
    body: JSON.stringify(buildCreateTemplatePayload(data)),
  });
  return unwrapData(res);
}

export async function deleteTemplate(id: string): Promise<void> {
  await request(`/api/whatsapp/templates/${id}`, { method: "DELETE" });
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `pnpm vitest run src/services/__tests__/whatsapp-api.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/whatsapp-api.ts src/services/__tests__/whatsapp-api.test.ts
git commit -m "feat(crm): createTemplate com bodyExample + deleteTemplate

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Dialog builder de template (form + preview + dicas)

**Files:**
- Create: `src/components/crm/TemplateBuilderDialog.tsx`

**Interfaces:**
- Consumes: `createTemplate` (Task 2); `slugifyTemplateName`, `extractPositionalVariables`, `validateTemplateDraft`, `renderTemplatePreview`, `TemplateDraft`, `TemplateButtonDraft` (Task 1); `Dialog*` de `@/components/ui/dialog`; `useToast` de `@/hooks/use-toast`.
- Produces: `export function TemplateBuilderDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (v: boolean) => void; onCreated: () => void })`

- [ ] **Step 1: Criar o componente**

```tsx
// src/components/crm/TemplateBuilderDialog.tsx
import { useMemo, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { createTemplate } from "@/services/whatsapp-api";
import {
  slugifyTemplateName,
  extractPositionalVariables,
  validateTemplateDraft,
  renderTemplatePreview,
  type TemplateButtonDraft,
  type TemplateDraft,
} from "@/lib/whatsapp/templateValidation";

const CATEGORY_HELP: Record<TemplateDraft["category"], string> = {
  UTILITY: "Transacional: confirmações, lembretes, recibos. Não pode ter teor promocional.",
  MARKETING: "Promoções e novidades. Exige opt-in do paciente e tem regras mais rígidas.",
  AUTHENTICATION: "Códigos de verificação (OTP). Use só para autenticação.",
};

const TIPS = [
  "Escolha a categoria certa: usar UTILITY com teor promocional é a causa nº1 de rejeição.",
  "Não comece nem termine a mensagem com uma variável ({{1}}).",
  "Dê um exemplo realista para cada variável — nada de deixar {{1}} sem amostra.",
  "Evite texto vago, erros de gramática, URLs encurtadas e excesso de emoji/CAIXA ALTA.",
];

function emptyDraft(): TemplateDraft {
  return {
    name: "",
    category: "UTILITY",
    language: "pt_BR",
    headerText: "",
    body: "",
    examples: {},
    footer: "",
    buttons: [],
  };
}

export function TemplateBuilderDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
}) {
  const { toast } = useToast();
  const [draft, setDraft] = useState<TemplateDraft>(emptyDraft);
  const [submitting, setSubmitting] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  const variables = useMemo(() => extractPositionalVariables(draft.body), [draft.body]);
  const errors = useMemo(() => validateTemplateDraft(draft), [draft]);
  const preview = useMemo(
    () => renderTemplatePreview(draft.body, draft.examples),
    [draft.body, draft.examples],
  );

  const patch = (over: Partial<TemplateDraft>) => setDraft((d) => ({ ...d, ...over }));

  const addButton = () =>
    patch({ buttons: [...draft.buttons, { type: "QUICK_REPLY", text: "" }] });
  const patchButton = (i: number, over: Partial<TemplateButtonDraft>) =>
    patch({ buttons: draft.buttons.map((b, idx) => (idx === i ? { ...b, ...over } : b)) });
  const removeButton = (i: number) =>
    patch({ buttons: draft.buttons.filter((_, idx) => idx !== i) });

  const reset = () => {
    setDraft(emptyDraft());
    setShowErrors(false);
  };

  const handleSubmit = async () => {
    if (errors.length) {
      setShowErrors(true);
      return;
    }
    setSubmitting(true);
    try {
      const orderedExamples = variables.map((n) => draft.examples[n] ?? "");
      await createTemplate({
        name: draft.name,
        category: draft.category,
        language: draft.language,
        headerText: draft.headerText?.trim() || undefined,
        body: draft.body,
        bodyExample: orderedExamples.length ? orderedExamples : undefined,
        footer: draft.footer?.trim() || undefined,
        buttons: draft.buttons.length
          ? draft.buttons.map((b) => ({
              type: b.type,
              text: b.text,
              ...(b.type === "URL" ? { url: b.url } : {}),
              ...(b.type === "PHONE_NUMBER" ? { phone: b.phone } : {}),
            }))
          : undefined,
      });
      toast({ title: "Enviado para aprovação da Meta 🚀", description: "O status aparece como “Em análise” até a Meta responder." });
      reset();
      onOpenChange(false);
      onCreated();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "A Meta recusou o envio",
        description: err instanceof Error ? err.message : "Verifique os campos e tente novamente.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Novo template</DialogTitle>
          <DialogDescription>
            O template é enviado para a Meta aprovar antes de poder ser usado.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 md:grid-cols-2">
          {/* ── Form ── */}
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <div className="flex gap-2">
                <Input
                  value={draft.name}
                  placeholder="retorno_medico"
                  onChange={(e) => patch({ name: e.target.value })}
                />
                <Button type="button" variant="outline" onClick={() => patch({ name: slugifyTemplateName(draft.name) })}>
                  Formatar
                </Button>
              </div>
            </div>

            <div>
              <Label>Categoria</Label>
              <Select value={draft.category} onValueChange={(v) => patch({ category: v as TemplateDraft["category"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="UTILITY">Utilidade (transacional)</SelectItem>
                  <SelectItem value="MARKETING">Marketing (promocional)</SelectItem>
                  <SelectItem value="AUTHENTICATION">Autenticação (OTP)</SelectItem>
                </SelectContent>
              </Select>
              <p className="mt-1 text-xs text-muted-foreground">{CATEGORY_HELP[draft.category]}</p>
            </div>

            <div>
              <Label>Cabeçalho (opcional)</Label>
              <Input value={draft.headerText} onChange={(e) => patch({ headerText: e.target.value })} placeholder="Ex.: Retorno agendado" />
            </div>

            <div>
              <Label>Corpo</Label>
              <Textarea
                rows={4}
                value={draft.body}
                onChange={(e) => patch({ body: e.target.value })}
                placeholder="Olá {{1}}, seu retorno está agendado para {{2}}."
              />
              <p className="mt-1 text-xs text-muted-foreground">Use {"{{1}}"}, {"{{2}}"}… para variáveis.</p>
            </div>

            {variables.length > 0 && (
              <div className="space-y-2">
                <Label>Exemplos das variáveis</Label>
                {variables.map((n) => (
                  <div key={n} className="flex items-center gap-2">
                    <span className="w-10 text-sm text-muted-foreground">{`{{${n}}}`}</span>
                    <Input
                      value={draft.examples[n] ?? ""}
                      onChange={(e) => patch({ examples: { ...draft.examples, [n]: e.target.value } })}
                      placeholder="Ex.: Maria"
                    />
                  </div>
                ))}
              </div>
            )}

            <div>
              <Label>Rodapé (opcional)</Label>
              <Input value={draft.footer} onChange={(e) => patch({ footer: e.target.value })} placeholder="Ex.: Activity Fisioterapia" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Botões (opcional)</Label>
                <Button type="button" size="sm" variant="outline" onClick={addButton}>
                  <Plus className="mr-1 h-3.5 w-3.5" /> Botão
                </Button>
              </div>
              {draft.buttons.map((b, i) => (
                <div key={i} className="space-y-2 rounded-lg border border-border p-2">
                  <div className="flex gap-2">
                    <Select value={b.type} onValueChange={(v) => patchButton(i, { type: v as TemplateButtonDraft["type"] })}>
                      <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="QUICK_REPLY">Resposta rápida</SelectItem>
                        <SelectItem value="URL">Abrir link</SelectItem>
                        <SelectItem value="PHONE_NUMBER">Ligar</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input className="flex-1" value={b.text} onChange={(e) => patchButton(i, { text: e.target.value })} placeholder="Texto do botão" />
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeButton(i)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  {b.type === "URL" && (
                    <Input value={b.url ?? ""} onChange={(e) => patchButton(i, { url: e.target.value })} placeholder="https://…" />
                  )}
                  {b.type === "PHONE_NUMBER" && (
                    <Input value={b.phone ?? ""} onChange={(e) => patchButton(i, { phone: e.target.value })} placeholder="+55 11 99999-9999" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ── Preview + dicas ── */}
          <div className="space-y-4">
            <div>
              <Label>Pré-visualização</Label>
              <div className="mt-1 rounded-xl border border-border bg-[hsl(96_44%_95%)] p-3">
                <div className="rounded-lg bg-white p-3 text-sm shadow-sm">
                  {draft.headerText && <p className="font-bold">{draft.headerText}</p>}
                  <p className="whitespace-pre-wrap">{preview || "Sua mensagem aparece aqui…"}</p>
                  {draft.footer && <p className="mt-1 text-xs text-muted-foreground">{draft.footer}</p>}
                  {draft.buttons.length > 0 && (
                    <div className="mt-2 space-y-1 border-t border-border pt-2">
                      {draft.buttons.map((b, i) => (
                        <p key={i} className="text-center text-sm font-medium text-[hsl(211_100%_45%)]">{b.text || "Botão"}</p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
              <p className="mb-1 text-sm font-bold text-amber-900">Dicas para ser aprovado</p>
              <ul className="list-disc space-y-1 pl-4 text-xs text-amber-900">
                {TIPS.map((t) => <li key={t}>{t}</li>)}
              </ul>
            </div>

            {showErrors && errors.length > 0 && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3">
                <ul className="list-disc space-y-1 pl-4 text-xs text-destructive">
                  {errors.map((e) => <li key={e}>{e}</li>)}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enviar para aprovação
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Verificar typecheck/build do arquivo**

Run: `pnpm exec tsc --noEmit -p tsconfig.json 2>&1 | grep TemplateBuilderDialog || echo "sem erros no arquivo"`
Expected: "sem erros no arquivo".

- [ ] **Step 3: Commit**

```bash
git add src/components/crm/TemplateBuilderDialog.tsx
git commit -m "feat(crm): dialog builder de template com preview e dicas

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Aba "Templates" na página de configurações

**Files:**
- Modify: `src/pages/CrmWhatsAppSettings.tsx`

**Interfaces:**
- Consumes: `fetchTemplates`, `syncTemplatesWithMeta`, `deleteTemplate`, tipo `Template` de `@/services/whatsapp-api`; `TemplateBuilderDialog` (Task 3); `Tabs*` já usados na página.
- Produces: nova aba visível `templates`.

- [ ] **Step 1: Imports**

No topo de `src/pages/CrmWhatsAppSettings.tsx`:

- Adicionar aos imports de `lucide-react`: `LayoutTemplate`.
- Adicionar aos imports de `@/services/whatsapp-api`: `fetchTemplates`, `syncTemplatesWithMeta`, `deleteTemplate`, e o tipo `type Template`.
- Adicionar novo import: `import { TemplateBuilderDialog } from "@/components/crm/TemplateBuilderDialog";`

- [ ] **Step 2: Estado + carregamento**

Dentro do componente da página, junto aos outros `useState`, adicionar:

```tsx
const [templates, setTemplates] = useState<Template[]>([]);
const [templatesLoading, setTemplatesLoading] = useState(false);
const [syncing, setSyncing] = useState(false);
const [builderOpen, setBuilderOpen] = useState(false);
const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

const loadTemplates = useCallback(async () => {
  setTemplatesLoading(true);
  try {
    setTemplates(await fetchTemplates());
  } catch {
    toast({ variant: "destructive", title: "Não foi possível carregar os templates" });
  } finally {
    setTemplatesLoading(false);
  }
}, [toast]);

useEffect(() => {
  void loadTemplates();
}, [loadTemplates]);

const handleSyncTemplates = async () => {
  setSyncing(true);
  try {
    await syncTemplatesWithMeta();
    await loadTemplates();
    toast({ title: "Status sincronizado com a Meta" });
  } catch {
    toast({ variant: "destructive", title: "Falha ao sincronizar com a Meta" });
  } finally {
    setSyncing(false);
  }
};

const handleDeleteTemplate = async (id: string) => {
  try {
    await deleteTemplate(id);
    setConfirmDeleteId(null);
    await loadTemplates();
    toast({ title: "Template removido" });
  } catch {
    toast({ variant: "destructive", title: "Falha ao remover o template" });
  }
};
```

- [ ] **Step 3: Adicionar helper de badge de status (fora do componente, junto aos outros helpers no topo do arquivo)**

```tsx
const TEMPLATE_STATUS_BADGE: Record<string, { label: string; className: string }> = {
  APPROVED: { label: "Aprovado", className: "bg-[hsl(142_70%_94%)] text-[hsl(142_60%_28%)]" },
  PENDING: { label: "Em análise", className: "bg-amber-100 text-amber-800" },
  REJECTED: { label: "Rejeitado", className: "bg-destructive/10 text-destructive" },
  PAUSED: { label: "Pausado", className: "bg-muted text-muted-foreground" },
  DISABLED: { label: "Desativado", className: "bg-muted text-muted-foreground" },
  ACTIVE: { label: "Ativo (local)", className: "bg-muted text-muted-foreground" },
};
```

- [ ] **Step 4: Adicionar o gatilho da aba**

Depois do `<TabsTrigger value="respostas">…</TabsTrigger>` (linha ~377), inserir:

```tsx
<TabsTrigger value="templates" className="gap-1.5">
  <LayoutTemplate className="h-4 w-4" /> Templates
</TabsTrigger>
```

- [ ] **Step 5: Adicionar o conteúdo da aba**

Antes de `<TabsContent value="funil">` (linha ~811), inserir:

```tsx
<TabsContent value="templates">
  <div className="max-w-3xl space-y-4">
    <div className="flex items-center justify-between">
      <div>
        <h3 className="text-base font-bold">Templates de mensagem</h3>
        <p className="text-sm text-muted-foreground">
          Modelos aprovados pela Meta para iniciar conversas fora da janela de 24h.
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={handleSyncTemplates} disabled={syncing}>
          {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Sincronizar com Meta
        </Button>
        <Button onClick={() => setBuilderOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Novo template
        </Button>
      </div>
    </div>

    {templatesLoading ? (
      <div className="flex h-32 items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando…
      </div>
    ) : templates.length === 0 ? (
      <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        Nenhum template ainda. Clique em “Novo template” para criar o primeiro.
      </div>
    ) : (
      <div className="space-y-3">
        {templates.map((tpl) => {
          const badge = TEMPLATE_STATUS_BADGE[tpl.status] ?? TEMPLATE_STATUS_BADGE.ACTIVE;
          return (
            <div key={tpl.id} className="rounded-xl border border-border bg-card p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold">{tpl.name}</span>
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-bold", badge.className)}>{badge.label}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{tpl.category}</span>
                  <span>·</span>
                  <span>{tpl.language}</span>
                  {confirmDeleteId === tpl.id ? (
                    <>
                      <Button size="sm" variant="destructive" onClick={() => handleDeleteTemplate(tpl.id)}>Confirmar</Button>
                      <Button size="sm" variant="ghost" onClick={() => setConfirmDeleteId(null)}>Cancelar</Button>
                    </>
                  ) : (
                    <Button size="icon" variant="ghost" onClick={() => setConfirmDeleteId(tpl.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{tpl.body}</p>
            </div>
          );
        })}
      </div>
    )}
  </div>

  <TemplateBuilderDialog open={builderOpen} onOpenChange={setBuilderOpen} onCreated={loadTemplates} />
</TabsContent>
```

- [ ] **Step 6: Typecheck**

Run: `pnpm exec tsc --noEmit -p tsconfig.json 2>&1 | grep -E "CrmWhatsAppSettings|TemplateBuilder" || echo "sem erros"`
Expected: "sem erros".

- [ ] **Step 7: Verificação manual**

Run: `pnpm dev` → abrir `/crm-whatsapp/configuracoes` → clicar na aba "Templates". Confirmar: lista carrega, "Sincronizar com Meta" funciona, "Novo template" abre o dialog, preview atualiza ao digitar, submit sem exemplo mostra erro, submit válido mostra toast e recarrega.

- [ ] **Step 8: Commit**

```bash
git add src/pages/CrmWhatsAppSettings.tsx
git commit -m "feat(crm): aba de Templates do WhatsApp (lista, sync, criar via Meta)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage:**
- Ver templates + status → Task 4 (lista + badges) + `fetchTemplates`/`syncTemplatesWithMeta`. ✔
- Criar novo e submeter à Meta → Task 3 (dialog) + Task 2 (`createTemplate` com `bodyExample`). ✔
- Dicas anti-rejeição → Task 3 (painel de dicas + `CATEGORY_HELP`). ✔
- Validações client-side (nome, corpo, variável início/fim, exemplos, botões) → Task 1 (`validateTemplateDraft`) + Task 3 (bloqueio no submit). ✔
- Ajuste no service (`bodyExample`, `deleteTemplate`, `phone`) → Task 2. ✔
- Excluir (cópia local) → Task 4 (confirmação inline, sem `window.confirm`). ✔
- Sem edição inline / fora de escopo → respeitado (nenhuma task de edição). ✔

**Placeholder scan:** nenhum TBD/TODO; todo código presente. ✔

**Type consistency:** `TemplateDraft`/`TemplateButtonDraft` definidos na Task 1 e consumidos na Task 3; `createTemplate`/`deleteTemplate` definidos na Task 2 e consumidos nas Tasks 3/4; `Template.status` (do service) casa com as chaves de `TEMPLATE_STATUS_BADGE`. ✔
