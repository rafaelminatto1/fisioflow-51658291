import { request, requestPublic } from "./base";
import type {
	MarketingConsentRecord,
	ReviewAutomationConfigRecord,
	BirthdayAutomationConfigRecord,
	RecallCampaignRecord,
	ReferralCodeRecord,
	FisioLinkConfigRecord,
	MarketingExportRecord,
	ContentCalendarRecord,
	CommunicationLogRecord,
	CommunicationStatsRecord,
} from "@/types/workers";

export const marketingApi = {
	consents: {
		get: (patientId: string) =>
			request<{ data: MarketingConsentRecord | null }>(
				`/api/marketing/consents/${patientId}`,
			),
		upsert: (patientId: string, data: Partial<MarketingConsentRecord>) =>
			request<{ data: MarketingConsentRecord }>(
				`/api/marketing/consents/${patientId}`,
				{
					method: "PUT",
					body: JSON.stringify(data),
				},
			),
		revoke: (patientId: string) =>
			request<{ data: MarketingConsentRecord }>(
				`/api/marketing/consents/${patientId}/revoke`,
				{
					method: "POST",
				},
			),
	},
	reviewConfig: {
		get: () =>
			request<{ data: ReviewAutomationConfigRecord }>(
				"/api/marketing/review-config",
			),
		update: (data: Partial<ReviewAutomationConfigRecord>) =>
			request<{ data: ReviewAutomationConfigRecord }>(
				"/api/marketing/review-config",
				{
					method: "PUT",
					body: JSON.stringify(data),
				},
			),
	},
	birthdayConfig: {
		get: () =>
			request<{ data: BirthdayAutomationConfigRecord }>(
				"/api/marketing/birthday-config",
			),
		update: (data: Partial<BirthdayAutomationConfigRecord>) =>
			request<{ data: BirthdayAutomationConfigRecord }>(
				"/api/marketing/birthday-config",
				{
					method: "PUT",
					body: JSON.stringify(data),
				},
			),
	},
	recallCampaigns: {
		list: () =>
			request<{ data: RecallCampaignRecord[] }>(
				"/api/marketing/recall-campaigns",
			),
		create: (data: Partial<RecallCampaignRecord>) =>
			request<{ data: RecallCampaignRecord }>(
				"/api/marketing/recall-campaigns",
				{
					method: "POST",
					body: JSON.stringify(data),
				},
			),
		update: (id: string, data: Partial<RecallCampaignRecord>) =>
			request<{ data: RecallCampaignRecord }>(
				`/api/marketing/recall-campaigns/${id}`,
				{
					method: "PUT",
					body: JSON.stringify(data),
				},
			),
		delete: (id: string) =>
			request<{ ok: boolean }>(`/api/marketing/recall-campaigns/${id}`, {
				method: "DELETE",
			}),
	},
	referrals: {
		stats: () =>
			request<{
				data: {
					totalCodes: number;
					activeCodes: number;
					totalRedemptions: number;
					pendingRewards: number;
					topReferrers: Array<{
						patient_id: string;
						patient_name: string;
						redemptions: number;
					}>;
				};
			}>("/api/marketing/referrals/stats"),
		create: (
			data: Partial<ReferralCodeRecord> & { patient_id: string; code: string },
		) =>
			request<{ data: ReferralCodeRecord }>("/api/marketing/referrals", {
				method: "POST",
				body: JSON.stringify(data),
			}),
		getByCode: (code: string) =>
			request<{ data: ReferralCodeRecord | null }>(
				`/api/marketing/referrals/code/${encodeURIComponent(code)}`,
			),
		getByPatient: (patientId: string) =>
			request<{ data: ReferralCodeRecord | null }>(
				`/api/marketing/referrals/patient/${patientId}`,
			),
		redeem: (data: { code: string; new_patient_id: string }) =>
			request<{ data: { success: boolean; reward?: string; error?: string } }>(
				"/api/marketing/referrals/redeem",
				{
					method: "POST",
					body: JSON.stringify(data),
				},
			),
	},
	fisiolink: {
		getMine: () =>
			request<{ data: FisioLinkConfigRecord | null }>(
				"/api/marketing/fisiolink",
			),
		update: (data: Partial<FisioLinkConfigRecord>) =>
			request<{ data: FisioLinkConfigRecord }>("/api/marketing/fisiolink", {
				method: "PUT",
				body: JSON.stringify(data),
			}),
		analytics: (slug: string) =>
			request<{
				data: { totalClicks: number; clicksByButton: Record<string, number> };
			}>(`/api/marketing/fisiolink/${encodeURIComponent(slug)}/analytics`),
		publicGet: (slug: string) =>
			requestPublic<{ data: FisioLinkConfigRecord | null }>(
				`/api/marketing/public/fisiolink/${encodeURIComponent(slug)}`,
			),
		trackClick: (slug: string, button: string) =>
			requestPublic<{ ok: boolean }>(
				`/api/marketing/public/fisiolink/${encodeURIComponent(slug)}/click`,
				{
					method: "POST",
					body: JSON.stringify({ button }),
				},
			),
	},
	exports: {
		list: (params?: { patientId?: string }) => {
			const qs = new URLSearchParams(
				Object.fromEntries(
					Object.entries(params ?? {})
						.filter(([, v]) => v != null)
						.map(([k, v]) => [k, String(v)]),
				),
			).toString();
			return request<{ data: MarketingExportRecord[] }>(
				`/api/marketing/exports${qs ? `?${qs}` : ""}`,
			);
		},
		create: (
			data: Partial<MarketingExportRecord> & {
				patient_id: string;
				file_path: string;
				file_url: string;
			},
		) =>
			request<{ data: MarketingExportRecord }>("/api/marketing/exports", {
				method: "POST",
				body: JSON.stringify(data),
			}),
		delete: (id: string) =>
			request<{ data: { id: string; file_path: string } }>(
				`/api/marketing/exports/${id}`,
				{
					method: "DELETE",
				},
			),
	},
	contentCalendar: {
		list: () =>
			request<{ data: ContentCalendarRecord[] }>(
				"/api/marketing/content-calendar",
			),
		create: (
			data: Omit<ContentCalendarRecord, "id" | "created_at" | "updated_at">,
		) =>
			request<{ data: ContentCalendarRecord }>(
				"/api/marketing/content-calendar",
				{
					method: "POST",
					body: JSON.stringify(data),
				},
			),
		update: (id: string, data: Partial<ContentCalendarRecord>) =>
			request<{ data: ContentCalendarRecord }>(
				`/api/marketing/content-calendar/${id}`,
				{
					method: "PUT",
					body: JSON.stringify(data),
				},
			),
		delete: (id: string) =>
			request<{ ok: boolean }>(`/api/marketing/content-calendar/${id}`, {
				method: "DELETE",
			}),
	},
	roi: (data: { startDate: string; endDate: string }) =>
		request<{ data: { totalLeads: number; convertedLeads: number } }>(
			`/api/marketing/roi?startDate=${encodeURIComponent(data.startDate)}&endDate=${encodeURIComponent(data.endDate)}`,
		),
	sendWhatsAppTemplate: (data: {
		patient_id: string;
		template_key: string;
		variables: Record<string, string>;
	}) =>
		request<{ data: { status: string; message_id?: string } }>(
			"/api/whatsapp/send-template",
			{ method: "POST", body: JSON.stringify(data) },
		),
	atRiskPatients: () =>
		request<{
			data: Array<{
				id: string;
				full_name: string;
				phone: string;
				last_appointment: string | null;
				missed_count: number;
				recent_exercises: number;
			}>;
		}>("/api/analytics/retention/risk"),
};

