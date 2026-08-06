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
  [CONSENT_TYPES.MEDICAL_DISCLAIMER]: {
    type: "required",
    category: "legal",
    description: "Ciencia do aviso medico.",
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

function buildConsent(
  userId: string,
  name: string,
  version: string,
  status: Consent["status"],
): Consent {
  // Consentimentos com escopo (ex.: `medical-disclaimer:exercise-prescription`)
  // herdam a metadata do tipo base — o registro legal é do documento, o sufixo só
  // diz em qual tela o usuário deu ciência.
  const baseName = name.split(":")[0];
  const metadata = CONSENT_METADATA[name] ??
    CONSENT_METADATA[baseName] ?? {
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

/** Linha crua de `lgpd_consents` como o Worker devolve. */
interface ServerConsentRow {
  user_id: string;
  consent_type: string;
  granted: boolean;
  granted_at?: string | null;
  revoked_at?: string | null;
  version?: string | null;
}

/**
 * O endpoint devolve as colunas do banco em snake_case; a tela consome `Consent`
 * em camelCase (`name`, `status`). Sem esta tradução a lista de consentimentos
 * renderiza vazia mesmo com dado no servidor.
 */
function fromServerRow(row: ServerConsentRow, userId: string): Consent {
  const consent = buildConsent(
    row.user_id || userId,
    row.consent_type,
    row.version || "1.0",
    row.granted ? "granted" : "withdrawn",
  );

  return {
    ...consent,
    grantedAt: row.granted_at ? new Date(row.granted_at) : consent.grantedAt,
    withdrawnAt: row.revoked_at ? new Date(row.revoked_at) : consent.withdrawnAt,
  };
}

export const consentManager = {
  async getUserConsents(userId: string): Promise<Consent[]> {
    try {
      const response = await fetchApi<{ data: ServerConsentRow[] }>("/api/security/lgpd-consents", {
        method: "GET",
      });
      if (Array.isArray(response.data)) {
        return response.data
          .filter((row) => row && typeof row.consent_type === "string")
          .map((row) => fromServerRow(row, userId));
      }
    } catch {
      // Local fallback keeps privacy settings usable when the security route is unavailable.
    }

    return readLocalConsents(userId);
  },

  /**
   * Quais documentos legais ainda faltam aceitar na versão vigente.
   * É a fonte de verdade tanto do onboarding quanto do aviso de política nova:
   * `lgpd_consents` já guarda tipo + versão + granted, então não existe estado
   * paralelo de "onboarding completo" para sair de sincronia.
   */
  async missingLegalConsents(
    userId: string,
    required: { consentType: string; version: string }[],
  ): Promise<string[]> {
    const consents = await this.getUserConsents(userId);

    return required
      .filter(
        ({ consentType, version }) =>
          !consents.some(
            (consent) =>
              consent.name.split(":")[0] === consentType &&
              consent.status === "granted" &&
              consent.version === version,
          ),
      )
      .map(({ consentType }) => consentType);
  },

  /**
   * `requireServerAck` para consentimento com valor legal (política, termos, aviso
   * médico): grava localmente do mesmo jeito, mas propaga a falha para a tela poder
   * avisar o usuário. Sem isso, um aceite que nunca chegou ao servidor parecia
   * bem-sucedido — foi o que aconteceu enquanto as telas chamavam uma rota 404.
   * Consentimento de permissão (câmera, fotos) segue best-effort.
   */
  async grantConsent(
    userId: string,
    consentType: string,
    version: string,
    options?: { requireServerAck?: boolean },
  ): Promise<Consent> {
    let syncError: unknown;
    try {
      await fetchApi(`/api/security/lgpd-consents/${encodeURIComponent(consentType)}`, {
        method: "PUT",
        data: { granted: true, version },
      });
    } catch (error) {
      syncError = error;
    }

    const consent = await upsertLocalConsent(userId, consentType, version, "granted");
    if (syncError && options?.requireServerAck) throw syncError;
    return consent;
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
