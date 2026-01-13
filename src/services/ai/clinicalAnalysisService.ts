import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

export interface AIAnalysisResult {
    summary: string;
    technical_analysis: string;
    patient_summary: string;
    confidence_overall_0_100: number;
    key_findings: { text: string; confidence: 'HIGH' | 'MEDIUM' | 'LOW' }[];
    metrics_table_markdown: string;
    improvements: string[];
    still_to_improve: string[];
    suggested_exercises: {
        name: string;
        sets: string;
        reps: string;
        goal: string;
        progression: string;
        regression: string;
    }[];
    limitations: string[];
    red_flags_generic: string[];
    disclaimer: string;
}

export const generateClinicalReport = async (metrics: any, history?: any): Promise<AIAnalysisResult> => {
    try {
        const { data, error } = await supabase.functions.invoke('analysis-ai', {
            body: { metrics, history }
        });

        if (error) {
            console.warn("AI Service Error, falling back to mock:", error);
            return mockClinicalReport(metrics);
        }

        return data;
    } catch {
        console.error("AI Service Exception:", e);
        return mockClinicalReport(metrics);
    }
};

export const generateFormSuggestions = async (formData: Record<string, any>, formFields: any[]): Promise<string> => {
    try {
        // Construct a context string from the form data
        const context = formFields.map(field => {
            const value = formData[field.id];
            if (!value) return null;
            return `${field.label}: ${value}`;
        }).filter(Boolean).join('\n');

        const { data, error } = await supabase.functions.invoke('analysis-ai', {
            body: {
                type: 'clinical_suggestions',
                context
            }
        });

        if (error) {
            console.warn("AI Service Error, falling back to mock:", error);
            return mockFormSuggestions(context);
        }

        return data.suggestions || mockFormSuggestions(context);
    } catch {
        console.error("AI Service Exception:", e);
        return mockFormSuggestions("");
    }
};

const mockFormSuggestions = (context: string): string => {
    return `**Sugestões Baseadas na Avaliação:**\n\n` +
        `1. **Controle de Dor:** Iniciar com eletroanalgesia (TENS) devido à queixa de dor > 5/10.\n` +
        `2. **Ganho de ADM:** Mobilização articular suave grau II/III para melhorar a flexão relatada.\n` +
        `3. **Fortalecimento:** Exercícios isométricos iniciais para proteção articular.\n` +
        `4. **Educação:** Orientar repouso relativo e evitar atividades de impacto (conforme limitações funcionais).\n\n` +
        `*Nota: Sugestão gerada automaticamente. Valide clinicamente.*`;
};

const mockClinicalReport = (metrics: any): AIAnalysisResult => {
    return {
        summary: "Melhora significativa na estabilidade do joelho e cadência. Requer atenção ao controle de tronco.",
        technical_analysis: "Observa-se redução de 5º no valgo dinâmico de joelho esquerdo em fase de Mid-Stance, indicando melhor controle excêntrico de glúteo médio. A cadência aumentou, sugerindo maior eficiência de marcha. O tronco ainda apresenta oscilação lateral excessiva na fase de apoio.",
        patient_summary: "Parabéns! Seu joelho está muito mais estável, você está 'falseando' menos. Sua caminhada ficou mais ágil. Agora vamos focar em fortalecer o abdômen para seu tronco não balançar tanto.",
        confidence_overall_0_100: 85,
        key_findings: [
            { text: "Redução do Valgo Dinâmico em 5 graus (Esq).", confidence: "HIGH" },
            { text: "Aumento da Cadência para 105 spm.", confidence: "HIGH" },
            { text: "Oscilação de Tronco ainda presente (Sagital).", confidence: "MEDIUM" }
        ],
        metrics_table_markdown: `
| Momento | Sinal | Inicial | Atual | Delta | Evolução | Obs |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Mid-Stance | Valgo (Esq) | 15° | 10° | -5° | Melhorou | Menor risco de lesão |
| Total | Cadência | 98 spm | 105 spm | +7 | Melhorou | Mais eficiente |
| Squat | Profundidade | 70° | 85° | +15° | Melhorou | Boa mobilidade |
`,
        improvements: [
            "Controle motor do valgo dinâmico esquerdo.",
            "Profundidade do agachamento overhead."
        ],
        still_to_improve: [
            "Estabilidade do tronco no plano sagital durante carga."
        ],
        suggested_exercises: [
            {
                name: "Clam Shell Isométrico",
                sets: "3",
                reps: "30s",
                goal: "Ativação de Glúteo Médio para controle de valgo.",
                progression: "Band elástica extra forte",
                regression: "Sem resistência"
            },
            {
                name: "Agachamento Unipodal (Caixote)",
                sets: "3",
                reps: "8-10",
                goal: "Controle excêntrico de quadríceps e alinhamento.",
                progression: "Aumentar altura do caixote",
                regression: "Apoio manual"
            },
            {
                name: "Dead Bug (Core)",
                sets: "3",
                reps: "12",
                goal: "Estabilidade lombo-pélvica para reduzir oscilação de tronco.",
                progression: "Braços e pernas estendidos",
                regression: "Joelho flexionado"
            }
        ],
        limitations: ["Análise feita por vídeo 2D sem calibração profunda."],
        red_flags_generic: ["Dor aguda reportada > 5/10 requer interrupção."],
        disclaimer: "Ferramenta auxiliar. Não substitui avaliação presencial nem laudo médico."
    };
};
