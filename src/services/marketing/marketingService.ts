/**
 * Marketing Service - Migrated to Firebase
 */

import { db, collection, addDoc, doc, getDoc } from '@/integrations/firebase/app';
import { getFirebaseStorage } from '@/integrations/firebase/storage';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { fisioLogger as logger } from '@/lib/errors/logger';

const storage = getFirebaseStorage();

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
    // Query Firestore collection 'consent_records'
    logger.info(`[MarketingService] Checking consent for patient ${patientId}`, { patientId }, 'marketingService');

    const consentRef = doc(db, 'consent_records', patientId);
    const consentSnap = await getDoc(consentRef);
    return consentSnap.exists() ? (consentSnap.data().marketing_enabled ?? false) : false;
};

// 2. Log Export
export const createMarketingExportRecord = async (params: MarketingExportParams, blob: Blob) => {
    logger.info('[MarketingService] Creating export record', { params }, 'marketingService');

    try {
        // 1. Upload Blob to Firebase Storage
        const fileName = `marketing_${params.patientId}_${Date.now()}.mp4`;
        const storageRef = ref(storage, `exports/${fileName}`);

        await uploadBytes(storageRef, blob, {
            customMetadata: {
                contentType: 'video/mp4',
                patientId: params.patientId,
                organizationId: params.organizationId,
                isAnonymized: params.isAnonymized.toString(),
            }
        });

        const downloadUrl = await getDownloadURL(storageRef);

        // 2. Insert DB Record in Firestore
        const exportData = {
            patient_id: params.patientId,
            organization_id: params.organizationId,
            // consent_id: '...', // Would need to fetch valid consent ID
            export_type: 'video_comparison',
            file_path: fileName,
            file_url: downloadUrl,
            is_anonymized: params.isAnonymized,
            metrics_overlay: params.metrics,
            created_at: new Date().toISOString(),
        };

        const docRef = await addDoc(collection(db, 'marketing_exports'), exportData);

        logger.info('[MarketingService] Export record created', { id: docRef.id }, 'marketingService');

        return {
            success: true,
            url: downloadUrl,
            id: docRef.id
        };
    } catch (error) {
        logger.error('[MarketingService] Error creating export record', error, 'marketingService');
        // Fallback to local blob URL if storage fails
        return {
            success: false,
            url: URL.createObjectURL(blob),
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
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
