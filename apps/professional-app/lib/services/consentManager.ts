import AsyncStorage from "@react-native-async-storage/async-storage";
import { fetchApi } from "@/lib/api/client";
import { CONSENT_TYPES } from "@/constants/consentTypes";
import type { Consent, ConsentCategory, ConsentType } from "@/types/consent";

const STORAGE_PREFIX = "fisioflow:consents";

const CONSENT_METADATA: Record<
  string,
  { type: ConsentType; category: ConsentCategory; description: string }
> = {
  [CONSENT_TYPES.PRIVACY_POLICY]: {
    type: "required",
    category: "legal",
    description: "Aceite da politica de privacidade.",
  },
  [CONSENT_TYPES.TERMS_OF_SERVICE]: {
    type: "required",
    category: "legal",
    description: "Aceite dos termos de servico.",
  },
  [CONSENT_TYPES.CAMERA_PERMISSION]: {
    type: "required",
    category: "permission",
    description: "Permissao para capturar imagens e videos clinicos.",
  },
  [CONSENT_TYPES.PHOTOS_PERMISSION]: {
    type: "required",
    category: "permission",
    description: "Permissao para selecionar midias do dispositivo.",
  },
  [CONSENT_TYPES.LOCATION_PERMISSION]: {
    type: "optional",
    category: "permission",
    description: "Permissao para recursos baseados em localizacao.",
  },
  [CONSENT_TYPES.NOTIFICATIONS_PERMISSION]: {
    type: "optional",
    category: "permission",
    description: "Permissao para lembretes e avisos.",
  },
  [CONSENT_TYPES.ANALYTICS]: {
    type: "optional",
    category: "analytics",
    description: "Consentimento para analise de uso.",
  },
  [CONSENT_TYPES.CRASH_REPORTS]: {
    type: "optional",
    category: "analytics",
    description: "Consentimento para relatorios tecnicos de erro.",
  },
  [CONSENT_TYPES.MARKETING_EMAILS]: {
    type: "optional",
    category: "marketing",
    description: "Consentimento para comunicacoes comerciais.",
  },
};

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}:${userId}`;
}

function buildConsent(userId: string, name: string, version: string, status: Consent["status"]): Consent {
  const metadata = CONSENT_METADATA[name] ?? {
    type: "optional" as const,
    category: "legal" as const,
    description: name,
  };
  const now = new Date();

  return {
    id: `${userId}:${name}`,
    userId,
    name,
    version,
    status,
    grantedAt: status === "granted" ? now : undefined,
    withdrawnAt: status === "withdrawn" ? now : undefined,
    ...metadata,
  };
}

async function readLocalConsents(userId: string): Promise<Consent[]> {
  const raw = await AsyncStorage.getItem(storageKey(userId));
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as Consent[];
    return parsed.map((consent) => ({
      ...consent,
      grantedAt: consent.grantedAt ? new Date(consent.grantedAt) : undefined,
      withdrawnAt: consent.withdrawnAt ? new Date(consent.withdrawnAt) : undefined,
    }));
  } catch {
    return [];
  }
}

async function writeLocalConsents(userId: string, consents: Consent[]) {
  await AsyncStorage.setItem(storageKey(userId), JSON.stringify(consents));
}

async function upsertLocalConsent(
  userId: string,
  consentType: string,
  version: string,
  status: Consent["status"],
) {
  const consents = await readLocalConsents(userId);
  const next = buildConsent(userId, consentType, version, status);
  const updated = [next, ...consents.filter((consent) => consent.name !== consentType)];
  await writeLocalConsents(userId, updated);
  return next;
}

export const consentManager = {
  async getUserConsents(userId: string): Promise<Consent[]> {
    try {
      const response = await fetchApi<{ data: Consent[] }>("/api/security/lgpd-consents", {
        method: "GET",
      });
      if (Array.isArray(response.data)) {
        return response.data;
      }
    } catch {
      // Local fallback keeps privacy settings usable when the security route is unavailable.
    }

    return readLocalConsents(userId);
  },

  async grantConsent(userId: string, consentType: string, version: string): Promise<Consent> {
    try {
      await fetchApi(`/api/security/lgpd-consents/${encodeURIComponent(consentType)}`, {
        method: "PUT",
        data: { granted: true, version },
      });
    } catch {
      // Persist locally even if backend consent sync is not configured for the mobile app.
    }

    return upsertLocalConsent(userId, consentType, version, "granted");
  },

  async withdrawConsent(userId: string, consentType: string): Promise<Consent> {
    try {
      await fetchApi(`/api/security/lgpd-consents/${encodeURIComponent(consentType)}`, {
        method: "PUT",
        data: { granted: false },
      });
    } catch {
      // Persist locally even if backend consent sync is not configured for the mobile app.
    }

    return upsertLocalConsent(userId, consentType, "1.0", "withdrawn");
  },
};
