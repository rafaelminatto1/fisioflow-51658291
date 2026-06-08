import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Svg, { Circle, Path } from "react-native-svg";
import { ChevronLeft, Pencil, TrendingUp, ShieldCheck, Share2, Download, Activity } from "lucide-react-native";
import { bio, font } from "@/constants/biomecanica";

const PINFO = [
  ["Paciente", "Carla Ferreira"],
  ["Nascimento", "14/08/1991 (34a)"],
  ["Diagnóstico", "Condromalácia G2 (D)"],
  ["Sessão", "12 de 20"],
  ["Teste", "Agachamento · sagital"],
  ["Responsável", "Dr. Rafael Minatto"],
];

const METRICS = [
  { m: "ROM joelho", s03: "78°", s12: "118°", d: "+40°", up: true },
  { m: "Tronco", s03: "48°", s12: "32°", d: "−16°", up: true },
  { m: "Valgo (D)", s03: "+18°", s12: "+14°", d: "−4°", up: false },
  { m: "Simetria L/R", s03: "71%", s12: "84%", d: "+13", up: true },
  { m: "Dor (EVA)", s03: "6/10", s12: "3/10", d: "−3", up: true },
];

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

export default function ReportScreen() {
  const router = useRouter();
  return (
    <View style={styles.root}>
      <SafeAreaView edges={["top"]} style={{ backgroundColor: bio.bg }}>
        <View style={styles.appbar}>
          <Pressable style={styles.roundBtn} onPress={() => router.back()} hitSlop={6}>
            <ChevronLeft size={18} color={bio.fg} strokeWidth={2.2} />
          </Pressable>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.tn}>Laudo biomecânico</Text>
            <Text style={styles.ts}>Carla Ferreira · Sessão 12</Text>
          </View>
          <Pressable style={styles.roundBtn} hitSlop={6}>
            <Pencil size={18} color={bio.fg} strokeWidth={2.2} />
          </Pressable>
        </View>
      </SafeAreaView>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.doc}>
          {/* clinic header */}
          <View style={styles.docHead}>
            <View style={styles.logo}>
              <Activity size={22} color={bio.primary} strokeWidth={2.4} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.clinicName}>Activity Fisioterapia</Text>
              <Text style={styles.clinicX}>Mooca Fisio · CNPJ 12.345.678/0001-90{"\n"}R. da Mooca, 1234 · São Paulo/SP</Text>
            </View>
          </View>

          {/* banner */}
          <View style={styles.banner}>
            <Text style={styles.bannerT}>LAUDO BIOMECÂNICO</Text>
            <Text style={styles.bannerS}>Nº 2026-0602-CF · 02/06/2026</Text>
          </View>

          <View style={styles.docBody}>
            {/* patient grid */}
            <View style={styles.pinfo}>
              {PINFO.map(([k, v]) => (
                <View key={k} style={styles.pi}>
                  <Text style={styles.piK}>{k}</Text>
                  <Text style={styles.piV}>{v}</Text>
                </View>
              ))}
            </View>

            <View style={styles.sec}>
              <SecHead n={1} title="Queixa & objetivo" />
              <Text style={styles.p}>
                Paciente em reabilitação de <Text style={styles.strong}>condromalácia patelar grau II</Text> à direita,
                com dor anterior no joelho agravada por agachar e descer escadas. Reavaliação do agachamento para
                mensurar evolução do controle motor e amplitude após 8 semanas.
              </Text>
            </View>

            <View style={styles.sec}>
              <SecHead n={2} title="Achados biomecânicos" />
              <Text style={styles.p}>
                A captura sagital evidenciou <Text style={styles.strong}>ganho expressivo de flexão do joelho</Text> (118°)
                sem dor até a 8ª repetição. Inclinação de tronco reduziu para 32°. Persiste{" "}
                <Text style={styles.strong}>valgo dinâmico moderado à direita (+14°)</Text> na fase descendente.
              </Text>
              <View style={styles.frames}>
                <View style={styles.frame}>
                  <View style={styles.frameImg}>
                    <Svg height={104} width={70} viewBox="0 0 100 200" fill="none" stroke="#94a3b8" strokeWidth={3}>
                      <Circle cx="50" cy="22" r="9" fill="#94a3b8" />
                      <Path d="M50 31 L62 95 L68 130" />
                      <Path d="M62 95 Q45 120 38 145" />
                    </Svg>
                    <View style={[styles.ang, { backgroundColor: "hsl(0, 72%, 50%)" }]}>
                      <Text style={styles.angText}>78°</Text>
                    </View>
                  </View>
                  <Text style={styles.cap}>17 mar · pico 78°</Text>
                </View>
                <View style={styles.frame}>
                  <View style={styles.frameImg}>
                    <Svg height={104} width={70} viewBox="0 0 100 200" fill="none" stroke="#cbd5e1" strokeWidth={3}>
                      <Circle cx="50" cy="22" r="9" fill="#cbd5e1" />
                      <Path d="M50 31 L56 95 L40 125" />
                      <Path d="M56 95 Q40 130 55 160" />
                    </Svg>
                    <View style={[styles.ang, { backgroundColor: "hsl(158, 64%, 42%)" }]}>
                      <Text style={styles.angText}>118°</Text>
                    </View>
                  </View>
                  <Text style={styles.cap}>02 jun · pico 118°</Text>
                </View>
              </View>
            </View>

            <View style={styles.sec}>
              <SecHead n={3} title="Comparativo de métricas" />
              <View style={styles.mtable}>
                <View style={[styles.mrow, styles.mrowHead]}>
                  <Text style={[styles.mc, styles.mcHead, { flex: 1, textAlign: "left" }]}>Métrica</Text>
                  <Text style={[styles.mc, styles.mcHead, styles.mcNum]}>S03</Text>
                  <Text style={[styles.mc, styles.mcHead, styles.mcNum]}>S12</Text>
                  <Text style={[styles.mc, styles.mcHead, styles.mcDelta]}>Δ</Text>
                </View>
                {METRICS.map((r, i) => (
                  <View key={r.m} style={[styles.mrow, i < METRICS.length - 1 && styles.mrowBorder]}>
                    <Text style={[styles.mn, { flex: 1 }]}>{r.m}</Text>
                    <Text style={[styles.mc, styles.mcNum]}>{r.s03}</Text>
                    <Text style={[styles.mc, styles.mcNum]}>{r.s12}</Text>
                    <View style={styles.mcDelta}>
                      <Text style={[styles.delta, r.up ? styles.deltaUp : styles.deltaWarn]}>{r.d}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.sec}>
              <SecHead n={4} title="Conclusão & conduta" />
              <View style={styles.verdict}>
                <View style={styles.vh}>
                  <TrendingUp size={14} color="hsl(158, 64%, 22%)" strokeWidth={2.4} />
                  <Text style={styles.vhText}>Evolução positiva consistente</Text>
                </View>
                <Text style={styles.vp}>
                  Ganho de ROM e redução de dor confirmam boa resposta ao protocolo. Mantém-se o valgo dinâmico residual
                  como foco terapêutico. <Text style={styles.vStrong}>Conduta:</Text> progredir fortalecimento de glúteo
                  médio e controle excêntrico; reavaliar em 4 semanas (S16).
                </Text>
              </View>
              <View style={styles.sign}>
                <View style={styles.signed}>
                  <View style={styles.signBadge}>
                    <ShieldCheck size={19} color="hsl(158, 64%, 32%)" strokeWidth={2.2} />
                  </View>
                  <View>
                    <Text style={styles.signName}>Dr. Rafael Minatto</Text>
                    <Text style={styles.signReg}>CREFITO-3 123456-F</Text>
                  </View>
                </View>
                <Text style={styles.signWhen}>Assinado digitalmente{"\n"}02/06/2026 · 15:12</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <SafeAreaView edges={["bottom"]} style={styles.actionbarWrap}>
        <View style={styles.actionbar}>
          <Pressable style={styles.btn}>
            <Share2 size={17} color={bio.fg} strokeWidth={2.2} />
            <Text style={styles.btnText}>Compartilhar</Text>
          </Pressable>
          <Pressable style={[styles.btn, styles.btnPrimary]}>
            <Download size={17} color="#fff" strokeWidth={2.2} />
            <Text style={[styles.btnText, { color: "#fff" }]}>Exportar PDF</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: bio.bg },
  appbar: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingTop: 4, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: bio.border },
  roundBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: bio.card, borderWidth: 1, borderColor: bio.border, alignItems: "center", justifyContent: "center" },
  tn: { fontSize: 15, fontFamily: font.extrabold, letterSpacing: -0.2, color: bio.fg },
  ts: { fontSize: 11, fontFamily: font.semibold, color: bio.muted, marginTop: 1 },

  scroll: { padding: 16, paddingBottom: 24 },
  doc: { backgroundColor: "#fff", borderWidth: 1, borderColor: bio.border, borderRadius: 16, overflow: "hidden" },
  docHead: { padding: 18, paddingTop: 20, borderBottomWidth: 2, borderBottomColor: bio.primary, flexDirection: "row", gap: 12, alignItems: "flex-start" },
  logo: { width: 40, height: 40, borderRadius: 12, backgroundColor: bio.primarySoft, alignItems: "center", justifyContent: "center" },
  clinicName: { fontSize: 15, fontFamily: font.extrabold, letterSpacing: -0.1, color: "hsl(224, 71%, 20%)" },
  clinicX: { fontSize: 10, color: bio.muted, fontFamily: font.semibold, lineHeight: 14, marginTop: 2 },

  banner: { paddingHorizontal: 18, paddingVertical: 12, backgroundColor: "hsl(211, 100%, 96%)", flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: bio.border },
  bannerT: { fontSize: 12, fontFamily: font.extrabold, letterSpacing: 0.5, color: bio.primary },
  bannerS: { fontSize: 10, fontFamily: font.bold, color: bio.muted },

  docBody: { padding: 18 },
  pinfo: { flexDirection: "row", flexWrap: "wrap", paddingBottom: 18, borderBottomWidth: 1, borderBottomColor: bio.border, rowGap: 10 },
  pi: { width: "50%", paddingRight: 14 },
  piK: { fontSize: 9, fontFamily: font.extrabold, letterSpacing: 0.5, textTransform: "uppercase", color: bio.muted },
  piV: { fontSize: 13, fontFamily: font.bold, marginTop: 2, color: bio.fg },

  sec: { marginTop: 20 },
  secHead: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 9 },
  secNum: { width: 20, height: 20, borderRadius: 10, backgroundColor: bio.primary, alignItems: "center", justifyContent: "center" },
  secNumText: { color: "#fff", fontSize: 11, fontFamily: font.extrabold },
  secTitle: { fontSize: 12, fontFamily: font.extrabold, letterSpacing: 0.4, textTransform: "uppercase", color: bio.primary },
  p: { fontSize: 13, lineHeight: 20.8, color: "hsl(220, 20%, 25%)", fontFamily: font.medium },
  strong: { fontFamily: font.extrabold },

  frames: { flexDirection: "row", gap: 10, marginTop: 12 },
  frame: { flex: 1, borderWidth: 1, borderColor: bio.border, borderRadius: 12, overflow: "hidden" },
  frameImg: { height: 130, backgroundColor: bio.videoBg, alignItems: "center", justifyContent: "center" },
  ang: { position: "absolute", left: 8, bottom: 8, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  angText: { fontSize: 11, fontFamily: font.extrabold, color: "#fff" },
  cap: { fontSize: 10, fontFamily: font.bold, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: "#F1F3F6", color: bio.muted },

  mtable: { borderWidth: 1, borderColor: bio.border, borderRadius: 12, overflow: "hidden", marginTop: 4 },
  mrow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10 },
  mrowHead: { backgroundColor: "#F1F3F6" },
  mrowBorder: { borderBottomWidth: 1, borderBottomColor: bio.borderSoft },
  mn: { fontSize: 12, fontFamily: font.bold, color: bio.fg },
  mc: { fontSize: 12, fontFamily: font.bold, color: bio.fg, textAlign: "right" },
  mcHead: { fontSize: 9, fontFamily: font.extrabold, letterSpacing: 0.4, textTransform: "uppercase", color: bio.muted },
  mcNum: { width: 46 },
  mcDelta: { width: 58, alignItems: "flex-end" },
  delta: { fontFamily: font.extrabold, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, fontSize: 11, overflow: "hidden" },
  deltaUp: { backgroundColor: "hsl(158, 64%, 92%)", color: "hsl(158, 64%, 25%)" },
  deltaWarn: { backgroundColor: "hsl(28, 92%, 92%)", color: "hsl(25, 70%, 32%)" },

  verdict: { marginTop: 12, padding: 14, borderRadius: 12, backgroundColor: "hsl(158, 64%, 96%)", borderWidth: 1, borderColor: "hsl(158, 50%, 80%)" },
  vh: { flexDirection: "row", alignItems: "center", gap: 6 },
  vhText: { fontSize: 12, fontFamily: font.extrabold, color: "hsl(158, 64%, 22%)" },
  vp: { fontSize: 12, lineHeight: 18.6, color: "hsl(158, 64%, 18%)", marginTop: 7, fontFamily: font.medium },
  vStrong: { fontFamily: font.extrabold },

  sign: { marginTop: 22, paddingTop: 16, borderTopWidth: 1, borderTopColor: bio.border, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  signed: { flexDirection: "row", alignItems: "center", gap: 8 },
  signBadge: { width: 38, height: 38, borderRadius: 19, backgroundColor: "hsl(158, 64%, 92%)", alignItems: "center", justifyContent: "center" },
  signName: { fontSize: 13, fontFamily: font.extrabold, color: bio.fg },
  signReg: { fontSize: 10, fontFamily: font.semibold, color: bio.muted, marginTop: 1 },
  signWhen: { textAlign: "right", fontSize: 10, fontFamily: font.bold, color: bio.muted },

  actionbarWrap: { backgroundColor: bio.card, borderTopWidth: 1, borderTopColor: bio.border },
  actionbar: { flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  btn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 13, borderRadius: 13, borderWidth: 1, borderColor: bio.border, backgroundColor: bio.card },
  btnPrimary: { backgroundColor: bio.primary, borderColor: bio.primary },
  btnText: { fontSize: 14, fontFamily: font.extrabold, color: bio.fg },
});
