import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PRIVACY_POLICY_CONTENT } from '@/constants/legalContent';
import { LEGAL_VERSIONS } from '@/constants/legalVersions';
import { db, auth } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

interface PrivacyPolicyScreenProps {
  mode?: 'onboarding' | 'view';
  onAccept?: () => void;
}

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [hasAccepted, setHasAccepted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Get mode from route params or default to 'view'
  const mode: 'onboarding' | 'view' = (params.mode as 'onboarding' | 'view') || 'view';

  /**
   * Track scroll position to ensure user reads to bottom
   */
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    
    // Check if user has scrolled to within 20px of the bottom
    const paddingToBottom = 20;
    const isAtBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;
    
    if (isAtBottom && !hasScrolledToBottom) {
      setHasScrolledToBottom(true);
    }
  };

  /**
   * Toggle acceptance checkbox
   */
  const toggleAcceptance = () => {
    if (hasScrolledToBottom) {
      setHasAccepted(!hasAccepted);
    }
  };

  /**
   * Get device information for acceptance record
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
   * Store acceptance in Firestore
   */
  const storeAcceptance = async () => {
    const user = auth.currentUser;
    if (!user) {
      console.error('No authenticated user');
      return;
    }

    try {
      const acceptanceData = {
        userId: user.uid,
        version: LEGAL_VERSIONS.PRIVACY_POLICY,
        acceptedAt: serverTimestamp(),
        deviceInfo: getDeviceInfo(),
      };

      await addDoc(collection(db, 'privacy_acceptances'), acceptanceData);
      console.log('Privacy policy acceptance stored successfully');
    } catch (error) {
      console.error('Error storing privacy policy acceptance:', error);
      throw error;
    }
  };

  /**
   * Handle continue button press
   */
  const handleContinue = async () => {
    if (!hasScrolledToBottom || !hasAccepted) {
      return;
    }

    setIsLoading(true);
    try {
      await storeAcceptance();
      
      if (mode === 'onboarding') {
        // In onboarding mode, call the onAccept callback
        // This would be passed from the onboarding flow
        console.log('Privacy policy accepted in onboarding mode');
        router.back();
      } else {
        // In view mode, just go back
        router.back();
      }
    } catch (error) {
      console.error('Error handling acceptance:', error);
      alert('Erro ao salvar aceitação. Por favor, tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Render acceptance checkbox (onboarding mode only)
   */
  const renderAcceptanceCheckbox = () => {
    if (mode !== 'onboarding') {
      return null;
    }

    return (
      <TouchableOpacity
        style={styles.checkboxContainer}
        onPress={toggleAcceptance}
        disabled={!hasScrolledToBottom}
      >
        <View style={[
          styles.checkbox,
          hasAccepted && styles.checkboxChecked,
          !hasScrolledToBottom && styles.checkboxDisabled,
        ]}>
          {hasAccepted && (
            <Ionicons name="checkmark" size={18} color="#fff" />
          )}
        </View>
        <Text style={[
          styles.checkboxLabel,
          !hasScrolledToBottom && styles.checkboxLabelDisabled,
        ]}>
          Li e aceito a Política de Privacidade
        </Text>
      </TouchableOpacity>
    );
  };

  /**
   * Render continue button (onboarding mode only)
   */
  const renderContinueButton = () => {
    if (mode !== 'onboarding') {
      return null;
    }

    const isDisabled = !hasScrolledToBottom || !hasAccepted || isLoading;

    return (
      <TouchableOpacity
        style={[
          styles.continueButton,
          isDisabled && styles.continueButtonDisabled,
        ]}
        onPress={handleContinue}
        disabled={isDisabled}
      >
        <Text style={[
          styles.continueButtonText,
          isDisabled && styles.continueButtonTextDisabled,
        ]}>
          {isLoading ? 'Salvando...' : 'Continuar'}
        </Text>
      </TouchableOpacity>
    );
  };

  /**
   * Render scroll indicator (onboarding mode only)
   */
  const renderScrollIndicator = () => {
    if (mode !== 'onboarding' || hasScrolledToBottom) {
      return null;
    }

    return (
      <View style={styles.scrollIndicator}>
        <Ionicons name="arrow-down" size={20} color="#666" />
        <Text style={styles.scrollIndicatorText}>
          Role até o final para continuar
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Política de Privacidade</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Scroll Indicator */}
      {renderScrollIndicator()}

      {/* Content */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        <Text style={styles.contentText}>
          {PRIVACY_POLICY_CONTENT}
        </Text>
      </ScrollView>

      {/* Footer (onboarding mode only) */}
      {mode === 'onboarding' && (
        <View style={styles.footer}>
          {renderAcceptanceCheckbox()}
          {renderContinueButton()}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  headerSpacer: {
    width: 32,
  },
  scrollIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  scrollIndicatorText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    padding: 16,
  },
  contentText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#333',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
  },
  checkboxDisabled: {
    borderColor: '#ccc',
    backgroundColor: '#f5f5f5',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  checkboxLabelDisabled: {
    color: '#999',
  },
  continueButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: '#ccc',
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  continueButtonTextDisabled: {
    color: '#999',
  },
});
