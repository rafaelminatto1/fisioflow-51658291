import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { getCurrentLocation, type LocationData } from '@/lib/geolocation';
import { config } from '@/lib/config';
import { authApi } from '@/lib/auth-api';

interface CheckInData {
  appointmentId: string;
  patientId: string;
  professionalId: string;
  location: LocationData;
  checkedAt: string;
}

export function useCheckIn() {
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [lastCheckIn, setLastCheckIn] = useState<CheckInData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const performCheckIn = useCallback(async (
    appointmentId: string,
    patientId: string,
    professionalId: string
  ): Promise<CheckInData | null> => {
    setIsCheckingIn(true);
    setError(null);

    try {
      // Get current location
      const location = await getCurrentLocation();
      if (!location) throw new Error('Não foi possível obter a localização');

      // Create check-in record
      const checkInData: CheckInData = {
        appointmentId,
        patientId,
        professionalId,
        location,
        checkedAt: new Date().toISOString(),
      };

      const token = await authApi.getToken();
      const response = await fetch(`${config.apiUrl}/api/appointments/${appointmentId}/check-in`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          patient_id: patientId,
          professional_id: professionalId,
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          checked_at: checkInData.checkedAt
        })
      });

      if (!response.ok) {
        throw new Error('Falha ao registrar check-in no servidor');
      }

      setLastCheckIn(checkInData);
      return checkInData;
    } catch (err: any) {
      const message = err.message || 'Não foi possível fazer check-in';
      setError(message);
      Alert.alert('Erro', message);
      return null;
    } finally {
      setIsCheckingIn(false);
    }
  }, []);

  const clearLastCheckIn = useCallback(() => {
    setLastCheckIn(null);
  }, []);

  return {
    isCheckingIn,
    lastCheckIn,
    error,
    performCheckIn,
    clearLastCheckIn,
  };
}
