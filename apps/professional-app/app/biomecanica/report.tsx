import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import Svg, { Circle, Path } from "react-native-svg";
import {
  Activity,
  ChevronLeft,
  Download,
  FileCheck2,
  Pencil,
  Share2,
  ShieldCheck,
  TrendingUp,
} from "lucide-react-native";
import { bio, font } from "@/constants/biomecanica";
import {
  biomechanicsApi,
  type BiomechanicsAssessment,
  type BiomechanicsComparison,
  type BiomechanicsComparisonMetric,
  type BiomechanicsPdfResult,
} from "@/lib/api/biomechanics";
import { getOrGenerateCloudPDF, shareCloudPDF } from "@/lib/services/cloudPdfService";

const DEMO_METRICS: BiomechanicsComparisonMetric[] = [
  {
    key: "knee_rom",
    label: "ROM joelho",
    unit: "deg",
    fromValue: 78,
    toValue: 118,
    delta: 40,
    direction: "improved",
    lowerIsBetter: false,
  },
  {
    key: "trunk_inclination",
    label: "Tronco",
    unit: "deg",
    fromValue: 48,
    toValue: 32,
    delta: -16,
    direction: "improved",
    lowerIsBetter: true,
  },
  {
    key: "dynamic_valgus",
    label: "Valgo dinâmico",
    unit: "deg",
    fromValue: 18,
    toValue: 14,
    delta: -4,
    direction: "improved",
    lowerIsBetter: true,
  },
  {
    key: "symmetry",
    label: "Simetria E/D",
    unit: "%",
    fromValue: 71,
    toValue: 84,
    delta: 13,
    direction: "improved",
    lowerIsBetter: false,
  },
  {
    key: "pain",
    label: "Dor EVA",
    unit: "/10",
    fromValue: 6,
    toValue: 3,
    delta: -3,
    direction: "improved",
    lowerIsBetter: true,
  },
];

