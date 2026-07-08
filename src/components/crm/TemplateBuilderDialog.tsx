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
          <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }} disabled={submitting}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enviar para aprovação
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
