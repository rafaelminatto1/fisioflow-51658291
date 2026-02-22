/**
 * PIN Setup Screen
 * Allows users to create or change their PIN for biometric fallback authentication
 * 
 * Features:
 * - Create new PIN (initial setup)
 * - Change existing PIN (requires old PIN verification)
 * - PIN entry with confirmation (enter twice)
 * - Validate PIN strength (minimum 6 digits)
 * - Store hashed PIN in SecureStore
 * - Visual feedback with dots for entered digits
 * - Numeric keypad for PIN entry
 * 
 * Requirements: 5.2
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

type PINSetupMode = 'create' | 'change';
type SetupStep = 'old-pin' | 'new-pin' | 'confirm-pin' | 'complete';

export default function PINSetupScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const mode = (params.mode as PINSetupMode) || 'create';

  const [currentStep, setCurrentStep] = useState<SetupStep>(
    mode === 'change' ? 'old-pin' : 'new-pin'
  );
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Get current PIN value based on step
   */
  const getCurrentPin = (): string => {
    switch (currentStep) {
      case 'old-pin':
        return oldPin;
      case 'new-pin':
        return newPin;
      case 'confirm-pin':
        return confirmPin;
      default:
        return '';
    }
  };

  /**
   * Get step title
   */
  const getStepTitle = (): string => {
    switch (currentStep) {
      case 'old-pin':
        return 'Digite seu PIN Atual';
      case 'new-pin':
        return mode === 'change' ? 'Digite seu Novo PIN' : 'Crie seu PIN';
      case 'confirm-pin':
        return 'Confirme seu PIN';
      case 'complete':
        return 'PIN Configurado!';
      default:
        return '';
    }
  };

  /**
   * Get step description
   */
  const getStepDescription = (): string => {
    switch (currentStep) {
      case 'old-pin':
        return 'Para alterar seu PIN, primeiro digite o PIN atual.';
      case 'new-pin':
        return 'Digite um PIN de 6 dígitos que será usado como alternativa à autenticação biométrica.';
      case 'confirm-pin':
        return 'Digite o PIN novamente para confirmar.';
      case 'complete':
        return 'Seu PIN foi configurado com sucesso e está pronto para uso.';
      default:
        return '';
    }
  };

  /**
   * Handle number press on keypad
   */
  const handleNumberPress = (num: number | string) => {
    setError(null);

    switch (currentStep) {
      case 'old-pin':
        if (oldPin.length < 6) {
          setOldPin(oldPin + num);
        }
        break;
      case 'new-pin':
        if (newPin.length < 6) {
          setNewPin(newPin + num);
        }
        break;
      case 'confirm-pin':
        if (confirmPin.length < 6) {
          setConfirmPin(confirmPin + num);
        }
        break;
    }
  };

  /**
   * Handle backspace press
   */
  const handleBackspace = () => {
    setError(null);

    switch (currentStep) {
      case 'old-pin':
        if (oldPin.length > 0) {
          setOldPin(oldPin.slice(0, -1));
        }
        break;
      case 'new-pin':
        if (newPin.length > 0) {
          setNewPin(newPin.slice(0, -1));
        }
        break;
      case 'confirm-pin':
        if (confirmPin.length > 0) {
          setConfirmPin(confirmPin.slice(0, -1));
        }
        break;
    }
  };

  /**
   * Validate PIN strength
   */
  const validatePIN = (pin: string): { valid: boolean; error?: string } => {
    if (pin.length < 6) {
      return { valid: false, error: 'O PIN deve ter no mínimo 6 dígitos' };
    }

    if (!/^\d+$/.test(pin)) {
      return { valid: false, error: 'O PIN deve conter apenas números' };
    }

    // Check for weak patterns (e.g., 123456, 111111)
    if (/^(\d)\1{5,}$/.test(pin)) {
      return { valid: false, error: 'PIN muito fraco. Evite repetir o mesmo dígito' };
    }

    if (/^(012345|123456|234567|345678|456789|987654|876543|765432|654321|543210)/.test(pin)) {
      return { valid: false, error: 'PIN muito fraco. Evite sequências simples' };
    }

    return { valid: true };
  };

  /**
   * Verify old PIN (for change mode)
   */
  const verifyOldPIN = async () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Erro', 'Usuário não autenticado');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const isValid = await biometricAuthService.verifyPIN(user.uid, oldPin);

      if (!isValid) {
        setError('PIN incorreto. Tente novamente.');
        setOldPin('');
        setIsLoading(false);
        return;
      }

      // Old PIN verified, move to new PIN step
      setCurrentStep('new-pin');
    } catch (error: any) {
      console.error('Error verifying old PIN:', error);
      
      if (error.message?.includes('locked')) {
        Alert.alert(
          'Conta Bloqueada',
          'Sua conta foi bloqueada devido a muitas tentativas incorretas. Tente novamente em 15 minutos.'
        );
      } else {
        setError('Erro ao verificar PIN. Tente novamente.');
      }
      
      setOldPin('');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Proceed to confirmation step
   */
  const proceedToConfirmation = () => {
    // Validate new PIN
    const validation = validatePIN(newPin);
    if (!validation.valid) {
      setError(validation.error || 'PIN inválido');
      setNewPin('');
      return;
    }

    setCurrentStep('confirm-pin');
  };

  /**
   * Setup new PIN
   */
  const setupNewPIN = async () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Erro', 'Usuário não autenticado');
      return;
    }

    // Validate confirmation matches
    if (newPin !== confirmPin) {
      setError('Os PINs não coincidem. Tente novamente.');
      setConfirmPin('');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await biometricAuthService.setupPIN(user.uid, newPin);
      setCurrentStep('complete');
    } catch (error) {
      console.error('Error setting up PIN:', error);
      Alert.alert(
        'Erro',
        'Não foi possível configurar o PIN. Por favor, tente novamente.'
      );
      setNewPin('');
      setConfirmPin('');
      setCurrentStep('new-pin');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Auto-advance when PIN is complete
   */
  useEffect(() => {
    const currentPin = getCurrentPin();
    
    if (currentPin.length === 6 && !isLoading) {
      // Small delay for better UX
      const timer = setTimeout(() => {
        switch (currentStep) {
          case 'old-pin':
            verifyOldPIN();
            break;
          case 'new-pin':
            proceedToConfirmation();
            break;
          case 'confirm-pin':
            setupNewPIN();
            break;
        }
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [oldPin, newPin, confirmPin, currentStep]);

  /**
   * Complete setup and navigate back
   */
  const completeSetup = () => {
    router.back();
  };

  /**
   * Cancel setup
   */
  const cancelSetup = () => {
    Alert.alert(
      'Cancelar Configuração',
      'Tem certeza que deseja cancelar a configuração do PIN?',
      [
        { text: 'Não', style: 'cancel' },
        { text: 'Sim', onPress: () => router.back() },
      ]
    );
  };

  /**
   * Render PIN dots
   */
  const renderPINDots = () => {
    const currentPin = getCurrentPin();
    const maxLength = 6;

    return (
      <View style={styles.pinDotsContainer}>
        {[...Array(maxLength)].map((_, index) => (
          <View
            key={index}
            style={[
              styles.pinDot,
              currentPin.length > index && styles.pinDotFilled,
              error && styles.pinDotError,
            ]}
          />
        ))}
      </View>
    );
  };

  /**
   * Render numeric keypad
   */
  const renderKeypad = () => (
    <View style={styles.keypad}>
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
        <TouchableOpacity
          key={num}
          style={styles.keypadButton}
          onPress={() => handleNumberPress(num)}
          disabled={isLoading}
        >
          <Text style={styles.keypadButtonText}>{num}</Text>
        </TouchableOpacity>
      ))}
      
      {/* Empty space */}
      <View style={styles.keypadButton} />
      
      {/* Zero button */}
      <TouchableOpacity
        style={styles.keypadButton}
        onPress={() => handleNumberPress(0)}
        disabled={isLoading}
      >
        <Text style={styles.keypadButtonText}>0</Text>
      </TouchableOpacity>
      
      {/* Backspace button */}
      <TouchableOpacity
        style={styles.keypadButton}
        onPress={handleBackspace}
        disabled={isLoading}
      >
        <Ionicons name="backspace-outline" size={28} color="#1F2937" />
      </TouchableOpacity>
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

      <Text style={styles.title}>{getStepTitle()}</Text>
      <Text style={styles.description}>{getStepDescription()}</Text>

      <View style={styles.summaryList}>
        <View style={styles.summaryItem}>
          <Ionicons name="checkmark-circle" size={20} color="#10B981" />
          <Text style={styles.summaryText}>
            PIN de {newPin.length} dígitos configurado
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Ionicons name="checkmark-circle" size={20} color="#10B981" />
          <Text style={styles.summaryText}>
            Armazenado com segurança no dispositivo
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Ionicons name="checkmark-circle" size={20} color="#10B981" />
          <Text style={styles.summaryText}>
            Pronto para uso como alternativa biométrica
          </Text>
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
   * Render PIN entry step
   */
  const renderPINEntry = () => (
    <View style={styles.stepContainer}>
      <View style={styles.iconContainer}>
        <Ionicons name="keypad" size={80} color="#007AFF" />
      </View>

      <Text style={styles.title}>{getStepTitle()}</Text>
      <Text style={styles.description}>{getStepDescription()}</Text>

      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={20} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {renderPINDots()}

      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#007AFF" />
          <Text style={styles.loadingText}>Verificando...</Text>
        </View>
      )}

      {renderKeypad()}

      <TouchableOpacity
        style={styles.cancelButton}
        onPress={cancelSetup}
        disabled={isLoading}
      >
        <Text style={styles.cancelButtonText}>Cancelar</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {currentStep === 'complete' ? renderComplete() : renderPINEntry()}
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
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 16,
    width: '100%',
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    marginLeft: 8,
    flex: 1,
  },
  pinDotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 32,
  },
  pinDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    backgroundColor: 'transparent',
  },
  pinDotFilled: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  pinDotError: {
    borderColor: '#EF4444',
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
  },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
    maxWidth: 320,
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
    fontSize: 32,
    fontWeight: '400',
    color: '#1F2937',
  },
  summaryList: {
    width: '100%',
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryText: {
    fontSize: 15,
    color: '#374151',
    marginLeft: 12,
    flex: 1,
  },
  primaryButton: {
    width: '100%',
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 52,
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  cancelButton: {
    marginTop: 16,
    paddingVertical: 12,
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});
