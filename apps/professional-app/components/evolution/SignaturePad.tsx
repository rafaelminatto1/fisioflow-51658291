import React, { useRef, useState } from "react";
import { View, StyleSheet, TouchableOpacity, Text, ActivityIndicator, Alert } from "react-native";
import SignatureScreen from "react-native-signature-canvas";
import { Ionicons } from "@expo/vector-icons";
import { fetchApi } from "@/lib/api";

interface SignaturePadProps {
  onSignatureSaved: (url: string) => void;
  colors: any;
  label?: string;
}

export function SignaturePad({
  onSignatureSaved,
  colors,
  label = "Assinatura do Paciente",
}: SignaturePadProps) {
  const signatureRef = useRef<any>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleSignature = async (signature: string) => {
    // signature is a base64 encoded png image
    setIsUploading(true);
    try {
      // 1. Get Presigned URL
      const uploadData = await fetchApi<any>("/api/upload-url", {
        method: "POST",
        data: {
          contentType: "image/png",
          folder: "signatures",
        },
      });

      const uploadUrl = uploadData.uploadUrl || uploadData.upload_url;
      const publicUrl = uploadData.publicUrl || uploadData.public_url;

      if (!uploadUrl || !publicUrl) {
        throw new Error("Erro ao gerar URL de upload.");
      }

      // 2. Upload to Cloudflare R2
      // Convert base64 to Blob
      const base64Data = signature.replace(/^data:image\/png;base64,/, "");

      // In React Native, fetch can handle base64 data URIs
      const response = await fetch(signature);
      const blob = await response.blob();

      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": "image/png",
        },
        body: blob,
      });

      if (!uploadRes.ok) {
        throw new Error(`Upload falhou: ${uploadRes.status}`);
      }

      onSignatureSaved(publicUrl);
      setIsSigning(false);
    } catch (error) {
      console.error("Signature upload error:", error);
      Alert.alert("Erro", "Não foi possível salvar a assinatura.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleClear = () => {
    signatureRef.current?.clearSignature();
  };

  const handleConfirm = () => {
    signatureRef.current?.readSignature();
  };

  if (!isSigning) {
    return (
      <View style={styles.container}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
        <TouchableOpacity
          style={[styles.openButton, { borderColor: colors.primary }]}
          onPress={() => setIsSigning(true)}
        >
          <Ionicons name="pencil-outline" size={20} color={colors.primary} />
          <Text style={[styles.openButtonText, { color: colors.primary }]}>Coletar Assinatura</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>

      <View style={[styles.signatureContainer, { borderColor: colors.border }]}>
        {isUploading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ color: colors.text }}>Salvando...</Text>
          </View>
        )}
        <SignatureScreen
          ref={signatureRef}
          onOK={handleSignature}
          webStyle={`
            .m-signature-pad { box-shadow: none; border: none; }
            .m-signature-pad--body { border: none; }
            .m-signature-pad--footer { display: none; margin: 0px; }
            body,html { width: 100%; height: 100%; margin: 0; padding: 0; }
          `}
          autoClear={false}
          descriptionText=""
          clearText="Limpar"
          confirmText="Confirmar"
          backgroundColor="#ffffff"
          penColor="#000000"
        />
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[
            styles.actionButton,
            { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
          ]}
          onPress={handleClear}
          disabled={isUploading}
        >
          <Text style={[styles.actionButtonText, { color: colors.text }]}>Limpar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.primary }]}
          onPress={handleConfirm}
          disabled={isUploading}
        >
          <Text style={[styles.actionButtonText, { color: "#fff" }]}>Confirmar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  openButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 8,
    gap: 8,
  },
  openButtonText: {
    fontSize: 16,
    fontWeight: "500",
  },
  signatureContainer: {
    height: 200,
    borderWidth: 1,
    borderRadius: 8,
    overflow: "hidden",
    position: "relative",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.8)",
    zIndex: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
