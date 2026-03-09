/**
 * useIntelligentConductSuggestions - Migrado para Neon/Workers
 */

import { useQuery } from '@tanstack/react-query';
import { patientsApi, clinicalApi } from '@/lib/api/workers-client';
import { useSoapRecords } from './useSoapRecords';

export interface ConductSuggestion {
  id: string;
  title: string;
  conduct_text: string;
  category: string;
  relevance_score: number;
  reason: string;
}

export const useIntelligentConductSuggestions = (patientId: string) => {
  const { data: soapRecords = [] } = useSoapRecords(patientId, 5);

  return useQuery({
    queryKey: ['intelligent-conduct-suggestions', patientId],
    queryFn: async () => {
      const [pathologiesRes, conductsRes] = await Promise.all([
        patientsApi.pathologies(patientId),
        clinicalApi.conductLibrary.list(),
      ]);

      const pathologies = pathologiesRes?.data ?? [];
      const conducts = conductsRes?.data ?? [];

      const recentKeywords = soapRecords
        .flatMap((record) => {
          const text = `${record.subjective || ''} ${record.objective || ''} ${record.assessment || ''}`;
          return text.toLowerCase().match(/\b\w{4,}\b/g) || [];
        })
        .filter((word, index, arr) => arr.indexOf(word) === index)
        .slice(0, 20);

      const hasPainComplaint =
        recentKeywords.includes('dor') ||
        soapRecords.some(
          (record) =>
            record.subjective?.toLowerCase().includes('dor') ||
            record.assessment?.toLowerCase().includes('dor'),
        );

      const suggestions: ConductSuggestion[] = conducts
        .map((conduct) => {
          let score = 0;
          const reasons: string[] = [];
          const conductText =
            `${conduct.title} ${conduct.description || ''} ${conduct.conduct_text}`.toLowerCase();

          const pathologyNames = pathologies
            .map((item) => item.name?.toLowerCase().trim())
            .filter(Boolean) as string[];

          pathologyNames.forEach((pathology) => {
            if (
              conductText.includes(pathology) ||
              conduct.category.toLowerCase().includes(pathology)
            ) {
              score += 50;
              reasons.push(`Relacionado à patologia: ${pathology}`);
            }
          });

          let keywordMatches = 0;
          recentKeywords.forEach((keyword) => {
            if (conductText.includes(keyword)) keywordMatches += 1;
          });

          if (keywordMatches > 0) {
            score += keywordMatches * 5;
            reasons.push(`Palavras-chave em comum (${keywordMatches})`);
          }

          if (conduct.category.toLowerCase().includes('dor') && hasPainComplaint) {
            score += 20;
            reasons.push('Categoria relacionada à queixa');
          }

          return {
            id: conduct.id,
            title: conduct.title,
            conduct_text: conduct.conduct_text,
            category: conduct.category,
            relevance_score: score,
            reason: reasons.join(' • ') || 'Conduta padrão',
          };
        })
        .filter((suggestion) => suggestion.relevance_score > 0)
        .sort((a, b) => b.relevance_score - a.relevance_score)
        .slice(0, 10);

      return suggestions;
    },
    enabled: !!patientId,
  });
};
