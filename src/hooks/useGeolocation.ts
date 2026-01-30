import { Geolocation, Position, PositionOptions } from '@capacitor/geolocation';
import { useCallback, useState } from 'react';

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude: number | null;
  altitudeAccuracy: number | null;
  heading: number | null;
  speed: number | null;
  timestamp: number;
}

export interface CheckInData extends LocationData {
  appointmentId?: string;
  checkedAt: string;
}

/**
 * Hook para geolocalização
 * @returns Estado e funções para obter e monitorar localização
 */
export function useGeolocation() {
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const defaultOptions: PositionOptions = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0,
  };

  /**
   * Obtém a localização atual do dispositivo
   * @returns Localização atual ou null em caso de erro
   */
  const getCurrentPosition = useCallback(async (options?: PositionOptions): Promise<LocationData | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const position: Position = await Geolocation.getCurrentPosition({
        ...defaultOptions,
        ...options,
      });

      const locationData: LocationData = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        altitude: position.coords.altitude ?? null,
        altitudeAccuracy: position.coords.altitudeAccuracy ?? null,
        heading: position.coords.heading ?? null,
        speed: position.coords.speed ?? null,
        timestamp: position.timestamp,
      };

      setCurrentLocation(locationData);
      setIsLoading(false);

      return locationData;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao obter localização';
      setError(errorMessage);
      setIsLoading(false);
      console.error('Erro ao obter localização:', err);
      return null;
    }
  }, [defaultOptions]);

  /**
   * Inicia o monitoramento contínuo de localização
   * @param callback Função chamada a cada atualização de localização
   * @returns ID do watcher para cancelar depois
   */
  const watchPosition = useCallback(
    (callback: (location: LocationData) => void) => {
      const watchId = Geolocation.watchPosition(
        { ...defaultOptions },
        (position, err) => {
          if (err) {
            console.error('Erro no monitoramento de localização:', err);
            setError(err.message || 'Erro no monitoramento');
            return;
          }

          if (position) {
            const locationData: LocationData = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              altitude: position.coords.altitude ?? null,
              altitudeAccuracy: position.coords.altitudeAccuracy ?? null,
              heading: position.coords.heading ?? null,
              speed: position.coords.speed ?? null,
              timestamp: position.timestamp,
            };

            setCurrentLocation(locationData);
            callback(locationData);
          }
        }
      );

      return watchId;
    },
    [defaultOptions]
  );

  /**
   * Para o monitoramento de localização
   * @param watchId ID retornado por watchPosition
   */
  const clearWatch = useCallback(async (watchId: string) => {
    try {
      await Geolocation.clearWatch({ id: watchId });
    } catch (error) {
      console.error('Erro ao parar monitoramento:', error);
    }
  }, []);

  return {
    currentLocation,
    isLoading,
    error,
    getCurrentPosition,
    watchPosition,
    clearWatch,
  };
}

/**
 * Hook para check-in de atendimentos usando GPS
 */
export function useCheckIn() {
  const { currentLocation, isLoading, getCurrentPosition } = useGeolocation();

  /**
   * Realiza check-in de um atendimento
   * @param appointmentId ID da consulta (opcional)
   * @returns Dados do check-in ou null em caso de erro
   */
  const performCheckIn = useCallback(async (appointmentId?: string): Promise<CheckInData | null> => {
    const location = await getCurrentPosition();

    if (!location) {
      return null;
    }

    const checkInData: CheckInData = {
      ...location,
      appointmentId,
      checkedAt: new Date(location.timestamp).toISOString(),
    };

    // TODO: Enviar para Supabase
    // await supabase.from('appointment_checkins').insert(checkInData);

    return checkInData;
  }, [getCurrentPosition]);

  return {
    currentLocation,
    isLoading,
    performCheckIn,
  };
}
