import { useState, useCallback } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { toast } from 'sonner';

export function useGoogleOAuth() {
  const [loading, setLoading] = useState(false);

  const connect = useCallback(async () => {
    setLoading(true);
    try {
      const getGoogleAuthUrl = httpsCallable(functions, 'getGoogleAuthUrlIntegration');
      const result = await getGoogleAuthUrl({});
      const url = (result.data as any).url;
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Error connecting to Google:', error);
      toast.error('Erro ao conectar com Google');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    connect,
    loading
  };
}
