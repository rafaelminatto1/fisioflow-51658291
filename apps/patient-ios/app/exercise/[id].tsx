import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Modal } from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

// Mock exercise data
const mockExercise = {
  id: '1',
  name: 'Agachamento Wall Sit',
  category: 'Fortalecimento',
  description: 'Mantenha as costas pressionadas contra a parede e desça até que seus joelhos formem um ângulo de 90 graus.',
  sets: 3,
  reps: 10,
  duration: 30,
  restTime: 30,
  thumbnail: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800',
  videoUrl: 'https://example.com/video1.mp4',
  tips: [
    'Mantenha o core ativado durante todo o exercício',
    'Não deixe os joelhos passarem a linha dos pés',
    'Respire normalmente',
    'Pressione as costas contra a parede'
  ],
  precautions: [
    'Pare se sentir dor aguda',
    'Não force além do seu limite'
  ]
};

type ExercisePhase = 'instructions' | 'active' | 'rest' | 'completed';

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams();
  const [phase, setPhase] = useState<ExercisePhase>('instructions');
  const [currentSet, setCurrentSet] = useState(1);
  const [currentRep, setCurrentRep] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(mockExercise.duration);
  const [showSkipModal, setShowSkipModal] = useState(false);
  const [skipReason, setSkipReason] = useState('');
  const [completedRPE, setCompletedRPE] = useState(5);
  const [completedPain, setCompletedPain] = useState(0);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (phase === 'active' && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => prev - 1);
      }, 1000);
    } else if (phase === 'active' && timeRemaining === 0) {
      handleRepComplete();
    } else if (phase === 'rest' && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => prev - 1);
      }, 1000);
    } else if (phase === 'rest' && timeRemaining === 0) {
      handleRestComplete();
    }

    return () => clearInterval(interval);
  }, [phase, timeRemaining]);

  const handleStart = () => {
    setPhase('active');
    setCurrentRep(1);
    setTimeRemaining(mockExercise.duration);
  };

  const handleRepComplete = () => {
    if (currentRep < mockExercise.reps) {
      setCurrentRep(currentRep + 1);
      setTimeRemaining(mockExercise.duration);
    } else {
      if (currentSet < mockExercise.sets) {
        setPhase('rest');
        setTimeRemaining(mockExercise.restTime);
      } else {
        setPhase('completed');
      }
    }
  };

  const handleRestComplete = () => {
    setCurrentSet(currentSet + 1);
    setCurrentRep(1);
    setPhase('active');
    setTimeRemaining(mockExercise.duration);
  };

  const handleSkip = (reason: string) => {
    setSkipReason(reason);
    setShowSkipModal(false);
    // TODO: Save skip reason to Firebase
    router.back();
  };

  const handleComplete = () => {
    // TODO: Save RPE and pain to Firebase
    router.back();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderInstructions = () => (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header Image */}
      <Image
        source={{ uri: mockExercise.thumbnail }}
        style={styles.headerImage}
        resizeMode="cover"
      />

      {/* Back Button */}
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Content */}
      <View style={styles.content}>
        {/* Title */}
        <Text style={styles.exerciseName}>{mockExercise.name}</Text>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{mockExercise.category}</Text>
        </View>

        {/* Description */}
        <Text style={styles.sectionTitle}>Instruções</Text>
        <Text style={styles.description}>{mockExercise.description}</Text>

        {/* Exercise Details */}
        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Ionicons name="repeat" size={20} color="#64748B" />
            <Text style={styles.detailText}>{mockExercise.sets} séries x {mockExercise.reps} reps</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="time" size={20} color="#64748B" />
            <Text style={styles.detailText}>{mockExercise.duration} segundos por reps</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="hourglass-outline" size={20} color="#64748B" />
            <Text style={styles.detailText}>{mockExercise.restTime} segundos de descanso</Text>
          </View>
        </View>

        {/* Tips */}
        <Text style={styles.sectionTitle}>Dicas</Text>
        {mockExercise.tips.map((tip, index) => (
          <View key={index} style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
            <Text style={styles.tipText}>{tip}</Text>
          </View>
        ))}

        {/* Precautions */}
        <Text style={styles.sectionTitle}>Cuidados</Text>
        {mockExercise.precautions.map((precaution, index) => (
          <View key={index} style={styles.precautionItem}>
            <Ionicons name="warning" size={20} color="#F59E0B" />
            <Text style={styles.precautionText}>{precaution}</Text>
          </View>
        ))}

        {/* Buttons */}
        <TouchableOpacity style={styles.startButton} onPress={handleStart}>
          <Ionicons name="play" size={20} color="#fff" />
          <Text style={styles.startButtonText}>Começar Exercício</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.skipButton}
          onPress={() => setShowSkipModal(true)}
        >
          <Ionicons name="close-circle-outline" size={20} color="#EF4444" />
          <Text style={styles.skipButtonText}>Pular Exercício</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderActive = () => (
    <View style={styles.activeContainer}>
      {/* Progress */}
      <View style={styles.activeHeader}>
        <TouchableOpacity style={styles.activeBackButton} onPress={() => setPhase('instructions')}>
          <Ionicons name="close" size={24} color="#64748B" />
        </TouchableOpacity>
        <View style={styles.setProgress}>
          <Text style={styles.setProgressText}>Série {currentSet}/{mockExercise.sets}</Text>
          <Text style={styles.setRepText}>Rep {currentRep}/{mockExercise.reps}</Text>
        </View>
        <View style={styles.timerBadge}>
          <Ionicons name="timer" size={16} color="#3B82F6" />
          <Text style={styles.timerText}>{formatTime(timeRemaining)}</Text>
        </View>
      </View>

      {/* Video/Timer Display */}
      <View style={styles.activeDisplay}>
        <View style={styles.timerCircle}>
          <Text style={styles.timerBigText}>{formatTime(timeRemaining)}</Text>
          <Text style={styles.timerLabel}>tempo restante</Text>
        </View>

        {/* Rep Counter */}
        <View style={styles.repCounter}>
          <Text style={styles.repCounterLabel}>Repetição</Text>
          <Text style={styles.repCounterValue}>{currentRep}</Text>
          <Text style={styles.repCounterTotal}>/ {mockExercise.reps}</Text>
        </View>
      </View>

      {/* Controls */}
      <View style={styles.activeControls}>
        <TouchableOpacity
          style={styles.completeRepButton}
          onPress={handleRepComplete}
        >
          <Ionicons name="checkmark" size={24} color="#fff" />
          <Text style={styles.completeRepButtonText}>Completar Rep</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.pauseButton}
          onPress={() => {/* TODO: Implement pause */}}
        >
          <Ionicons name="pause" size={24} color="#64748B" />
          <Text style={styles.pauseButtonText}>Pausar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderRest = () => (
    <View style={styles.restContainer}>
      <View style={styles.restContent}>
        <Ionicons name="hourglass-outline" size={64} color="#3B82F6" />
        <Text style={styles.restTitle}>Descanso</Text>
        <Text style={styles.restTimer}>{formatTime(timeRemaining)}</Text>
        <Text style={styles.restSubtitle}>
          Prepare-se para a {currentSet < mockExercise.sets ? 'próxima série' : 'última série'}
        </Text>

        <TouchableOpacity
          style={styles.skipRestButton}
          onPress={handleRestComplete}
        >
          <Text style={styles.skipRestButtonText}>Pular Descanso</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderCompleted = () => (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.completedContent}>
        <View style={styles.completedIconContainer}>
          <Ionicons name="trophy" size={64} color="#F59E0B" />
        </View>

        <Text style={styles.completedTitle}>Exercício Concluído!</Text>
        <Text style={styles.completedSubtitle}>
          Você completou {mockExercise.sets} séries de {mockExercise.name}
        </Text>

        {/* RPE Selector */}
        <Text style={styles.sectionTitle}>Como foi o esforço?</Text>
        <View style={styles.rpeSelector}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
            <TouchableOpacity
              key={level}
              style={[
                styles.rpeButton,
                completedRPE === level && styles.rpeButtonActive
              ]}
              onPress={() => setCompletedRPE(level)}
            >
              <Text
                style={[
                  styles.rpeButtonText,
                  completedRPE === level && styles.rpeButtonTextActive
                ]}
              >
                {level}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.rpeLabels}>
          <Text style={styles.rpeLabel}>Leve</Text>
          <Text style={styles.rpeLabel}>Moderado</Text>
          <Text style={styles.rpeLabel}>Máximo</Text>
        </View>

        {/* Pain After */}
        <Text style={styles.sectionTitle}>Dor após o exercício?</Text>
        <View style={styles.painAfterSelector}>
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
            <TouchableOpacity
              key={level}
              style={[
                styles.painAfterButton,
                completedPain === level && styles.painAfterButtonActive
              ]}
              onPress={() => setCompletedPain(level)}
            >
              <Text
                style={[
                  styles.painAfterButtonText,
                  completedPain === level && styles.painAfterButtonTextActive
                ]}
              >
                {level}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Notes */}
        <Text style={styles.sectionTitle}>Observações (opcional)</Text>
        <View style={styles.notesInput}>
          <Text style={styles.notesPlaceholder}>
            Adicione notas sobre como você se sentiu durante o exercício...
          </Text>
        </View>

        {/* Complete Button */}
        <TouchableOpacity style={styles.completeButton} onPress={handleComplete}>
          <Text style={styles.completeButtonText}>Finalizar</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      {phase === 'instructions' && renderInstructions()}
      {phase === 'active' && renderActive()}
      {phase === 'rest' && renderRest()}
      {phase === 'completed' && renderCompleted()}

      {/* Skip Modal */}
      <Modal
        visible={showSkipModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSkipModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Por que você quer pular?</Text>

            {['Muito difícil', 'Senti dor', 'Sem tempo', 'Não tenho os equipamentos'].map((reason) => (
              <TouchableOpacity
                key={reason}
                style={styles.modalOption}
                onPress={() => handleSkip(reason)}
              >
                <Text style={styles.modalOptionText}>{reason}</Text>
                <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowSkipModal(false)}
            >
              <Text style={styles.modalCancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerImage: {
    width: '100%',
    height: 240,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 24,
    marginTop: -32,
    backgroundColor: '#F8FAFC',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  exerciseName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
    fontFamily: 'Inter_700',
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 24,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E40AF',
    fontFamily: 'Inter_600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 24,
    marginBottom: 12,
    fontFamily: 'Inter_600',
  },
  description: {
    fontSize: 16,
    color: '#475569',
    lineHeight: 24,
    fontFamily: 'Inter_400',
  },
  detailsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  detailText: {
    fontSize: 14,
    color: '#475569',
    fontFamily: 'Inter_500',
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    fontFamily: 'Inter_400',
  },
  precautionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  precautionText: {
    flex: 1,
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    fontFamily: 'Inter_400',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 24,
    gap: 8,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter_600',
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  skipButtonText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter_600',
  },

  // Active Phase
  activeContainer: {
    flex: 1,
    backgroundColor: '#1E293B',
  },
  activeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 60,
  },
  activeBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  setProgress: {
    flex: 1,
    alignItems: 'center',
  },
  setProgressText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    fontFamily: 'Inter_600',
  },
  setRepText: {
    fontSize: 12,
    color: '#94A3B8',
    fontFamily: 'Inter_400',
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  timerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
    fontFamily: 'Inter_600',
  },
  activeDisplay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  timerCircle: {
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#3B82F6',
  },
  timerBigText: {
    fontSize: 48,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'Inter_700',
  },
  timerLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
    fontFamily: 'Inter_400',
  },
  repCounter: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 24,
  },
  repCounterLabel: {
    fontSize: 14,
    color: '#94A3B8',
    marginRight: 8,
    fontFamily: 'Inter_400',
  },
  repCounterValue: {
    fontSize: 36,
    fontWeight: '700',
    color: '#3B82F6',
    fontFamily: 'Inter_700',
  },
  repCounterTotal: {
    fontSize: 24,
    color: '#64748B',
    fontFamily: 'Inter_400',
  },
  activeControls: {
    flexDirection: 'row',
    padding: 24,
    gap: 12,
  },
  completeRepButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  completeRepButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter_600',
  },
  pauseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#334155',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 8,
  },
  pauseButtonText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter_600',
  },

  // Rest Phase
  restContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  restContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  restTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 24,
    fontFamily: 'Inter_700',
  },
  restTimer: {
    fontSize: 64,
    fontWeight: '700',
    color: '#3B82F6',
    marginTop: 16,
    fontFamily: 'Inter_700',
  },
  restSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 8,
    textAlign: 'center',
    fontFamily: 'Inter_400',
  },
  skipRestButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 32,
  },
  skipRestButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter_600',
  },

  // Completed Phase
  completedContent: {
    padding: 24,
    alignItems: 'center',
  },
  completedIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 48,
  },
  completedTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 24,
    fontFamily: 'Inter_700',
  },
  completedSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
    fontFamily: 'Inter_400',
  },
  rpeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  rpeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rpeButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  rpeButtonText: {
    fontSize: 16,
    color: '#64748B',
    fontFamily: 'Inter_500',
  },
  rpeButtonTextActive: {
    color: '#fff',
  },
  rpeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  rpeLabel: {
    fontSize: 12,
    color: '#94A3B8',
    fontFamily: 'Inter_400',
  },
  painAfterSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  painAfterButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  painAfterButtonActive: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  painAfterButtonText: {
    fontSize: 14,
    color: '#64748B',
    fontFamily: 'Inter_500',
  },
  painAfterButtonTextActive: {
    color: '#fff',
  },
  notesInput: {
    width: '100%',
    minHeight: 100,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
  },
  notesPlaceholder: {
    fontSize: 14,
    color: '#94A3B8',
    fontFamily: 'Inter_400',
  },
  completeButton: {
    width: '100%',
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter_600',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 16,
    fontFamily: 'Inter_600',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#1E293B',
    fontFamily: 'Inter_400',
  },
  modalCancelButton: {
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  modalCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
    fontFamily: 'Inter_600',
  },
});
