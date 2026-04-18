import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Document, Page, StyleSheet, Text, View, Link, Font } from "@react-pdf/renderer";

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
		borderBottom: "1 solid #e2e8f0",
		paddingBottom: 20,
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
	},
	clinicInfo: {
		width: "60%",
	},
	clinicName: {
		fontSize: 18,
		fontWeight: "bold",
		color: "#2563eb", // FisioFlow Primary
		marginBottom: 4,
	},
	reportTitle: {
		fontSize: 12,
		fontWeight: "bold",
		textAlign: "right",
		color: "#475569",
	},
	metaInfo: {
		fontSize: 8,
		textAlign: "right",
		color: "#94a3b8",
		marginTop: 2,
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
		fontSize: 11,
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
	},
	patientNarrative: {
		fontStyle: "italic",
		color: "#475569",
		marginTop: 10,
		borderTop: "1 dashed #e2e8f0",
		paddingTop: 10,
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
		paddingLeft: 10,
		borderLeft: "1 solid #cbd5e1",
	},
	soapTitle: {
		fontSize: 9,
		fontWeight: "bold",
		marginBottom: 2,
	},
	soapText: {
		fontSize: 9,
		color: "#475569",
	},
	metricsGrid: {
		flexDirection: "row",
		flexWrap: "wrap",
		marginTop: 10,
	},
	metricCard: {
		width: "31%",
		marginRight: "3%",
		marginBottom: 10,
		padding: 10,
		backgroundColor: "#f1f5f9",
		borderRadius: 8,
		border: "1 solid #e2e8f0",
	},
	metricLabel: {
		fontSize: 8,
		color: "#64748b",
		marginBottom: 4,
	},
	metricValue: {
		fontSize: 14,
		fontWeight: "bold",
		color: "#0f172a",
	},
	improvementBadge: {
		fontSize: 8,
		marginTop: 4,
		color: "#16a34a",
		fontWeight: "bold",
	},
	referenceBox: {
		marginTop: 20,
		padding: 12,
		backgroundColor: "#eff6ff",
		borderRadius: 8,
		border: "1 solid #bfdbfe",
	},
	referenceTitle: {
		fontSize: 9,
		fontWeight: "bold",
		color: "#1e40af",
		marginBottom: 6,
	},
	referenceItem: {
		fontSize: 8,
		color: "#1e3a8a",
		marginBottom: 4,
		lineHeight: 1.4,
	},
	link: {
		color: "#2563eb",
		textDecoration: "underline",
	},
	footer: {
		position: "absolute",
		bottom: 30,
		left: 40,
		right: 40,
		borderTop: "1 solid #e2e8f0",
		paddingTop: 10,
		flexDirection: "row",
		justifyContent: "space-between",
		fontSize: 8,
		color: "#94a3b8",
	},
});

