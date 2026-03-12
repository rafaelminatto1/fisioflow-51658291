import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { usePDFGenerator } from '@/hooks/usePDFGenerator';
import { useAppointmentActions } from '@/hooks/useAppointmentActions';
import { useGamification } from '@/hooks/useGamification';
import { useAutoSaveSoapRecord } from '@/hooks/useSoapRecords';
import { useEvolutionVersionHistory } from '@/hooks/evolution/useEvolutionVersionHistory';
import { evolutionApi } from '@/api/v2/clinical';
import { fisioLogger as logger } from '@/lib/errors/logger';
import { PatientHelpers } from '@/types';
import type { EvolutionVersion, EvolutionV2Data } from '@/components/evolution/v2/types';
import type { PainScaleData } from '@/pages/PatientEvolution';

export function usePatientEvolutionHandlers({
  patientId,
  appointmentId,
  patient,
  appointment,
  soapData,
  setSoapData,
  painScale,
  setPainScale,
  sessionExercises,
  evolutionVersion,
  setEvolutionV2Data,
  evolutionV2Data,
  currentSoapRecordId,
  setCurrentSoapRecordId,
  previousEvolutions,
  requiredMeasurements,
  todayMeasurements,
  goals,
  user,
  selectedTherapistId,
}: any) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { generateEvolucao, downloadPDF } = usePDFGenerator();
  const { completeAppointment } = useAppointmentActions();
  const { awardXp } = useGamification(patientId || '');
  const autoSaveMutation = useAutoSaveSoapRecord();
  const { saveVersionForRecord } = useEvolutionVersionHistory(currentSoapRecordId);

  const handleCopyPreviousEvolution = useCallback((evolution: any) => {
    setSoapData({
      subjective: evolution.subjective || '',
      objective: evolution.objective || '',
      assessment: evolution.assessment || '',
      plan: evolution.plan || ''
    });

    if (evolution.pain_level !== undefined) {
      setPainScale({
        level: evolution.pain_level,
        location: evolution.pain_location,
        character: evolution.pain_character
      });
    }

    toast({
      title: 'Evolução copiada',
      description: 'Os dados da evolução anterior foram copiados.'
    });
  }, [setSoapData, setPainScale, toast]);

  const handleRestoreVersion = useCallback((content: any) => {
    if (evolutionVersion === 'v1-soap') {
      setSoapData({
        subjective: content.subjective || '',
        objective: content.objective || '',
        assessment: content.assessment || '',
        plan: content.plan || '',
      });
    } else if (evolutionVersion === 'v2-texto' && content.v2_data) {
      setEvolutionV2Data(content.v2_data as EvolutionV2Data);
    }
    if (content.pain_level !== undefined) {
      setPainScale((prev: any) => ({ ...prev, level: content.pain_level! }));
    }
  }, [evolutionVersion, setSoapData, setEvolutionV2Data, setPainScale]);

  const handleSave = async () => {
    const pendingCriticalTests = requiredMeasurements.filter((req: any) => {
      const hasMeasurementToday = todayMeasurements.some((m: any) => m.measurement_name === req.measurement_name);
      return req.alert_level === 'high' && !hasMeasurementToday;
    });

    if (pendingCriticalTests.length > 0) {
      toast({
        title: 'Testes Obrigatórios Pendentes',
        description: `É necessário realizar: ${pendingCriticalTests.map((t: any) => t.measurement_name).join(', ')}`,
        variant: 'destructive'
      });
      return;
    }

    const isV2orV3 = evolutionVersion === 'v2-texto' || evolutionVersion === 'v3-notion';
    const saveData = isV2orV3
      ? {
        subjective: evolutionV2Data.patientReport || '',
        objective: evolutionV2Data.evolutionText || '',
        assessment: evolutionV2Data.procedures.map((p: any) => `${p.completed ? '[x]' : '[ ]'} ${p.name}${p.notes ? ` - ${p.notes}` : ''}`).join('\n'),
        plan: evolutionV2Data.observations || '',
      }
      : soapData;

    if (!saveData.subjective && !saveData.objective && !saveData.assessment && !saveData.plan) {
      toast({
        title: 'Campos vazios',
        description: 'Preencha pelo menos um campo antes de salvar.',
        variant: 'destructive'
      });
      return;
    }

    if (!patientId) return;

    const exercisesToSave = isV2orV3
      ? evolutionV2Data.exercises.map((ex: any) => ({
        id: ex.id,
        exerciseId: ex.exerciseId || ex.id,
        name: ex.name,
        sets: parseInt(ex.prescription.split('x')[0]) || 3,
        repetitions: parseInt(ex.prescription.split('x')[1]) || 10,
        completed: ex.completed,
        observations: [
          ex.observations,
          ex.patientFeedback?.pain ? 'DOR' : '',
          ex.patientFeedback?.fatigue ? 'FADIGA' : '',
          ex.patientFeedback?.difficultyPerforming ? 'DIFICULDADE' : '',
          ex.patientFeedback?.notes,
        ].filter(Boolean).join(' | ') || '',
        weight: '',
        image_url: ex.image_url,
      }))
      : sessionExercises;

    try {
      const record = await autoSaveMutation.mutateAsync({
        patient_id: patientId,
        appointment_id: appointmentId,
        recordId: currentSoapRecordId,
        ...saveData,
        pain_level: painScale.level,
        pain_location: painScale.location,
        pain_character: painScale.character
      });

      if (record?.id) {
        setCurrentSoapRecordId(record.id);
        saveVersionForRecord(record.id, {
          subjective: saveData.subjective,
          objective: saveData.objective,
          assessment: saveData.assessment,
          plan: saveData.plan,
          pain_level: painScale.level,
          ...(isV2orV3 && { v2_data: evolutionV2Data as unknown as Record<string, unknown> }),
        }, 'manual').catch(() => {});
      }

      const therapistId = selectedTherapistId || appointment?.therapist_id;
      if (therapistId) {
        await evolutionApi.treatmentSessions.upsert({
          patient_id: patientId,
          therapist_id: String(therapistId),
          appointment_id: appointmentId,
          session_date: new Date().toISOString(),
          observations: saveData.assessment || '',
          exercises_performed: exercisesToSave,
          pain_level_before: painScale.level,
          pain_level_after: painScale.level,
        });
      }
    } catch (error) {
      toast({
        title: 'Erro ao salvar',
        description: error instanceof Error ? error.message : 'Ocorreu um erro ao salvar a evolução.',
        variant: 'destructive'
      });
    }
  };

  const handleCompleteSession = async () => {
    const isV2orV3 = evolutionVersion === 'v2-texto' || evolutionVersion === 'v3-notion';
    const hasContent = isV2orV3 
      ? (evolutionV2Data.patientReport || evolutionV2Data.evolutionText || evolutionV2Data.procedures.length > 0)
      : (soapData.subjective || soapData.objective || soapData.assessment || soapData.plan);

    if (!hasContent) {
      toast({
        title: 'Complete a evolução',
        description: isV2orV3
          ? 'Preencha o texto de evolução antes de concluir o atendimento.'
          : 'Preencha os campos SOAP antes de concluir o atendimento.',
        variant: 'destructive'
      });
      return;
    }

    await handleSave();

    if (appointmentId) {
      completeAppointment(appointmentId, {
        onSuccess: async () => {
          try {
            if (patientId) {
              await awardXp.mutateAsync({
                amount: 100,
                reason: 'session_completed',
                description: 'Sessão de fisioterapia concluída'
              });
            }
          } catch (e) {
            logger.error("Failed to award XP", e, 'PatientEvolution');
          }

          toast({
            title: 'Atendimento concluído',
            description: 'O atendimento foi marcado como concluído com sucesso.'
          });
          setTimeout(() => navigate('/agenda'), 1500);
        }
      });
    }
  };

  const handleExportPDF = async () => {
    if (!patient || !user?.professional || !user?.clinic) {
      toast({
        title: 'Dados incompletos',
        description: 'Não foi possível obter os dados do paciente, profissional ou clínica.',
        variant: 'destructive'
      });
      return;
    }

    try {
      const evaluations = [
        {
          date: new Date(),
          subjective: soapData.subjective || 'Não preenchido',
          objective: soapData.objective || 'Não preenchido',
          assessment: soapData.assessment || 'Não preenchido',
          plan: soapData.plan || 'Não preenchido',
        },
        ...(previousEvolutions.slice(0, 5).map((ev: any) => ({
          date: new Date(ev.created_at),
          subjective: ev.subjective || '',
          objective: ev.objective || '',
          assessment: ev.assessment || '',
          plan: ev.plan || '',
        })))
      ];

      const summary = `Paciente em tratamento fisioterapêutico desde ${patient.created_at ? format(new Date(patient.created_at), 'dd/MM/yyyy', { locale: ptBR }) : 'data não informada'}. ` +
        `Foram realizadas ${previousEvolutions.length + 1} sessões de evolução. ` +
        `Metas atuais: ${goals.filter((g: any) => g.status === 'em_andamento').map((g: any) => g.title).join(', ') || 'Nenhuma'}.`;

      const blob = await generateEvolucao(
        {
          name: PatientHelpers.getName(patient),
          cpf: patient.cpf,
          birthDate: patient.birth_date,
          phone: patient.phone,
          email: patient.email,
          address: patient.address,
        },
        {
          name: user.professional.name,
          crf: user.professional.crf || 'CREFITO',
          uf: user.professional.uf || 'SP',
        },
        {
          name: user.clinic.name,
          phone: user.clinic.phone || '',
          email: user.clinic.email || '',
          address: user.clinic.address || {
            street: '',
            number: '',
            district: '',
            city: user.clinic.city || 'São Paulo',
            state: user.clinic.state || 'SP',
            zipCode: '',
          },
        },
        evaluations,
        summary,
        user.clinic.city || 'São Paulo'
      );

      if (blob) {
        downloadPDF(blob, `evolucao-${PatientHelpers.getName(patient).replace(/\s+/g, '-')}-${Date.now()}.pdf`);
        toast({
          title: 'PDF gerado com sucesso!',
          description: 'O relatório de evolução foi baixado.',
        });
      }
    } catch (error) {
      logger.error('Failed to generate PDF', error, 'PatientEvolution');
      toast({
        title: 'Erro ao gerar PDF',
        description: 'Não foi possível gerar o relatório de evolução.',
        variant: 'destructive'
      });
    }
  };

  return {
    handleCopyPreviousEvolution,
    handleRestoreVersion,
    handleSave,
    handleCompleteSession,
    handleExportPDF,
    isSaving: autoSaveMutation.isPending
  };
}
