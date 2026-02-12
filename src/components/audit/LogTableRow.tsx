
import { memo, lazy, Suspense } from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Clock,
    Eye,
    FileText,
    Plus,
    Trash2,
    Edit,
    CheckCircle,
    Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AuditLog } from '@/hooks/useAuditLogs';

// Localized Labels (could be moved to a shared constant file)
const ACTION_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive'; icon: typeof Plus }> = {
    INSERT: { label: 'Criação', variant: 'default', icon: Plus },
    UPDATE: { label: 'Atualização', variant: 'secondary', icon: Edit },
    DELETE: { label: 'Exclusão', variant: 'destructive', icon: Trash2 },
    ROLE_CREATED: { label: 'Função Criada', variant: 'default', icon: Plus },
    ROLE_UPDATED: { label: 'Função Atualizada', variant: 'secondary', icon: Edit },
    ROLE_DELETED: { label: 'Função Removida', variant: 'destructive', icon: Trash2 },
    INVITATION_CREATED: { label: 'Convite Criado', variant: 'default', icon: Plus },
    INVITATION_USED: { label: 'Convite Usado', variant: 'secondary', icon: CheckCircle },
};

const TABLE_LABELS: Record<string, string> = {
    patients: 'Pacientes',
    appointments: 'Agendamentos',
    contas_financeiras: 'Financeiro',
    profiles: 'Perfis',
    user_roles: 'Funções',
    session_packages: 'Pacotes',
    eventos: 'Eventos',
    leads: 'Leads',
    exercises: 'Exercícios',
    vouchers: 'Vouchers',
};

// Lazy load DiffViewer
const DiffViewer = lazy(() => import('./DiffViewer'));

interface LogTableRowProps {
    log: AuditLog;
}

const LogTableRow = memo(({ log }: LogTableRowProps) => {
    const actionInfo = ACTION_LABELS[log.action] || {
        label: log.action,
        variant: 'outline' as const,
        icon: FileText,
    };
    const ActionIcon = actionInfo.icon;

    return (
        <TableRow>
            <TableCell className="whitespace-nowrap">
                <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    {log.timestamp
                        ? format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm:ss', {
                            locale: ptBR,
                        })
                        : '-'}
                </div>
            </TableCell>
            <TableCell>
                <div>
                    <div className="font-medium">
                        {log.user_name || 'Sistema'}
                    </div>
                    <div className="text-sm text-muted-foreground">
                        {log.user_email || '-'}
                    </div>
                </div>
            </TableCell>
            <TableCell>
                <Badge variant={actionInfo.variant} className="gap-1">
                    <ActionIcon className="h-3 w-3" />
                    {actionInfo.label}
                </Badge>
            </TableCell>
            <TableCell>
                <code className="text-sm bg-muted px-2 py-1 rounded">
                    {TABLE_LABELS[log.table_name] || log.table_name}
                </code>
            </TableCell>
            <TableCell>
                <code className="text-xs text-muted-foreground">
                    {log.record_id?.substring(0, 8) || '-'}...
                </code>
            </TableCell>
            <TableCell className="text-right">
                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Detalhes do Log</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-muted-foreground">ID:</span>
                                    <code className="ml-2 font-mono">{log.id}</code>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Registro:</span>
                                    <code className="ml-2 font-mono">{log.record_id || '-'}</code>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Ação:</span>
                                    <Badge variant={actionInfo.variant} className="ml-2">
                                        {actionInfo.label}
                                    </Badge>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Tabela:</span>
                                    <span className="ml-2">{TABLE_LABELS[log.table_name] || log.table_name}</span>
                                </div>
                            </div>

                            <div className="border-t pt-4">
                                <h4 className="font-semibold mb-3">Alterações</h4>
                                <Suspense fallback={<div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin" /></div>}>
                                    <DiffViewer
                                        oldData={log.old_data as Record<string, unknown>}
                                        newData={log.new_data as Record<string, unknown>}
                                        changes={log.changes as Record<string, { old: unknown; new: unknown }>}
                                    />
                                </Suspense>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </TableCell>
        </TableRow>
    );
});

LogTableRow.displayName = 'LogTableRow';

export default LogTableRow;
