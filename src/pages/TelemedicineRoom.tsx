import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { Video, Copy, ExternalLink } from 'lucide-react';

export default function TelemedicineRoom() {
  const { roomId } = useParams();
  const [meetLink, setMeetLink] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const createMeeting = async () => {
    setLoading(true);
    try {
      const createLink = httpsCallable(functions, 'createMeetLink');
      const result = await createLink({ appointmentId: roomId });
      setMeetLink((result.data as unknown).meetLink);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <Card className="w-full max-w-md p-8 text-center space-y-6">
        <div className="bg-green-100 p-4 rounded-full w-20 h-20 mx-auto flex items-center justify-center">
          <Video className="w-10 h-10 text-green-600" />
        </div>
        
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sala de Telemedicina</h1>
          <p className="text-gray-500 mt-2">Atendimento via Google Meet</p>
        </div>

        {!meetLink ? (
          <Button 
            onClick={createMeeting} 
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 h-12 text-lg"
          >
            {loading ? 'Gerando Link...' : 'Iniciar Reunião'}
          </Button>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-gray-100 rounded-lg break-all text-sm">
              {meetLink}
            </div>
            
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => navigator.clipboard.writeText(meetLink)}
              >
                <Copy className="w-4 h-4 mr-2" /> Copiar
              </Button>
              <Button 
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={() => window.open(meetLink, '_blank')}
              >
                <ExternalLink className="w-4 h-4 mr-2" /> Entrar
              </Button>
            </div>
            
            <p className="text-xs text-gray-500">
              O link abrirá em uma nova aba segura do Google Meet.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}