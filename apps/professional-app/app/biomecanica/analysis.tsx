import { useState, useMemo, useEffect } from "react";
import { View, Text, Pressable, TextInput, ScrollView, StyleSheet, ActivityIndicator, Alert, Dimensions, TouchableOpacity, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, runOnJS, FadeIn, SlideInDown } from "react-native-reanimated";
import Svg, { Circle, Path, Ellipse, Line, Text as SvgText, G } from "react-native-svg";
import { useVideoPlayer, VideoView } from "expo-video";
import {
  ChevronLeft, GitCompare, Share2, ChevronUp, ChevronDown, Rewind, FastForward, Play, Pause,
  TrendingUp, TrendingDown, AlertTriangle, Check, PenTool, Eraser, Info, Brain, X
} from "lucide-react-native";
import { bio, font } from "@/constants/biomecanica";
import { biomechanicsApi } from "@/lib/api/biomechanics";
import { LineChart } from "react-native-gifted-charts";
import { SymmetryMeter } from "@/components/biomecanica/SymmetryMeter";
import { TrendelenburgOverlay, ValgusOverlay } from "@/components/biomecanica/ClinicalTestOverlays";
import { fetchApi } from "@/lib/api";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const PROTOCOLS = [
  { id: "GENERIC", label: "Análise Livre" },
  { id: "TRENDELENBURG", label: "Trendelenburg" },
  { id: "DYNAMIC_VALGUS", label: "Valgo Dinâmico" },
  { id: "HOP_TEST", label: "Hop Test" },
];

const COLLAPSED = 330;

const MOCK_TRAJECTORY = Array.from({ length: 40 }, (_, i) => ({
  value: 40 + Math.sin(i / 5) * 40 + Math.random() * 5,
  label: `${(i / 4).toFixed(1)}s`,
  dataPointText: i === 15 ? "118°" : undefined,
}));

