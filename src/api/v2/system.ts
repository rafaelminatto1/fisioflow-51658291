import { request } from "./base";
import type { Profile } from "@/types/auth";
import type {
  GooglePlacePrediction,
  GoogleIntegrationRecord,
  GoogleBusinessReviewRecord,
  GoogleSyncLogRecord,
  GoogleDriveItemRecord,
  LGPDConsentRecord,
  MFASettingsRecord,
  MFAFactorRecord,
  ProjectRecord,
  WorkerOrganization,
  OrganizationMember,
  TherapistSummary,
} from "@/types/workers";

export const integrationsApi = {
  searchPlaces: (query: string) =>
    request<{ data: GooglePlacePrediction[] }>(
      `/api/integrations/google/places/search?query=${encodeURIComponent(query)}`,
    ),
  google: {
    authUrl: (state?: string) =>
      request<{ data: { url: string } }>(
        `/api/integrations/google/auth-url${state ? `?state=${encodeURIComponent(state)}` : ""}`,
      ),
    status: () =>
      request<{ data: GoogleIntegrationRecord | null }>("/api/integrations/google/status"),
    business: {
      reviews: () =>
        request<{ data: GoogleBusinessReviewRecord[] }>(
          "/api/integrations/google/business/reviews",
        ),
    },
    exchangeCode: (code: string) =>
      request<{ data: GoogleIntegrationRecord }>("/api/integrations/google/exchange-code", {
        method: "POST",
        body: JSON.stringify({ code }),
      }),
    connect: (data?: { code?: string; email?: string }) =>
      request<{ data: GoogleIntegrationRecord }>("/api/integrations/google/connect", {
        method: "POST",
        body: JSON.stringify(data ?? {}),
      }),
    disconnect: () =>
      request<{ data: GoogleIntegrationRecord | null }>("/api/integrations/google/disconnect", {
        method: "POST",
      }),
    calendar: {
      get: () =>
        request<{ data: GoogleIntegrationRecord | null }>("/api/integrations/google/calendar"),
      update: (data: Record<string, unknown>) =>
        request<{ data: GoogleIntegrationRecord }>("/api/integrations/google/calendar", {
          method: "PUT",
          body: JSON.stringify(data),
        }),
      sync: () =>
        request<{
          data: { synced_at: string; integration: GoogleIntegrationRecord };
        }>("/api/integrations/google/calendar/sync", { method: "POST" }),
      logs: () =>
        request<{ data: GoogleSyncLogRecord[] }>("/api/integrations/google/calendar/logs"),
      importPreview: (data: { startDate: string; endDate: string }) =>
        request<{
          data: {
            success: boolean;
            events: Array<{
              id: string;
              summary: string;
              start: string | null;
              end: string | null;
            }>;
          };
        }>("/api/integrations/google/calendar/import-preview", {
          method: "POST",
          body: JSON.stringify(data),
        }),
      syncAppointment: (data: Record<string, unknown>) =>
        request<{ data: { success: boolean; externalEventId: string } }>(
          "/api/integrations/google/calendar/sync-appointment",
          {
            method: "POST",
            body: JSON.stringify(data),
          },
        ),
    },
    docs: {
      listTemplates: (folderId?: string) =>
        request<{ data: GoogleDriveItemRecord[] }>(
          `/api/integrations/google/docs/templates${folderId ? `?folderId=${encodeURIComponent(folderId)}` : ""}`,
        ),
      generateReport: (data: {
        templateId: string;
        patientName: string;
        data: Record<string, string>;
        folderId?: string;
      }) =>
        request<{
          data: { success: boolean; fileId: string; webViewLink: string };
        }>("/api/integrations/google/docs/generate-report", {
          method: "POST",
          body: JSON.stringify(data),
        }),
    },
    drive: {
      listFiles: (folderId?: string) =>
        request<{ data: GoogleDriveItemRecord[] }>(
          `/api/integrations/google/drive/files${folderId ? `?folderId=${encodeURIComponent(folderId)}` : ""}`,
        ),
      createFolder: (data: { name: string; parentId?: string }) =>
        request<{ data: { folderId: string; webViewLink: string } }>(
          "/api/integrations/google/drive/folders",
          {
            method: "POST",
            body: JSON.stringify(data),
          },
        ),
    },
  },
};

