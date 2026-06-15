import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  type DimensionValue,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import Svg, { Circle, Path, Ellipse } from "react-native-svg";
import {
  ChevronLeft,
  FileText,
  ChevronDown,
  Play,
  AlertTriangle,
  TrendingUp,
} from "lucide-react-native";
import { bio, font } from "@/constants/biomecanica";
import { biomechanicsApi, type BiomechanicsComparison } from "@/lib/api/biomechanics";
import { differenceInWeeks } from "date-fns";

type JL = {
  text: string;
  tone: "primary" | "warn" | "crit" | "ok" | "mute";
  top: DimensionValue;
  left: DimensionValue;
  alert?: boolean;
};

const PANELS = {
  antes: {
    tag: "17 MAR",
    tagTone: "before" as const,
    pain: "Dor 6/10",
    painTone: "high" as const,
    tc: "00:04.21 / 00:11.40",
    bg: "#181F2A",
    stroke: "#94A3B8",
    labels: [
      { text: "Tronco 48°", tone: "warn", top: "34%", left: "8%", alert: true },
      { text: "Joelho 78°", tone: "crit", top: "58%", left: "10%", alert: true },
      { text: "Valgo +18°", tone: "warn", top: "62%", left: "58%" },
      { text: "Tornozelo 18°", tone: "mute", top: "80%", left: "56%" },
    ] as JL[],
    readouts: [
      { l: "ROM", v: "78°", tone: "crit" },
      { l: "Tronco", v: "48°", tone: "warn" },
      { l: "Valgo", v: "+18°", tone: "crit" },
      { l: "Simet.", v: "71%", tone: "warn" },
    ],
  },
  depois: {
    tag: "02 JUN",
    tagTone: "after" as const,
    pain: "Dor 3/10",
    painTone: "mid" as const,
    tc: "00:04.21 / 00:10.05",
    bg: "#0F1420",
    stroke: "#CBD5E1",
    labels: [
      { text: "Tronco 32°", tone: "primary", top: "16%", left: "52%" },
      { text: "Joelho 92°", tone: "ok", top: "60%", left: "8%" },
      { text: "Valgo +14°", tone: "warn", top: "62%", left: "58%" },
      { text: "Tornozelo 24°", tone: "ok", top: "80%", left: "58%" },
    ] as JL[],
    readouts: [
      { l: "ROM", v: "118°", tone: "ok" },
      { l: "Tronco", v: "32°", tone: "ok" },
      { l: "Valgo", v: "+14°", tone: "warn" },
      { l: "Simet.", v: "84%", tone: "ok" },
    ],
  },
};

const VARIATION = [
  { name: "ROM joelho", sub: "flexão", s03: "78°", s12: "118°", change: "+40°", up: true },
  { name: "Tronco", sub: "menor = melhor", s03: "48°", s12: "32°", change: "−16°", up: true },
  { name: "Valgo (D)", sub: "menor = melhor", s03: "+18°", s12: "+14°", change: "−4°", up: false },
  { name: "Simetria L/R", sub: "carga", s03: "71%", s12: "84%", change: "+13", up: true },
  { name: "Dorsiflexão (D)", sub: "tornozelo", s03: "18°", s12: "24°", change: "+6°", up: true },
  { name: "Dor (VAS)", sub: "pico", s03: "6", s12: "3", change: "−3", up: true },
];

const JL_BG: Record<JL["tone"], string> = {
  primary: bio.primary,
  warn: "hsl(45,93%,50%)",
  crit: "hsl(0,72%,50%)",
  ok: "hsl(158,64%,42%)",
  mute: "rgba(255,255,255,0.2)",
};
const JL_FG: Record<JL["tone"], string> = {
  primary: "#fff",
  warn: "hsl(35,70%,18%)",
  crit: "#fff",
  ok: "#fff",
  mute: "#fff",
};
const RO_COLOR: Record<string, string> = {
  crit: "hsl(0,72%,45%)",
  warn: "hsl(35,92%,38%)",
  ok: "hsl(158,64%,30%)",
};

function formatMetricValue(value: number | null, unit: string) {
  if (value == null) return "-";
  if (unit === "%") return `${Math.round(value)}%`;
  if (unit === "deg") return `${Math.round(value)}°`;
  if (unit === "/10") return `${value}/10`;
  return `${value}${unit ? ` ${unit}` : ""}`;
}

