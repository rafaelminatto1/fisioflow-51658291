import React from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Video, MapPin, BarChart3, CheckCircle2 } from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

export default function Integrations() {
  const { toast } = useToast();

  const handleConnectGoogle = async () => {
    try {
      const getUrl = httpsCallable(functions, 'getGoogleAuthUrlIntegration');
      const result = await getUrl();
      // Redirecionar para URL de Auth do Google
      window.location.href = (result.data as unknown).url;
    } catch (error) {
      console.error(error);
      toast({ title: "Erro", description: "Falha ao iniciar conexão.", variant: "destructive" });
    }
  };

  return (
    <MainLayout>
      <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Integrações Google</h1>
        <p className="text-gray-500">Conecte o FisioFlow ao ecossistema Google Workspace.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Google Calendar */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg"><Calendar className="w-6 h-6 text-blue-600" /></div>
              <CardTitle>Google Calendar</CardTitle>
            </div>
            <CardDescription>Sincronize sua agenda pessoal e profissional.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-gray-600 mb-4">
              <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> Bloqueia horários pessoais na agenda da clínica.</li>
              <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> Envia agendamentos para seu celular.</li>
            </ul>
            <Button onClick={handleConnectGoogle} className="w-full bg-blue-600 hover:bg-blue-700">
              Conectar Conta Google
            </Button>
          </CardContent>
        </Card>

        {/* Google Meet */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg"><Video className="w-6 h-6 text-green-600" /></div>
              <CardTitle>Google Meet</CardTitle>
            </div>
            <CardDescription>Telemedicina integrada com um clique.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-gray-600 mb-4">
              <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> Cria links de reunião automaticamente.</li>
              <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> Sala de espera virtual.</li>
            </ul>
            <Button disabled variant="outline" className="w-full">
              Ativo (Via Conta Google)
            </Button>
          </CardContent>
        </Card>

        {/* Google Maps */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg"><MapPin className="w-6 h-6 text-red-600" /></div>
              <CardTitle>Google Maps</CardTitle>
            </div>
            <CardDescription>Otimização de rotas e endereços.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-gray-600 mb-4">
              <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> Autocomplete de endereços no cadastro.</li>
              <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> Mapas de localização para pacientes.</li>
            </ul>
            <Button disabled variant="outline" className="w-full">
              Ativo (API Key Configurada)
            </Button>
          </CardContent>
        </Card>
      </div>
      </div>
    </MainLayout>
  );
}