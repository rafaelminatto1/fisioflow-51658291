import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOrganizationMembers } from "@/hooks/useOrganizationMembers";
import { useOrganizations } from "@/hooks/useOrganizations";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/contexts/AuthContext";
import { MemberPhoneInline } from "@/components/organization/MemberPhoneInline";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { Search, UserPlus } from "lucide-react";

interface MembersManagerProps {
  onInviteClick?: () => void;
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  fisioterapeuta: "Fisioterapeuta",
  estagiario: "Estagiário",
  recepcionista: "Recepcionista",
  paciente: "Paciente",
};

// Roles atribuíveis pela tela de membros (equipe). Paciente não é atribuído aqui.
const ASSIGNABLE_ROLES = [
  "admin",
  "fisioterapeuta",
  "estagiario",
  "recepcionista",
] as const;
type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

type MemberRow = {
  id: string;
  user_id: string;
  role: string;
  profiles?: { full_name?: string | null; email?: string | null; phone?: string | null };
};

export function MembersManager({ onInviteClick }: MembersManagerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const { currentOrganization } = useOrganizations();
  const { members, isLoading, updateMemberPhone, isUpdatingPhone, updateMemberRole, isUpdating } =
    useOrganizationMembers(currentOrganization?.id);
  const { isAdmin } = usePermissions();
  const { user } = useAuth();

  const rows = ((members ?? []) as MemberRow[]).map((member) => ({
    ...member,
    name: member.profiles?.full_name ?? member.profiles?.email ?? member.user_id,
    email: member.profiles?.email ?? "",
    phone: member.profiles?.phone ?? null,
  }));

  const filteredMembers = rows.filter(
    (member) =>
      member.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 max-w-md"
          />
        </div>
        <Button onClick={onInviteClick} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Convidar Usuário
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Membros Ativos ({filteredMembers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                    {member.name?.charAt(0).toUpperCase() || "U"}
                  </div>
                  <div>
                    <p className="font-medium">{member.name}</p>
                    <p className="text-sm text-muted-foreground">{member.email}</p>
                    <MemberPhoneInline
                      phone={member.phone}
                      canEdit={isAdmin}
                      isSaving={isUpdatingPhone}
                      onSave={(phone) => updateMemberPhone({ userId: member.user_id, phone })}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {isAdmin && user?.uid !== member.user_id ? (
                    <Select
                      value={
                        ASSIGNABLE_ROLES.includes(member.role as AssignableRole)
                          ? member.role
                          : undefined
                      }
                      onValueChange={(role) =>
                        updateMemberRole({ id: member.id, role: role as AssignableRole })
                      }
                      disabled={isUpdating}
                    >
                      <SelectTrigger className="w-[168px]">
                        <SelectValue placeholder={ROLE_LABELS[member.role] ?? member.role} />
                      </SelectTrigger>
                      <SelectContent>
                        {ASSIGNABLE_ROLES.map((r) => (
                          <SelectItem key={r} value={r}>
                            {ROLE_LABELS[r]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge
                      variant={member.role === "admin" ? "default" : "secondary"}
                      className="capitalize"
                    >
                      {ROLE_LABELS[member.role] ?? member.role}
                    </Badge>
                  )}
                </div>
              </div>
            ))}

            {!filteredMembers.length && (
              <div className="text-center py-12 border-2 border-dashed rounded-lg bg-muted/30">
                <p className="text-muted-foreground font-medium">Nenhum usuário encontrado</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Tente ajustar seus filtros de busca.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
