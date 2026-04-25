import { memo, lazy, Suspense } from "react";
import { TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Clock,
  Eye,
  FileText,
  Plus,
  Trash2,
  Edit,
  CheckCircle,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AuditLog } from "@/hooks/useAuditLogs";
import { cn } from "@/lib/utils";

// Localized Labels
const ACTION_LABELS: Record<
  string,
  {
    label: string;
    variant: "default" | "secondary" | "outline" | "destructive";
    icon: any;
  }
> = {
  INSERT: { label: "Criação", variant: "default", icon: Plus },
  UPDATE: { label: "Atualização", variant: "secondary", icon: Edit },
  DELETE: { label: "Exclusão", variant: "destructive", icon: Trash2 },
  ROLE_CREATED: { label: "Função Criada", variant: "default", icon: Plus },
  ROLE_UPDATED: {
    label: "Função Atualizada",
    variant: "secondary",
    icon: Edit,
  },
  ROLE_DELETED: {
    label: "Função Removida",
    variant: "destructive",
    icon: Trash2,
  },
  INVITATION_CREATED: {
    label: "Convite Criado",
    variant: "default",
    icon: Plus,
  },
  INVITATION_USED: {
    label: "Convite Usado",
    variant: "secondary",
    icon: CheckCircle,
  },
  LOGIN_SUCCESS: {
    label: "Login Sucesso",
    variant: "default",
    icon: CheckCircle2,
  },
  LOGIN_FAILURE: {
    label: "Login Falha",
    variant: "destructive",
    icon: AlertCircle,
  },
};

const TABLE_LABELS: Record<string, string> = {
  patients: "Pacientes",
  appointments: "Agendamentos",
  contas_financeiras: "Financeiro",
  profiles: "Perfis",
  user_roles: "Funções",
  session_packages: "Pacotes",
  eventos: "Eventos",
  leads: "Leads",
  exercises: "Exercícios",
  vouchers: "Vouchers",
  auth: "Autenticação",
  report: "Relatórios",
  evolutions: "Evoluções",
};

// Lazy load DiffViewer
const DiffViewer = lazy(() => import("./DiffViewer"));

interface LogTableRowProps {
  log: AuditLog;
}

const LogTableRow = memo(({ log }: LogTableRowProps) => {
  const actionInfo = ACTION_LABELS[log.action] || {
    label: log.action,
    variant: "outline" as const,
    icon: FileText,
  };
  const ActionIcon = actionInfo.icon;
  const isNew = new Date(log.timestamp).getTime() > Date.now() - 5 * 60 * 1000;

  const getRowStyle = () => {
    if (log.action === "DELETE" || log.action === "LOGIN_FAILURE")
      return "bg-destructive/5 hover:bg-destructive/10 dark:bg-destructive/10 dark:hover:bg-destructive/20";
    if (log.action === "INSERT" || log.action === "LOGIN_SUCCESS")
      return "bg-green-500/5 hover:bg-green-500/10 dark:bg-green-500/10 dark:hover:bg-green-500/20";
    return "hover:bg-muted/50";
  };

  return (
    <TableRow
      className={cn("transition-colors", getRowStyle(), isNew && "border-l-4 border-l-primary")}
    >
      <TableCell className="whitespace-nowrap">
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 font-medium text-sm">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            {format(new Date(log.timestamp), "dd/MM/yyyy", { locale: ptBR })}
          </div>
          <div className="text-xs text-muted-foreground ml-5">
            {format(new Date(log.timestamp), "HH:mm", { locale: ptBR })}
          </div>
          {isNew && (
            <Badge
              variant="default"
              className="w-fit text-[10px] h-4 mt-1 bg-primary px-1 animate-pulse"
            >
              NOVO
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">{log.user_name || "Sistema"}</span>
            <span className="text-xs text-muted-foreground truncate max-w-[150px] hidden sm:inline">
              ({log.user_email || "-"})
            </span>
          </div>
          {/* Resumo do que foi alterado */}
          {log.metadata && typeof log.metadata === "object" && (
            <div className="text-xs text-primary mt-1 font-medium bg-primary/5 dark:bg-primary/20 px-2 py-0.5 rounded-md w-fit border border-primary/10">
              {(log.metadata as any).name ||
                (log.metadata as any).patient ||
                (log.metadata as any).description ||
                (log.metadata as any).email ||
                (log.metadata as any).summary ||
                ""}
            </div>
          )}
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={actionInfo.variant} className="gap-1.5 shadow-sm py-1">
          <ActionIcon className="h-3.5 w-3.5" />
          {actionInfo.label}
        </Badge>
      </TableCell>
      <TableCell>
        <code className="text-[11px] bg-muted px-2 py-1 rounded font-mono uppercase tracking-tight">
          {TABLE_LABELS[log.table_name] || log.table_name}
        </code>
      </TableCell>
      <TableCell className="hidden md:table-cell">
        <code className="text-xs text-muted-foreground font-mono">
          {log.record_id?.substring(0, 8) || "-"}...
        </code>
      </TableCell>
      <TableCell className="text-right">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Eye className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Detalhes da Auditoria
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm bg-muted/30 p-4 rounded-lg">
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs uppercase font-bold">Identificação</p>
                  <p className="font-mono">{log.id}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs uppercase font-bold">
                    Registro Afetado
                  </p>
                  <p className="font-mono truncate">{log.record_id || "-"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs uppercase font-bold">
                    Usuário Responsável
                  </p>
                  <p className="font-medium">
                    {log.user_name} ({log.user_email})
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs uppercase font-bold">
                    Ação e Contexto
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge variant={actionInfo.variant}>{actionInfo.label}</Badge>
                    <span className="text-xs font-mono bg-muted px-1.5 rounded">
                      {log.table_name}
                    </span>
                  </div>
                </div>
                {log.ip_address && (
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-xs uppercase font-bold">Origem (IP)</p>
                    <p className="font-mono text-xs">{log.ip_address}</p>
                  </div>
                )}
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-base">Comparação de Alterações</h4>
                  <div className="flex gap-2">
                    <Badge
                      variant="outline"
                      className="bg-green-500/10 text-green-700 border-green-200"
                    >
                      Novo
                    </Badge>
                    <Badge
                      variant="outline"
                      className="bg-destructive/10 text-destructive border-destructive/20"
                    >
                      Antigo
                    </Badge>
                  </div>
                </div>
                <Suspense
                  fallback={
                    <div className="flex flex-col items-center justify-center p-12 gap-2 text-muted-foreground">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <p>Preparando visualização...</p>
                    </div>
                  }
                >
                  <div className="border rounded-lg overflow-hidden bg-card">
                    <DiffViewer
                      oldData={log.old_data as Record<string, unknown>}
                      newData={log.new_data as Record<string, unknown>}
                      changes={log.changes as Record<string, { old: unknown; new: unknown }>}
                    />
                  </div>
                </Suspense>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </TableCell>
    </TableRow>
  );
});

LogTableRow.displayName = "LogTableRow";

export default LogTableRow;
