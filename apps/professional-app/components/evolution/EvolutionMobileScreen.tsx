import React, { useMemo, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { useColors } from "@/hooks/useColorScheme";
import { useHaptics } from "@/hooks/useHaptics";

type TabKey = "evolucao" | "conduta" | "dor" | "mais";

type MobileEvolutionProps = {
  patientId?: string;
  patientName?: string;
  appointmentId?: string;
};

type ProcedureItem = {
  id: string;
  name: string;
  tag: string;
};

type HistorySession = {
  id: string;
  label: string;
  date: string;
  eva: string;
  summary: string;
  procedures: ProcedureItem[];
  tone: "good" | "warn";
};

const INITIAL_PROCEDURES: ProcedureItem[] = [
  { id: "proc-1", name: "Lib mio manual TFS", tag: "LIBERAÇÃO MIOFASCIAL" },
];

const INITIAL_HISTORY: HistorySession[] = [
  {
    id: "s2",
    label: "SESSÃO #2",
    date: "08/06/2026",
    eva: "EVA 5 -> 3",
    summary: "Redução do espasmo paravertebral. Boa tolerância à progressão de carga no core.",
    procedures: [
      { id: "s2-p1", name: "Lib mio manual TFS", tag: "LIBERAÇÃO MIOFASCIAL" },
      { id: "s2-p2", name: "Prancha modificada", tag: "CORE" },
      { id: "s2-p3", name: "Along. isquiotibiais", tag: "ALONGAMENTO" },
    ],
    tone: "good",
  },
  {
    id: "s1",
    label: "SESSÃO #1",
    date: "04/06/2026",
    eva: "EVA 7 -> 5",
    summary: "Anamnese e avaliação postural. Dor lombar mecânica à direita, sem irradiação.",
    procedures: [
      { id: "s1-p1", name: "Pompage lombar", tag: "TERAPIA MANUAL" },
      { id: "s1-p2", name: "Mobilização L4-L5", tag: "TERAPIA MANUAL" },
    ],
    tone: "warn",
  },
];

const EVA_META = [
  { label: "Sem dor", color: "#9CA3AF" },
  { label: "Dor leve", color: "#22C55E" },
  { label: "Dor moderada", color: "#EAB308" },
  { label: "Dor intensa", color: "#EF4444" },
  { label: "Dor máxima", color: "#7F1D1D" },
];

function painMeta(value: number) {
  if (value === 0) return EVA_META[0];
  if (value <= 3) return EVA_META[1];
  if (value <= 6) return EVA_META[2];
  if (value <= 8) return EVA_META[3];
  return EVA_META[4];
}

function mergeProcedures(base: ProcedureItem[], additions: ProcedureItem[]) {
  const next = [...base];
  additions.forEach((item) => {
    if (!next.some((current) => current.name === item.name)) {
      next.push(item);
    }
  });
  return next;
}

function MobileCard({
  accent,
  icon,
  title,
  subtitle,
  children,
  right,
  colors,
}: {
  accent: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  children?: React.ReactNode;
  right?: React.ReactNode;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.cardAccent, { backgroundColor: accent }]} />
      <View style={styles.cardHeader}>
        <View style={[styles.cardIcon, { backgroundColor: `${accent}1A` }]}>
          <Ionicons name={icon} size={18} color={accent} />
        </View>
        <View style={styles.cardTitleWrap}>
          <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
            {title}
          </Text>
          <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        {right ? <View>{right}</View> : null}
      </View>
      {children ? <View>{children}</View> : null}
    </View>
  );
}

