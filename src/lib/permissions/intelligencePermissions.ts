import { useState, useEffect } from "react";
import { UserRole } from "@/types/auth";

export type IntelligenceTabId = "analytics" | "copilot" | "knowledge" | "studio";

export interface IntelligenceTabConfig {
  id: IntelligenceTabId;
  label: string;
  description: string;
  adminOnlyByDefault?: boolean;
}

export const INTELLIGENCE_TABS_CONFIG: IntelligenceTabConfig[] = [
  {
    id: "analytics",
    label: "Analytics & Métricas",
    description: "Métricas financeiras, no-show, retenção e BI de Negócio & Performance.",
    adminOnlyByDefault: true,
  },
  {
    id: "copilot",
    label: "Copiloto Clínico",
    description: "Chat e assistente em tempo real com suporte à decisão clínica.",
  },
  {
    id: "knowledge",
    label: "Base de Conhecimento",
    description: "RAG em protocolos da clínica e busca em literatura científica.",
  },
  {
    id: "studio",
    label: "Studio IA & Fisio Brain",
    description: "Scribe de áudio, evoluções SOAP, biomecânica e histórico inteligente.",
  },
];

export type RolePermissionsMap = Record<UserRole, IntelligenceTabId[]>;

export const DEFAULT_ROLE_PERMISSIONS: RolePermissionsMap = {
  admin: ["analytics", "copilot", "knowledge", "studio"],
  fisioterapeuta: ["copilot", "knowledge", "studio"],
  estagiario: ["copilot", "knowledge", "studio"],
  recepcionista: ["knowledge"],
  parceiro: ["knowledge"],
  pending: [],
};

const STORAGE_KEY = "fisioflow_intelligence_permissions_v1";
const PERMISSION_CHANGE_EVENT = "fisioflow_intelligence_permissions_changed";

export function getStoredRolePermissions(): RolePermissionsMap {
  try {
    const item = localStorage.getItem(STORAGE_KEY);
    if (!item) return DEFAULT_ROLE_PERMISSIONS;
    const parsed = JSON.parse(item);
    return {
      ...DEFAULT_ROLE_PERMISSIONS,
      ...parsed,
    };
  } catch (error) {
    console.error("Erro ao carregar permissões de inteligência:", error);
    return DEFAULT_ROLE_PERMISSIONS;
  }
}

export function saveStoredRolePermissions(newPermissions: RolePermissionsMap): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newPermissions));
    window.dispatchEvent(new Event(PERMISSION_CHANGE_EVENT));
  } catch (error) {
    console.error("Erro ao salvar permissões de inteligência:", error);
  }
}

export function resetStoredRolePermissions(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event(PERMISSION_CHANGE_EVENT));
  } catch (error) {
    console.error("Erro ao resetar permissões de inteligência:", error);
  }
}

export function hasTabAccess(role: UserRole | undefined, tabId: IntelligenceTabId): boolean {
  if (!role || role === "pending") return false;
  if (role === "admin") return true; // Admin sempre tem acesso total
  const permissions = getStoredRolePermissions();
  const allowedTabs = permissions[role] || DEFAULT_ROLE_PERMISSIONS[role] || [];
  return allowedTabs.includes(tabId);
}

export function useIntelligencePermissions(role: UserRole | undefined) {
  const [permissions, setPermissions] = useState<RolePermissionsMap>(getStoredRolePermissions);

  useEffect(() => {
    const handleStorageChange = () => {
      setPermissions(getStoredRolePermissions());
    };

    window.addEventListener(PERMISSION_CHANGE_EVENT, handleStorageChange);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener(PERMISSION_CHANGE_EVENT, handleStorageChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const currentRoleAllowedTabs = role
    ? permissions[role] || DEFAULT_ROLE_PERMISSIONS[role] || []
    : [];

  return {
    permissions,
    allowedTabs: currentRoleAllowedTabs,
    isTabAllowed: (tabId: IntelligenceTabId) =>
      role === "admin" || currentRoleAllowedTabs.includes(tabId),
    savePermissions: (newMap: RolePermissionsMap) => saveStoredRolePermissions(newMap),
    resetPermissions: () => resetStoredRolePermissions(),
  };
}
