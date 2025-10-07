import { useParams, useNavigate } from 'react-router-dom';
import { useEvento } from '@/hooks/useEventos';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Calendar, MapPin, DollarSign, Edit } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, LoadingSkeleton } from '@/components/ui';
import { PrestadoresTab } from '@/components/eventos/PrestadoresTab';
import { ChecklistTab } from '@/components/eventos/ChecklistTab';
import { ParticipantesTab } from '@/components/eventos/ParticipantesTab';
import { FinanceiroTab } from '@/components/eventos/FinanceiroTab';
import { EditEventoModal } from '@/components/eventos/EditEventoModal';
import { useState } from 'react';

const statusColors = {
  AGENDADO: 'bg-blue-500',
  EM_ANDAMENTO: 'bg-yellow-500',
  CONCLUIDO: 'bg-green-500',
  CANCELADO: 'bg-red-500',
};

const categoriaLabels = {
  corrida: 'Corrida',
  corporativo: 'Corporativo',
  ativacao: 'Ativação',
  outro: 'Outro',
};

export default function EventoDetalhes() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: evento, isLoading } = useEvento(id!);
  const [editOpen, setEditOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <LoadingSkeleton type="card" rows={3} />
      </div>
    );
  }

  if (!evento) {
    return (
      <div className="container mx-auto p-6">
        <EmptyState
          icon={Calendar}
          title="Evento não encontrado"
          description="O evento que você procura não existe ou foi removido."
          action={{
            label: "Voltar para Eventos",
            onClick: () => navigate('/eventos')
          }}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {evento && (
        <EditEventoModal
          open={editOpen}
          onOpenChange={setEditOpen}
          evento={evento}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/eventos')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{evento.nome}</h1>
            <div className="flex items-center gap-2 mt-2">
              <Badge className={statusColors[evento.status as keyof typeof statusColors]}>
                {evento.status}
              </Badge>
              <Badge variant="outline">
                {categoriaLabels[evento.categoria as keyof typeof categoriaLabels]}
              </Badge>
            </div>
          </div>
        </div>
        <Button onClick={() => setEditOpen(true)}>
          <Edit className="h-4 w-4 mr-2" />
          Editar Evento
        </Button>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Período
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              {new Date(evento.data_inicio).toLocaleDateString('pt-BR')} até{' '}
              {new Date(evento.data_fim).toLocaleDateString('pt-BR')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Local
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{evento.local}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Tipo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{evento.gratuito ? 'Gratuito' : 'Pago'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Descrição */}
      {evento.descricao && (
        <Card>
          <CardHeader>
            <CardTitle>Descrição</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{evento.descricao}</p>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="prestadores" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="prestadores">Prestadores</TabsTrigger>
          <TabsTrigger value="checklist">Checklist</TabsTrigger>
          <TabsTrigger value="participantes">Participantes</TabsTrigger>
          <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
        </TabsList>

        <TabsContent value="prestadores">
          <PrestadoresTab eventoId={id!} />
        </TabsContent>

        <TabsContent value="checklist">
          <ChecklistTab eventoId={id!} />
        </TabsContent>

        <TabsContent value="participantes">
          <ParticipantesTab eventoId={id!} />
        </TabsContent>

        <TabsContent value="financeiro">
          <FinanceiroTab eventoId={id!} evento={evento} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