export const securityApi = {
  lgpd: {
    list: () => request<{ data: LGPDConsentRecord[] }>("/api/security/lgpd-consents"),
    update: (consentType: string, data: { granted: boolean; version?: string }) =>
      request<{ data: LGPDConsentRecord | null }>(
        `/api/security/lgpd-consents/${encodeURIComponent(consentType)}`,
        {
          method: "PUT",
          body: JSON.stringify(data),
        },
      ),
  },
  mfa: {
    getSettings: () => request<{ data: MFASettingsRecord | null }>("/api/security/mfa/settings"),
    enable: (method: string) =>
      request<{ data: MFASettingsRecord; backupCodes: string[] }>("/api/security/mfa/enable", {
        method: "POST",
        body: JSON.stringify({ method }),
      }),
    disable: () =>
      request<{ data: MFASettingsRecord | null }>("/api/security/mfa/disable", {
        method: "POST",
      }),
    sendOtp: () =>
      request<{
        data: { success: boolean; expiresAt: string; debugCode?: string };
      }>("/api/security/mfa/send-otp", { method: "POST" }),
    verifyOtp: (code: string) =>
      request<{ data: { verified: boolean } }>("/api/security/mfa/verify-otp", {
        method: "POST",
        body: JSON.stringify({ code }),
      }),
    enroll: (friendlyName?: string) =>
      request<{ data: { qrCode: string; secret: string; factorId: string } }>(
        "/api/security/mfa/enroll",
        {
          method: "POST",
          body: JSON.stringify({ friendlyName }),
        },
      ),
    verifyEnrollment: (factorId: string, code: string) =>
      request<{ data: { verified: boolean } }>("/api/security/mfa/enroll/verify", {
        method: "POST",
        body: JSON.stringify({ factorId, code }),
      }),
    listFactors: () => request<{ data: MFAFactorRecord[] }>("/api/security/mfa/factors"),
    deleteFactor: (factorId: string) =>
      request<{ data: { success: boolean } }>(
        `/api/security/mfa/factors/${encodeURIComponent(factorId)}`,
        {
          method: "DELETE",
        },
      ),
  },
};

export const projectsApi = {
  list: () => request<{ data: ProjectRecord[] }>("/api/projects"),
  get: (id: string) => request<{ data: ProjectRecord }>(`/api/projects/${id}`),
  create: (data: Partial<ProjectRecord>) =>
    request<{ data: ProjectRecord }>("/api/projects", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<ProjectRecord>) =>
    request<{ data: ProjectRecord }>(`/api/projects/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: string) => request<{ ok: boolean }>(`/api/projects/${id}`, { method: "DELETE" }),
};

export const organizationsApi = {
  get: (id: string) => request<{ data: WorkerOrganization }>(`/api/organizations/${id}`),
  create: (data: {
    name: string;
    slug: string;
    settings?: Record<string, unknown>;
    active?: boolean;
  }) =>
    request<{ data: WorkerOrganization }>("/api/organizations", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (
    id: string,
    data: Partial<Omit<WorkerOrganization, "id" | "created_at" | "updated_at">>,
  ) =>
    request<{ data: WorkerOrganization }>(`/api/organizations/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
};

export const organizationMembersApi = {
  list: (params?: { organizationId?: string; userId?: string; limit?: number }) => {
    const qs = new URLSearchParams(
      Object.entries(params ?? {})
        .filter(([, v]) => v != null)
        .map(([k, v]) => [k, String(v)]),
    ).toString();
    return request<{ data: OrganizationMember[]; total?: number }>(
      `/api/organization-members${qs ? `?${qs}` : ""}`,
    );
  },
  create: (data: { organizationId?: string; userId: string; role: OrganizationMember["role"] }) =>
    request<{ data: OrganizationMember }>("/api/organization-members", {
      method: "POST",
      body: JSON.stringify({
        organizationId: data.organizationId,
        userId: data.userId,
        role: data.role,
      }),
    }),
  update: (id: string, data: Partial<Pick<OrganizationMember, "role" | "active">>) =>
    request<{ data: OrganizationMember }>(`/api/organization-members/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  remove: (id: string) =>
    request<{ success: boolean }>(`/api/organization-members/${id}`, {
      method: "DELETE",
    }),
};

export const invitationsApi = {
  list: () => request<{ data: any[] }>("/api/invitations"),
  create: (data: { email: string; role: string }) =>
    request<{ data: any }>("/api/invitations", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: { email?: string; role?: string; expires_at?: string }) =>
    request<{ data: any }>(`/api/invitations/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: string) => request<{ ok: boolean }>(`/api/invitations/${id}`, { method: "DELETE" }),
  validate: (token: string) =>
    requestPublic<{ data: { email: string; role: string } }>(`/api/invitations/validate/${token}`),
  use: (token: string) =>
    request<{ success: boolean }>(`/api/invitations/use/${token}`, {
      method: "POST",
    }),
};

export const healthApi = {
  check: () => requestPublic<{ status: string; timestamp: string }>("/api/health"),
};

export const profileApi = {
  me: () => request<{ data: Partial<Profile> }>("/api/profile/me"),
  listTherapists: () => request<{ data: TherapistSummary[] }>("/api/profile/therapists"),
  updateMe: (data: Record<string, unknown>) =>
    request<{ data: Record<string, unknown> }>("/api/profile/me", {
      method: "PUT",
      body: JSON.stringify(data),
    }),
};
