/**
 * Medical Disclaimer Modal Component
 * Displays context-specific medical disclaimers in Portuguese
 * Non-dismissible until acknowledged
 * 
 * Requirements: 1.9
 */

import React, { useState, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getMedicalDisclaimerContent } from '@/constants/legalContent';
import { LEGAL_VERSIONS } from '@/constants/legalVersions';
import { db, auth } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import type { MedicalDisclaimerAcknowledgment } from '@/types/legal';

interface MedicalDisclaimerModalProps {
  visible: boolean;
  context: 'first-launch' | 'exercise-prescription' | 'protocol-application';
  onAcknowledge: () => void;
}

export default function MedicalDisclaimerModal({
  visible,
  context,
  onAcknowledge,
}: MedicalDisclaimerModalProps) {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [hasAccepted, setHasAccepted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

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
   * Store acknowledgment in Firestore and call onAcknowledge callback
   */
  const handleAcknowledge = async () => {
    if (!hasScrolledToBottom || !hasAccepted || isLoading) {
      return;
    }

    setIsLoading(true);

    try {
      const user = auth.currentUser;
      if (!user) {
        console.error('No authenticated user found');
        setIsLoading(false);
        return;
      }

      // Prepare acknowledgment data
      const acknowledgmentData: Omit<MedicalDisclaimerAcknowledgment, 'id'> = {
        userId: user.uid,
        context,
        acknowledgedAt: new Date(),
        version: LEGAL_VERSIONS.MEDICAL_DISCLAIMER,
      };

      // Store in Firestore collection 'medical_disclaimers'
      await addDoc(collection(db, 'medical_disclaimers'), {
        ...acknowledgmentData,
        acknowledgedAt: serverTimestamp(),
      });

      console.log(`Medical disclaimer acknowledged for context: ${context}`);

      // Reset state for next use
      setHasScrolledToBottom(false);
      setHasAccepted(false);
      setIsLoading(false);

      // Call the callback to close modal and proceed
      onAcknowledge();
    } catch (error) {
      console.error('Error storing medical disclaimer acknowledgment:', error);
      setIsLoading(false);
      // Still call onAcknowledge to not block the user
      // In production, you might want to show an error message
      onAcknowledge();
    }
  };

  /**
   * Get context-specific disclaimer content
   */
  const disclaimerContent = getMedicalDisclaimerContent(context);

  /**
   * Get context-specific title
   */
  const getTitle = () => {
    switch (context) {
      case 'first-launch':
        return 'Aviso Médico Importante';
      case 'exercise-prescription':
        return 'Aviso: Prescrição de Exercícios';
      case 'protocol-application':
        return 'Aviso: Aplicação de Protocolo';
      default:
        return 'Aviso Médico';
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => {
        // Modal is non-dismissible - do nothing
        // User must acknowledge to close
      }}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Ionicons name="warning" size={24} color="#DC2626" />
            <Text style={styles.headerTitle}>{getTitle()}</Text>
          </View>
          <Text style={styles.headerSubtitle}>
            Leia atentamente antes de continuar
          </Text>
        </View>

        {/* Content */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          <Text style={styles.content}>{disclaimerContent}</Text>
        </ScrollView>

        {/* Scroll indicator */}
        {!hasScrolledToBottom && (
          <View style={styles.scrollIndicator}>
            <Ionicons name="chevron-down" size={20} color="#6B7280" />
            <Text style={styles.scrollIndicatorText}>
              Role até o final para continuar
            </Text>
          </View>
        )}

        {/* Acknowledgment checkbox */}
        <View style={styles.checkboxContainer}>
          <TouchableOpacity
            style={styles.checkbox}
            onPress={() => setHasAccepted(!hasAccepted)}
            disabled={!hasScrolledToBottom}
          >
            <View
              style={[
                styles.checkboxBox,
                hasAccepted && styles.checkboxBoxChecked,
                !hasScrolledToBottom && styles.checkboxBoxDisabled,
              ]}
            >
              {hasAccepted && (
                <Ionicons name="checkmark" size={18} color="#FFFFFF" />
              )}
            </View>
            <Text
              style={[
                styles.checkboxLabel,
                !hasScrolledToBottom && styles.checkboxLabelDisabled,
              ]}
            >
              Li e compreendi este aviso. Reconheço que sou totalmente
              responsável por todas as decisões clínicas.
            </Text>
          </TouchableOpacity>
        </View>

        {/* Acknowledge button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.button,
              (!hasScrolledToBottom || !hasAccepted || isLoading) &&
                styles.buttonDisabled,
            ]}
            onPress={handleAcknowledge}
            disabled={!hasScrolledToBottom || !hasAccepted || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Reconheço e Aceito</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FEF2F2',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#DC2626',
    marginLeft: 12,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 36,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    padding: 20,
  },
  content: {
    fontSize: 15,
    lineHeight: 24,
    color: '#1F2937',
  },
  scrollIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  scrollIndicatorText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
  },
  checkboxContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkboxBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  checkboxBoxChecked: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  checkboxBoxDisabled: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: '#374151',
  },
  checkboxLabelDisabled: {
    color: '#9CA3AF',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  button: {
    backgroundColor: '#DC2626',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  buttonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
