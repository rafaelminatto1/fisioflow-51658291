/**
 * Exercise Feedback Modal
 * Collects user feedback about exercise difficulty and pain level
 */

import { useState } from 'react';

import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColorScheme';
import { Button } from './Button';

interface ExerciseFeedbackModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (feedback: ExerciseFeedback) => void;
  exerciseName: string;
}

export interface ExerciseFeedback {
  difficulty: 1 | 2 | 3 | 4 | 5;
  pain: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  notes?: string;
}

export function ExerciseFeedbackModal({
  visible,
  onClose,
  onSubmit,
  exerciseName,
}: ExerciseFeedbackModalProps) {
  const colors = useColors();
  const [difficulty, setDifficulty] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [pain, setPain] = useState<0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10>(0);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    const feedback: ExerciseFeedback = { difficulty, pain, notes };
    await onSubmit(feedback);
    setNotes('');
    setDifficulty(3);
    setPain(0);
    setSubmitting(false);
    onClose();
  };

  const difficultyLabels = ['Muito Fácil', 'Fácil', 'Médio', 'Difícil', 'Muito Difícil'];
  const painLabels = ['Sem dor', 'Muito Leve', 'Leve', 'Moderada', 'Forte', 'Muito Forte', 'Insuportável'];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={[styles.title, { color: colors.text }]}>Feedback do Exercício</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
              {exerciseName}
            </Text>
          </View>
          <View style={styles.closeButton} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Difficulty */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="barbell" size={24} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Dificuldade</Text>
            </View>
            <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
              Quão difícil você encontrou este exercício?
            </Text>

            <View style={styles.optionsContainer}>
              {[1, 2, 3, 4, 5].map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.optionButton,
                    {
                      backgroundColor: difficulty === level ? colors.primary + '20' : colors.surface,
                      borderColor: difficulty === level ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setDifficulty(level as 1 | 2 | 3 | 4 | 5)}
                >
                  <View style={styles.dotsContainer}>
                    {[1, 2, 3, 4, 5].map((dot) => (
                      <View
                        key={dot}
                        style={[
                          styles.dot,
                          {
                            backgroundColor:
                              dot <= level ? colors.primary : colors.textMuted,
                            opacity: dot <= level ? 1 : 0.3,
                          },
                        ]}
                      />
                    ))}
                  </View>
                  <Text
                    style={[
                      styles.optionLabel,
                      { color: difficulty === level ? colors.primary : colors.text },
                    ]}
                  >
                    {level}
                  </Text>
                  <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
                    {difficultyLabels[level - 1]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Pain Level */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="pulse" size={24} color={colors.error} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Nível de Dor</Text>
            </View>
            <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
              Qual o nível de dor sentido durante o exercício?
            </Text>

            <View style={styles.painSlider}>
              <TouchableOpacity
                style={[styles.painButton, { backgroundColor: colors.success + '30' }]}
                onPress={() => setPain(0)}
              >
                <Ionicons name="happy" size={20} color={colors.success} />
                <Text style={[styles.painButtonLabel, { color: colors.success }]}>Sem dor</Text>
              </TouchableOpacity>

              <View style={styles.painScale}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
                  <TouchableOpacity
                    key={level}
                    style={[
                      styles.painLevelButton,
                      {
                        backgroundColor:
                          pain === level
                            ? level <= 3
                              ? colors.warning + '30'
                              : level <= 7
                              ? colors.error + '30'
                              : '#DC262630'
                            : 'transparent',
                        borderColor:
                          pain === level
                            ? level <= 3
                              ? colors.warning
                              : level <= 7
                              ? colors.error
                              : '#DC2626'
                            : colors.border,
                      },
                    ]}
                    onPress={() => setPain(level as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10)}
                  >
                    <Text
                      style={[
                        styles.painLevelText,
                        {
                          color:
                            pain === level
                              ? level <= 3
                                ? colors.warning
                                : level <= 7
                                ? colors.error
                                : '#DC2626'
                              : colors.textSecondary,
                        },
                      ]}
                    >
                      {level}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.painButton, { backgroundColor: '#DC262620' }]}
                onPress={() => setPain(10)}
              >
                <Ionicons name="sad" size={20} color="#DC2626" />
                <Text style={[styles.painButtonLabel, { color: '#DC2626' }]}>Máxima</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.painLabel, { color: colors.textSecondary }]}>
              {pain === 0
                ? 'Sem dor sentida'
                : pain <= 3
                ? 'Dor leve - Continue com o exercício'
                : pain <= 7
                ? 'Dor moderada - Reduza a intensidade'
                : 'Dor severa - Pare o exercício e consulte seu fisioterapeuta'}
            </Text>
          </View>

          {/* Notes */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="create" size={24} color={colors.info} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Observações</Text>
            </View>
            <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
              Alguma observação adicional para seu fisioterapeuta?
            </Text>

            <TextInput
              style={[
                styles.notesInput,
                {
                  backgroundColor: colors.surface,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              placeholder="Ex: Senti um desconforto leve no movimento 3..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
              value={notes}
              onChangeText={setNotes}
              maxLength={500}
            />
            <Text style={[styles.charCount, { color: colors.textMuted }]}>
              {notes.length}/500
            </Text>
          </View>
        </ScrollView>

        {/* Submit Button */}
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <Button
            title="Enviar Feedback"
            onPress={handleSubmit}
            loading={submitting}
            style={styles.submitButton}
          />
          <TouchableOpacity onPress={onClose} style={styles.skipButton}>
            <Text style={[styles.skipButtonText, { color: colors.textSecondary }]}>
              Pular
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  closeButton: {
    width: 28,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  sectionDescription: {
    fontSize: 15,
    marginBottom: 16,
  },
  optionsContainer: {
    gap: 8,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    gap: 12,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  optionLabel: {
    fontSize: 20,
    fontWeight: '700',
    minWidth: 24,
  },
  optionDescription: {
    fontSize: 14,
    flex: 1,
  },
  painSlider: {
    gap: 12,
  },
  painButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
  },
  painButtonLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  painScale: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  painLevelButton: {
    width: 32,
    height: 40,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  painLevelText: {
    fontSize: 14,
    fontWeight: '700',
  },
  painLabel: {
    fontSize: 13,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  notesInput: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    fontSize: 15,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
  },
  submitButton: {
    marginBottom: 12,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  skipButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
