import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AnalysisResult, REFERENCE_ANGLES } from "../../../types/biomechanics";
import { AnalysisResultCard } from "./AnalysisResultCard";
import { Button } from "../../Button";
import ViewShot, { captureRef } from "react-native-view-shot";
import * as Share from "expo-sharing";
import { generateBiomechanicsReport } from "../../../utils/pdf-generator";
import { biomechanicsApi } from "../../../lib/api/biomechanics";

interface BiomechanicsReportViewProps {
  result: AnalysisResult | null;
  onSave: (observations: string) => void;
  onClose: () => void;
}

export const BiomechanicsReportView: React.FC<BiomechanicsReportViewProps> = ({
  result: initialResult,
  onSave,
  onClose,
}) => {
  const [result, setResult] = useState<AnalysisResult | null>(initialResult);
  const [observations, setObservations] = useState(initialResult?.observations || "");
  const [isExporting, setIsExporting] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const reportRef = React.useRef<any>(null);

  const handleExportImage = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    try {
      const uri = await captureRef(reportRef.current, {
        format: "png",
        quality: 1,
      });
      await Share.shareAsync(uri);
    } catch (err: any) {
      console.error("Erro ao exportar imagem:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = async () => {
    if (!result) return;
    setIsExporting(true);
    try {
      await generateBiomechanicsReport({
        ...result,
        observations,
      });
    } catch (err: any) {
      console.error("Erro ao gerar PDF:", err);
      Alert.alert("Erro", "Não foi possível gerar o PDF.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleSignReport = async () => {
    if (!result?.id) {
      Alert.alert("Aviso", "Salve o relatório primeiro para poder assiná-lo.");
      return;
    }

    Alert.alert(
      "Certificar Relatório",
      "Deseja assinar digitalmente este relatório? Uma vez assinado, ele será bloqueado para edições e terá validade jurídica (Simulação ICP-Brasil).",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Assinar e Certificar",
          onPress: async () => {
            setIsSigning(true);
            try {
              await biomechanicsApi.signAssessment(result.id!);
              const verify = await biomechanicsApi.verifySignature(result.id!);
              setResult({
                ...result,
                isSigned: true,
                signature: {
                  signer: verify.signer,
                  signedAt: verify.signedAt,
                  hash: "CERTIFICADO-FISIOFLOW-" + result.id!.substring(0, 8).toUpperCase(),
                },
              });
              Alert.alert("Sucesso", "Relatório certificado e bloqueado com sucesso.");
            } catch {
              Alert.alert("Erro", "Falha ao assinar relatório. Tente novamente.");
            } finally {
              setIsSigning(false);
            }
          },
        },
      ],
    );
  };

  if (!result) return null;

  const isSigned = result.isSigned;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Relatório de Avaliação</Text>
          {isSigned && (
            <View style={styles.signedBadge}>
              <Ionicons name="ribbon" size={14} color="#10b981" />
              <Text style={styles.signedText}>CERTIFICADO</Text>
            </View>
          )}
        </View>
        <View style={{ flexDirection: "row", gap: 16 }}>
          <TouchableOpacity onPress={handleExportImage} disabled={isExporting}>
            <Ionicons name="image-outline" size={24} color="#3b82f6" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleExportPDF} disabled={isExporting}>
            <Ionicons name="document-text-outline" size={24} color="#3b82f6" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <ViewShot
          ref={reportRef}
          options={{ format: "png", quality: 1 }}
          style={{ backgroundColor: "#f8fafc" }}
        >
          <View style={styles.reportInner}>
            <View style={styles.reportHeader}>
              <View>
                <Text style={styles.brandTitle}>FISIOFLOW</Text>
                <Text style={styles.brandSubtitle}>LAB DE BIOMECÂNICA PRO</Text>
              </View>
              <View style={styles.dateBadge}>
                <Text style={styles.dateBadgeText}>
                  {new Date(result.timestamp).toLocaleDateString("pt-BR")}
                </Text>
              </View>
            </View>

            {isSigned && (
              <View style={styles.signatureHeaderBanner}>
                <Ionicons name="shield-checkmark" size={20} color="#059669" />
                <View>
                  <Text style={styles.signatureBannerTitle}>Documento Assinado Digitalmente</Text>
                  <Text style={styles.signatureBannerSub}>
                    Assinado por: {result.signature?.signer} em{" "}
                    {new Date(result.signature?.signedAt || "").toLocaleString("pt-BR")}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.patientInfo}>
              <Text style={styles.patientLabel}>PACIENTE</Text>
              <Text style={styles.patientName}>{result.patientName || "Paciente"}</Text>
            </View>

            <Text style={styles.sectionTitle}>Métricas de Pico Detectadas</Text>
            <Text style={styles.sectionSubtitle}>Amplitude máxima atingida durante a gravação</Text>

            {result.angles.map((angle, index) => {
              const refKey =
                Object.keys(REFERENCE_ANGLES).find((k) =>
                  angle.joint.includes(REFERENCE_ANGLES[k].label),
                ) || "joelho_flex";
              const ref = REFERENCE_ANGLES[refKey];

              return (
                <AnalysisResultCard
                  key={index}
                  joint={angle.joint}
                  angle={angle.angle}
                  reference={ref.reference}
                  tolerance={ref.tolerance}
                />
              );
            })}

            {result.symmetries && result.symmetries.length > 0 && (
              <View style={styles.symmetryBox}>
                <Text style={styles.sectionTitle}>Assimetria Esquerda/Direita</Text>
                <Text style={styles.sectionSubtitle}>Diferença entre o pico de cada lado</Text>
                {result.symmetries.map((s, i) => (
                  <View key={i} style={styles.symmetryRow}>
                    <Text style={styles.symmetryLabel}>{s.joint}</Text>
                    <View style={styles.symmetryValueBox}>
                      <Text style={styles.symmetryDiff}>{s.diff}°</Text>
                      <Text
                        style={[
                          styles.symmetryPercentage,
                          s.percentage > 10 ? { color: "#ef4444" } : { color: "#10b981" },
                        ]}
                      >
                        {s.percentage}%
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {(observations || isSigned) && (
              <View style={styles.observationBox}>
                <Text style={styles.sectionTitle}>Conclusão Clínica</Text>
                <View style={[styles.obsContent, isSigned && styles.obsContentSigned]}>
                  <Text style={styles.obsText}>
                    {observations || "Nenhuma observação registrada."}
                  </Text>
                </View>
              </View>
            )}

            {isSigned && (
              <View style={styles.verificationBox}>
                <View style={styles.qrPlaceholder}>
                  <Ionicons name="qr-code" size={40} color="#64748b" />
                </View>
                <View style={styles.verificationText}>
                  <Text style={styles.verificationTitle}>Verificação de Autenticidade</Text>
                  <Text style={styles.verificationHash}>{result.signature?.hash}</Text>
                  <Text style={styles.verificationDisclaimer}>
                    Este documento é assinado digitalmente nos termos da MP 2.200-2/2001.
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.footer}>
              <Text style={styles.footerText}>Avaliação biomecânica gerada via IA FisioFlow</Text>
              <Text style={styles.footerUrl}>www.moocafisio.com.br</Text>
            </View>
          </View>
        </ViewShot>

        {!isSigned && (
          <View style={styles.editorBox}>
            <Text style={styles.sectionTitle}>Notas da Sessão</Text>
            <TextInput
              style={styles.input}
              multiline
              numberOfLines={4}
              placeholder="Adicione notas sobre a postura, compensações ou limitações observadas..."
              value={observations}
              onChangeText={setObservations}
            />
          </View>
        )}

        <View style={styles.actionsContainer}>
          {!isSigned ? (
            <>
              <Button
                title="Salvar Rascunho"
                onPress={() => onSave(observations)}
                variant="outline"
                style={styles.actionButton}
              />
              <Button
                title={isSigning ? "Certificando..." : "Assinar e Bloquear"}
                onPress={handleSignReport}
                variant="primary"
                style={styles.actionButton}
                leftIcon={
                  isSigning ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="pencil" size={20} color="#fff" />
                  )
                }
                disabled={isSigning}
              />
            </>
          ) : (
            <Button title="Voltar" onPress={onClose} variant="primary" style={styles.saveButton} />
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: "white",
  },
  titleContainer: {
    flex: 1,
    alignItems: "center",
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1e293b",
  },
  signedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ecfdf5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
    gap: 4,
  },
  signedText: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#10b981",
  },
  content: {
    padding: 20,
  },
  patientInfo: {
    marginBottom: 20,
    backgroundColor: "white",
    padding: 16,
    borderRadius: 16,
  },
  patientLabel: {
    fontSize: 10,
    color: "#64748b",
    fontWeight: "bold",
    marginBottom: 4,
  },
  patientName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1e293b",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 4,
    marginTop: 8,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: "#64748b",
    marginBottom: 16,
  },
  reportInner: {
    padding: 20,
    backgroundColor: "#f8fafc",
  },
  reportHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
    borderBottomWidth: 2,
    borderBottomColor: "#0080FF",
    paddingBottom: 16,
  },
  signatureHeaderBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ecfdf5",
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: "#10b98130",
  },
  signatureBannerTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#065f46",
  },
  signatureBannerSub: {
    fontSize: 11,
    color: "#059669",
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#0080FF",
    letterSpacing: 1,
  },
  brandSubtitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#64748b",
    letterSpacing: 2,
  },
  dateBadge: {
    backgroundColor: "#e2e8f0",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  dateBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  editorBox: {
    marginTop: 20,
  },
  observationBox: {
    marginTop: 20,
    marginBottom: 20,
  },
  obsContent: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#0080FF",
  },
  obsContentSigned: {
    borderLeftColor: "#10b981",
    backgroundColor: "#f0fdf4",
  },
  obsText: {
    fontSize: 14,
    color: "#334155",
    lineHeight: 20,
  },
  input: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    height: 100,
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    color: "#1e293b",
    marginTop: 8,
  },
  verificationBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    padding: 16,
    borderRadius: 16,
    marginTop: 24,
    gap: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  qrPlaceholder: {
    width: 60,
    height: 60,
    backgroundColor: "#f1f5f9",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  verificationText: {
    flex: 1,
  },
  verificationTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#1e293b",
  },
  verificationHash: {
    fontSize: 10,
    color: "#64748b",
    fontFamily: "Courier",
    marginTop: 2,
  },
  verificationDisclaimer: {
    fontSize: 8,
    color: "#94a3b8",
    marginTop: 4,
  },
  footer: {
    marginTop: 40,
    alignItems: "center",
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  footerText: {
    fontSize: 10,
    color: "#94a3b8",
  },
  footerUrl: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#0080FF",
    marginTop: 4,
  },
  actionsContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
    marginBottom: 40,
  },
  actionButton: {
    flex: 1,
  },
  saveButton: {
    marginTop: 20,
    marginBottom: 40,
  },
  symmetryBox: {
    marginTop: 24,
    padding: 16,
    backgroundColor: "white",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  symmetryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  symmetryLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
  },
  symmetryValueBox: {
    alignItems: "flex-end",
  },
  symmetryDiff: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1e293b",
  },
  symmetryPercentage: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
});
