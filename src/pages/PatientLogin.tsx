/**
 * Patient Login Page
 *
 * A simplified, patient-friendly login page using Magic Link authentication.
 * Designed for ease of use and minimal friction.
 */

import { PatientMagicLinkCard } from '@/components/auth/MagicLinkForm';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export default function PatientLogin() {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/paciente/dashboard', { replace: true });
      }
    };
    checkAuth();
  }, [navigate]);

  const handleSuccess = () => {
    toast({
      title: 'Login enviado!',
      description: 'Verifique seu email para acessar.',
    });
  };

  const handleError = (error: Error) => {
    toast({
      title: 'Erro no login',
      description: error.message,
      variant: 'destructive',
    });
  };

  return (
    <AuthLayout>
      <PatientMagicLinkCard
        onSuccess={handleSuccess}
        onError={handleError}
        redirectTo={`${window.location.origin}/auth/callback?userType=patient`}
      />
    </AuthLayout>
  );
}
