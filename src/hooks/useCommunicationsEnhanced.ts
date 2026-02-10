/**
 * Hook: useCommunicationsEnhanced
 * Wrapper para comunicação automatizada com pacientes usando skills integration
 */

import { useState, useCallback } from 'react';
import {
  PatientCommunicationService,
} from '../lib/skills/fase4-conteudo/patient-communication';

interface UseCommunicationsEnhancedOptions {
  onError?: (error: Error) => void;
  onSuccess?: () => void;
}

export function useCommunicationsEnhanced(options?: UseCommunicationsEnhancedOptions) {
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const service = PatientCommunicationService.create();

  const sendExerciseReminder = useCallback(
    async (
      data: {
        patientName: string;
        patientPhone: string;
        exercises: Array<{
          name: string;
          sets: number;
          reps: string;
          observations?: string;
        }>;
        frequency: 'daily' | 'weekly';
      }
    ) => {
      setIsSending(true);
      setError(null);

      try {
        await service.sendExerciseReminder(data);

        if (options?.onSuccess) {
          options.onSuccess();
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Erro ao enviar lembrete');
        setError(error);
        if (options?.onError) {
          options.onError(error);
        }
      } finally {
        setIsSending(false);
      }
    },
    [options]
  );

  const sendSatisfactionSurvey = useCallback(
    async (
      survey: {
        patientName: string;
        patientPhone: string;
        appointmentDate: Date;
        professionalName: string;
        clinicName: string;
      }
    ) => {
      setIsSending(true);
      setError(null);

      try {
        await service.sendSatisfactionSurvey(survey);

        if (options?.onSuccess) {
          options.onSuccess();
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Erro ao enviar pesquisa');
        setError(error);
        if (options?.onError) {
          options.onError(error);
        }
      } finally {
        setIsSending(false);
      }
    },
    [options]
  );

  const sendReactivationMessage = useCallback(
    async (
      patient: {
        name: string;
        phone: string;
        lastAppointment: Date;
        clinicName: string;
      }
    ) => {
      setIsSending(true);
      setError(null);

      try {
        await service.sendReactivationMessage(patient);

        if (options?.onSuccess) {
          options.onSuccess();
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Erro ao enviar mensagem');
        setError(error);
        if (options?.onError) {
          options.onError(error);
        }
      } finally {
        setIsSending(false);
      }
    },
    [options]
  );

  const sendBirthdayMessage = useCallback(
    async (
      patient: {
        name: string;
        phone: string;
        clinicName: string;
      }
    ) => {
      setIsSending(true);
      setError(null);

      try {
        await service.sendBirthdayMessage(patient);

        if (options?.onSuccess) {
          options.onSuccess();
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Erro enviar mensagem de aniversário');
        setError(error);
        if (options?.onError) {
          options.onError(error);
        }
      } finally {
        setIsSending(false);
      }
    },
    [options]
  );

  const sendCampaign = useCallback(
    async (
      campaign: {
        message: string;
        patients: Array<{ name: string; phone: string }>;
      }
    ) => {
      setIsSending(true);
      setError(null);

      try {
        const result = await service.sendCampaign(
          {
            name: 'Campanha Personalizada',
            targetAudience: {},
            message: campaign.message,
          },
          campaign.patients
        );

        if (options?.onSuccess) {
          options.onSuccess();
        }

        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Erro ao enviar campanha');
        setError(error);
        if (options?.onError) {
          options.onError(error);
        }
        return { sent: 0, failed: 0 };
      } finally {
        setIsSending(false);
      }
    },
    [options]
  );

  const sendAppointmentReminder = useCallback(
    async (
      appointment: {
        patientName: string;
        patientPhone: string;
        date: Date;
        time: string;
        professionalName: string;
        type: string;
      }
    ) => {
      setIsSending(true);
      setError(null);

      try {
        await service.sendAppointmentReminder(appointment);

        if (options?.onSuccess) {
          options.onSuccess();
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Erro ao enviar lembrete');
        setError(error);
        if (options?.onError) {
          options.onError(error);
        }
      } finally {
        setIsSending(false);
      }
    },
    [options]
  );

  const sendAppointmentConfirmation = useCallback(
    async (
      appointment: {
        patientName: string;
        patientPhone: string;
        date: Date;
        time: string;
        professionalName: string;
        type: string;
        location?: string;
      }
    ) => {
      setIsSending(true);
      setError(null);

      try {
        await service.sendAppointmentConfirmation(appointment);

        if (options?.onSuccess) {
          options.onSuccess();
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Erro ao enviar confirmação');
        setError(error);
        if (options?.onError) {
          options.onError(error);
        }
      } finally {
        setIsSending(false);
      }
    },
    [options]
  );

  // Templates de mensagem pré-definidos
  const getTemplates = useCallback(() => {
    return PatientCommunicationService.getPredefinedCampaigns();
  }, []);

  const validatePhoneNumber = useCallback((phone: string) => {
    return PatientCommunicationService.validatePhoneNumber(phone);
  }, []);

  const canSendMessage = useCallback((date?: Date) => {
    return PatientCommunicationService.canSendMessage(date);
  }, []);

  return {
    isSending,
    error,
    sendExerciseReminder,
    sendSatisfactionSurvey,
    sendReactivationMessage,
    sendBirthdayMessage,
    sendCampaign,
    sendAppointmentReminder,
    sendAppointmentConfirmation,
    getTemplates,
    validatePhoneNumber,
    canSendMessage,
  };
}
