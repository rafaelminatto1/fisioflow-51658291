/**
 * useOrganizations - Migrated to Neon/Workers
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fisioLogger as logger } from "@/lib/errors/logger";
import { useAuth } from "@/contexts/AuthContext";
import { organizationMembersApi, organizationsApi, profileApi } from "@/api/v2";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  settings: Record<string, unknown>;
  address?: string;
  logo_url?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

const ORGANIZATION_KEYS = {
  list: ["organizations"] as const,
  current: (userId?: string, profileOrgId?: string, authOrgId?: string) =>
    ["current-organization", userId ?? "anonymous", profileOrgId, authOrgId] as const,
};

const normalizeOrganization = (
  orgId: string | null | undefined,
  name?: string,
): Organization | null => {
  // Se não houver ID, usamos um padrão para clínica única (Single Clinic Mode)
  const id = orgId || "fisioflow-clinic-main";
  return {
    id,
    name: name || "Fisioflow Clinic",
    slug: `clinica-principal`,
    settings: {},
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
};

const extractOrganizationId = (
  payload: Record<string, unknown> | null | undefined,
): string | null => {
  if (!payload) return "fisioflow-clinic-main";
  const id = payload.organization_id || payload.organizationId || payload.id;
  return typeof id === "string" ? id : "fisioflow-clinic-main";
};

const loadOrganizationViaProfileApi = async (): Promise<string | null> => {
  try {
    const resp = await profileApi.me();
    const profileData = (resp as { data?: Record<string, unknown> })?.data ?? resp;
    return extractOrganizationId(profileData as Record<string, unknown>);
  } catch (error) {
    logger.debug("Failed to load organization from profile API", error, "useOrganizations");
    return null;
  }
};

const fetchOrganizationRecord = async (organizationId: string) => {
  const res = await organizationsApi.get(organizationId);
  return res?.data ?? null;
};

export const useOrganizations = () => {
  const queryClient = useQueryClient();
  const { user, profile, organizationId: authOrganizationId } = useAuth();

  const deriveCandidateOrganizationId = async (): Promise<string | null> => {
    if (!user) return null;

    const fromProfileApi = await loadOrganizationViaProfileApi();
    if (fromProfileApi) return fromProfileApi;

    if (profile?.organization_id) return profile.organization_id;
    if (profile?.organizationId) return profile.organizationId;
    if (authOrganizationId) return authOrganizationId;

    const memberships = await organizationMembersApi.list({
      userId: user.uid,
      limit: 1,
    });
    return memberships.data?.[0]?.organization_id ?? null;
  };

  const {
    data: organizations,
    isLoading,
    error,
  } = useQuery({
    queryKey: ORGANIZATION_KEYS.list,
    queryFn: async () => {
      const candidateOrgId = await deriveCandidateOrganizationId();
      if (!candidateOrgId) return [];
      const record = await fetchOrganizationRecord(candidateOrgId);
      if (record) return [record];
      const fallback = normalizeOrganization(candidateOrgId);
      return fallback ? [fallback] : [];
    },
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
    enabled: !!user,
  });

  const currentOrganizationQuery = useQuery({
    queryKey: ORGANIZATION_KEYS.current(user?.uid, profile?.organization_id, authOrganizationId),
    queryFn: async () => {
      const candidateOrgId = await deriveCandidateOrganizationId();
      if (!candidateOrgId) return null;
      const record = await fetchOrganizationRecord(candidateOrgId);
      if (record) return record;
      return normalizeOrganization(candidateOrgId);
    },
    staleTime: 1000 * 60 * 15,
    enabled: !!user,
  });

  const createOrganization = useMutation({
    mutationFn: async (payload: {
      name: string;
      slug: string;
      settings?: Record<string, unknown>;
      active?: boolean;
    }) => {
      const res = await organizationsApi.create(payload);
      return res?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORGANIZATION_KEYS.list });
      toast.success("Organização criada com sucesso");
    },
    onError: (error: Error) => {
      toast.error("Erro ao criar organização: " + error.message);
    },
  });

  const updateOrganization = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Organization> & { id: string }) => {
      const res = await organizationsApi.update(id, updates);
      return res?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORGANIZATION_KEYS.list });
      queryClient.invalidateQueries({
        queryKey: ORGANIZATION_KEYS.current(
          user?.uid,
          profile?.organization_id,
          authOrganizationId,
        ),
      });
      toast.success("Organização atualizada com sucesso");
    },
    onError: (error: Error) => {
      toast.error("Erro ao atualizar organização: " + error.message);
    },
  });

  return {
    organizations,
    currentOrganization: currentOrganizationQuery.data,
    isLoading,
    isCurrentOrgLoading: currentOrganizationQuery.isLoading,
    error,
    currentOrgError: currentOrganizationQuery.error,
    createOrganization: createOrganization.mutate,
    updateOrganization: updateOrganization.mutate,
    isCreating: createOrganization.isPending,
    isUpdating: updateOrganization.isPending,
  };
};
