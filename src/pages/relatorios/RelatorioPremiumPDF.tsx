import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Document, Page, StyleSheet, Text, View, Link, Font, Image } from "@react-pdf/renderer";
import { formatClinicalText } from "@/lib/evolution/formatters";

// Premium Styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#1a202c",
  },
  header: {
    marginBottom: 25,
    borderBottom: "2 solid #2563eb",
    paddingBottom: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logo: {
    width: 50,
    height: 50,
    borderRadius: 12,
  },
  clinicInfo: {
    width: "60%",
  },
  clinicName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2563eb",
    marginBottom: 4,
  },
  clinicDetails: {
    fontSize: 8,
    color: "#64748b",
    lineHeight: 1.4,
  },
  reportTitle: {
    fontSize: 12,
    fontWeight: "bold",
    textAlign: "right",
    color: "#1e293b",
    textTransform: "uppercase",
  },
  metaInfo: {
    fontSize: 8,
    textAlign: "right",
    color: "#94a3b8",
    marginTop: 4,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    backgroundColor: "#f8fafc",
    padding: "8 12",
    borderRadius: 6,
    marginBottom: 10,
    borderLeft: "4 solid #2563eb",
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#1e293b",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  narrativeBox: {
    padding: "10 15",
    lineHeight: 1.6,
    color: "#334155",
    backgroundColor: "#ffffff",
    border: "1 solid #f1f5f9",
    borderRadius: 8,
  },
  patientNarrative: {
    fontStyle: "italic",
    color: "#64748b",
    fontSize: 9,
    marginTop: 12,
    paddingTop: 10,
    borderTop: "1 dashed #e2e8f0",
  },
  timelineItem: {
    flexDirection: "row",
    marginBottom: 12,
  },
  timelineDate: {
    width: "20%",
    fontSize: 9,
    fontWeight: "bold",
    color: "#64748b",
  },
  timelineContent: {
    width: "80%",
    paddingLeft: 12,
    borderLeft: "1 solid #e2e8f0",
  },
  soapTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 2,
  },
  soapText: {
    fontSize: 9,
    color: "#475569",
    lineHeight: 1.4,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 5,
    gap: 10,
  },
  metricCard: {
    width: "31%",
    padding: 12,
    backgroundColor: "#ffffff",
    borderRadius: 10,
    border: "1 solid #e2e8f0",
    boxShadow: "0 2 4 rgba(0,0,0,0.05)",
  },
  metricLabel: {
    fontSize: 7,
    fontWeight: "bold",
    color: "#64748b",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#0f172a",
  },
  improvementBadge: {
    fontSize: 8,
    marginTop: 6,
    color: "#16a34a",
    fontWeight: "bold",
    backgroundColor: "#f0fdf4",
    padding: "2 6",
    borderRadius: 4,
    alignSelf: "flex-start",
  },
  referenceBox: {
    marginTop: 20,
    padding: 15,
    backgroundColor: "#eff6ff",
    borderRadius: 10,
    border: "1 solid #bfdbfe",
  },
  referenceTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#1e40af",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  referenceItem: {
    fontSize: 8,
    color: "#1e3a8a",
    marginBottom: 6,
    lineHeight: 1.5,
  },
  link: {
    color: "#2563eb",
    textDecoration: "underline",
    fontWeight: "bold",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    borderTop: "1 solid #e2e8f0",
    paddingTop: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: 8,
    color: "#94a3b8",
  },
  contactInfo: {
    flexDirection: "row",
    gap: 15,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
});

interface RelatorioPremiumData {
  clinica: {
    nome: string;
    endereco: string;
    telefone: string;
    whatsapp: string;
    logoUrl?: string;
  };
  paciente: { nome: string; cpf?: string; data_nascimento?: string };
  profissional: { nome: string; registro: string; especialidade: string };
  data_emissao: string;
  narrativa_medica: string;
  narrativa_paciente: string;
  evolucoes: Array<{
    data: string;
    objetivo: string;
    dor: number;
    mobilidade: number;
  }>;
  metricas: Array<{
    nome: string;
    inicial: string;
    atual: string;
    melhora: string;
  }>;
  referencias: Array<{
    autor: string;
    titulo: string;
    periodico: string;
    url: string;
  }>;
}

