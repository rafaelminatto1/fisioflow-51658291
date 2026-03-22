/**
 * Marketing Service — Migrado para Workers/Neon + R2
 */
import { fisioLogger as logger } from "@/lib/errors/logger";
import {
	marketingApi,
	patientsApi,
	type BirthdayAutomationConfigRecord,
	type FisioLinkConfigRecord,
	type MarketingConsentRecord,
	type MarketingExportRecord,
	type RecallCampaignRecord,
	type ReferralCodeRecord,
	type ReviewAutomationConfigRecord,
} from "@/api/v2";
import { uploadToR2, deleteFromR2 } from "@/lib/storage/r2-storage";

export type MarketingConsent = MarketingConsentRecord;

export interface MarketingExportParams {
	patientId: string;
	organizationId: string;
	assetAId?: string;
	assetBId?: string;
	metrics: string[];
	isAnonymized: boolean;
	exportType?:
		| "video_comparison"
		| "before_after"
		| "timelapse"
		| "certificate";
}

export type ReviewAutomationConfig = ReviewAutomationConfigRecord;
export type RecallCampaign = RecallCampaignRecord;
export type ReferralCode = ReferralCodeRecord;
export type FisioLinkConfig = FisioLinkConfigRecord;
export type BirthdayAutomationConfig = BirthdayAutomationConfigRecord;

const DEFAULT_REVIEW_MESSAGE =
	"Olá {nome}! Esperamos que esteja ótimo. Gostaríamos de saber sua opinião sobre nosso atendimento: {review_link}";

const DEFAULT_BIRTHDAY_MESSAGE =
	"Olá {nome}! Desejamos um feliz aniversário! 🎉";

export const checkMarketingConsent = async (
	patientId: string,
	consentType:
		| "social_media"
		| "educational_material"
		| "website"
		| "any" = "any",
): Promise<boolean> => {
	logger.info(
		`[MarketingService] Checking consent for patient ${patientId}`,
		{ patientId, consentType },
		"marketingService",
	);
	try {
		const consent = (await marketingApi.consents.get(patientId)).data;
		if (!consent || !consent.is_active) return false;
		if (
			consent.expires_at &&
			new Date(consent.expires_at).getTime() < Date.now()
		)
			return false;
		if (consentType === "any") {
			return (
				consent.social_media || consent.educational_material || consent.website
			);
		}
		return Boolean(consent[consentType]);
	} catch (error) {
		logger.error(
			"[MarketingService] Error checking consent",
			error,
			"marketingService",
		);
		return false;
	}
};

export const getPatientConsent = async (
	patientId: string,
): Promise<MarketingConsent | null> => {
	try {
		return (await marketingApi.consents.get(patientId)).data;
	} catch (error) {
		logger.error(
			"[MarketingService] Error getting patient consent",
			error,
			"marketingService",
		);
		return null;
	}
};

export const setMarketingConsent = async (
	patientId: string,
	organizationId: string,
	consentData: Omit<
		MarketingConsent,
		"patient_id" | "organization_id" | "signed_at"
	>,
): Promise<void> => {
	try {
		await marketingApi.consents.upsert(patientId, {
			...consentData,
			organization_id: organizationId,
			signed_at: new Date().toISOString(),
		});
		logger.info(
			"[MarketingService] Marketing consent updated",
			{ patientId },
			"marketingService",
		);
	} catch (error) {
		logger.error(
			"[MarketingService] Error setting consent",
			error,
			"marketingService",
		);
		throw error;
	}
};

export const revokeMarketingConsent = async (
	patientId: string,
): Promise<void> => {
	try {
		await marketingApi.consents.revoke(patientId);
		logger.info(
			"[MarketingService] Marketing consent revoked",
			{ patientId },
			"marketingService",
		);
	} catch (error) {
		logger.error(
			"[MarketingService] Error revoking consent",
			error,
			"marketingService",
		);
		throw error;
	}
};

