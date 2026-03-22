import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface EvolutionCardProps {
  date: string;
  therapistName: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  sessionNumber?: number;
  painLevel?: number;
  onClick?: () => void;
  compact?: boolean;
  style?: any;
}

export const EvolutionCard = React.forwardRef<View, EvolutionCardProps>(
  ({ 
    date, 
    therapistName, 
    subjective, 
    objective, 
    assessment, 
    plan,
    sessionNumber, 
    painLevel,
    onClick, 
    compact = false,
    style,
    ...props 
  }, ref) => {
    
    // Map pain level to colors
    const getPainColor = (level: number) => {
        if (level > 7) return '#ef4444'; // red-500
        if (level > 3) return '#f59e0b'; // amber-500
        return '#22c55e'; // green-500
    };

    const getPainBg = (level: number) => {
        if (level > 7) return '#fee2e2'; // red-500/10
        if (level > 3) return '#fef3c7'; // amber-500/10
        return '#dcfce7'; // green-500/10
    };

    return (
      <TouchableOpacity
        ref={ref}
        onPress={onClick}
        activeOpacity={0.7}
        style={[
          styles.card,
          compact ? styles.compact : styles.normal,
          style
        ]}
        {...props}
      >
        <View style={styles.header}>
          <View style={styles.dateContainer}>
            <Ionicons name="calendar-outline" size={14} color="#64748b" /> 
            <Text style={styles.dateText}>{date}</Text>
            {sessionNumber && <Text style={styles.sessionText}>• Sessão #{sessionNumber}</Text>}
          </View>
          {painLevel !== undefined && (
            <View style={[styles.badge, { backgroundColor: getPainBg(painLevel) }]}>
              <Text style={[styles.badgeText, { color: getPainColor(painLevel) }]}>
                Dor: {painLevel}/10
              </Text>
            </View>
          )}
        </View>

        <View style={styles.content}>
          {subjective && (
            <View style={styles.section}>
              <Text style={styles.label}>SUBJETIVO</Text>
              <Text style={styles.text} numberOfLines={2}>{subjective}</Text>
            </View>
          )}
          
          {!compact && assessment && (
            <View style={styles.section}>
              <Text style={styles.label}>AVALIAÇÃO</Text>
              <Text style={styles.text} numberOfLines={2}>{assessment}</Text>
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <Ionicons name="person-outline" size={12} color="#94a3b8" />
          <Text style={styles.footerText}>{therapistName}</Text>
        </View>
      </TouchableOpacity>
    );
  }
);

EvolutionCard.displayName = 'EvolutionCard';

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    marginBottom: 8,
  },
  compact: {
    padding: 12,
  },
  normal: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0f172a',
  },
  sessionText: {
    fontSize: 12,
    color: '#64748b',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  content: {
    gap: 8,
  },
  section: {
    gap: 4,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  text: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  footer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  footerText: {
    fontSize: 12,
    color: '#94a3b8',
  },
});
