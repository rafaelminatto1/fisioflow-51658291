/**
 * useMFASettings - Migrated to Neon/Workers
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { fisioLogger as logger } from '@/lib/errors/logger';
import { securityApi, type MFASettingsRecord } from '@/lib/api/workers-client';

export type MFAMethod = 'totp' | 'sms' | 'email';
export type MFASettings = MFASettingsRecord;

export function useMFASettings() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['mfa-settings'],
    queryFn: async () => (await securityApi.mfa.getSettings()).data,
  });

  const enableMFA = useMutation({
    mutationFn: async (method: MFAMethod) => {
      const result = await securityApi.mfa.enable(method);
      return { settings: result.data, backupCodes: result.backupCodes };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mfa-settings'] });
      toast.success('MFA ativado com sucesso! Guarde seus códigos de backup.');
    },
    onError: (error) => {
      logger.error('Erro ao ativar MFA', error, 'useMFASettings');
      toast.error('Erro ao ativar autenticação de dois fatores');
    },
  });

  const disableMFA = useMutation({
    mutationFn: async () => {
      await securityApi.mfa.disable();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mfa-settings'] });
      toast.success('MFA desativado');
    },
    onError: (error) => {
      logger.error('Erro ao desativar MFA', error, 'useMFASettings');
      toast.error('Erro ao desativar autenticação de dois fatores');
    },
  });

  const sendOTP = useMutation({
    mutationFn: async () => {
      const result = await securityApi.mfa.sendOtp();
      return result.data;
    },
    onSuccess: (result) => {
      if (result?.success) {
        toast.success('Código enviado para seu email');
        if (result.debugCode) {
          toast.info(`Código de teste: ${result.debugCode}`);
        }
      }
    },
    onError: (error) => {
      logger.error('Erro ao enviar OTP', error, 'useMFASettings');
      toast.error('Erro ao enviar código de verificação');
    },
  });

  const verifyOTP = useMutation({
    mutationFn: async (code: string) => {
      const result = await securityApi.mfa.verifyOtp(code);
      return result.data.verified;
    },
    onSuccess: () => {
      toast.success('Código verificado com sucesso');
    },
    onError: (error) => {
      logger.error('Erro ao verificar OTP', error, 'useMFASettings');
      toast.error('Código inválido ou expirado');
    },
  });

  return {
    settings,
    isLoading,
    isMFAEnabled: settings?.mfa_enabled ?? false,
    enableMFA: enableMFA.mutateAsync,
    disableMFA: disableMFA.mutate,
    sendOTP: sendOTP.mutateAsync,
    verifyOTP: verifyOTP.mutateAsync,
    isEnabling: enableMFA.isPending,
    isDisabling: disableMFA.isPending,
    isSendingOTP: sendOTP.isPending,
    isVerifyingOTP: verifyOTP.isPending,
  };
}
