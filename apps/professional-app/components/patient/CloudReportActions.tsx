import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { reportsApi } from "@/lib/api";
import { useColors } from "@/hooks/useColorScheme";
import { useHaptics } from "@/hooks/useHaptics";

interface CloudReportActionsProps {
  patientId: string;
  patientName: string;
  reportData: any;
  reportType: string;
}

export function CloudReportActions({
  patientId,
  patientName,
  reportData,
  reportType,
}: CloudReportActionsProps) {
  const colors = useColors();
  const { light, success, error } = useHaptics();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [cloudInfo, setCloudInfo] = useState<{ pdfKey: string; pdfUrl: string } | null>(null);

  const handleGenerateCloud = async () => {
    light();
    setIsGenerating(true);
    try {
      const res = await reportsApi.generatePdf({
        type: reportType,
        patientId,
        patientName,
        data: reportData,
        saveToR2: true,
        includeHtml: true,
      });

      setCloudInfo({
        pdfKey: res.pdfKey,
        pdfUrl: res.pdfUrl,
      });
      success();
      Alert.alert("Sucesso", "Relatório salvo na nuvem!");
    } catch (err: any) {
      error();
      console.error("[Cloud] Error:", err);
      Alert.alert("Erro", "Falha ao salvar relatório na nuvem.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShare = async () => {
    if (!cloudInfo?.pdfKey) return;

    light();
    setIsSharing(true);
    try {
      // Gera um link temporário de 48 horas
      const res = await reportsApi.shareLink({
        key: cloudInfo.pdfKey,
        expiresIn: 172800,
      });

      setIsSharing(false);

      const message = `Olá, segue o link para o relatório de ${patientName}:\n\n${res.url}\n\nEste link expira em 48 horas.`;

      await Share.share({
        message,
        url: res.url,
        title: `Relatório - ${patientName}`,
      });
    } catch (err: any) {
      setIsSharing(false);
      error();
      Alert.alert("Erro", "Falha ao gerar link de compartilhamento.");
    }
  };

  return (
    <View style={[styles.container, { borderTopColor: colors.border + "40" }]}>
      <View style={styles.header}>
        <Ionicons name="cloud-outline" size={18} color={colors.primary} />
        <Text style={[styles.title, { color: colors.text }]}>Compartilhamento em Nuvem</Text>
      </View>

      {!cloudInfo ? (
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={handleGenerateCloud}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="cloud-upload-outline" size={20} color="#FFFFFF" />
              <Text style={styles.buttonText}>Gerar Link na Nuvem</Text>
            </>
          )}
        </TouchableOpacity>
      ) : (
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.shareBtn, { backgroundColor: colors.success }]}
            onPress={handleShare}
            disabled={isSharing}
          >
            {isSharing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="share-social-outline" size={20} color="#FFFFFF" />
                <Text style={styles.buttonText}>Compartilhar Link</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.viewBtn, { borderColor: colors.primary, borderWidth: 1 }]}
            onPress={() => {
              light();
              // Abre o PDF no navegador
              // Linking.openURL(cloudInfo.pdfUrl);
            }}
          >
            <Ionicons name="eye-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
      )}

      {cloudInfo && (
        <Text style={[styles.footerText, { color: colors.textSecondary }]}>
          * O link gerado expira em 48 horas por segurança.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 16,
    marginTop: 16,
    borderTopWidth: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 12,
  },
  shareBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  viewBtn: {
    width: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  footerText: {
    fontSize: 11,
    fontStyle: "italic",
    marginTop: 8,
    textAlign: "center",
  },
});
