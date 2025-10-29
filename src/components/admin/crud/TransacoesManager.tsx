import { useState } from 'react';
import { useTransacoes } from '@/hooks/useTransacoes';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function TransacoesManager() {
  const { data: transacoes = [], isLoading } = useTransacoes();
  const [search, setSearch] = useState('');

  const filteredTransacoes = transacoes.filter(t => 
    t.descricao?.toLowerCase().includes(search.toLowerCase()) ||
    t.tipo?.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      'concluido': 'default',
      'pendente': 'secondary',
      'cancelado': 'destructive',
    };
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
  };

  return (
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
                <TableHead>Stripe ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransacoes.map((transacao) => (
                <TableRow key={transacao.id}>
                  <TableCell>
                    {format(new Date(transacao.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                  </TableCell>
                  <TableCell className="font-medium">{transacao.tipo}</TableCell>
                  <TableCell>{transacao.descricao || '-'}</TableCell>
                  <TableCell>
                    R$ {Number(transacao.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>{getStatusBadge(transacao.status)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono">
                    {transacao.stripe_payment_intent_id ? 
                      transacao.stripe_payment_intent_id.substring(0, 20) + '...' : 
                      '-'
                    }
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
}
