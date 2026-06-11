import { useState } from "react";
import { View, Text, Pressable, TextInput, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, runOnJS } from "react-native-reanimated";
import Svg, { Circle, Path, Ellipse } from "react-native-svg";
import { useVideoPlayer, VideoView } from "expo-video";
import {
  ChevronLeft, GitCompare, Share2, ChevronUp, ChevronDown, Rewind, FastForward, Play, Pause,
  TrendingUp, TrendingDown, AlertTriangle, Check,
} from "lucide-react-native";
import { bio, font } from "@/constants/biomecanica";

const METRICS = [
  { l: "ROM joelho", v: "118°", d: "+6° vs 112°", up: true, tone: "ok" as const, icon: TrendingUp },
  { l: "Valgo dinâmico", v: "+14°", d: "+3° pior", up: false, tone: "warn" as const, icon: TrendingUp },
  { l: "Simetria L/R", v: "84%", d: "+6 p.p.", up: true, tone: "none" as const, icon: TrendingUp },
  { l: "Dor (VAS)", v: "3/10", d: "−2 vs 5", up: true, tone: "none" as const, icon: TrendingDown },
];

const GONIO = [
  { jn: "Quadril", sub: "flexão", e: "95°", d: "98°", delta: "+3°", up: true },
  { jn: "Joelho", sub: "flexão", e: "118°", d: "112°", delta: "−6°", up: false },
  { jn: "Tornozelo", sub: "dorsiflexão", e: "24°", d: "22°", delta: "−2°", up: false },
];

const COLLAPSED = 330;

