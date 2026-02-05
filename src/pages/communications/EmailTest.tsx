import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Mail, Send, Loader2 } from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

export default function EmailTest() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSendTest = async () => {
    if (!email) return;
    setLoading(true);

    try {
      const sendEmail = httpsCallable(functions, 'sendEmail');
      await sendEmail({
        to: email,
        subject: 'Bem-vindo ao FisioFlow (Teste)',
        type: 'welcome',
        data: {
          name: 'Visitante',
          clinicName: 'Clínica Modelo'
        }
      });

      toast({
        title: "Email Enviado!",
        description: `Verifique a caixa de entrada de ${email}.`,
      });
    } catch (error: any) {
      console.error(error);
      toast({
        title: "Erro no Envio",
        description: error.message || "Falha ao conectar com o Resend.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-lg mx-auto">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Mail className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <CardTitle>Teste de Email (Resend)</CardTitle>
              <CardDescription>Envie um email transacional de teste.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Destinatário</label>
            <Input 
              type="email" 
              placeholder="seu-email@exemplo.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <p className="text-xs text-gray-500">
              * Se você não configurou domínio no Resend, só pode enviar para o email da sua conta Resend.
            </p>
          </div>

          <Button 
            className="w-full bg-purple-600 hover:bg-purple-700" 
            onClick={handleSendTest}
            disabled={!email || loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Enviar Teste
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
