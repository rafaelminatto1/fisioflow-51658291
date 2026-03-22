/**
 * useGoogleDocs - Hook para integração com Google Docs via Workers API
 */

import { useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { integrationsApi } from "@/api/v2";

export const CLINICAL_REPORT_PLACEHOLDERS = {
	PACIENTE_NOME: "Nome completo do paciente",
	PACIENTE_CPF: "CPF do paciente",
	PACIENTE_DATA_NASCIMENTO: "Data de nascimento",
	QUEIXA_PRINCIPAL: "Queixa principal",
	DIAGNOSTICO: "Diagnóstico",
	PLANO_TRATAMENTO: "Plano de tratamento",
};

export const CERTIFICATE_PLACEHOLDERS = {
	PACIENTE_NOME: "Nome do paciente",
	CERTIFICADO_TIPO: "Tipo de certificado",
	PERIODO_INICIO: "Início",
	PERIODO_FIM: "Fim",
};

export const DECLARATION_PLACEHOLDERS = {
	PACIENTE_NOME: "Nome do paciente",
	DATA_ATENDIMENTO: "Data",
	HORARIO_ATENDIMENTO: "Horário",
};

export function useGoogleDocs() {
	const queryClient = useQueryClient();

	const listTemplates = useCallback(async (folderId?: string) => {
		const result = await integrationsApi.google.docs.listTemplates(folderId);
		return result.data || [];
	}, []);

	const generateReport = useMutation({
		mutationFn: async ({
			templateId,
			patientName,
			data,
			folderId,
		}: {
			templateId: string;
			patientName: string;
			data: Record<string, string>;
			folderId?: string;
		}) => {
			const result = await integrationsApi.google.docs.generateReport({
				templateId,
				patientName,
				data,
				folderId,
			});
			return result.data;
		},
		onSuccess: (data) => {
			if (data?.success) {
				toast.success("Relatório gerado com sucesso!");
				queryClient.invalidateQueries({ queryKey: ["drive-files"] });
			}
		},
		onError: (error) => {
			console.error("Erro ao gerar relatório:", error);
			toast.error("Erro ao gerar relatório. Verifique a integração do Google.");
		},
	});

	const createPatientFolder = useMutation({
		mutationFn: async ({
			name,
			parentId,
		}: {
			name: string;
			parentId?: string;
		}) => {
			const result = await integrationsApi.google.drive.createFolder({
				name,
				parentId,
			});
			return result.data;
		},
		onSuccess: () => {
			toast.success("Pasta do paciente criada no Google Drive");
			queryClient.invalidateQueries({ queryKey: ["drive-files"] });
		},
	});

	return {
		listTemplates,
		generateReport: generateReport.mutate,
		isGenerating: generateReport.isPending,
		createPatientFolder: createPatientFolder.mutate,
		isCreatingFolder: createPatientFolder.isPending,
		CLINICAL_REPORT_PLACEHOLDERS,
		CERTIFICATE_PLACEHOLDERS,
		DECLARATION_PLACEHOLDERS,
	};
}

export default useGoogleDocs;