export default function AnalysisScreen() {
  const router = useRouter();
  const { uri } = useLocalSearchParams<{ uri?: string }>();
  const [playing, setPlaying] = useState(false);
  const [view, setView] = useState("SAGITAL");
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState(
    "Valgo dinâmico do joelho direito no descenso, com compensação por inclinação de tronco. Paciente relata pinçada patelar ao atingir 90°.",
  );

  const player = useVideoPlayer(uri ? { uri } : "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4", player => {
    player.loop = true;
    if (playing) player.play();
  });

  const ty = useSharedValue(COLLAPSED);
  const start = useSharedValue(COLLAPSED);
  const setOpenState = (v: boolean) => setOpen(v);
  const toggle = () => {
    const toOpen = !open;
    ty.value = withTiming(toOpen ? 0 : COLLAPSED, { duration: 280 });
    setOpen(toOpen);
  };
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

  return (
    <View style={styles.root}>
      {/* video */}
      <View style={styles.video}>
        <VideoView style={StyleSheet.absoluteFill} player={player} />
        <View style={styles.athlete}>
          {/* Skeleton mockup when no video */}
          {!uri && (
            <Svg width={170} height={340} viewBox="0 0 200 400" fill="none" stroke="#cbd5e1" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
              <Circle cx="100" cy="40" r="18" fill="#cbd5e1" />
              <Path d="M100 60 Q105 95 115 130 Q120 155 118 175" />
              <Ellipse cx="118" cy="180" rx="14" ry="9" fill="#cbd5e1" />
              <Path d="M118 185 Q105 220 80 240" />
              <Path d="M80 240 Q90 280 110 320" />
              <Path d="M108 320 Q115 335 135 332" strokeWidth={6} />
              <Path d="M105 100 Q140 110 160 95" />
            </Svg>
          )}
        </View>
        {/* angle overlays */}
        <View style={[styles.angLabel, styles.angPrimary, { top: "22%", left: "18%" }]}>
          <Text style={styles.angTextWhite}>Tronco 32° flexão</Text>
        </View>
        <View style={[styles.angLabel, styles.angPrimary, { top: "36%", right: "10%" }]}>
          <Text style={styles.angTextWhite}>Quadril 78°</Text>
        </View>
        <View style={[styles.angLabel, styles.angWarn, { top: "50%", left: "14%" }]}>
          <AlertTriangle size={13} color="hsl(35,70%,18%)" strokeWidth={2.4} />
          <Text style={styles.angTextDark}>Joelho 92° valgo</Text>
        </View>
        <View style={[styles.angLabel, styles.angOk, { top: "58%", right: "14%" }]}>
          <Text style={styles.angTextWhite}>Tornozelo 24°</Text>
        </View>
      </View>

      {/* top bar */}
      <SafeAreaView edges={["top"]} style={styles.topSafe} pointerEvents="box-none">
        <View style={styles.topbar}>
          <Pressable style={styles.roundBtn} onPress={() => router.back()} hitSlop={6}>
            <ChevronLeft size={19} color="#fff" strokeWidth={2.2} />
          </Pressable>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.tn} numberOfLines={1}>Carla Ferreira</Text>
            <Text style={styles.ts}>Agachamento · 02/06 · Sessão 12</Text>
          </View>
          <Pressable style={styles.roundBtn} onPress={() => router.push("/biomecanica/comparison" as never)} hitSlop={6}>
            <GitCompare size={19} color="#fff" strokeWidth={2.2} />
          </Pressable>
          <Pressable style={styles.roundBtn} hitSlop={6}>
            <Share2 size={19} color="#fff" strokeWidth={2.2} />
          </Pressable>
        </View>
        <View style={styles.viewToggle}>
          {["FRONTAL", "SAGITAL", "POSTERIOR"].map((v) => {
            const sel = v === view;
            return (
              <Pressable key={v} onPress={() => setView(v)} style={[styles.vt, sel && styles.vtSel]}>
                <Text style={[styles.vtText, sel && { color: "#fff" }]}>{v}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.trialTag}>
          <Text style={styles.trialText}>TENTATIVA 3/5</Text>
        </View>
      </SafeAreaView>

      {/* video controls */}
      {!open && (
        <View style={styles.controls}>
          <View style={styles.scrubber}>
            <View style={styles.scrubFill} />
            <View style={[styles.scrubMark, { left: "15%" }]} />
            <View style={[styles.scrubMark, { left: "42%", backgroundColor: "hsl(45,93%,52%)" }]} />
            <View style={[styles.scrubMark, { left: "68%" }]} />
            <View style={styles.scrubHandle} />
          </View>
          <View style={styles.ctlRow}>
            <Text style={styles.timecode}>00:04.21 / 00:10.05</Text>
            <View style={{ flex: 1 }} />
            <Pressable style={styles.ctlBtn} onPress={() => player?.seekBy(-5)}><Rewind size={18} color="#fff" strokeWidth={2.2} /></Pressable>
            <Pressable style={styles.play} onPress={() => {
              if (playing) { player?.pause(); setPlaying(false); }
              else { player?.play(); setPlaying(true); }
            }}>
              {playing ? <Pause size={26} color={bio.primary} strokeWidth={2.4} /> : <Play size={26} color={bio.primary} strokeWidth={2.4} />}
            </Pressable>
            <Pressable style={styles.ctlBtn} onPress={() => player?.seekBy(5)}><FastForward size={18} color="#fff" strokeWidth={2.2} /></Pressable>
            <View style={styles.speed}><Text style={styles.speedText}>0.5×</Text></View>
          </View>
        </View>
      )}

      {/* bottom sheet */}
      <Animated.View style={[styles.sheet, sheetStyle]}>
        <GestureDetector gesture={pan}>
          <Pressable onPress={toggle}>
            <View style={styles.grab}><View style={styles.grabBar} /></View>
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>Métricas da sessão</Text>
              {open ? <ChevronDown size={18} color={bio.muted} strokeWidth={2.2} /> : <ChevronUp size={18} color={bio.muted} strokeWidth={2.2} />}
            </View>
          </Pressable>
        </GestureDetector>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.sheetScroll} showsVerticalScrollIndicator={false}>
          {/* metric grid */}
          <View style={styles.metricGrid}>
            {METRICS.map((m) => (
              <View key={m.l} style={styles.metric}>
                <Text style={styles.metricL}>{m.l}</Text>
                <Text style={[styles.metricV, m.tone === "ok" && { color: "hsl(158,64%,30%)" }, m.tone === "warn" && { color: "hsl(35,92%,38%)" }]}>{m.v}</Text>
                <View style={styles.metricD}>
                  <m.icon size={12} color={m.up ? "hsl(158,64%,35%)" : "hsl(0,72%,48%)"} strokeWidth={2.4} />
                  <Text style={[styles.metricDText, { color: m.up ? "hsl(158,64%,35%)" : "hsl(0,72%,48%)" }]}>{m.d}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* goniometry */}
          <View>
            <Text style={styles.blockLabel}>Goniometria · agachamento</Text>
            <View style={styles.romTable}>
              <View style={[styles.romRow, styles.romHead]}>
                <Text style={[styles.romC, styles.romHeadC, { flex: 1, textAlign: "left" }]}>Articulação</Text>
                <Text style={[styles.romC, styles.romHeadC, styles.romNum]}>Esq</Text>
                <Text style={[styles.romC, styles.romHeadC, styles.romNum]}>Dir</Text>
                <Text style={[styles.romC, styles.romHeadC, styles.romDelta]}>Δ</Text>
              </View>
              {GONIO.map((g) => (
                <View key={g.jn} style={[styles.romRow, styles.romBorder]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.jn}>{g.jn}</Text>
                    <Text style={styles.jnSub}>{g.sub}</Text>
                  </View>
                  <Text style={[styles.romC, styles.romNum]}>{g.e}</Text>
                  <Text style={[styles.romC, styles.romNum]}>{g.d}</Text>
                  <Text style={[styles.romC, styles.romDelta, { color: g.up ? "hsl(158,64%,35%)" : "hsl(0,72%,48%)" }]}>{g.delta}</Text>
                </View>
              ))}
              <View style={styles.romRow}>
                <Text style={[styles.jn, { flex: 1 }]}>Tronco<Text style={styles.jnSub}>  inclinação</Text></Text>
                <Text style={[styles.romC, { flex: 0, width: 120 }]}>32° anterior</Text>
              </View>
            </View>
          </View>

          {/* clinical note */}
          <View>
            <Text style={styles.blockLabel}>Nota clínica</Text>
            <View style={styles.noteCard}>
              <TextInput
                value={note}
                onChangeText={setNote}
                multiline
                placeholder="Descreva achados, compensações e conduta..."
                placeholderTextColor={bio.muted}
                style={styles.noteInput}
              />
              <View style={styles.noteFoot}>
                <Text style={styles.noteTime}>marcador 00:04.21</Text>
                <Pressable style={styles.save}>
                  <Check size={14} color="#fff" strokeWidth={2.6} />
                  <Text style={styles.saveText}>Salvar nota</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#060910" },
  video: { ...StyleSheet.absoluteFillObject, backgroundColor: "#0B1422", alignItems: "center" },
  athlete: { position: "absolute", top: "12%" },

  angLabel: { position: "absolute", flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  angPrimary: { backgroundColor: bio.primary },
  angWarn: { backgroundColor: "hsl(45,93%,50%)" },
  angOk: { backgroundColor: "hsl(158,64%,42%)" },
  angTextWhite: { color: "#fff", fontSize: 12, fontFamily: font.extrabold },
  angTextDark: { color: "hsl(35,70%,18%)", fontSize: 12, fontFamily: font.extrabold },

  topSafe: { position: "absolute", top: 0, left: 0, right: 0 },
  topbar: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingTop: 6 },
  roundBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(15,20,30,0.6)", borderWidth: 1, borderColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center" },
  tn: { fontSize: 14, fontFamily: font.extrabold, color: "#fff" },
  ts: { fontSize: 11, fontFamily: font.semibold, color: "rgba(255,255,255,0.65)", marginTop: 1 },
  viewToggle: { position: "absolute", top: 56, alignSelf: "center", flexDirection: "row", gap: 3, backgroundColor: "rgba(10,14,22,0.65)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", borderRadius: 12, padding: 3 },
  vt: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 9 },
  vtSel: { backgroundColor: "rgba(255,255,255,0.16)" },
  vtText: { fontSize: 11, fontFamily: font.extrabold, letterSpacing: 0.2, color: "rgba(255,255,255,0.6)" },
  trialTag: { position: "absolute", top: 104, right: 16, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 999, backgroundColor: "rgba(0,0,0,0.5)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" },
  trialText: { color: "#fff", fontSize: 10, fontFamily: font.extrabold, letterSpacing: 0.5 },

  controls: { position: "absolute", left: 0, right: 0, bottom: 360, paddingHorizontal: 20 },
  scrubber: { height: 5, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 999, marginBottom: 14 },
  scrubFill: { width: "42%", height: "100%", backgroundColor: "#fff", borderRadius: 999 },
  scrubMark: { position: "absolute", top: -3, width: 2, height: 11, borderRadius: 1, backgroundColor: bio.primary },
  scrubHandle: { position: "absolute", left: "42%", top: -6, width: 16, height: 16, borderRadius: 8, marginLeft: -8, backgroundColor: "#fff" },
  ctlRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  timecode: { fontSize: 12, fontFamily: font.bold, color: "rgba(255,255,255,0.9)" },
  ctlBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" },
  play: { width: 56, height: 56, borderRadius: 28, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  speed: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.12)" },
  speedText: { fontSize: 12, fontFamily: font.extrabold, color: "#fff" },

  sheet: { position: "absolute", left: 0, right: 0, bottom: 0, height: 600, backgroundColor: bio.card, borderTopLeftRadius: 26, borderTopRightRadius: 26, shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 24, shadowOffset: { width: 0, height: -8 }, elevation: 16 },
  grab: { paddingTop: 11, paddingBottom: 2, alignItems: "center" },
  grabBar: { width: 40, height: 5, borderRadius: 999, backgroundColor: bio.border },
  sheetHead: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 22, paddingTop: 6, paddingBottom: 12 },
  sheetTitle: { fontSize: 16, fontFamily: font.extrabold, letterSpacing: -0.2, color: bio.fg, flex: 1 },
  sheetScroll: { paddingHorizontal: 22, paddingBottom: 40, gap: 20 },

  metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  metric: { width: "47.5%", flexGrow: 1, padding: 14, backgroundColor: bio.card, borderWidth: 1, borderColor: bio.border, borderRadius: 14 },
  metricL: { fontSize: 10, fontFamily: font.extrabold, letterSpacing: 0.5, textTransform: "uppercase", color: bio.muted },
  metricV: { fontSize: 26, fontFamily: font.extrabold, letterSpacing: -0.8, marginTop: 3, color: bio.fg },
  metricD: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 5 },
  metricDText: { fontSize: 11, fontFamily: font.bold },

  blockLabel: { fontSize: 11, fontFamily: font.extrabold, letterSpacing: 0.6, textTransform: "uppercase", color: bio.muted, marginBottom: 9 },
  romTable: { borderWidth: 1, borderColor: bio.border, borderRadius: 14, overflow: "hidden" },
  romRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 11 },
  romHead: { backgroundColor: "#F1F3F6" },
  romBorder: { borderBottomWidth: 1, borderBottomColor: bio.borderSoft },
  romC: { fontSize: 13, fontFamily: font.bold, color: bio.fg, textAlign: "right" },
  romHeadC: { fontSize: 10, fontFamily: font.extrabold, letterSpacing: 0.5, textTransform: "uppercase", color: bio.muted },
  romNum: { width: 56 },
  romDelta: { width: 48 },
  jn: { fontSize: 13, fontFamily: font.bold, color: bio.fg },
  jnSub: { fontSize: 10, fontFamily: font.semibold, color: bio.muted },

  noteCard: { borderWidth: 1, borderColor: bio.border, borderRadius: 14, padding: 14, backgroundColor: bio.card },
  noteInput: { fontSize: 13, lineHeight: 19.5, color: bio.fg, fontFamily: font.medium, minHeight: 58, textAlignVertical: "top", padding: 0 },
  noteFoot: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: bio.borderSoft },
  noteTime: { fontSize: 11, fontFamily: font.extrabold, color: bio.primary },
  save: { marginLeft: "auto", flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 11, backgroundColor: bio.primary },
  saveText: { color: "#fff", fontSize: 13, fontFamily: font.extrabold },
});
