import { request } from "@/api/v2/base";
import { biomechanicsApi, BiomechanicsAssessment } from "@/api/v2/biomechanics";
import { UnifiedLandmark } from "@/utils/geometry";

interface UploadResponse {
  data: {
    uploadUrl: string;
    publicUrl: string;
    key: string;
  };
}

/**
 * Service to handle persistence of biomechanical assessments (Media + Data)
 */
export const biomechanicsPersistenceService = {
  /**
   * Uploads a file (Blob or DataURL) to Cloudflare R2 and returns the public URL
   */
  async uploadMedia(data: Blob | string, contentType: string, folder: string = 'biomechanics'): Promise<string> {
    // 1. Get Signed URL
    const { data: uploadInfo } = await request<UploadResponse>('/api/media/upload-url', {
      method: 'POST',
      body: JSON.stringify({ contentType, folder }),
    });

    // 2. Perform the actual upload
    const body = typeof data === 'string' ? await (await fetch(data)).blob() : data;
    
    const uploadRes = await fetch(uploadInfo.uploadUrl, {
      method: 'PUT',
      body,
      headers: { 'Content-Type': contentType },
    });

    if (!uploadRes.ok) throw new Error('Falha no upload para o storage');

    return uploadInfo.publicUrl;
  },

  /**
   * Saves a complete assessment to the database
   */
  async saveAssessment(params: {
    patientId: string;
    type: BiomechanicsAssessment['type'];
    mediaData: Blob | string; // Video or Image
    landmarks: UnifiedLandmark[];
    angles?: Record<string, number>;
    observations?: string;
  }) {
    // Determine content type
    const isVideo = typeof params.mediaData === 'string' ? params.mediaData.includes('video/mp4') : params.mediaData.type.includes('video');
    const contentType = isVideo ? 'video/mp4' : 'image/jpeg';

    // 1. Upload Media
    const mediaUrl = await this.uploadMedia(params.mediaData, contentType);

    // 2. Create Assessment Record
    const { data: assessment } = await biomechanicsApi.create({
      patientId: params.patientId,
      type: params.type,
      mediaUrl,
      analysisData: {
        landmarks: params.landmarks,
        angles: params.angles,
      },
      observations: params.observations,
      status: 'completed',
    });

    return assessment;
  }
};
