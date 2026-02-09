import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColorScheme';
import { useHaptics } from '@/hooks/useHaptics';
import { useCheckIn } from '@/hooks/useCheckIn';
import { useAuthStore } from '@/store/auth';

interface CheckInButtonProps {
  appointmentId: string;
  patientId: string;
  appointmentDate: Date;
  onCheckedIn?: (checkInData: any) => void;
}

interface CheckInStatus {
  hasCheckedIn: boolean;
  canCheckIn: boolean;
  distanceFromClinic?: number;
}

export function CheckInButton({
  appointmentId,
  patientId,
  appointmentDate,
  onCheckedIn,
}: CheckInButtonProps) {
  const colors = useColors();
  const { light, medium, success } = useHaptics();
  const { user } = useAuthStore();
  const { isCheckingIn, performCheckIn, lastCheckIn, error } = useCheckIn();

  const [status, setStatus] = useState<CheckInStatus>({
    hasCheckedIn: false,
    canCheckIn: true,
  });

  // Verificar se já fez check-in para este agendamento
  useEffect(() => {
    // TODO: Buscar check-ins existentes do Firestore
    // Por enquanto, usamos o estado local lastCheckIn
    if (lastCheckIn?.appointmentId === appointmentId) {
      setStatus({
        hasCheckedIn: true,
        canCheckIn: false,
      });
    }

    // Verificar se o agendamento é hoje (dentro de uma janela de 2 horas)
    const now = new Date();
    const appointmentTime = new Date(appointmentDate);
    const timeDiff = appointmentTime.getTime() - now.getTime();
    const twoHoursInMs = 2 * 60 * 60 * 1000;

    // Só permite check-in se faltar menos de 2 horas para o agendamento
    // ou se já passou o horário (dentro de 1 hora depois)
    const isValidWindow = timeDiff > 0 && timeDiff < twoHoursInMs;
    const isAfterButRecent = timeDiff < 0 && Math.abs(timeDiff) < 60 * 60 * 1000;

    setStatus(prev => ({
      ...prev,
      canCheckIn: (isValidWindow || isAfterButRecent) && !status.hasCheckedIn,
    }));
  }, [appointmentDate, lastCheckIn, appointmentId]);

  const handlePress = async () => {
    if (!user?.id || !status.canCheckIn) return;

    medium();

    try {
      const result = await performCheckIn(appointmentId, patientId, user.id);

      if (result) {
        success();
        setStatus({
          hasCheckedIn: true,
          canCheckIn: false,
        });
        onCheckedIn?.(result);
      }
    } catch (err) {
      // Error handled in hook
    }
  };

  if (!status.canCheckIn && status.hasCheckedIn) {
    return (
      <View style={[styles.container, { backgroundColor: colors.success + '20', borderColor: colors.success }]}>
        <Ionicons name="checkmark-circle" size={20} color={colors.success} />
        <Text style={[styles.text, { color: colors.success }]}>Check-in realizado</Text>
      </View>
    );
  }

  if (!status.canCheckIn) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="time" size={20} color={colors.textSecondary} />
        <Text style={[styles.text, { color: colors.textSecondary }]}>Aguardando horário</Text>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}
      onPress={handlePress}
      disabled={isCheckingIn}
    >
      {isCheckingIn ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <>
          <Ionicons name="location" size={20} color={colors.primary} />
          <Text style={[styles.text, { color: colors.primary }]}>
            {status.distanceFromClinic ? `Check-in (${status.distanceFromClinic}m)` : 'Fazer check-in'}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
  },
});