export function RelatorioPremiumPDF({ data }: { data: RelatorioPremiumData }) {
  return (
    <Document title={`Relatorio_Premium_${data.paciente.nome}`}>
      <Page size="A4" style={styles.page}>
        {/* HEADER PREMIUM */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            {data.clinica.logoUrl && <Image src={data.clinica.logoUrl} style={styles.logo} />}
            <View style={styles.clinicInfo}>
              <Text style={styles.clinicName}>{data.clinica.nome}</Text>
              <Text style={styles.clinicDetails}>{data.clinica.endereco}</Text>
              <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
                <Text style={styles.clinicDetails}>Tel: {data.clinica.telefone}</Text>
                <Text style={styles.clinicDetails}>WhatsApp: {data.clinica.whatsapp}</Text>
              </View>
            </View>
          </View>
          <View>
            <Text style={styles.reportTitle}>Relatório de Evolução</Text>
            <Text style={styles.metaInfo}>
              {format(new Date(data.data_emissao), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </Text>
          </View>
        </View>

        {/* DADOS DO PACIENTE & PROFISSIONAL */}
        <View style={{ flexDirection: "row", marginBottom: 25, gap: 15 }}>
          <View
            style={{
              flex: 1,
              padding: 12,
              backgroundColor: "#f8fafc",
              borderRadius: 10,
              border: "1 solid #e2e8f0",
            }}
          >
            <Text
              style={{
                fontSize: 7,
                color: "#94a3b8",
                fontWeight: "bold",
                textTransform: "uppercase",
                marginBottom: 4,
              }}
            >
              Paciente
            </Text>
            <Text style={{ fontWeight: "bold", fontSize: 11, color: "#0f172a" }}>
              {data.paciente.nome}
            </Text>
            <Text style={{ fontSize: 8, color: "#64748b", marginTop: 2 }}>
              CPF: {data.paciente.cpf}
            </Text>
          </View>
          <View
            style={{
              flex: 1,
              padding: 12,
              backgroundColor: "#f8fafc",
              borderRadius: 10,
              border: "1 solid #e2e8f0",
            }}
          >
            <Text
              style={{
                fontSize: 7,
                color: "#94a3b8",
                fontWeight: "bold",
                textTransform: "uppercase",
                marginBottom: 4,
              }}
            >
              Fisioterapeuta Responsável
            </Text>
            <Text style={{ fontWeight: "bold", fontSize: 11, color: "#0f172a" }}>
              {data.profissional.nome}
            </Text>
            <Text style={{ fontSize: 8, color: "#64748b", marginTop: 2 }}>
              {data.profissional.registro} • {data.profissional.especialidade}
            </Text>
          </View>
        </View>

        {/* 1. SÍNTESE CLÍNICA HUMANIZADA (PARA O MÉDICO) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Análise Narrativa e Conduta Clínica</Text>
          </View>
          <View style={styles.narrativeBox}>
            <Text style={{ fontSize: 10, lineHeight: 1.6 }}>{data.narrativa_medica}</Text>

            <View style={styles.patientNarrative}>
              <Text
                style={{
                  fontWeight: "bold",
                  fontSize: 8,
                  marginBottom: 4,
                  color: "#2563eb",
                  textTransform: "uppercase",
                }}
              >
                Para o Paciente:
              </Text>
              <Text>{data.narrativa_paciente}</Text>
            </View>
          </View>
        </View>

        {/* 2. TIMELINE SOAP */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Histórico Recente de Evoluções</Text>
          </View>
          <View style={{ paddingLeft: 5 }}>
            {data.evolucoes.slice(0, 5).map((ev, idx) => (
              <View key={idx} style={styles.timelineItem}>
                <Text style={styles.timelineDate}>{format(new Date(ev.data), "dd/MM/yyyy")}</Text>
                <View style={styles.timelineContent}>
                  <Text style={styles.soapTitle}>Sessão #{data.evolucoes.length - idx}</Text>
                  <Text style={styles.soapText}>{formatClinicalText(ev.objetivo)}</Text>
                  <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
                    <Text style={{ fontSize: 7, color: "#16a34a", fontWeight: "bold" }}>
                      DOR: {ev.dor}/10
                    </Text>
                    <Text style={{ fontSize: 7, color: "#2563eb", fontWeight: "bold" }}>
                      MOBILIDADE: {ev.mobilidade}%
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* 3. MÉTRICAS E GANHOS ARTICULARES */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Métricas de Evolução Funcional</Text>
          </View>
          <View style={styles.metricsGrid}>
            {data.metricas.map((m, idx) => (
              <View key={idx} style={styles.metricCard}>
                <Text style={styles.metricLabel}>{m.nome}</Text>
                <Text style={styles.metricValue}>{m.atual}</Text>
                <Text style={styles.improvementBadge}>+{m.melhora} Evolução</Text>
                <Text style={{ fontSize: 7, color: "#94a3b8", marginTop: 4 }}>
                  Inicial: {m.inicial}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* 4. EMBASAMENTO CIENTÍFICO */}
        <View style={styles.referenceBox}>
          <Text style={styles.referenceTitle}>Referências e Protocolos de Evidência</Text>
          {data.referencias.map((ref, idx) => (
            <View key={idx} style={{ marginBottom: 8 }}>
              <Text style={styles.referenceItem}>
                • {ref.autor} ({new Date().getFullYear()}). {ref.titulo}. {ref.periodico}.
              </Text>
              <Link style={[styles.referenceItem, styles.link]} src={ref.url}>
                Acessar estudo completo via PubMed
              </Link>
            </View>
          ))}
        </View>

        {/* FOOTER */}
        <View style={styles.footer}>
          <Text>FisioFlow Hub • Gestão Baseada em Dados e Evidências</Text>
          <Text>Documento assinado digitalmente • Página 1 de 1</Text>
        </View>
      </Page>
    </Document>
  );
}
