import { useState } from 'react';
import { useTransacoes, useDeleteTransacao, type Transacao } from '@/hooks/useTransacoes';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Edit, Trash2 } from 'lucide-react';
import { TransacaoModal } from './TransacaoModal';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function TransacoesManager() {
  const { data: transacoes = [], isLoading } = useTransacoes();
  const deleteMutation = useDeleteTransacao();
  const [search, setSearch] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [editTransacao, setEditTransacao] = useState<Transacao | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filteredTransacoes = transacoes.filter(t => 
    t.descricao?.toLowerCase().includes(search.toLowerCase()) ||
    t.tipo?.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = () => {
    if (deleteId) {
      deleteMutation.mutate(deleteId);
      setDeleteId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      'concluido': 'default',
      'pendente': 'secondary',
      'cancelado': 'destructive',
    };
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const getTipoBadge = (tipo: string) => {
    const colors: Record<string, string> = {
      'receita': 'bg-green-500/10 text-green-600 border-green-500/20',
      'despesa': 'bg-red-500/10 text-red-600 border-red-500/20',
      'reembolso': 'bg-orange-500/10 text-orange-600 border-orange-500/20',
      'pacote': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
      'sessao_avulsa': 'bg-purple-500/10 text-purple-600 border-purple-500/20',
    };
    return (
      <Badge variant="outline" className={colors[tipo] || ''}>
        {tipo.replace('_', ' ')}
      </Badge>
    );
  };

  return (
    <>
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por descrição ou tipo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <Button onClick={() => setShowNewModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Transação
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Carregando...</div>
        ) : filteredTransacoes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {search ? 'Nenhuma transação encontrada' : 'Nenhuma transação registrada'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransacoes.map((transacao) => (
                  <TableRow key={transacao.id}>
                    <TableCell>
                      {format(new Date(transacao.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </TableCell>
                    <TableCell>{getTipoBadge(transacao.tipo)}</TableCell>
                    <TableCell>{transacao.descricao || '-'}</TableCell>
                    <TableCell className="font-medium">
                      R$ {Number(transacao.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>{getStatusBadge(transacao.status)}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditTransacao(transacao)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteId(transacao.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <TransacaoModal
        isOpen={showNewModal || !!editTransacao}
        onClose={() => {
          setShowNewModal(false);
          setEditTransacao(null);
        }}
        transacao={editTransacao || undefined}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
