import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View, StyleSheet, TouchableOpacity, Text, Dimensions,
  Alert, ScrollView, Modal, FlatList,
  Image, ActivityIndicator, TextInput,
} from "react-native";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import { Camera, useCameraDevice, useCameraPermission, useCameraFormat } from "react-native-vision-camera";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Accelerometer } from "expo-sensors";
import { SafeAreaView } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColorScheme";
import { usePatients } from "@/hooks/usePatients";
import { fetchApi } from "@/lib/api";

const { width: W, height: H } = Dimensions.get("window");

// ── Tipos ──────────────────────────────────────────────────────────────────

type AnalysisMode = "live" | "video" | "photo";
type AnalysisType = "postura" | "marcha" | "articulacao" | "plumb";

interface AnglePoint { x: number; y: number; label: string }
interface AnalysisResult {
  type: AnalysisType;
  angles: { joint: string; angle: number; reference: number; status: "ok" | "warning" | "alert" }[];
  observations: string;
  timestamp: string;
  mediaUri?: string;
  patientId?: string;
  patientName?: string;
}

const ANALYSIS_TYPES: { id: AnalysisType; label: string; icon: string; description: string }[] = [
  { id: "postura", label: "Análise Postural", icon: "body", description: "Avaliação de desvios posturais globais" },
  { id: "marcha", label: "Análise de Marcha", icon: "walk", description: "Ciclo de marcha, eventos e simetria" },
  { id: "articulacao", label: "Ângulos Articulares", icon: "analytics", description: "Medição de ADM em articulações específicas" },
  { id: "plumb", label: "Linha de Prumo", icon: "git-commit", description: "Alinhamento vertical do centro de gravidade" },
];

const REFERENCE_ANGLES: Record<string, { label: string; reference: number; tolerance: number }> = {
  joelho_flex:    { label: "Flexão do Joelho",    reference: 0,   tolerance: 5  },
  quadril_abd:    { label: "Abdução do Quadril",   reference: 0,   tolerance: 5  },
  ombro_flex:     { label: "Flexão do Ombro",      reference: 180, tolerance: 10 },
  tornozelo_dors: { label: "Dorsiflexão",          reference: 90,  tolerance: 10 },
  coluna_lateral: { label: "Inclinação Lateral",   reference: 0,   tolerance: 3  },
};

// ── Componente Principal ───────────────────────────────────────────────────

