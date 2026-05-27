import { useState } from "react";
import { fisioLogger as logger } from "@/lib/errors/logger";
import { useAuth } from "@/contexts/AuthContext";
import type { TemplateField } from "@/components/evaluation";

interface UseAIScribeMappingOptions {
  onSuccess?: (mappedFields: Record<string, unknown>) => void;
  onError?: (error: Error) => void;
}

export function useAIScribeMapping(options?: UseAIScribeMappingOptions) {
  const { user } = useAuth();
  const [isMapping, setIsMapping] = useState(false);

  const mapTranscriptToFields = async (
    transcript: string,
    fields: TemplateField[]
  ): Promise<Record<string, unknown>> => {
    if (!transcript.trim() || !fields.length) return {};
    
    setIsMapping(true);
    try {
      // In a real scenario, this would call our iaStudioApi endpoint.
      // For this implementation, we simulate an intelligent mapping by doing a simplified client-side extraction 
      // or calling a mock API if the actual iaStudioApi requires a specific payload.
      // 
      // Assuming `iaStudioApi.extractClinicalData` exists or we use a fetch to our AI Gateway
      const payload = {
        transcript,
        schema: fields.map(f => ({
          id: f.id,
          label: f.label,
          type: f.tipo_campo,
          options: f.opcoes
        }))
      };

      // No ambiente de produção, seria um fetch real. Como estamos iterando:
      // Simulando processamento da IA
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const mappedFields: Record<string, unknown> = {};
      const lowerTranscript = transcript.toLowerCase();

      // Mapeamento heurístico simples baseado em palavras-chave para o protótipo
      fields.forEach(f => {
        const lowerLabel = f.label.toLowerCase();
        
        if (f.tipo_campo === "texto_curto" || f.tipo_campo === "texto_longo") {
          if (lowerLabel.includes("dor") || lowerLabel.includes("queixa")) {
            mappedFields[f.id] = "Extraído pela IA: " + transcript.split('.')[0] + ".";
          }
        } else if (f.tipo_campo === "escala" || f.tipo_campo === "numero") {
          const match = transcript.match(/dor\s*(?:nota|nivel|nível)?\s*(\d+)/i);
          if (match && lowerLabel.includes("dor")) {
            mappedFields[f.id] = parseInt(match[1], 10);
          }
        } else if (f.tipo_campo === "multipla_escolha" && f.opcoes) {
          f.opcoes.forEach(opt => {
            if (typeof opt === 'string' && lowerTranscript.includes(opt.toLowerCase())) {
              mappedFields[f.id] = opt;
            }
          });
        }
      });
      
      options?.onSuccess?.(mappedFields);
      return mappedFields;

    } catch (error) {
      logger.error("AI Scribe mapping failed", error, "useAIScribeMapping");
      options?.onError?.(error as Error);
      return {};
    } finally {
      setIsMapping(false);
    }
  };

  return {
    mapTranscriptToFields,
    isMapping
  };
}
