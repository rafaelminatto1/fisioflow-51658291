import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, XCircle, UserPlus, Search, Filter, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface PreCadastro {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  status: string;
  created_at: string;
  data_agendamento?: string;
}

interface PreCadastroListProps {
    precadastros: PreCadastro[];
    isLoading: boolean;
    onUpdateStatus: (id: string, status: string) => void;
}

export const PreCadastroList = ({ precadastros, isLoading, onUpdateStatus }: PreCadastroListProps) => {
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('todos');
    const [selectedPreCadastro, setSelectedPreCadastro] = useState<PreCadastro | null>(null);

    const filteredPrecadastros = precadastros?.filter(p => {
        const matchesSearch =
            p.nome?.toLowerCase().includes(search.toLowerCase()) ||
            p.email?.toLowerCase().includes(search.toLowerCase());

        const matchesStatus = statusFilter === 'todos' || p.status === statusFilter;

        return matchesSearch && matchesStatus;
    }) || [];

    const getStatusBadge = (status: string) => {
        const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
            pendente: { variant: 'secondary', label: 'Pendente' },
            aprovado: { variant: 'default', label: 'Aprovado' },
            rejeitado: { variant: 'destructive', label: 'Rejeitado' },
            convertido: { variant: 'outline', label: 'Convertido' }
        };
        const config = variants[status] || variants.pendente;
        return <Badge variant={config.variant}>{config.label}</Badge>;
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <CardTitle>Pré-cadastros Recebidos</CardTitle>
                        <CardDescription>Gerencie os pré-cadastros de novos pacientes</CardDescription>
                    </div>
                    <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por nome ou email..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-8"
                            />
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-full md:w-[150px]">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="todos">Todos</SelectItem>
                                <SelectItem value="pendente">Pendentes</SelectItem>
                                <SelectItem value="aprovado">Aprovados</SelectItem>
                                <SelectItem value="rejeitado">Rejeitados</SelectItem>
                                <SelectItem value="convertido">Convertidos</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                ) : filteredPrecadastros.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        Nenhum pré-cadastro encontrado
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nome</TableHead>
                                <TableHead>Contato</TableHead>
                                <TableHead>Data</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredPrecadastros.map((p) => (
                                <TableRow key={p.id}>
                                    <TableCell className="font-medium">{p.nome}</TableCell>
                                    <TableCell>
                                        <div className="text-sm">
                                            {p.email && <div>{p.email}</div>}
                                            {p.telefone && <div className="text-muted-foreground">{p.telefone}</div>}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {format(new Date(p.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                                    </TableCell>
                                    <TableCell>{getStatusBadge(p.status)}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => setSelectedPreCadastro(p)}
                                                title="Ver detalhes"
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Button>

                                            {p.status === 'pendente' && (
                                                <>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => onUpdateStatus(p.id, 'aprovado')}
                                                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                                    >
                                                        <CheckCircle className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => onUpdateStatus(p.id, 'rejeitado')}
                                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                    >
                                                        <XCircle className="h-4 w-4" />
                                                    </Button>
                                                </>
                                            )}
                                            {p.status === 'aprovado' && (
                                                <Button size="sm">
                                                    <UserPlus className="h-4 w-4 mr-1" />
                                                    Converter
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>

            <Dialog open={!!selectedPreCadastro} onOpenChange={(open) => !open && setSelectedPreCadastro(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Detalhes do Pré-cadastro</DialogTitle>
                    </DialogHeader>
                    {selectedPreCadastro && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <h4 className="font-medium text-sm text-muted-foreground">Nome</h4>
                                    <p>{selectedPreCadastro.nome}</p>
                                </div>
                                <div>
                                    <h4 className="font-medium text-sm text-muted-foreground">Data</h4>
                                    <p>{format(new Date(selectedPreCadastro.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</p>
                                </div>
                                <div className="col-span-2">
                                    <h4 className="font-medium text-sm text-muted-foreground">Email</h4>
                                    <p>{selectedPreCadastro.email}</p>
                                </div>
                                <div className="col-span-2">
                                    <h4 className="font-medium text-sm text-muted-foreground">Telefone</h4>
                                    <p>{selectedPreCadastro.telefone}</p>
                                </div>
                                {selectedPreCadastro.data_nascimento && (
                                    <div>
                                        <h4 className="font-medium text-sm text-muted-foreground">Data Nasc.</h4>
                                        <p>{selectedPreCadastro.data_nascimento}</p>
                                    </div>
                                )}
                                {selectedPreCadastro.cpf && (
                                    <div>
                                        <h4 className="font-medium text-sm text-muted-foreground">CPF</h4>
                                        <p>{selectedPreCadastro.cpf}</p>
                                    </div>
                                )}
                                {selectedPreCadastro.endereco && (
                                    <div className="col-span-2">
                                        <h4 className="font-medium text-sm text-muted-foreground">Endereço</h4>
                                        <p>{selectedPreCadastro.endereco}</p>
                                    </div>
                                )}
                                {selectedPreCadastro.queixa_principal && (
                                    <div className="col-span-2">
                                        <h4 className="font-medium text-sm text-muted-foreground">Queixa Principal</h4>
                                        <p className="bg-muted p-3 rounded-md text-sm">{selectedPreCadastro.queixa_principal}</p>
                                    </div>
                                )}
                            </div>
                            <div className="flex justify-end gap-2 pt-4">
                                <Button variant="outline" onClick={() => setSelectedPreCadastro(null)}>
                                    Fechar
                                </Button>
                                {selectedPreCadastro.status === 'pendente' && (
                                    <Button onClick={() => {
                                        onUpdateStatus(selectedPreCadastro.id, 'aprovado');
                                        setSelectedPreCadastro(null);
                                    }}>
                                        Aprovar Cadastro
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </Card>
    );
};
