/**
 * Onboarding Flow Screen
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { LEGAL_VERSIONS } from "@/constants/legalVersions";
import MedicalDisclaimerModal from "@/components/legal/MedicalDisclaimerModal";
import { authApi } from "@/lib/auth-api";
import { fetchApi } from "@/lib/api";

type OnboardingStep = "welcome" | "privacy" | "terms" | "disclaimer" | "biometric" | "complete";

interface OnboardingState {
  currentStep: OnboardingStep;
  privacyAccepted: boolean;
  termsAccepted: boolean;
  disclaimerAccepted: boolean;
  biometricSetup: boolean;
}

export default function OnboardingScreen() {
  const router = useRouter();
  const [state, setState] = useState<OnboardingState>({
    currentStep: "welcome",
    privacyAccepted: false,
    termsAccepted: false,
    disclaimerAccepted: false,
    biometricSetup: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showDisclaimerModal, setShowDisclaimerModal] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const currentUser = await authApi.getMe();
      setUser(currentUser);

      const res = await fetchApi<any>(`/api/users/${currentUser.id}`);
      if (res.data?.onboardingComplete) {
        router.replace("/(tabs)");
      }
    } catch (error) {
      console.error("Error checking onboarding status:", error);
    }
  };

  const getDeviceInfo = () => {
    return {
      model: Device.modelName || "Unknown",
      osVersion: Device.osVersion || "Unknown",
      appVersion: Constants.expoConfig?.version || "1.0.0",
      platform: "ios" as const,
    };
  };

  const storeAcceptance = async (type: string, version: string) => {
    if (!user) throw new Error("No authenticated user");
    await fetchApi("/api/consents/accept", {
      method: "POST",
      data: {
        userId: user.id,
        type,
        version,
        deviceInfo: getDeviceInfo(),
      },
    });
  };

  const completeOnboarding = async () => {
    if (!user) throw new Error("No authenticated user");

    await fetchApi(`/api/users/${user.id}`, {
      method: "PUT",
      data: {
        onboardingComplete: true,
        onboardingCompletedAt: new Date().toISOString(),
        privacyPolicyVersion: LEGAL_VERSIONS.PRIVACY_POLICY,
        termsOfServiceVersion: LEGAL_VERSIONS.TERMS_OF_SERVICE,
        medicalDisclaimerVersion: LEGAL_VERSIONS.MEDICAL_DISCLAIMER,
        deviceInfo: getDeviceInfo(),
      },
    });
  };

  const goToNextStep = async () => {
    setIsLoading(true);
    try {
      switch (state.currentStep) {
        case "welcome":
          setState({ ...state, currentStep: "privacy" });
          break;

        case "privacy":
          await storeAcceptance("privacy_policy", LEGAL_VERSIONS.PRIVACY_POLICY);
          setState({ ...state, currentStep: "terms", privacyAccepted: true });
          break;

        case "terms":
          await storeAcceptance("terms_of_service", LEGAL_VERSIONS.TERMS_OF_SERVICE);
          setState({ ...state, currentStep: "disclaimer", termsAccepted: true });
          break;

        case "disclaimer":
          setShowDisclaimerModal(true);
          break;

        case "biometric":
          setState({ ...state, currentStep: "complete" });
          await completeOnboarding();
          router.replace("/(tabs)");
          break;

        default:
          break;
      }
    } catch (error) {
      console.error("Error in onboarding flow:", error);
      alert("Erro ao processar. Por favor, tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisclaimerAcknowledged = async () => {
    setShowDisclaimerModal(false);
    setState({ ...state, currentStep: "biometric", disclaimerAccepted: true });
  };

  const skipBiometric = async () => {
    setIsLoading(true);
    try {
      await completeOnboarding();
      router.replace("/(tabs)");
    } catch (error) {
      console.error("Error completing onboarding:", error);
      alert("Erro ao finalizar. Por favor, tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const setupBiometric = () => {
    router.push("/(auth)/biometric-setup?mode=onboarding" as any);
  };

  const renderWelcome = () => (
    <View style={styles.stepContainer}>
      <View style={styles.iconContainer}>
        <Ionicons name="hand-right" size={64} color="#007AFF" />
      </View>
      <Text style={styles.title}>Bem-vindo ao FisioFlow</Text>
      <Text style={styles.description}>
        Antes de começar, precisamos que você leia e aceite alguns documentos importantes sobre
        privacidade, termos de uso e responsabilidades médicas.
      </Text>
      <Text style={styles.description}>
        Este processo leva apenas alguns minutos e garante que você está ciente de como seus dados e
        os dados dos seus pacientes são protegidos.
      </Text>
      <TouchableOpacity style={styles.primaryButton} onPress={goToNextStep} disabled={isLoading}>
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryButtonText}>Começar</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderPrivacy = () => (
    <View style={styles.stepContainer}>
      <View style={styles.iconContainer}>
        <Ionicons name="shield-checkmark" size={64} color="#007AFF" />
      </View>
      <Text style={styles.title}>Política de Privacidade</Text>
      <Text style={styles.description}>
        Nossa Política de Privacidade explica como coletamos, usamos e protegemos seus dados e os
        dados de saúde dos seus pacientes (PHI).
      </Text>
      <ScrollView style={styles.bulletList}>
        <View style={styles.bulletItem}>
          <Ionicons name="checkmark-circle" size={20} color="#10B981" />
          <Text style={styles.bulletText}>Criptografia para todos os dados</Text>
        </View>
        <View style={styles.bulletItem}>
          <Ionicons name="checkmark-circle" size={20} color="#10B981" />
          <Text style={styles.bulletText}>Conformidade com LGPD</Text>
        </View>
      </ScrollView>
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => router.push("/(legal)/privacy-policy?mode=onboarding" as any)}
      >
        <Text style={styles.primaryButtonText}>Ler Política de Privacidade</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.secondaryButton} onPress={goToNextStep} disabled={isLoading}>
        {isLoading ? (
          <ActivityIndicator color="#007AFF" />
        ) : (
          <Text style={styles.secondaryButtonText}>Já li e aceito</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderTerms = () => (
    <View style={styles.stepContainer}>
      <View style={styles.iconContainer}>
        <Ionicons name="document-text" size={64} color="#007AFF" />
      </View>
      <Text style={styles.title}>Termos de Uso</Text>
      <Text style={styles.description}>
        Os Termos de Uso estabelecem as regras para utilização do FisioFlow e suas responsabilidades
        como profissional de saúde.
      </Text>
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => router.push("/(legal)/terms-of-service?mode=onboarding" as any)}
      >
        <Text style={styles.primaryButtonText}>Ler Termos de Uso</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.secondaryButton} onPress={goToNextStep} disabled={isLoading}>
        {isLoading ? (
          <ActivityIndicator color="#007AFF" />
        ) : (
          <Text style={styles.secondaryButtonText}>Já li e aceito</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderBiometric = () => (
    <View style={styles.stepContainer}>
      <View style={styles.iconContainer}>
        <Ionicons name="finger-print" size={64} color="#007AFF" />
      </View>
      <Text style={styles.title}>Autenticação Biométrica</Text>
      <Text style={styles.description}>
        Proteja o acesso aos dados sensíveis de saúde dos seus pacientes.
      </Text>
      <TouchableOpacity style={styles.primaryButton} onPress={setupBiometric} disabled={isLoading}>
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryButtonText}>Configurar Agora</Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity style={styles.secondaryButton} onPress={skipBiometric} disabled={isLoading}>
        <Text style={styles.secondaryButtonText}>Pular por Enquanto</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStep = () => {
    switch (state.currentStep) {
      case "welcome":
        return renderWelcome();
      case "privacy":
        return renderPrivacy();
      case "terms":
        return renderTerms();
      case "biometric":
        return renderBiometric();
      default:
        return null;
    }
  };

  const getProgress = () => {
    const steps = ["welcome", "privacy", "terms", "disclaimer", "biometric"];
    const currentIndex = steps.indexOf(state.currentStep);
    return ((currentIndex + 1) / steps.length) * 100;
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${getProgress()}%` }]} />
        </View>
        <Text style={styles.progressText}>{Math.round(getProgress())}% completo</Text>
      </View>
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {renderStep()}
      </ScrollView>
      <MedicalDisclaimerModal
        visible={showDisclaimerModal}
        context="first-launch"
        onAcknowledge={handleDisclaimerAcknowledged}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  progressBar: {
    height: 4,
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressFill: { height: "100%", backgroundColor: "#007AFF", borderRadius: 2 },
  progressText: { fontSize: 12, color: "#6B7280", textAlign: "center" },
  content: { flex: 1 },
  contentContainer: { flexGrow: 1, justifyContent: "center", padding: 20 },
  stepContainer: { alignItems: "center" },
  iconContainer: { marginBottom: 24 },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1F2937",
    textAlign: "center",
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 16,
  },
  bulletList: { width: "100%", maxHeight: 200, marginVertical: 16 },
  bulletItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  bulletText: { flex: 1, fontSize: 15, color: "#374151", marginLeft: 12 },
  note: { fontSize: 14, color: "#9CA3AF", textAlign: "center", marginTop: 8, marginBottom: 16 },
  primaryButton: {
    width: "100%",
    backgroundColor: "#007AFF",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 24,
    minHeight: 52,
    justifyContent: "center",
  },
  primaryButtonText: { fontSize: 16, fontWeight: "600", color: "#fff" },
  secondaryButton: {
    width: "100%",
    backgroundColor: "transparent",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
    minHeight: 52,
    justifyContent: "center",
  },
  secondaryButtonText: { fontSize: 16, fontWeight: "600", color: "#007AFF" },
});
