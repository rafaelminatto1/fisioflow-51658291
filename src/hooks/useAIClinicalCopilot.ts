import { useState, useEffect } from "react";
import { useDebounce } from "@/hooks/performance/useDebounce";

interface CopilotInsight {
  type: "warning" | "suggestion" | "info";
  message: string;
  source?: string;
  actionPayload?: any;
}

export function useAIClinicalCopilot(text: string) {
  const [debouncedText] = useDebounce(text, 2000);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [insights, setInsights] = useState<CopilotInsight[]>([]);

  useEffect(() => {
    if (!debouncedText || debouncedText.length < 20) {
      setInsights([]);
      return;
    }

    const analyzeText = async () => {
      setIsAnalyzing(true);
      try {
        // Simulating an API call to a Cloudflare Worker endpoint
        // that handles the Gemini + Vectorize logic.
        // In a real implementation, this would be:
        // const response = await fetch('/api/v2/ai/clinical-copilot', { method: 'POST', body: JSON.stringify({ text: debouncedText }) });
        // const data = await response.json();
        
        // Mocking the AI response based on keywords for demonstration
        const lowerText = debouncedText.toLowerCase();
        const newInsights: CopilotInsight[] = [];

        if (lowerText.includes("dor no ombro") || lowerText.includes("impacto")) {
          newInsights.push({
            type: "suggestion",
            message: "A Wiki Clínica recomenda avaliar a discinesia escapular para dor no ombro.",
            source: "Wiki: Síndrome do Impacto"
          });
        }

        if (lowerText.includes("agachamento") && lowerText.includes("lca")) {
          newInsights.push({
            type: "warning",
            message: "Artigos recentes (PubMed) alertam sobre o risco de agachamento profundo na fase inicial de pós-op de LCA.",
            source: "PubMed: Rehab LCA"
          });
        }

        if (lowerText.includes("agachamento livre com 10kg") || lowerText.includes("agachamento")) {
           // Fuzzy match for exercise
           newInsights.push({
             type: "info",
             message: "Detectado: Agachamento. Deseja adicionar à sequência da sessão?",
             actionPayload: { type: "add_exercise", name: "Agachamento" }
           });
        }

        setInsights(newInsights);
      } catch (error) {
        console.error("Error analyzing text:", error);
      } finally {
        setIsAnalyzing(false);
      }
    };

    analyzeText();
  }, [debouncedText]);

  return { insights, isAnalyzing };
}
