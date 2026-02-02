import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import { HapticFeedback } from '@/lib/haptics';
import { PROTOCOL_TEMPLATES, getProtocolById, getProtocolsByCategory, searchProtocols, getRecommendedProtocols } from '@/lib/protocolTemplates';
import { doc, setDoc, serverTimestamp, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ProtocolTemplate, ProtocolExercise } from '@/lib/protocolTemplates';

export default function ProtocolTemplatesScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { profile } = useAuth();

  const [loading, setLoading] = useState(false);
  const [selectedProtocol, setSelectedProtocol] = useState<ProtocolTemplate | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [categories] = useState(['Todos', ...Array.from(new Set(PROTOCOL_TEMPLATES.map(p => p.category)))]);

  const filteredProtocols = searchQuery
    ? searchProtocols(searchQuery)
    : PROTOCOL_TEMPLATES;

  const handleSelectProtocol = useCallback((protocol: ProtocolTemplate) => {
    HapticFeedback.selection();
    setSelectedProtocol(protocol);
  }, []);

  const handleCreateFromTemplate = useCallback(async (protocol: ProtocolTemplate) => {
    try {
      setLoading(true);
      HapticFeedback.medium();

      // Prompt for patient selection first
      router.push(`/patients/select?for=protocol&protocolId=${protocol.id}`);
    } catch (error) {
      console.error('Error:', error);
      setLoading(false);
    }
  }, [router]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.headerButton}>
          <Icon name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Templates de Protocolos</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Search */}
        <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
          <Icon name="search" size={20} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Buscar protocolos..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="words"
          />
        </View>

        {/* Category Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesScroll}
        >
          {categories.map((category) => (
            <Pressable
              key={category}
              onPress={() => {
                HapticFeedback.selection();
                setSearchQuery(category === 'Todos' ? '' : category);
              }}
              style={({ pressed }) => [
                styles.categoryChip,
                {
                  backgroundColor: searchQuery === category || (category === 'Todos' && !searchQuery)
                    ? colors.primary
                    : colors.card,
                  borderColor: searchQuery === category || (category === 'Todos' && !searchQuery)
                    ? colors.primary
                    : colors.border,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.categoryText,
                  { color: searchQuery === category || (category === 'Todos' && !searchQuery) ? '#fff' : colors.text },
                ]}
              >
                {category}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Protocol List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : filteredProtocols.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Icon name="file-text" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Nenhum protocolo encontrado
            </Text>
          </Card>
        ) : (
          <View style={styles.protocolsList}>
            {filteredProtocols.map((protocol) => (
              <Pressable
                key={protocol.id}
                onPress={() => handleSelectProtocol(protocol)}
              style={({ pressed }) => [
                styles.protocolCard,
                { opacity: pressed ? 0.9 : 1 },
              ]}
              >
                {/* Protocol Header */}
                <View style={styles.protocolHeader}>
                  <View style={styles.protocolIconContainer}>
                    <Icon name="clipboard-list" size={24} color={colors.primary} />
                  </View>
                  <View style={styles.protocolHeaderInfo}>
                    <Text style={[styles.protocolName, { color: colors.text }]}>{protocol.name}</Text>
                    <Text style={[styles.protocolCategory, { color: colors.primary }]}>
                      {protocol.category}
                    </Text>
                  </View>
                  <Icon name="chevron-right" size={20} color={colors.textSecondary} />
                </View>

                {/* Protocol Details */}
                <Text style={[styles.protocolDescription, { color: colors.textSecondary }]} numberOfLines={2}>
                  {protocol.description}
                </Text>

                {/* Protocol Stats */}
                <View style={styles.protocolStats}>
                  <StatItem icon="calendar" label={`${protocol.duration_weeks} semanas`} colors={colors} />
                  <StatItem icon="clock" label={`${protocol.sessions_per_week}x/sem`} colors={colors} />
                  <StatItem icon="dumbbell" label={`${protocol.exercises.length} exercícios`} colors={colors} />
                </View>

                {/* Goals */}
                <View style={styles.goalsContainer}>
                  <Text style={[styles.goalsLabel, { color: colors.text }]}>Objetivos:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.goalsScroll}>
                    {protocol.goals.map((goal, index) => (
                      <View key={index} style={[styles.goalChip, { backgroundColor: `${colors.primary}10` }]}>
                        <Text style={[styles.goalText, { color: colors.primary }]}>{goal}</Text>
                      </View>
                    ))}
                  </ScrollView>
                </View>

                {/* Exercises Preview */}
                {protocol.exercises.length > 0 && (
                  <View style={styles.exercisesPreview}>
                    <Text style={[styles.exercisesLabel, { color: colors.text }]}>Exercícios incluídos:</Text>
                  <View style={styles.exercisesList}>
                    {protocol.exercises.slice(0, 4).map((exercise, index) => (
                      <Text key={index} style={[styles.exerciseName, { color: colors.textSecondary }]}>
                        • {exercise.exercise_name} ({exercise.sets}x{exercise.reps})
                      </Text>
                    ))}
                    {protocol.exercises.length > 4 && (
                      <Text style={[styles.exercisesMore, { color: colors.textSecondary }]}>
                        +{protocol.exercises.length - 4} outros
                      </Text>
                    )}
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Protocol Detail Modal */}
      {selectedProtocol && (
        <Modal
          visible={!!selectedProtocol}
          animationType="slide"
          transparent
          onRequestClose={() => setSelectedProtocol(null)}
        >
          <View style={styles.modalOverlay}>
            <Pressable style={styles.modalBackdrop} onPress={() => setSelectedProtocol(null)}>
              <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
                <Pressable onPress={() => setSelectedProtocol(null)} style={styles.modalClose}>
                  <Icon name="x" size={24} color={colors.text} />
                </Pressable>

                <ScrollView style={styles.modalScrollView}>
                  {/* Protocol Header */}
                  <View style={styles.modalHeader}>
                    <View style={styles.modalIcon}>
                      <Icon name="clipboard-list" size={32} color={colors.primary} />
                    </View>
                    <View style={styles.modalHeaderInfo}>
                      <Text style={[styles.modalTitle, { color: colors.text }]}>{selectedProtocol.name}</Text>
                      <Badge variant="default" size="sm">{selectedProtocol.category}</Badge>
                    </View>
                  </View>

                  {/* Description */}
                  <Text style={[styles.modalDescription, { color: colors.text }]}>
                    {selectedProtocol.description}
                  </Text>

                  {/* Stats */}
                  <View style={styles.modalStats}>
                    <StatCardLarge
                      icon="calendar"
                      label="Duração"
                      value={`${selectedProtocol.duration_weeks} semanas`}
                      colors={colors}
                    />
                    <StatCardLarge
                      icon="repeat"
                      label="Frequência"
                      value={`${selectedProtocol.sessions_per_week}x/sem`}
                      colors={colors}
                    />
                    <StatCardLarge
                      icon="dumbbell"
                      label="Exercícios"
                      value={selectedProtocol.exercises.length}
                      colors={colors}
                    />
                  </View>

                  {/* Goals */}
                  <Card style={styles.modalCard}>
                    <Text style={[styles.modalSectionTitle, { color: colors.text }]}>Objetivos</Text>
                    <View style={styles.goalsList}>
                      {selectedProtocol.goals.map((goal, index) => (
                        <View key={index} style={styles.goalItem}>
                          <Icon name="check-circle" size={18} color={colors.success} />
                          <Text style={[styles.goalItemText, { color: colors.text }]}>{goal}</Text>
                        </View>
                      ))}
                    </View>
                  </Card>

                  {/* Exercises List */}
                  <Card style={styles.modalCard}>
                    <Text style={[styles.modalSectionTitle, { color: colors.text }]}>Exercícios</Text>
                    <View style={styles.exercisesListFull}>
                      {selectedProtocol.exercises.map((exercise, index) => (
                        <View key={index} style={styles.exerciseItem}>
                          <View style={[styles.exerciseIndex, { backgroundColor: `${colors.primary}15` }]}>
                            <Text style={[styles.exerciseIndexText, { color: colors.primary }]}>
                              {index + 1}
                            </Text>
                          </View>
                          <View style={styles.exerciseDetails}>
                            <Text style={[styles.exerciseName, { color: colors.text }]}>
                              {exercise.exercise_name}
                            </Text>
                            <View style={styles.exerciseMeta}>
                              <Text style={[styles.exerciseMetaText, { color: colors.textSecondary }]}>
                                {exercise.sets} séries × {exercise.reps} reps
                              </Text>
                              {exercise.hold_time && (
                                <Text style={[styles.exerciseMetaText, { color: colors.textSecondary }]}>
                                  • {exercise.hold_time}s descanso
                                </Text>
                              )}
                            </View>
                            {exercise.notes && (
                              <Text style={[styles.exerciseNotes, { color: colors.textSecondary }]} numberOfLines={2}>
                                {exercise.notes}
                              </Text>
                            )}
                          </View>
                        </View>
                      ))}
                    </View>
                  </Card>

                  {/* Contraindications */}
                  {selectedProtocol.contraindications && selectedProtocol.contraindications.length > 0 && (
                    <Card style={[styles.modalCard, styles.warningCard]}>
                      <View style={styles.warningHeader}>
                        <Icon name="alert-triangle" size={20} color={colors.warning} />
                        <Text style={[styles.warningTitle, { color: colors.text }]}>Contraindicações</Text>
                      </View>
                      {selectedProtocol.contraindications.map((contraindication, index) => (
                        <Text key={index} style={[styles.contraindicationText, { color: colors.text }]}>
                          • {contraindication}
                        </Text>
                      ))}
                    </Card>
                  )}

                  {/* Action Button */}
                  <Button
                    variant="primary"
                    size="lg"
                    onPress={() => handleCreateFromTemplate(selectedProtocol)}
                    leftIcon={<Icon name="plus-circle" size={20} color="#fff" />}
                    style={styles.modalButton}
                  >
                    Usar Este Protocolo
                  </Button>

                  <View style={styles.modalSpacing} />
                </ScrollView>
              </View>
            </Pressable>
          </View>
        </View>
      </Modal>
    )}
    </SafeAreaView>
  );
}

