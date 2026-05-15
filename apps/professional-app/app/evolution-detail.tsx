import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useColors } from "@/hooks/useColorScheme";
import { useHaptics } from "@/hooks/useHaptics";
import { useEvolutions, useEvolution } from "@/hooks";
import { ObservacaoForm } from "@/components/evolution/ObservacaoForm";
import { EvolutionChipList, type ChipItem } from "@/components/evolution/EvolutionChipList";
import { PainLevelSlider } from "@/components/evolution/PainLevelSlider";
import { PhotoUpload } from "@/components/evolution/PhotoUpload";
import { useAuthStore } from "@/store/auth";
import { usePatient } from "@/hooks/usePatients";
import { reportSharingService } from "@/lib/services/reportSharingService";

function arrayToChips(items: any[] | undefined, extractDetail?: (item: any) => string | undefined): ChipItem[] {
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
    .filter(Boolean) as ChipItem[];
}

const chipsToProcedures = (c: ChipItem[]) => c.map((x) => ({ id: x.id, name: x.name, notes: x.detail }));
const chipsToExercises = (c: ChipItem[]) => c.map((x) => ({ id: x.id, name: x.name, prescription: x.detail }));
const chipsToMeasurements = (c: ChipItem[]) =>
  c.map((x) => ({ id: x.id, name: x.name, unit: x.detail ?? "", value: 0 }));
const chipsToHomeExercises = (c: ChipItem[]) =>
  c.map((x) => ({ id: x.id, name: x.name, frequency: x.detail }));

