import { supabase } from "@/integrations/supabase/client";

const PROXY_FUNCTION = 'dicom-proxy';

// Type definitions for standard DICOMweb JSON
export interface DicomStudy {
    [tag: string]: any;
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
        // Construct query string
        const params = new URLSearchParams(filters);
        // Add minimal return tags if needed, or rely on server defaults
        params.append('limit', '20');

        const path = `studies?${params.toString()}`;

        const { data, error } = await supabase.functions.invoke(PROXY_FUNCTION, {
            method: 'GET',
            headers: {
                // DICOMweb JSON
                'Accept': 'application/dicom+json',
                'x-dicom-path': path
            }
        });

        if (error) throw error;
        return data as DicomStudy[];
    },

    /**
     * Get WADO-URI compatible URL for the Proxy
     * Used by Cornerstone Image Loaders
     */
    getProxyUrl: (): string => {
        // We construct the base URL for the edge function
        // The Loader will append the path
        // BUT standard loaders usually expect a direct URL template.
        // We might need a custom loader or pass the full URL.

        // Supabase Edge Function URL:
        // https://<project>.supabase.co/functions/v1/dicom-proxy
        // We append ?path=... for our proxy logic.

        // However, Cornerstone WADO Image Loader usually constructs the URL itself based on Study/Series/Instance.
        // We can pass a custom `wadoRoot` to Cornerstone that points to our proxy.
        // e.g. wadoRoot = "https://.../dicom-proxy?path=" 
        // NOTE: Our proxy expects path to be "studies/..." so we need to be careful how the loader appends.

        // For MVP, we return the base Function URL.
        const url = new URL(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${PROXY_FUNCTION}`);
        return url.toString();
    },

    /**
     * Store Instances (STOW-RS)
     * Uploads DICOM files
     */
    storeInstances: async (files: File[]) => {
        const formData = new FormData();
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
            const { data, error } = await supabase.functions.invoke(PROXY_FUNCTION, {
                method: 'POST',
                body: file, // Send file directly as body
                headers: {
                    'Content-Type': 'application/dicom',
                    'x-dicom-path': path
                }
            });
            results.push({ file: file.name, success: !error, error });
        }
        return results;
    }
};
