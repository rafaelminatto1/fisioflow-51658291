import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { Card } from './Card';
import { Button } from './Button';
import { Badge } from './Badge';
import { Icon } from './Icon';
import { useTheme } from '@/hooks/useTheme';
import type { AnalysisResult, AnalysisType } from '@/lib/poseAnalyzer';

export interface MovementFeedbackProps {
  result: AnalysisResult;
  analysisType: AnalysisType;
  onRetake: () => void;
  onConfirm: () => void;
}

export function MovementFeedback({
  result,
  analysisType,
  onRetake,
  onConfirm,
}: MovementFeedbackProps) {
  const { colors } = useTheme();

  const getScoreColor = () => {
    if (result.score >= 80) return colors.success;
    if (result.score >= 60) return colors.warning;
    return colors.error;
  };

  const getScoreLabel = () => {
    if (result.score >= 80) return 'Excelente';
    if (result.score >= 60) return 'Bom';
    if (result.score >= 40) return 'Regular';
    return 'Precisa melhorar';
  };

  return (
    <ScrollView style={styles.container}>
      {/* Score Card */}
      <Card style={styles.scoreCard}>
        <LinearGradient
          colors={[getScoreColor(), `${getScoreColor()}cc`]}
          style={styles.scoreGradient}
        >
          <Text style={styles.scoreLabel}>Pontuação</Text>
          <Text style={styles.scoreValue}>{Math.round(result.score)}</Text>
          <Text style={styles.scoreText}>{getScoreLabel()}</Text>
        </LinearGradient>
      </Card>

      {/* Repetitions */}
      {analysisType === 'repetition' && result.repCount !== undefined && (
        <Card style={styles.statCard}>
          <View style={styles.statContent}>
            <Icon name="repeat" size={32} color={colors.primary} />
            <View>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {result.repCount}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Repetições
              </Text>
            </View>
          </View>
        </Card>
      )}

      {/* Range of Motion */}
      {analysisType === 'range' && result.rangeOfMotion && (
        <Card style={styles.statCard}>
          <View style={styles.statContent}>
            <Icon name="move" size={32} color={colors.primary} />
            <View>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {result.rangeOfMotion.range.toFixed(0)}°
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Arco de Movimento
              </Text>
              <Text style={[styles.statDetail, { color: colors.textSecondary }]}>
                {result.rangeOfMotion.minAngle.toFixed(0)}° - {result.rangeOfMotion.maxAngle.toFixed(0)}°
              </Text>
            </View>
          </View>
        </Card>
      )}

      {/* Posture Issues */}
      {analysisType === 'posture' && result.postureIssues && result.postureIssues.length > 0 && (
        <Card style={styles.issuesCard}>
          <Text style={[styles.issuesTitle, { color: colors.text }]}>
            Observações
          </Text>
          {result.postureIssues.map((issue, index) => (
            <View key={index} style={[styles.issueItem, { borderBottomColor: colors.border }]}>
              <View style={styles.issueIconContainer}>
                <Icon
                  name={issue.severity === 'severe' ? 'alert-triangle' : 'info'}
                  size={20}
                  color={issue.severity === 'severe' ? colors.error : colors.warning}
                />
              </View>
              <View style={styles.issueContent}>
                <Text style={[styles.issueTitle, { color: colors.text }]}>
                  {getIssueLabel(issue.type)}
                </Text>
                <Text style={[styles.issueDescription, { color: colors.textSecondary }]}>
                  {issue.description}
                </Text>
              </View>
              <Badge
                variant={issue.severity === 'severe' ? 'error' : issue.severity === 'moderate' ? 'warning' : 'default'}
                size="sm"
              >
                {getSeverityLabel(issue.severity)}
              </Badge>
            </View>
          ))}
        </Card>
      )}

      {/* Feedback List */}
      {result.feedback && result.feedback.length > 0 && (
        <Card style={styles.feedbackCard}>
          <Text style={[styles.feedbackTitle, { color: colors.text }]}>
            Feedback
          </Text>
          {result.feedback.map((item, index) => (
            <View key={index} style={styles.feedbackItem}>
              <Icon name="check-circle" size={16} color={colors.success} />
              <Text style={[styles.feedbackText, { color: colors.text }]}>{item}</Text>
            </View>
          ))}
        </Card>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          variant="outline"
          size="lg"
          onPress={onRetake}
          leftIcon={<Icon name="refresh-cw" size={20} color={colors.text} />}
          style={styles.actionButton}
        >
          Nova Análise
        </Button>
        <Button
          variant="primary"
          size="lg"
          onPress={onConfirm}
          leftIcon={<Icon name="check" size={20} color="#fff" />}
          style={styles.actionButton}
        >
          Confirmar
        </Button>
      </View>

      <View style={styles.bottomSpacing} />
    </ScrollView>
  );
}

function getIssueLabel(type: string): string {
  const labels: Record<string, string> = {
    head_forward: 'Cabeça à Frente',
    rounded_shoulders: 'Ombros Arredondados',
    uneven_hips: 'Quadris Assimétricos',
    kyphosis: 'Cifose',
    lordosis: 'Lordose',
  };
  return labels[type] || type;
}

function getSeverityLabel(severity: string): string {
  const labels: Record<string, string> = {
    mild: 'Leve',
    moderate: 'Moderado',
    severe: 'Severo',
  };
  return labels[severity] || severity;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scoreCard: {
    padding: 0,
    overflow: 'hidden',
    marginBottom: 16,
  },
  scoreGradient: {
    padding: 32,
    alignItems: 'center',
  },
  scoreLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  scoreValue: {
    color: '#fff',
    fontSize: 64,
    fontWeight: '800',
    marginTop: 8,
  },
  scoreText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 4,
  },
  statCard: {
    padding: 20,
    marginBottom: 16,
  },
  statContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  statValue: {
    fontSize: 36,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  statDetail: {
    fontSize: 12,
    marginTop: 2,
  },
  issuesCard: {
    padding: 16,
    marginBottom: 16,
  },
  issuesTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  issueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  issueIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  issueContent: {
    flex: 1,
  },
  issueTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  issueDescription: {
    fontSize: 13,
    marginTop: 2,
  },
  feedbackCard: {
    padding: 16,
    marginBottom: 16,
  },
  feedbackTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  feedbackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  feedbackText: {
    fontSize: 14,
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
  },
  bottomSpacing: {
    height: 40,
  },
});