export default function AnalysisScreen() {
  const router = useRouter();
  const { uri, patientId, patientName } = useLocalSearchParams<{ uri?: string; patientId?: string; patientName?: string }>();
  
  const [protocol, setProtocol] = useState<string>("GENERIC");
  const [playing, setPlaying] = useState(false);
  const [view, setView] = useState("SAGITAL");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState(
    "Análise biomecânica digital em andamento. Padrões motores sendo identificados...",
  );

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(1);
  const [brainModalVisible, setBrainModalVisible] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);

  const handleSave = async () => {
    if (!patientId) {
      Alert.alert("Erro", "Paciente não identificado.");
      return;
    }

    setSaving(true);
    try {
      const res = await biomechanicsApi.create({
        patientId,
        type: protocol,
        analysisData: {
          metrics: { 
            knee_rom: 118, 
            valgus: protocol === "DYNAMIC_VALGUS" ? 14 : 2,
            symmetry: 84,
            pelvic_drop: protocol === "TRENDELENBURG" ? 6 : 1
          },
          patientName,
        },
        symmetryScore: 84,
        trajectoryData: MOCK_TRAJECTORY,
        aiValidationStatus: "validated",
        observations: note,
        mediaUrl: uri,
      });

      if (res.data?.id) {
        // Trigger Auto-Prescribe
        const suggestRes = await fetchApi<any>("/api/clinical/prescriptions/suggest", {
          method: "POST",
          body: JSON.stringify({
            assessmentId: res.data.id,
            testType: protocol
          })
        });

        if (suggestRes.success) {
          setSuggestions(suggestRes.suggestions);
          setBrainModalVisible(true);
        } else {
          router.push(`/biomecanica/report?assessmentId=${res.data.id}&patientId=${patientId}&patientName=${encodeURIComponent(patientName || "")}`);
        }
      }
    } catch (err: any) {
      Alert.alert("Erro", "Falha ao salvar análise");
    } finally {
      setSaving(false);
    }
  };

  const [mode, setMode] = useState<"view" | "goniometer">("view");
  const [points, setPoints] = useState<{ x: number; y: number }[]>([]);

  const player = useVideoPlayer(uri ? { uri } : "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4", player => {
    player.loop = true;
    if (playing) player.play();
  });

  useEffect(() => {
    const interval = setInterval(() => {
      if (player && playing) {
        setCurrentTime(player.currentTime);
        setDuration(player.duration || 1);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [player, playing]);

  const ty = useSharedValue(COLLAPSED);
  const start = useSharedValue(COLLAPSED);
  const setOpenState = (v: boolean) => setOpen(v);
  const toggle = () => {
    const toOpen = !open;
    ty.value = withTiming(toOpen ? 0 : COLLAPSED, { duration: 280 });
    setOpen(toOpen);
  };

  const handleTap = (e: any) => {
    if (mode !== "goniometer") return;
    setPoints(prev => {
      if (prev.length >= 3) return [{ x: e.x, y: e.y }];
      return [...prev, { x: e.x, y: e.y }];
    });
  };

  const tapGesture = Gesture.Tap().onEnd((e) => {
    runOnJS(handleTap)(e);
  });
  const pan = Gesture.Pan()
    .onBegin(() => {
      start.value = ty.value;
    })
    .onUpdate((e) => {
      ty.value = Math.max(0, Math.min(COLLAPSED, start.value + e.translationY));
    })
    .onEnd(() => {
      const toOpen = ty.value < COLLAPSED / 2;
      ty.value = withTiming(toOpen ? 0 : COLLAPSED, { duration: 240 });
      runOnJS(setOpenState)(toOpen);
    });
  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: ty.value }] }));

  const progressPercent = (currentTime / duration) * 100;

  return (
    <View style={styles.root}>
      {/* video */}
      <GestureDetector gesture={tapGesture}>
        <View style={styles.video}>
          <VideoView style={StyleSheet.absoluteFill} player={player} />
          
          {/* Wave 2: Protocol Overlays */}
          {protocol === "TRENDELENBURG" && <TrendelenburgOverlay points={points} />}
          {protocol === "DYNAMIC_VALGUS" && <ValgusOverlay points={points} />}

          {/* Goniometer Canvas (Generic) */}
          {protocol === "GENERIC" && (
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              <Svg height="100%" width="100%">
                {points.map((p, i) => (
                  <G key={i}>
                    <Circle cx={p.x} cy={p.y} r={12} fill="rgba(255,255,255,0.4)" />
                    <Circle cx={p.x} cy={p.y} r={4} fill={bio.primary} />
                  </G>
                ))}
                {points.length > 1 && (
                  <Line x1={points[0].x} y1={points[0].y} x2={points[1].x} y2={points[1].y} stroke={bio.primary} strokeWidth={3} strokeDasharray="6 4" />
                )}
              </Svg>
            </View>
          )}
        </View>
      </GestureDetector>

      {/* top bar */}
      <SafeAreaView edges={["top"]} style={styles.topSafe} pointerEvents="box-none">
        <View style={styles.topbar}>
          <Pressable style={styles.roundBtn} onPress={() => router.back()} hitSlop={6}>
            <ChevronLeft size={19} color="#fff" strokeWidth={2.2} />
          </Pressable>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.tn} numberOfLines={1}>Biomecânica 2.0</Text>
            <Text style={styles.ts}>{PROTOCOLS.find(p => p.id === protocol)?.label}</Text>
          </View>
          <Pressable style={styles.roundBtn} onPress={() => {
            setPoints([]);
            setMode(mode === "goniometer" ? "view" : "goniometer");
          }}>
            {mode === "goniometer" ? <Eraser size={19} color="#fff" /> : <PenTool size={19} color="#fff" />}
          </Pressable>
        </View>

        {/* Wave 2: Protocol Selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.protocolBar} contentContainerStyle={{ paddingRight: 32 }}>
          {PROTOCOLS.map((p) => {
            const sel = p.id === protocol;
            return (
              <Pressable key={p.id} onPress={() => { setProtocol(p.id); setPoints([]); }} style={[styles.pt, sel && styles.ptSel]}>
                <Text style={[styles.ptText, sel && { color: "#fff" }]}>{p.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </SafeAreaView>

      {/* video controls */}
      {!open && (
        <View style={styles.controls}>
          <View style={styles.chartContainer}>
            <LineChart
              data={MOCK_TRAJECTORY}
              width={SCREEN_WIDTH - 60}
              height={80}
              thickness={3}
              color={bio.primary}
              hideDataPoints
              hideRules
              hideYAxisText
              xAxisColor="transparent"
              yAxisColor="transparent"
            />
          </View>
          <View style={styles.scrubber}>
            <View style={[styles.scrubFill, { width: `${progressPercent}%` }]} />
            <View style={styles.scrubHandle} />
          </View>
          <View style={styles.ctlRow}>
            <Text style={styles.timecode}>{currentTime.toFixed(2)}s</Text>
            <View style={{ flex: 1 }} />
            <Pressable style={styles.play} onPress={() => {
              if (playing) { player?.pause(); setPlaying(false); }
              else { player?.play(); setPlaying(true); }
            }}>
              {playing ? <Pause size={26} color={bio.primary} /> : <Play size={26} color={bio.primary} />}
            </Pressable>
            <View style={{ flex: 1 }} />
          </View>
        </View>
      )}

      {/* bottom sheet */}
      <Animated.View style={[styles.sheet, sheetStyle]}>
        <GestureDetector gesture={pan}>
          <Pressable onPress={toggle}>
            <View style={styles.grab}><View style={styles.grabBar} /></View>
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>Inteligência Biomecânica</Text>
              {open ? <ChevronDown size={18} color={bio.muted} /> : <ChevronUp size={18} color={bio.muted} />}
            </View>
          </Pressable>
        </GestureDetector>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.sheetScroll} showsVerticalScrollIndicator={false}>
          <SymmetryMeter score={84} />
          
          <View>
            <Text style={styles.blockLabel}>Achados do Protocolo</Text>
            <View style={styles.protocolResult}>
              <Ionicons name="shield-checkmark" size={24} color="#10B981" />
              <View style={{ flex: 1 }}>
                <Text style={styles.resultTitle}>Padrão identificado</Text>
                <Text style={styles.resultDesc}>Aguardando finalização para processar diagnóstico completo do Brain.</Text>
              </View>
            </View>
          </View>

          <View style={styles.noteCard}>
            <TextInput value={note} onChangeText={setNote} multiline style={styles.noteInput} />
            <View style={styles.noteFoot}>
              <Pressable style={[styles.save, saving && { opacity: 0.7 }]} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color="#fff" /> : <><Check size={14} color="#fff" /><Text style={styles.saveText}>Finalizar e Prescrever</Text></>}
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </Animated.View>

      {/* Brain Suggestion Modal */}
      <Modal visible={brainModalVisible} transparent animationType="fade">
        <View style={styles.modalRoot}>
          <Animated.View entering={SlideInDown} style={styles.modalCard}>
            <View style={styles.modalHead}>
              <View style={styles.modalTitleRow}>
                <Brain size={20} color={bio.primary} />
                <Text style={styles.modalTitle}>Sugestão do Brain</Text>
              </View>
              <TouchableOpacity onPress={() => setBrainModalVisible(false)}>
                <X size={20} color={bio.muted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalIntro}>Com base na análise de {protocol.toLowerCase()}, sugiro atualizar o plano:</Text>
            
            {suggestions.map((s, i) => (
              <View key={i} style={styles.suggestionItem}>
                <View style={styles.suggestionDot} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.suggestionTitle}>{s.title}</Text>
                  <Text style={styles.suggestionDesc}>{s.description}</Text>
                </View>
              </View>
            ))}

            <TouchableOpacity 
              style={styles.applyBtn} 
              onPress={() => {
                setBrainModalVisible(false);
                Alert.alert("Sucesso", "Sugestões enviadas para o rascunho da evolução.");
                router.back();
              }}
            >
              <Text style={styles.applyBtnText}>Adicionar ao Plano</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#060910" },
  video: { ...StyleSheet.absoluteFillObject, backgroundColor: "#0B1422", alignItems: "center" },
  topSafe: { position: "absolute", top: 0, left: 0, right: 0 },
  topbar: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingTop: 6 },
  roundBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(15,20,30,0.6)", borderWidth: 1, borderColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center" },
  tn: { fontSize: 14, fontFamily: font.extrabold, color: "#fff" },
  ts: { fontSize: 11, fontFamily: font.semibold, color: "rgba(255,255,255,0.65)", marginTop: 1 },
  
  protocolBar: { position: "absolute", top: 56, alignSelf: "center", flexDirection: "row", paddingHorizontal: 16 },
  pt: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: "rgba(10,14,22,0.65)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", marginRight: 8 },
  ptSel: { backgroundColor: bio.primary, borderColor: bio.primary },
  ptText: { fontSize: 11, fontFamily: font.extrabold, color: "rgba(255,255,255,0.6)" },

  controls: { position: "absolute", left: 0, right: 0, bottom: 360, paddingHorizontal: 20 },
  chartContainer: { height: 90, marginBottom: 10 },
  scrubber: { height: 4, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 2, marginBottom: 14 },
  scrubFill: { height: "100%", backgroundColor: bio.primary, borderRadius: 2 },
  scrubHandle: { position: "absolute", right: 0, top: -6, width: 16, height: 16, borderRadius: 8, backgroundColor: "#fff" },
  ctlRow: { flexDirection: "row", alignItems: "center" },
  timecode: { fontSize: 12, fontFamily: font.bold, color: "#fff" },
  play: { width: 56, height: 56, borderRadius: 28, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", alignSelf: "center" },

  sheet: { position: "absolute", left: 0, right: 0, bottom: 0, height: 650, backgroundColor: bio.card, borderTopLeftRadius: 26, borderTopRightRadius: 26 },
  grab: { paddingTop: 11, paddingBottom: 2, alignItems: "center" },
  grabBar: { width: 40, height: 5, borderRadius: 999, backgroundColor: bio.border },
  sheetHead: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 22, paddingTop: 6, paddingBottom: 12 },
  sheetTitle: { fontSize: 16, fontFamily: font.extrabold, color: bio.fg, flex: 1 },
  sheetScroll: { paddingHorizontal: 22, paddingBottom: 40, gap: 20 },

  blockLabel: { fontSize: 11, fontFamily: font.extrabold, color: bio.muted, marginBottom: 9, textTransform: "uppercase" },
  protocolResult: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#f0fdf4", padding: 16, borderRadius: 16, borderWidth: 1, borderColor: "#bcf0da" },
  resultTitle: { fontSize: 14, fontWeight: "bold", color: "#166534" },
  resultDesc: { fontSize: 12, color: "#166534", opacity: 0.8 },

  noteCard: { borderWidth: 1, borderColor: bio.border, borderRadius: 14, padding: 14, backgroundColor: bio.card },
  noteInput: { fontSize: 13, color: bio.fg, minHeight: 60, textAlignVertical: "top" },
  noteFoot: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: bio.borderSoft },
  save: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 12, borderRadius: 12, backgroundColor: bio.primary },
  saveText: { color: "#fff", fontSize: 14, fontFamily: font.extrabold },

  modalRoot: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: "#fff", borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40 },
  modalHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  modalTitle: { fontSize: 18, fontWeight: "bold" },
  modalIntro: { fontSize: 14, color: bio.muted, marginBottom: 16 },
  suggestionItem: { flexDirection: "row", gap: 12, marginBottom: 16 },
  suggestionDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: bio.primary, marginTop: 6 },
  suggestionTitle: { fontSize: 15, fontWeight: "bold" },
  suggestionDesc: { fontSize: 13, color: bio.muted, lineHeight: 18 },
  applyBtn: { backgroundColor: bio.primary, padding: 16, borderRadius: 16, alignItems: "center", marginTop: 10 },
  applyBtnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
