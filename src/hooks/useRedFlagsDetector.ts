import { useMemo } from "react";

// Lista de palavras-chave que podem indicar Red Flags em Fisioterapia
const RED_FLAG_KEYWORDS = [
  "perda de peso",
  "febre",
  "suor noturno",
  "suores noturnos",
  "dor noturna constante",
  "dor incessante",
  "histórico de câncer",
  "história de câncer",
  "anestesia em sela",
  "parestesia em sela",
  "incontinência",
  "retenção urinária",
  "fraqueza bilateral",
  "déficit neurológico progressivo",
  "trauma recente grave",
  "uso prolongado de corticoide",
  "osteoporose severa",
];

interface RedFlagDetectionResult {
  hasRedFlags: boolean;
  detectedFlags: string[];
}

export function useRedFlagsDetector(
  richText: string,
  fieldValues: Record<string, unknown>
): RedFlagDetectionResult {
  const result = useMemo(() => {
    const flags = new Set<string>();

    // 1. Analisa o texto livre (rich text anamnesis)
    const normalizedText = richText.toLowerCase();
    RED_FLAG_KEYWORDS.forEach((keyword) => {
      if (normalizedText.includes(keyword)) {
        flags.add(keyword);
      }
    });

    // 2. Analisa os campos estruturados
    Object.values(fieldValues).forEach((val) => {
      if (typeof val === "string") {
        const normalizedVal = val.toLowerCase();
        RED_FLAG_KEYWORDS.forEach((keyword) => {
          if (normalizedVal.includes(keyword)) {
            flags.add(keyword);
          }
        });
      } else if (Array.isArray(val)) {
        val.forEach((item) => {
          if (typeof item === "string") {
            const normalizedItem = item.toLowerCase();
            RED_FLAG_KEYWORDS.forEach((keyword) => {
              if (normalizedItem.includes(keyword)) {
                flags.add(keyword);
              }
            });
          }
        });
      }
    });

    return {
      hasRedFlags: flags.size > 0,
      detectedFlags: Array.from(flags),
    };
  }, [richText, fieldValues]);

  return result;
}
