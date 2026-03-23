/**
 * DICOM Web Client - Migrated to Workers/Neon
 */

import { dicomApi, type DicomStudyRecord } from "@/api/v2";
import { fisioLogger as logger } from "@/lib/errors/logger";
import { trackTransferSyntax } from "@/components/analysis/dicom/transferSyntaxTracker";

function extractTransferSyntaxes(
	entries: Array<Record<string, { Value?: string[] }>>,
): string[] {
	if (!Array.isArray(entries)) return [];
	const set = new Set<string>();
	for (const entry of entries) {
		const syntax = entry["00020010"]?.Value?.[0];
		if (syntax) {
			set.add(syntax);
		}
	}
	return Array.from(set);
}

export interface DicomStudy extends DicomStudyRecord {
	"0020000D"?: { Value: string[] };
	"00080020"?: { Value: string[] };
	"00081030"?: { Value: string[] };
	"00100010"?: { Value: Array<{ Alphabetic: string }> };
	"00100020"?: { Value: string[] };
}

export const dicomWebClient = {
	searchStudies: async (
		filters: Record<string, string> = {},
	): Promise<DicomStudy[]> => {
		try {
			const { data } = await dicomApi.studies({
				...filters,
				limit: filters.limit || "20",
			});
			return data as DicomStudy[];
		} catch (error) {
			logger.error(
				"[dicomWebClient] searchStudies error",
				error,
				"dicomWebClient",
			);
			throw error;
		}
	},

	searchSeries: async (
		studyUid: string,
	): Promise<Record<string, unknown>[]> => {
		try {
			const { data } = await dicomApi.series(studyUid);
			return data as Record<string, unknown>[];
		} catch (error) {
			logger.error(
				"[dicomWebClient] searchSeries error",
				error,
				"dicomWebClient",
			);
			throw error;
		}
	},

	getInstances: async (
		studyUid: string,
		seriesUid: string,
	): Promise<Array<Record<string, { Value?: string[] }>>> => {
		try {
			const { data } = await dicomApi.instances(studyUid, seriesUid);
			const transfers = extractTransferSyntaxes(data as Array<Record<string, { Value?: string[] }>>);
			transfers.forEach((syntax) => trackTransferSyntax(syntax));
			return data as Array<Record<string, { Value?: string[] }>>;
		} catch (error) {
			logger.error(
				"[dicomWebClient] getInstances error",
				error,
				"dicomWebClient",
			);
			throw error;
		}
	},

	getProxyUrl: (): string => dicomApi.getWadoUrl(),

	storeInstances: async (files: File[]) => {
		try {
			const payloads = await Promise.all(
				files.map(
					(file) =>
						new Promise<{ body: string; fileName: string }>(
							(resolve, reject) => {
								const reader = new FileReader();
								reader.onload = () => {
									const result = reader.result as string;
									resolve({
										body: result.split(",")[1] || result,
										fileName: file.name,
									});
								};
								reader.onerror = reject;
								reader.readAsDataURL(file);
							},
						),
				),
			);

			const responses = await dicomApi.uploadInstances(payloads);
			return responses.map((response, index) => ({
				file: files[index].name,
				success: true,
				data: response.data,
			}));
		} catch (error) {
			logger.error(
				"[dicomWebClient] storeInstances error",
				error,
				"dicomWebClient",
			);
			throw error;
		}
	},
};
