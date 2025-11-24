import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
      // Buscar patologias do paciente
      const { data: pathologies, error: pathError } = await supabase
        .from('patient_pathologies')
        .select('pathology_name, status')
        .eq('patient_id', patientId)
        .eq('status', 'active');

      if (pathError) throw pathError;

      // Buscar avaliação médica recente
      const { data: medicalRecord } = await supabase
        .from('medical_records')
        .select('chief_complaint, medical_history')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Extrair palavras-chave das últimas evoluções
      const recentKeywords = soapRecords
        .flatMap(record => {
          const text = `${record.subjective || ''} ${record.objective || ''} ${record.assessment || ''}`;
          return text.toLowerCase().match(/\b\w{4,}\b/g) || [];
        })
        .filter((word, index, arr) => arr.indexOf(word) === index)
        .slice(0, 20);

      // Buscar condutas da biblioteca baseadas em patologias
      const pathologyNames = pathologies?.map(p => p.pathology_name.toLowerCase()) || [];
      const allKeywords = [
        ...pathologyNames,
        ...recentKeywords,
        medicalRecord?.chief_complaint?.toLowerCase() || ''
      ].filter(Boolean);

      const { data: conducts, error: conductError } = await supabase
        .from('conduct_library')
        .select('*');

      if (conductError) throw conductError;

      // Calcular relevância para cada conduta
      const suggestions: ConductSuggestion[] = conducts
        .map(conduct => {
          let score = 0;
          let reasons: string[] = [];

          const conductText = `${conduct.title} ${conduct.description || ''} ${conduct.conduct_text}`.toLowerCase();

          // Pontuação por patologia correspondente
          pathologyNames.forEach(pathology => {
            if (conductText.includes(pathology) || conduct.category.toLowerCase().includes(pathology)) {
              score += 50;
              reasons.push(`Relacionado à patologia: ${pathology}`);
            }
          });

          // Pontuação por palavras-chave das últimas evoluções
          let keywordMatches = 0;
          recentKeywords.forEach(keyword => {
            if (conductText.includes(keyword)) {
              keywordMatches++;
            }
          });
          
          if (keywordMatches > 0) {
            score += keywordMatches * 5;
            reasons.push(`Palavras-chave em comum (${keywordMatches})`);
          }

          // Pontuação por categoria
          if (conduct.category.toLowerCase().includes('dor') && 
              (medicalRecord?.chief_complaint?.toLowerCase().includes('dor') || 
               soapRecords.some(r => r.subjective?.toLowerCase().includes('dor')))) {
            score += 20;
            reasons.push('Categoria relacionada à queixa');
          }

          return {
            id: conduct.id,
            title: conduct.title,
            conduct_text: conduct.conduct_text,
            category: conduct.category,
            relevance_score: score,
            reason: reasons.join(' • ') || 'Conduta padrão'
          };
        })
        .filter(s => s.relevance_score > 0)
        .sort((a, b) => b.relevance_score - a.relevance_score)
        .slice(0, 10);

      return suggestions;
    },
    enabled: !!patientId
  });
};
