/**
 * Helpers para operações relacionadas ao usuário e organização
 */
import { profileApi } from "@/api/v2";
import { fisioLogger as logger } from "@/lib/errors/logger";

export async function getUserOrganizationId(): Promise<string | null> {
  try {
    const result = await profileApi.me();
    const orgId = result.data?.organization_id || result.data?.organizationId || null;
    return orgId;
  } catch (error) {
    logger.error("Erro ao buscar organização do usuário", error, "userHelpers");
    return null;
  }
}

export async function requireUserOrganizationId(): Promise<string> {
  const organizationId = await getUserOrganizationId();
  if (!organizationId) {
    throw new Error("Organização não encontrada. Você precisa estar vinculado a uma organização.");
  }
  return organizationId;
}
