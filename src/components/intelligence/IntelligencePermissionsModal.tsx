import { useState } from "react";
import { Shield, Lock, RotateCcw, Check, UserCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { UserRole } from "@/types/auth";
import {
  INTELLIGENCE_TABS_CONFIG,
  RolePermissionsMap,
  useIntelligencePermissions,
  IntelligenceTabId,
} from "@/lib/permissions/intelligencePermissions";

interface IntelligencePermissionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ROLES_TO_CONFIG: Array<{ role: UserRole; label: string; badgeColor: string }> = [
  { role: "admin", label: "Administrador", badgeColor: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300" },
  { role: "fisioterapeuta", label: "Fisioterapeuta", badgeColor: "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300" },
  { role: "estagiario", label: "Estagiário", badgeColor: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" },
  { role: "recepcionista", label: "Recepcionista", badgeColor: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" },
  { role: "parceiro", label: "Parceiro", badgeColor: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300" },
];

export function IntelligencePermissionsModal({
  open,
  onOpenChange,
}: IntelligencePermissionsModalProps) {
  const { permissions, savePermissions, resetPermissions } = useIntelligencePermissions("admin");
  const [draftPermissions, setDraftPermissions] = useState<RolePermissionsMap>(permissions);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleToggle = (role: UserRole, tabId: IntelligenceTabId) => {
    if (role === "admin") return; // Admin sempre tem acesso

    setDraftPermissions((prev) => {
      const currentTabs = prev[role] || [];
      const hasTab = currentTabs.includes(tabId);
      const updatedTabs = hasTab
        ? currentTabs.filter((id) => id !== tabId)
        : [...currentTabs, tabId];

      return {
        ...prev,
        [role]: updatedTabs,
      };
    });
  };

  const handleSave = () => {
    savePermissions(draftPermissions);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onOpenChange(false);
    }, 1000);
  };

  const handleReset = () => {
    resetPermissions();
    setDraftPermissions(useIntelligencePermissions("admin").permissions);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-teal-500/10 text-teal-600">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">
                Permissões das Abas de IA & Inteligência
              </DialogTitle>
              <DialogDescription>
                Selecione o que cada função (Role) da clínica pode acessar na Central de Inteligência.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4 space-y-6">
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
            <Lock className="w-4 h-4 shrink-0" />
            <span>
              <strong>Nota de Segurança:</strong> Apenas o perfil <strong>Administrador</strong> tem acesso por padrão à aba <strong>Analytics & Métricas (Negócio & Performance)</strong>. Outras funções exigem liberação explícita.
            </span>
          </div>

          <div className="border rounded-xl divide-y overflow-hidden shadow-sm">
            {ROLES_TO_CONFIG.map(({ role, label, badgeColor }) => (
              <div key={role} className="p-4 bg-card space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-muted-foreground" />
                    <span className="font-semibold text-sm">{label}</span>
                    <Badge variant="outline" className={`text-[10px] uppercase font-bold border-none ${badgeColor}`}>
                      {role}
                    </Badge>
                  </div>
                  {role === "admin" && (
                    <span className="text-xs text-muted-foreground italic flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Acesso total (Inalterável)
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {INTELLIGENCE_TABS_CONFIG.map((tab) => {
                    const isAllowed = role === "admin" || (draftPermissions[role] || []).includes(tab.id);
                    return (
                      <div
                        key={tab.id}
                        className={`flex items-center justify-between p-3 rounded-lg border text-xs transition-colors ${
                          isAllowed ? "bg-teal-50/50 border-teal-200 dark:bg-teal-950/20 dark:border-teal-800/40" : "bg-muted/30 border-muted"
                        }`}
                      >
                        <div className="space-y-0.5 max-w-[80%]">
                          <span className="font-medium text-foreground block">{tab.label}</span>
                          <span className="text-[11px] text-muted-foreground line-clamp-1">
                            {tab.description}
                          </span>
                        </div>
                        <Switch
                          checked={isAllowed}
                          disabled={role === "admin"}
                          onCheckedChange={() => handleToggle(role, tab.id)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between gap-2 border-t pt-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="text-xs text-muted-foreground gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Restaurar Padrões
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              className="bg-teal-600 hover:bg-teal-700 text-white gap-1"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4" /> Salvo!
                </>
              ) : (
                "Salvar Permissões"
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
