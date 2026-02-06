import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useEvento } from '@/hooks/useEventos';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Calendar, MapPin, DollarSign, Edit } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { EmptyState, LoadingSkeleton } from '@/components/ui';
import { PrestadoresTab } from '@/components/eventos/PrestadoresTab';
import { ChecklistTab } from '@/components/eventos/ChecklistTab';
import { ParticipantesTab } from '@/components/eventos/ParticipantesTab';
import { FinanceiroTab } from '@/components/eventos/FinanceiroTab';
import { ContratadosTab } from '@/components/eventos/ContratadosTab';
import { EventoFinancialReportButton } from '@/components/eventos/EventoFinancialReportButton';
import { SaveAsTemplateButton } from '@/components/eventos/SaveAsTemplateButton';
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
  workshop: 'Workshop',
  outro: 'Outro',
};

export default function EventoDetalhes() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: evento, isLoading } = useEvento(id!);
  const [editOpen, setEditOpen] = useState(false);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="container mx-auto p-6 space-y-6">
          <LoadingSkeleton type="card" rows={3} />
        </div>
      </MainLayout>
    );
  }

  if (!evento) {
    return (
      <MainLayout>
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
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6 animate-fade-in">
        {evento && (
          <EditEventoModal
            open={editOpen}
            onOpenChange={setEditOpen}
            evento={evento}
          />
        )}

        {/* Header responsivo */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/eventos')}>
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold truncate">{evento.nome}</h1>
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
        <div className="flex flex-wrap gap-2">
          <EventoFinancialReportButton 
            eventoId={id!} 
          />
          <SaveAsTemplateButton 
            eventoId={id!} 
            eventoNome={evento.nome}
          />
          <Button onClick={() => setEditOpen(true)} className="w-full sm:w-auto">
            <Edit className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Editar Evento</span>
            <span className="sm:hidden">Editar</span>
          </Button>
        </div>
        </div>

        {/* Info Cards responsivos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
              {(evento.hora_inicio || evento.hora_fim) && (
                <span className="text-muted-foreground">
                  {' '}• {evento.hora_inicio || '--:--'} às {evento.hora_fim || '--:--'}
                </span>
              )}
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

        {/* Tabs responsivos */}
        <Tabs defaultValue="prestadores" className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 h-auto gap-1">
            <TabsTrigger value="prestadores" className="text-sm">Prestadores</TabsTrigger>
            <TabsTrigger value="contratados" className="text-sm">Contratados</TabsTrigger>
            <TabsTrigger value="checklist" className="text-sm">Checklist</TabsTrigger>
            <TabsTrigger value="participantes" className="text-sm">Participantes</TabsTrigger>
            <TabsTrigger value="financeiro" className="text-sm">Financeiro</TabsTrigger>
          </TabsList>

          <TabsContent value="prestadores">
            <PrestadoresTab eventoId={id!} />
          </TabsContent>

          <TabsContent value="contratados">
            <ContratadosTab
              eventoId={id!}
              evento={{
                data_inicio: evento.data_inicio,
                data_fim: evento.data_fim,
                hora_inicio: evento.hora_inicio,
                hora_fim: evento.hora_fim,
              }}
            />
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
    </MainLayout>
  );
}
