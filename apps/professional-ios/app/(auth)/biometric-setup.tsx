/**
 * Biometric Setup Screen
 * Allows users to configure Face ID/Touch ID authentication with PIN fallback
 * 
 * Features:
 * - Detect available biometric type (Face ID or Touch ID)
 * - Show setup flow with explanation of benefits
 * - Offer PIN fallback setup (6 digits minimum)
 * - Store BiometricConfig in Firestore collection `biometric_configs`
 * - Allow skip (can enable later in settings)
 * 
 * Requirements: 5.1, 5.2
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { biometricAuthService } from '@/lib/services/biometricAuthService';
import { auth } from '@/lib/firebase';
import type { BiometricType } from '@/types/auth';

type SetupStep = 'intro' | 'biometric' | 'pin' | 'complete';

export default function BiometricSetupScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const mode = (params.mode as 'setup' | 'onboarding') || 'setup';

  const [currentStep, setCurrentStep] = useState<SetupStep>('intro');
  const [biometricType, setBiometricType] = useState<BiometricType>('none');
  const [isAvailable, setIsAvailable] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPinSetup, setShowPinSetup] = useState(false);

  /**
   * Check biometric availability on mount
   */
  useEffect(() => {
    checkBiometricAvailability();
  }, []);

  /**
   * Check if biometric authentication is available
   */
  const checkBiometricAvailability = async () => {
    try {
      const available = await biometricAuthService.isAvailable();
      setIsAvailable(available);

      if (available) {
        const type = await biometricAuthService.getBiometricType();
        setBiometricType(type);
      }
    } catch (error) {
      console.error('Error checking biometric availability:', error);
      setIsAvailable(false);
      setBiometricType('none');
    }
  };

  /**
   * Get biometric icon based on type
   */
  const getBiometricIcon = (): keyof typeof Ionicons.glyphMap => {
    switch (biometricType) {
      case 'faceId':
        return 'scan';
      case 'touchId':
        return 'finger-print';
      default:
        return 'lock-closed';
    }
  };

  /**
   * Get biometric name in Portuguese
   */
  const getBiometricName = (): string => {
    switch (biometricType) {
      case 'faceId':
        return 'Face ID';
      case 'touchId':
        return 'Touch ID';
      default:
        return 'Autenticação Biométrica';
    }
  };

  /**
   * Setup biometric authentication
   */
  const setupBiometric = async () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Erro', 'Usuário não autenticado');
      return;
    }

    setIsLoading(true);
    try {
      // Test biometric authentication first
      const authenticated = await biometricAuthService.authenticate(
        'Autentique para configurar a proteção biométrica'
      );

      if (!authenticated) {
        Alert.alert(
          'Autenticação Falhou',
          'Não foi possível autenticar com biometria. Por favor, tente novamente.'
        );
        setIsLoading(false);
        return;
      }

      // Setup biometric in service
      await biometricAuthService.setup(user.uid);

      // Move to PIN setup
      setCurrentStep('pin');
      setShowPinSetup(true);
    } catch (error) {
      console.error('Error setting up biometric:', error);
      Alert.alert(
        'Erro',
        'Não foi possível configurar a autenticação biométrica. Por favor, tente novamente.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Setup PIN fallback
   */
  const setupPIN = async () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Erro', 'Usuário não autenticado');
      return;
    }

    // Validate PIN
    if (pin.length < 6) {
      Alert.alert('PIN Inválido', 'O PIN deve ter no mínimo 6 dígitos');
      return;
    }

    if (!/^\d+$/.test(pin)) {
      Alert.alert('PIN Inválido', 'O PIN deve conter apenas números');
      return;
    }

    if (pin !== confirmPin) {
      Alert.alert('PIN Inválido', 'Os PINs não coincidem. Por favor, tente novamente.');
      setPin('');
      setConfirmPin('');
      return;
    }

    setIsLoading(true);
    try {
      await biometricAuthService.setupPIN(user.uid, pin);
      setCurrentStep('complete');
    } catch (error) {
      console.error('Error setting up PIN:', error);
      Alert.alert('Erro', 'Não foi possível configurar o PIN. Por favor, tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Skip biometric setup
   */
  const skipSetup = () => {
    if (mode === 'onboarding') {
      // Return to onboarding flow
      router.back();
    } else {
      // Return to settings
      router.back();
    }
  };

  /**
   * Complete setup and navigate
   */
  const completeSetup = () => {
    if (mode === 'onboarding') {
      router.back();
    } else {
      router.back();
    }
  };

  /**
   * Use PIN fallback instead of biometric
   */
  const usePINOnly = () => {
    setCurrentStep('pin');
    setShowPinSetup(true);
  };

  /**
   * Render intro step
   */
  const renderIntro = () => (
    <View style={styles.stepContainer}>
      <View style={styles.iconContainer}>
        <Ionicons name={getBiometricIcon()} size={80} color="#007AFF" />
      </View>

      <Text style={styles.title}>Proteja Dados Sensíveis</Text>

      <Text style={styles.description}>
        Proteja os dados sensíveis de saúde dos seus pacientes com autenticação biométrica segura.
      </Text>

      <View style={styles.benefitsList}>
        <View style={styles.benefitItem}>
          <Ionicons name="shield-checkmark" size={24} color="#10B981" />
          <View style={styles.benefitTextContainer}>
            <Text style={styles.benefitTitle}>Segurança Reforçada</Text>
            <Text style={styles.benefitDescription}>
              Apenas você pode acessar os dados dos pacientes
            </Text>
          </View>
        </View>

        <View style={styles.benefitItem}>
          <Ionicons name="flash" size={24} color="#10B981" />
          <View style={styles.benefitTextContainer}>
            <Text style={styles.benefitTitle}>Acesso Rápido</Text>
            <Text style={styles.benefitDescription}>
              Entre no app rapidamente com {getBiometricName()}
            </Text>
          </View>
        </View>

        <View style={styles.benefitItem}>
          <Ionicons name="checkmark-circle" size={24} color="#10B981" />
          <View style={styles.benefitTextContainer}>
            <Text style={styles.benefitTitle}>Conformidade</Text>
            <Text style={styles.benefitDescription}>
              Atende requisitos de segurança LGPD e HIPAA
            </Text>
          </View>
        </View>
      </View>

      {isAvailable ? (
        <>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => setCurrentStep('biometric')}
            disabled={isLoading}
          >
            <Text style={styles.primaryButtonText}>
              Configurar {getBiometricName()}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={usePINOnly}
            disabled={isLoading}
          >
            <Text style={styles.secondaryButtonText}>Usar Apenas PIN</Text>
          </TouchableOpacity>
        </>
      ) : (
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={usePINOnly}
          disabled={isLoading}
        >
          <Text style={styles.primaryButtonText}>Configurar PIN</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.skipButton} onPress={skipSetup}>
        <Text style={styles.skipButtonText}>Pular por Enquanto</Text>
      </TouchableOpacity>

      <Text style={styles.note}>
        Você pode configurar isso mais tarde nas configurações de segurança.
      </Text>
    </View>
  );

  /**
   * Render biometric setup step
   */
  const renderBiometric = () => (
    <View style={styles.stepContainer}>
      <View style={styles.iconContainer}>
        <Ionicons name={getBiometricIcon()} size={80} color="#007AFF" />
      </View>

      <Text style={styles.title}>Configurar {getBiometricName()}</Text>

      <Text style={styles.description}>
        Toque no botão abaixo para testar e ativar a autenticação com {getBiometricName()}.
      </Text>

      <View style={styles.instructionsList}>
        <View style={styles.instructionItem}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>1</Text>
          </View>
          <Text style={styles.instructionText}>
            Você será solicitado a autenticar com {getBiometricName()}
          </Text>
        </View>

        <View style={styles.instructionItem}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>2</Text>
          </View>
          <Text style={styles.instructionText}>
            Após a autenticação, você configurará um PIN de backup
          </Text>
        </View>

        <View style={styles.instructionItem}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>3</Text>
          </View>
          <Text style={styles.instructionText}>
            O PIN será usado caso {getBiometricName()} não esteja disponível
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={setupBiometric}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryButtonText}>Ativar {getBiometricName()}</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => setCurrentStep('intro')}
        disabled={isLoading}
      >
        <Text style={styles.secondaryButtonText}>Voltar</Text>
      </TouchableOpacity>
    </View>
  );

  /**
   * Render PIN setup step
   */
  const renderPIN = () => (
    <View style={styles.stepContainer}>
      <View style={styles.iconContainer}>
        <Ionicons name="keypad" size={80} color="#007AFF" />
      </View>

      <Text style={styles.title}>Configurar PIN de Backup</Text>

      <Text style={styles.description}>
        Crie um PIN de 6 dígitos que será usado como alternativa à autenticação biométrica.
      </Text>

      <View style={styles.pinInputContainer}>
        <Text style={styles.pinLabel}>Digite seu PIN (mínimo 6 dígitos)</Text>
        <View style={styles.pinDotsContainer}>
          {[...Array(6)].map((_, index) => (
            <View
              key={index}
              style={[
                styles.pinDot,
                pin.length > index && styles.pinDotFilled,
              ]}
            />
          ))}
        </View>

        {pin.length >= 6 && (
          <>
            <Text style={[styles.pinLabel, styles.pinLabelSpacing]}>
              Confirme seu PIN
            </Text>
            <View style={styles.pinDotsContainer}>
              {[...Array(6)].map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.pinDot,
                    confirmPin.length > index && styles.pinDotFilled,
                  ]}
                />
              ))}
            </View>
          </>
        )}
      </View>

      {/* Simple numeric keypad */}
      <View style={styles.keypad}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <TouchableOpacity
            key={num}
            style={styles.keypadButton}
            onPress={() => {
              if (pin.length < 6) {
                setPin(pin + num);
              } else if (confirmPin.length < 6) {
                setConfirmPin(confirmPin + num);
              }
            }}
          >
            <Text style={styles.keypadButtonText}>{num}</Text>
          </TouchableOpacity>
        ))}
        <View style={styles.keypadButton} />
        <TouchableOpacity
          style={styles.keypadButton}
          onPress={() => {
            if (pin.length < 6) {
              setPin(pin + '0');
            } else if (confirmPin.length < 6) {
              setConfirmPin(confirmPin + '0');
            }
          }}
        >
          <Text style={styles.keypadButtonText}>0</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.keypadButton}
          onPress={() => {
            if (confirmPin.length > 0) {
              setConfirmPin(confirmPin.slice(0, -1));
            } else if (pin.length > 0) {
              setPin(pin.slice(0, -1));
            }
          }}
        >
          <Ionicons name="backspace-outline" size={24} color="#1F2937" />
        </TouchableOpacity>
      </View>

      {pin.length >= 6 && confirmPin.length >= 6 && (
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={setupPIN}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>Confirmar PIN</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );

  /**
   * Render complete step
   */
  const renderComplete = () => (
    <View style={styles.stepContainer}>
      <View style={styles.iconContainer}>
        <Ionicons name="checkmark-circle" size={80} color="#10B981" />
      </View>

      <Text style={styles.title}>Configuração Concluída!</Text>

      <Text style={styles.description}>
        Sua autenticação biométrica foi configurada com sucesso. Agora seus dados estão protegidos.
      </Text>

      <View style={styles.summaryList}>
        {isAvailable && biometricType !== 'none' && (
          <View style={styles.summaryItem}>
            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
            <Text style={styles.summaryText}>
              {getBiometricName()} ativado
            </Text>
          </View>
        )}
        <View style={styles.summaryItem}>
          <Ionicons name="checkmark-circle" size={20} color="#10B981" />
          <Text style={styles.summaryText}>PIN de backup configurado</Text>
        </View>
        <View style={styles.summaryItem}>
          <Ionicons name="checkmark-circle" size={20} color="#10B981" />
          <Text style={styles.summaryText}>Dados protegidos com criptografia</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={completeSetup}
      >
        <Text style={styles.primaryButtonText}>Concluir</Text>
      </TouchableOpacity>
    </View>
  );

  /**
   * Render current step
   */
  const renderStep = () => {
    switch (currentStep) {
      case 'intro':
        return renderIntro();
      case 'biometric':
        return renderBiometric();
      case 'pin':
        return renderPIN();
      case 'complete':
        return renderComplete();
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {renderStep()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
    marginBottom: 24,
  },
  benefitsList: {
    width: '100%',
    marginBottom: 24,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  benefitTextContainer: {
    flex: 1,
    marginLeft: 16,
  },
  benefitTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  benefitDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  instructionsList: {
    width: '100%',
    marginBottom: 24,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  instructionText: {
    flex: 1,
    fontSize: 15,
    color: '#374151',
    marginLeft: 12,
    lineHeight: 22,
  },
  pinInputContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
  },
  pinLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 12,
  },
  pinLabelSpacing: {
    marginTop: 24,
  },
  pinDotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  pinDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    backgroundColor: 'transparent',
  },
  pinDotFilled: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
    maxWidth: 300,
    marginBottom: 24,
  },
  keypadButton: {
    width: '33.33%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  keypadButtonText: {
    fontSize: 28,
    fontWeight: '400',
    color: '#1F2937',
  },
  summaryList: {
    width: '100%',
    marginBottom: 24,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  summaryText: {
    fontSize: 15,
    color: '#374151',
    marginLeft: 12,
  },
  primaryButton: {
    width: '100%',
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
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
  skipButton: {
    marginTop: 16,
    paddingVertical: 12,
  },
  skipButtonText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  note: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
  },
});
