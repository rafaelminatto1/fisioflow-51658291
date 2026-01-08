import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface Patient {
  id: string;
  name: string;
}

export const IncompleteRegistrationAlert: React.FC = () => {
  const [incompletePatients, setIncompletePatients] = React.useState<Patient[]>([]);
  const [dismissedIds, setDismissedIds] = React.useState<string[]>([]);
  const navigate = useNavigate();

  React.useEffect(() => {
    const fetchIncompletePatients = async () => {
      try {
        const { data, error } = await supabase
          .from('patients')
          .select('id, name')
          .eq('incomplete_registration', true)
          .limit(5);

        if (error) {
          console.error('Error fetching incomplete patients:', error);
          return;
        }

        if (data) {
          setIncompletePatients(data);
        }
      } catch (err) {
        console.error('Unexpected error in IncompleteRegistrationAlert:', err);
      }
    };

    fetchIncompletePatients();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('incomplete-patients-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'patients',
          filter: 'incomplete_registration=eq.true',
        },
        () => {
          fetchIncompletePatients();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const visiblePatients = incompletePatients.filter(
    (p) => !dismissedIds.includes(p.id)
  );

  if (visiblePatients.length === 0) return null;

  const handleDismiss = (id: string) => {
    setDismissedIds((prev) => [...prev, id]);
  };

  const handleComplete = (patientId: string) => {
    navigate(`/patients?edit=${patientId}`);
  };

  return (
    <Card className="border-amber-500/50 bg-amber-500/5 mx-0">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="p-2 sm:p-2.5 bg-amber-500/10 rounded-lg shrink-0">
            <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <div>
              <h3 className="font-semibold text-amber-900 dark:text-amber-100 text-sm sm:text-base">
                Cadastros Incompletos
              </h3>
              <p className="text-xs sm:text-sm text-amber-700 dark:text-amber-200 mt-0.5 sm:mt-1">
                {visiblePatients.length} {visiblePatients.length === 1 ? 'paciente precisa' : 'pacientes precisam'} de cadastro completo
              </p>
            </div>

            <div className="space-y-2 mt-2 sm:mt-3">
              {visiblePatients.map((patient) => (
                <div
                  key={patient.id}
                  className="flex items-center justify-between gap-2 sm:gap-3 p-2.5 sm:p-3 bg-background/50 rounded-lg"
                >
                  <span className="text-xs sm:text-sm font-medium truncate min-w-0 flex-1">{patient.name}</span>
                  <div className="flex gap-1.5 sm:gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleComplete(patient.id)}
                      className="h-7 sm:h-8 text-[10px] sm:text-xs px-2 sm:px-3 whitespace-nowrap"
                    >
                      <span className="hidden sm:inline">Completar Cadastro</span>
                      <span className="sm:hidden">Completar</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDismiss(patient.id)}
                      className="h-7 sm:h-8 w-7 sm:w-8 p-0"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
