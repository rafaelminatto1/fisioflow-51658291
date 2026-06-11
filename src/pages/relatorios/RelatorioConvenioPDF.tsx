import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
	Document,
	Font,
	Page,
	StyleSheet,
	Text,
	View,
} from "@react-pdf/renderer";
import type { RelatorioConvenioData } from "./RelatorioConvenioPage";

Font.register({
	family: "Helvetica",
});

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
		width: "35%",
	},
	value: {
		flex: 1,
	},
	table: {
		width: "100%",
		borderWidth: 1,
		borderColor: "#000",
		marginBottom: 10,
	},
	tableRow: {
		flexDirection: "row",
		borderBottomWidth: 1,
		borderBottomColor: "#000",
		padding: 5,
	},
	tableCell: {
		flex: 1,
	},
	tableHeader: {
		backgroundColor: "#f0f0f0",
		fontWeight: "bold",
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
		position: "absolute",
		bottom: 30,
		left: 30,
		right: 30,
		borderTopWidth: 1,
		borderTopColor: "#ccc",
		paddingTop: 10,
		fontSize: 8,
		textAlign: "center",
		color: "#666",
	},
});

export function RelatorioConvenioPDF({
	data,
}: {
	data: RelatorioConvenioData;
}) {
	return (
		<Document>
			<Page size="A4" style={styles.page}>
				<View style={styles.header}>
					<Text style={styles.title}>
						RELATÓRIO DE ATENDIMENTO FISIOTERAPÊUTICO
					</Text>
					<Text style={styles.subtitle}>
						Para fins de reembolso junto a convênios médicos
					</Text>
					<Text style={styles.subtitle}>
						Data de emissão:{" "}
						{format(new Date(data.data_emissao), "dd/MM/yyyy", {
							locale: ptBR,
						})}
					</Text>
				</View>

				<View style={styles.section}>
					<Text style={styles.sectionTitle}>DADOS DA CLÍNICA</Text>
					<View style={styles.row}>
						<Text style={styles.label}>Razão Social:</Text>
						<Text style={styles.value}>{data.clinica.nome}</Text>
					</View>
					<View style={styles.row}>
						<Text style={styles.label}>CNPJ:</Text>
						<Text style={styles.value}>{data.clinica.cnpj}</Text>
					</View>
					<View style={styles.row}>
						<Text style={styles.label}>Endereço:</Text>
						<Text style={styles.value}>{data.clinica.endereco}</Text>
					</View>
					<View style={styles.row}>
						<Text style={styles.label}>Telefone:</Text>
						<Text style={styles.value}>{data.clinica.telefone}</Text>
					</View>
				</View>

				<View style={styles.section}>
					<Text style={styles.sectionTitle}>DADOS DO CONVÊNIO</Text>
					<View style={styles.row}>
						<Text style={styles.label}>Nome:</Text>
						<Text style={styles.value}>{data.convenio.nome}</Text>
					</View>
					<View style={styles.row}>
						<Text style={styles.label}>CNPJ:</Text>
						<Text style={styles.value}>{data.convenio.cnpj}</Text>
					</View>
					<View style={styles.row}>
						<Text style={styles.label}>Registro ANS:</Text>
						<Text style={styles.value}>{data.convenio.ans}</Text>
					</View>
				</View>

				<View style={styles.section}>
					<Text style={styles.sectionTitle}>
						DADOS DO PROFISSIONAL RESPONSÁVEL
					</Text>
					<View style={styles.row}>
						<Text style={styles.label}>Nome:</Text>
						<Text style={styles.value}>{data.profissional.nome}</Text>
					</View>
					<View style={styles.row}>
						<Text style={styles.label}>CPF:</Text>
						<Text style={styles.value}>{data.profissional.cpf}</Text>
					</View>
					{data.profissional.registro_profissional && (
						<View style={styles.row}>
							<Text style={styles.label}>Registro:</Text>
							<Text style={styles.value}>
								{data.profissional.registro_profissional}
								{data.profissional.uf_registro &&
									`/${data.profissional.uf_registro}`}
							</Text>
						</View>
					)}
				</View>

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
					{data.paciente.numero_convenio && (
						<View style={styles.row}>
							<Text style={styles.label}>Número do Convênio:</Text>
							<Text style={styles.value}>{data.paciente.numero_convenio}</Text>
						</View>
					)}
					{data.paciente.carteirinha && (
						<View style={styles.row}>
							<Text style={styles.label}>Carteirinha:</Text>
							<Text style={styles.value}>{data.paciente.carteirinha}</Text>
						</View>
					)}
				</View>

				<View style={styles.section}>
					<Text style={styles.sectionTitle}>ATENDIMENTOS REALIZADOS</Text>
					<View style={styles.table}>
						<View style={[styles.tableRow, styles.tableHeader]}>
							<Text style={styles.tableCell}>Data</Text>
							<Text style={styles.tableCell}>Tipo</Text>
							<Text style={styles.tableCell}>Sessão</Text>
						</View>
						{data.atendimentos.map((atendimento, index) => (
							<View
								key={`${atendimento.data}-${index}`}
								style={styles.tableRow}
							>
								<Text style={styles.tableCell}>
									{format(new Date(atendimento.data), "dd/MM/yyyy", {
										locale: ptBR,
									})}
								</Text>
								<Text style={styles.tableCell}>{atendimento.tipo}</Text>
								<Text style={styles.tableCell}>
									{atendimento.sessao_atual}/{atendimento.numero_sessoes}
								</Text>
							</View>
						))}
					</View>
				</View>

				{data.evolucao && (
					<View style={styles.section}>
						<Text style={styles.sectionTitle}>EVOLUÇÃO</Text>
						<Text>{data.evolucao}</Text>
					</View>
				)}

				{data.prognostico && (
					<View style={styles.section}>
						<Text style={styles.sectionTitle}>PROGNÓSTICO</Text>
						<Text>{data.prognostico}</Text>
					</View>
				)}

				{data.conduta && (
					<View style={styles.section}>
						<Text style={styles.sectionTitle}>CONDUTA</Text>
						<Text>{data.conduta}</Text>
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
