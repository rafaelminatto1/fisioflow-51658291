import { request } from "./base";
import type {
  DashboardResponse,
  FinancialReportResponse,
  AnalyticsExerciseUsage,
  AnalyticsPainRegion,
  IntelligentReportRecord,
  IntelligentReportResponse,
  PatientEvolutionPoint,
  PatientProgressSummary,
  PatientLifecycleEvent,
  PatientOutcomeMeasure,
  PatientSessionMetrics,
  PatientPrediction,
  PatientRiskScore,
  PatientInsight,
  PatientGoalTracking,
  ClinicalBenchmark,
  MLTrainingData,
  MlTrainingStats,
  MlTrainingPatientRecord,
  PopulationHealthResponse,
  InventoryItemRow,
  InventoryMovementRow,
  WhatsAppExerciseQueueRow,
} from "@/types/workers";

export const aiApi = {
  service: <TInput, TOutput>(action: string, data: TInput) =>
    request<{ data: TOutput }>("/api/ai/service", {
      method: "POST",
      body: JSON.stringify({ action, data }),
    }),
  translate: (text: string, targetLanguage: string) =>
    request<{ data: { translatedText: string } }>("/api/ai/translate", {
      method: "POST",
      body: JSON.stringify({ text, targetLanguage }),
    }),
  summarize: (text: string, maxLength?: number) =>
    request<{ data: { summary: string } }>("/api/ai/summarize", {
      method: "POST",
      body: JSON.stringify({ text, maxLength }),
    }),
  suggestConduct: (patientData: Record<string, unknown>) =>
    request<{ data: { conduct: string } }>("/api/ai/suggest-conduct", {
      method: "POST",
      body: JSON.stringify({ patientData }),
    }),
  transcribe: (audioUrl: string) =>
    request<{ data: { text: string } }>("/api/ai/transcribe", {
      method: "POST",
      body: JSON.stringify({ audioUrl }),
    }),
  chat: (messages: any[], context?: any) =>
    request<{ data: { message: any } }>("/api/ai/chat", {
      method: "POST",
      body: JSON.stringify({ messages, context }),
    }),
  suggestReply: (params: { patientName: string; context: string }) =>
    request<{ data: { suggestion: string } }>("/api/ai/suggest-reply", {
      method: "POST",
      body: JSON.stringify(params),
    }),
  movementVideo: (params: { videoUrl: string; exerciseName: string }) =>
    request<{
      data: {
        analysis: {
          reps: number;
          score: number;
          errors: string[];
          feedback: string;
          isValidExercise: boolean;
        };
      };
    }>("/api/ai/movement-video", { method: "POST", body: JSON.stringify(params) }),
  transcribeAudio: (params: { audio: string; mimeType: string }) =>
    request<{ data: { transcription: string } }>("/api/ai/transcribe-audio", {
      method: "POST",
      body: JSON.stringify(params),
    }),
  fastProcessing: (params: { text: string; mode: string }) =>
    request<{ data: { result: string } }>("/api/ai/fast-processing", {
      method: "POST",
      body: JSON.stringify(params),
    }),
};

