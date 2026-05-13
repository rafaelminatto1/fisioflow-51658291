import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { pendingUsersApi } from "@/api/v2/admin";
import { PageLayout, PageContainer } from "@/components/layout/PageLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Clock, CheckCircle2, Loader2, RefreshCw, UserX } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { UserRole } from "@/types/auth";

interface PendingUser {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  role: string;
  roles: string[];
  created_at: string;
}

const ROLE_OPTIONS: { value: UserRole; label: string; description: string }[] = [
  { value: "fisioterapeuta", label: "Fisioterapeuta", description: "Acesso clínico completo" },
  { value: "estagiario", label: "Estagiário", description: "Acesso clínico supervisionado" },
  { value: "recepcionista", label: "Recepcionista", description: "Agenda e cadastros" },
  { value: "paciente", label: "Paciente", description: "Portal do paciente" },
  { value: "parceiro", label: "Parceiro", description: "Acesso externo limitado" },
  { value: "admin", label: "Administrador", description: "Acesso total ao sistema" },
];

export default function PendingUsersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRoles, setSelectedRoles] = useState<Record<string, UserRole[]>>({});

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin", "pending-users"],
    queryFn: async () => {
      const res = await pendingUsersApi.list();
      return (res.data ?? []) as PendingUser[];
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ profileId, roles }: { profileId: string; roles: UserRole[] }) => {
      const primaryRole = roles.includes("admin") ? "admin" : roles[0];
      await pendingUsersApi.approve(profileId, primaryRole, roles);
    },
    onSuccess: (_, { profileId }) => {
      toast({ title: "Usuário aprovado", description: "Acesso liberado com sucesso." });
      queryClient.invalidateQueries({ queryKey: ["admin", "pending-users"] });
      setSelectedRoles((prev) => {
        const next = { ...prev };
        delete next[profileId];
        return next;
      });
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível aprovar o usuário.", variant: "destructive" });
    },
  });

  const toggleRole = (profileId: string, role: UserRole) => {
    setSelectedRoles((prev) => {
      const current = prev[profileId] ?? [];
      const has = current.includes(role);
      return {
        ...prev,
        [profileId]: has ? current.filter((r) => r !== role) : [...current, role],
      };
    });
  };

  const pendingUsers = data ?? [];

  return (
    <PageLayout>
      <PageContainer>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Usuários Pendentes</h1>
              <p className="text-sm text-slate-500 mt-1">
                Defina os papéis de cada novo usuário para liberar o acesso ao sistema.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          </div>

          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}

          {!isLoading && pendingUsers.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
                <p className="text-slate-600 font-medium">Nenhum usuário pendente no momento.</p>
                <p className="text-slate-400 text-sm mt-1">Todos os cadastros foram aprovados.</p>
              </CardContent>
            </Card>
          )}

          <div className="space-y-4">
            {pendingUsers.map((u) => {
              const chosenRoles = selectedRoles[u.id] ?? [];
              const canApprove = chosenRoles.length > 0;

              return (
                <Card key={u.id} className="border-amber-200/60">
                  <CardContent className="py-5">
                    <div className="flex flex-col gap-5">
                      {/* Cabeçalho do usuário */}
                      <div className="flex items-center gap-3">
                        <div className="h-11 w-11 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                          <Clock className="h-5 w-5 text-amber-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-slate-800">{u.full_name}</p>
                          <p className="text-sm text-slate-500">{u.email}</p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Cadastro em{" "}
                            {format(new Date(u.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                        <Badge variant="outline" className="border-amber-300 text-amber-700 bg-amber-50 shrink-0">
                          Pendente
                        </Badge>
                      </div>

                      {/* Seleção de papéis */}
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                          Selecione um ou mais papéis
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {ROLE_OPTIONS.map((opt) => {
                            const checked = chosenRoles.includes(opt.value);
                            return (
                              <label
                                key={opt.value}
                                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                                  checked
                                    ? "bg-brand-blue/5 border-brand-blue/30"
                                    : "bg-white border-slate-200 hover:border-slate-300"
                                }`}
                              >
                                <Checkbox
                                  id={`${u.id}-${opt.value}`}
                                  checked={checked}
                                  onCheckedChange={() => toggleRole(u.id, opt.value)}
                                  className="mt-0.5 shrink-0"
                                />
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-slate-700">{opt.label}</p>
                                  <p className="text-xs text-slate-400">{opt.description}</p>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      {/* Ação */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                        <div className="flex flex-wrap gap-1.5">
                          {chosenRoles.map((r) => (
                            <Badge key={r} className="bg-brand-blue/10 text-brand-blue border-brand-blue/20 text-xs">
                              {ROLE_OPTIONS.find((o) => o.value === r)?.label ?? r}
                            </Badge>
                          ))}
                          {chosenRoles.length === 0 && (
                            <span className="text-xs text-slate-400 italic">Nenhum papel selecionado</span>
                          )}
                        </div>
                        <Button
                          size="sm"
                          disabled={!canApprove || approveMutation.isPending}
                          onClick={() =>
                            approveMutation.mutate({ profileId: u.id, roles: chosenRoles })
                          }
                          className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                        >
                          {approveMutation.isPending ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          )}
                          <span className="ml-1.5">Aprovar e Liberar Acesso</span>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </PageContainer>
    </PageLayout>
  );
}
