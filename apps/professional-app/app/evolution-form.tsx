import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColors } from "@/hooks/useColorScheme";
import { useHaptics } from "@/hooks/useHaptics";
import { ObservacaoForm } from "@/components/evolution/ObservacaoForm";
import { EvolutionChipList, type ChipItem } from "@/components/evolution/EvolutionChipList";
import { PainLevelSlider } from "@/components/evolution/PainLevelSlider";
import { PhotoUpload } from "@/components/evolution/PhotoUpload";
import { SignaturePad } from "@/components/evolution/SignaturePad";
import { fetchApi } from "@/lib/api";

type StructuredItem = ChipItem;

function arrayToChips(
  items: any[] | undefined,
  extractDetail?: (item: any) => string | undefined,
): StructuredItem[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((item, idx) => {
      if (!item) return null;
      const id = typeof item.id === "string" && item.id ? item.id : `legacy_${idx}`;
      const name = typeof item.name === "string" ? item.name : "";
      if (!name) return null;
      const detail = extractDetail ? extractDetail(item) : undefined;
      return { id, name, detail };
    })
    .filter(Boolean) as StructuredItem[];
}

function chipsToProcedures(chips: StructuredItem[]) {
  return chips.map((c) => ({ id: c.id, name: c.name, notes: c.detail }));
}

function chipsToExercises(chips: StructuredItem[]) {
  return chips.map((c) => ({ id: c.id, name: c.name, prescription: c.detail }));
}

function chipsToMeasurements(chips: StructuredItem[]) {
  // detail é livre (ex.: "120º" ou "5kg"); guardamos como `unit` + value 0 placeholder.
  return chips.map((c) => ({ id: c.id, name: c.name, unit: c.detail ?? "", value: 0 }));
}

function chipsToHomeExercises(chips: StructuredItem[]) {
  return chips.map((c) => ({ id: c.id, name: c.name, frequency: c.detail }));
}