export const analyticsApi = {
  dashboard: (params?: { period?: string; startDate?: string; endDate?: string }) => {
    const qs = new URLSearchParams(
      Object.entries(params ?? {}).map(([k, v]) => [k, String(v)]),
    ).toString();
    return request<DashboardResponse>(`/api/insights/dashboard${qs ? `?${qs}` : ""}`);
  },
  financial: (params: { startDate: string; endDate: string }) =>
    request<FinancialReportResponse>(
      `/api/insights/financial?startDate=${encodeURIComponent(
        params.startDate,
      )}&endDate=${encodeURIComponent(params.endDate)}`,
    ),
  topExercises: (limit?: number) =>
    request<{ data: AnalyticsExerciseUsage[] }>(
      `/api/insights/top-exercises${limit ? `?limit=${encodeURIComponent(String(limit))}` : ""}`,
    ),
  painMap: (limit?: number) =>
    request<{ data: AnalyticsPainRegion[] }>(
      `/api/insights/pain-map${limit ? `?limit=${encodeURIComponent(String(limit))}` : ""}`,
    ),
  intelligentReports: {
    list: (patientId: string) =>
      request<{ data: IntelligentReportRecord[] }>(
        `/api/insights/intelligent-reports/${patientId}`,
      ),
    generate: (payload: {
      patientId: string;
      reportType: string;
      dateRange: { start: string; end: string };
    }) =>
      request<{ data: IntelligentReportResponse }>("/api/insights/intelligent-reports", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
  },
  patientEvolution: (patientId: string) =>
    request<{ data: PatientEvolutionPoint[] }>(`/api/insights/patient-evolution/${patientId}`),
  patientProgress: (patientId: string) =>
    request<{ data: PatientProgressSummary }>(`/api/insights/patient-progress/${patientId}`),
  patientLifecycleEvents: {
    list: (patientId: string) =>
      request<{ data: PatientLifecycleEvent[] }>(
        `/api/insights/patient-lifecycle-events/${patientId}`,
      ),
    create: (data: {
      patient_id: string;
      event_type: string;
      event_date?: string;
      notes?: string;
    }) =>
      request<{ data: PatientLifecycleEvent }>("/api/insights/patient-lifecycle-events", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },
  patientOutcomeMeasures: {
    list: (patientId: string, params?: { measureType?: string; limit?: number }) => {
      const qs = new URLSearchParams(
        Object.entries(params ?? {})
          .filter(([, v]) => v != null)
          .map(([k, v]) => [k, String(v)]),
      ).toString();
      return request<{ data: PatientOutcomeMeasure[] }>(
        `/api/insights/patient-outcome-measures/${patientId}${qs ? `?${qs}` : ""}`,
      );
    },
    create: (data: {
      patient_id: string;
      measure_type: string;
      measure_name: string;
      score: number;
      normalized_score?: number;
      min_score?: number;
      max_score?: number;
      measurement_date?: string;
      body_part?: string;
      context?: string;
      notes?: string;
    }) =>
      request<{ data: PatientOutcomeMeasure }>("/api/insights/patient-outcome-measures", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },
  patientSessionMetrics: {
    list: (patientId: string, params?: { limit?: number }) => {
      const qs = new URLSearchParams(
        Object.entries(params ?? {})
          .filter(([, v]) => v != null)
          .map(([k, v]) => [k, String(v)]),
      ).toString();
      return request<{ data: PatientSessionMetrics[] }>(
        `/api/insights/patient-session-metrics/${patientId}${qs ? `?${qs}` : ""}`,
      );
    },
    create: (data: Partial<PatientSessionMetrics & { patient_id: string }>) =>
      request<{ data: PatientSessionMetrics }>("/api/insights/patient-session-metrics", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },
  patientPredictions: {
    list: (patientId: string, params?: { predictionType?: string; limit?: number }) => {
      const qs = new URLSearchParams(
        Object.entries(params ?? {})
          .filter(([, v]) => v != null)
          .map(([k, v]) => [k, String(v)]),
      ).toString();
      return request<{ data: PatientPrediction[] }>(
        `/api/insights/patient-predictions/${patientId}${qs ? `?${qs}` : ""}`,
      );
    },
    upsert: (payload: {
      patient_id: string;
      predictions: Array<{
        prediction_type: string;
        features?: Record<string, unknown>;
        predicted_value?: number;
        predicted_class?: string;
        confidence_score: number;
        confidence_interval?: Record<string, number>;
        target_date?: string;
        timeframe_days?: number;
        model_version: string;
        model_name?: string;
        milestones?: unknown[];
        risk_factors?: unknown[];
        treatment_recommendations?: Record<string, unknown>;
        similar_cases?: Record<string, unknown>;
      }>;
    }) =>
      request<{ data: PatientPrediction[] }>("/api/insights/patient-predictions/upsert", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
  },
  patientRisk: (patientId: string) =>
    request<{ data: PatientRiskScore | null }>(`/api/insights/patient-risk/${patientId}`),
  patientInsights: {
    list: (patientId: string, params?: { includeAcknowledged?: boolean }) => {
      const qs = new URLSearchParams(
        Object.entries(params ?? {})
          .filter(([, v]) => v != null)
          .map(([k, v]) => [k, String(v)]),
      ).toString();
      return request<{ data: PatientInsight[] }>(
        `/api/insights/patient-insights/${patientId}${qs ? `?${qs}` : ""}`,
      );
    },
    acknowledge: (insightId: string) =>
      request<{ data: PatientInsight }>(`/api/insights/patient-insights/${insightId}/acknowledge`, {
        method: "PATCH",
      }),
  },
  patientGoals: {
    list: (patientId: string) =>
      request<{ data: PatientGoalTracking[] }>(`/api/insights/patient-goals/${patientId}`),
    create: (data: Partial<PatientGoalTracking & { patient_id: string }>) =>
      request<{ data: PatientGoalTracking }>("/api/insights/patient-goals", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<PatientGoalTracking>) =>
      request<{ data: PatientGoalTracking }>(`/api/insights/patient-goals/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    complete: (id: string) =>
      request<{ data: PatientGoalTracking }>(`/api/insights/patient-goals/${id}/complete`, {
        method: "PATCH",
      }),
  },
  clinicalBenchmarks: {
    list: (category?: string) => {
      const qs = category ? `?category=${encodeURIComponent(category)}` : "";
      return request<{ data: ClinicalBenchmark[] }>(`/api/insights/clinical-benchmarks${qs}`);
    },
  },
  mlTrainingData: {
    collect: (patientId: string) =>
      request<{ data: MLTrainingData }>(`/api/insights/ml-training-data/patient/${patientId}`),
    upsert: (data: Partial<MLTrainingData>) =>
      request<{ data: MLTrainingData }>("/api/insights/ml-training-data", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    stats: () => request<{ data: MlTrainingStats }>("/api/insights/ml-training-data/stats"),
    patients: (params?: { limit?: number }) => {
      const qs = params?.limit ? `?limit=${encodeURIComponent(String(params.limit))}` : "";
      return request<{ data: MlTrainingPatientRecord[] }>(
        `/api/insights/ml-training-data/patients${qs}`,
      );
    },
    similar: (options: { condition: string; minAge?: number; maxAge?: number; limit?: number }) => {
      const qs = new URLSearchParams(
        Object.entries({
          condition: options.condition,
          minAge: options.minAge,
          maxAge: options.maxAge,
          limit: options.limit,
        })
          .filter(([, v]) => v != null)
          .map(([k, v]) => [k, String(v)]),
      ).toString();
      return request<{ data: MLTrainingData[] }>(
        `/api/insights/ml-training-data/similar${qs ? `?${qs}` : ""}`,
      );
    },
  },
  populationHealth: {
    query: (params: { startDate: string; endDate: string }) => {
      const qs = new URLSearchParams({
        startDate: params.startDate,
        endDate: params.endDate,
      }).toString();
      return request<{ data: PopulationHealthResponse }>(`/api/insights/population-health?${qs}`);
    },
  },
};

const innovations = (path: string, opts?: RequestInit) =>
  request<any>(`/api/innovations${path}`, opts);
export const innovationsApi = {
  inventory: {
    list: (params?: { activeOnly?: boolean }) => {
      const query = new URLSearchParams(
        Object.fromEntries(
          Object.entries(params ?? {})
            .filter(([, v]) => v != null)
            .map(([k, v]) => [k, String(v)]),
        ),
      );
      return innovations(`/inventory${query.toString() ? `?${query.toString()}` : ""}`);
    },
    create: (data: Partial<InventoryItemRow>) =>
      innovations("/inventory", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<InventoryItemRow>) =>
      innovations(`/inventory/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      innovations(`/inventory/${id}`, {
        method: "DELETE",
      }),
  },
  inventoryMovements: {
    list: (params?: { inventoryId?: string; limit?: number }) => {
      const query = new URLSearchParams(
        Object.fromEntries(
          Object.entries(params ?? {})
            .filter(([, v]) => v != null)
            .map(([k, v]) => [k, String(v)]),
        ),
      );
      return innovations(`/inventory-movements${query.toString() ? `?${query.toString()}` : ""}`);
    },
    create: (data: Partial<InventoryMovementRow>) =>
      innovations("/inventory-movements", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },
  staffPerformance: {
    list: (params?: { therapistId?: string; startDate?: string; endDate?: string }) => {
      const query = new URLSearchParams(
        Object.fromEntries(
          Object.entries(params ?? {})
            .filter(([, v]) => v != null)
            .map(([k, v]) => [k, String(v)]),
        ),
      );
      return innovations(`/staff-performance${query.toString() ? `?${query.toString()}` : ""}`);
    },
  },
  appointmentPredictions: {
    list: (params?: { limit?: number }) => {
      const query = new URLSearchParams(
        Object.fromEntries(
          Object.entries(params ?? {})
            .filter(([, v]) => v != null)
            .map(([k, v]) => [k, String(v)]),
        ),
      );
      return innovations(
        `/appointment-predictions${query.toString() ? `?${query.toString()}` : ""}`,
      );
    },
  },
  revenueForecasts: {
    list: (params?: { limit?: number }) => {
      const query = new URLSearchParams(
        Object.fromEntries(
          Object.entries(params ?? {})
            .filter(([, v]) => v != null)
            .map(([k, v]) => [k, String(v)]),
        ),
      );
      return innovations(`/revenue-forecasts${query.toString() ? `?${query.toString()}` : ""}`);
    },
  },
  whatsappExerciseQueue: {
    list: (params?: { limit?: number }) => {
      const query = new URLSearchParams(
        Object.fromEntries(
          Object.entries(params ?? {})
            .filter(([, v]) => v != null)
            .map(([k, v]) => [k, String(v)]),
        ),
      );
      return innovations(
        `/whatsapp-exercise-queue${query.toString() ? `?${query.toString()}` : ""}`,
      );
    },
    create: (data: Partial<WhatsAppExerciseQueueRow>) =>
      innovations("/whatsapp-exercise-queue", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },
  patientSelfAssessments: {
    list: (params?: { patientId?: string; limit?: number }) => {
      const query = new URLSearchParams(
        Object.fromEntries(
          Object.entries(params ?? {})
            .filter(([, v]) => v != null)
            .map(([k, v]) => [k, String(v)]),
        ),
      );
      return innovations(
        `/patient-self-assessments${query.toString() ? `?${query.toString()}` : ""}`,
      );
    },
  },
  getWeeklyActivity: () => innovations("/weekly-activity"),
};
