import { avatarColorFor, palette, radius, spacing } from "@/constants/theme";
import { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Bell, Clock, Video, Users, ChevronRight } from "lucide-react-native";
import { bio, font } from "@/constants/biomecanica";
import { BioTabBar } from "@/components/biomecanica/BioTabBar";
import { Silhouette } from "@/components/biomecanica/Silhouette";
import { useAppointments } from "@/hooks/useAppointments";
import {
  biomechanicsApi,
  type BiomechanicsAssessment,
  type BiomechanicsJob,
} from "@/lib/api/biomechanics";

const startOfToday = (() => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
})();
const endOfToday = (() => {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
})();

function formatDuration(durationMs?: number): string {
  if (!durationMs || durationMs <= 0) return "--:--";
  const total = Math.round(durationMs / 1000);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** Iniciais para o avatar da lista. Duas letras, como no kit. */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "PA";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function SectionHead({
  title,
  count,
  link,
  onPress,
}: {
  title: string;
  count?: string;
  link: string;
  onPress?: () => void;
}) {
  return (
    <View style={styles.sectionHead}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {count ? <Text style={styles.sectionCount}>{count}</Text> : null}
      <Pressable style={styles.sectionLink} onPress={onPress} hitSlop={8}>
        <Text style={styles.sectionLinkText}>{link}</Text>
        <ChevronRight size={14} color={bio.primary} strokeWidth={2.5} />
      </Pressable>
    </View>
  );
}

/**
 * Vazio é o estado normal desta clínica hoje (zero avaliações em produção), então
 * ele tem o mesmo peso visual de um card da lista: superfície chapada, mesma
 * altura de linha, sem ilustração. A tela não pode "quebrar" quando não há dado.
 */
function EmptyCard({ title, hint }: { title: string; hint?: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      {hint ? <Text style={styles.emptyHint}>{hint}</Text> : null}
    </View>
  );
}

export default function PainelScreen() {
  const router = useRouter();
  const [jobs, setJobs] = useState<BiomechanicsJob[]>([]);
  const [assessments, setAssessments] = useState<BiomechanicsAssessment[]>([]);
  const [counts, setCounts] = useState({ queued: 0, processing: 0, needsReview: 0, failed: 0 });

  useEffect(() => {
    let mounted = true;
    biomechanicsApi
      .dashboard()
      .then((response) => {
        if (!mounted) return;
        setJobs(response.data.jobs ?? []);
        setAssessments(response.data.recentAssessments ?? []);
        setCounts(response.data.counts ?? { queued: 0, processing: 0, needsReview: 0, failed: 0 });
      })
      .catch(() => {
        if (!mounted) return;
        setJobs([]);
        setAssessments([]);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Sem fallback de demonstração: zero revisões pendentes é uma informação
  // verdadeira e útil; nomes fictícios de paciente na tela não são.
  const { data: todayAppointments } = useAppointments({
    startDate: startOfToday,
    endDate: endOfToday,
  });

  const kpis = [
    {
      icon: Clock,
      bg: bio.amberBg,
      fg: bio.amberText,
      v: String(counts.needsReview),
      l: "Revisões pendentes",
    },
    {
      icon: Video,
      bg: bio.primarySoft,
      fg: bio.primaryText,
      v: String(counts.processing),
      l: "Processando",
    },
    {
      icon: Users,
      bg: bio.greenBg,
      fg: bio.greenText,
      v: String(assessments.length),
      l: "Capturas recentes",
    },
  ];

  const pending = assessments
    .filter((assessment) =>
      ["needs_review", "queued", "processing"].includes(String(assessment.status)),
    )
    .slice(0, 5)
    .map((assessment) => {
      const name = assessment.analysisData?.patientName ?? "Paciente";
      return {
        id: assessment.id,
        initials: initialsOf(name),
        color: avatarColorFor(name),
        name,
        test: String(assessment.type).replace(/_/g, " "),
        when: new Date(assessment.createdAt).toLocaleDateString("pt-BR"),
      };
    });

  const captures = assessments.slice(0, 8).map((assessment) => ({
    id: assessment.id,
    tag: String(assessment.type).replace(/_/g, " ").toUpperCase(),
    name: assessment.analysisData?.patientName ?? "Paciente",
    when: new Date(assessment.createdAt).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }),
    dur: formatDuration(assessment.analysisData?.processing?.durationMs),
  }));

  const agenda = (todayAppointments ?? []).slice(0, 6).map((appointment: any) => {
    const start = new Date(appointment.start_time ?? appointment.startTime ?? Date.now());
    const minutesAway = Math.round((start.getTime() - Date.now()) / 60000);
    return {
      time: start.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      name: appointment.patient_name ?? appointment.patientName ?? "Paciente",
      desc: appointment.notes ?? appointment.type ?? "Atendimento",
      chip: minutesAway <= 60 && minutesAway >= -15 ? "AGORA" : "A SEGUIR",
      now: minutesAway <= 60 && minutesAway >= -15,
    };
  });

  return (
    <View style={styles.root}>
      <SafeAreaView edges={["top"]} style={styles.safe}>
        {/* header */}
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.greet}>Olá, Dr. Rafael</Text>
            <Text style={styles.date}>
              {new Date().toLocaleDateString("pt-BR", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable style={styles.bell} hitSlop={6}>
              <Bell size={19} color={bio.fg} strokeWidth={2} />
              <View style={styles.bellDot} />
            </Pressable>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>RM</Text>
            </View>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* KPIs */}
        <View style={styles.kpis}>
          {kpis.map((k) => (
            <View key={k.l} style={styles.kpi}>
              <View style={[styles.kpiIco, { backgroundColor: k.bg }]}>
                <k.icon size={17} color={k.fg} strokeWidth={2.2} />
              </View>
              <Text style={styles.kpiV}>{k.v}</Text>
              <Text style={styles.kpiL}>{k.l}</Text>
            </View>
          ))}
        </View>

        {/* Pending analyses */}
        <View style={styles.section}>
          <SectionHead
            title="Análises pendentes"
            count={pending.length ? String(pending.length) : undefined}
            link="Ver todas"
            onPress={() => router.push("/biomecanica/tests")}
          />
          <View style={styles.list}>
            {pending.length === 0 ? (
              <EmptyCard
                title="Nenhuma análise aguardando revisão"
                hint="As capturas processadas aparecem aqui para conferência."
              />
            ) : null}
            {pending.map((p) => (
              <Pressable
                key={p.id}
                style={styles.pend}
                onPress={() =>
                  router.push(
                    `/biomecanica/analysis?assessmentId=${encodeURIComponent(p.id)}&patientName=${encodeURIComponent(p.name)}` as never,
                  )
                }
              >
                <View style={[styles.pa, { backgroundColor: p.color }]}>
                  <Text style={styles.paText}>{p.initials}</Text>
                </View>
                <View style={styles.grow}>
                  <Text style={styles.pendName} numberOfLines={1}>
                    {p.name}
                  </Text>
                  <View style={styles.pendMeta}>
                    <Text style={styles.pendMetaText} numberOfLines={1}>
                      {p.test}
                    </Text>
                    <View style={styles.sep} />
                    <Text style={styles.pendMetaText}>{p.when}</Text>
                  </View>
                </View>
                <View style={styles.go}>
                  <ChevronRight size={16} color={bio.amberText} strokeWidth={2.5} />
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Recent captures */}
        <View style={styles.section}>
          <SectionHead
            title="Capturas recentes"
            link="Ver todas"
            onPress={() => router.push("/biomecanica/tests")}
          />
          {captures.length === 0 ? (
            <EmptyCard
              title="Nenhuma captura ainda"
              hint="Abra a aba Captura para gravar a primeira avaliação."
            />
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.railBleed}
              contentContainerStyle={styles.capRail}
            >
              {captures.map((c) => (
                <Pressable
                  key={c.id}
                  style={styles.cap}
                  onPress={() =>
                    router.push(
                      `/biomecanica/analysis?protocolName=${encodeURIComponent(c.tag)}&patientName=${encodeURIComponent(c.name)}` as never,
                    )
                  }
                >
                  <View style={styles.thumb}>
                    <View style={styles.tag}>
                      <Text style={styles.tagText} numberOfLines={1}>
                        {c.tag}
                      </Text>
                    </View>
                    <Silhouette width={48} height={96} />
                    <View style={styles.dur}>
                      <Text style={styles.durText}>{c.dur}</Text>
                    </View>
                  </View>
                  <View style={styles.cbody}>
                    <Text style={styles.cnm} numberOfLines={1}>
                      {c.name}
                    </Text>
                    <Text style={styles.cwhen}>{c.when}</Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Agenda */}
        <View style={styles.section}>
          <SectionHead
            title="Agenda do dia"
            link="Ver agenda"
            onPress={() => router.push("/(tabs)" as never)}
          />
          {agenda.length === 0 ? (
            <EmptyCard title="Nenhum atendimento agendado para hoje" />
          ) : (
            <View style={styles.agenda}>
              {agenda.map((a: (typeof agenda)[number], i: number) => (
                <View
                  key={a.time}
                  style={[styles.agRow, i < agenda.length - 1 && styles.agRowBorder]}
                >
                  <Text style={styles.agTime}>{a.time}</Text>
                  <View style={styles.grow}>
                    <Text style={styles.agName} numberOfLines={1}>
                      {a.name}
                    </Text>
                    <Text style={styles.agDesc} numberOfLines={1}>
                      {a.desc}
                    </Text>
                  </View>
                  <View style={[styles.agChip, a.now ? styles.agChipNow : styles.agChipNext]}>
                    <Text style={[styles.agChipText, a.now ? styles.agChipTextNow : null]}>
                      {a.chip}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <BioTabBar active="painel" />
    </View>
  );
}

const SCREEN_PAD = spacing[5];

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: bio.bg },
  flex: { flex: 1 },
  grow: { flex: 1, minWidth: 0 },
  safe: { backgroundColor: bio.bg },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SCREEN_PAD,
    paddingTop: spacing[1] + 2,
    paddingBottom: spacing[3] + 2,
  },
  headerText: { flex: 1, minWidth: 0 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: spacing[2] + 2 },
  greet: { fontSize: 19, fontFamily: font.extrabold, letterSpacing: -0.4, color: bio.fg },
  date: {
    fontSize: 12,
    fontFamily: font.semibold,
    color: bio.muted,
    marginTop: 3,
    textTransform: "capitalize",
  },
  bell: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: bio.card,
    borderWidth: 1,
    borderColor: bio.border,
    alignItems: "center",
    justifyContent: "center",
  },
  bellDot: {
    position: "absolute",
    top: 9,
    right: 10,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: bio.amber,
    borderWidth: 2,
    borderColor: bio.card,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: bio.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontFamily: font.extrabold, fontSize: 14, color: bio.primaryText },

  scroll: {
    paddingHorizontal: SCREEN_PAD,
    paddingTop: spacing[1],
    paddingBottom: spacing[6],
    gap: spacing[6] - 2,
  },
  section: { gap: spacing[3] },
  list: { gap: spacing[2] + 2 },

  kpis: { flexDirection: "row", gap: spacing[2] + 2 },
  kpi: {
    flex: 1,
    backgroundColor: bio.card,
    borderWidth: 1,
    borderColor: bio.border,
    borderRadius: radius.lg,
    paddingVertical: spacing[3] + 1,
    paddingHorizontal: spacing[3],
    gap: 7,
  },
  kpiIco: {
    width: 32,
    height: 32,
    borderRadius: radius.sm - 2,
    alignItems: "center",
    justifyContent: "center",
  },
  kpiV: {
    fontSize: 26,
    lineHeight: 28,
    fontFamily: font.extrabold,
    letterSpacing: -0.8,
    color: bio.fg,
  },
  kpiL: { fontSize: 11, fontFamily: font.semibold, color: bio.muted, lineHeight: 14 },

  sectionHead: { flexDirection: "row", alignItems: "center" },
  sectionTitle: { fontSize: 16, fontFamily: font.extrabold, letterSpacing: -0.3, color: bio.fg },
  sectionCount: { fontSize: 12, fontFamily: font.bold, color: bio.muted, marginLeft: spacing[2] },
  sectionLink: { marginLeft: "auto", flexDirection: "row", alignItems: "center", gap: 2 },
  sectionLinkText: { fontSize: 12, fontFamily: font.bold, color: bio.primary },

  empty: {
    backgroundColor: bio.card,
    borderWidth: 1,
    borderColor: bio.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4] + 2,
    gap: 3,
  },
  emptyTitle: { fontSize: 13, fontFamily: font.bold, color: bio.fg, letterSpacing: -0.1 },
  emptyHint: { fontSize: 12, fontFamily: font.semibold, color: bio.muted, lineHeight: 17 },

  pend: {
    backgroundColor: bio.card,
    borderWidth: 1,
    borderColor: bio.border,
    borderRadius: radius.lg,
    padding: spacing[4] - 2,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
  },
  pa: {
    width: 42,
    height: 42,
    borderRadius: radius.sm + 1,
    alignItems: "center",
    justifyContent: "center",
  },
  paText: { color: palette.card, fontSize: 14, fontFamily: font.extrabold },
  pendName: { fontSize: 14, fontFamily: font.bold, letterSpacing: -0.1, color: bio.fg },
  pendMeta: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  pendMetaText: { fontSize: 12, fontFamily: font.semibold, color: bio.muted },
  sep: { width: 3, height: 3, borderRadius: 2, backgroundColor: bio.mutedSoft },
  go: {
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    backgroundColor: bio.amberBg,
    alignItems: "center",
    justifyContent: "center",
  },

  // O trilho sangra até a borda da tela: o card cortado à direita é o que
  // sinaliza que há mais capturas para o lado.
  railBleed: { marginHorizontal: -SCREEN_PAD },
  capRail: { gap: spacing[3], paddingHorizontal: SCREEN_PAD, paddingVertical: 2 },
  cap: {
    width: 150,
    backgroundColor: bio.card,
    borderWidth: 1,
    borderColor: bio.border,
    borderRadius: radius.lg,
    overflow: "hidden",
  },
  thumb: {
    height: 96,
    backgroundColor: bio.videoBg,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  tag: {
    position: "absolute",
    top: 7,
    left: 7,
    maxWidth: 136,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.92)",
  },
  tagText: {
    color: bio.fg,
    fontSize: 8,
    fontFamily: font.extrabold,
    letterSpacing: 0.4,
  },
  dur: {
    position: "absolute",
    bottom: 7,
    right: 7,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  durText: { color: palette.card, fontSize: 9, fontFamily: font.bold },
  cbody: {
    paddingHorizontal: spacing[3],
    paddingTop: spacing[2] + 2,
    paddingBottom: spacing[3],
  },
  cnm: { fontSize: 13, fontFamily: font.bold, color: bio.fg },
  cwhen: { fontSize: 11, fontFamily: font.semibold, color: bio.muted, marginTop: 1 },

  agenda: {
    backgroundColor: bio.card,
    borderWidth: 1,
    borderColor: bio.border,
    borderRadius: radius.lg,
    overflow: "hidden",
  },
  agRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    paddingHorizontal: spacing[4] - 2,
    paddingVertical: spacing[3] + 1,
  },
  agRowBorder: { borderBottomWidth: 1, borderBottomColor: bio.borderSoft },
  agTime: { fontSize: 13, fontFamily: font.extrabold, color: bio.primary, width: 42 },
  agName: { fontSize: 14, fontFamily: font.bold, letterSpacing: -0.1, color: bio.fg },
  agDesc: { fontSize: 12, fontFamily: font.semibold, color: bio.muted, marginTop: 1 },
  agChip: { paddingHorizontal: spacing[2], paddingVertical: 3, borderRadius: radius.pill },
  agChipNow: { backgroundColor: bio.primarySoft },
  agChipNext: { backgroundColor: palette.surfaceHover },
  agChipText: { fontSize: 9, fontFamily: font.extrabold, letterSpacing: 0.4, color: bio.muted },
  agChipTextNow: { color: bio.primaryText },
});