export default function EvolutionFormScreen() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams();

  const rawPatientId = params.patientId as string;
  const patientId = rawPatientId && rawPatientId !== "undefined" ? rawPatientId : "";
  const patientName = (params.patientName as string) || "Paciente";
  const rawAppointmentId = params.appointmentId as string | undefined;
  const appointmentId =
    rawAppointmentId && rawAppointmentId !== "undefined" ? rawAppointmentId : undefined;

  const { success, error: hapticError } = useHaptics();

  // Form state — modelo único (observação livre + estruturados)
  const [observacao, setObservacao] = useState("");
  const [painLevel, setPainLevel] = useState(0);
  const [procedures, setProcedures] = useState<StructuredItem[]>([]);
  const [exercises, setExercises] = useState<StructuredItem[]>([]);
  const [measurements, setMeasurements] = useState<StructuredItem[]>([]);
  const [homeExercises, setHomeExercises] = useState<StructuredItem[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [patientSignatureUrl, setPatientSignatureUrl] = useState<string | null>(null);

  // Auto-save state
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [autoSaveErrorDetail, setAutoSaveErrorDetail] = useState<string | null>(null);
  const savedEvolutionId = useRef<string | null>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // AI Generation state
  const [generatingAi, setGeneratingAi] = useState(false);

  // Carregar rascunho (servidor + local)
  useEffect(() => {
    if (!patientId) return;

    const DRAFT_KEY = `evolution_draft_${patientId}`;

    const fetchDraft = async () => {
      setAutoSaveStatus("saving");
      try {
        const localDraftStr = await AsyncStorage.getItem(DRAFT_KEY);
        const localDraft = localDraftStr ? JSON.parse(localDraftStr) : null;

        let serverDraft: any = null;
        let url = `/api/sessions?patientId=${patientId}&status=draft&limit=1`;
        if (appointmentId) url += `&appointmentId=${appointmentId}`;
        try {
          const res = await fetchApi<{ data: any[] }>(url);
          serverDraft = res.data?.[0];
        } catch {
          console.log("[EvolutionForm] Server unreachable, using local cache if available");
        }

        const draft = serverDraft || localDraft;
        if (draft && !savedEvolutionId.current) {
          savedEvolutionId.current = serverDraft?.id || null;

          // Compat: aceita tanto shape novo (observacao) quanto legacy (assessment)
          const obs =
            (typeof draft.observacao === "string" && draft.observacao) ||
            [draft.subjective, draft.objective, draft.assessment, draft.plan]
              .filter(Boolean)
              .join("\n\n") ||
            "";

          const cleanObs = obs
            .replace(/<br\s*\/?>/gi, "\n")
            .replace(/<\/p>/gi, "\n\n")
            .replace(/<[^>]*>?/gm, "")
            .trim();

          setObservacao(cleanObs);
          setPainLevel(Number(draft.pain_scale ?? draft.pain_level ?? 0));
          setProcedures(arrayToChips(draft.procedures, (it) => it.notes));
          setExercises(arrayToChips(draft.exercises, (it) => it.prescription || it.notes));
          setMeasurements(
            arrayToChips(draft.measurements, (it) => (it.unit ? String(it.unit) : undefined)),
          );
          setHomeExercises(
            arrayToChips(draft.home_exercises, (it) => it.frequency || it.prescription),
          );

          if (Array.isArray(draft.photos)) setPhotos(draft.photos);
          if (Array.isArray(draft.attachments)) setPhotos(draft.attachments);
          if (draft.patient_signature_url) setPatientSignatureUrl(draft.patient_signature_url);

          setAutoSaveStatus("saved");
        } else {
          setAutoSaveStatus("idle");
        }
      } catch (err: any) {
        console.error("[EvolutionForm] Error fetching draft:", err);
        setAutoSaveStatus("idle");
      }
    };
    fetchDraft();
  }, [patientId, appointmentId]);

  // Auto-save debounced — local imediato, servidor a cada 5s
  const triggerAutoSave = useCallback(() => {
    const DRAFT_KEY = `evolution_draft_${patientId}`;

    const saveLocal = async () => {
      const draftData = {
        observacao: observacao.trim(),
        pain_scale: painLevel,
        procedures: chipsToProcedures(procedures),
        exercises: chipsToExercises(exercises),
        measurements: chipsToMeasurements(measurements),
        home_exercises: chipsToHomeExercises(homeExercises),
        photos,
        patient_signature_url: patientSignatureUrl,
        updatedAt: new Date().toISOString(),
      };
      try {
        await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(draftData));
      } catch (err: any) {
        console.warn("[EvolutionForm] Local save failed", err);
      }
    };
    saveLocal();

    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      const hasContent =
        observacao.trim() ||
        procedures.length ||
        exercises.length ||
        measurements.length ||
        homeExercises.length ||
        painLevel > 0;
      if (!hasContent || !patientId) return;

      setAutoSaveStatus("saving");
      setAutoSaveErrorDetail(null);
      try {
        const body: Record<string, any> = {
          patient_id: patientId,
          appointment_id: appointmentId ?? null,
          record_date: new Date().toISOString().split("T")[0],
          observacao: observacao.trim(),
          pain_scale: painLevel,
          procedures: chipsToProcedures(procedures),
          exercises: chipsToExercises(exercises),
          measurements: chipsToMeasurements(measurements),
          home_exercises: chipsToHomeExercises(homeExercises),
          patient_signature_url: patientSignatureUrl,
        };
        if (savedEvolutionId.current) body.recordId = savedEvolutionId.current;

        const res = await fetchApi<{ data: { id: string } }>("/api/sessions/autosave", {
          method: "POST",
          data: { ...body, photos },
        });
        savedEvolutionId.current = res.data?.id ?? savedEvolutionId.current;
        setAutoSaveStatus("saved");
      } catch (err: any) {
        setAutoSaveStatus("error");
        const technicalDetail = [
          err?.message,
          err?.status ? `status=${err.status}` : null,
          err?.endpoint ? `endpoint=${err.endpoint}` : null,
        ]
          .filter(Boolean)
          .join(" | ");
        setAutoSaveErrorDetail(technicalDetail || null);
        console.error("[AutoSave Server Error]", err);
      }
    }, 5000);
  }, [
    observacao,
    painLevel,
    procedures,
    exercises,
    measurements,
    homeExercises,
    photos,
    patientSignatureUrl,
    patientId,
    appointmentId,
  ]);

  useEffect(() => {
    triggerAutoSave();
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [triggerAutoSave]);

  // Gerar com IA — endpoint mantém compat com o backend novo (observação narrativa)
  const handleGenerateWithAI = async () => {
    setGeneratingAi(true);
    try {
      const data = await fetchApi<any>("/api/ai/soap-suggestions", {
        method: "POST",
        data: {
          patientId,
          appointmentId,
          painLevel,
          mode: "Observacao",
          context: { observacao, procedures: chipsToProcedures(procedures) },
        },
      });
      const generated =
        (typeof data?.observacao === "string" && data.observacao) ||
        (typeof data?.freeText === "string" && data.freeText) ||
        "";
      if (generated) {
        setObservacao((prev) => (prev ? `${prev}\n\n${generated}` : generated));
      }
      success();
      Alert.alert("Sucesso", "Sugestão gerada com IA!");
    } catch (err: any) {
      hapticError();
      Alert.alert("Erro", err?.message ?? "Não foi possível gerar com IA");
    } finally {
      setGeneratingAi(false);
    }
  };

  const handleFinalize = async () => {
    try {
      setAutoSaveStatus("saving");
      const DRAFT_KEY = `evolution_draft_${patientId}`;
      await AsyncStorage.removeItem(DRAFT_KEY);
      success();
      router.back();
    } catch {
      hapticError();
      Alert.alert("Erro", "Não foi possível finalizar a evolução.");
    }
  };

  const autoSaveLabel =
    autoSaveStatus === "saving"
      ? "Salvando..."
      : autoSaveStatus === "saved"
        ? "Salvo automaticamente"
        : autoSaveStatus === "error"
          ? "Erro ao salvar"
          : "";

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
        style={styles.keyboardAvoidingView}
      >
        <Stack.Screen options={{ headerShown: false }} />

        <View
          style={[
            styles.header,
            { backgroundColor: colors.surface, borderBottomColor: colors.border },
          ]}
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Nova Evolução</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
              {patientName}
            </Text>
          </View>
          <TouchableOpacity onPress={handleFinalize} style={styles.finalizeButton}>
            <Text style={[styles.finalizeButtonText, { color: colors.primary }]}>Finalizar</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          {/* 🔴 EVA */}
          <PainLevelSlider painLevel={painLevel} onValueChange={setPainLevel} colors={colors} />

          {/* 🟡 Observação clínica */}
          <ObservacaoForm value={observacao} onChange={setObservacao} colors={colors} />

          {/* 🟢 Procedimentos */}
          <EvolutionChipList
            title="Procedimentos"
            icon="medkit-outline"
            accent="#16a34a"
            items={procedures}
            onChange={setProcedures}
            colors={colors}
            withDetail
            detailPlaceholder="Notas"
          />

          {/* 🟢 Exercícios em sessão */}
          <EvolutionChipList
            title="Exercícios (sessão)"
            icon="barbell-outline"
            accent="#0ea5e9"
            items={exercises}
            onChange={setExercises}
            colors={colors}
            withDetail
            detailPlaceholder="3x10"
          />

          {/* 🟣 Medições */}
          <EvolutionChipList
            title="Medições"
            icon="speedometer-outline"
            accent="#db2777"
            items={measurements}
            onChange={setMeasurements}
            colors={colors}
            withDetail
            detailPlaceholder="Valor / unidade"
          />

          {/* ⚪ Exercícios para casa (HEP) */}
          <EvolutionChipList
            title="Exercícios para Casa"
            icon="home-outline"
            accent="#6b7280"
            items={homeExercises}
            onChange={setHomeExercises}
            colors={colors}
            withDetail
            detailPlaceholder="2x/dia"
          />

          {/* ⚫ Anexos / fotos */}
          <PhotoUpload photos={photos} onPhotosChange={setPhotos} colors={colors} />

          {/* Assinatura */}
          {patientSignatureUrl ? (
            <View style={{ marginVertical: 16 }}>
               <Text style={[styles.headerTitle, { color: colors.text, marginBottom: 8 }]}>Assinatura do Paciente</Text>
               <View style={{ height: 120, borderWidth: 1, borderColor: colors.border, borderRadius: 8, overflow: 'hidden' }}>
                 <Image source={{ uri: patientSignatureUrl }} style={{ width: '100%', height: '100%', resizeMode: 'contain' }} alt="Assinatura" />
               </View>
               <TouchableOpacity 
                  style={{ marginTop: 8 }} 
                  onPress={() => setPatientSignatureUrl(null)}
               >
                 <Text style={{ color: colors.error }}>Remover Assinatura</Text>
               </TouchableOpacity>
            </View>
          ) : (
            <SignaturePad onSignatureSaved={setPatientSignatureUrl} colors={colors} />
          )}

          {/* IA */}
          <View style={styles.aiButtonContainer}>
            <TouchableOpacity
              style={styles.aiButton}
              onPress={handleGenerateWithAI}
              disabled={generatingAi}
            >
              {generatingAi ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="sparkles" size={20} color="#fff" />
                  <Text style={styles.aiButtonText}>Gerar com IA</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {autoSaveLabel ? (
            <View style={styles.autoSaveContainer}>
              <View style={styles.autoSaveRow}>
                {autoSaveStatus === "saving" && (
                  <ActivityIndicator size="small" color={colors.textSecondary} />
                )}
                {autoSaveStatus === "saved" && (
                  <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                )}
                {autoSaveStatus === "error" && (
                  <Ionicons name="alert-circle" size={16} color={colors.error ?? "#EF4444"} />
                )}
                <Text
                  style={[
                    styles.autoSaveText,
                    {
                      color:
                        autoSaveStatus === "error"
                          ? (colors.error ?? "#EF4444")
                          : autoSaveStatus === "saved"
                            ? "#10B981"
                            : colors.textSecondary,
                    },
                  ]}
                >
                  {autoSaveLabel}
                </Text>
              </View>
              {autoSaveStatus === "error" && autoSaveErrorDetail ? (
                <Text style={[styles.autoSaveErrorDetail, { color: colors.textSecondary }]}>
                  {autoSaveErrorDetail}
                </Text>
              ) : null}
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardAvoidingView: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: { padding: 8 },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { fontSize: 18, fontWeight: "600" },
  headerSubtitle: { fontSize: 14, marginTop: 2 },
  finalizeButton: { paddingVertical: 6, paddingHorizontal: 12 },
  finalizeButtonText: { fontSize: 15, fontWeight: "bold" },
  content: { flex: 1 },
  contentContainer: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40, gap: 16 },
  aiButtonContainer: { alignItems: "center", marginTop: 4 },
  aiButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#06b6d4",
    gap: 8,
    paddingHorizontal: 24,
  },
  aiButtonText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  autoSaveContainer: { alignItems: "center", paddingVertical: 12, gap: 4 },
  autoSaveRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  autoSaveText: { fontSize: 13 },
  autoSaveErrorDetail: { fontSize: 12, textAlign: "center", paddingHorizontal: 12 },
});
