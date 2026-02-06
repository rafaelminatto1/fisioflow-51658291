/**
 * Hook for managing marketing LGPD consent
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

  checkMarketingConsent,
  getPatientConsent,
  setMarketingConsent,
  revokeMarketingConsent,
  type MarketingConsent,
} from '@/services/marketing/marketingService';

export function useMarketingConsent(patientId: string) {
  const queryClient = useQueryClient();

  // Check if patient has any consent
  const hasConsentQuery = useQuery({
    queryKey: ['marketing-consent', patientId],
    queryFn: () => checkMarketingConsent(patientId, 'any'),
    enabled: !!patientId,
  });

  // Get full consent details
  const consentDetailsQuery = useQuery({
    queryKey: ['marketing-consent-details', patientId],
    queryFn: () => getPatientConsent(patientId),
    enabled: !!patientId,
  });

  // Set consent mutation
  const setConsentMutation = useMutation({
    mutationFn: (data: {
      organizationId: string;
      consentData: Omit<MarketingConsent, 'patient_id' | 'organization_id' | 'signed_at'>;
    }) => setMarketingConsent(patientId, data.organizationId, data.consentData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-consent', patientId] });
      queryClient.invalidateQueries({ queryKey: ['marketing-consent-details', patientId] });
      toast.success('Consentimento de marketing salvo com sucesso');
    },
    onError: (error) => {
      console.error('Error setting consent:', error);
      toast.error('Erro ao salvar consentimento');
    },
  });

  // Revoke consent mutation
  const revokeConsentMutation = useMutation({
    mutationFn: () => revokeMarketingConsent(patientId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-consent', patientId] });
      queryClient.invalidateQueries({ queryKey: ['marketing-consent-details', patientId] });
      toast.success('Consentimento revogado com sucesso');
    },
    onError: (error) => {
      console.error('Error revoking consent:', error);
      toast.error('Erro ao revogar consentimento');
    },
  });

  return {
    hasConsent: hasConsentQuery.data ?? false,
    consentDetails: consentDetailsQuery.data,
    isLoading: hasConsentQuery.isLoading || consentDetailsQuery.isLoading,
    isError: hasConsentQuery.isError || consentDetailsQuery.isError,

    setConsent: setConsentMutation.mutate,
    setConsentAsync: setConsentMutation.mutateAsync,
    isSettingConsent: setConsentMutation.isPending,

    revokeConsent: revokeConsentMutation.mutate,
    revokeConsentAsync: revokeConsentMutation.mutateAsync,
    isRevokingConsent: revokeConsentMutation.isPending,
  };
}

export function useCheckMarketingConsent() {
  return useMutation({
    mutationFn: ({ patientId, type }: { patientId: string; type?: 'social_media' | 'educational_material' | 'website' | 'any' }) =>
      checkMarketingConsent(patientId, type),
  });
}