function formatDate(value?: string | Date | null) {
  if (!value) return "Data nao informada";
  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatMetric(value: number | null, unit: string) {
  if (value == null) return "-";
  if (unit === "%") return `${Math.round(value)}%`;
  if (unit === "/10") return `${value}/10`;
  if (unit === "deg") return `${Math.round(value)}°`;
  return `${value}${unit ? ` ${unit}` : ""}`;
}

function formatDelta(metric: BiomechanicsComparisonMetric) {
  if (metric.delta == null) return "novo";
  const value = Math.abs(metric.delta) >= 10 ? metric.delta.toFixed(0) : metric.delta.toFixed(1);
  const sign = metric.delta > 0 ? "+" : "";
  if (metric.unit === "deg") return `${sign}${value}°`;
  if (metric.unit === "%") return `${sign}${value} p.p.`;
  return `${sign}${value}${metric.unit === "/10" ? "" : metric.unit}`;
}

function metricTone(metric: BiomechanicsComparisonMetric) {
  if (metric.direction === "improved") return styles.deltaUp;
  if (metric.direction === "worse") return styles.deltaWarn;
  return styles.deltaNeutral;
}

function SecHead({ n, title }: { n: number; title: string }) {
  return (
    <View style={styles.secHead}>
      <View style={styles.secNum}>
        <Text style={styles.secNumText}>{n}</Text>
      </View>
      <Text style={styles.secTitle}>{title}</Text>
    </View>
  );
}

function FramePreview({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "before" | "after";
}) {
  return (
    <View style={styles.frame}>
      <View style={[styles.frameImg, tone === "after" && styles.frameImgAfter]}>
        <Svg
          height={104}
          width={70}
          viewBox="0 0 100 200"
          fill="none"
          stroke={tone === "after" ? "#cbd5e1" : "#94a3b8"}
          strokeWidth={3}
        >
          <Circle cx="50" cy="22" r="9" fill={tone === "after" ? "#cbd5e1" : "#94a3b8"} />
          <Path d={tone === "after" ? "M50 31 L56 95 L40 125" : "M50 31 L62 95 L68 130"} />
          <Path d={tone === "after" ? "M56 95 Q40 130 55 160" : "M62 95 Q45 120 38 145"} />
        </Svg>
        <View style={[styles.ang, tone === "after" ? styles.angOk : styles.angWarn]}>
          <Text style={styles.angText}>{value}</Text>
        </View>
      </View>
      <Text style={styles.cap}>{label}</Text>
    </View>
  );
}

export default function ReportScreen() {
  const router = useRouter();
  const { assessmentId, patientId, patientName, comparisonAssessmentId } = useLocalSearchParams<{
    assessmentId?: string;
    patientId?: string;
    patientName?: string;
    comparisonAssessmentId?: string;
  }>();
  const [assessment, setAssessment] = useState<BiomechanicsAssessment | null>(null);
  const [comparison, setComparison] = useState<BiomechanicsComparison | null>(null);
  const [pdfResult, setPdfResult] = useState<BiomechanicsPdfResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    if (!assessmentId) return;

    let mounted = true;
    setLoading(true);
    biomechanicsApi
      .getById(assessmentId)
      .then((response) => {
        if (mounted) setAssessment(response.data);
      })
      .catch(() => {
        if (mounted) Alert.alert("Laudo indisponivel", "Nao foi possivel carregar a avaliacao.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [assessmentId]);

  const resolvedPatientId = patientId ?? assessment?.patientId;
  const resolvedPatientName =
    typeof patientName === "string" && patientName.trim()
      ? patientName
      : (assessment?.analysisData?.patientName ?? "Paciente");

  useEffect(() => {
    if (!resolvedPatientId) return;

    let mounted = true;
    biomechanicsApi
      .getComparison(resolvedPatientId, {
        toAssessmentId: assessmentId,
        fromAssessmentId: comparisonAssessmentId,
        type: assessment?.type,
      })
      .then((response) => {
        if (mounted) setComparison(response.data);
      })
      .catch(() => {
        if (mounted) setComparison(null);
      });

    return () => {
      mounted = false;
    };
  }, [assessmentId, assessment?.type, comparisonAssessmentId, resolvedPatientId]);

  const metrics = comparison?.metrics?.length ? comparison.metrics : DEMO_METRICS;
  const improvedCount = metrics.filter((metric) => metric.direction === "improved").length;
  const worseCount = metrics.filter((metric) => metric.direction === "worse").length;
  const mainMetric = metrics.find((metric) => metric.key.includes("knee")) ?? metrics[0];

  const rows = useMemo(
    () => [
      ["Paciente", resolvedPatientName],
      ["Avaliacao", comparison?.to.label ?? formatDate(assessment?.createdAt)],
      ["Comparado com", comparison?.from?.label ?? "Avaliacao anterior"],
      ["Teste", assessment?.type ?? "Agachamento / funcional"],
      ["Status", assessment?.status ?? "Concluido"],
      ["Responsavel", "Equipe FisioFlow"],
    ],
    [
      assessment?.createdAt,
      assessment?.status,
      assessment?.type,
      comparison?.from?.label,
      comparison?.to.label,
      resolvedPatientName,
    ],
  );

  const handleGeneratePdf = async (force = false) => {
    if (!assessment) {
      Alert.alert("Modo demonstrativo", "Abra um laudo real para gerar PDF na nuvem.");
      return null;
    }

    setPdfLoading(true);
    try {
      const result = await getOrGenerateCloudPDF({
        assessment,
        patient: { name: resolvedPatientName },
        comparisonAssessmentId,
        force,
      });
      setPdfResult(result);
      Alert.alert(
        result.generated ? "PDF gerado" : "PDF reutilizado",
        result.generated
          ? "Um novo laudo foi salvo na nuvem porque houve alteracao clinica."
          : "Nao houve alteracao. Reaproveitei o PDF que ja estava salvo na nuvem.",
      );
      return result;
    } catch (error: any) {
      Alert.alert("Erro ao gerar PDF", error?.message ?? "Tente novamente.");
      return null;
    } finally {
      setPdfLoading(false);
    }
  };

  const handleShare = async () => {
    const result = pdfResult ?? (await handleGeneratePdf(false));
    if (result?.pdfUrl) {
      await shareCloudPDF(result.pdfUrl);
    }
  };

  return (
    <View style={styles.root}>
      <SafeAreaView edges={["top"]} style={{ backgroundColor: bio.bg }}>
        <View style={styles.appbar}>
          <Pressable style={styles.roundBtn} onPress={() => router.back()} hitSlop={6}>
            <ChevronLeft size={18} color={bio.fg} strokeWidth={2.2} />
          </Pressable>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.tn}>Laudo biomecanico</Text>
            <Text style={styles.ts} numberOfLines={1}>
              {resolvedPatientName} · {comparison?.to.label ?? "comparativo"}
            </Text>
          </View>
          <Pressable style={styles.roundBtn} hitSlop={6}>
            <Pencil size={18} color={bio.fg} strokeWidth={2.2} />
          </Pressable>
        </View>
      </SafeAreaView>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={bio.primary} />
            <Text style={styles.loadingText}>Carregando avaliacao...</Text>
          </View>
        ) : null}

        <View style={styles.doc}>
          <View style={styles.docHead}>
            <View style={styles.logo}>
              <Activity size={22} color={bio.primary} strokeWidth={2.4} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.clinicName}>FisioFlow Biomecanica</Text>
              <Text style={styles.clinicX}>
                Laudo comparativo · goniometria · metricas funcionais{"\n"}
                PDF inteligente salvo em Cloudflare R2
              </Text>
            </View>
          </View>

          <View style={styles.banner}>
            <Text style={styles.bannerT}>LAUDO BIOMECANICO</Text>
            <Text style={styles.bannerS}>
              {comparison?.to.label ?? formatDate(assessment?.createdAt)}
            </Text>
          </View>

          <View style={styles.docBody}>
            <View style={styles.pinfo}>
              {rows.map(([k, v]) => (
                <View key={k} style={styles.pi}>
                  <Text style={styles.piK}>{k}</Text>
                  <Text style={styles.piV} numberOfLines={2}>
                    {v}
                  </Text>
                </View>
              ))}
            </View>

            <View style={styles.sec}>
              <SecHead n={1} title="Resumo executivo" />
              <View style={styles.verdict}>
                <View style={styles.vh}>
                  <TrendingUp size={14} color="hsl(158, 64%, 22%)" strokeWidth={2.4} />
                  <Text style={styles.vhText}>Comparacao entre datas</Text>
                </View>
                <Text style={styles.vp}>
                  {improvedCount} metricas mostram evolucao, {worseCount} exigem atencao e{" "}
                  {Math.max(metrics.length - improvedCount - worseCount, 0)} permanecem estaveis ou
                  sem comparativo.
                  {assessment?.conclusions ? ` Conduta registrada: ${assessment.conclusions}` : ""}
                </Text>
              </View>
            </View>

            <View style={styles.sec}>
              <SecHead n={2} title="Quadros da avaliacao" />
              <View style={styles.frames}>
                <FramePreview
                  tone="before"
                  label={comparison?.from?.label ?? "anterior"}
                  value={formatMetric(mainMetric.fromValue, mainMetric.unit)}
                />
                <FramePreview
                  tone="after"
                  label={comparison?.to.label ?? "atual"}
                  value={formatMetric(mainMetric.toValue, mainMetric.unit)}
                />
              </View>
            </View>

            <View style={styles.sec}>
              <SecHead n={3} title="Grafico de variacao" />
              <View style={styles.chartCard}>
                {metrics.slice(0, 6).map((metric) => {
                  const from = Math.abs(metric.fromValue ?? 0);
                  const to = Math.abs(metric.toValue);
                  const max = Math.max(from, to, 1);
                  return (
                    <View key={metric.key} style={styles.chartRow}>
                      <Text style={styles.chartLabel} numberOfLines={1}>
                        {metric.label}
                      </Text>
                      <View style={styles.bars}>
                        <View style={styles.barTrack}>
                          <View
                            style={[
                              styles.barBefore,
                              { width: `${Math.max((from / max) * 100, 6)}%` },
                            ]}
                          />
                        </View>
                        <View style={styles.barTrack}>
                          <View
                            style={[
                              styles.barAfter,
                              { width: `${Math.max((to / max) * 100, 6)}%` },
                            ]}
                          />
                        </View>
                      </View>
                    </View>
                  );
                })}
                <View style={styles.legend}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: "#94a3b8" }]} />
                    <Text style={styles.legendText}>Anterior</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: bio.primary }]} />
                    <Text style={styles.legendText}>Atual</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.sec}>
              <SecHead n={4} title="Tabela comparativa" />
              <View style={styles.mtable}>
                <View style={[styles.mrow, styles.mrowHead]}>
                  <Text style={[styles.mc, styles.mcHead, { flex: 1, textAlign: "left" }]}>
                    Metrica
                  </Text>
                  <Text style={[styles.mc, styles.mcHead, styles.mcNum]}>Ant.</Text>
                  <Text style={[styles.mc, styles.mcHead, styles.mcNum]}>Atual</Text>
                  <Text style={[styles.mc, styles.mcHead, styles.mcDelta]}>Delta</Text>
                </View>
                {metrics.map((metric, i) => (
                  <View
                    key={metric.key}
                    style={[styles.mrow, i < metrics.length - 1 && styles.mrowBorder]}
                  >
                    <Text style={[styles.mn, { flex: 1 }]}>{metric.label}</Text>
                    <Text style={[styles.mc, styles.mcNum]}>
                      {formatMetric(metric.fromValue, metric.unit)}
                    </Text>
                    <Text style={[styles.mc, styles.mcNum]}>
                      {formatMetric(metric.toValue, metric.unit)}
                    </Text>
                    <View style={styles.mcDelta}>
                      <Text style={[styles.delta, metricTone(metric)]}>{formatDelta(metric)}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.sec}>
              <SecHead n={5} title="Observacoes e assinatura" />
              <Text style={styles.p}>
                {assessment?.observations ||
                  "Sem observacoes clinicas registradas para esta avaliacao."}
              </Text>
              <View style={styles.sign}>
                <View style={styles.signed}>
                  <View style={styles.signBadge}>
                    <ShieldCheck size={19} color="hsl(158, 64%, 32%)" strokeWidth={2.2} />
                  </View>
                  <View>
                    <Text style={styles.signName}>Equipe FisioFlow</Text>
                    <Text style={styles.signReg}>Documento com rastreio de integridade</Text>
                  </View>
                </View>
                <Text style={styles.signWhen}>
                  {pdfResult?.cached
                    ? "PDF reaproveitado"
                    : pdfResult?.generated
                      ? "PDF atualizado"
                      : "PDF sob demanda"}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <SafeAreaView edges={["bottom"]} style={styles.actionbarWrap}>
        <View style={styles.actionbar}>
          <Pressable style={styles.btn} onPress={handleShare} disabled={pdfLoading}>
            <Share2 size={17} color={bio.fg} strokeWidth={2.2} />
            <Text style={styles.btnText}>Compartilhar</Text>
          </Pressable>
          {pdfResult?.pdfUrl ? (
            <Pressable style={styles.btn} onPress={() => Linking.openURL(pdfResult.pdfUrl)}>
              <FileCheck2 size={17} color={bio.fg} strokeWidth={2.2} />
              <Text style={styles.btnText}>Abrir nuvem</Text>
            </Pressable>
          ) : null}
          <Pressable
            style={[styles.btn, styles.btnPrimary]}
            onPress={() => handleGeneratePdf(false)}
            disabled={pdfLoading}
          >
            {pdfLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Download size={17} color="#fff" strokeWidth={2.2} />
            )}
            <Text style={[styles.btnText, { color: "#fff" }]}>Exportar PDF</Text>
          </Pressable>
        </View>
      </SafeAreaView>
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
    borderBottomWidth: 1,
    borderBottomColor: bio.border,
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
  tn: { fontSize: 15, fontFamily: font.extrabold, color: bio.fg },
  ts: { fontSize: 11, fontFamily: font.semibold, color: bio.muted, marginTop: 1 },
  scroll: { padding: 16, paddingBottom: 24 },
  loading: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12 },
  loadingText: { color: bio.muted, fontSize: 12, fontFamily: font.bold },
  doc: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: bio.border,
    borderRadius: 16,
    overflow: "hidden",
  },
  docHead: {
    padding: 18,
    paddingTop: 20,
    borderBottomWidth: 2,
    borderBottomColor: bio.primary,
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: bio.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  clinicName: { fontSize: 15, fontFamily: font.extrabold, color: "hsl(224, 71%, 20%)" },
  clinicX: {
    fontSize: 10,
    color: bio.muted,
    fontFamily: font.semibold,
    lineHeight: 14,
    marginTop: 2,
  },
  banner: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: "hsl(211, 100%, 96%)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: bio.border,
  },
  bannerT: { fontSize: 12, fontFamily: font.extrabold, letterSpacing: 0.5, color: bio.primary },
  bannerS: { fontSize: 10, fontFamily: font.bold, color: bio.muted },
  docBody: { padding: 18 },
  pinfo: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: bio.border,
    rowGap: 10,
  },
  pi: { width: "50%", paddingRight: 14 },
  piK: {
    fontSize: 9,
    fontFamily: font.extrabold,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: bio.muted,
  },
  piV: { fontSize: 13, fontFamily: font.bold, marginTop: 2, color: bio.fg },
  sec: { marginTop: 20 },
  secHead: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 9 },
  secNum: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: bio.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  secNumText: { color: "#fff", fontSize: 11, fontFamily: font.extrabold },
  secTitle: {
    fontSize: 12,
    fontFamily: font.extrabold,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: bio.primary,
  },
  p: { fontSize: 13, lineHeight: 20.8, color: "hsl(220, 20%, 25%)", fontFamily: font.medium },
  frames: { flexDirection: "row", gap: 10, marginTop: 12 },
  frame: { flex: 1, borderWidth: 1, borderColor: bio.border, borderRadius: 12, overflow: "hidden" },
  frameImg: {
    height: 130,
    backgroundColor: bio.videoBg,
    alignItems: "center",
    justifyContent: "center",
  },
  frameImgAfter: { backgroundColor: "hsl(218, 24%, 14%)" },
  ang: {
    position: "absolute",
    left: 8,
    bottom: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  angOk: { backgroundColor: "hsl(158, 64%, 42%)" },
  angWarn: { backgroundColor: "hsl(25, 72%, 48%)" },
  angText: { fontSize: 11, fontFamily: font.extrabold, color: "#fff" },
  cap: {
    fontSize: 10,
    fontFamily: font.bold,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: "#F1F3F6",
    color: bio.muted,
  },
  chartCard: { borderWidth: 1, borderColor: bio.border, borderRadius: 12, padding: 12, gap: 10 },
  chartRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  chartLabel: { width: 104, fontSize: 11, fontFamily: font.bold, color: bio.fg },
  bars: { flex: 1, gap: 4 },
  barTrack: { height: 8, borderRadius: 999, backgroundColor: "#EEF1F5", overflow: "hidden" },
  barBefore: { height: "100%", borderRadius: 999, backgroundColor: "#94a3b8" },
  barAfter: { height: "100%", borderRadius: 999, backgroundColor: bio.primary },
  legend: { flexDirection: "row", alignItems: "center", gap: 16, marginTop: 2 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 10, fontFamily: font.bold, color: bio.muted },
  mtable: {
    borderWidth: 1,
    borderColor: bio.border,
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 4,
  },
  mrow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10 },
  mrowHead: { backgroundColor: "#F1F3F6" },
  mrowBorder: { borderBottomWidth: 1, borderBottomColor: bio.borderSoft },
  mn: { fontSize: 12, fontFamily: font.bold, color: bio.fg },
  mc: { fontSize: 12, fontFamily: font.bold, color: bio.fg, textAlign: "right" },
  mcHead: {
    fontSize: 9,
    fontFamily: font.extrabold,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: bio.muted,
  },
  mcNum: { width: 54 },
  mcDelta: { width: 62, alignItems: "flex-end" },
  delta: {
    fontFamily: font.extrabold,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    fontSize: 11,
    overflow: "hidden",
  },
  deltaUp: { backgroundColor: "hsl(158, 64%, 92%)", color: "hsl(158, 64%, 25%)" },
  deltaWarn: { backgroundColor: "hsl(28, 92%, 92%)", color: "hsl(25, 70%, 32%)" },
  deltaNeutral: { backgroundColor: "#EEF1F5", color: bio.muted },
  verdict: {
    marginTop: 12,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "hsl(158, 64%, 96%)",
    borderWidth: 1,
    borderColor: "hsl(158, 50%, 80%)",
  },
  vh: { flexDirection: "row", alignItems: "center", gap: 6 },
  vhText: { fontSize: 12, fontFamily: font.extrabold, color: "hsl(158, 64%, 22%)" },
  vp: {
    fontSize: 12,
    lineHeight: 18.6,
    color: "hsl(158, 64%, 18%)",
    marginTop: 7,
    fontFamily: font.medium,
  },
  sign: {
    marginTop: 22,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: bio.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  signed: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  signBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "hsl(158, 64%, 92%)",
    alignItems: "center",
    justifyContent: "center",
  },
  signName: { fontSize: 13, fontFamily: font.extrabold, color: bio.fg },
  signReg: { fontSize: 10, fontFamily: font.semibold, color: bio.muted, marginTop: 1 },
  signWhen: { fontSize: 10, fontFamily: font.bold, color: bio.muted, textAlign: "right" },
  actionbarWrap: { backgroundColor: bio.bg, borderTopWidth: 1, borderTopColor: bio.border },
  actionbar: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
  },
  btn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: bio.card,
    borderWidth: 1,
    borderColor: bio.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingHorizontal: 10,
  },
  btnPrimary: { backgroundColor: bio.primary, borderColor: bio.primary },
  btnText: { fontSize: 12, fontFamily: font.extrabold, color: bio.fg },
});
