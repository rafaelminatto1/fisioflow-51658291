import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface AppointmentCardProps {
  patientName: string;
  time: string;
  endTime?: string;
  type?: string;
  status?: string;
  isDragging?: boolean;
  isSaving?: boolean;
  isDropTarget?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
  statusConfig?: {
    color?: string;
    bgColor?: string;
    borderColor?: string;
    icon?: any;
    label?: string;
  };
  compact?: boolean;
  style?: any;
}

const getStatusColor = (status: string = 'default') => {
  const normalized = status.toLowerCase();
  switch (normalized) {
    case 'confirmado': return '#10b981'; // emerald-500
    case 'agendado': return '#0ea5e9'; // sky-500
    case 'concluido': return '#a855f7'; // purple-500
    case 'cancelado': return '#ef4444'; // red-500
    case 'falta': return '#f43f5e'; // rose-500
    case 'em_andamento': return '#06b6d4'; // cyan-500
    default: return '#64748b'; // slate-500
  }
};

const getStatusBg = (status: string = 'default') => {
  const normalized = status.toLowerCase();
  switch (normalized) {
    case 'confirmado': return '#ecfdf5'; // emerald-50
    case 'agendado': return '#f0f9ff'; // sky-50
    case 'concluido': return '#faf5ff'; // purple-50
    case 'cancelado': return '#fef2f2'; // red-50
    case 'falta': return '#fff1f2'; // rose-50
    case 'em_andamento': return '#ecfeff'; // cyan-50
    default: return '#f8fafc'; // slate-50
  }
};

export const AppointmentCard = React.forwardRef<View, AppointmentCardProps>(
  ({ 
    patientName, 
    time, 
    endTime, 
    type, 
    status = 'agendado', 
    isDragging, 
    isSaving, 
    isDropTarget, 
    isSelected,
    onClick, 
    statusConfig,
    compact = false,
    style,
    ...props 
  }, ref) => {
    
    const color = statusConfig?.color || getStatusColor(status);
    const bgColor = statusConfig?.bgColor || getStatusBg(status);

    return (
      <TouchableOpacity
        ref={ref}
        onPress={onClick}
        activeOpacity={0.7}
        style={[
          styles.card,
          { backgroundColor: bgColor, borderColor: color + '40' },
          isDragging && styles.dragging,
          isSaving && styles.saving,
          isSelected && { borderColor: color, borderWidth: 2 },
          compact ? styles.compact : styles.normal,
          style
        ]}
        {...props}
      >
        {/* Status Strip */}
        <View style={[styles.statusStrip, { backgroundColor: color }]} />

        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.timeContainer}>
              <Text style={[styles.timeText, { color: color }]}>
                {time}
                {endTime && !compact && <Text style={styles.endTimeText}> - {endTime}</Text>}
              </Text>
            </View>
            
            {!compact && (
              <Ionicons name="checkmark-circle-outline" size={14} color={color} />
            )}
          </View>

          <Text style={[styles.patientName, { color: '#0f172a' }]} numberOfLines={1}>
            {patientName}
          </Text>

          {!compact && type && (
            <Text style={[styles.typeText, { color: '#64748b' }]} numberOfLines={1}>
              {type}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  }
);

AppointmentCard.displayName = 'AppointmentCard';

const styles = StyleSheet.create({
  card: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 8,
    flexDirection: 'row',
  },
  compact: {
    padding: 4,
    paddingLeft: 8,
  },
  normal: {
    padding: 8,
    paddingLeft: 12,
  },
  statusStrip: {
    width: 4,
    height: '100%',
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  content: {
    flex: 1,
    marginLeft: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  endTimeText: {
    fontSize: 12,
    fontWeight: '400',
    opacity: 0.8,
  },
  patientName: {
    fontSize: 14,
    fontWeight: '600',
  },
  typeText: {
    fontSize: 11,
    marginTop: 2,
  },
  dragging: {
    opacity: 0.5,
    transform: [{ scale: 0.95 }],
  },
  saving: {
    opacity: 0.8,
  },
});