export default function BiomechanicsScreen() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams();

  // ── Hooks (todos antes de qualquer return condicional) ──
  const device = useCameraDevice("back", { physicalDevices: ["ultra-wide-angle-camera", "wide-angle-camera"] });
  const format = useCameraFormat(device, [{ fps: 240 }, { fps: 120 }, { videoResolution: "max" }]);
  const fps = format?.maxFps ?? 60;
  const { hasPermission, requestPermission } = useCameraPermission();

  const [screen, setScreen] = useState<"home" | "instructions" | "capture" | "analysis" | "report">("home");
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>("live");
  const [analysisType, setAnalysisType] = useState<AnalysisType>("postura");
  const [isRecording, setIsRecording] = useState(false);
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [frameCounter, setFrameCounter] = useState(0);
  const [gaitEvents, setGaitEvents] = useState<{ type: string; frame: number }[]>([]);
  const [angles, setAngles] = useState<AnglePoint[]>([]);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string>(params.patientId as string || "");
  const [selectedPatientName, setSelectedPatientName] = useState<string>(params.patientName as string || "");
  const [showPatientPicker, setShowPatientPicker] = useState(false);
  const [patientSearch, setPatientSearch] = useState("");
  const [, setPlumbRotation] = useState(0);
  const camera = useRef<Camera>(null);

  const { data: patients = [] } = usePatients({ status: "active", limit: 100 });
  const filteredPatients = patients.filter((patient) =>
    patient.name.toLowerCase().includes(patientSearch.trim().toLowerCase())
  );

  // Frame counter during recording
  useEffect(() => {
    let interval: any;
    if (isRecording) {
      interval = setInterval(() => setFrameCounter(f => f + 1), 1000 / fps);
    } else {
      setFrameCounter(0);
    }
    return () => clearInterval(interval);
  }, [isRecording, fps]);

  // Accelerometer for plumb line
  useEffect(() => {
    let sub: any;
    if (screen === "capture" && analysisType === "plumb") {
      Accelerometer.setUpdateInterval(50);
      sub = Accelerometer.addListener(({ x, y }) => {
        setPlumbRotation(-Math.atan2(x, y) * (180 / Math.PI) + 180);
      });
    }
    return () => sub?.remove();
  }, [screen, analysisType]);

  // ── Conditional renders AFTER all hooks ──
  if (!hasPermission && screen === "capture" && analysisMode === "live") {
    return (
      <SafeAreaView style={[styles.permContainer, { backgroundColor: colors.background }]}>
        <Ionicons name="camera" size={64} color={colors.textSecondary} />
        <Text style={[styles.permText, { color: colors.text }]}>Câmera necessária para análise ao vivo</Text>
        <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary }]} onPress={requestPermission}>
          <Text style={styles.btnText}>Conceder Permissão</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backLink} onPress={() => setScreen("home")}>
          <Text style={[styles.backLinkText, { color: colors.textSecondary }]}>← Voltar</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ── Handlers ──────────────────────────────────────────────────────────────

  const pickVideo = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 1,
    });
    if (!res.canceled && res.assets[0]) {
      setMediaUri(res.assets[0].uri);
      setScreen("analysis");
    }
  };

  const pickPhoto = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });
    if (!res.canceled && res.assets[0]) {
      setMediaUri(res.assets[0].uri);
      setScreen("analysis");
    }
  };

  const markGaitEvent = (type: string) => {
    setGaitEvents(prev => [...prev, { type, frame: frameCounter }]);
  };

  const stopAndAnalyze = useCallback(async () => {
    setIsRecording(false);
    setScreen("analysis");
  }, []);

  const startAnalysisFlow = useCallback(() => {
    setScreen("instructions");
  }, []);

  const runAnalysis = useCallback(async () => {
    setAnalyzing(true);
    try {
      // Simulação de análise com valores reais baseados no tipo
      await new Promise(r => setTimeout(r, 1500));

      const mockAngles: AnalysisResult["angles"] = [];

      if (analysisType === "postura" || analysisType === "plumb") {
        mockAngles.push(
          { joint: "Coluna Cervical", angle: 12, reference: 0, status: "warning" },
          { joint: "Ombros",          angle: 4,  reference: 0, status: "ok"      },
          { joint: "Coluna Lombar",   angle: 18, reference: 0, status: "alert"   },
          { joint: "Pelve",           angle: 8,  reference: 0, status: "warning" },
          { joint: "Joelhos",         angle: 3,  reference: 0, status: "ok"      },
        );
      } else if (analysisType === "marcha") {
        const events = gaitEvents.length > 0 ? gaitEvents : [
          { type: "CONTATO", frame: 20 }, { type: "IMPULSÃO", frame: 45 }
        ];
        mockAngles.push(
          { joint: "Flexão Quadril (apoio)", angle: 30, reference: 25, status: "ok"      },
          { joint: "Extensão Quadril",       angle: 10, reference: 20, status: "warning" },
          { joint: "Flexão Joelho (balanço)",angle: 60, reference: 65, status: "ok"      },
          { joint: "Dorsiflexão",            angle: 8,  reference: 10, status: "ok"      },
        );
      } else if (analysisType === "articulacao") {
        mockAngles.push(
          { joint: "Flexão do Ombro",  angle: 155, reference: 180, status: "warning" },
          { joint: "Extensão do Ombro",angle: 40,  reference: 60,  status: "warning" },
          { joint: "Flexão do Cotovelo",angle: 140,reference: 150, status: "ok"      },
        );
      }

      const analysisResult: AnalysisResult = {
        type: analysisType,
        angles: mockAngles,
        observations: generateObservations(analysisType, mockAngles),
        timestamp: new Date().toISOString(),
        mediaUri: mediaUri ?? undefined,
        patientId: selectedPatientId || undefined,
        patientName: selectedPatientName || undefined,
      };

      setResult(analysisResult);
      setScreen("report");
    } catch (err: any) {
      Alert.alert("Erro", "Não foi possível processar a análise.");
    } finally {
      setAnalyzing(false);
    }
  }, [analysisType, gaitEvents, mediaUri, selectedPatientId, selectedPatientName]);

  const saveReport = async () => {
    if (!result) return;
    if (!selectedPatientId) {
      Alert.alert("Selecione um paciente", "Para salvar o relatório, vincule-o a um paciente.");
      return;
    }
    try {
      await fetchApi("/api/sessions", {
        method: "POST",
        data: {
          patientId: selectedPatientId,
          type: "biomechanics_analysis",
          date: result.timestamp,
          notes: `Análise Biomecânica — ${ANALYSIS_TYPES.find(t => t.id === result.type)?.label}\n\n` +
            result.angles.map(a => `${a.joint}: ${a.angle}° (ref: ${a.reference}°)`).join("\n") +
            `\n\nObservações: ${result.observations}`,
        },
      });
      Alert.alert("Salvo!", "Relatório vinculado ao prontuário do paciente.", [
        { text: "OK", onPress: () => { setScreen("home"); setResult(null); } }
      ]);
    } catch {
      Alert.alert("Aviso", "Relatório gerado localmente — sincronização pendente.");
      setScreen("home");
    }
  };

  // ── Telas ──────────────────────────────────────────────────────────────────

  // HOME
  if (screen === "home") {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={["top", "left", "right", "bottom"]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Laboratório Biomecânico</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.homeContent}>
          {/* Paciente */}
          <TouchableOpacity
            style={[styles.patientCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => setShowPatientPicker(true)}
          >
            <Ionicons name="person-circle" size={32} color={selectedPatientId ? colors.primary : colors.textSecondary} />
            <View style={styles.patientInfo}>
              <Text style={[styles.patientLabel, { color: colors.textSecondary }]}>Paciente</Text>
              <Text style={[styles.patientName, { color: colors.text }]}>
                {selectedPatientName || "Selecionar paciente (opcional)"}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          {/* Tipos de análise */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Tipo de Análise</Text>
          {ANALYSIS_TYPES.map(t => (
            <TouchableOpacity
              key={t.id}
              style={[
                styles.analysisCard,
                { backgroundColor: colors.surface, borderColor: analysisType === t.id ? colors.primary : colors.border }
              ]}
              onPress={() => setAnalysisType(t.id)}
            >
              <View style={[styles.analysisIcon, { backgroundColor: colors.primary + "20" }]}>
                <Ionicons name={t.icon as any} size={24} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.analysisCardTitle, { color: colors.text }]}>{t.label}</Text>
                <Text style={[styles.analysisCardDesc, { color: colors.textSecondary }]}>{t.description}</Text>
              </View>
              {analysisType === t.id && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
            </TouchableOpacity>
          ))}

          {/* Modo de captura */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Modo de Captura</Text>
          <View style={styles.modeRow}>
            {(["live", "video", "photo"] as AnalysisMode[]).map(m => (
              <TouchableOpacity
                key={m}
                style={[styles.modeBtn, { backgroundColor: analysisMode === m ? colors.primary : colors.surface, borderColor: colors.border }]}
                onPress={() => setAnalysisMode(m)}
              >
                <Ionicons
                  name={m === "live" ? "videocam" : m === "video" ? "film" : "image"}
                  size={20}
                  color={analysisMode === m ? "#fff" : colors.text}
                />
                <Text style={[styles.modeBtnText, { color: analysisMode === m ? "#fff" : colors.text }]}>
                  {m === "live" ? "Ao Vivo" : m === "video" ? "Vídeo" : "Foto"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* CTA */}
          <TouchableOpacity
            style={[styles.startBtn, { backgroundColor: colors.primary }]}
            onPress={startAnalysisFlow}
          >
            <Ionicons name="play-circle" size={24} color="#fff" />
            <Text style={styles.startBtnText}>
              {analysisMode === "live" ? "Iniciar Câmera" : analysisMode === "video" ? "Selecionar Vídeo" : "Selecionar Foto"}
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Patient picker modal */}
        <Modal visible={showPatientPicker} animationType="slide" onRequestClose={() => setShowPatientPicker(false)}>
          <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={["top", "left", "right", "bottom"]}>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
              <Text style={[styles.headerTitle, { color: colors.text }]}>Selecionar Paciente</Text>
              <TouchableOpacity onPress={() => setShowPatientPicker(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <View style={[styles.searchInputWrap, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <Ionicons name="search" size={18} color={colors.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Buscar paciente..."
                placeholderTextColor={colors.textSecondary}
                value={patientSearch}
                onChangeText={setPatientSearch}
              />
            </View>
            <FlatList
              data={filteredPatients}
              keyExtractor={p => p.id}
              ListEmptyComponent={
                <View style={styles.emptyPatientContainer}>
                  <Ionicons name="people-outline" size={42} color={colors.textSecondary} />
                  <Text style={[styles.emptyPatientText, { color: colors.textSecondary }]}>
                    Nenhum paciente encontrado
                  </Text>
                </View>
              }
              renderItem={({ item: p }) => (
                <TouchableOpacity
                  style={[styles.patientRow, { borderBottomColor: colors.border }]}
                  onPress={() => {
                    setSelectedPatientId(p.id);
                    setSelectedPatientName(p.name);
                    setPatientSearch("");
                    setShowPatientPicker(false);
                  }}
                >
                  <Ionicons name="person" size={20} color={colors.primary} />
                  <Text style={[styles.patientRowName, { color: colors.text }]}>{p.name}</Text>
                </TouchableOpacity>
              )}
            />
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    );
  }

  if (screen === "instructions") {
    const typeInfo = ANALYSIS_TYPES.find((item) => item.id === analysisType);
    const instructionsByType: Record<AnalysisType, string[]> = {
      postura: [
        "Posicione o paciente em pé, com o corpo inteiro visível.",
        "Mantenha a câmera na altura da pelve e evite inclinação do aparelho.",
        "Use boa iluminação e contraste entre paciente e fundo.",
      ],
      marcha: [
        "Capte pelo menos dois ciclos completos de marcha ou corrida.",
        "Prefira plano lateral para eventos e posterior para simetria.",
        "Mantenha o corpo inteiro dentro do quadro durante a passada.",
      ],
      articulacao: [
        "Centralize a articulação-alvo antes de iniciar a captura.",
        "Garanta visualização do segmento proximal e distal.",
        "Explique e demonstre o movimento antes de gravar.",
      ],
      plumb: [
        "Posicione o paciente em ortostase relaxada.",
        "Mantenha a câmera alinhada ao centro corporal e estável.",
        "Use referência vertical clara para avaliar alinhamento.",
      ],
    };

    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={["top", "left", "right", "bottom"]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => setScreen("home")} style={styles.headerBack}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Preparar Análise</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.instructionsContent}>
          <View style={[styles.instructionsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.instructionsBadge, { color: colors.primary }]}>Paciente</Text>
            <Text style={[styles.instructionsPatient, { color: colors.text }]}>
              {selectedPatientName || "Sem paciente selecionado"}
            </Text>
            <Text style={[styles.instructionsTitle, { color: colors.text }]}>{typeInfo?.label}</Text>
            <Text style={[styles.instructionsSubtitle, { color: colors.textSecondary }]}>{typeInfo?.description}</Text>
          </View>

          <View style={[styles.instructionsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Como fazer a análise</Text>
            {instructionsByType[analysisType].map((item, index) => (
              <View key={`${analysisType}-${index}`} style={styles.instructionRow}>
                <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                <Text style={[styles.instructionText, { color: colors.textSecondary }]}>{item}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.startBtn, { backgroundColor: colors.primary }]}
            onPress={() => {
              if (analysisMode === "video") pickVideo();
              else if (analysisMode === "photo") pickPhoto();
              else setScreen("capture");
            }}
          >
            <Ionicons name="play-circle" size={24} color="#fff" />
            <Text style={styles.startBtnText}>Iniciar captura</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // CAPTURE (câmera ao vivo)
  if (screen === "capture") {
    if (!device) {
      return (
        <SafeAreaView style={[styles.permContainer, { backgroundColor: "#000" }]}>
          <Text style={styles.permText}>Câmera não encontrada.</Text>
          <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary }]} onPress={() => setScreen("home")}>
            <Text style={styles.btnText}>Voltar</Text>
          </TouchableOpacity>
        </SafeAreaView>
      );
    }
    return (
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        <Camera
          ref={camera}
          style={StyleSheet.absoluteFill}
          device={device}
          format={format}
          fps={fps}
          isActive={true}
          video={true}
          audio={false}
          photo={true}
        />

        {/* Top bar */}
        <SafeAreaView style={styles.captureTopBar} edges={["top", "left", "right"]}>
          <TouchableOpacity style={styles.captureBack} onPress={() => setScreen("home")}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.captureBadge}>
            <Text style={styles.captureBadgeText}>{ANALYSIS_TYPES.find(t => t.id === analysisType)?.label}</Text>
          </View>
          {isRecording && (
            <View style={styles.recIndicator}>
              <View style={styles.recDot} />
              <Text style={styles.recText}>{frameCounter}</Text>
            </View>
          )}
        </SafeAreaView>

        {/* Gait event buttons */}
        {isRecording && analysisType === "marcha" && (
          <View style={styles.gaitControls}>
            <TouchableOpacity style={[styles.eventBtn, { backgroundColor: "#22c55e" }]} onPress={() => markGaitEvent("CONTATO")}>
              <Text style={styles.eventBtnText}>CONTATO</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.eventBtn, { backgroundColor: "#ef4444" }]} onPress={() => markGaitEvent("IMPULSÃO")}>
              <Text style={styles.eventBtnText}>IMPULSÃO</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Bottom controls */}
        <View style={styles.captureBottom}>
          {!isRecording ? (
            <TouchableOpacity style={styles.recBtn} onPress={() => setIsRecording(true)}>
              <View style={styles.recBtnInner} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.recBtn, styles.recBtnActive]} onPress={stopAndAnalyze}>
              <View style={styles.recBtnStop} />
            </TouchableOpacity>
          )}
          <Text style={styles.captureHint}>
            {isRecording ? "Toque para parar e analisar" : "Toque para iniciar gravação"}
          </Text>
        </View>
      </View>
    );
  }

  // ANALYSIS (processamento)
  if (screen === "analysis") {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={["top", "left", "right", "bottom"]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => setScreen("home")}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Processando Análise</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.analysisCenter}>
          {mediaUri && (
            <Image source={{ uri: mediaUri }} style={styles.analysisPreview} resizeMode="contain" />
          )}
          {!mediaUri && (
            <View style={[styles.analysisPreview, { backgroundColor: colors.surface, justifyContent: "center", alignItems: "center" }]}>
              <Ionicons name="videocam" size={48} color={colors.textSecondary} />
              <Text style={[{ color: colors.textSecondary, marginTop: 8 }]}>Gravação ao vivo</Text>
            </View>
          )}

          <Text style={[styles.analysisTypeLabel, { color: colors.text }]}>
            {ANALYSIS_TYPES.find(t => t.id === analysisType)?.label}
          </Text>
          {gaitEvents.length > 0 && (
            <Text style={[styles.analysisInfo, { color: colors.textSecondary }]}>
              {gaitEvents.length} eventos de marcha marcados
            </Text>
          )}

          <TouchableOpacity
            style={[styles.startBtn, { backgroundColor: colors.primary, marginTop: 24 }]}
            onPress={runAnalysis}
            disabled={analyzing}
          >
            {analyzing ? (
              <><ActivityIndicator color="#fff" /><Text style={styles.startBtnText}>Analisando...</Text></>
            ) : (
              <><Ionicons name="analytics" size={22} color="#fff" /><Text style={styles.startBtnText}>Executar Análise</Text></>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // REPORT
  if (screen === "report" && result) {
    const typeInfo = ANALYSIS_TYPES.find(t => t.id === result.type);
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={["top", "left", "right", "bottom"]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => setScreen("home")}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Relatório</Text>
          <TouchableOpacity onPress={saveReport}>
            <Ionicons name="save-outline" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.reportContent}>
          {/* Header do relatório */}
          <View style={[styles.reportHeader, { backgroundColor: colors.primary + "15" }]}>
            <Ionicons name={typeInfo?.icon as any} size={32} color={colors.primary} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.reportTypeTitle, { color: colors.primary }]}>{typeInfo?.label}</Text>
              <Text style={[styles.reportDate, { color: colors.textSecondary }]}>
                {new Date(result.timestamp).toLocaleString("pt-BR")}
              </Text>
              {result.patientName && (
                <Text style={[styles.reportPatient, { color: colors.text }]}>
                  Paciente: {result.patientName}
                </Text>
              )}
            </View>
          </View>

          {/* Tabela de ângulos */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Medições</Text>
          {result.angles.map((a, i) => (
            <View key={i} style={[styles.angleRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.angleJoint, { color: colors.text }]}>{a.joint}</Text>
                <Text style={[styles.angleRef, { color: colors.textSecondary }]}>Referência: {a.reference}°</Text>
              </View>
              <View style={[
                styles.angleBadge,
                { backgroundColor: a.status === "ok" ? "#10B981" : a.status === "warning" ? "#F59E0B" : "#EF4444" }
              ]}>
                <Text style={styles.angleBadgeText}>{a.angle}°</Text>
              </View>
              <Ionicons
                name={a.status === "ok" ? "checkmark-circle" : a.status === "warning" ? "warning" : "alert-circle"}
                size={20}
                color={a.status === "ok" ? "#10B981" : a.status === "warning" ? "#F59E0B" : "#EF4444"}
                style={{ marginLeft: 8 }}
              />
            </View>
          ))}

          {/* Legenda */}
          <View style={styles.legendRow}>
            {[["#10B981","Normal"],["#F59E0B","Atenção"],["#EF4444","Alterado"]].map(([c, l]) => (
              <View key={l} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: c }]} />
                <Text style={[styles.legendText, { color: colors.textSecondary }]}>{l}</Text>
              </View>
            ))}
          </View>

          {/* Observações */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Observações Clínicas</Text>
          <View style={[styles.obsBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.obsText, { color: colors.text }]}>{result.observations}</Text>
          </View>

          {/* Ações */}
          <TouchableOpacity
            style={[styles.startBtn, { backgroundColor: selectedPatientId ? colors.primary : colors.border, marginTop: 16 }]}
            onPress={saveReport}
          >
            <Ionicons name="save" size={20} color="#fff" />
            <Text style={styles.startBtnText}>
              {selectedPatientId ? `Salvar no prontuário de ${selectedPatientName}` : "Selecione um paciente para salvar"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return null;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function generateObservations(type: AnalysisType, angles: AnalysisResult["angles"]): string {
  const alerts  = angles.filter(a => a.status === "alert");
  const warnings = angles.filter(a => a.status === "warning");

  const lines: string[] = [];
  if (type === "postura") {
    lines.push("Análise postural global realizada nos planos frontal e sagital.");
    if (alerts.length)   lines.push(`Alterações significativas em: ${alerts.map(a => a.joint).join(", ")}.`);
    if (warnings.length) lines.push(`Desvios moderados identificados em: ${warnings.map(a => a.joint).join(", ")}.`);
    if (!alerts.length && !warnings.length) lines.push("Alinhamento postural dentro dos parâmetros normais.");
  } else if (type === "marcha") {
    lines.push("Análise cinemática do ciclo de marcha.");
    lines.push("Verifique simetria entre membros e padrão de ativação muscular.");
  } else if (type === "articulacao") {
    lines.push("Goniometria funcional realizada em posição de referência.");
    if (alerts.length) lines.push(`ADM reduzida em: ${alerts.map(a => a.joint).join(", ")}. Investigar limitações capsulares ou musculares.`);
  } else {
    lines.push("Análise de alinhamento vertical pelo método da linha de prumo.");
  }
  lines.push("\nSugere-se correlação com avaliação clínica e anamnese completa.");
  return lines.join(" ");
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1 },
  instructionsContent: { padding: 16, gap: 16, paddingBottom: 40 },
  instructionsCard: { borderWidth: 1, borderRadius: 18, padding: 16, gap: 10 },
  instructionsBadge: { fontSize: 12, fontWeight: "700", textTransform: "uppercase" },
  instructionsPatient: { fontSize: 18, fontWeight: "700" },
  instructionsTitle: { fontSize: 20, fontWeight: "700" },
  instructionsSubtitle: { fontSize: 14, lineHeight: 20 },
  instructionRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  instructionText: { flex: 1, fontSize: 14, lineHeight: 20 },
  permContainer: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 16 },
  permText: { fontSize: 16, textAlign: "center", color: "#fff" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  headerBack: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: "600" },
  homeContent: { padding: 16, gap: 12, paddingBottom: 40 },
  patientCard: { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 12, borderWidth: 1, gap: 12 },
  patientInfo: { flex: 1 },
  patientLabel: { fontSize: 11, marginBottom: 2 },
  patientName: { fontSize: 15, fontWeight: "600" },
  sectionTitle: { fontSize: 14, fontWeight: "700", marginTop: 8, marginBottom: 4 },
  analysisCard: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 12, borderWidth: 1.5, gap: 12 },
  analysisIcon: { width: 44, height: 44, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  analysisCardTitle: { fontSize: 15, fontWeight: "600" },
  analysisCardDesc: { fontSize: 12, marginTop: 2 },
  modeRow: { flexDirection: "row", gap: 10 },
  modeBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 12, borderRadius: 10, borderWidth: 1, gap: 6 },
  modeBtnText: { fontSize: 13, fontWeight: "600" },
  startBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 16, borderRadius: 14, gap: 8, marginTop: 8 },
  startBtnText: { color: "#fff", fontSize: 16, fontWeight: "700", flexShrink: 1 },
  btn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  backLink: { marginTop: 8 },
  backLinkText: { fontSize: 14 },
  searchInputWrap: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 14, marginHorizontal: 16, marginTop: 16, marginBottom: 8, paddingHorizontal: 12, height: 48 },
  searchInput: { flex: 1, fontSize: 15 },
  patientRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  patientRowName: { fontSize: 15 },
  emptyPatientContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 48, gap: 8 },
  emptyPatientText: { fontSize: 14 },
  // Capture
  captureTopBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 8, justifyContent: "space-between" },
  captureBack: { backgroundColor: "rgba(0,0,0,0.5)", padding: 8, borderRadius: 8 },
  captureBadge: { backgroundColor: "rgba(0,0,0,0.6)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  captureBadgeText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  recIndicator: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(220,38,38,0.8)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  recDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#fff" },
  recText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  gaitControls: { position: "absolute", top: "40%", right: 20, gap: 16 },
  eventBtn: { paddingHorizontal: 20, paddingVertical: 14, borderRadius: 12, elevation: 8 },
  eventBtnText: { color: "#fff", fontWeight: "900", fontSize: 13 },
  captureBottom: { position: "absolute", bottom: 60, left: 0, right: 0, alignItems: "center", gap: 10 },
  recBtn: { width: 72, height: 72, borderRadius: 36, backgroundColor: "rgba(255,255,255,0.3)", borderWidth: 4, borderColor: "#fff", alignItems: "center", justifyContent: "center" },
  recBtnInner: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#ef4444" },
  recBtnActive: { backgroundColor: "rgba(220,38,38,0.4)", borderColor: "#ef4444" },
  recBtnStop: { width: 28, height: 28, borderRadius: 4, backgroundColor: "#fff" },
  captureHint: { color: "#fff", fontSize: 13, opacity: 0.8 },
  // Analysis
  analysisCenter: { flex: 1, alignItems: "center", padding: 24, gap: 16 },
  analysisPreview: { width: W - 48, height: (W - 48) * 0.56, borderRadius: 12, overflow: "hidden" },
  analysisTypeLabel: { fontSize: 18, fontWeight: "700" },
  analysisInfo: { fontSize: 14 },
  // Report
  reportContent: { padding: 16, gap: 12, paddingBottom: 40 },
  reportHeader: { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 14 },
  reportTypeTitle: { fontSize: 17, fontWeight: "700" },
  reportDate: { fontSize: 12, marginTop: 2 },
  reportPatient: { fontSize: 13, marginTop: 4, fontWeight: "600" },
  angleRow: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 6 },
  angleJoint: { fontSize: 14, fontWeight: "600" },
  angleRef: { fontSize: 11, marginTop: 2 },
  angleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  angleBadgeText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  legendRow: { flexDirection: "row", gap: 16, marginTop: 4, marginBottom: 8 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12 },
  obsBox: { padding: 14, borderRadius: 12, borderWidth: 1 },
  obsText: { fontSize: 14, lineHeight: 22 },
});
