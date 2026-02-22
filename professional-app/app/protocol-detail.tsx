import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColorScheme';
import { useHaptics } from '@/hooks/useHaptics';
import { useProtocol } from '@/hooks/useProtocol';
import { useProtocols } from '@/hooks/useProtocols';
import { Card } from '@/components';

export default function ProtocolDetailScreen() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { light, medium, success, error: hapticError } = useHaptics();

  const protocolId = params.protocolId as string;
  const { protocol, isLoading } = useProtocol(protocolId);
  const { delete: deleteProtocol, duplicate: duplicateProtocol, isDeleting, isDuplicating } = useProtocols();

  const handleEdit = () => {
    medium();
    router.push(`/protocol-form?protocolId=${protocolId}` as any);
  };

  const handleDuplicate = async () => {
    medium();
    Alert.alert(
      'Duplicar Protocolo',
      'Deseja criar uma cópia deste protocolo?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Duplicar',
          onPress: async () => {
            try {
              await duplicateProtocol(protocolId);
              success();
              Alert.alert('Sucesso', 'Protocolo duplicado com sucesso!');
            } catch (err: any) {
              hapticError();
              Alert.alert('Erro', err.message || 'Não foi possível duplicar o protocolo.');
            }
          },
        },
      ]
    );
  };

  const handleDelete = () => {
    medium();
    Alert.alert(
      'Excluir Protocolo',
      'Tem certeza que deseja excluir este protocolo? Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteProtocol(protocolId);
              success();
              Alert.alert('Sucesso', 'Protocolo excluído com sucesso!', [
                {
                  text: 'OK',
                  onPress: () => router.back(),
                },
              ]);
            } catch (err: any) {
              hapticError();
              Alert.alert('Erro', err.message || 'Não foi possível excluir o protocolo.');
            }
          },
        },
      ]
    );
  };

  const handleApplyToPatient = () => {
    medium();
    router.push(`/apply-protocol?protocolId=${protocolId}` as any);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Carregando protocolo...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!protocol) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.text }]}>Protocolo não encontrado</Text>
          <TouchableOpacity
            style={[styles.errorButton, { backgroundColor: colors.primary }]}
            onPress={() => router.back()}
          >
            <Text style={styles.errorButtonText}>Voltar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Detalhes do Protocolo</Text>
        <TouchableOpacity onPress={handleEdit} style={styles.editButton}>
          <Ionicons name="create-outline" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Protocol Info */}
        <Card style={styles.infoCard}>
          <View style={styles.titleRow}>
            <Text style={[styles.protocolName, { color: colors.text }]}>{protocol.name}</Text>
            {protocol.isTemplate && (
              <View style={[styles.templateBadge, { backgroundColor: colors.infoLight }]}>
                <Ionicons name="bookmark" size={14} color={colors.info} />
                <Text style={[styles.templateBadgeText, { color: colors.info }]}>Template</Text>
              </View>
            )}
          </View>

          {protocol.description && (
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {protocol.description}
            </Text>
          )}

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="folder-outline" size={18} color={colors.primary} />
              <Text style={[styles.metaText, { color: colors.text }]}>{protocol.category}</Text>
            </View>
            {protocol.condition && (
              <View style={styles.metaItem}>
                <Ionicons name="medical-outline" size={18} color={colors.primary} />
                <Text style={[styles.metaText, { color: colors.text }]}>{protocol.condition}</Text>
              </View>
            )}
          </View>
        </Card>

        {/* Exercises */}
        <Card style={styles.exercisesCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="fitness-outline" size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Exercícios ({protocol.exercises.length})
            </Text>
          </View>

          <View style={styles.exercisesList}>
            {protocol.exercises.map((exercise, index) => (
              <View
                key={exercise.exerciseId}
                style={[styles.exerciseItem, { backgroundColor: colors.background, borderColor: colors.border }]}
              >
                <View style={[styles.exerciseOrder, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[styles.exerciseOrderText, { color: colors.primary }]}>
                    {exercise.order}
                  </Text>
                </View>
                <View style={styles.exerciseContent}>
                  <Text style={[styles.exerciseName, { color: colors.text }]}>
                    {exercise.exercise?.name || 'Exercício'}
                  </Text>
                  <View style={styles.exerciseDetails}>
                    <View style={styles.exerciseDetailItem}>
                      <Ionicons name="repeat-outline" size={14} color={colors.textMuted} />
                      <Text style={[styles.exerciseDetailText, { color: colors.textSecondary }]}>
                        {exercise.sets} séries × {exercise.reps} reps
                      </Text>
                    </View>
                    <View style={styles.exerciseDetailItem}>
                      <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
                      <Text style={[styles.exerciseDetailText, { color: colors.textSecondary }]}>
                        {exercise.frequency}
                      </Text>
                    </View>
                  </View>
                  {exercise.notes && (
                    <Text style={[styles.exerciseNotes, { color: colors.textMuted }]}>
                      💡 {exercise.notes}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        </Card>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
            onPress={handleApplyToPatient}
          >
            <Ionicons name="person-add" size={20} color="#fff" />
            <Text style={styles.primaryButtonText}>Aplicar a Paciente</Text>
          </TouchableOpacity>

          <View style={styles.secondaryActions}>
            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: colors.border }]}
              onPress={handleDuplicate}
            >
              <Ionicons name="copy-outline" size={20} color={colors.text} />
              <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Duplicar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: colors.error }]}
              onPress={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <ActivityIndicator color={colors.error} size="small" />
              ) : (
                <>
                  <Ionicons name="trash-outline" size={20} color={colors.error} />
                  <Text style={[styles.secondaryButtonText, { color: colors.error }]}>Excluir</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  editButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    gap: 16,
  },
  infoCard: {
    padding: 16,
    gap: 12,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  protocolName: {
    fontSize: 20,
    fontWeight: '600',
    flex: 1,
  },
  templateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  templateBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    fontSize: 14,
    fontWeight: '500',
  },
  exercisesCard: {
    padding: 16,
    gap: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  exercisesList: {
    gap: 12,
  },
  exerciseItem: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  exerciseOrder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseOrderText: {
    fontSize: 16,
    fontWeight: '600',
  },
  exerciseContent: {
    flex: 1,
    gap: 6,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
  },
  exerciseDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  exerciseDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  exerciseDetailText: {
    fontSize: 13,
  },
  exerciseNotes: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  actions: {
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    gap: 16,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
  },
  errorButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  errorButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
});