export const createMarketingExportRecord = async (
	params: MarketingExportParams,
	blob: Blob,
	fileName?: string,
): Promise<{ success: boolean; url: string; id?: string; error?: string }> => {
	logger.info(
		"[MarketingService] Creating export record",
		{ params },
		"marketingService",
	);

	try {
		const hasConsent = await checkMarketingConsent(
			params.patientId,
			"social_media",
		);
		if (!hasConsent && !params.isAnonymized) {
			return {
				success: false,
				url: "",
				error:
					"Paciente não possui consentimento de marketing para esta exportação",
			};
		}

		const finalFileName =
			fileName || `marketing_${params.patientId}_${Date.now()}.mp4`;
		const file = new File([blob], finalFileName, {
			type: blob.type || "video/mp4",
		});
		const upload = await uploadToR2(
			file,
			`marketing-exports/${params.organizationId}`,
		);

		const record = (
			await marketingApi.exports.create({
				patient_id: params.patientId,
				export_type: params.exportType || "video_comparison",
				file_path: upload.path,
				file_url: upload.url,
				is_anonymized: params.isAnonymized,
				metrics_overlay: params.metrics,
				asset_a_id: params.assetAId,
				asset_b_id: params.assetBId,
			})
		).data;

		logger.info(
			"[MarketingService] Export record created",
			{ id: record.id },
			"marketingService",
		);
		return { success: true, url: upload.url, id: record.id };
	} catch (error) {
		logger.error(
			"[MarketingService] Error creating export record",
			error,
			"marketingService",
		);
		return {
			success: false,
			url: "",
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
};

export const deleteMarketingExport = async (
	exportId: string,
): Promise<void> => {
	try {
		const result = await marketingApi.exports.delete(exportId);
		if (result.data?.file_path) {
			await deleteFromR2(result.data.file_path).catch((err) => {
				logger.warn(
					"[MarketingService] Could not delete file from R2",
					err,
					"marketingService",
				);
			});
		}
	} catch (error) {
		logger.error(
			"[MarketingService] Error deleting export",
			error,
			"marketingService",
		);
		throw error;
	}
};

export const getPatientMarketingExports = async (
	patientId: string,
): Promise<MarketingExportRecord[]> => {
	try {
		return (await marketingApi.exports.list({ patientId })).data ?? [];
	} catch (error) {
		logger.error(
			"[MarketingService] Error getting exports",
			error,
			"marketingService",
		);
		return [];
	}
};

export const getOrganizationMarketingExports = async (): Promise<
	MarketingExportRecord[]
> => {
	try {
		return (await marketingApi.exports.list()).data ?? [];
	} catch (error) {
		logger.error(
			"[MarketingService] Error getting organization exports",
			error,
			"marketingService",
		);
		return [];
	}
};

export const getReviewAutomationConfig =
	async (): Promise<ReviewAutomationConfig | null> => {
		try {
			return (await marketingApi.reviewConfig.get()).data ?? null;
		} catch (error) {
			logger.error(
				"[MarketingService] Error getting review config",
				error,
				"marketingService",
			);
			return {
				organization_id: "",
				enabled: false,
				trigger_status: ["alta", "concluido"],
				message_template: DEFAULT_REVIEW_MESSAGE,
				delay_hours: 24,
			};
		}
	};

export const updateReviewAutomationConfig = async (
	_organizationId: string,
	config: Partial<ReviewAutomationConfig>,
): Promise<void> => {
	try {
		await marketingApi.reviewConfig.update(config);
	} catch (error) {
		logger.error(
			"[MarketingService] Error updating review config",
			error,
			"marketingService",
		);
		throw error;
	}
};

export const getRecallCampaigns = async (
	_organizationId: string,
): Promise<RecallCampaign[]> => {
	try {
		return (await marketingApi.recallCampaigns.list()).data ?? [];
	} catch (error) {
		logger.error(
			"[MarketingService] Error getting recall campaigns",
			error,
			"marketingService",
		);
		return [];
	}
};

export const createRecallCampaign = async (
	campaign: Omit<RecallCampaign, "id" | "organization_id" | "created_at">,
	_organizationId: string,
): Promise<string> => {
	try {
		const created = (await marketingApi.recallCampaigns.create(campaign)).data;
		return created.id;
	} catch (error) {
		logger.error(
			"[MarketingService] Error creating recall campaign",
			error,
			"marketingService",
		);
		throw error;
	}
};

export const updateRecallCampaign = async (
	campaignId: string,
	updates: Partial<RecallCampaign>,
): Promise<void> => {
	try {
		await marketingApi.recallCampaigns.update(campaignId, updates);
	} catch (error) {
		logger.error(
			"[MarketingService] Error updating recall campaign",
			error,
			"marketingService",
		);
		throw error;
	}
};

export const deleteRecallCampaign = async (
	campaignId: string,
): Promise<void> => {
	try {
		await marketingApi.recallCampaigns.delete(campaignId);
	} catch (error) {
		logger.error(
			"[MarketingService] Error deleting recall campaign",
			error,
			"marketingService",
		);
		throw error;
	}
};

export const findPatientsForRecall = async (
	_organizationId: string,
	_daysWithoutVisit: number,
): Promise<
	Array<{ patient_id: string; patient_name: string; last_visit: string }>
> => {
	return [];
};

export const generateReferralCode = (patientId: string): string => {
	const hash = patientId
		.split("")
		.reduce((acc, char) => acc + char.charCodeAt(0), 0);
	const code = `FISIO${hash.toString(36).toUpperCase().padStart(4, "0")}`;
	return code.substring(0, 8);
};

export const createReferralCode = async (
	patientId: string,
	_organizationId: string,
	config: Omit<
		ReferralCode,
		"id" | "patient_id" | "organization_id" | "code" | "created_at" | "uses"
	>,
): Promise<string> => {
	try {
		const created = (
			await marketingApi.referrals.create({
				patient_id: patientId,
				code: generateReferralCode(patientId),
				reward_type: config.reward_type,
				reward_value: config.reward_value,
				referrer_reward: config.referrer_reward,
				max_uses: config.max_uses,
				expires_at: config.expires_at,
			})
		).data;
		return created.id;
	} catch (error) {
		logger.error(
			"[MarketingService] Error creating referral code",
			error,
			"marketingService",
		);
		throw error;
	}
};

export const getReferralCode = async (
	code: string,
): Promise<ReferralCode | null> => {
	try {
		return (await marketingApi.referrals.getByCode(code)).data;
	} catch (error) {
		logger.error(
			"[MarketingService] Error getting referral code",
			error,
			"marketingService",
		);
		return null;
	}
};

export const redeemReferralCode = async (
	code: string,
	newPatientId: string,
): Promise<{ success: boolean; reward?: string; error?: string }> => {
	try {
		return (
			await marketingApi.referrals.redeem({
				code,
				new_patient_id: newPatientId,
			})
		).data;
	} catch (error) {
		logger.error(
			"[MarketingService] Error redeeming referral code",
			error,
			"marketingService",
		);
		return { success: false, error: "Erro ao processar resgate" };
	}
};

export const getPatientReferralCode = async (
	patientId: string,
): Promise<ReferralCode | null> => {
	try {
		return (await marketingApi.referrals.getByPatient(patientId)).data;
	} catch (error) {
		logger.error(
			"[MarketingService] Error getting patient referral code",
			error,
			"marketingService",
		);
		return null;
	}
};

export const getReferralStats = async (
	_organizationId: string,
): Promise<{
	totalCodes: number;
	activeCodes: number;
	totalRedemptions: number;
	pendingRewards: number;
	topReferrers: Array<{
		patient_id: string;
		patient_name: string;
		redemptions: number;
	}>;
}> => {
	try {
		return (await marketingApi.referrals.stats()).data;
	} catch (error) {
		logger.error(
			"[MarketingService] Error getting referral stats",
			error,
			"marketingService",
		);
		return {
			totalCodes: 0,
			activeCodes: 0,
			totalRedemptions: 0,
			pendingRewards: 0,
			topReferrers: [],
		};
	}
};

export const getFisioLinkConfig = async (
	slug: string,
): Promise<FisioLinkConfig | null> => {
	try {
		return (await marketingApi.fisiolink.publicGet(slug)).data;
	} catch (error) {
		logger.error(
			"[MarketingService] Error getting FisioLink config",
			error,
			"marketingService",
		);
		return null;
	}
};

export const getFisioLinkByOrganization = async (
	_organizationId: string,
): Promise<FisioLinkConfig | null> => {
	try {
		return (await marketingApi.fisiolink.getMine()).data;
	} catch (error) {
		logger.error(
			"[MarketingService] Error getting FisioLink by organization",
			error,
			"marketingService",
		);
		return null;
	}
};

export const updateFisioLinkConfig = async (
	_organizationId: string,
	config: Partial<FisioLinkConfig>,
): Promise<string> => {
	try {
		const updated = (await marketingApi.fisiolink.update(config)).data;
		return updated.slug;
	} catch (error) {
		logger.error(
			"[MarketingService] Error updating FisioLink config",
			error,
			"marketingService",
		);
		throw error;
	}
};

export const trackFisioLinkClick = async (
	slug: string,
	button: string,
): Promise<void> => {
	try {
		await marketingApi.fisiolink.trackClick(slug, button);
	} catch (error) {
		logger.error(
			"[MarketingService] Error tracking FisioLink click",
			error,
			"marketingService",
		);
	}
};

export const getFisioLinkAnalytics = async (
	slug: string,
	_startDate?: Date,
	_endDate?: Date,
): Promise<{ totalClicks: number; clicksByButton: Record<string, number> }> => {
	try {
		return (await marketingApi.fisiolink.analytics(slug)).data;
	} catch (error) {
		logger.error(
			"[MarketingService] Error getting FisioLink analytics",
			error,
			"marketingService",
		);
		return { totalClicks: 0, clicksByButton: {} };
	}
};

export const getBirthdayAutomationConfig = async (
	_organizationId: string,
): Promise<BirthdayAutomationConfig> => {
	try {
		return (await marketingApi.birthdayConfig.get()).data;
	} catch (error) {
		logger.error(
			"[MarketingService] Error getting birthday config",
			error,
			"marketingService",
		);
		return {
			organization_id: "",
			enabled: false,
			message_template: DEFAULT_BIRTHDAY_MESSAGE,
			send_whatsapp: true,
			send_email: false,
		};
	}
};

export const updateBirthdayAutomationConfig = async (
	_organizationId: string,
	config: Partial<BirthdayAutomationConfig>,
): Promise<void> => {
	try {
		await marketingApi.birthdayConfig.update(config);
	} catch (error) {
		logger.error(
			"[MarketingService] Error updating birthday config",
			error,
			"marketingService",
		);
		throw error;
	}
};

export const getTodayBirthdays = async (
	_organizationId: string,
): Promise<
	Array<{ id: string; name: string; phone: string; email: string }>
> => {
	try {
		const patients = (await patientsApi.list({ limit: 1000 })).data ?? [];
		const today = new Date();
		const month = today.getMonth() + 1;
		const day = today.getDate();
		return patients
			.filter((patient) => {
				if (!patient.birth_date) return false;
				const birthDate = new Date(patient.birth_date);
				return (
					birthDate.getMonth() + 1 === month && birthDate.getDate() === day
				);
			})
			.map((patient) => ({
				id: patient.id,
				name: patient.name,
				phone: patient.phone ?? "",
				email: patient.email ?? "",
			}));
	} catch (error) {
		logger.error(
			"[MarketingService] Error getting today birthdays",
			error,
			"marketingService",
		);
		return [];
	}
};

export const calculateMarketingROI = async (
	_organizationId: string,
	startDate: Date,
	endDate: Date,
	adSpend: number,
): Promise<{
	totalLeads: number;
	costPerLead: number;
	conversionRate: number;
	roi: number;
	returnOnAdSpend: number;
}> => {
	try {
		const metrics = (
			await marketingApi.roi({
				startDate: startDate.toISOString(),
				endDate: endDate.toISOString(),
			})
		).data;
		const totalLeads = metrics.totalLeads ?? 0;
		const convertedLeads = metrics.convertedLeads ?? 0;
		const costPerLead = totalLeads > 0 ? adSpend / totalLeads : 0;
		const conversionRate =
			totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;
		const avgRevenuePerPatient = 500;
		const totalRevenue = convertedLeads * avgRevenuePerPatient;
		const roi = adSpend > 0 ? ((totalRevenue - adSpend) / adSpend) * 100 : 0;
		const roas = adSpend > 0 ? totalRevenue / adSpend : 0;

		return {
			totalLeads,
			costPerLead,
			conversionRate,
			roi,
			returnOnAdSpend: roas,
		};
	} catch (error) {
		logger.error(
			"[MarketingService] Error calculating ROI",
			error,
			"marketingService",
		);
		return {
			totalLeads: 0,
			costPerLead: 0,
			conversionRate: 0,
			roi: 0,
			returnOnAdSpend: 0,
		};
	}
};

export const generateSocialCaption = (
	type: "technical" | "motivational" | "educational",
	metrics: string[],
	clinicName?: string,
): string => {
	const baseDisclaimer = clinicName
		? `\n\n${clinicName} - Fisioterapia Especializada\n⚠️ Resultados variam. Conteúdo informativo. Avaliação individual é indispensável.`
		: "\n\n⚠️ Resultados variam. Conteúdo informativo. Avaliação individual é indispensável.";

	switch (type) {
		case "motivational":
			return `Incrível a dedicação deste paciente! 💪\n\nComparamos a evolução biomecânica e os números não mentem. O foco no tratamento traz resultados reais.\n\n${metrics.map((m) => `✅ ${m}`).join("\n")}\n\n#Fisioterapia #Evolução #Saúde #Movimento${baseDisclaimer}`;
		case "educational":
			return `Sabia que a ${metrics[0] || "postura"} influencia diretamente na sua dor?\n\nVeja a diferença antes e depois do tratamento focado em biomecânica. Dores crônicas muitas vezes têm origem mecânica.\n\nAgende sua avaliação e transforme sua qualidade de vida.${baseDisclaimer}`;
		case "technical":
		default:
			return `📊 Análise Comparativa de Movimento\n\nObserva-se melhora significativa nos parâmetros biomecânicos:\n${metrics.map((m) => `• ${m}`).join("\n")}\n\nProtocolo de reabilitação neuromuscular aplicado com sucesso.${baseDisclaimer}`;
	}
};

export const generateMythVsTruth = (
	topic: string,
	myth: string,
	truth: string,
): Array<{
	type: "myth" | "truth" | "explanation";
	title: string;
	content: string;
}> => [
	{
		type: "myth",
		title: `MITO: ${myth}`,
		content: `Muitas pessoas acreditam que "${myth}", mas será que isso é verdade sobre ${topic}?`,
	},
	{
		type: "truth",
		title: "VERDADE",
		content: `Na realidade, ${truth}. A ciência explica melhor...`,
	},
	{
		type: "explanation",
		title: "O QUE A CIÊNCIA DIZ",
		content: `Estudos mostram que ${truth}. Consulte um fisioterapeuta para orientação personalizada.`,
	},
];
