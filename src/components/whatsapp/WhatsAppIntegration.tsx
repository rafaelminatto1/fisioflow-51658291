import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  MessageCircle,
  Send,
  CheckCircle2,
  Clock,
  AlertCircle,
  Bell,
  Calendar,
  RefreshCw
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useEffect } from 'react';
import { logger } from '@/lib/errors/logger';

interface WhatsAppIntegrationProps {
  patientId: string;
  patientPhone?: string;
}

export function WhatsAppIntegration({ patientId: _patientId, patientPhone }: WhatsAppIntegrationProps) {
  const [message, setMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [autoReminders, setAutoReminders] = useState(true);
  const [appointmentReminders, setAppointmentReminders] = useState(true);
  const [exerciseReminders, setExerciseReminders] = useState(true);
  const [history, setHistory] = useState<Array<{ id: string; message: string; sent_at: string; status?: string }>>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchHistory = async () => {
    try {
      setLoadingHistory(true);
      const getHistory = httpsCallable(functions, 'getWhatsAppHistory');
      const result = await getHistory({ patientId: _patientId });
      setHistory((result.data as { data?: Array<{ id: string; message: string; sent_at: string; status?: string }> }).data || []);
    } catch (error) {
      logger.error('Error fetching WhatsApp history', error, 'WhatsAppIntegration');
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [_patientId]);

  const templates = [
    {
      id: 'appointment_reminder',
      title: 'Lembrete de Consulta',
      message: 'Olá! Este é um lembrete da sua consulta amanhã às {time}. Até lá! 😊'
    },
    {
      id: 'exercise_reminder',
      title: 'Lembrete de Exercícios',
      message: 'Não esqueça de fazer seus exercícios hoje! Você está indo muito bem! 💪'
    },
    {
      id: 'motivation',
      title: 'Motivação',
      message: 'Continue firme no seu tratamento! Cada dia é uma vitória! 🎯'
    },
    {
      id: 'followup',
      title: 'Acompanhamento',
      message: 'Como você está se sentindo hoje? Responda para conversarmos! 😊'
    }
  ];

  const sendWhatsAppMessage = async (customMessage?: string) => {
    if (!patientPhone) {
      toast({
        title: 'Telefone não cadastrado',
        description: 'Adicione um telefone ao paciente primeiro.',
        variant: 'destructive'
      });
      return;
    }

    try {
      setSendingMessage(true);
      const messageToSend = customMessage || message;

      const sendCustomMessage = httpsCallable(functions, 'sendWhatsAppCustomMessage');
      await sendCustomMessage({
        to: patientPhone,
        message: messageToSend
      });

      toast({
        title: 'Mensagem enviada',
        description: 'A mensagem foi enviada via WhatsApp Business API',
      });

      setMessage('');
      fetchHistory(); // Refresh history
    } catch (error) {
      logger.error('Error sending WhatsApp message', error, 'WhatsAppIntegration');
      toast({
        title: 'Erro ao enviar mensagem',
        description: error instanceof Error ? error.message : 'Tente novamente',
        variant: 'destructive'
      });
    } finally {
      setSendingMessage(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-2 border-green-500/30 shadow-xl bg-gradient-to-br from-green-500/10 via-background to-background">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-500 rounded-xl shadow-lg">
              <MessageCircle className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl">WhatsApp Integration</CardTitle>
              <CardDescription>
                Comunicação direta com o paciente
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Quick Send */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Enviar Mensagem
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!patientPhone ? (
            <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <p className="text-sm">Telefone não cadastrado. Adicione um telefone ao paciente.</p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <div className="flex items-center gap-2">
                  <Input value={patientPhone} disabled />
                  <Badge variant="outline" className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Válido
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Mensagem</Label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Digite sua mensagem..."
                  rows={4}
                />
              </div>

              <Button
                onClick={() => sendWhatsAppMessage()}
                disabled={!message || sendingMessage}
                className="w-full bg-green-500 hover:bg-green-600"
              >
                {sendingMessage ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Abrindo WhatsApp...
                  </>
                ) : (
                  <>
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Enviar via WhatsApp
                  </>
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Templates */}
      <Card>
        <CardHeader>
          <CardTitle>Templates de Mensagem</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {templates.map((template) => (
              <Card
                key={template.id}
                className="cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1"
                onClick={() => sendWhatsAppMessage(template.message)}
              >
                <CardContent className="p-4">
                  <h4 className="font-semibold mb-2">{template.title}</h4>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {template.message}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Message History */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Histórico de Mensagens
            </CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchHistory}
            disabled={loadingHistory}
          >
            <RefreshCw className={`h-4 w-4 ${loadingHistory ? 'animate-spin' : ''}`} />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
            {loadingHistory && history.length === 0 ? (
              <div className="flex justify-center py-8">
                <Clock className="h-8 w-8 text-muted-foreground animate-pulse" />
              </div>
            ) : history.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma mensagem enviada ou recebida.
              </p>
            ) : (
              history.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col p-3 rounded-lg border ${msg.status === 'received'
                      ? 'bg-muted/30 mr-8'
                      : 'bg-green-500/5 ml-8 border-green-500/20'
                    }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-[10px] font-medium uppercase text-muted-foreground">
                      {msg.status === 'received' ? 'Recebido' : 'Enviado'}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {format(new Date(msg.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                  <div className="flex justify-end mt-1 gap-1">
                    {msg.status === 'read' ? (
                      <Badge variant="outline" className="text-[9px] py-0 h-4 bg-blue-500/10 text-blue-500 border-none">
                        Lida
                      </Badge>
                    ) : msg.status === 'delivered' ? (
                      <Badge variant="outline" className="text-[9px] py-0 h-4 bg-muted text-muted-foreground border-none">
                        Entregue
                      </Badge>
                    ) : msg.status === 'sent' ? (
                      <Badge variant="outline" className="text-[9px] py-0 h-4 bg-muted text-muted-foreground border-none">
                        Enviada
                      </Badge>
                    ) : msg.status === 'failed' ? (
                      <Badge variant="destructive" className="text-[9px] py-0 h-4 border-none">
                        Falhou
                      </Badge>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Automation Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Lembretes Automáticos
          </CardTitle>
          <CardDescription>
            Configure lembretes automáticos via WhatsApp
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <p className="font-medium">Lembretes de Consulta</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Enviar lembrete 24h antes da consulta
              </p>
            </div>
            <Switch
              checked={appointmentReminders}
              onCheckedChange={setAppointmentReminders}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-primary" />
                <p className="font-medium">Lembretes de Exercícios</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Lembrete diário para fazer os exercícios
              </p>
            </div>
            <Switch
              checked={exerciseReminders}
              onCheckedChange={setExerciseReminders}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" />
                <p className="font-medium">Todos os Lembretes</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Ativar/desativar todos os lembretes
              </p>
            </div>
            <Switch
              checked={autoReminders}
              onCheckedChange={setAutoReminders}
            />
          </div>

          <div className="pt-4 border-t">
            <Button className="w-full" variant="outline">
              Salvar Configurações
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Info */}
      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <MessageCircle className="h-5 w-5 text-green-500 mt-0.5" />
            <div className="text-sm space-y-1">
              <p className="font-medium">Integração WhatsApp</p>
              <p className="text-muted-foreground">
                As mensagens são enviadas através do WhatsApp Web. Certifique-se de ter o WhatsApp conectado no navegador.
                Os lembretes automáticos são enviados via sistema quando habilitados.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
