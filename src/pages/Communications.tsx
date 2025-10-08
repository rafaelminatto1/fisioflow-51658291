import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { 
  Mail, 
  MessageSquare, 
  Phone, 
  Send, 
  Plus,
  Search,
  Filter,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useState } from 'react';

const Communications = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedChannel, setSelectedChannel] = useState<string>('all');
  const [isLoading] = useState(false);

  // Mock data para demonstração
  const communications = [
    {
      id: '1',
      type: 'email',
      recipient: 'João Silva',
      subject: 'Lembrete de consulta',
      status: 'sent',
      sentAt: new Date('2024-01-15T10:30:00'),
      channel: 'Email'
    },
    {
      id: '2',
      type: 'whatsapp',
      recipient: 'Maria Santos',
      subject: 'Confirmação de agendamento',
      status: 'delivered',
      sentAt: new Date('2024-01-15T14:20:00'),
      channel: 'WhatsApp'
    },
    {
      id: '3',
      type: 'sms',
      recipient: 'Pedro Costa',
      subject: 'Cancelamento de sessão',
      status: 'pending',
      sentAt: new Date('2024-01-15T16:45:00'),
      channel: 'SMS'
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'delivered':
        return <CheckCircle className="w-4 h-4 text-blue-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'delivered':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getChannelIcon = (type: string) => {
    switch (type) {
      case 'email':
        return <Mail className="w-4 h-4" />;
      case 'whatsapp':
        return <MessageSquare className="w-4 h-4" />;
      case 'sms':
        return <Phone className="w-4 h-4" />;
      default:
        return <Mail className="w-4 h-4" />;
    }
  };

  return (
    <MainLayout>
      <div className="space-y-4 sm:space-y-6 animate-fade-in">
        {/* Header responsivo */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                Comunicações
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                Gerencie mensagens e notificações aos pacientes
              </p>
            </div>
            <Button className="bg-gradient-primary text-primary-foreground hover:shadow-medical w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Nova Comunicação</span>
              <span className="sm:hidden">Nova</span>
            </Button>
          </div>

          {/* Filtros e busca responsivos */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Buscar comunicações..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2">
              <Button
                variant={selectedChannel === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedChannel('all')}
                className="whitespace-nowrap"
              >
                <Filter className="w-4 h-4 mr-2" />
                Todos
              </Button>
              <Button
                variant={selectedChannel === 'email' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedChannel('email')}
                className="whitespace-nowrap"
              >
                <Mail className="w-4 h-4 mr-2" />
                Email
              </Button>
              <Button
                variant={selectedChannel === 'whatsapp' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedChannel('whatsapp')}
                className="whitespace-nowrap"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                WhatsApp
              </Button>
              <Button
                variant={selectedChannel === 'sms' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedChannel('sms')}
                className="whitespace-nowrap"
              >
                <Phone className="w-4 h-4 mr-2" />
                SMS
              </Button>
            </div>
          </div>
        </div>

        {/* Grid responsivo */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Lista de comunicações */}
          <div className="lg:col-span-2">
            <Card className="bg-gradient-card border-border shadow-card">
              <CardHeader className="border-b border-border">
                <CardTitle className="text-foreground">
                  Histórico de Comunicações
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-6">
                    <LoadingSkeleton type="list" rows={5} />
                  </div>
                ) : communications.length === 0 ? (
                  <div className="p-6">
                    <EmptyState
                      icon={MessageSquare}
                      title="Nenhuma comunicação enviada"
                      description="Comece enviando sua primeira mensagem aos pacientes."
                    />
                  </div>
                ) : (
                  <div className="space-y-0">
                    {communications.map((comm) => (
                    <div
                      key={comm.id}
                      className="p-4 border-b border-border last:border-b-0 hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="mt-1">
                            {getChannelIcon(comm.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                              <p className="font-medium text-foreground truncate">
                                {comm.recipient}
                              </p>
                              <Badge className={`text-xs w-fit ${getStatusColor(comm.status)}`}>
                                {comm.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground truncate mt-1">
                              {comm.subject}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-xs text-muted-foreground">
                                {comm.channel}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {comm.sentAt.toLocaleString('pt-BR')}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(comm.status)}
                        </div>
                      </div>
                    </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Painel de envio */}
          <div className="space-y-4">
            <Card className="bg-gradient-card border-border shadow-card">
              <CardHeader className="border-b border-border">
                <CardTitle className="text-foreground">
                  Enviar Comunicação
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Canal
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <Button variant="outline" size="sm" className="flex-col p-3 h-auto">
                      <Mail className="w-4 h-4 mb-1" />
                      <span className="text-xs">Email</span>
                    </Button>
                    <Button variant="outline" size="sm" className="flex-col p-3 h-auto">
                      <MessageSquare className="w-4 h-4 mb-1" />
                      <span className="text-xs">WhatsApp</span>
                    </Button>
                    <Button variant="outline" size="sm" className="flex-col p-3 h-auto">
                      <Phone className="w-4 h-4 mb-1" />
                      <span className="text-xs">SMS</span>
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Destinatário
                  </label>
                  <Input placeholder="Selecionar paciente..." />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Assunto
                  </label>
                  <Input placeholder="Assunto da mensagem..." />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Mensagem
                  </label>
                  <Textarea 
                    placeholder="Digite sua mensagem..." 
                    rows={4}
                    className="resize-none"
                  />
                </div>

                <Button className="w-full bg-gradient-primary text-primary-foreground hover:shadow-medical">
                  <Send className="w-4 h-4 mr-2" />
                  Enviar Comunicação
                </Button>
              </CardContent>
            </Card>

            {/* Estatísticas */}
            <Card className="bg-gradient-card border-border shadow-card">
              <CardHeader className="border-b border-border">
                <CardTitle className="text-foreground">
                  Estatísticas
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 bg-accent/30 rounded-lg">
                    <p className="text-lg font-bold text-foreground">12</p>
                    <p className="text-xs text-muted-foreground">Enviadas hoje</p>
                  </div>
                  <div className="text-center p-3 bg-accent/30 rounded-lg">
                    <p className="text-lg font-bold text-foreground">85%</p>
                    <p className="text-xs text-muted-foreground">Taxa de entrega</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Communications;