import { Alert, Linking, Share } from "react-native";
import { biomechanicsApi, type BiomechanicsPdfResult } from "@/lib/api/biomechanics";

type CloudPdfInput = {
  assessment: {
    id: string;
    patientId?: string;
    analysisData?: Record<string, any> | null;
  };
  patient?: {
    name?: string | null;
  } | null;
  comparisonAssessmentId?: string;
  force?: boolean;
};

/**
 * Backend-owned PDF cache.
 * The Worker hashes clinical content and returns the existing R2 PDF when nothing changed.
 */
export async function getOrGenerateCloudPDF({
  assessment,
  patient,
  comparisonAssessmentId,
  force,
}: CloudPdfInput): Promise<BiomechanicsPdfResult> {
  if (!assessment?.id) {
    throw new Error("Avaliação biomecânica sem ID.");
  }

  const response = await biomechanicsApi.createOrReusePdf(assessment.id, {
    patientName: patient?.name ?? undefined,
    comparisonAssessmentId,
    force,
  });

  return response.data;
}

export async function shareCloudPDF(cloudUrl: string) {
  if (!cloudUrl) {
    Alert.alert("PDF indisponível", "Gere o laudo antes de compartilhar.");
    return;
  }

  try {
    await Share.share({
      title: "Laudo biomecânico FisioFlow",
      message: `Laudo biomecânico FisioFlow: ${cloudUrl}`,
      url: cloudUrl,
    });
  } catch {
    await Linking.openURL(cloudUrl);
  }
}
