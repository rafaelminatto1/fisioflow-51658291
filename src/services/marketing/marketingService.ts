export interface MarketingExportParams {
    patientId: string;
    organizationId: string;
    assetAId: string;
    assetBId: string;
    metrics: string[];
    isAnonymized: boolean;
}

// 1. Check Consent
export const checkMarketingConsent = async (patientId: string): Promise<boolean> => {
    // In real app, query table public.consent_records
    // Mock response for now:
    console.log(`[MarketingService] Checking consent for patient ${patientId}`);
    return new Promise(resolve => setTimeout(() => resolve(true), 500));
};

// 2. Log Export
export const createMarketingExportRecord = async (params: MarketingExportParams, blob: Blob) => {
    console.log('[MarketingService] Creating export record...', params);

    // 1. Upload Blob to Storage (Mock)
    // const fileName = `marketing_${params.patientId}_${Date.now()}.mp4`;
    // const { data: uploadData, error: uploadError } = await supabase.storage.from('exports').upload(fileName, blob);

    // 2. Insert DB Record (Mock)
    /* 
    const { error } = await supabase.from('marketing_exports').insert({
        patient_id: params.patientId,
        organization_id: params.organizationId,
        consent_id: '...', // Would need to fetch valid consent ID
        export_type: 'video_comparison',
        file_path: fileName,
        is_anonymized: params.isAnonymized,
        metrics_overlay: params.metrics
    });
    */

    return { success: true, url: URL.createObjectURL(blob) };
};

// 3. Caption Generator
export const generateSocialCaption = (type: 'technical' | 'motivational' | 'educational', metrics: string[]) => {
    const baseDisclaimer = "\n\n⚠️ Resultados variam. Conteúdo informativo. Avaliação individual é indispensável.";

    switch (type) {
        case 'motivational':
            return `Incrível a dedicação deste paciente! 💪\n\nComparamos a evolução biomecânica e os números não mentem. O foco no tratamento traz resultados reais.\n\n#Fisioterapia #Evolução #Saúde${baseDisclaimer}`;
        case 'educational':
            return `Sabia que a ${metrics[0] || 'postura'} influencia diretamente na sua dor?\n\nVeja a diferença antes e depois do tratamento focado em biomecânica. Dores crônicas muitas vezes têm origem mecânica.\n\nAgende sua avaliação.${baseDisclaimer}`;
        case 'technical':
        default:
            return `Análise comparativa de movimento.\n\nObserva-se melhora nos parâmetros: ${metrics.join(', ')}.\n\nProtocolo de reabilitação neuromuscular aplicado com sucesso.${baseDisclaimer}`;
    }
};
