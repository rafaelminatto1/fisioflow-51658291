import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';

export interface PatientCardProps {
  name: string;
  condition?: string;
  status: string;
  lastVisit?: string;
  avatarUrl?: string;
  onClick?: () => void;
  actions?: React.ReactNode;
  stats?: {
    sessionsCompleted: number;
    nextAppointment?: string;
  };
  variant?: 'default' | 'compact';
  className?: string;
  style?: ViewStyle;
}

export const PatientCard = React.forwardRef<View, PatientCardProps>(
  ({ name, condition, status, stats, onClick, style }, ref) => {
    
    // Simple status mapping for native
    const getStatusColor = (s: string) => {
      switch(s) {
        case 'Em Tratamento': return '#dcfce7'; // green-100
        case 'Alta': return '#dbeafe'; // blue-100
        case 'Inativo': return '#f3f4f6'; // gray-100
        default: return '#f3f4f6';
      }
    };

    const getStatusTextColor = (s: string) => {
      switch(s) {
        case 'Em Tratamento': return '#166534'; // green-700
        case 'Alta': return '#1e40af'; // blue-700
        case 'Inativo': return '#374151'; // gray-700
        default: return '#374151';
      }
    };

    return (
      <TouchableOpacity onPress={onClick} activeOpacity={0.7}>
        <View ref={ref} style={[styles.card, style]}>
          <View style={styles.header}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.info}>
              <Text style={styles.name}>{name}</Text>
              {condition && <Text style={styles.condition}>{condition}</Text>}
              
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(status) }]}>
                <Text style={[styles.statusText, { color: getStatusTextColor(status) }]}>
                  {status}
                </Text>
              </View>
            </View>
          </View>

          {stats && (
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Sessões</Text>
                <Text style={styles.statValue}>{stats.sessionsCompleted}</Text>
              </View>
              {stats.nextAppointment && (
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Próx. Visita</Text>
                  <Text style={styles.statValue}>{stats.nextAppointment}</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  }
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    // Shadow for Android
    elevation: 3,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2563eb',
  },
  info: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  condition: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
    lineHeight: 20,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999, // Pill shape
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statsContainer: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  statItem: {
    flex: 1,
    alignItems: 'center', // Center align for cleaner look
  },
  statLabel: {
    fontSize: 11,
    color: '#9ca3af',
    marginBottom: 4,
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
  },
});

PatientCard.displayName = 'PatientCard';
