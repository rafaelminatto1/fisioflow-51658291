/**
 * Onboarding Screen - Patient App
 * First-time user experience walkthrough
 */

import { useState } from 'react';

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColorScheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button } from '@/components';

const ONBOARDING_KEY = '@fisioflow_onboarding_completed';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const onboardingSteps: OnboardingStep[] = [
  {
    id: '1',
    title: 'Bem-vindo ao FisioFlow',
    description: 'Seu aplicativo para acompanhamento fisioterapêutico personalizado. Realize seus exercícios em casa e acompanhe sua evolução.',
    icon: 'fitness',
    color: '#22c55e',
  },
  {
    id: '2',
    title: 'Exercícios Personalizados',
    description: 'Receba planos de exercícios personalizados do seu fisioterapeuta. Cada exercício vem com vídeos demonstrativos.',
    icon: 'barbell',
    color: '#3b82f6',
  },
  {
    id: '3',
    title: 'Acompanhe seu Progresso',
    description: 'Visualize sua evolução ao longo do tempo com gráficos e estatísticas detalhadas do seu tratamento.',
    icon: 'trending-up',
    color: '#8b5cf6',
  },
  {
    id: '4',
    title: 'Lembretes Automáticos',
    description: 'Nunca mais esqueça de fazer seus exercícios ou de uma consulta. Receba notificações personalizadas.',
    icon: 'notifications',
    color: '#f59e0b',
  },
  {
    id: '5',
    title: 'Funciona Offline',
    description: 'Sem internet? Sem problemas! O app funciona offline e sincroniza automaticamente quando você reconectar.',
    icon: 'cloud-offline',
    color: '#ec4899',
  },
];

