import { useState, useCallback } from "react";
import { Alert } from "react-native";
import { fetchApi } from "@/lib/api";

interface CheckInData {
  appointmentId: string;
  patientId: string;
  professionalId: string;
  checkedAt: string;
}

export function useCheckIn() {
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [lastCheckIn, setLastCheckIn] = useState<CheckInData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const performCheckIn = useCallback(
    async (
      appointmentId: string,
      patientId: string,
      professionalId: string,
    ): Promise<CheckInData | null> => {
      setIsCheckingIn(true);
      setError(null);

      try {
        // Check-in é confirmação de presença: `PATCH /api/appointments/:id` com
        // status `presenca_confirmada`. A rota antiga (`POST .../check-in`) nunca
        // existiu, então nenhum check-in jamais chegou ao servidor.
        //
        // A geolocalização deixou de ser coletada: não há coluna que a armazene
        // nem validação que a use, então era pedir permissão de localização ao
        // profissional em troca de nada. Se um dia houver cerca geográfica, isso
        // volta junto com a coluna e a regra que a valida.
        const checkInData: CheckInData = {
          appointmentId,
          patientId,
          professionalId,
          checkedAt: new Date().toISOString(),
        };

        await fetchApi(`/api/appointments/${encodeURIComponent(appointmentId)}`, {
          method: "PATCH",
          data: { status: "presenca_confirmada" },
        });

        setLastCheckIn(checkInData);
        return checkInData;
      } catch (err: any) {
        const message = err.message || "Não foi possível fazer check-in";
        setError(message);
        Alert.alert("Erro", message);
        return null;
      } finally {
        setIsCheckingIn(false);
      }
    },
    [],
  );

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