export const communicationsApi = {
	list: (params?: { channel?: string; status?: string; limit?: number }) => {
		const qs = new URLSearchParams(
			Object.fromEntries(
				Object.entries(params ?? {})
					.filter(([, v]) => v != null)
					.map(([k, v]) => [k, String(v)]),
			),
		).toString();
		return request<{ data: CommunicationLogRecord[] }>(
			`/api/communications${qs ? `?${qs}` : ""}`,
		);
	},
	stats: () =>
		request<{ data: CommunicationStatsRecord }>("/api/communications/stats"),
	create: (
		data: Partial<CommunicationLogRecord> & {
			type: string;
			recipient: string;
			body: string;
		},
	) =>
		request<{ data: CommunicationLogRecord }>("/api/communications", {
			method: "POST",
			body: JSON.stringify(data),
		}),
	delete: (id: string) =>
		request<{ ok: boolean }>(`/api/communications/${id}`, {
			method: "DELETE",
		}),
	resend: (id: string) =>
		request<{ data: CommunicationLogRecord }>(
			`/api/communications/${id}/resend`,
			{
				method: "POST",
			},
		),
	testEmail: (data: {
		to: string;
		subject?: string;
		type?: string;
		body?: string;
		data?: Record<string, unknown>;
	}) =>
		request<{ data: CommunicationLogRecord }>(
			"/api/communications/test-email",
			{
				method: "POST",
				body: JSON.stringify(data),
			},
		),
};
