/**
 * useLGPDConsents - Migrated to Neon/Workers
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { securityApi, type LGPDConsentRecord } from "@/lib/api/workers-client";
import { fisioLogger as logger } from "@/lib/errors/logger";

export type ConsentType =
	| "dados_pessoais"
	| "dados_sensiveis"
	| "comunicacao_marketing"
	| "compartilhamento_terceiros";

export type LGPDConsent = LGPDConsentRecord & {
	consent_type: ConsentType;
};

const CONSENT_VERSION = "1.0";

export function useLGPDConsents() {
	const queryClient = useQueryClient();
	const { user } = useAuth();

	const { data: consents, isLoading } = useQuery({
		queryKey: ["lgpd-consents"],
		queryFn: async () => {
			const response = await securityApi.lgpd.list();
			return (response?.data ?? []) as LGPDConsent[];
		},
		enabled: !!user,
	});

	const manageConsent = useMutation({
		mutationFn: async ({
			consentType,
			granted,
		}: {
			consentType: ConsentType;
			granted: boolean;
		}) => {
			const response = await securityApi.lgpd.update(consentType, {
				granted,
				version: CONSENT_VERSION,
			});
			return response.data as LGPDConsent | null;
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ["lgpd-consents"] });
			toast.success(
				variables.granted
					? "Consentimento concedido com sucesso"
					: "Consentimento revogado com sucesso",
			);
		},
		onError: (error) => {
			logger.error("Erro ao gerenciar consentimento", error, "useLGPDConsents");
			toast.error("Erro ao atualizar consentimento");
		},
	});

	const hasConsent = (consentType: ConsentType): boolean => {
		const consent = consents?.find((item) => item.consent_type === consentType);
		return consent?.granted ?? false;
	};

	return {
		consents: consents ?? [],
		isLoading,
		manageConsent: manageConsent.mutate,
		isManaging: manageConsent.isPending,
		hasConsent,
	};
}
