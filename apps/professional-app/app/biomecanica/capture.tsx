import { useState } from "react";
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, runOnJS } from "react-native-reanimated";
import Svg, { Line } from "react-native-svg";
import {
  X, SettingsIcon, CheckCircle2, RotateCcw, Timer, ChevronDown, ChevronUp,
  ArrowDown, Footprints, MoveVertical, ChevronsUp, FolderUp
} from "lucide-react-native";
import { bio, font } from "@/constants/biomecanica";
import { Camera, useCameraDevice, useCameraPermission } from "react-native-vision-camera";
import * as ImagePicker from "expo-image-picker";

const JOINTS: Record<string, [number, number]> = {
  nose: [50, 12], neck: [50, 16], chest: [50, 21], spine: [50, 27], pelvis: [50, 33],
  lSh: [42, 18], rSh: [58, 18], lEl: [37, 25], rEl: [63, 25], lWr: [34, 32], rWr: [66, 32],
  lHip: [45, 33], rHip: [55, 33], lKnee: [44, 46], rKnee: [56, 46], lAnk: [43, 57], rAnk: [57, 57],
};
const EDGES: [string, string][] = [
  ["nose", "neck"], ["neck", "chest"], ["chest", "spine"], ["spine", "pelvis"],
  ["neck", "lSh"], ["neck", "rSh"], ["lSh", "lEl"], ["lEl", "lWr"], ["rSh", "rEl"], ["rEl", "rWr"],
  ["pelvis", "lHip"], ["pelvis", "rHip"], ["lHip", "lKnee"], ["lKnee", "lAnk"], ["rHip", "rKnee"], ["rKnee", "rAnk"],
];

const PROTOCOLS = [
  { name: "Agachamento", meta: "ROM joelho · valgo · tronco", Icon: ArrowDown },
  { name: "Marcha", meta: "Cadência · simetria · fase de apoio", Icon: Footprints },
  { name: "Step-down", meta: "Controle pélvico · valgo dinâmico", Icon: MoveVertical },
  { name: "Salto vertical", meta: "Impulsão · aterrissagem · simetria", Icon: ChevronsUp },
];

const VIEWS = ["Frontal", "Sagital", "Posterior"];
const COLLAPSED = 300;

