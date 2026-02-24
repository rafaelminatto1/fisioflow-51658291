import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../Card';
import { ExerciseSession, ExecutionQuality } from '../../types/pose';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Props {
  session: ExerciseSession;
  colors: any;
}

export function AIExerciseHistoryCard({ session, colors }: Props) {
  const getQualityColor = (score: number) => {
    if (score >= 90) return '#10B981'; // Perfeito
    if (score >= 70) return '#3B82F6'; // Bom
    if (score >= 50) return '#F59E0B'; // Regular
    return '#EF4444'; // Ruim
  };

  const dateLabel = session.createdAt?.toDate 
    ? format(session.createdAt.toDate(), "dd 'de' MMM", { locale: ptBR })
    : 'Data N/A';

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleGroup}>
          <Text style={[styles.exerciseName, { color: colors.text }]}>
            {session.exerciseType.toUpperCase()}
          </Text>
          <Text style={[styles.date, { color: colors.textSecondary }]}>{dateLabel}</Text>
        </View>
        <View style={[styles.scoreBadge, { backgroundColor: getQualityColor(session.totalScore) + '20' }]}>
          <Text style={[styles.scoreText, { color: getQualityColor(session.totalScore) }]}>
            {session.totalScore}%
          </Text>
        </View>
      </View>

      <View style={styles.metricsRow}>
        <View style={styles.metric}>
          <Text style={[styles.metricValue, { color: colors.text }]}>{session.repetitions}</Text>
          <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Reps</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.metric}>
          <Text style={[styles.metricValue, { color: colors.text }]}>
            {session.metrics.rangeOfMotion}°
          </Text>
          <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>ADM Méd.</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.metric}>
          <Text style={[styles.metricValue, { color: colors.text }]}>
            {Math.round(session.duration / 60)}m
          </Text>
          <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Duração</Text>
        </View>
      </View>

      {session.postureIssues.length > 0 && (
        <View style={styles.issuesContainer}>
          <Text style={[styles.issuesTitle, { color: colors.error }]}>
            <Ionicons name="warning-outline" size={14} /> Problemas Detectados:
          </Text>
          {session.postureIssues.slice(0, 2).map((issue, idx) => (
            <Text key={idx} style={[styles.issueItem, { color: colors.textSecondary }]}>
              • {issue.description}
            </Text>
          ))}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 12, padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  titleGroup: { gap: 2 },
  exerciseName: { fontSize: 16, fontWeight: 'bold' },
  date: { fontSize: 12 },
  scoreBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  scoreText: { fontWeight: 'bold', fontSize: 14 },
  metricsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  metric: { alignItems: 'center', flex: 1 },
  metricValue: { fontSize: 18, fontWeight: 'bold' },
  metricLabel: { fontSize: 10, marginTop: 2 },
  divider: { width: 1, height: 20, backgroundColor: '#e5e7eb' },
  issuesContainer: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  issuesTitle: { fontSize: 12, fontWeight: 'bold', marginBottom: 4 },
  issueItem: { fontSize: 12, lineHeight: 18 },
});