function StatItem({ icon, label, colors }: { icon: string; label: string; colors: any }) {
  return (
    <View style={styles.statItem}>
      <Icon name={icon as any} size={16} color={colors.textSecondary} />
      <Text style={[styles.statItemText, { color: colors.text }]}>{label}</Text>
    </View>
  );
}

function StatCardLarge({ icon, label, value, colors }: { icon: string; label: string; value: string | number; colors: any }) {
  return (
    <View style={[styles.statCardLarge, { backgroundColor: colors.card }]}>
      <Icon name={icon as any} size={24} color={colors.primary} />
      <Text style={[styles.statCardValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statCardLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  categoriesScroll: {
    gap: 10,
    marginBottom: 20,
    paddingHorizontal: 2,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
  },
  protocolsList: {
    gap: 12,
  },
  protocolCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  protocolHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  protocolIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  protocolHeaderInfo: {
    flex: 1,
  },
  protocolName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  protocolCategory: {
    fontSize: 13,
    fontWeight: '600',
  },
  protocolDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  protocolStats: {
    flexDirection: 'row',
    gap: 16,
  },
  goalsContainer: {
    marginTop: 12,
  },
  goalsLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  goalsScroll: {
    gap: 8,
  },
  goalChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  goalText: {
    fontSize: 12,
    fontWeight: '500',
  },
  exercisesPreview: {
    marginTop: 12,
  },
  exercisesLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  exercisesList: {
    gap: 2,
  },
  exerciseName: {
    fontSize: 13,
  },
  exercisesMore: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statItemText: {
    fontSize: 13,
  },
  emptyCard: {
    padding: 40,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#e5e7eb',
  },
  emptyText: {
    fontSize: 15,
    marginTop: 12,
    textAlign: 'center',
  },
  loadingContainer: {
    padding: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalOverlayTransparent: {
    backgroundColor: 'transparent',
  },
  modalBackdrop: {
    flex: 1,
  },
  modalContent: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: 'auto',
    maxHeight: '80%',
  },
  modalClose: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalScrollView: {
    flex: 1,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
  },
  modalIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalHeaderInfo: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalDescription: {
    fontSize: 15,
    color: '#6b7280',
    marginBottom: 20,
  },
  modalStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 12,
    marginBottom: 20,
  },
  statCardLarge: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  statCardValue: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  statCardLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  modalCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  goalsList: {
    gap: 8,
  },
  goalItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  goalItemText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  exercisesListFull: {
    gap: 12,
  },
  exerciseItem: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  exerciseIndex: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  exerciseIndexText: {
    fontSize: 12,
    fontWeight: '700',
    // Color will be set dynamically
  },
  exerciseDetails: {
    flex: 1,
    gap: 2,
  },
  exerciseName: {
    fontSize: 14,
    fontWeight: '600',
  },
  exerciseMeta: {
    flexDirection: 'row',
    gap: 8,
  },
  exerciseMetaText: {
    fontSize: 12,
  },
  exerciseNotes: {
    fontSize: 12,
    marginTop: 2,
  },
  warningCard: {
    backgroundColor: '#fef3c7',
    borderColor: '#fde68a',
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  contraindicationText: {
    fontSize: 13,
    color: '#92400e',
    marginBottom: 4,
  },
  modalButton: {
    marginTop: 12,
  },
  modalSpacing: {
    height: 40,
  },
});
