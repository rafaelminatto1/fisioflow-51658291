import { useMemo } from "react";
import { clinicalReasoningRules, ActionRule } from "@/data/clinicalReasoningRules";
import { TemplateField } from "@/components/evaluation";

export interface ActiveSuggestion {
  ruleId: string;
  ruleName: string;
  suggestions: ActionRule["suggestions"];
  reasoning: string;
}

export function useActionBridge(allFields: TemplateField[], fieldValues: Record<string, unknown>) {
  const { suggestions, hasRedFlag } = useMemo(() => {
    let rawSuggestions: ActiveSuggestion[] = [];
    let detectedRedFlag = false;

    clinicalReasoningRules.forEach((rule) => {
      let isTriggered = false;

      rule.condition.fieldLabels.forEach((label) => {
        const field = allFields.find((f) => f.label === label);
        if (!field) return;

        const value = fieldValues[field.id];
        if (value === undefined || value === null || value === "") return;

        const stringValue = String(value).toLowerCase();

        if (rule.condition.matchAny) {
          // Se for campo de texto (ex: SOAP), buscamos as keywords no conteúdo
          if (field.type === "text" || field.type === "textarea") {
            const hasMatch = rule.condition.matchAny.some((keyword) =>
              stringValue.includes(keyword.toLowerCase()),
            );
            if (hasMatch) isTriggered = true;
          } else {
            // Comportamento padrão para selects/checkboxes
            const valueArray = Array.isArray(value) ? value : [String(value)];
            const hasMatch = valueArray.some((v) =>
              rule.condition.matchAny?.some((k) => k.toLowerCase() === String(v).toLowerCase()),
            );
            if (hasMatch) isTriggered = true;
          }
        }

        if (rule.condition.matchValue !== undefined) {
          if (stringValue === String(rule.condition.matchValue).toLowerCase()) isTriggered = true;
        }

        if (rule.condition.minValue !== undefined) {
          const numValue = typeof value === "number" ? value : parseFloat(String(value));
          if (!isNaN(numValue) && numValue >= rule.condition.minValue) isTriggered = true;
        }

        if (rule.condition.maxValue !== undefined) {
          const numValue = typeof value === "number" ? value : parseFloat(String(value));
          if (!isNaN(numValue) && numValue <= rule.condition.maxValue) isTriggered = true;
        }
      });

      if (isTriggered) {
        if (rule.id === "rule-red-flags") detectedRedFlag = true;

        rawSuggestions.push({
          ruleId: rule.id,
          ruleName: rule.name,
          suggestions: rule.suggestions,
          reasoning: rule.reasoning,
        });
      }
    });

    // If red flag is detected, prioritize alerts and precautions
    // We might want to filter out exercises or mark them as "restricted"
    const finalSuggestions = detectedRedFlag
      ? rawSuggestions.map((sug) => ({
          ...sug,
          suggestions: sug.suggestions.filter(
            (s) => s.type !== "exercise" || s.priority === "high",
          ),
        }))
      : rawSuggestions;

    return { suggestions: finalSuggestions, hasRedFlag: detectedRedFlag };
  }, [allFields, fieldValues]);

  return { suggestions, hasRedFlag };
}
