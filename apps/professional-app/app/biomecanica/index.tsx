import { palette } from "@/constants/theme";
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
            bg: "hsl(28, 92%, 93%)",
            fg: "hsl(25, 72%, 42%)",
            v: String(counts.needsReview),
            l: "Revisões pendentes",
          },
          {
            icon: Video,
            bg: "hsl(211, 100%, 93%)",
            fg: "hsl(211, 100%, 42%)",
            v: String(counts.processing),
            l: "Processando",
          },
          {
            icon: Users,
            bg: "hsl(142, 60%, 92%)",
            fg: "hsl(142, 55%, 32%)",
            v: String(assessments.length),
            l: "Capturas recentes",
          },
  ];

  const pending = assessments
        .filter((assessment) =>
          ["needs_review", "queued", "processing"].includes(String(assessment.status)),
        )
        .slice(0, 5)
        .map((assessment, index) => ({
          id: assessment.id,
          initials: "PX",
          color: [bio.avatarBlue, bio.avatarOrange, bio.avatarPink, bio.avatarGreen][index % 4],
          name: assessment.analysisData?.patientName ?? "Paciente",
          test: String(assessment.type).replace(/_/g, " "),
          when: new Date(assessment.createdAt).toLocaleDateString("pt-BR"),
        }));

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
          <View style={{ flex: 1 }}>
            <Text style={styles.greet}>Olá, Dr. Rafael</Text>
            <Text style={styles.date}>
              {new Date().toLocaleDateString("pt-BR", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </Text>
          </View>
          <Pressable style={styles.bell} hitSlop={6}>
            <Bell size={19} color={bio.fg} strokeWidth={2} />
            <View style={styles.bellDot} />
          </Pressable>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>RM</Text>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Featured Hero Banner (Claude Design System Handoff) */}
        <View style={styles.heroCard}>
          <View style={styles.heroMain}>
            <Text style={styles.heroEyebrow}>BIOMECÂNICA DIGITAL · CLÍNICA</Text>
            <Text style={styles.heroTitle}>Análise Cinemática & Postural</Text>
            <Text style={styles.heroSub}>
              Rastreio de 17 articulações em tempo real com goniômetro vetorial e laudo em PDF.
            </Text>
          </View>
          <View style={styles.heroStats}>
            <View style={styles.hstat}>
              <Text style={styles.hstatV}>84</Text>
              <Text style={styles.hstatL}>TESTES</Text>
            </View>
            <View style={styles.hstat}>
              <Text style={styles.hstatV}>98%</Text>
              <Text style={styles.hstatL}>PRECISÃO</Text>
            </View>
          </View>
        </View>

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
        <View style={{ gap: 12 }}>
          <SectionHead
            title="Análises pendentes"
            count={String(pending.length)}
            link="Ver todas"
            onPress={() => router.push("/biomecanica/tests")}
          />
          <View style={{ gap: 10 }}>
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
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.pendName}>{p.name}</Text>
                  <View style={styles.pendMeta}>
                    <Text style={styles.pendMetaText}>{p.test}</Text>
                    <View style={styles.sep} />
                    <Text style={styles.pendMetaText}>{p.when}</Text>
                  </View>
                </View>
                <View style={styles.go}>
                  <ChevronRight size={16} color="hsl(25, 75%, 42%)" strokeWidth={2.5} />
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Recent captures */}
        <View style={{ gap: 12 }}>
          <SectionHead
            title="Capturas recentes"
            link="Ver todas"
            onPress={() => router.push("/biomecanica/tests")}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.capRail}
          >
            {captures.length === 0 ? (
              <View style={styles.emptyRail}>
                <Text style={styles.emptyText}>
                  Nenhuma captura ainda. Toque em Nova captura para começar.
                </Text>
              </View>
            ) : null}
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
                    <Text style={styles.tagText}>{c.tag}</Text>
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
        </View>

        {/* Agenda */}
        <View style={{ gap: 12 }}>
          <SectionHead
            title="Agenda do dia"
            link="Ver agenda"
            onPress={() => router.push("/(tabs)" as never)}
          />
          <View style={styles.agenda}>
            {agenda.length === 0 ? (
              <View style={styles.agRow}>
                <Text style={styles.emptyText}>Nenhum atendimento agendado para hoje.</Text>
              </View>
            ) : null}
            {agenda.map((a: (typeof agenda)[number], i: number) => (
              <View
                key={a.time}
                style={[styles.agRow, i < agenda.length - 1 && styles.agRowBorder]}
              >
                <Text style={styles.agTime}>{a.time}</Text>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.agName}>{a.name}</Text>
                  <Text style={styles.agDesc}>{a.desc}</Text>
                </View>
                <View style={[styles.agChip, a.now ? styles.agChipNow : styles.agChipNext]}>
                  <Text
                    style={[
                      styles.agChipText,
                      { color: a.now ? "hsl(211, 100%, 38%)" : bio.muted },
                    ]}
                  >
                    {a.chip}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <BioTabBar active="painel" />
    </View>
  );
}

