import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { usePDFGenerator } from "@/hooks/usePDFGenerator";
import { useExportPdf } from "@/hooks/useExportPdf";
import { useAppointmentActions } from "@/hooks/useAppointmentActions";
import { useGamification } from "@/hooks/useGamification";
import { useAutoSaveSoapRecord } from "@/hooks/useSoapRecords";
import { useEvolutionVersionHistory } from "@/hooks/evolution/useEvolutionVersionHistory";
import { evolutionApi } from "@/api/v2/clinical";
import { fisioLogger as logger } from "@/lib/errors/logger";
import { PatientHelpers } from "@/types";
import type { EvolutionData } from "./usePatientEvolutionState";

import { stripHtml } from "@/lib/utils/stripHtml";

export function usePatientEvolutionHandlers({
  patientId,
  appointmentId,
  patient,
  appointment,
  evolutionData,
  setEvolutionData,
  setEvolutionV2Data,
  currentSoapRecordId,
  setCurrentSoapRecordId,
  previousEvolutions,
  requiredMeasurements,
  todayMeasurements,
  goals: _goals,
  user,
  selectedTherapistId,
}: any) {
  const { toast } = useToast();
  const navigate = useNavigate();
  usePDFGenerator();
  const { completeAppointment } = useAppointmentActions();
  const { awardXp } = useGamification(patientId || "");
  const { exportPdf } = useExportPdf();
  const autoSaveMutation = useAutoSaveSoapRecord();
  const { saveVersionForRecord } = useEvolutionVersionHistory(currentSoapRecordId);

  const current: EvolutionData = evolutionData ?? {
    observacao: "",
    painScale: null,
    procedures: [],
    exercises: [],
    measurements: [],
    homeExercises: [],
  };

  const handleCopyPreviousEvolution = useCallback(
    (evolution: any) => {
      const homeExercisesList = Array.isArray(evolution.home_exercises)
        ? evolution.home_exercises.map((item: any) => ({
            id: item.id || '',
            name: item.name || '',
            prescription: item.prescription || '',
            instructions: item.notes || item.instructions || '',
          }))
        : [];
      const homeCareExercisesString = homeExercisesList.length > 0
        ? JSON.stringify(homeExercisesList)
        : "";

      setEvolutionData?.({
        observacao: evolution.observacao ?? "",
        painScale: evolution.pain_scale ?? null,
        procedures: Array.isArray(evolution.procedures) ? evolution.procedures : [],
        exercises: Array.isArray(evolution.exercises) ? evolution.exercises : [],
        measurements: Array.isArray(evolution.measurements) ? evolution.measurements : [],
        homeExercises: Array.isArray(evolution.home_exercises) ? evolution.home_exercises : [],
      });

      setEvolutionV2Data?.((prev: any) => ({
        ...prev,
        patientReport: "",
        evolutionText: "",
        observations: evolution.observacao ?? "",
        procedures: Array.isArray(evolution.procedures) ? evolution.procedures : [],
        exercises: Array.isArray(evolution.exercises) ? evolution.exercises : [],
        measurements: Array.isArray(evolution.measurements) ? evolution.measurements : [],
        homeCareExercises: homeCareExercisesString,
        painLevel: evolution.pain_scale ?? undefined,
        unifiedItems: undefined,
      }));

      toast({
        title: "Evolução copiada",
        description: "Os dados da evolução anterior foram copiados.",
      });
    },
    [setEvolutionData, setEvolutionV2Data, toast],
  );

  const handleRestoreVersion = useCallback(
    (content: any) => {
      if (!setEvolutionData) return;

      const rawHomeExercises = content.home_exercises ?? content.homeExercises;
      const homeExercisesList = Array.isArray(rawHomeExercises)
        ? rawHomeExercises.map((item: any) => ({
            id: item.id || '',
            name: item.name || '',
            prescription: item.prescription || '',
            instructions: item.notes || item.instructions || '',
          }))
        : [];
      const homeCareExercisesString = homeExercisesList.length > 0
        ? JSON.stringify(homeExercisesList)
        : "";

      const observacaoVal = content.observacao ?? content.body ?? "";
      const painScaleVal = content.pain_scale ?? content.painScale ?? null;
      const proceduresVal = Array.isArray(content.procedures) ? content.procedures : [];
      const exercisesVal = Array.isArray(content.exercises) ? content.exercises : [];
      const measurementsVal = Array.isArray(content.measurements) ? content.measurements : [];
      const homeExercisesVal = Array.isArray(rawHomeExercises) ? rawHomeExercises : [];

      setEvolutionData({
        observacao: observacaoVal,
        painScale: painScaleVal,
        procedures: proceduresVal,
        exercises: exercisesVal,
        measurements: measurementsVal,
        homeExercises: homeExercisesVal,
      });

      setEvolutionV2Data?.((prev: any) => ({
        ...prev,
        patientReport: "",
        evolutionText: "",
        observations: observacaoVal,
        procedures: proceduresVal,
        exercises: exercisesVal,
        measurements: measurementsVal,
        homeCareExercises: homeCareExercisesString,
        painLevel: painScaleVal ?? undefined,
        unifiedItems: undefined,
      }));
    },
    [setEvolutionData, setEvolutionV2Data],
  );

  const handleSave = async () => {
    const pendingCriticalTests = (requiredMeasurements ?? []).filter((req: any) => {
      const hasMeasurementToday = (todayMeasurements ?? []).some(
        (m: any) => m.measurement_name === req.measurement_name,
      );
      return req.alert_level === "high" && !hasMeasurementToday;
    });

    if (pendingCriticalTests.length > 0) {
      toast({
        title: "Testes Obrigatórios Pendentes",
        description: `É necessário realizar: ${pendingCriticalTests.map((t: any) => t.measurement_name).join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    const hasObservation = !!stripHtml(current.observacao || "");
    const hasStructured =
      current.procedures.length > 0 ||
      current.exercises.length > 0 ||
      current.measurements.length > 0 ||
      current.homeExercises.length > 0;
    const hasPain = current.painScale != null;

    if (!hasObservation && !hasStructured && !hasPain) {
      toast({
        title: "Campos vazios",
        description: "Escreva a observação, registre a dor ou adicione procedimentos/exercícios.",
        variant: "destructive",
      });
      return;
    }

    if (!patientId) return;

    try {
      const record = await autoSaveMutation.mutateAsync({
        patient_id: patientId,
        appointment_id: appointmentId,
        recordId: currentSoapRecordId,
        ...(selectedTherapistId ? { therapist_id: selectedTherapistId } : {}),
        observacao: current.observacao,
        pain_scale: current.painScale,
        procedures: current.procedures,
        exercises: current.exercises,
        measurements: current.measurements,
        home_exercises: current.homeExercises,
      });

      if (record?.id) {
        setCurrentSoapRecordId?.(record.id);
        saveVersionForRecord(
          record.id,
          {
            observacao: current.observacao,
            pain_scale: current.painScale,
            procedures: current.procedures,
            exercises: current.exercises,
            measurements: current.measurements,
            home_exercises: current.homeExercises,
          },
          "manual",
        ).catch(() => {});
      }

      const therapistId =
        selectedTherapistId || appointment?.therapist_id || appointment?.therapistId;
      if (therapistId) {
        await evolutionApi.treatmentSessions
          .upsert({
            patient_id: patientId,
            therapist_id: String(therapistId),
            appointment_id: appointmentId,
            session_date: new Date().toISOString(),
            observations: stripHtml(current.observacao || ""),
            exercises_performed: current.exercises,
            pain_level_before: current.painScale ?? undefined,
            pain_level_after: current.painScale ?? undefined,
          })
          .catch(() => {});
      }
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description:
          error instanceof Error ? error.message : "Ocorreu um erro ao salvar a evolução.",
        variant: "destructive",
      });
    }
  };

  const handleCompleteSession = async () => {
    if (!selectedTherapistId) {
      toast({
        title: "Fisioterapeuta obrigatório",
        description: "Selecione o fisioterapeuta responsável antes de concluir o atendimento.",
        variant: "destructive",
      });
      return;
    }

    const hasContent =
      stripHtml(current.observacao || "").length > 0 ||
      current.procedures.length > 0 ||
      current.exercises.length > 0;

    if (!hasContent) {
      toast({
        title: "Complete a evolução",
        description: "Preencha a observação clínica antes de concluir o atendimento.",
        variant: "destructive",
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
                reason: "session_completed",
                description: "Sessão de fisioterapia concluída",
              });
            }
          } catch (e) {
            logger.error("Failed to award XP", e, "PatientEvolution");
          }

          toast({
            title: "Atendimento concluído",
            description: "O atendimento foi marcado como concluído com sucesso.",
          });
          setTimeout(() => navigate("/agenda"), 1500);
        },
      });
    }
  };

  const handleExportPDF = async () => {
    if (!patient || !user?.professional || !user?.clinic) {
      toast({
        title: "Dados incompletos",
        description: "Não foi possível obter os dados do paciente, profissional ou clínica.",
        variant: "destructive",
      });
      return;
    }

    try {
      const proceduresList = current.procedures
        .map(
          (p) => `<li>${p.completed ? "✓ " : "• "}${p.name}${p.notes ? ` — ${p.notes}` : ""}</li>`,
        )
        .join("");
      const exercisesList = current.exercises
        .map((e) => `<li>${e.name}${e.prescription ? ` — ${e.prescription}` : ""}</li>`)
        .join("");
      const homeList = current.homeExercises
        .map((e) => `<li>${e.name}${e.prescription ? ` — ${e.prescription}` : ""}</li>`)
        .join("");

      const htmlContent = `
        <div style="padding: 20px; font-family: sans-serif;">
          <h1 style="color: #2563eb; text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">Evolução Clínica de Fisioterapia</h1>

          <section style="margin-top: 20px;">
            <h3 style="background: #f3f4f6; padding: 8px; border-radius: 4px; border-left: 4px solid #2563eb;">Dados do Paciente</h3>
            <div style="display: grid; grid-template-cols: 1fr 1fr; gap: 10px;">
              <p><strong>Nome:</strong> ${PatientHelpers.getName(patient)}</p>
              <p><strong>CPF:</strong> ${patient.cpf || "N/A"}</p>
              <p><strong>Nascimento:</strong> ${patient.birth_date ? format(new Date(patient.birth_date), "dd/MM/yyyy") : "N/A"}</p>
              <p><strong>Telefone:</strong> ${patient.phone || "N/A"}</p>
            </div>
          </section>

          <section style="margin-top: 20px;">
            <h3 style="background: #f3f4f6; padding: 8px; border-radius: 4px; border-left: 4px solid #2563eb;">Sessão de ${format(new Date(), "dd/MM/yyyy")}</h3>
            <div style="border: 1px solid #e5e7eb; padding: 15px; border-radius: 8px;">
              <p><strong>Dor (EVA):</strong> ${current.painScale ?? "—"}/10</p>
              <div style="margin-top: 10px;">${current.observacao || "<em>Sem observação</em>"}</div>
              ${proceduresList ? `<h4>Procedimentos realizados</h4><ul>${proceduresList}</ul>` : ""}
              ${exercisesList ? `<h4>Exercícios na sessão</h4><ul>${exercisesList}</ul>` : ""}
              ${homeList ? `<h4>Exercícios para casa</h4><ul>${homeList}</ul>` : ""}
            </div>
          </section>

          <section style="margin-top: 20px;">
            <h3 style="background: #f3f4f6; padding: 8px; border-radius: 4px; border-left: 4px solid #2563eb;">Histórico de Sessões</h3>
            ${(previousEvolutions ?? [])
              .slice(0, 5)
              .map(
                (ev: any) => `
              <div style="border-bottom: 1px solid #f3f4f6; padding: 10px 0;">
                <p style="font-size: 12px; color: #666; font-weight: bold;">Sessão em ${format(new Date(ev.created_at), "dd/MM/yyyy")}</p>
                <p style="font-size: 14px; margin-top: 4px;">${stripHtml(ev.observacao || "").slice(0, 240) || "Sem registro."}</p>
              </div>
            `,
              )
              .join("")}
          </section>

          <div style="margin-top: 60px; text-align: center;">
            <div style="width: 250px; border-top: 1px solid #000; margin: 0 auto;"></div>
            <p style="margin-top: 5px;"><strong>${user.professional.name}</strong></p>
            <p style="font-size: 12px; color: #666;">${user.professional.crf || "CREFITO"} | ${user.clinic.name}</p>
          </div>
        </div>
      `;

      await exportPdf(
        htmlContent,
        `evolucao-${PatientHelpers.getName(patient).replace(/\s+/g, "-")}-${format(new Date(), "yyyy-MM-dd")}`,
        "Relatório de Evolução",
      );
    } catch (error) {
      logger.error("Failed to generate PDF", error, "PatientEvolution");
      toast({
        title: "Erro ao gerar PDF",
        description: "Não foi possível gerar o relatório de evolução.",
        variant: "destructive",
      });
    }
  };

  return {
    handleCopyPreviousEvolution,
    handleRestoreVersion,
    handleSave,
    handleCompleteSession,
    handleExportPDF,
    isSaving: autoSaveMutation.isPending,
    isCompleting: false,
  };
}
