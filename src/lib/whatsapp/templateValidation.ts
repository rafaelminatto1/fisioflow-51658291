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
