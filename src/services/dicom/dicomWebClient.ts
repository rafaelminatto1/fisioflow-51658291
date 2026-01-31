/**
 * DICOM Web Client - Migrated to Firebase
 *
 * Migration from Supabase to Firebase:
 * - supabase.functions.invoke() → Firebase Functions httpsCallable()
 */

import { getFirebaseFunctions } from '@/integrations/firebase/functions';
import { httpsCallable } from 'firebase/functions';
import { fisioLogger as logger } from '@/lib/errors/logger';

const PROXY_FUNCTION = 'dicom-proxy';

// Type definitions for standard DICOMweb JSON
export interface DicomStudy {
    [tag: string]: unknown;
    "0020000D"?: { Value: string[] }; // StudyInstanceUID
    "00080020"?: { Value: string[] }; // StudyDate
    "00081030"?: { Value: string[] }; // StudyDescription
    "00100010"?: { Value: [{ Alphabetic: string }] }; // PatientName
    "00100020"?: { Value: string[] }; // PatientID
}

export const dicomWebClient = {
    /**
     * Search for Studies (QIDO-RS)
     */
    searchStudies: async (filters: Record<string, string> = {}): Promise<DicomStudy[]> => {
        try {
            const functions = getFirebaseFunctions();
            const dicomProxyFunction = httpsCallable(functions, PROXY_FUNCTION);

            // Construct query string
            const params = new URLSearchParams(filters);
            // Add minimal return tags if needed, or rely on server defaults
            params.append('limit', '20');

            const path = `studies?${params.toString()}`;

            const { data } = await dicomProxyFunction({
                method: 'GET',
                headers: {
                    // DICOMweb JSON
                    'Accept': 'application/dicom+json',
                    'x-dicom-path': path
                }
            });

            return data as DicomStudy[];
        } catch (error) {
            logger.error('[dicomWebClient] searchStudies error', error, 'dicomWebClient');
            throw error;
        }
    },

    /**
     * Get WADO-URI compatible URL for the Proxy
     * Used by Cornerstone Image Loaders
     */
    getProxyUrl: (): string => {
        // We construct the base URL for the Firebase Cloud Function
        // The Loader will append the path
        // BUT standard loaders usually expect a direct URL template.
        // We might need a custom loader or pass the full URL.

        // Firebase Cloud Function URL format:
        // https://<region>-<project>.cloudfunctions.net/dicom-proxy
        // Or via Firebase Hosting: https://<project>.web.app/dicom-proxy

        // For MVP, we return the base Function URL.
        // In production, you should configure this based on your Firebase project region
        const region = import.meta.env.VITE_FIREBASE_FUNCTIONS_REGION || 'southamerica-east1';
        const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;

        if (projectId) {
            return `https://${region}-${projectId}.cloudfunctions.net/${PROXY_FUNCTION}`;
        }

        // Fallback to hosting URL if available
        const hostingUrl = import.meta.env.VITE_FIREBASE_HOSTING_URL;
        if (hostingUrl) {
            return `${hostingUrl}/${PROXY_FUNCTION}`;
        }

        logger.warn('[dicomWebClient] Unable to construct proxy URL - missing Firebase configuration', undefined, 'dicomWebClient');
        return '/dicom-proxy'; // Fallback to relative path
    },

    /**
     * Store Instances (STOW-RS)
     * Uploads DICOM files
     */
    storeInstances: async (files: File[]) => {
        try {
            const functions = getFirebaseFunctions();
            const dicomProxyFunction = httpsCallable(functions, PROXY_FUNCTION);

            // STOW-RS usually sends multipart/related.
            // Creating a proper multipart/related request in JS fetch is tricky manually.
            // However, Orthanc also accepts simple POST of a raw DICOM file to /instances
            // OR standard STOW.

            // For simplicity with the Proxy (which handles streaming body), we can try sending single file
            // to /instances if we iterate, or use a STOW library.
            // Let's iterate for MVP robustness if STOW is complex to construct manually.

            const results = [];
            for (const file of files) {
                const path = 'instances';
                // We need to send raw binary body
                // Note: Firebase Functions httpsCallable expects JSON data, so we need to base64 encode the file
                const reader = new FileReader();
                const base64File = await new Promise<string>((resolve, reject) => {
                    reader.onload = () => {
                        const result = reader.result as string;
                        // Remove data URL prefix if present
                        const base64 = result.split(',')[1] || result;
                        resolve(base64);
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });

                const { data, error } = await dicomProxyFunction({
                    method: 'POST',
                    body: base64File,
                    headers: {
                        'Content-Type': 'application/dicom',
                        'x-dicom-path': path,
                        'x-file-name': file.name
                    }
                });

                results.push({
                    file: file.name,
                    success: !error,
                    error,
                    data
                });
            }
            return results;
        } catch (error) {
            logger.error('[dicomWebClient] storeInstances error', error, 'dicomWebClient');
            throw error;
        }
    }
};
