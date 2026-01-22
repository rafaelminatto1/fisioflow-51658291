import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/web/ui/table';
import { Button } from '@/components/shared/ui/button';
import { Badge } from '@/components/shared/ui/badge';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { useFinancial } from '@/hooks/useFinancial';
import { formatCurrency } from '@/utils/format';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const DelinquencyList: React.FC = () => {
    const { allTransactions, markAsPaid, isUpdating } = useFinancial();

    // Filtrar apenas pendentes
    const pendingTransactions = React.useMemo(() => {
        return allTransactions.filter(t => t.status === 'pendente' || t.status === 'atrasado');
    }, [allTransactions]);

    if (pendingTransactions.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg font-medium flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        Controle de Inadimplência
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground text-sm">Nenhuma pendência financeira encontrada.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg font-medium flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-amber-500" />
                    Controle de Inadimplência
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Descrição</TableHead>
                                <TableHead>Data</TableHead>
                                <TableHead>Valor</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {pendingTransactions.map((transaction) => (
                                <TableRow key={transaction.id}>
                                    <TableCell className="font-medium">
                                        {transaction.descricao}
                                        {transaction.metadata?.patient_name && (
                                            <span className="block text-xs text-muted-foreground">
                                                Paciente: {String(transaction.metadata.patient_name)}
                                            </span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {transaction.created_at ? format(new Date(transaction.created_at), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                                    </TableCell>
                                    <TableCell>{formatCurrency(transaction.valor)}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                                            Pendente
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => markAsPaid(transaction.id)}
                                            disabled={isUpdating}
                                            className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                        >
                                            <CheckCircle2 className="h-4 w-4 mr-1" />
                                            Baixar
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
};
