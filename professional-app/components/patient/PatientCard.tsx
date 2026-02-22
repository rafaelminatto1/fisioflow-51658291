import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PatientCardProps {
  name: string;
  condition: string;
  status: string;
  stats?: {
    sessionsCompleted: number;
    nextAppointment?: string;
  };
  onClick?: () => void;
}

export function PatientCard({ name, condition, status, stats, onClick }: PatientCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onClick} activeOpacity={0.7}>
      <View style={styles.header}>
        <View>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.condition}>{condition}</Text>
        </View>
        <View style={[styles.badge, status === 'Alta' ? styles.badgeSuccess : styles.badgeInfo]}>
          <Text style={[styles.badgeText, status === 'Alta' ? styles.textSuccess : styles.textInfo]}>
            {status}
          </Text>
        </View>
      </View>
      
      {stats && (
        <View style={styles.footer}>
          <View style={styles.stat}>
            <Ionicons name="checkmark-circle-outline" size={16} color="#6b7280" />
            <Text style={styles.statText}>{stats.sessionsCompleted} sessões</Text>
          </View>
          {stats.nextAppointment && (
            <View style={styles.stat}>
              <Ionicons name="calendar-outline" size={16} color="#6b7280" />
              <Text style={styles.statText}>Próx: {stats.nextAppointment}</Text>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  condition: {
    fontSize: 14,
    color: '#6b7280',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeInfo: {
    backgroundColor: '#eff6ff',
  },
  badgeSuccess: {
    backgroundColor: '#f0fdf4',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  textInfo: {
    color: '#3b82f6',
  },
  textSuccess: {
    color: '#22c55e',
  },
  footer: {
    flexDirection: 'row',
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 12,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 13,
    color: '#6b7280',
  },
});
