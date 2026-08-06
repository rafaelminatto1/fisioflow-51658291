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
import { deltaExplanation, interpretDelta } from "@fisioflow/core";
import { biomechanicsApi, type BiomechanicsComparison } from "@/lib/api/biomechanics";
import { differenceInWeeks } from "date-fns";

type JL = {
  text: string;
  tone: "primary" | "warn" | "crit" | "ok" | "mute";
  top: DimensionValue;
  left: DimensionValue;
  alert?: boolean;
};



type PanelData = {
  tag: string;
  tagTone: "before" | "after";
  pain: string;
  painTone: "high" | "mid" | "low";
  tc: string;
  bg: string;
  stroke: string;
  labels: JL[];
  readouts: Array<{ l: string; v: string; tone: string }>;
};

const PANEL_VAZIO: PanelData = {
  tag: "--",
  tagTone: "before",
  pain: "Dor --",
  painTone: "mid",
  tc: "--:-- / --:--",
  bg: "#181F2A",
  stroke: "#94A3B8",
  labels: [],
  readouts: [],
};

/** Monta o painel a partir das métricas reais daquela ponta da comparação. */
function buildPanel(
  side: "antes" | "depois",
  comparison: BiomechanicsComparison | null,
): PanelData {
  const ponta = side === "antes" ? comparison?.from : comparison?.to;
  if (!ponta) return { ...PANEL_VAZIO, tagTone: side === "antes" ? "before" : "after" };

  const valorDe = (chave: string): number | null => {
    const metrica = comparison?.metrics?.find((m) => m.key === chave);
    if (!metrica) return null;
    const v = side === "antes" ? metrica.fromValue : metrica.toValue;
    return typeof v === "number" ? v : null;
  };

  const fmt = (v: number | null, sufixo: string) => (v === null ? "--" : `${Math.round(v)}${sufixo}`);
  const dor = valorDe("pain");

  const readouts = [
    { l: "ROM", v: fmt(valorDe("knee_rom"), "°"), tone: "mute" },
    { l: "Tronco", v: fmt(valorDe("trunk_inclination"), "°"), tone: "mute" },
    { l: "Valgo", v: fmt(valorDe("dynamic_valgus"), "°"), tone: "mute" },
    { l: "Simet.", v: fmt(valorDe("symmetry"), "%"), tone: "mute" },
  ].filter((r) => r.v !== "--");

  return {
    tag: new Date(ponta.date)
      .toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
      .toUpperCase(),
    tagTone: side === "antes" ? "before" : "after",
    pain: dor === null ? "Dor --" : `Dor ${Math.round(dor)}/10`,
    painTone: dor === null ? "mid" : dor >= 6 ? "high" : dor >= 3 ? "mid" : "low",
    tc: "--:-- / --:--",
    bg: side === "antes" ? "#181F2A" : "#0F1420",
    stroke: side === "antes" ? "#94A3B8" : "#CBD5E1",
    labels: [],
    readouts,
  };
}

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

/**
 * Painel de uma das pontas da comparação.
 *
 * Recebia um objeto fixo com "Tronco 48°", "Dor 6/10" e a data "17 MAR"
 * renderizados SEMPRE, independentemente do paciente. Agora vem do endpoint
 * de comparação; sem dado, o painel se assume vazio em vez de mostrar os
 * números de outra pessoa.
 */
function Panel({ which, data }: { which: "antes" | "depois"; data: PanelData }) {
  const p = data;
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

  const panelAntes = useMemo(() => buildPanel("antes", comparison), [comparison]);
  const panelDepois = useMemo(() => buildPanel("depois", comparison), [comparison]);

  const variation = useMemo(() => {
    // Sem comparação real, tabela vazia — a tela mostra o estado de "ainda
    // não há duas avaliações para comparar".
    if (!comparison?.metrics?.length) return [];
    return comparison.metrics.map((metric) => {
      // A direção NÃO sai mais do sinal do delta.
      //
      // Antes, uma variação de 3° no FPPA aparecia como melhora — número menor
      // que o erro de medição do próprio método. `interpretDelta` compara com
      // a diferença mínima detectável publicada e devolve "sem mudança
      // detectável" quando o dado não sustenta afirmar direção.
      const leitura = interpretDelta(metric.key, metric.delta ?? Number.NaN);
      return {
        name: metric.label,
        sub: metric.lowerIsBetter ? "menor = melhor" : "maior = melhor",
        s03: formatMetricValue(metric.fromValue, metric.unit),
        s12: formatMetricValue(metric.toValue, metric.unit),
        change:
          leitura === "sem_mudanca_detectavel"
            ? "sem mudança"
            : formatMetricDelta(metric.delta, metric.unit),
        leitura,
        explicacao: deltaExplanation(metric.key, metric.delta ?? Number.NaN),
      };
    });
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
              <Panel which="antes" data={panelAntes} />
            </View>
            {/* Top video (After) */}
            <View
              style={[styles.ghostLayer, { opacity: tab === "depois" ? 1 : 0.6 }]}
              pointerEvents={tab === "depois" ? "auto" : "none"}
            >
              <Panel which="depois" data={panelDepois} />
            </View>
          </View>
        ) : (
          <View style={styles.sideBySideContainer}>
            <View style={styles.sidePanel}>
              <Panel which="antes" data={panelAntes} />
            </View>
            <View style={styles.sidePanel}>
              <Panel which="depois" data={panelDepois} />
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
                <Text
                  style={[
                    styles.change,
                    r.leitura === "melhora" && styles.changeUp,
                    r.leitura === "piora" && styles.changeWarn,
                    r.leitura === "sem_mudanca_detectavel" && styles.changeNeutro,
                    r.leitura === "indeterminado" && styles.changeNeutro,
                  ]}
                >
                  {r.change}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {variation.some((r) => r.leitura === "sem_mudanca_detectavel") ? (
          <View style={styles.mdcNota}>
            <Text style={styles.mdcNotaTitulo}>Sobre &quot;sem mudança&quot;</Text>
            <Text style={styles.mdcNotaTexto}>
              A variação medida ficou abaixo da diferença mínima detectável do método, ou
              seja, não é possível distingui-la do erro de medição. Isso não significa que o
              paciente não evoluiu — significa que esta medida não consegue demonstrar.
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: bio.bg },
  changeNeutro: { color: bio.muted },
  mdcNota: {
    marginTop: 14,
    marginHorizontal: 14,
    padding: 14,
    borderRadius: 16,
    backgroundColor: bio.card,
    borderWidth: 1,
    borderColor: bio.border,
    gap: 6,
  },
  mdcNotaTitulo: { fontFamily: font.semibold, fontSize: 13, color: bio.fg },
  mdcNotaTexto: { fontFamily: font.regular, fontSize: 12, lineHeight: 18, color: bio.muted },
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