function formatMetricDelta(delta: number | null, unit: string) {
  if (delta == null) return "novo";
  const rounded = Math.abs(delta) >= 10 ? delta.toFixed(0) : delta.toFixed(1);
  const sign = delta > 0 ? "+" : "";
  if (unit === "deg") return `${sign}${rounded}°`;
  if (unit === "%") return `${sign}${rounded} p.p.`;
  return `${sign}${rounded}`;
}

function Panel({ which }: { which: "antes" | "depois" }) {
  const p = PANELS[which];
  return (
    <View>
      <View style={styles.vidHead}>
        <View
          style={[styles.vidTag, p.tagTone === "after" ? styles.vidTagAfter : styles.vidTagBefore]}
        >
          <Text
            style={[
              styles.vidTagText,
              { color: p.tagTone === "after" ? bio.primary : "hsl(220,39%,25%)" },
            ]}
          >
            {p.tag}
          </Text>
        </View>
        <Text style={styles.vidMeta}>Tentativa 3/5</Text>
        <View style={[styles.pain, p.painTone === "high" ? styles.painHigh : styles.painMid]}>
          <Text
            style={[
              styles.painText,
              { color: p.painTone === "high" ? "hsl(0,70%,35%)" : "hsl(25,70%,30%)" },
            ]}
          >
            {p.pain}
          </Text>
        </View>
      </View>

      <View style={[styles.video, { backgroundColor: p.bg }]}>
        <View style={styles.athlete}>
          <Svg
            width={120}
            height={234}
            viewBox="0 0 200 400"
            fill="none"
            stroke={p.stroke}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <Circle cx="100" cy="40" r="18" fill={p.stroke} />
            <Path d="M100 60 Q105 95 115 130 Q120 155 118 175" />
            <Ellipse cx="118" cy="180" rx="14" ry="9" fill={p.stroke} />
            <Path d="M118 185 Q105 220 80 240" />
            <Path d="M80 240 Q90 280 110 320" />
            <Path d="M108 320 Q115 335 135 332" strokeWidth={6} />
            <Path d="M105 100 Q140 110 160 95" />
          </Svg>
        </View>
        {p.labels.map((l, i) => (
          <View
            key={i}
            style={[styles.jl, { backgroundColor: JL_BG[l.tone], top: l.top, left: l.left }]}
          >
            {l.alert && <AlertTriangle size={11} color={JL_FG[l.tone]} strokeWidth={2.4} />}
            <Text style={[styles.jlText, { color: JL_FG[l.tone] }]}>{l.text}</Text>
          </View>
        ))}
        <View style={styles.vctl}>
          <Pressable style={styles.play}>
            <Play size={17} color={bio.primary} strokeWidth={2.4} />
          </Pressable>
          <Text style={styles.tc}>{p.tc}</Text>
          <View style={styles.scrubber}>
            <View style={styles.scrubFill} />
          </View>
        </View>
      </View>

      <View style={styles.readouts}>
        {p.readouts.map((r) => (
          <View key={r.l} style={styles.ro}>
            <Text style={styles.roL}>{r.l}</Text>
            <Text style={[styles.roV, RO_COLOR[r.tone] && { color: RO_COLOR[r.tone] }]}>{r.v}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function ComparisonScreen() {
  const router = useRouter();
  const { patientId, patientName, fromAssessmentId, toAssessmentId, type } = useLocalSearchParams<{
    patientId?: string;
    patientName?: string;
    fromAssessmentId?: string;
    toAssessmentId?: string;
    type?: string;
  }>();
  const [tab, setTab] = useState<"antes" | "depois">("depois");
  const [viewMode, setViewMode] = useState<"side-by-side" | "ghost">("ghost");
  const [comparison, setComparison] = useState<BiomechanicsComparison | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!patientId) return;

    let mounted = true;
    setLoading(true);
    biomechanicsApi
      .getComparison(patientId, { fromAssessmentId, toAssessmentId, type })
      .then((response) => {
        if (mounted) setComparison(response.data);
      })
      .catch(() => {
        if (mounted) setComparison(null);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [fromAssessmentId, patientId, toAssessmentId, type]);

  const variation = useMemo(() => {
    if (!comparison?.metrics?.length) return VARIATION;
    return comparison.metrics.map((metric) => ({
      name: metric.label,
      sub: metric.lowerIsBetter ? "menor = melhor" : "maior = melhor",
      s03: formatMetricValue(metric.fromValue, metric.unit),
      s12: formatMetricValue(metric.toValue, metric.unit),
      change: formatMetricDelta(metric.delta, metric.unit),
      up: metric.direction !== "worse",
    }));
  }, [comparison]);

  const reportParams = {
    assessmentId: comparison?.to.id ?? toAssessmentId,
    patientId,
    patientName,
    comparisonAssessmentId: comparison?.from?.id ?? fromAssessmentId,
  };

  const intervalWeeks = useMemo(() => {
    if (!comparison?.from?.date || !comparison?.to?.date) return 8;
    return differenceInWeeks(new Date(comparison.to.date), new Date(comparison.from.date));
  }, [comparison]);

  return (
    <View style={styles.root}>
      <SafeAreaView edges={["top"]} style={{ backgroundColor: bio.bg }}>
        <View style={styles.appbar}>
          <Pressable style={styles.roundBtn} onPress={() => router.back()} hitSlop={6}>
            <ChevronLeft size={18} color={bio.fg} strokeWidth={2.2} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.tn}>Comparar sessões</Text>
            <Text style={styles.ts}>
              {patientName || "Paciente"} · {type || comparison?.to.type || "biomecanica"}
            </Text>
          </View>
          <Pressable
            style={styles.roundBtn}
            onPress={() =>
              router.push({
                pathname: "/biomecanica/report",
                params: reportParams,
              } as never)
            }
            hitSlop={6}
          >
            <FileText size={18} color={bio.fg} strokeWidth={2.2} />
          </Pressable>
        </View>

        {/* session selectors */}
        <View style={styles.sessions}>
          <Pressable style={[styles.sessCard, styles.sessBefore]}>
            <Text style={styles.sessL}>Antes · S03</Text>
            <View style={styles.sessV}>
              <Text style={styles.sessVText}>{comparison?.from?.label ?? "17 mar"}</Text>
              <ChevronDown size={15} color={bio.muted} strokeWidth={2.2} />
            </View>
            <Text style={styles.sessSub}>Avaliação inicial</Text>
          </Pressable>
          <View style={styles.sessGap}>
            <Text style={styles.vs}>VS</Text>
            <Text style={styles.wk}>{intervalWeeks} sem</Text>
          </View>
          <Pressable style={[styles.sessCard, styles.sessAfter]}>
            <Text style={styles.sessL}>Depois · S12</Text>
            <View style={styles.sessV}>
              <Text style={styles.sessVText}>{comparison?.to.label ?? "02 jun"}</Text>
              <ChevronDown size={15} color={bio.muted} strokeWidth={2.2} />
            </View>
            <Text style={styles.sessSub}>Reavaliação</Text>
          </Pressable>
        </View>

        {/* view mode toggle */}
        <View style={styles.tabs}>
          <Pressable
            onPress={() => setViewMode("ghost")}
            style={[styles.tab, viewMode === "ghost" && styles.tabSel]}
          >
            <Text style={[styles.tabText, viewMode === "ghost" && { color: bio.primary }]}>
              Ghost Mode (Overlay)
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setViewMode("side-by-side")}
            style={[styles.tab, viewMode === "side-by-side" && styles.tabSel]}
          >
            <Text style={[styles.tabText, viewMode === "side-by-side" && { color: bio.primary }]}>
              Lado a Lado
            </Text>
          </Pressable>
        </View>

        {/* mobile-only tabs for small screens when side-by-side isn't practical */}
        {viewMode === "ghost" && (
          <View style={[styles.tabs, { marginTop: 10, backgroundColor: "transparent" }]}>
            {(["antes", "depois"] as const).map((t) => {
              const sel = t === tab;
              return (
                <Pressable
                  key={t}
                  onPress={() => setTab(t)}
                  style={[styles.tab, sel && styles.tabSel]}
                >
                  <Text
                    style={[
                      styles.tabText,
                      sel && { color: t === "depois" ? bio.primary : bio.fg },
                    ]}
                  >
                    Foco: {t === "antes" ? "Antes" : "Depois"}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </SafeAreaView>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={bio.primary} />
            <Text style={styles.loadingText}>Carregando comparativo real...</Text>
          </View>
        ) : null}

        {viewMode === "ghost" ? (
          <View style={styles.ghostContainer}>
            {/* Base video (Before) with lower opacity */}
            <View style={[styles.ghostLayer, { opacity: tab === "antes" ? 1 : 0.4 }]}>
              <Panel which="antes" />
            </View>
            {/* Top video (After) */}
            <View
              style={[styles.ghostLayer, { opacity: tab === "depois" ? 1 : 0.6 }]}
              pointerEvents={tab === "depois" ? "auto" : "none"}
            >
              <Panel which="depois" />
            </View>
          </View>
        ) : (
          <View style={styles.sideBySideContainer}>
            <View style={styles.sidePanel}>
              <Panel which="antes" />
            </View>
            <View style={styles.sidePanel}>
              <Panel which="depois" />
            </View>
          </View>
        )}

        <Text style={styles.blockLabel}>Variação em {intervalWeeks} semanas</Text>
        <View style={styles.verdict}>
          <View style={styles.vh}>
            <TrendingUp size={14} color="hsl(158,64%,22%)" strokeWidth={2.4} />
            <Text style={styles.vhText}>Evolução positiva geral</Text>
          </View>
          <Text style={styles.vp}>
            Ganho expressivo de ROM e redução de dor. Persiste valgo dinâmico moderado à direita —
            manter fortalecimento de glúteo médio.
          </Text>
        </View>

        <View style={styles.varTable}>
          <View style={[styles.varRow, styles.varHead]}>
            <Text style={[styles.vc, styles.vcHead, { flex: 1, textAlign: "left" }]}>Métrica</Text>
            <Text style={[styles.vc, styles.vcHead, styles.vcNum]}>S03</Text>
            <Text style={[styles.vc, styles.vcHead, styles.vcNum]}>S12</Text>
            <Text style={[styles.vc, styles.vcHead, styles.vcChange]}>Δ</Text>
          </View>
          {variation.map((r, i) => (
            <View key={`${r.name}-${i}`} style={[styles.varRow, i > 0 && styles.varBorder]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.vName}>{r.name}</Text>
                <Text style={styles.vSub}>{r.sub}</Text>
              </View>
              <Text style={[styles.vc, styles.vcNum, { color: "hsl(220,9%,50%)" }]}>{r.s03}</Text>
              <Text style={[styles.vc, styles.vcNum]}>{r.s12}</Text>
              <View style={styles.vcChange}>
                <Text style={[styles.change, r.up ? styles.changeUp : styles.changeWarn]}>
                  {r.change}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: bio.bg },
  appbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 12,
  },
  roundBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: bio.card,
    borderWidth: 1,
    borderColor: bio.border,
    alignItems: "center",
    justifyContent: "center",
  },
  tn: { fontSize: 15, fontFamily: font.extrabold, letterSpacing: -0.2, color: bio.fg },
  ts: { fontSize: 11, fontFamily: font.semibold, color: bio.muted, marginTop: 1 },

  sessions: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 9,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  sessCard: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: bio.border,
    backgroundColor: bio.card,
  },
  sessBefore: { borderLeftWidth: 3, borderLeftColor: "hsl(220,9%,60%)" },
  sessAfter: { borderLeftWidth: 3, borderLeftColor: bio.primary },
  sessL: {
    fontSize: 9,
    fontFamily: font.extrabold,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: bio.muted,
  },
  sessV: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 3,
  },
  sessVText: { fontSize: 14, fontFamily: font.extrabold, color: bio.fg },
  sessSub: { fontSize: 10, fontFamily: font.semibold, color: bio.muted, marginTop: 1 },
  sessGap: { alignSelf: "center", alignItems: "center", gap: 3 },
  vs: { fontSize: 9, fontFamily: font.extrabold, letterSpacing: 0.7, color: bio.muted },
  wk: { fontSize: 9, fontFamily: font.extrabold, color: "hsl(158,64%,32%)" },

  tabs: {
    flexDirection: "row",
    gap: 4,
    marginHorizontal: 16,
    padding: 4,
    backgroundColor: "#EEF1F5",
    borderRadius: 13,
  },
  tab: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 10 },
  tabSel: {
    backgroundColor: bio.card,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  tabText: { fontSize: 13, fontFamily: font.extrabold, color: bio.muted },

  ghostContainer: {
    position: "relative",
    height: 360,
    marginBottom: 24,
    borderRadius: 16,
    overflow: "hidden",
  },
  ghostLayer: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 1 },
  sideBySideContainer: { flexDirection: "row", gap: 8, marginBottom: 24 },
  sidePanel: { flex: 1, minWidth: 150 },

  scroll: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 24 },
  loading: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10 },
  loadingText: { fontSize: 12, fontFamily: font.bold, color: bio.muted },
  vidHead: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  vidTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  vidTagBefore: { backgroundColor: "hsl(220,14%,90%)" },
  vidTagAfter: { backgroundColor: "hsl(211,100%,93%)" },
  vidTagText: { fontSize: 10, fontFamily: font.extrabold, letterSpacing: 0.5 },
  vidMeta: { fontSize: 12, fontFamily: font.bold, color: bio.fg },
  pain: { marginLeft: "auto", paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
  painHigh: { backgroundColor: "hsl(0,84%,95%)" },
  painMid: { backgroundColor: "hsl(28,92%,95%)" },
  painText: { fontSize: 11, fontFamily: font.extrabold },

  video: {
    position: "relative",
    height: 300,
    borderRadius: 16,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  athlete: {},
  jl: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 7,
  },
  jlText: { fontSize: 10, fontFamily: font.extrabold },
  vctl: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "rgba(0,0,0,0.55)",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  play: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  tc: { fontSize: 11, fontFamily: font.bold, color: "#fff" },
  scrubber: { flex: 1, height: 4, backgroundColor: "rgba(255,255,255,0.25)", borderRadius: 999 },
  scrubFill: { width: "42%", height: "100%", backgroundColor: "#fff", borderRadius: 999 },

  readouts: { flexDirection: "row", gap: 8, marginTop: 12 },
  ro: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 10,
    backgroundColor: bio.card,
    borderWidth: 1,
    borderColor: bio.border,
    borderRadius: 12,
  },
  roL: {
    fontSize: 9,
    fontFamily: font.extrabold,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: bio.muted,
  },
  roV: {
    fontSize: 18,
    fontFamily: font.extrabold,
    letterSpacing: -0.4,
    marginTop: 3,
    color: bio.fg,
  },

  blockLabel: {
    fontSize: 11,
    fontFamily: font.extrabold,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: bio.muted,
    marginTop: 22,
    marginBottom: 10,
  },
  verdict: {
    padding: 13,
    borderRadius: 13,
    backgroundColor: "hsl(158,64%,96%)",
    borderWidth: 1,
    borderColor: "hsl(158,50%,80%)",
    marginBottom: 18,
  },
  vh: { flexDirection: "row", alignItems: "center", gap: 6 },
  vhText: { fontSize: 12, fontFamily: font.extrabold, color: "hsl(158,64%,22%)" },
  vp: {
    fontSize: 12,
    lineHeight: 18,
    color: "hsl(158,64%,18%)",
    marginTop: 6,
    fontFamily: font.medium,
  },

  varTable: { borderWidth: 1, borderColor: bio.border, borderRadius: 14, overflow: "hidden" },
  varRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  varHead: { backgroundColor: "#F1F3F6" },
  varBorder: { borderTopWidth: 1, borderTopColor: bio.borderSoft },
  vc: { fontSize: 13, fontFamily: font.bold, color: bio.fg, textAlign: "right" },
  vcHead: {
    fontSize: 9,
    fontFamily: font.extrabold,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: bio.muted,
  },
  vcNum: { width: 50 },
  vcChange: { width: 56, alignItems: "flex-end" },
  vName: { fontSize: 13, fontFamily: font.bold, color: bio.fg },
  vSub: { fontSize: 10, fontFamily: font.semibold, color: bio.muted, marginTop: 1 },
  change: {
    fontSize: 11,
    fontFamily: font.extrabold,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: "hidden",
  },
  changeUp: { backgroundColor: "hsl(158,64%,92%)", color: "hsl(158,64%,25%)" },
  changeWarn: { backgroundColor: "hsl(28,92%,92%)", color: "hsl(25,70%,32%)" },
});
