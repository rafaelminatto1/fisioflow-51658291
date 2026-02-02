/**
 * useIntelligentConductSuggestions - Migrated to Firebase
 *
 */
import { useQuery } from '@tanstack/react-query';
import { collection, doc, getDoc, getDocs, query as firestoreQuery, where, orderBy, limit,  } from '@/integrations/firebase/app';
import { db } from '@/integrations/firebase/app';

import { useSoapRecords } from './useSoapRecords';


// Helper to convert doc
const convertDoc = (doc: { id: string; data: () => Record<string, unknown> }) => ({ id: doc.id, ...doc.data() });

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
      const pathologiesQuery = firestoreQuery(
        collection(db, 'patient_pathologies'),
        where('patient_id', '==', patientId),
        where('status', '==', 'em_tratamento')
      );
      const pathologiesSnap = await getDocs(pathologiesQuery);
      const pathologies = pathologiesSnap.docs.map(convertDoc);

      // Buscar avaliação médica recente
      const medicalRecordsQuery = firestoreQuery(
        collection(db, 'medical_records'),
        where('patient_id', '==', patientId),
        orderBy('created_at', 'desc'),
        limit(1)
      );
      const medicalRecordsSnap = await getDocs(medicalRecordsQuery);
      const medicalRecord = !medicalRecordsSnap.empty ? convertDoc(medicalRecordsSnap.docs[0]) : null;

      // Extrair palavras-chave das últimas evoluções
      const recentKeywords = soapRecords
        .flatMap(record => {
          const text = `${record.subjective || ''} ${record.objective || ''} ${record.assessment || ''}`;
          return text.toLowerCase().match(/\b\w{4,}\b/g) || [];
        })
        .filter((word, index, arr) => arr.indexOf(word) === index)
        .slice(0, 20);

      // Buscar condutas da biblioteca
      const conductsQuery = firestoreQuery(collection(db, 'conduct_library'));
      const conductsSnap = await getDocs(conductsQuery);
      const conducts = conductsSnap.docs.map(convertDoc);

      // Calcular relevância para cada conduta
      interface ConductFirestore {
        id: string;
        title: string;
        description?: string;
        conduct_text: string;
        category: string;
        [key: string]: unknown;
      }

      interface PathologyFirestore {
        pathology_name: string;
        [key: string]: unknown;
      }

      const suggestions: ConductSuggestion[] = conducts
        .map((conduct: ConductFirestore) => {
          let score = 0;
          const reasons: string[] = [];

          const conductText = `${conduct.title} ${conduct.description || ''} ${conduct.conduct_text}`.toLowerCase();

          // Pontuação por patologia correspondente
          const pathologyNames = pathologies.map((p: PathologyFirestore) => p.pathology_name.toLowerCase());
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
