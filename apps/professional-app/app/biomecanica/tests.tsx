import { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, TextInput, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Svg, { Circle, Path, Line } from "react-native-svg";
import { Plus, Search, Clock, Repeat, Ruler, Camera, ArrowRight } from "lucide-react-native";
import { bio, font } from "@/constants/biomecanica";
import { BioTabBar } from "@/components/biomecanica/BioTabBar";
import { biomechanicsApi, type BiomechanicsProtocol } from "@/lib/api/biomechanics";

type Region = "knee" | "gait" | "shoulder" | "trunk";

const REGION: Record<Region, { tint: string; stroke: string; badgeBg: string; badgeFg: string; label: string }> = {
  knee: { tint: "hsl(211, 55%, 93%)", stroke: "hsl(211, 50%, 45%)", badgeBg: "hsl(211, 100%, 93%)", badgeFg: "hsl(211, 100%, 38%)", label: "JOELHO" },
  gait: { tint: "hsl(264, 47%, 93%)", stroke: "hsl(264, 45%, 50%)", badgeBg: "hsl(264, 60%, 93%)", badgeFg: "hsl(264, 50%, 45%)", label: "MARCHA" },
  shoulder: { tint: "hsl(28, 77%, 93%)", stroke: "hsl(28, 70%, 48%)", badgeBg: "hsl(28, 92%, 92%)", badgeFg: "hsl(25, 70%, 38%)", label: "OMBRO" },
  trunk: { tint: "hsl(158, 47%, 92%)", stroke: "hsl(158, 45%, 38%)", badgeBg: "hsl(158, 60%, 92%)", badgeFg: "hsl(158, 55%, 30%)", label: "POSTURA" },
};

const TESTS = [
  { id: "squat", name: "Agachamento", region: "knee" as Region, views: ["SAGITAL", "FRONTAL"], desc: "ROM de flexão, valgo dinâmico e inclinação de tronco na descida.", metrics: ["ROM joelho", "Valgo", "Tronco"], meta: [{ icon: Clock, t: "~2 min" }, { icon: Repeat, t: "5 reps" }] },
  { id: "gait", name: "Análise de marcha", region: "gait" as Region, views: ["SAGITAL"], desc: "Cadência, comprimento de passada, simetria e tempo de apoio.", metrics: ["Cadência", "Simetria", "Fase apoio"], meta: [{ icon: Clock, t: "~3 min" }, { icon: Ruler, t: "6 m" }] },
  { id: "stepdown", name: "Step-down", region: "knee" as Region, views: ["FRONTAL"], desc: "Controle pélvico (Trendelenburg) e valgo em descida unipodal.", metrics: ["Queda pélvica", "Valgo"], meta: [{ icon: Clock, t: "~2 min" }, { icon: Repeat, t: "5 reps" }] },
  { id: "cmj", name: "Salto vertical (CMJ)", region: "knee" as Region, views: ["FRONTAL", "SAGITAL"], desc: "Altura, simetria de impulsão e absorção na aterrissagem (LSI).", metrics: ["Altura", "LSI", "Aterrissagem"], meta: [{ icon: Clock, t: "~2 min" }, { icon: Repeat, t: "3 reps" }] },
  { id: "shoulder", name: "Elevação de ombro", region: "shoulder" as Region, views: ["FRONTAL"], desc: "ROM de flexão/abdução glenoumeral e ritmo escapuloumeral.", metrics: ["ROM ombro", "Ritmo escapular"], meta: [{ icon: Clock, t: "~2 min" }, { icon: Repeat, t: "3 reps" }] },
  { id: "posture", name: "Avaliação postural", region: "trunk" as Region, views: ["FRONTAL", "SAGITAL"], desc: "Alinhamento de cabeça, ombros, pelve e joelhos sobre o prumo.", metrics: ["Alinhamento", "Assimetrias"], meta: [{ icon: Clock, t: "~3 min" }, { icon: Camera, t: "foto" }] },
];

const FILTERS = [
  { label: "Todos", dot: null },
  { label: "Joelho", dot: "hsl(211, 70%, 50%)" },
  { label: "Marcha", dot: "hsl(264, 50%, 55%)" },
  { label: "Ombro", dot: "hsl(28, 75%, 50%)" },
  { label: "Tronco/Postura", dot: "hsl(158, 50%, 42%)" },
];

function TestFigure({ region }: { region: Region }) {
  const c = REGION[region].stroke;
  return (
    <Svg width={58} height={96} viewBox="0 0 120 200" fill="none" stroke={c} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="60" cy="28" r="11" fill={c} />
      <Path d="M60 39 L60 110" />
      <Path d="M60 110 L48 165" />
      <Path d="M60 110 L72 165" />
      <Path d="M58 58 L42 92" />
      <Path d="M62 58 L82 92" />
      {region === "trunk" && <Line x1="60" y1="10" x2="60" y2="185" stroke="hsl(158, 45%, 60%)" strokeWidth={1.5} strokeDasharray="4 4" />}
    </Svg>
  );
}

export default function TestsScreen() {
  const router = useRouter();
  const [sel, setSel] = useState("Todos");
  const [protocols, setProtocols] = useState<BiomechanicsProtocol[]>([]);

  useEffect(() => {
    let mounted = true;
    biomechanicsApi
      .listProtocols()
      .then((response) => {
        if (mounted) setProtocols(response.data ?? []);
      })
      .catch(() => {
        if (mounted) setProtocols([]);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const visibleTests = protocols.length
    ? protocols.map((protocol) => {
        const region: Region =
          protocol.category === "corrida" || protocol.category === "marcha"
            ? "gait"
            : protocol.category === "postura"
              ? "trunk"
              : "knee";
        const requirements = protocol.captureRequirements ?? {};
        const metrics = Array.isArray(protocol.metricDefinitions)
          ? protocol.metricDefinitions.slice(0, 3).map((metric: any) => String(metric.key ?? metric.label ?? "Métrica"))
          : ["ROM", "Simetria"];
        return {
          id: protocol.id,
          name: protocol.name,
          region,
          views: Array.isArray(requirements.views)
            ? requirements.views.map((view: string) => view.toUpperCase())
            : ["SAGITAL"],
          desc: protocol.description ?? "Protocolo biomecânico padronizado.",
          metrics,
          meta: [
            { icon: Clock, t: requirements.minDurationMs ? `~${Math.ceil(Number(requirements.minDurationMs) / 1000)}s` : "~2 min" },
            { icon: Repeat, t: requirements.attempts ? `${requirements.attempts} tent.` : "2 tent." },
          ],
          protocol,
        };
      })
    : TESTS.map((test) => ({ ...test, protocol: null }));

  return (
    <View style={styles.root}>
      <SafeAreaView edges={["top"]} style={{ backgroundColor: bio.bg }}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.h1}>Biblioteca de Testes</Text>
              <Text style={styles.sub}>12 protocolos · padronizados</Text>
            </View>
            <Pressable style={styles.add} hitSlop={6}>
              <Plus size={20} color="#fff" strokeWidth={2.4} />
            </Pressable>
          </View>
          <View style={styles.searchBox}>
            <Search size={17} color={bio.muted} strokeWidth={2} />
            <TextInput placeholder="Buscar teste…" placeholderTextColor={bio.muted} style={styles.searchInput} />
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {FILTERS.map((f) => {
            const active = f.label === sel;
            return (
              <Pressable key={f.label} onPress={() => setSel(f.label)} style={[styles.chip, active && styles.chipSel]}>
                {!active && f.dot ? <View style={[styles.chipDot, { backgroundColor: f.dot }]} /> : null}
                <Text style={[styles.chipText, active && { color: "#fff" }]}>{f.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </SafeAreaView>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.secTitle}>Mais usados</Text>
        {visibleTests.map((t) => {
          const r = REGION[t.region];
          return (
            <Pressable
              key={t.id}
              style={styles.test}
              onPress={() =>
                router.push(
                  `/biomecanica/capture?protocolId=${encodeURIComponent(t.protocol?.id ?? "")}&protocolName=${encodeURIComponent(t.name)}` as never,
                )
              }
            >
              <View style={[styles.vis, { backgroundColor: r.tint }]}>
                <TestFigure region={t.region} />
                <View style={styles.views}>
                  {t.views.map((v) => (
                    <View key={v} style={styles.viewTag}>
                      <Text style={styles.viewTagText}>{v}</Text>
                    </View>
                  ))}
                </View>
              </View>
              <View style={styles.tbody}>
                <View style={styles.row1}>
                  <Text style={styles.tnm}>{t.name}</Text>
                  <View style={[styles.badge, { backgroundColor: r.badgeBg }]}>
                    <Text style={[styles.badgeText, { color: r.badgeFg }]}>{r.label}</Text>
                  </View>
                </View>
                <Text style={styles.ds}>{t.desc}</Text>
                <View style={styles.metrics}>
                  {t.metrics.map((m) => (
                    <View key={m} style={styles.mtag}>
                      <Text style={styles.mtagText}>{m}</Text>
                    </View>
                  ))}
                </View>
                <View style={styles.foot}>
                  {t.meta.map((m, i) => (
                    <View key={i} style={styles.meta}>
                      <m.icon size={12} color={bio.muted} strokeWidth={2.2} />
                      <Text style={styles.metaText}>{m.t}</Text>
                    </View>
                  ))}
                  <View style={styles.goRow}>
                    <Text style={styles.goText}>Iniciar</Text>
                    <ArrowRight size={13} color={bio.primary} strokeWidth={2.5} />
                  </View>
                </View>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      <BioTabBar active="testes" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: bio.bg },
  header: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 12 },
  headerTop: { flexDirection: "row", alignItems: "center" },
  h1: { fontSize: 22, fontFamily: font.extrabold, letterSpacing: -0.5, color: bio.fg },
  sub: { fontSize: 12, fontFamily: font.semibold, color: bio.muted, marginTop: 2 },
  add: { width: 42, height: 42, borderRadius: 13, backgroundColor: bio.primary, alignItems: "center", justifyContent: "center" },
  searchBox: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14, backgroundColor: "#EEF1F5", marginTop: 14 },
  searchInput: { flex: 1, fontFamily: font.semibold, fontSize: 14, color: bio.fg, padding: 0 },
  filters: { gap: 8, paddingHorizontal: 20, paddingTop: 4, paddingBottom: 4 },
  chip: { flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: bio.border, backgroundColor: bio.card },
  chipSel: { backgroundColor: bio.primary, borderColor: bio.primary },
  chipDot: { width: 8, height: 8, borderRadius: 4 },
  chipText: { fontSize: 12, fontFamily: font.bold, color: bio.muted },

  scroll: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 24, gap: 12 },
  secTitle: { fontSize: 11, fontFamily: font.extrabold, letterSpacing: 0.6, textTransform: "uppercase", color: bio.muted },
  test: { flexDirection: "row", backgroundColor: bio.card, borderWidth: 1, borderColor: bio.border, borderRadius: 16, overflow: "hidden" },
  vis: { width: 104, alignItems: "center", justifyContent: "center" },
  views: { position: "absolute", bottom: 7, left: 7, flexDirection: "row", gap: 4 },
  viewTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, backgroundColor: "rgba(255,255,255,0.88)" },
  viewTagText: { fontSize: 8, fontFamily: font.extrabold, color: "hsl(224, 40%, 35%)" },
  tbody: { flex: 1, minWidth: 0, paddingHorizontal: 14, paddingVertical: 13 },
  row1: { flexDirection: "row", alignItems: "center", gap: 8 },
  tnm: { fontSize: 15, fontFamily: font.extrabold, letterSpacing: -0.1, color: bio.fg, flexShrink: 1 },
  badge: { marginLeft: "auto", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  badgeText: { fontSize: 8, fontFamily: font.extrabold, letterSpacing: 0.4 },
  ds: { fontSize: 11, fontFamily: font.semibold, color: bio.muted, lineHeight: 15.4, marginTop: 4 },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 9 },
  mtag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7, backgroundColor: "#EEF1F5" },
  mtagText: { fontSize: 10, fontFamily: font.bold, color: bio.fg },
  foot: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 10 },
  meta: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 10, fontFamily: font.bold, color: bio.muted },
  goRow: { marginLeft: "auto", flexDirection: "row", alignItems: "center", gap: 4 },
  goText: { fontSize: 11, fontFamily: font.extrabold, color: bio.primary },
});
