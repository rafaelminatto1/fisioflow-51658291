/**
 * Onboarding Flow Screen
 * Multi-step flow for first-time users:
 * Welcome → Privacy Policy → Terms of Service → Medical Disclaimer → Biometric Setup (optional)
 * 
 * Requirements: 1.5, 1.12
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { db, auth } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { LEGAL_VERSIONS } from '@/constants/legalVersions';
import MedicalDisclaimerModal from '@/components/legal/MedicalDisclaimerModal';

type OnboardingStep = 'welcome' | 'privacy' | 'terms' | 'disclaimer' | 'biometric' | 'complete';

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
    currentStep: 'welcome',
    privacyAccepted: false,
    termsAccepted: false,
    disclaimerAccepted: false,
    biometricSetup: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showDisclaimerModal, setShowDisclaimerModal] = useState(false);

  /**
   * Check if user has already completed onboarding
   */
  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists() && userDoc.data()?.onboardingComplete) {
        // User has already completed onboarding, redirect to main app
        router.replace('/(tabs)');
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
    }
  };

  /**
   * Get device information for acceptance records
   */
  const getDeviceInfo = () => {
    return {
      model: Device.modelName || 'Unknown',
      osVersion: Device.osVersion || 'Unknown',
      appVersion: Constants.expoConfig?.version || '1.0.0',
      platform: 'ios' as const,
    };
  };

  /**
   * Store privacy policy acceptance
   */
  const storePrivacyAcceptance = async () => {
    const user = auth.currentUser;
    if (!user) throw new Error('No authenticated user');

    const acceptanceData = {
      userId: user.uid,
      version: LEGAL_VERSIONS.PRIVACY_POLICY,
      acceptedAt: serverTimestamp(),
      deviceInfo: getDeviceInfo(),
    };

    await setDoc(
      doc(db, 'privacy_acceptances', `${user.uid}_${LEGAL_VERSIONS.PRIVACY_POLICY}`),
      acceptanceData
    );
  };

  /**
   * Store terms of service acceptance
   */
  const storeTermsAcceptance = async () => {
    const user = auth.currentUser;
    if (!user) throw new Error('No authenticated user');

    const acceptanceData = {
      userId: user.uid,
      version: LEGAL_VERSIONS.TERMS_OF_SERVICE,
      acceptedAt: serverTimestamp(),
      deviceInfo: getDeviceInfo(),
    };

    await setDoc(
      doc(db, 'terms_acceptances', `${user.uid}_${LEGAL_VERSIONS.TERMS_OF_SERVICE}`),
      acceptanceData
    );
  };

  /**
   * Mark onboarding as complete in user document
   */
  const completeOnboarding = async () => {
    const user = auth.currentUser;
    if (!user) throw new Error('No authenticated user');

    await setDoc(
      doc(db, 'users', user.uid),
      {
        onboardingComplete: true,
        onboardingCompletedAt: serverTimestamp(),
        privacyPolicyVersion: LEGAL_VERSIONS.PRIVACY_POLICY,
        termsOfServiceVersion: LEGAL_VERSIONS.TERMS_OF_SERVICE,
        medicalDisclaimerVersion: LEGAL_VERSIONS.MEDICAL_DISCLAIMER,
        deviceInfo: getDeviceInfo(),
      },
      { merge: true }
    );
  };

  /**
   * Navigate to next step
   */
  const goToNextStep = async () => {
    setIsLoading(true);
    try {
      switch (state.currentStep) {
        case 'welcome':
          setState({ ...state, currentStep: 'privacy' });
          break;

        case 'privacy':
          await storePrivacyAcceptance();
          setState({ ...state, currentStep: 'terms', privacyAccepted: true });
          break;

        case 'terms':
          await storeTermsAcceptance();
          setState({ ...state, currentStep: 'disclaimer', termsAccepted: true });
          break;

        case 'disclaimer':
          setShowDisclaimerModal(true);
          break;

        case 'biometric':
          setState({ ...state, currentStep: 'complete' });
          await completeOnboarding();
          router.replace('/(tabs)');
          break;

        default:
          break;
      }
    } catch (error) {
      console.error('Error in onboarding flow:', error);
      alert('Erro ao processar. Por favor, tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle medical disclaimer acknowledgment
   */
  const handleDisclaimerAcknowledged = async () => {
    setShowDisclaimerModal(false);
    setState({ ...state, currentStep: 'biometric', disclaimerAccepted: true });
  };

  /**
   * Skip biometric setup
   */
  const skipBiometric = async () => {
    setIsLoading(true);
    try {
      await completeOnboarding();
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      alert('Erro ao finalizar. Por favor, tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Setup biometric authentication
   */
  const setupBiometric = () => {
    // Navigate to biometric setup screen
    router.push('/(auth)/biometric-setup?mode=onboarding' as any);
  };

  /**
   * Render welcome step
   */
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
        Este processo leva apenas alguns minutos e garante que você está ciente de como seus dados
        e os dados dos seus pacientes são protegidos.
      </Text>
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={goToNextStep}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryButtonText}>Começar</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  /**
   * Render privacy policy step
   */
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
          <Text style={styles.bulletText}>Criptografia AES-256 para todos os dados</Text>
        </View>
        <View style={styles.bulletItem}>
          <Ionicons name="checkmark-circle" size={20} color="#10B981" />
          <Text style={styles.bulletText}>Conformidade com LGPD e HIPAA</Text>
        </View>
        <View style={styles.bulletItem}>
          <Ionicons name="checkmark-circle" size={20} color="#10B981" />
          <Text style={styles.bulletText}>Seus direitos de acesso, correção e exclusão</Text>
        </View>
        <View style={styles.bulletItem}>
          <Ionicons name="checkmark-circle" size={20} color="#10B981" />
          <Text style={styles.bulletText}>Transparência sobre uso de dados</Text>
        </View>
      </ScrollView>
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => router.push('/(legal)/privacy-policy?mode=onboarding' as any)}
      >
        <Text style={styles.primaryButtonText}>Ler Política de Privacidade</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={goToNextStep}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#007AFF" />
        ) : (
          <Text style={styles.secondaryButtonText}>Já li e aceito</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  /**
   * Render terms of service step
   */
  const renderTerms = () => (
    <View style={styles.stepContainer}>
      <View style={styles.iconContainer}>
        <Ionicons name="document-text" size={64} color="#007AFF" />
      </View>
      <Text style={styles.title}>Termos de Uso</Text>
      <Text style={styles.description}>
        Os Termos de Uso estabelecem as regras para utilização do FisioFlow e suas
        responsabilidades como profissional de saúde.
      </Text>
      <ScrollView style={styles.bulletList}>
        <View style={styles.bulletItem}>
          <Ionicons name="checkmark-circle" size={20} color="#10B981" />
          <Text style={styles.bulletText}>Uso profissional e ético da plataforma</Text>
        </View>
        <View style={styles.bulletItem}>
          <Ionicons name="checkmark-circle" size={20} color="#10B981" />
          <Text style={styles.bulletText}>Responsabilidades clínicas</Text>
        </View>
        <View style={styles.bulletItem}>
          <Ionicons name="checkmark-circle" size={20} color="#10B981" />
          <Text style={styles.bulletText}>Proteção de dados dos pacientes</Text>
        </View>
        <View style={styles.bulletItem}>
          <Ionicons name="checkmark-circle" size={20} color="#10B981" />
          <Text style={styles.bulletText}>Limitações e garantias</Text>
        </View>
      </ScrollView>
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => router.push('/(legal)/terms-of-service?mode=onboarding' as any)}
      >
        <Text style={styles.primaryButtonText}>Ler Termos de Uso</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={goToNextStep}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#007AFF" />
        ) : (
          <Text style={styles.secondaryButtonText}>Já li e aceito</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  /**
   * Render biometric setup step
   */
  const renderBiometric = () => (
    <View style={styles.stepContainer}>
      <View style={styles.iconContainer}>
        <Ionicons name="finger-print" size={64} color="#007AFF" />
      </View>
      <Text style={styles.title}>Autenticação Biométrica</Text>
      <Text style={styles.description}>
        Proteja o acesso aos dados sensíveis de saúde dos seus pacientes com Face ID ou Touch ID.
      </Text>
      <ScrollView style={styles.bulletList}>
        <View style={styles.bulletItem}>
          <Ionicons name="checkmark-circle" size={20} color="#10B981" />
          <Text style={styles.bulletText}>Acesso rápido e seguro</Text>
        </View>
        <View style={styles.bulletItem}>
          <Ionicons name="checkmark-circle" size={20} color="#10B981" />
          <Text style={styles.bulletText}>Proteção contra acesso não autorizado</Text>
        </View>
        <View style={styles.bulletItem}>
          <Ionicons name="checkmark-circle" size={20} color="#10B981" />
          <Text style={styles.bulletText}>Conformidade com requisitos de segurança</Text>
        </View>
      </ScrollView>
      <Text style={styles.note}>
        Você pode configurar isso mais tarde nas configurações.
      </Text>
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={setupBiometric}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryButtonText}>Configurar Agora</Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={skipBiometric}
        disabled={isLoading}
      >
        <Text style={styles.secondaryButtonText}>Pular por Enquanto</Text>
      </TouchableOpacity>
    </View>
  );

  /**
   * Render current step
   */
  const renderStep = () => {
    switch (state.currentStep) {
      case 'welcome':
        return renderWelcome();
      case 'privacy':
        return renderPrivacy();
      case 'terms':
        return renderTerms();
      case 'biometric':
        return renderBiometric();
      default:
        return null;
    }
  };

  /**
   * Get progress percentage
   */
  const getProgress = () => {
    const steps = ['welcome', 'privacy', 'terms', 'disclaimer', 'biometric'];
    const currentIndex = steps.indexOf(state.currentStep);
    return ((currentIndex + 1) / steps.length) * 100;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${getProgress()}%` }]} />
        </View>
        <Text style={styles.progressText}>
          {Math.round(getProgress())}% completo
        </Text>
      </View>

      {/* Step content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {renderStep()}
      </ScrollView>

      {/* Medical Disclaimer Modal */}
      <MedicalDisclaimerModal
        visible={showDisclaimerModal}
        context="first-launch"
        onAcknowledge={handleDisclaimerAcknowledged}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  stepContainer: {
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  bulletList: {
    width: '100%',
    maxHeight: 200,
    marginVertical: 16,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  bulletText: {
    flex: 1,
    fontSize: 15,
    color: '#374151',
    marginLeft: 12,
  },
  note: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  primaryButton: {
    width: '100%',
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
    minHeight: 52,
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  secondaryButton: {
    width: '100%',
    backgroundColor: 'transparent',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
    minHeight: 52,
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
});
