import { useQuery } from "@tanstack/react-query";
import { organizationsApi } from "@/api/v2/system";
import { useAuth } from "@/contexts/AuthContext";

const ENV_OVERRIDE = import.meta.env?.VITE_VOICE_SCRIBE_V2 === "true";

/**
 * Flag runtime do ditado por voz (Voice Scribe v2 / Nova-3).
 * Liga por organização via `organizations.settings.dictation_enabled`;
 * `VITE_VOICE_SCRIBE_V2=true` permanece como override de dev (build-time).
 */
export function resolveDictationEnabled(
  settings: Record<string, unknown> | null | undefined,
  envOverride: boolean,
): boolean {
  if (envOverride) return true;
  return settings?.dictation_enabled === true;
}

export function useDictationEnabled(): boolean {
  const auth = useAuth() as { organizationId?: string; organization_id?: string };
  const orgId = auth.organizationId ?? auth.organization_id ?? "";
  const { data } = useQuery({
    queryKey: ["organization-settings", orgId],
    queryFn: () => organizationsApi.get(orgId),
    enabled: Boolean(orgId) && !ENV_OVERRIDE,
    staleTime: 5 * 60 * 1000,
  });
  const settings = (data?.data as { settings?: Record<string, unknown> } | undefined)?.settings;
  return resolveDictationEnabled(settings, ENV_OVERRIDE);
}
