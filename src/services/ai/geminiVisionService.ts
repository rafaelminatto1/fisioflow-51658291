export interface VisionAnalysisResult {
    text: string;
    timestamp: string;
}

export const analyzeWithGeminiVision = async (_base64Image: string): Promise<VisionAnalysisResult> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // In a real implementation, this would call the backend proxy to Gemini 1.5 Pro
    // with the system prompt: "Act as a radiology assistant..."

    return {
        timestamp: new Date().toISOString(),
        text: `### Relatório Preliminar de IA
**Ferramenta de Pesquisa - Não é um Diagnóstico Médico**

#### Análise Visual
A imagem fornecida aparenta ser um exame de imagem (RX/CT) ou fotografia clínica.
- **Estruturas Visíveis**: Identifica-se a presença de estruturas ósseas compatíveis com a região anatômica apresentada.
- **Simetria**: Preservada nos eixos principais.
- **Anomalias**: Nenhuma descontinuidade óssea óbvia ou assimetria de tecidos moles detectada nesta visualização superficial.

#### Observações
- A qualidade da imagem permite uma avaliação preliminar.
- Não foram identificados artefatos significativos que impeçam a análise.

> [!WARNING]
> **Recomendação Clínica**: Este relatório é gerado automaticamente e pode conter alucinações. Consulte sempre o laudo oficial do radiologista e realize avaliação física presencial.
`
    };
};