const styles = StyleSheet.create({
  emptyRail: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    maxWidth: 280,
  },
  emptyText: {
    fontFamily: font.medium,
    fontSize: 13,
    color: bio.muted,
    lineHeight: 18,
  },
  root: { flex: 1, backgroundColor: bio.bg },
  safe: { backgroundColor: bio.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 12,
  },
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
    borderRadius: 20,
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
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "hsl(28, 90%, 52%)",
    borderWidth: 2,
    borderColor: bio.card,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: bio.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontFamily: font.extrabold, fontSize: 14, color: "hsl(211, 100%, 32%)" },

  scroll: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 24, gap: 22 },

  heroCard: {
    backgroundColor: palette.text,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "hsla(211, 100%, 50%, 0.35)",
    gap: 14,
  },
  heroMain: { flex: 1 },
  heroEyebrow: {
    color: bio.primary,
    fontSize: 10,
    fontFamily: font.extrabold,
    letterSpacing: 1.2,
  },
  heroTitle: {
    color: palette.card,
    fontSize: 18,
    fontFamily: font.extrabold,
    letterSpacing: -0.3,
    marginTop: 4,
  },
  heroSub: {
    color: "hsl(214, 30%, 80%)",
    fontSize: 12,
    fontFamily: font.medium,
    lineHeight: 17,
    marginTop: 4,
  },
  heroStats: {
    flexDirection: "row",
    gap: 20,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.12)",
    paddingTop: 12,
  },
  hstat: { flex: 1 },
  hstatV: {
    color: palette.card,
    fontSize: 20,
    fontFamily: font.extrabold,
    letterSpacing: -0.4,
  },
  hstatL: {
    color: "hsl(214, 25%, 68%)",
    fontSize: 9,
    fontFamily: font.extrabold,
    letterSpacing: 0.8,
    marginTop: 1,
  },

  kpis: { flexDirection: "row", gap: 10 },
  kpi: {
    flex: 1,
    backgroundColor: bio.card,
    borderWidth: 1,
    borderColor: bio.border,
    borderRadius: 16,
    padding: 12,
    gap: 7,
  },
  kpiIco: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  kpiV: { fontSize: 26, fontFamily: font.extrabold, letterSpacing: -0.8, color: bio.fg },
  kpiL: { fontSize: 11, fontFamily: font.semibold, color: bio.muted, lineHeight: 14 },

  sectionHead: { flexDirection: "row", alignItems: "center" },
  sectionTitle: { fontSize: 16, fontFamily: font.extrabold, letterSpacing: -0.3, color: bio.fg },
  sectionCount: { fontSize: 12, fontFamily: font.bold, color: bio.muted, marginLeft: 8 },
  sectionLink: { marginLeft: "auto", flexDirection: "row", alignItems: "center", gap: 2 },
  sectionLinkText: { fontSize: 12, fontFamily: font.bold, color: bio.primary },

  pend: {
    backgroundColor: bio.card,
    borderWidth: 1,
    borderColor: bio.border,
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  pa: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  paText: { color: "#fff", fontSize: 14, fontFamily: font.extrabold },
  pendName: { fontSize: 14, fontFamily: font.bold, letterSpacing: -0.1, color: bio.fg },
  pendMeta: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  pendMetaText: { fontSize: 12, fontFamily: font.semibold, color: bio.muted },
  sep: { width: 3, height: 3, borderRadius: 2, backgroundColor: bio.mutedSoft },
  go: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "hsl(28, 92%, 94%)",
    alignItems: "center",
    justifyContent: "center",
  },

  capRail: { gap: 12, paddingVertical: 2 },
  cap: {
    width: 150,
    backgroundColor: bio.card,
    borderWidth: 1,
    borderColor: bio.border,
    borderRadius: 16,
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
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.92)",
  },
  tagText: {
    color: "hsl(224, 60%, 25%)",
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
  durText: { color: "#fff", fontSize: 9, fontFamily: font.bold },
  cbody: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 12 },
  cnm: { fontSize: 13, fontFamily: font.bold, color: bio.fg },
  cwhen: { fontSize: 11, fontFamily: font.semibold, color: bio.muted, marginTop: 1 },

  agenda: {
    backgroundColor: bio.card,
    borderWidth: 1,
    borderColor: bio.border,
    borderRadius: 16,
    overflow: "hidden",
  },
  agRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  agRowBorder: { borderBottomWidth: 1, borderBottomColor: bio.borderSoft },
  agTime: { fontSize: 13, fontFamily: font.extrabold, color: bio.primary, width: 42 },
  agName: { fontSize: 14, fontFamily: font.bold, letterSpacing: -0.1, color: bio.fg },
  agDesc: { fontSize: 12, fontFamily: font.semibold, color: bio.muted, marginTop: 1 },
  agChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  agChipNow: { backgroundColor: "hsl(211, 100%, 93%)" },
  agChipNext: { backgroundColor: "#EEF1F5" },
  agChipText: { fontSize: 9, fontFamily: font.extrabold, letterSpacing: 0.4 },
});
