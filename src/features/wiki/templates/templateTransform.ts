import { getTemplateById, type WikiTemplateBlueprint } from './templateCatalog';

export interface TemplateInstantiationInput {
  templateId: string;
  values: Record<string, string | undefined>;
}

export interface InstantiatedTemplate {
  template: WikiTemplateBlueprint;
  title: string;
  content: string;
  missingRequired: string[];
}

const VARIABLE_REGEX = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

function normalizeValue(value?: string): string {
  return (value ?? '').trim();
}

export function instantiateTemplate(input: TemplateInstantiationInput): InstantiatedTemplate {
  const template = getTemplateById(input.templateId);
  if (!template) {
    throw new Error(`Template not found: ${input.templateId}`);
  }

  const missingRequired = template.variables
    .filter((variable) => variable.required)
    .filter((variable) => {
      const provided = normalizeValue(input.values[variable.key]);
      const fallback = normalizeValue(variable.defaultValue);
      return !provided && !fallback;
    })
    .map((variable) => variable.key);

  const resolvedContent = template.content.replace(VARIABLE_REGEX, (_match, key: string) => {
    const provided = normalizeValue(input.values[key]);
    if (provided) return provided;

    const variable = template.variables.find((item) => item.key === key);
    return normalizeValue(variable?.defaultValue);
  });

  return {
    template,
    title: template.name,
    content: resolvedContent,
    missingRequired,
  };
}
