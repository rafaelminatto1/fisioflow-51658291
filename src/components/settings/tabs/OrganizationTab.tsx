import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useOrganizations } from "@/hooks/useOrganizations";
import { useOrganizationMembers } from "@/hooks/useOrganizationMembers";
import { Building2, Users, Settings, Plus, Mail, MessageSquare, Loader2, Save } from "lucide-react";
import { InviteUserModal } from "@/components/admin/InviteUserModal";
import { Badge } from "@/components/ui/badge";
import { safeFormat } from "@/lib/utils";

export function OrganizationTab() {
  const { currentOrganization, updateOrganization, isUpdating, isCurrentOrgLoading } =
    useOrganizations();
  const { members, isLoading: membersLoading } = useOrganizationMembers(currentOrganization?.id);

  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    whatsapp_enabled: false,
    email_enabled: false,
  });

  useEffect(() => {
    if (currentOrganization) {
      setFormData({
        name: currentOrganization.name || "",
        slug: currentOrganization.slug || "",
        whatsapp_enabled: !!(currentOrganization.settings as any)?.whatsapp_enabled,
        email_enabled: !!(currentOrganization.settings as any)?.email_enabled,
      });
    }
  }, [currentOrganization]);

  const handleSave = async () => {
    if (!currentOrganization?.id) return;

    try {
      await updateOrganization({
        id: currentOrganization.id,
        name: formData.name,
        slug: formData.slug,
        settings: {
          ...(currentOrganization.settings as object),
          whatsapp_enabled: formData.whatsapp_enabled,
          email_enabled: formData.email_enabled,
        },
      });
    } catch (error) {
      console.error("Erro ao atualizar organização:", error);
    }
  };

  if (isCurrentOrgLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Informações da Clínica */}
      <Card className="bg-gradient-card border-border shadow-card overflow-hidden">
        <CardHeader className="border-b border-border p-4 sm:p-6 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-primary/10 text-primary">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-xl">Dados da Clínica</CardTitle>
                <CardDescription>Informações fundamentais da sua organização</CardDescription>
              </div>
            </div>
            <Badge
              variant={currentOrganization?.active ? "default" : "secondary"}
              className="rounded-full px-3"
            >
              {currentOrganization?.active ? "Ativa" : "Inativa"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label
                htmlFor="org-name"
                className="text-sm font-bold text-slate-500 uppercase tracking-wider"
              >
                Nome da Clínica
              </Label>
              <Input
                id="org-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Activity Fisioterapia"
                className="rounded-xl border-slate-200 h-11"
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="org-slug"
                className="text-sm font-bold text-slate-500 uppercase tracking-wider"
              >
                Identificador (Slug)
              </Label>
              <Input
                id="org-slug"
                value={formData.slug}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    slug: e.target.value.toLowerCase().replace(/\s+/g, "-"),
                  })
                }
                placeholder="ex: activity-fisio"
                className="rounded-xl border-slate-200 h-11"
                disabled // Slug usually shouldn't change easily as it affects URLs
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 uppercase tracking-widest">
              Comunicação e Automação
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-emerald-100 text-emerald-600">
                    <MessageSquare className="h-4 w-4" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold">WhatsApp</p>
                    <p className="text-xs text-muted-foreground">Envio de lembretes</p>
                  </div>
                </div>
                <Switch
                  checked={formData.whatsapp_enabled}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, whatsapp_enabled: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-blue-100 text-blue-600">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold">E-mail</p>
                    <p className="text-xs text-muted-foreground">Relatórios e recibos</p>
                  </div>
                </div>
                <Switch
                  checked={formData.email_enabled}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, email_enabled: checked })
                  }
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button
              onClick={handleSave}
              disabled={isUpdating}
              className="rounded-xl h-11 px-8 gap-2 bg-slate-900 text-white shadow-xl shadow-slate-900/10 font-bold uppercase tracking-wider"
            >
              {isUpdating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Salvar Alterações
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Membros da Equipe */}
      <Card className="bg-gradient-card border-border shadow-card overflow-hidden">
        <CardHeader className="border-b border-border p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-500">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-xl">Equipe & Membros</CardTitle>
                <CardDescription>Gerencie quem tem acesso à sua clínica</CardDescription>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => setInviteModalOpen(true)}
              className="rounded-full gap-2"
            >
              <Plus className="h-4 w-4" />
              Novo Membro
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <InviteUserModal open={inviteModalOpen} onOpenChange={setInviteModalOpen} />

          {membersLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {members?.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-500">
                      {(member as any).name?.charAt(0) || "U"}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-slate-900 dark:text-white">
                        {(member as any).name || `Membro ${member.user_id.slice(0, 4)}`}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Entrou em: {safeFormat(member.joined_at, "dd/MM/yyyy")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant="outline"
                      className="capitalize font-medium rounded-lg px-2.5 py-0.5 bg-slate-50 dark:bg-slate-900"
                    >
                      {member.role}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Settings className="h-4 w-4 text-slate-400" />
                    </Button>
                  </div>
                </div>
              ))}

              {(!members || members.length === 0) && (
                <div className="text-center py-12 bg-slate-50/50 dark:bg-slate-900/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                  <Users className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm font-medium text-slate-500">Nenhum membro encontrado</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
