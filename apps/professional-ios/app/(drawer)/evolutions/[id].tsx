import { useState, useCallback, useEffect } from 'react';

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/hooks/useTheme';
import { HapticFeedback } from '@/lib/haptics';
import { useEvolutions } from '@/hooks/useEvolutions';
import type { SOAPRecord } from '@/types';

export default function EvolutionDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { colors } = useTheme();

  const evolutionId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [evolution, setEvolution] = useState<SOAPRecord | null>(null);
  
  // Use the hook to get decrypted SOAP data
  const { getById } = useEvolutions();

  useEffect(() => {
    loadEvolution();
  }, [evolutionId]);

  const loadEvolution = async () => {
    try {
      // Use the hook's getById method which decrypts PHI fields
      const evo = await getById(evolutionId);
      setEvolution(evo);
      setLoading(false);
    } catch (error) {
      // Never log PHI content - only log error type
      console.error('Error loading evolution - failed to decrypt');
      setLoading(false);
    }
  };

  const handleDelete = useCallback(() => {
    // Alert for delete confirmation
  }, [evolutionId, router]);

  const handleEdit = useCallback(() => {
    HapticFeedback.light();
    router.push(`/evolutions/${evolutionId}/edit`);
  }, [evolutionId, router]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!evolution) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Icon name="alert-triangle" size={48} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.text }]}>Evolução não encontrada</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.headerButton}>
          <Icon name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Evolução</Text>
        <Pressable onPress={handleEdit} style={styles.headerButton}>
          <Icon name="edit-2" size={24} color={colors.primary} />
        </Pressable>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Session Header */}
        <Card style={styles.sessionCard}>
          <View style={styles.sessionHeader}>
            <View style={[styles.sessionNumber, { backgroundColor: `${colors.primary}10` }]}>
              <Text style={[styles.sessionNumberText, { color: colors.primary }]}>
                Sessão {evolution.sessionNumber}
              </Text>
            </View>
            <Text style={[styles.sessionDate, { color: colors.textSecondary }]}>
              {format(new Date(evolution.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </Text>
          </View>
        </Card>

        {/* Subjective */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="message-square" size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Subjetivo (S)</Text>
          </View>
          <Card style={styles.card}>
            <Text style={[styles.content, { color: colors.text }]}>
              {evolution.subjective || 'Nenhuma informação registrada'}
            </Text>
          </Card>
        </View>

        {/* Objective */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="activity" size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Objetivo (O)</Text>
          </View>
          <Card style={styles.card}>
            {evolution.objective && (
              <>
                {evolution.objective.inspection && (
                  <View style={styles.objectiveItem}>
                    <Text style={[styles.objectiveLabel, { color: colors.textSecondary }]}>Inspeção:</Text>
                    <Text style={[styles.content, { color: colors.text }]}>
                      {evolution.objective.inspection}
                    </Text>
                  </View>
                )}
                {evolution.objective.palpation && (
                  <View style={styles.objectiveItem}>
                    <Text style={[styles.objectiveLabel, { color: colors.textSecondary }]}>Palpação:</Text>
                    <Text style={[styles.content, { color: colors.text }]}>
                      {evolution.objective.palpation}
                    </Text>
                  </View>
                )}
                {evolution.objective.posture_analysis && (
                  <View style={styles.objectiveItem}>
                    <Text style={[styles.objectiveLabel, { color: colors.textSecondary }]}>Análise Postural:</Text>
                    <Text style={[styles.content, { color: colors.text }]}>
                      {evolution.objective.posture_analysis}
                    </Text>
                  </View>
                )}
              </>
            )}
          </Card>
        </View>

        {/* Assessment */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="stethoscope" size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Avaliação (A)</Text>
          </View>
          <Card style={styles.card}>
            <Text style={[styles.content, { color: colors.text }]}>
              {evolution.assessment || 'Nenhuma avaliação registrada'}
            </Text>
          </Card>
        </View>

        {/* Plan */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="clipboard-list" size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Plano (P)</Text>
          </View>
          <Card style={styles.card}>
            {evolution.plan && (
              <>
                {evolution.plan.short_term_goals && evolution.plan.short_term_goals.length > 0 && (
                  <View style={styles.planItem}>
                    <Text style={[styles.planLabel, { color: colors.textSecondary }]}>Metas de Curto Prazo:</Text>
                    {evolution.plan.short_term_goals.map((goal, index) => (
                      <View key={index} style={styles.goalItem}>
                        <Icon name="check-circle" size={16} color={colors.success} />
                        <Text style={[styles.goalText, { color: colors.text }]}>{goal}</Text>
                      </View>
                    ))}
                  </View>
                )}
                {evolution.plan.long_term_goals && evolution.plan.long_term_goals.length > 0 && (
                  <View style={styles.planItem}>
                    <Text style={[styles.planLabel, { color: colors.textSecondary }]}>Metas de Longo Prazo:</Text>
                    {evolution.plan.long_term_goals.map((goal, index) => (
                      <View key={index} style={styles.goalItem}>
                        <Icon name="target" size={16} color={colors.primary} />
                        <Text style={[styles.goalText, { color: colors.text }]}>{goal}</Text>
                      </View>
                    ))}
                  </View>
                )}
                {evolution.plan.interventions && evolution.plan.interventions.length > 0 && (
                  <View style={styles.planItem}>
                    <Text style={[styles.planLabel, { color: colors.textSecondary }]}>Intervenções:</Text>
                    {evolution.plan.interventions.map((intervention, index) => (
                      <View key={index} style={styles.goalItem}>
                        <Icon name="zap" size={16} color={colors.warning} />
                        <Text style={[styles.goalText, { color: colors.text }]}>{intervention}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}
          </Card>
        </View>

        {/* Vital Signs */}
        {evolution.vital_signs && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="heart" size={20} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Sinais Vitais</Text>
            </View>
            <Card style={styles.card}>
              <View style={styles.vitalsGrid}>
                {evolution.vital_signs.blood_pressure && (
                  <VitalItem label="PA" value={evolution.vital_signs.blood_pressure} icon="activity" colors={colors} />
                )}
                {evolution.vital_signs.heart_rate && (
                  <VitalItem label="FC" value={`${evolution.vital_signs.heart_rate} bpm`} icon="heart" colors={colors} />
                )}
                {evolution.vital_signs.temperature && (
                  <VitalItem label="Temp" value={`${evolution.vital_signs.temperature}°C`} icon="thermometer" colors={colors} />
                )}
                {evolution.vital_signs.oxygen_saturation && (
                  <VitalItem label="SpO2" value={`${evolution.vital_signs.oxygen_saturation}%`} icon="wind" colors={colors} />
                )}
              </View>
            </Card>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            variant="outline"
            size="lg"
            onPress={handleEdit}
            leftIcon={<Icon name="edit-2" size={20} color={colors.primary} />}
            style={styles.actionButton}
          >
            Editar Evolução
          </Button>
          <Button
            variant="secondary"
            size="lg"
            onPress={handleDelete}
            leftIcon={<Icon name="trash-2" size={20} color={colors.error} />}
            style={styles.actionButton}
          >
            Excluir
          </Button>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

function VitalItem({ label, value, icon, colors }: { label: string; value: string; icon: string; colors: any }) {
  return (
    <View style={[styles.vitalItem, { backgroundColor: colors.card }]}>
      <Icon name={icon as any} size={18} color={colors.primary} />
      <View style={styles.vitalInfo}>
        <Text style={[styles.vitalLabel, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[styles.vitalValue, { color: colors.text }]}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  errorText: {
    fontSize: 16,
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  sessionCard: {
    padding: 16,
    marginBottom: 20,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sessionNumber: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  sessionNumberText: {
    fontSize: 14,
    fontWeight: '700',
  },
  sessionDate: {
    fontSize: 13,
  },
  section: {
    marginBottom: 20,
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
  card: {
    padding: 16,
  },
  content: {
    fontSize: 14,
    lineHeight: 20,
  },
  objectiveItem: {
    marginBottom: 12,
  },
  objectiveLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  planItem: {
    marginBottom: 16,
  },
  planLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  goalItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  goalText: {
    flex: 1,
    fontSize: 14,
  },
  vitalsGrid: {
    gap: 12,
  },
  vitalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
  },
  vitalInfo: {
    flex: 1,
    gap: 2,
  },
  vitalLabel: {
    fontSize: 12,
  },
  vitalValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  actions: {
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    width: '100%',
  },
  bottomSpacing: {
    height: 40,
  },
});
