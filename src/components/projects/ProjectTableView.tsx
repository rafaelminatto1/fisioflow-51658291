import { useMemo, useState } from 'react';
import { useTarefas, Tarefa, TarefaStatus, TarefaPrioridade, STATUS_LABELS, PRIORIDADE_LABELS, PRIORIDADE_COLORS, useUpdateTarefa } from '@/hooks/useTarefas';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar, MoreHorizontal, ArrowUpDown, Search, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ProjectTableViewProps {
    projectId: string;
}

export function ProjectTableView({ projectId }: ProjectTableViewProps) {
    const { data: tarefas, isLoading } = useTarefas();
    const updateTarefa = useUpdateTarefa();
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: keyof Tarefa; direction: 'asc' | 'desc' } | null>(null);

    const projectTarefas = useMemo(() => {
        if (!tarefas) return [];
        let filtered = tarefas.filter(t => t.project_id === projectId);

        if (searchTerm) {
            filtered = filtered.filter(t =>
                t.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                t.descricao?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (sortConfig) {
            filtered.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];

                if (aValue === bValue) return 0;
                // Handle undefined/null values
                if (aValue === undefined || aValue === null) return 1;
                if (bValue === undefined || bValue === null) return -1;

                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return filtered;
    }, [tarefas, projectId, searchTerm, sortConfig]);

    const handleSort = (key: keyof Tarefa) => {
        setSortConfig(current => ({
            key,
            direction: current?.key === key && current.direction === 'asc' ? 'desc' : 'asc',
        }));
    };

    if (isLoading) {
        return <div className="p-8 text-center">Carregando tarefas...</div>;
    }

    return (
        <div className="space-y-4 h-full flex flex-col">
            <div className="flex items-center gap-2">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Filtrar tarefas..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <Button variant="outline" size="sm">
                    <Filter className="mr-2 h-4 w-4" />
                    Filtros
                </Button>
            </div>

            <div className="rounded-md border flex-1 overflow-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[300px]">
                                <Button variant="ghost" className="h-8 p-0 hover:bg-transparent" onClick={() => handleSort('titulo')}>
                                    Tarefa
                                    <ArrowUpDown className="ml-2 h-3 w-3" />
                                </Button>
                            </TableHead>
                            <TableHead>
                                <Button variant="ghost" className="h-8 p-0 hover:bg-transparent" onClick={() => handleSort('status')}>
                                    Status
                                    <ArrowUpDown className="ml-2 h-3 w-3" />
                                </Button>
                            </TableHead>
                            <TableHead>
                                <Button variant="ghost" className="h-8 p-0 hover:bg-transparent" onClick={() => handleSort('prioridade')}>
                                    Prioridade
                                    <ArrowUpDown className="ml-2 h-3 w-3" />
                                </Button>
                            </TableHead>
                            <TableHead>Responsável</TableHead>
                            <TableHead>
                                <Button variant="ghost" className="h-8 p-0 hover:bg-transparent" onClick={() => handleSort('data_vencimento')}>
                                    Prazo
                                    <ArrowUpDown className="ml-2 h-3 w-3" />
                                </Button>
                            </TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {projectTarefas.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    Nenhuma tarefa encontrada neste projeto.
                                </TableCell>
                            </TableRow>
                        ) : (
                            projectTarefas.map((tarefa) => (
                                <TableRow key={tarefa.id}>
                                    <TableCell className="font-medium">
                                        <div className="flex flex-col">
                                            <span>{tarefa.titulo}</span>
                                            {tarefa.tags && tarefa.tags.length > 0 && (
                                                <div className="flex gap-1 mt-1">
                                                    {tarefa.tags.map((tag, i) => (
                                                        <Badge key={i} variant="secondary" className="text-[10px] px-1 py-0 h-4">
                                                            {tag}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 px-2 py-1 text-xs">
                                                    <Badge variant="outline" className="font-normal capitalize cursor-pointer">
                                                        {STATUS_LABELS[tarefa.status]}
                                                    </Badge>
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="start">
                                                {(Object.keys(STATUS_LABELS) as TarefaStatus[]).map((status) => (
                                                    <DropdownMenuItem
                                                        key={status}
                                                        onClick={() => updateTarefa.mutate({ id: tarefa.id, status })}
                                                    >
                                                        {STATUS_LABELS[status]}
                                                    </DropdownMenuItem>
                                                ))}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant="secondary"
                                            className={cn('text-[10px]', PRIORIDADE_COLORS[tarefa.prioridade])}
                                        >
                                            {PRIORIDADE_LABELS[tarefa.prioridade]}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {tarefa.responsavel ? (
                                            <div className="flex items-center gap-2">
                                                <Avatar className="h-6 w-6">
                                                    <AvatarImage src={tarefa.responsavel.avatar_url} />
                                                    <AvatarFallback className="text-[10px]">
                                                        {tarefa.responsavel.full_name?.slice(0, 2).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span className="text-sm text-muted-foreground truncate max-w-[100px]">
                                                    {tarefa.responsavel.full_name?.split(' ')[0]}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-muted-foreground text-xs">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {tarefa.data_vencimento ? (
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Calendar className="h-3 w-3" />
                                                {format(new Date(tarefa.data_vencimento), 'dd/MM/yy', { locale: ptBR })}
                                            </div>
                                        ) : (
                                            <span className="text-muted-foreground text-xs">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
