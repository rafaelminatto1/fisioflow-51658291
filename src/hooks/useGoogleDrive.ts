/**
 * useGoogleDrive - Hook para integração com Google Drive via Workers API
 */

import { useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { integrationsApi } from "@/api/v2";

export function useGoogleDrive() {
	const queryClient = useQueryClient();

	const listFiles = useCallback(async (folderId?: string) => {
		const result = await integrationsApi.google.drive.listFiles(folderId);
		return result.data || [];
	}, []);

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
			toast.success("Pasta criada no Google Drive");
			queryClient.invalidateQueries({ queryKey: ["drive-files"] });
		},
		onError: (error) => {
			console.error("Erro ao criar pasta:", error);
			toast.error("Erro ao criar pasta no Google Drive");
		},
	});

	return {
		listFiles,
		createPatientFolder: createPatientFolder.mutate,
		isCreatingFolder: createPatientFolder.isPending,
	};
}

export default useGoogleDrive;
