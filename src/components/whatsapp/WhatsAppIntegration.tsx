import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/shared/ui/card';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { Textarea } from '@/components/shared/ui/textarea';
import { Badge } from '@/components/shared/ui/badge';
import { Switch } from '@/components/shared/ui/switch';
import { 
  MessageCircle, 
  Send, 
  CheckCircle2,
  Clock,
  AlertCircle,
  Bell,
  Calendar
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

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
      
      // Formatar número para WhatsApp (remover caracteres especiais)
      const formattedPhone = patientPhone.replace(/\D/g, '');
      
      // Abrir WhatsApp Web com mensagem pré-preenchida
      const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(messageToSend)}`;
      window.open(whatsappUrl, '_blank');
      
      toast({
        title: 'WhatsApp aberto',
        description: 'Mensagem preparada para envio',
      });
      
      setMessage('');
    } catch {
      toast({
        title: 'Erro ao abrir WhatsApp',
        description: 'Tente novamente',
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