interface RelatorioPremiumData {
	clinica: { nome: string; endereco?: string; telefone?: string };
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
					<View style={styles.clinicInfo}>
						<Text style={styles.clinicName}>{data.clinica.nome}</Text>
						<Text style={{ fontSize: 9, color: "#64748b" }}>{data.clinica.endereco}</Text>
					</View>
					<View>
						<Text style={styles.reportTitle}>RELATÓRIO DE EVOLUÇÃO CLÍNICA</Text>
						<Text style={styles.metaInfo}>
							Emitido em: {format(new Date(data.data_emissao), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
						</Text>
					</View>
				</View>

				{/* DADOS DO PACIENTE & PROFISSIONAL */}
				<View style={{ flexDirection: "row", marginBottom: 25, gap: 20 }}>
					<View style={{ flex: 1, padding: 10, backgroundColor: "#f8fafc", borderRadius: 8 }}>
						<Text style={{ fontSize: 8, color: "#94a3b8", marginBottom: 4 }}>PACIENTE</Text>
						<Text style={{ fontWeight: "bold", fontSize: 11 }}>{data.paciente.nome}</Text>
						<Text style={{ fontSize: 9, color: "#64748b", marginTop: 2 }}>CPF: {data.paciente.cpf}</Text>
					</View>
					<View style={{ flex: 1, padding: 10, backgroundColor: "#f8fafc", borderRadius: 8 }}>
						<Text style={{ fontSize: 8, color: "#94a3b8", marginBottom: 4 }}>FISIOTERAPEUTA RESPONSÁVEL</Text>
						<Text style={{ fontWeight: "bold", fontSize: 11 }}>{data.profissional.nome}</Text>
						<Text style={{ fontSize: 9, color: "#64748b", marginTop: 2 }}>
							{data.profissional.registro} • {data.profissional.especialidade}
						</Text>
					</View>
				</View>

				{/* 1. SÍNTESE CLÍNICA HUMANIZADA (PARA O MÉDICO) */}
				<View style={styles.section}>
					<View style={styles.sectionHeader}>
						<Text style={styles.sectionTitle}>Análise Narrativa e Conduta</Text>
					</View>
					<View style={styles.narrativeBox}>
						<Text>{data.narrativa_medica}</Text>
						
						<Text style={styles.patientNarrative}>
							Nota para o Paciente: {data.narrativa_paciente}
						</Text>
					</View>
				</View>

				{/* 2. TIMELINE SOAP */}
				<View style={styles.section}>
					<View style={styles.sectionHeader}>
						<Text style={styles.sectionTitle}>Histórico de Evoluções (SOAP)</Text>
					</View>
					{data.evolucoes.slice(0, 5).map((ev, idx) => (
						<View key={idx} style={styles.timelineItem}>
							<Text style={styles.timelineDate}>{format(new Date(ev.data), "dd/MM/yyyy")}</Text>
							<View style={styles.timelineContent}>
								<Text style={styles.soapTitle}>Sessão #{data.evolucoes.length - idx}</Text>
								<Text style={styles.soapText}>{ev.objetivo}</Text>
								<Text style={{ fontSize: 8, color: "#94a3b8", marginTop: 4 }}>
									Dor: {ev.dor}/10 • Mobilidade: {ev.mobilidade}%
								</Text>
							</View>
						</View>
					))}
				</View>

				{/* 3. MÉTRICAS E GANHOS ARTICULARES */}
				<View style={styles.section}>
					<View style={styles.sectionHeader}>
						<Text style={styles.sectionTitle}>Métricas de Amplitude e Performance</Text>
					</View>
					<View style={styles.metricsGrid}>
						{data.metricas.map((m, idx) => (
							<View key={idx} style={styles.metricCard}>
								<Text style={styles.metricLabel}>{m.nome}</Text>
								<Text style={styles.metricValue}>{m.atual}</Text>
								<Text style={styles.improvementBadge}>+{m.melhora} de Ganho</Text>
								<Text style={{ fontSize: 7, color: "#94a3b8", marginTop: 2 }}>Inicial: {m.inicial}</Text>
							</View>
						))}
					</View>
				</View>

				{/* 4. EMBASAMENTO CIENTÍFICO */}
				<View style={styles.referenceBox}>
					<Text style={styles.referenceTitle}>REFERÊNCIAS CIENTÍFICAS E PROTOCOLOS</Text>
					{data.referencias.map((ref, idx) => (
						<View key={idx} style={{ marginBottom: 6 }}>
							<Text style={styles.referenceItem}>
								• {ref.autor} ({new Date().getFullYear()}). {ref.titulo}. {ref.periodico}.
							</Text>
							<Link style={[styles.referenceItem, styles.link]} src={ref.url}>
								Acessar evidência via PubMed
							</Link>
						</View>
					))}
				</View>

				{/* FOOTER */}
				<View style={styles.footer}>
					<Text>Documento gerado por FisioFlow Intelligence Hub</Text>
					<Text>Página 1 de 1</Text>
				</View>
			</Page>
		</Document>
	);
}