export default function OnboardingScreen() {
  const colors = useColors();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleNext = async () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      await handleComplete();
    }
  };

  const handleSkip = async () => {
    await handleComplete();
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Error saving onboarding:', error);
    } finally {
      setLoading(false);
    }
  };

  const step = onboardingSteps[currentStep];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['left', 'right']}>
      {/* Skip Button */}
      {currentStep < onboardingSteps.length - 1 && (
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={[styles.skipButtonText, { color: colors.textSecondary }]}>Pular</Text>
        </TouchableOpacity>
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Pagination Dots */}
        <View style={styles.paginationContainer}>
          {onboardingSteps.map((_, index) => (
            <View
              key={index}
              style={[
                styles.paginationDot,
                {
                  backgroundColor: index === currentStep ? step.color : colors.border,
                  width: index === currentStep ? 24 : 8,
                },
              ]}
            />
          ))}
        </View>

        {/* Icon */}
        <View style={[styles.iconContainer, { backgroundColor: step.color + '20' }]}>
          <Ionicons name={step.icon} size={80} color={step.color} />
        </View>

        {/* Title */}
        <Text style={[styles.title, { color: colors.text }]}>{step.title}</Text>

        {/* Description */}
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          {step.description}
        </Text>

        {/* Feature Preview (Illustration) */}
        <View style={styles.previewContainer}>
          <View style={[styles.previewCard, { backgroundColor: colors.surface }]}>
            {step.id === '1' && (
              <>
                <View style={[styles.previewHeader, { borderBottomColor: colors.border }]}>
                  <Ionicons name="person" size={24} color={colors.primary} />
                  <Text style={[styles.previewTitle, { color: colors.text }]}>Olá, Paciente! 👋</Text>
                </View>
                <View style={[styles.previewBody, { borderBottomColor: colors.border }]}>
                  <View style={[styles.previewRow, { backgroundColor: colors.primary + '10' }]}>
                    <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                    <Text style={[styles.previewText, { color: colors.text }]}>3 exercícios hoje</Text>
                  </View>
                  <View style={[styles.previewRow, { backgroundColor: colors.success + '10' }]}>
                    <Ionicons name="flame" size={20} color={colors.success} />
                    <Text style={[styles.previewText, { color: colors.text }]}>5 dias de sequência</Text>
                  </View>
                </View>
              </>
            )}
            {step.id === '2' && (
              <>
                <View style={[styles.previewHeader, { borderBottomColor: colors.border }]}>
                  <Ionicons name="barbell" size={24} color={colors.info} />
                  <Text style={[styles.previewTitle, { color: colors.text }]}>Exercícios de Hoje</Text>
                </View>
                <View style={[styles.previewBody, { borderBottomColor: colors.border }]}>
                  <View style={[styles.previewRow, { backgroundColor: colors.surface }]}>
                    <Ionicons name="play-circle" size={20} color={colors.primary} />
                    <Text style={[styles.previewText, { color: colors.text }]}>Agachamento</Text>
                    <Ionicons name="checkmark-circle" size={20} color={colors.textMuted} />
                  </View>
                  <View style={[styles.previewRow, { backgroundColor: colors.surface }]}>
                    <Ionicons name="play-circle" size={20} color={colors.primary} />
                    <Text style={[styles.previewText, { color: colors.text }]}>Pontes</Text>
                    <Ionicons name="ellipse-outline" size={20} color={colors.textMuted} />
                  </View>
                </View>
              </>
            )}
            {step.id === '3' && (
              <>
                <View style={[styles.previewHeader, { borderBottomColor: colors.border }]}>
                  <Ionicons name="trending-up" size={24} color={colors.warning} />
                  <Text style={[styles.previewTitle, { color: colors.text }]}>Seu Progresso</Text>
                </View>
                <View style={[styles.previewBody, { borderBottomColor: colors.border }]}>
                  <View style={[styles.statsRow, { backgroundColor: colors.surface }]}>
                    <View style={[styles.statBox, { backgroundColor: colors.primary + '10' }]}>
                      <Text style={[styles.statValue, { color: colors.primary }]}>12</Text>
                      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Sessões</Text>
                    </View>
                    <View style={[styles.statBox, { backgroundColor: colors.success + '10' }]}>
                      <Text style={[styles.statValue, { color: colors.success }]}>-30%</Text>
                      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Dor</Text>
                    </View>
                  </View>
                </View>
              </>
            )}
            {step.id === '4' && (
              <>
                <View style={[styles.previewHeader, { borderBottomColor: colors.border }]}>
                  <Ionicons name="notifications" size={24} color={colors.warning} />
                  <Text style={[styles.previewTitle, { color: colors.text }]}>Lembretes</Text>
                </View>
                <View style={[styles.previewBody, { borderBottomColor: colors.border }]}>
                  <View style={[styles.previewRow, { backgroundColor: colors.warning + '10' }]}>
                    <Ionicons name="fitness" size={20} color={colors.warning} />
                    <Text style={[styles.previewText, { color: colors.text }]}>Hora dos exercícios!</Text>
                  </View>
                  <View style={[styles.previewRow, { backgroundColor: colors.info + '10' }]}>
                    <Ionicons name="calendar" size={20} color={colors.info} />
                    <Text style={[styles.previewText, { color: colors.text }]}>Consulta amanhã às 14h</Text>
                  </View>
                </View>
              </>
            )}
            {step.id === '5' && (
              <>
                <View style={[styles.previewHeader, { borderBottomColor: colors.border }]}>
                  <Ionicons name="cloud-offline" size={24} color={colors.error} />
                  <Text style={[styles.previewTitle, { color: colors.text }]}>Modo Offline</Text>
                </View>
                <View style={[styles.previewBody, { borderBottomColor: colors.border }]}>
                  <View style={[styles.previewRow, { backgroundColor: colors.surface }]}>
                    <Ionicons name="cloud-offline" size={20} color={colors.error} />
                    <Text style={[styles.previewText, { color: colors.text }]}>Sem conexão</Text>
                    <View style={[styles.syncBadge, { backgroundColor: colors.warning + '20' }]}>
                      <Text style={[styles.syncBadgeText, { color: colors.warning }]}>3 pendências</Text>
                    </View>
                  </View>
                  <View style={[styles.previewRow, { backgroundColor: colors.success + '10' }]}>
                    <Ionicons name="cloud-done" size={20} color={colors.success} />
                    <Text style={[styles.previewText, { color: colors.text }]}>Sincronizado!</Text>
                  </View>
                </View>
              </>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View style={[styles.bottomContainer, { borderTopColor: colors.border }]}>
        {/* Progress Bar */}
        <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.progressFill,
              { backgroundColor: step.color, width: `${((currentStep + 1) / onboardingSteps.length) * 100}%` },
            ]}
          />
        </View>

        {/* Buttons */}
        <View style={styles.buttonsContainer}>
          {currentStep > 0 && (
            <TouchableOpacity
              style={[styles.backButton, { borderColor: colors.border }]}
              onPress={() => setCurrentStep(currentStep - 1)}
            >
              <Text style={[styles.backButtonText, { color: colors.text }]}>Voltar</Text>
            </TouchableOpacity>
          )}
          <Button
            title={currentStep === onboardingSteps.length - 1 ? 'Começar' : 'Continuar'}
            onPress={handleNext}
            loading={loading}
            style={styles.nextButton}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skipButton: {
    alignSelf: 'flex-end',
    padding: 16,
  },
  skipButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  scrollContent: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
  },
  paginationContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 32,
  },
  paginationDot: {
    height: 8,
    borderRadius: 4,
  },
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  previewContainer: {
    width: '100%',
    maxWidth: Dimensions.get('window').width - 48,
  },
  previewCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderBottomWidth: 1,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  previewBody: {
    padding: 12,
    gap: 8,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
  },
  previewText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statBox: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  syncBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  syncBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  bottomContainer: {
    padding: 20,
    paddingBottom: 32,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    marginBottom: 20,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    flex: 1,
  },
});