export default function CaptureScreen() {
  const router = useRouter();
  const { height } = useWindowDimensions();
  const [recording, setRecording] = useState(false);
  const [view, setView] = useState("Sagital");
  const [protocol, setProtocol] = useState("Agachamento");
  const [open, setOpen] = useState(false);

  const device = useCameraDevice("back");
  const { hasPermission, requestPermission } = useCameraPermission();

  const ty = useSharedValue(COLLAPSED);
  const start = useSharedValue(COLLAPSED);

  const handlePickVideo = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsEditing: false,
      quality: 1,
    });
    if (!result.canceled) {
      console.log("Video selected:", result.assets[0].uri);
      // Process video using native module / Frame Processor here
    }
  };

  const setOpenState = (v: boolean) => setOpen(v);
  const snap = (toOpen: boolean) => {
    ty.value = withTiming(toOpen ? 0 : COLLAPSED, { duration: 280 });
    runOnJS(setOpenState)(toOpen);
  };
  const toggle = () => snap(!open);

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
      {/* camera feed */}
      <View style={styles.camera}>
        {device && hasPermission ? (
          <Camera
            style={StyleSheet.absoluteFill}
            device={device}
            isActive={!open} // pause camera when sheet is open
            video={true}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: "#000", alignItems: 'center', justifyContent: 'center' }]}>
            {!hasPermission && (
              <Pressable onPress={requestPermission}>
                <Text style={{ color: bio.primary, fontFamily: font.bold }}>Permitir Câmera</Text>
              </Pressable>
            )}
          </View>
        )}
        {/* plumb line */}
        <View style={styles.plumb} />
        {/* skeleton edges */}
        <Svg style={StyleSheet.absoluteFill} viewBox="0 0 100 100" preserveAspectRatio="none">
          {EDGES.map(([a, b], i) => (
            <Line key={i} x1={JOINTS[a][0]} y1={JOINTS[a][1]} x2={JOINTS[b][0]} y2={JOINTS[b][1]} stroke="hsla(211,100%,60%,0.55)" strokeWidth={0.5} strokeLinecap="round" />
          ))}
        </Svg>
        {/* joint dots */}
        {Object.values(JOINTS).map(([x, y], i) => (
          <View key={i} style={[styles.joint, { left: `${x}%`, top: `${y}%` }]} />
        ))}
      </View>

      {/* top controls */}
      <SafeAreaView edges={["top"]} style={styles.topSafe} pointerEvents="box-none">
        <View style={styles.topctl}>
          <Pressable style={styles.roundBtn} onPress={() => router.back()} hitSlop={6}>
            <X size={19} color="#fff" strokeWidth={2.2} />
          </Pressable>
          <View style={styles.calibChip}>
            <CheckCircle2 size={14} color="hsl(142,70%,75%)" strokeWidth={2.4} />
            <Text style={styles.calibText}>CALIBRADO · 3,2 m</Text>
          </View>
          <Pressable style={styles.roundBtn} hitSlop={6}>
            <SettingsIcon size={19} color="#fff" strokeWidth={2.2} />
          </Pressable>
        </View>

        {/* recording badge + meta */}
        <View style={styles.recBadge}>
          <View style={[styles.recDot, recording && { opacity: 1 }]} />
          <Text style={styles.recBadgeText}>{recording ? "REC · 00:04" : "PRONTO · 00:00"}</Text>
        </View>
        <View style={styles.recMeta}>
          <View style={styles.metaPill}><Text style={styles.metaPillText}>1080p · 60fps</Text></View>
          <View style={styles.metaPill}><Text style={styles.metaPillText}>17 / 17 juntas</Text></View>
        </View>
      </SafeAreaView>

      {/* hint */}
      {!recording && !open && (
        <Text style={[styles.hint, { top: height * 0.5 }]}>
          Posicione o paciente sobre a linha de prumo.{"\n"}17 articulações rastreadas em tempo real.
        </Text>
      )}

      {/* view toggle */}
      {!open && (
        <View style={styles.viewToggle}>
          {VIEWS.map((v) => {
            const sel = v === view;
            return (
              <Pressable key={v} onPress={() => setView(v)} style={[styles.vt, sel && styles.vtSel]}>
                <Text style={[styles.vtText, sel && { color: "#fff" }]}>{v}</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {/* record controls */}
      {!open && (
        <View style={styles.recRow}>
          <Pressable style={styles.recSide} hitSlop={6} onPress={handlePickVideo}>
            <FolderUp size={20} color="#fff" strokeWidth={2.2} />
          </Pressable>
          <Pressable style={styles.recBtn} onPress={() => setRecording((r) => !r)}>
            <View style={[styles.recInner, recording && styles.recInnerActive]} />
          </Pressable>
          <Pressable style={styles.recSide} hitSlop={6}>
            <Timer size={20} color="#fff" strokeWidth={2.2} />
          </Pressable>
        </View>
      )}

      {/* bottom sheet */}
      <Animated.View style={[styles.sheet, sheetStyle]}>
        <GestureDetector gesture={pan}>
          <Pressable onPress={toggle}>
            <View style={styles.grab}>
              <View style={styles.grabBar} />
            </View>
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>Protocolo de teste</Text>
              <View style={styles.selNow}>
                <Text style={styles.selNowText}>{protocol}</Text>
                {open ? <ChevronDown size={16} color={bio.primary} strokeWidth={2.4} /> : <ChevronUp size={16} color={bio.primary} strokeWidth={2.4} />}
              </View>
            </View>
          </Pressable>
        </GestureDetector>

        <View style={styles.sheetBody}>
          <Pressable style={styles.patientSel}>
            <View style={styles.patientPa}><Text style={styles.patientPaText}>CF</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.patientPn}>Carla Ferreira</Text>
              <Text style={styles.patientPx}>34 anos · Condromalácia G2 · Sessão 12</Text>
            </View>
            <ChevronDown size={18} color={bio.muted} strokeWidth={2.2} />
          </Pressable>

          <Text style={styles.fieldLabel}>Protocolo</Text>
          <View style={{ gap: 9 }}>
            {PROTOCOLS.map((p) => {
              const sel = p.name === protocol;
              return (
                <Pressable key={p.name} onPress={() => setProtocol(p.name)} style={[styles.testOpt, sel && styles.testOptSel]}>
                  <View style={[styles.ti, sel && { backgroundColor: bio.primary }]}>
                    <p.Icon size={19} color={sel ? "#fff" : bio.primary} strokeWidth={2.2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.optNm}>{p.name}</Text>
                    <Text style={styles.optMt}>{p.meta}</Text>
                  </View>
                  <View style={[styles.rad, sel && styles.radSel]} />
                </Pressable>
              );
            })}
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: bio.cameraBg },
  camera: { ...StyleSheet.absoluteFillObject, backgroundColor: "#0A0E16" },
  plumb: { position: "absolute", top: 0, bottom: 0, left: "50%", width: 1, backgroundColor: "hsla(45,93%,55%,0.45)" },
  joint: { position: "absolute", width: 11, height: 11, borderRadius: 6, backgroundColor: "hsl(45,93%,55%)", borderWidth: 2, borderColor: "#fff", marginLeft: -5.5, marginTop: -5.5 },

  topSafe: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 10 },
  topctl: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingTop: 12 },
  roundBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(15,20,30,0.6)", borderWidth: 1, borderColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center" },
  calibChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: "hsl(142,60%,16%)", borderWidth: 1, borderColor: "hsl(142,50%,32%)" },
  calibText: { color: "hsl(142,70%,75%)", fontSize: 11, fontFamily: font.extrabold },
  recBadge: { position: "absolute", top: 96, alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: "rgba(0,0,0,0.5)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" },
  recDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: "hsl(0,80%,55%)" },
  recBadgeText: { color: "#fff", fontSize: 12, fontFamily: font.extrabold, letterSpacing: 0.4 },
  recMeta: { position: "absolute", top: 96, right: 18, gap: 5, alignItems: "flex-end" },
  metaPill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 7, backgroundColor: "rgba(0,0,0,0.5)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  metaPillText: { color: "#fff", fontSize: 10, fontFamily: font.bold },

  hint: { position: "absolute", left: 24, right: 24, textAlign: "center", fontSize: 12, fontFamily: font.semibold, color: "rgba(255,255,255,0.72)", lineHeight: 16.8 },

  viewToggle: { position: "absolute", alignSelf: "center", bottom: 234, flexDirection: "row", gap: 4, backgroundColor: "rgba(10,14,22,0.7)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", borderRadius: 13, padding: 4 },
  vt: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 10 },
  vtSel: { backgroundColor: bio.primary },
  vtText: { fontSize: 12, fontFamily: font.bold, color: "rgba(255,255,255,0.6)" },

  recRow: { position: "absolute", left: 0, right: 0, bottom: 132, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 44 },
  recSide: { width: 50, height: 50, borderRadius: 25, backgroundColor: "rgba(15,20,30,0.65)", borderWidth: 1, borderColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center" },
  recBtn: { width: 78, height: 78, borderRadius: 39, borderWidth: 4, borderColor: "#fff", alignItems: "center", justifyContent: "center" },
  recInner: { width: 30, height: 30, borderRadius: 7, backgroundColor: "hsl(0,80%,55%)" },
  recInnerActive: { borderRadius: 15 },

  sheet: { position: "absolute", left: 0, right: 0, bottom: 0, height: 470, backgroundColor: bio.card, borderTopLeftRadius: 26, borderTopRightRadius: 26, shadowColor: "#000", shadowOpacity: 0.28, shadowRadius: 24, shadowOffset: { width: 0, height: -8 }, elevation: 16 },
  grab: { paddingTop: 11, paddingBottom: 4, alignItems: "center" },
  grabBar: { width: 40, height: 5, borderRadius: 999, backgroundColor: bio.border },
  sheetHead: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 22, paddingBottom: 14, paddingTop: 4 },
  sheetTitle: { fontSize: 16, fontFamily: font.extrabold, letterSpacing: -0.2, color: bio.fg },
  selNow: { marginLeft: "auto", flexDirection: "row", alignItems: "center", gap: 6 },
  selNowText: { fontSize: 13, fontFamily: font.bold, color: bio.primary },
  sheetBody: { paddingHorizontal: 22, paddingBottom: 30 },
  patientSel: { flexDirection: "row", alignItems: "center", gap: 11, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14, borderWidth: 1, borderColor: bio.border, marginBottom: 16 },
  patientPa: { width: 36, height: 36, borderRadius: 12, backgroundColor: bio.avatarBlue, alignItems: "center", justifyContent: "center" },
  patientPaText: { color: "#fff", fontSize: 13, fontFamily: font.extrabold },
  patientPn: { fontSize: 14, fontFamily: font.bold, color: bio.fg },
  patientPx: { fontSize: 11, fontFamily: font.semibold, color: bio.muted, marginTop: 1 },
  fieldLabel: { fontSize: 11, fontFamily: font.extrabold, letterSpacing: 0.6, textTransform: "uppercase", color: bio.muted, marginBottom: 9 },
  testOpt: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 13, borderRadius: 14, borderWidth: 1, borderColor: bio.border },
  testOptSel: { borderColor: bio.primary, backgroundColor: "hsl(211,100%,97%)" },
  ti: { width: 38, height: 38, borderRadius: 11, backgroundColor: "#EEF1F5", alignItems: "center", justifyContent: "center" },
  optNm: { fontSize: 14, fontFamily: font.bold, color: bio.fg },
  optMt: { fontSize: 11, fontFamily: font.semibold, color: bio.muted, marginTop: 1 },
  rad: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: bio.border },
  radSel: { borderColor: bio.primary, backgroundColor: bio.primary, borderWidth: 6 },
});
