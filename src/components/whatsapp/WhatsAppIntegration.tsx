import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertCircle, CheckCircle2, Clock, MessageCircle, RefreshCw, Send } from 'lucide-react';

import { whatsappApi } from '@/api/v2';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { fisioLogger as logger } from '@/lib/errors/logger';

interface WhatsAppIntegrationProps {
  patientId: string;
  patientPhone?: string;
}

interface MessageHistoryItem {
  id: string;
  message: string;
  sent_at: string;
  status?: string;
}

export function WhatsAppIntegration({
  patientId: _patientId,
  patientPhone,
}: WhatsAppIntegrationProps) {
  const [message, setMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [history, setHistory] = useState<MessageHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const hasPhone = Boolean(patientPhone?.trim());

  const fetchHistory = useCallback(async () => {
    try {
      setLoadingHistory(true);
      const result = await whatsappApi.listMessages({
        patientId: _patientId,
        limit: 20,
      });
      setHistory(
        (result.data ?? []).map((item) => ({
          id: item.id,
          message: item.message_content,
          sent_at: item.sent_at ?? item.created_at ?? new Date().toISOString(),
          status: item.status,
        }))
      );
    } catch (error) {
      logger.error('Error fetching WhatsApp history', error, 'WhatsAppIntegration');
    } finally {
      setLoadingHistory(false);
    }
  }, [_patientId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const templates = useMemo(
    () => [
      {
        id: 'followup',
        title: 'Acompanhamento',
        message: 'Como você está se sentindo após a última sessão? Me responda quando puder.',
      },
      {
        id: 'exercise_reminder',
        title: 'Exercícios',
        message:
          'Não esqueça de fazer os exercícios combinados hoje. Qualquer dor diferente, me avise.',
      },
      {
        id: 'appointment_reminder',
        title: 'Consulta',
        message:
          'Passando para confirmar nossa próxima sessão. Se precisar remarcar, me avise por aqui.',
      },
    ],
    []
  );

  const sendWhatsAppMessage = async (customMessage?: string) => {
    if (!hasPhone || !patientPhone) {
      toast({
        title: 'Telefone não cadastrado',
        description: 'Adicione um telefone ao paciente primeiro.',
        variant: 'destructive',
      });
      return;
    }

    const messageToSend = (customMessage || message).trim();
    if (!messageToSend) return;

    try {
      setSendingMessage(true);

      await whatsappApi.createMessage({
        patient_id: _patientId,
        to_phone: patientPhone,
        message_type: 'custom',
        message_content: messageToSend,
        status: 'sent',
        metadata: {
          to_phone: patientPhone,
          source: 'patient_evolution_assistant',
        },
      });

      toast({
        title: 'Mensagem enviada',
        description: 'A mensagem foi registrada para envio via WhatsApp Business.',
      });

      setMessage('');
      fetchHistory();
    } catch (error) {
      logger.error('Error sending WhatsApp message', error, 'WhatsAppIntegration');
      toast({
        title: 'Erro ao enviar mensagem',
        description: error instanceof Error ? error.message : 'Tente novamente',
        variant: 'destructive',
      });
    } finally {
      setSendingMessage(false);
    }
  };

  const getStatusLabel = (status?: string) => {
    if (status === 'received') return 'Recebida';
    if (status === 'read') return 'Lida';
    if (status === 'delivered') return 'Entregue';
    if (status === 'failed') return 'Falhou';
    return 'Enviada';
  };

  const formatMessageDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '--/-- --:--';
    return format(date, 'dd/MM HH:mm', { locale: ptBR });
  };

  const latestMessages = history.slice(0, 3);

  return (
    <Card className="h-fit overflow-hidden">
      <CardHeader className="border-b bg-emerald-50/70">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-500/10 p-2.5">
              <MessageCircle className="h-5 w-5 text-emerald-700" />
            </div>
            <div>
              <CardTitle className="text-lg">WhatsApp rápido</CardTitle>
              <CardDescription>Contato contextual sem sair da evolução</CardDescription>
            </div>
          </div>
          <Badge
            variant="outline"
            className={
              hasPhone
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-amber-200 bg-amber-50 text-amber-700'
            }
          >
            {hasPhone ? (
              <CheckCircle2 className="mr-1 h-3 w-3" />
            ) : (
              <AlertCircle className="mr-1 h-3 w-3" />
            )}
            {hasPhone ? 'Telefone OK' : 'Sem telefone'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 p-4">
        {!hasPhone ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <div className="flex gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <p>Cadastre um telefone no perfil do paciente para enviar mensagens por aqui.</p>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border bg-muted/30 px-3 py-2">
            <p className="text-xs font-medium uppercase text-muted-foreground">Telefone</p>
            <p className="mt-0.5 text-sm font-semibold">{patientPhone}</p>
          </div>
        )}

        <div className="space-y-2">
          <Textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Escreva uma mensagem curta para o paciente..."
            rows={4}
          />
          <Button
            onClick={() => sendWhatsAppMessage()}
            disabled={!hasPhone || !message.trim() || sendingMessage}
            className="w-full bg-emerald-600 hover:bg-emerald-700"
          >
            {sendingMessage ? (
              <>
                <Clock className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Enviar mensagem
              </>
            )}
          </Button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Templates úteis</h3>
            <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs">
              <Link to="/whatsapp/templates">Gerenciar</Link>
            </Button>
          </div>
          <div className="grid gap-2">
            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                disabled={sendingMessage}
                onClick={() => setMessage(template.message)}
                className="rounded-lg border bg-background p-3 text-left transition hover:border-emerald-300 hover:bg-emerald-50/50 disabled:pointer-events-none disabled:opacity-60"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{template.title}</p>
                  <span className="text-[10px] font-semibold uppercase text-emerald-700">Usar</span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {template.message}
                </p>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Últimas mensagens</h3>
            <Button variant="ghost" size="sm" onClick={fetchHistory} disabled={loadingHistory}>
              <RefreshCw className={`h-4 w-4 ${loadingHistory ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          <div className="space-y-2">
            {loadingHistory && latestMessages.length === 0 ? (
              <div className="flex justify-center rounded-lg border border-dashed py-6">
                <Clock className="h-5 w-5 animate-pulse text-muted-foreground" />
              </div>
            ) : latestMessages.length === 0 ? (
              <p className="rounded-lg border border-dashed py-6 text-center text-sm text-muted-foreground">
                Nenhuma mensagem recente.
              </p>
            ) : (
              latestMessages.map((msg) => (
                <div key={msg.id} className="rounded-lg border bg-background p-3">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="text-[10px] font-semibold uppercase text-muted-foreground">
                      {getStatusLabel(msg.status)}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {formatMessageDate(msg.sent_at)}
                    </span>
                  </div>
                  <p className="line-clamp-2 text-sm">{msg.message}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <Button asChild variant="outline" className="w-full">
          <Link to="/crm-whatsapp">Abrir conversa completa</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
