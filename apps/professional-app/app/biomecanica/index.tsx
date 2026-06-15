import { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Bell, Clock, Video, Users, ChevronRight } from "lucide-react-native";
import { bio, font } from "@/constants/biomecanica";
import { BioTabBar } from "@/components/biomecanica/BioTabBar";
import { Silhouette } from "@/components/biomecanica/Silhouette";
import {
  biomechanicsApi,
  type BiomechanicsAssessment,
  type BiomechanicsJob,
} from "@/lib/api/biomechanics";

const KPIS = [
  {
    icon: Clock,
    bg: "hsl(28, 92%, 93%)",
    fg: "hsl(25, 72%, 42%)",
    v: "5",
    l: "Análises pendentes",
  },
  { icon: Video, bg: "hsl(211, 100%, 93%)", fg: "hsl(211, 100%, 42%)", v: "8", l: "Capturas hoje" },
  {
    icon: Users,
    bg: "hsl(142, 60%, 92%)",
    fg: "hsl(142, 55%, 32%)",
    v: "62",
    l: "Pacientes ativos",
  },
];

const PENDING = [
  {
    id: "1",
    initials: "CF",
    color: bio.avatarBlue,
    name: "Carla Ferreira",
    test: "Agachamento",
    when: "hoje 14:30",
  },
  {
    id: "2",
    initials: "RS",
    color: bio.avatarOrange,
    name: "Rafael Souza",
    test: "Marcha",
    when: "hoje 11:05",
  },
  {
    id: "3",
    initials: "JP",
    color: bio.avatarPink,
    name: "Juliana Pires",
    test: "Salto vertical",
    when: "ontem",
  },
  {
    id: "4",
    initials: "LM",
    color: bio.avatarGreen,
    name: "Lucas Martins",
    test: "Step-down",
    when: "ontem",
  },
];

const CAPTURES = [
  { id: "1", tag: "AGACHAMENTO", name: "Carla Ferreira", when: "hoje 14:30", dur: "00:11" },
  { id: "2", tag: "MARCHA", name: "Rafael Souza", when: "hoje 11:05", dur: "00:18" },
  { id: "3", tag: "SALTO VERTICAL", name: "Juliana Pires", when: "ontem 16:20", dur: "00:07" },
  { id: "4", tag: "STEP-DOWN", name: "Lucas Martins", when: "ontem 09:40", dur: "00:09" },
];

const AGENDA = [
  {
    time: "14:30",
    name: "Carla Ferreira",
    desc: "Reavaliação · agachamento + step-down",
    chip: "EM 1H",
    now: true,
  },
  {
    time: "15:30",
    name: "Marina Alves",
    desc: "Avaliação inicial · marcha",
    chip: "A SEGUIR",
    now: false,
  },
  {
    time: "17:00",
    name: "Bruno Dias",
    desc: "Controle · salto vertical",
    chip: "A SEGUIR",
    now: false,
  },
];

function SectionHead({ title, count, link }: { title: string; count?: string; link: string }) {
  return (
    <View style={styles.sectionHead}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {count ? <Text style={styles.sectionCount}>{count}</Text> : null}
      <View style={styles.sectionLink}>
        <Text style={styles.sectionLinkText}>{link}</Text>
        <ChevronRight size={14} color={bio.primary} strokeWidth={2.5} />
      </View>
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

  const kpis =
    jobs.length || assessments.length
      ? [
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
        ]
      : KPIS;

  const pending = assessments.length
    ? assessments
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
        }))
    : PENDING;

  return (
    <View style={styles.root}>
      <SafeAreaView edges={["top"]} style={styles.safe}>
        {/* header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greet}>Olá, Dr. Rafael</Text>
            <Text style={styles.date}>terça, 2 de junho</Text>
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
          <SectionHead title="Análises pendentes" count="5" link="Ver todas" />
          <View style={{ gap: 10 }}>
            {pending.map((p) => (
              <Pressable
                key={p.id}
                style={styles.pend}
                onPress={() =>
                  router.push(
                    `/biomecanica/analysis?assessmentId=${encodeURIComponent(p.id)}` as never,
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
          <SectionHead title="Capturas recentes" link="Ver todas" />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.capRail}
          >
            {CAPTURES.map((c) => (
              <Pressable
                key={c.id}
                style={styles.cap}
                onPress={() => router.push("/biomecanica/analysis" as never)}
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
          <SectionHead title="Agenda do dia" link="Ver agenda" />
          <View style={styles.agenda}>
            {AGENDA.map((a, i) => (
              <View
                key={a.time}
                style={[styles.agRow, i < AGENDA.length - 1 && styles.agRowBorder]}
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
