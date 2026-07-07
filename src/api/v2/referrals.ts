import { request } from "./base";

export interface ReferralRankItem {
  patient_id: string | null;
  patient_name: string | null;
  code: string;
  uses: number;
  total_redemptions: number;
  recent_redemptions: number;
  last_redemption_at: string | null;
}

export interface ReferralCode {
  id: string;
  organization_id: string;
  patient_id: string | null;
  patient_name: string | null;
  code: string;
  max_uses: number | null;
  uses: number;
  last_used_at: string | null;
  created_at: string;
}

export interface FisioLink {
  id: string;
  slug: string;
  whatsapp_number: string | null;
  google_maps_url: string | null;
  phone: string | null;
  show_before_after: boolean;
  show_reviews: boolean;
  custom_message: string | null;
  theme: string | null;
  primary_color: string | null;
  total_clicks: number;
  clicks_30d: number;
  created_at: string;
}

export const referralsApi = {
  ranking: (days = 180, limit = 20) =>
    request<{ data: ReferralRankItem[]; days: number }>(
      `/api/referrals/ranking?days=${days}&limit=${limit}`,
    ),

  codes: () => request<{ data: ReferralCode[] }>(`/api/referrals/codes`),

  createCode: (data: { patient_id: string; code?: string; max_uses?: number }) =>
    request<{ data: ReferralCode }>(`/api/referrals/codes`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  fisioLinks: () => request<{ data: FisioLink[] }>(`/api/referrals/fisio-links`),

  clicksDaily: (days = 30, slug?: string) =>
    request<{ data: FisioLinkClickDay[]; days: number }>(
      `/api/referrals/clicks-daily?days=${days}${slug ? `&slug=${encodeURIComponent(slug)}` : ""}`,
    ),
};

export interface FisioLinkClickDay {
  day: string; // "YYYY-MM-DD"
  clicks: number;
}