export default function EvolutionDetailScreen() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams();

  const evolutionId = params.evolutionId as string;
  const patientId = params.patientId as string;
  const patientName = (params.patientName as string) || "Paciente";
  const startEditing = params.startEditing === "true";

  const { medium, success, error: hapticError } = useHaptics();

  const { data: evolution, isLoading } = useEvolution(evolutionId);
  const {
    updateAsync: updateEvolutionAsync,
    deleteAsync: deleteEvolutionAsync,
    isUpdating,
    isDeleting,
  } = useEvolutions(patientId);

  const { user } = useAuthStore();
  const { data: patient } = usePatient(patientId);

  const [isEditing, setIsEditing] = useState(startEditing);
  const [isSharing, setIsSharing] = useState(false);

  // Estado canônico — observação livre + estruturados
  const [observacao, setObservacao] = useState("");
  const [painLevel, setPainLevel] = useState(0);
  const [procedures, setProcedures] = useState<ChipItem[]>([]);
  const [exercises, setExercises] = useState<ChipItem[]>([]);
  const [measurements, setMeasurements] = useState<ChipItem[]>([]);
  const [homeExercises, setHomeExercises] = useState<ChipItem[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);

  useEffect(() => {
    if (!evolution) return;
    const obs =
      evolution.observacao ||
      [evolution.subjective, evolution.objective, evolution.assessment, evolution.plan]
        .filter(Boolean)
        .join("\n\n") ||
      "";
    setObservacao(obs);
    setPainLevel(Number(evolution.painScale ?? evolution.painLevel ?? 0));
    setProcedures(arrayToChips(evolution.procedures as any[], (it) => it.notes));
    setExercises(arrayToChips(evolution.exercises as any[], (it) => it.prescription || it.notes));
    setMeasurements(
      arrayToChips(evolution.measurements as any[], (it) => (it.unit ? String(it.unit) : undefined)),
    );
    setHomeExercises(
      arrayToChips(evolution.homeExercises as any[], (it) => it.frequency || it.prescription),
    );
    setPhotos(evolution.attachments || []);
  }, [evolution]);

  const buildPayload = () => ({
    observacao: observacao.trim(),
    painScale: painLevel,
    procedures: chipsToProcedures(procedures),
    exercises: chipsToExercises(exercises),
    measurements: chipsToMeasurements(measurements),
    homeExercises: chipsToHomeExercises(homeExercises),
    attachments: photos,
  });

  const handleSave = async () => {
    medium();
    const hasContent =
      observacao.trim() ||
      procedures.length ||
      exercises.length ||
      measurements.length ||
      homeExercises.length;
    if (!hasContent) {
      Alert.alert("Atenção", "Preencha a observação ou ao menos um dado estruturado.");
      hapticError();
      return;
    }
    try {
      await updateEvolutionAsync({ id: evolutionId, data: buildPayload() as any });
      success();
      setIsEditing(false);
      Alert.alert("Sucesso", "Evolução atualizada com sucesso!");
    } catch (err: any) {
      hapticError();
      Alert.alert("Erro", err.message || "Não foi possível atualizar a evolução.");
    }
  };

  const handleSaveAndIssue = async () => {
    medium();
    if (!patient || !user) {
      Alert.alert("Erro", "Dados do paciente ou profissional não carregados.");
      return;
    }
    const hasContent = observacao.trim() || procedures.length || exercises.length;
    if (!hasContent) {
      Alert.alert("Atenção", "Preencha a observação antes de emitir o relatório.");
      hapticError();
      return;
    }
    setIsSharing(true);
    try {
      const payload = buildPayload();
      await updateEvolutionAsync({ id: evolutionId, data: payload as any });
      await reportSharingService.shareEvolutionViaWhatsApp(
        patient,
        { id: evolutionId, ...payload, date: evolution?.date || new Date().toISOString() } as any,
        user.id,
      );
      success();
      setIsEditing(false);
      Alert.alert("Sucesso", "Relatório salvo e enviado via WhatsApp com sucesso!");
    } catch (err: any) {
      hapticError();
      Alert.alert("Erro", err.message || "Não foi possível salvar ou enviar o relatório.");
    } finally {
      setIsSharing(false);
    }
  };

  const handleIssueExisting = async () => {
    medium();
    if (!patient || !user || !evolution) {
      Alert.alert("Erro", "Dados incompletos para emissão.");
      return;
    }
    setIsSharing(true);
    try {
      await reportSharingService.shareEvolutionViaWhatsApp(patient, evolution as any, user.id);
      success();
      Alert.alert("Sucesso", "Relatório enviado com sucesso via WhatsApp!");
    } catch (err: any) {
      hapticError();
      Alert.alert("Erro", err.message || "Não foi possível enviar o relatório.");
    } finally {
      setIsSharing(false);
    }
  };

  const handleDelete = () => {
    medium();
    Alert.alert(
      "Excluir Evolução",
      "Tem certeza que deseja excluir esta evolução? Esta ação não pode ser desfeita.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteEvolutionAsync(evolutionId);
              success();
              Alert.alert("Sucesso", "Evolução excluída com sucesso!", [
                { text: "OK", onPress: () => router.back() },
              ]);
            } catch (err: any) {
              hapticError();
              Alert.alert("Erro", err.message || "Não foi possível excluir a evolução.");
            }
          },
        },
      ],
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!evolution) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.text }]}>Evolução não encontrada</Text>
          <TouchableOpacity
            style={[styles.errorButton, { backgroundColor: colors.primary }]}
            onPress={() => router.back()}
          >
            <Text style={styles.errorButtonText}>Voltar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top"]}>
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
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {isEditing ? "Editar Evolução" : "Detalhes da Evolução"}
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            {patientName}
          </Text>
        </View>
        {!isEditing && (
          <TouchableOpacity
            onPress={() => {
              medium();
              setIsEditing(true);
            }}
            style={styles.editButton}
          >
            <Ionicons name="create-outline" size={24} color={colors.primary} />
          </TouchableOpacity>
        )}
        {isEditing && <View style={styles.placeholder} />}
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={[styles.dateCard, { backgroundColor: colors.surface }]}>
          <Ionicons name="calendar-outline" size={20} color={colors.primary} />
          <Text style={[styles.dateText, { color: colors.text }]}>
            {evolution.date
              ? format(new Date(evolution.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
              : "Data não disponível"}
          </Text>
        </View>

        {isEditing ? (
          <>
            <PainLevelSlider painLevel={painLevel} onValueChange={setPainLevel} colors={colors} />
            <ObservacaoForm value={observacao} onChange={setObservacao} colors={colors} />

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

            <PhotoUpload photos={photos} onPhotosChange={setPhotos} colors={colors} />

            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.saveAndIssueButton, { backgroundColor: colors.success }]}
                onPress={handleSaveAndIssue}
                disabled={isUpdating || isSharing}
              >
                {isSharing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="logo-whatsapp" size={20} color="#fff" />
                    <Text style={styles.saveButtonText}>Salvar e Emitir</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: colors.primary }]}
                onPress={handleSave}
                disabled={isUpdating || isSharing}
              >
                {isUpdating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    <Text style={styles.saveButtonText}>Salvar Alterações</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.cancelButton, { borderColor: colors.border }]}
                onPress={() => {
                  medium();
                  setIsEditing(false);
                }}
                disabled={isUpdating}
              >
                <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.deleteButton, { backgroundColor: colors.error }]}
                onPress={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="trash-outline" size={20} color="#fff" />
                    <Text style={styles.deleteButtonText}>Excluir Evolução</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            {observacao ? (
              <View style={[styles.section, { backgroundColor: colors.surface }]}>
                <View style={[styles.accentStrip, { backgroundColor: "#F4B400" }]} />
                <View style={styles.sectionInner}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="document-text-outline" size={20} color="#F4B400" />
                    <Text style={[styles.sectionLabel, { color: colors.text }]}>
                      Observação Clínica
                    </Text>
                  </View>
                  <Text style={[styles.sectionText, { color: colors.text }]}>{observacao}</Text>
                </View>
              </View>
            ) : null}

            {painLevel !== undefined && (
              <View style={[styles.section, { backgroundColor: colors.surface }]}>
                <View style={styles.sectionInner}>
                  <Text style={[styles.sectionLabel, { color: colors.text }]}>Nível de Dor</Text>
                  <View style={styles.painDisplay}>
                    <Text style={[styles.painValue, { color: colors.primary }]}>{painLevel}</Text>
                    <Text style={[styles.painScale, { color: colors.textSecondary }]}>/ 10</Text>
                  </View>
                </View>
              </View>
            )}

            {[
              { title: "Procedimentos", items: procedures, accent: "#16a34a", icon: "medkit-outline" as const },
              { title: "Exercícios", items: exercises, accent: "#0ea5e9", icon: "barbell-outline" as const },
              { title: "Medições", items: measurements, accent: "#db2777", icon: "speedometer-outline" as const },
              { title: "Exercícios para Casa", items: homeExercises, accent: "#6b7280", icon: "home-outline" as const },
            ]
              .filter((g) => g.items.length > 0)
              .map((g) => (
                <View key={g.title} style={[styles.section, { backgroundColor: colors.surface }]}>
                  <View style={[styles.accentStrip, { backgroundColor: g.accent }]} />
                  <View style={styles.sectionInner}>
                    <View style={styles.sectionHeader}>
                      <Ionicons name={g.icon} size={20} color={g.accent} />
                      <Text style={[styles.sectionLabel, { color: colors.text }]}>{g.title}</Text>
                    </View>
                    {g.items.map((it) => (
                      <Text key={it.id} style={[styles.sectionText, { color: colors.text }]}>
                        • {it.name}
                        {it.detail ? (
                          <Text style={{ color: colors.textSecondary }}> · {it.detail}</Text>
                        ) : null}
                      </Text>
                    ))}
                  </View>
                </View>
              ))}

            {photos.length > 0 && (
              <View style={[styles.section, { backgroundColor: colors.surface }]}>
                <View style={styles.sectionInner}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="images-outline" size={20} color={colors.primary} />
                    <Text style={[styles.sectionLabel, { color: colors.text }]}>
                      Fotos ({photos.length})
                    </Text>
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.photosContainer}
                  >
                    {photos.map((photo, index) => (
                      <Image key={index} source={{ uri: photo }} style={styles.photoPreview} />
                    ))}
                  </ScrollView>
                </View>
              </View>
            )}

            <View style={styles.viewModeActions}>
              <TouchableOpacity
                style={[
                  styles.issueButton,
                  { backgroundColor: colors.success + "20", borderColor: colors.success },
                ]}
                onPress={handleIssueExisting}
                disabled={isSharing}
              >
                {isSharing ? (
                  <ActivityIndicator color={colors.success} />
                ) : (
                  <>
                    <Ionicons name="logo-whatsapp" size={22} color={colors.success} />
                    <Text style={[styles.issueButtonText, { color: colors.success }]}>
                      Emitir Relatório via WhatsApp
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  editButton: { padding: 8 },
  placeholder: { width: 40 },
  content: { flex: 1 },
  contentContainer: { padding: 16, gap: 16 },
  dateCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 12,
  },
  dateText: { fontSize: 16, fontWeight: "600" },
  section: { borderRadius: 12, overflow: "hidden" },
  accentStrip: { height: 4, width: "100%" },
  sectionInner: { padding: 16, gap: 8 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionLabel: { fontSize: 16, fontWeight: "600" },
  sectionText: { fontSize: 15, lineHeight: 22 },
  painDisplay: { flexDirection: "row", alignItems: "baseline", gap: 4, marginTop: 8 },
  painValue: { fontSize: 48, fontWeight: "bold" },
  painScale: { fontSize: 24 },
  photosContainer: { gap: 12, paddingVertical: 8 },
  photoPreview: { width: 120, height: 120, borderRadius: 8 },
  actions: { gap: 12, marginTop: 8 },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  saveButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  cancelButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  cancelButtonText: { fontSize: 16, fontWeight: "600" },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  deleteButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  saveAndIssueButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    gap: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  viewModeActions: { marginTop: 8, marginBottom: 24 },
  issueButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: "dashed",
    gap: 10,
  },
  issueButtonText: { fontSize: 16, fontWeight: "700", letterSpacing: 0.3 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    gap: 16,
  },
  errorText: { fontSize: 18, fontWeight: "600" },
  errorButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  errorButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