export function EvolutionMobileScreen({
  patientId,
  patientName: incomingPatientName,
  appointmentId,
}: MobileEvolutionProps) {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { selection, success, medium } = useHaptics();

  const [activeTab, setActiveTab] = useState<TabKey>("evolucao");
  const [observacao, setObservacao] = useState(
    "Paciente refere melhora da dor lombar apos a 2a sessao (EVA 5 -> 3). Mantem desconforto ao permanecer sentado por periodos longos no trabalho.\n\nConduta de hoje: liberacao miofascial de TFL e quadrado lombar a direita, seguida de ativacao de core em prancha modificada.",
  );
  const [painLevel, setPainLevel] = useState(3);
  const [procedures, setProcedures] = useState<ProcedureItem[]>(INITIAL_PROCEDURES);
  const [procedureDraft, setProcedureDraft] = useState("");
  const [homeExerciseDraft, setHomeExerciseDraft] = useState("");
  const [homeDose, setHomeDose] = useState("3x10");
  const [painLocation, setPainLocation] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const patientLabel = incomingPatientName?.trim() || "Paciente";
  const patientMeta = useMemo(() => {
    const parts = [
      "3a sessao",
      "3 evolucoes",
      "0 medicoes",
      "100% sucesso",
    ];
    return parts.join(" · ");
  }, []);

  const showToast = (message: string) => {
    setToastMessage(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMessage(null), 2200);
  };

  const handleSave = () => {
    selection();
    showToast("Sessao salva as 10:15.");
  };

  const handleFinalize = () => {
    medium();
    Alert.alert("Concluir sessao", "Deseja finalizar esta evolucao?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Concluir",
        onPress: () => {
          success();
          router.back();
        },
      },
    ]);
  };

  const handleOpenHistory = () => {
    selection();
    setHistoryOpen(true);
  };

  const handleCloseHistory = () => setHistoryOpen(false);

  const handleReplicate = (session: HistorySession) => {
    setProcedures((current) => mergeProcedures(current, session.procedures));
    setActiveTab("conduta");
    setHistoryOpen(false);
    success();
    showToast("Conduta replicada para a sessao atual.");
  };

  const handleAddProcedure = () => {
    const value = procedureDraft.trim();
    if (!value) return;
    setProcedures((current) => [
      ...current,
      {
        id: `proc-${Date.now()}`,
        name: value,
        tag: "PROCEDIMENTO",
      },
    ]);
    setProcedureDraft("");
    success();
  };

  const handleAddHomeExercise = () => {
    const value = homeExerciseDraft.trim();
    if (!value) return;
    showToast(`Exercicio adicionado: ${value}`);
    setHomeExerciseDraft("");
    setHomeDose("2x/dia");
  };

  const openVoice = () => {
    selection();
    showToast("Voice Scribe pronto para uso.");
  };

  const renderEVA = () => {
    const meta = painMeta(painLevel);
    return (
      <View style={[styles.evaCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.evaHeader}>
          <View style={[styles.evaBadge, { backgroundColor: meta.color }]}>
            <Text style={styles.evaBadgeText}>{painLevel}</Text>
          </View>
          <View style={styles.cardTitleWrap}>
            <Text style={[styles.evaTitle, { color: meta.color }]} numberOfLines={1}>
              {meta.label}
            </Text>
            <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
              Escala Visual Analoga - 0 a 10
            </Text>
          </View>
        </View>
        <View style={styles.evaGrid}>
          {Array.from({ length: 11 }, (_, value) => {
            const active = value === painLevel;
            return (
              <TouchableOpacity
                key={value}
                style={[
                  styles.evaButton,
                  {
                    backgroundColor: active ? meta.color : colors.card,
                    borderColor: active ? meta.color : colors.border,
                  },
                ]}
                onPress={() => {
                  setPainLevel(value);
                  selection();
                }}
              >
                <Text
                  style={[
                    styles.evaButtonText,
                    { color: active ? "#fff" : colors.textSecondary },
                  ]}
                >
                  {value}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={styles.evaBar}>
          <View style={[styles.evaSegment, { flex: 45, backgroundColor: "#22C55E" }]} />
          <View style={[styles.evaSegment, { flex: 30, backgroundColor: "#EAB308" }]} />
          <View style={[styles.evaSegment, { flex: 15, backgroundColor: "#EF4444" }]} />
          <View style={[styles.evaSegment, { flex: 10, backgroundColor: "#7F1D1D" }]} />
          <View
            style={[
              styles.evaKnob,
              { left: `${painLevel * 10}%`, borderColor: meta.color },
            ]}
          />
        </View>
        <View style={styles.evaLabels}>
          <Text style={[styles.scaleLabel, { color: colors.textMuted }]}>Sem dor</Text>
          <Text style={[styles.scaleLabel, { color: colors.textMuted }]}>Moderada</Text>
          <Text style={[styles.scaleLabel, { color: colors.textMuted }]}>Maxima</Text>
        </View>
        <TextInput
          value={painLocation}
          onChangeText={setPainLocation}
          placeholder="Localizacao da dor (opcional)"
          placeholderTextColor={colors.textMuted}
          style={[styles.input, { borderColor: colors.border, color: colors.text, marginTop: 12 }]}
        />
      </View>
    );
  };

  const renderHistorySheet = () => (
    <>
      <TouchableOpacity
        activeOpacity={1}
        onPress={handleCloseHistory}
        style={[styles.backdrop, historyOpen ? styles.backdropOpen : null]}
      />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }, historyOpen ? styles.sheetOpen : null]}>
        <View style={styles.sheetGrabber} />
        <View style={styles.sheetHeader}>
          <View style={[styles.cardIcon, { backgroundColor: "#DBEAFE" }]}>
            <Ionicons name="time-outline" size={18} color="#2563EB" />
          </View>
          <View style={styles.sheetTitleWrap}>
            <Text style={[styles.sheetTitle, { color: colors.text }]}>Historico de Sessoes</Text>
            <Text style={[styles.sheetSubtitle, { color: colors.textSecondary }]}>
              Replicar copia a conduta para a sessao atual
            </Text>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Fechar historico"
            onPress={handleCloseHistory}
            style={[styles.closeButton, { borderColor: colors.border }]}
          >
            <Ionicons name="close" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.sheetContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {INITIAL_HISTORY.map((session) => (
            <View key={session.id} style={[styles.sessionCard, { borderColor: colors.border }]}>
              <View style={[styles.sessionTop, { backgroundColor: colors.surface }]}>
                <View
                  style={[
                    styles.sessionBadgePill,
                    {
                      backgroundColor: session.tone === "good" ? "#DBEAFE" : "#F1F5F9",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.sessionBadgePillText,
                      { color: session.tone === "good" ? "#2563EB" : "#475569" },
                    ]}
                  >
                    {session.label}
                  </Text>
                </View>
                <Text style={[styles.sessionDate, { color: colors.textSecondary }]}>
                  {session.date}
                </Text>
                <Text style={[styles.sessionEva, { color: session.tone === "good" ? "#047857" : "#B45309" }]}>
                  {session.eva}
                </Text>
              </View>
              <View style={styles.sessionBody}>
                <View style={styles.tagsRow}>
                  {session.procedures.map((item) => (
                    <View key={item.id} style={[styles.tagPill, { backgroundColor: "#DCFCE7" }]}>
                      <Text style={styles.tagPillText}>{item.name}</Text>
                    </View>
                  ))}
                </View>
                <Text style={[styles.sessionSummary, { color: colors.textSecondary }]}>{session.summary}</Text>
                <TouchableOpacity style={styles.replicateButton} onPress={() => handleReplicate(session)}>
                  <Ionicons name="copy-outline" size={16} color="#fff" />
                  <Text style={styles.replicateText}>Replicar conduta</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    </>
  );

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={["top", "bottom"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={[styles.topBar, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            style={[styles.backButton, { borderColor: colors.border }]}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>RM</Text>
          </View>
          <View style={styles.patientHeader}>
            <Text style={[styles.patientName, { color: colors.text }]} numberOfLines={1}>
              {patientLabel}
            </Text>
            <View style={styles.patientMetaRow}>
              <View style={[styles.sessionBadge, { backgroundColor: "#E0F2FE" }]}>
                <Text style={[styles.sessionBadgeText, { color: "#075985" }]}>SESSAO #3</Text>
              </View>
              <Text style={[styles.patientMetaText, { color: colors.textSecondary }]} numberOfLines={1}>
                {patientMeta}
              </Text>
            </View>
            <Text style={[styles.patientSubtle, { color: colors.textSecondary }]} numberOfLines={1} selectable>
              {patientId ? `Paciente ${patientId}` : "Sessao atual"}
              {appointmentId ? ` · Agendamento ${appointmentId}` : ""}
            </Text>
          </View>
          <TouchableOpacity style={styles.finishButton} onPress={handleFinalize}>
            <Ionicons name="checkmark" size={16} color="#fff" />
            <Text style={styles.finishButtonText}>Concluir</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: 132 + insets.bottom },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          contentInsetAdjustmentBehavior="automatic"
          stickyHeaderIndices={[1]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.chipsRow}>
            <TouchableOpacity style={[styles.chip, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <Ionicons name="medkit-outline" size={16} color={colors.text} />
              <Text style={[styles.chipText, { color: colors.text }]}>Retorno Medico</Text>
              <Ionicons name="add" size={16} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.chip, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <Ionicons name="cut-outline" size={16} color={colors.text} />
              <Text style={[styles.chipText, { color: colors.text }]}>Cirurgias</Text>
              <Ionicons name="add" size={16} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.chip, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <Ionicons name="radio-button-on-outline" size={16} color={colors.text} />
              <Text style={[styles.chipText, { color: colors.text }]}>Metas 0/0</Text>
              <Ionicons name="add" size={16} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={[styles.segmentBar, { backgroundColor: colors.border + "66" }]}>
            {(
              [
                ["evolucao", "Evolucao"],
                ["conduta", "Conduta"],
                ["dor", "Dor"],
                ["mais", "Mais"],
              ] as const
            ).map(([key, label]) => {
              const active = activeTab === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={[styles.segment, active ? styles.segmentActive : null, active ? { backgroundColor: colors.card } : null]}
                  onPress={() => {
                    selection();
                    setActiveTab(key);
                  }}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      { color: active ? colors.primary : colors.textSecondary },
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {activeTab === "evolucao" ? (
            <View style={styles.sectionStack}>
              <MobileCard
                accent="#F97316"
                icon="document-text-outline"
                title="Observacoes Clinicas"
                subtitle="Registro principal da sessao"
                colors={colors}
                right={
                  <TouchableOpacity style={[styles.smallOutlineButton, { borderColor: colors.border }]}>
                    <Text style={[styles.smallOutlineButtonText, { color: colors.primary }]}>Foco</Text>
                  </TouchableOpacity>
                }
              >
                <TextInput
                  value={observacao}
                  onChangeText={setObservacao}
                  multiline
                  textAlignVertical="top"
                  placeholder="Descreva a evolucao do paciente..."
                  placeholderTextColor={colors.textMuted}
                  style={[styles.observationInput, { color: colors.text, borderColor: colors.border }]}
                />
                <View style={styles.toolbar}>
                  {["bold", "italic", "list", "list-checks", "undo"].map((icon) => (
                    <TouchableOpacity key={icon} style={styles.toolbarButton} onPress={selection}>
                      <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={16} color={colors.textSecondary} />
                    </TouchableOpacity>
                  ))}
                </View>
              </MobileCard>

              <TouchableOpacity
                activeOpacity={0.9}
                onPress={handleOpenHistory}
                style={[styles.historyCard, { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" }]}
              >
                <View style={[styles.cardIcon, { backgroundColor: "#DBEAFE" }]}>
                  <Ionicons name="time-outline" size={18} color="#2563EB" />
                </View>
                <View style={styles.cardTitleWrap}>
                  <Text style={[styles.historyTitle, { color: "#1D4ED8" }]}>Historico de Sessoes</Text>
                  <Text style={[styles.historySubtitle, { color: "#2563EB" }]}>2 sessoes · replicar conduta</Text>
                </View>
                <Ionicons name="chevron-up" size={18} color="#2563EB" />
              </TouchableOpacity>
            </View>
          ) : null}

          {activeTab === "conduta" ? (
            <View style={styles.sectionStack}>
              <MobileCard
                accent="#10B981"
                icon="fitness-outline"
                title="Procedimentos & Exercicios"
                subtitle="Sessao + plano de casa"
                colors={colors}
                right={<View style={styles.countPill}><Text style={styles.countPillText}>{procedures.length}</Text></View>}
              >
                <View style={styles.procedureList}>
                  {procedures.map((item) => (
                    <View key={item.id} style={[styles.procedureRow, { borderColor: colors.border, backgroundColor: colors.background }]}>
                      <View style={styles.checkbox} />
                      <View style={styles.rowBody}>
                        <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <View style={[styles.rowTag, { backgroundColor: "#DCFCE7" }]}>
                          <Text style={styles.rowTagText}>{item.tag}</Text>
                        </View>
                      </View>
                      <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
                    </View>
                  ))}
                </View>
                <View style={styles.addRow}>
                  <TextInput
                    value={procedureDraft}
                    onChangeText={setProcedureDraft}
                    placeholder="Adicionar procedimento..."
                    placeholderTextColor={colors.textMuted}
                    style={[styles.input, { borderColor: colors.border, color: colors.text }]}
                  />
                  <TouchableOpacity
                    onPress={handleAddProcedure}
                    style={[styles.roundAction, { backgroundColor: colors.primary }]}
                  >
                    <Ionicons name="add" size={18} color="#fff" />
                  </TouchableOpacity>
                </View>
              </MobileCard>

              <MobileCard
                accent="#2563EB"
                icon="home-outline"
                title="Para casa · HEP"
                subtitle="Exercicios orientados"
                colors={colors}
                right={<TouchableOpacity style={[styles.smallOutlineButton, { borderColor: colors.border }]}><Text style={[styles.smallOutlineButtonText, { color: colors.primary }]}>Biblioteca</Text></TouchableOpacity>}
              >
                <View style={styles.addRow}>
                  <TextInput
                    value={homeExerciseDraft}
                    onChangeText={setHomeExerciseDraft}
                    placeholder="Nome do exercicio..."
                    placeholderTextColor={colors.textMuted}
                    style={[styles.input, { borderColor: colors.border, color: colors.text }]}
                  />
                  <TextInput
                    value={homeDose}
                    onChangeText={setHomeDose}
                    placeholder="Dose"
                    placeholderTextColor={colors.textMuted}
                    style={[styles.doseInput, { borderColor: colors.border, color: colors.text }]}
                  />
                  <TouchableOpacity
                    onPress={handleAddHomeExercise}
                    style={[styles.roundAction, { backgroundColor: colors.primary }]}
                  >
                    <Ionicons name="add" size={18} color="#fff" />
                  </TouchableOpacity>
                </View>
              </MobileCard>
            </View>
          ) : null}

          {activeTab === "dor" ? <View style={styles.sectionStack}>{renderEVA()}</View> : null}

          {activeTab === "mais" ? (
            <View style={styles.sectionStack}>
              <View style={styles.metricsGrid}>
                {[
                  { icon: "speedometer-outline", title: "Medições", subtitle: "0 registradas", color: "#10B981", bg: "#DCFCE7" },
                  { icon: "medkit-outline", title: "Retorno Medico", subtitle: "Adicionar", color: "#2563EB", bg: "#DBEAFE" },
                  { icon: "cut-outline", title: "Cirurgias", subtitle: "Nenhuma", color: "#7C3AED", bg: "#EDE9FE" },
                  { icon: "paperclip-outline", title: "Anexos", subtitle: "Nenhum arquivo", color: "#64748B", bg: "#E2E8F0" },
                ].map((item) => (
                  <View key={item.title} style={[styles.metricCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
                    <View style={[styles.cardIcon, { backgroundColor: item.bg }]}>
                      <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={18} color={item.color} />
                    </View>
                    <Text style={[styles.metricTitle, { color: colors.text }]}>{item.title}</Text>
                    <Text style={[styles.metricSubtitle, { color: colors.textSecondary }]}>{item.subtitle}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                activeOpacity={0.9}
                onPress={handleOpenHistory}
                style={[styles.historyCard, { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" }]}
              >
                <View style={[styles.cardIcon, { backgroundColor: "#DBEAFE" }]}>
                  <Ionicons name="time-outline" size={18} color="#2563EB" />
                </View>
                <View style={styles.cardTitleWrap}>
                  <Text style={[styles.historyTitle, { color: "#1D4ED8" }]}>Historico de Sessoes</Text>
                  <Text style={[styles.historySubtitle, { color: "#2563EB" }]}>Abrir gaveta de replicacao</Text>
                </View>
                <Ionicons name="chevron-up" size={18} color="#2563EB" />
              </TouchableOpacity>
            </View>
          ) : null}
        </ScrollView>

        <View style={[styles.bottomBar, { borderTopColor: colors.border, backgroundColor: colors.card, paddingBottom: insets.bottom + 12 }]}>
          <TouchableOpacity style={[styles.bottomAction, { backgroundColor: colors.surface }]} onPress={openVoice}>
            <Ionicons name="mic-outline" size={18} color={colors.textSecondary} />
            <Text style={[styles.bottomActionText, { color: colors.text }]}>Voice</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.bottomAction, { backgroundColor: colors.surface }]} onPress={handleOpenHistory}>
            <Ionicons name="time-outline" size={18} color={colors.textSecondary} />
            <Text style={[styles.bottomActionText, { color: colors.text }]}>Historico</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.bottomAction, { backgroundColor: "#DCFCE7" }]} onPress={handleSave}>
            <Ionicons name="save-outline" size={18} color="#047857" />
            <Text style={[styles.bottomActionText, { color: "#047857" }]}>Salvar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.bottomAction, { backgroundColor: colors.primary }]} onPress={handleFinalize}>
            <Ionicons name="checkmark" size={18} color="#fff" />
            <Text style={[styles.bottomActionText, { color: "#fff" }]}>Concluir</Text>
          </TouchableOpacity>
        </View>

        {toastMessage ? (
          <View style={[styles.toast, { backgroundColor: colors.primary, bottom: 104 + insets.bottom }]}>
            <Text style={styles.toastText}>{toastMessage}</Text>
          </View>
        ) : null}

        {renderHistorySheet()}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  topBar: {
    minHeight: 92,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#DBEAFE",
  },
  avatarText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#075985",
  },
  patientHeader: { flex: 1, minWidth: 0 },
  patientName: {
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 18,
  },
  patientMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
    flexWrap: "wrap",
  },
  sessionBadge: {
    minHeight: 20,
    paddingHorizontal: 8,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  sessionBadgeText: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.04,
  },
  patientMetaText: {
    fontSize: 10,
    fontWeight: "800",
  },
  patientSubtle: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: "700",
  },
  finishButton: {
    minHeight: 42,
    paddingHorizontal: 12,
    borderRadius: 15,
    backgroundColor: "#0080FF",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  finishButtonText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "900",
  },
  content: {
    paddingHorizontal: 12,
    paddingTop: 10,
    gap: 10,
  },
  chipsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 2,
  },
  chip: {
    minHeight: 46,
    flex: 1,
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 18,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  chipText: {
    flex: 1,
    textAlign: "center",
    fontSize: 11,
    fontWeight: "900",
  },
  segmentBar: {
    flexDirection: "row",
    padding: 4,
    borderRadius: 18,
    gap: 4,
  },
  segment: {
    flex: 1,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
  },
  segmentActive: {
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  segmentText: {
    fontSize: 11,
    fontWeight: "900",
  },
  sectionStack: {
    gap: 10,
  },
  card: {
    borderWidth: 1,
    borderRadius: 18,
    overflow: "hidden",
  },
  cardAccent: { height: 4, width: "100%" },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 13,
  },
  cardIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitleWrap: { flex: 1, minWidth: 0 },
  cardTitle: {
    fontSize: 14,
    fontWeight: "900",
  },
  cardSubtitle: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: "700",
  },
  smallOutlineButton: {
    minHeight: 32,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  smallOutlineButtonText: {
    fontSize: 11,
    fontWeight: "900",
  },
  observationInput: {
    minHeight: 176,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 14,
    lineHeight: 21,
  },
  toolbar: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 10,
  },
  toolbarButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  historyCard: {
    minHeight: 68,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  historyTitle: {
    fontSize: 13,
    fontWeight: "900",
  },
  historySubtitle: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: "700",
  },
  countPill: {
    minWidth: 24,
    minHeight: 24,
    borderRadius: 999,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  countPillText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#475569",
  },
  procedureList: {
    gap: 8,
    paddingHorizontal: 13,
    paddingBottom: 10,
  },
  procedureRow: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: "#94A3B8",
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontSize: 13,
    fontWeight: "900",
  },
  rowTag: {
    alignSelf: "flex-start",
    marginTop: 4,
    minHeight: 18,
    paddingHorizontal: 8,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTagText: {
    fontSize: 8.5,
    fontWeight: "900",
    color: "#047857",
    letterSpacing: 0.04,
  },
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 13,
    paddingBottom: 13,
  },
  input: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    fontSize: 12,
  },
  doseInput: {
    width: 72,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    fontSize: 11,
    fontWeight: "900",
    textAlign: "center",
  },
  roundAction: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  evaCard: {
    borderWidth: 1,
    borderRadius: 18,
    overflow: "hidden",
    padding: 13,
  },
  evaHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  evaBadge: {
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  evaBadgeText: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
  },
  evaTitle: {
    fontSize: 17,
    fontWeight: "900",
  },
  evaGrid: {
    flexDirection: "row",
    gap: 4,
    flexWrap: "nowrap",
  },
  evaButton: {
    flex: 1,
    minHeight: 33,
    borderWidth: 1,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  evaButtonText: {
    fontSize: 11,
    fontWeight: "900",
  },
  evaBar: {
    position: "relative",
    height: 8,
    borderRadius: 999,
    marginTop: 12,
    backgroundColor: "#E5E7EB",
    overflow: "hidden",
    flexDirection: "row",
  },
  evaSegment: {
    height: "100%",
  },
  evaKnob: {
    position: "absolute",
    top: -4,
    width: 16,
    height: 16,
    borderRadius: 999,
    backgroundColor: "#fff",
    borderWidth: 3,
    marginLeft: -8,
  },
  evaLabels: {
    marginTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  scaleLabel: {
    fontSize: 9,
    fontWeight: "900",
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metricCard: {
    width: "48.4%",
    minHeight: 96,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
  },
  metricTitle: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "900",
  },
  metricSubtitle: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: "700",
  },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 10,
    paddingTop: 10,
  },
  bottomAction: {
    flex: 1,
    minHeight: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  bottomActionText: {
    fontSize: 10,
    fontWeight: "900",
  },
  toast: {
    position: "absolute",
    left: 16,
    right: 16,
    minHeight: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  toastText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "900",
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15,23,42,0.30)",
    opacity: 0,
    zIndex: -1,
  },
  backdropOpen: {
    opacity: 1,
    zIndex: 12,
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: "74%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderColor: "#E2E8F0",
    transform: [{ translateY: 1000 }],
    zIndex: 13,
  },
  sheetOpen: {
    transform: [{ translateY: 0 }],
  },
  sheetGrabber: {
    alignSelf: "center",
    width: 42,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#CBD5E1",
    marginTop: 10,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2F7",
  },
  sheetTitleWrap: { flex: 1, minWidth: 0 },
  sheetTitle: {
    fontSize: 14,
    fontWeight: "900",
  },
  sheetSubtitle: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: "700",
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetContent: {
    padding: 12,
    gap: 10,
  },
  sessionCard: {
    borderWidth: 1,
    borderRadius: 16,
    overflow: "hidden",
  },
  sessionTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  sessionBadgePill: {
    minHeight: 18,
    paddingHorizontal: 8,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  sessionBadgePillText: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.04,
  },
  sessionDate: {
    fontSize: 10,
    fontWeight: "800",
  },
  sessionEva: {
    marginLeft: "auto",
    fontSize: 10,
    fontWeight: "900",
  },
  sessionBody: {
    padding: 10,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    marginBottom: 8,
  },
  tagPill: {
    minHeight: 22,
    paddingHorizontal: 8,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  tagPillText: {
    fontSize: 9,
    fontWeight: "900",
    color: "#047857",
  },
  sessionSummary: {
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 10,
  },
  replicateButton: {
    minHeight: 42,
    borderRadius: 14,
    backgroundColor: "#0080FF",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
  },
  replicateText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "900",
  },
});
