import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { RelatorioMedicoData } from "./RelatorioMedicoPage";

const styles = StyleSheet.create({
	page: {
		padding: 30,
		fontSize: 10,
		fontFamily: "Helvetica",
	},
	header: {
		marginBottom: 20,
		borderBottom: "2 solid #333",
		paddingBottom: 15,
	},
	title: {
		fontSize: 16,
		fontWeight: "bold",
		textAlign: "center",
		marginBottom: 5,
	},
	subtitle: {
		fontSize: 9,
		textAlign: "center",
		color: "#666",
		marginBottom: 10,
	},
	section: {
		marginBottom: 15,
	},
	sectionTitle: {
		fontSize: 11,
		fontWeight: "bold",
		backgroundColor: "#f0f0f0",
		padding: "6 10",
		marginBottom: 10,
		marginTop: 5,
	},
	row: {
		flexDirection: "row",
		marginBottom: 5,
	},
	label: {
		fontWeight: "bold",
		width: "30%",
	},
	value: {
		flex: 1,
	},
	signature: {
		marginTop: 30,
		flexDirection: "row",
		justifyContent: "space-between",
	},
	signatureLine: {
		width: "45%",
		borderTopWidth: 1,
		borderTopColor: "#000",
		paddingTop: 10,
		textAlign: "center",
	},
	footer: {
		marginTop: 20,
		borderTopWidth: 1,
		borderTopColor: "#ccc",
		paddingTop: 10,
		fontSize: 8,
		textAlign: "center",
		color: "#666",
	},
});

function getTipoLabel(tipo: RelatorioMedicoData["tipo_relatorio"]) {
	switch (tipo) {
		case "inicial":
			return "RELATÓRIO DE AVALIAÇÃO INICIAL";
		case "evolucao":
			return "RELATÓRIO DE EVOLUÇÃO";
		case "alta":
			return "RELATÓRIO DE ALTA FISIOTERAPÊUTICA";
		case "interconsulta":
			return "SOLICITAÇÃO DE INTERCONSULTA";
		case "cirurgico":
			return "RELATÓRIO PRÉ/PÓS-OPERATÓRIO";
		default:
			return "RELATÓRIO FISIOTERAPÊUTICO";
	}
}

export function RelatorioMedicoPDF({ data }: { data: RelatorioMedicoData }) {
	return (
		<Document>
			<Page size="A4" style={styles.page}>
				<View style={styles.header}>
					<Text style={styles.title}>{getTipoLabel(data.tipo_relatorio)}</Text>
					<Text style={styles.subtitle}>
						Comunicação entre profissionais de saúde
					</Text>
					<Text style={styles.subtitle}>
						Data de emissão:{" "}
						{format(new Date(data.data_emissao), "dd/MM/yyyy", {
							locale: ptBR,
						})}
						{data.urgencia && ` - Urgência: ${data.urgencia.toUpperCase()}`}
					</Text>
				</View>

				<View style={styles.section}>
					<Text style={styles.sectionTitle}>CLÍNICA DE ORIGEM</Text>
					<View style={styles.row}>
						<Text style={styles.label}>Nome:</Text>
						<Text style={styles.value}>{data.clinica.nome}</Text>
					</View>
					{data.clinica.endereco && (
						<View style={styles.row}>
							<Text style={styles.label}>Endereço:</Text>
							<Text style={styles.value}>{data.clinica.endereco}</Text>
						</View>
					)}
				</View>

				<View style={styles.section}>
					<Text style={styles.sectionTitle}>PROFISSIONAL EMISSOR</Text>
					<View style={styles.row}>
						<Text style={styles.label}>Nome:</Text>
						<Text style={styles.value}>{data.profissional_emissor.nome}</Text>
					</View>
					<View style={styles.row}>
						<Text style={styles.label}>Registro:</Text>
						<Text style={styles.value}>
							{data.profissional_emissor.registro}
							{data.profissional_emissor.uf_registro &&
								`/${data.profissional_emissor.uf_registro}`}
						</Text>
					</View>
					<View style={styles.row}>
						<Text style={styles.label}>Especialidade:</Text>
						<Text style={styles.value}>
							{data.profissional_emissor.especialidade}
						</Text>
					</View>
				</View>

				{data.profissional_destino?.nome && (
					<View style={styles.section}>
						<Text style={styles.sectionTitle}>PROFISSIONAL DESTINATÁRIO</Text>
						<View style={styles.row}>
							<Text style={styles.label}>Nome:</Text>
							<Text style={styles.value}>{data.profissional_destino.nome}</Text>
						</View>
						{data.profissional_destino.especialidade && (
							<View style={styles.row}>
								<Text style={styles.label}>Especialidade:</Text>
								<Text style={styles.value}>
									{data.profissional_destino.especialidade}
								</Text>
							</View>
						)}
					</View>
				)}

				<View style={styles.section}>
					<Text style={styles.sectionTitle}>DADOS DO PACIENTE</Text>
					<View style={styles.row}>
						<Text style={styles.label}>Nome Completo:</Text>
						<Text style={styles.value}>{data.paciente.nome}</Text>
					</View>
					{data.paciente.cpf && (
						<View style={styles.row}>
							<Text style={styles.label}>CPF:</Text>
							<Text style={styles.value}>{data.paciente.cpf}</Text>
						</View>
					)}
					{data.paciente.data_nascimento && (
						<View style={styles.row}>
							<Text style={styles.label}>Data de Nascimento:</Text>
							<Text style={styles.value}>
								{format(new Date(data.paciente.data_nascimento), "dd/MM/yyyy", {
									locale: ptBR,
								})}
							</Text>
						</View>
					)}
				</View>

				{data.historico_clinico?.queixa_principal && (
					<View style={styles.section}>
						<Text style={styles.sectionTitle}>QUEIXA PRINCIPAL</Text>
						<Text>{data.historico_clinico.queixa_principal}</Text>
					</View>
				)}

				{data.avaliacao?.diagnostico_fisioterapeutico && (
					<View style={styles.section}>
						<Text style={styles.sectionTitle}>
							DIAGNÓSTICO FISIOTERAPÊUTICO
						</Text>
						<Text>{data.avaliacao.diagnostico_fisioterapeutico}</Text>
					</View>
				)}

				{data.resumo_tratamento && (
					<View style={styles.section}>
						<Text style={styles.sectionTitle}>RESUMO DO TRATAMENTO</Text>
						<Text>{data.resumo_tratamento}</Text>
					</View>
				)}

				{data.conduta_sugerida && (
					<View style={styles.section}>
						<Text style={styles.sectionTitle}>CONDUTA SUGERIDA</Text>
						<Text>{data.conduta_sugerida}</Text>
					</View>
				)}

				{data.recomendacoes && (
					<View style={styles.section}>
						<Text style={styles.sectionTitle}>RECOMENDAÇÕES</Text>
						<Text>{data.recomendacoes}</Text>
					</View>
				)}

				<View style={styles.signature}>
					<Text style={styles.signatureLine}>Assinatura do profissional</Text>
					<Text style={styles.signatureLine}>Data</Text>
				</View>

				<View style={styles.footer}>
					<Text>Documento gerado eletronicamente pelo FisioFlow</Text>
				</View>
			</Page>
		</Document>
	);
}
