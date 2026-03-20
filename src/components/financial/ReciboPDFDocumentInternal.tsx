import React from "react";
import {
	Document,
	Page,
	Text,
	View,
	Image,
	Font,
	StyleSheet,
} from "@react-pdf/renderer";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { valorPorExtenso } from "@/hooks/useRecibos";

Font.register({
	family: "Roboto",
	fonts: [
		{
			src: "https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Regular.ttf",
		},
		{
			src: "https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Bold.ttf",
			fontWeight: 700,
		},
		{
			src: "https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Italic.ttf",
			fontStyle: "italic",
		},
	],
});

const styles = StyleSheet.create({
	page: {
		padding: 40,
		fontFamily: "Roboto",
		backgroundColor: "#ffffff",
	},
	header: {
		marginBottom: 30,
		borderBottom: "2 solid #333",
		paddingBottom: 20,
	},
	title: {
		fontSize: 24,
		fontWeight: 700,
		textAlign: "center",
		marginBottom: 5,
	},
	subtitle: {
		fontSize: 12,
		textAlign: "center",
		color: "#666",
	},
	logoSection: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginBottom: 30,
	},
	logoPlaceholder: {
		width: 80,
		height: 80,
		backgroundColor: "#f0f0f0",
		borderRadius: 8,
		justifyContent: "center",
		alignItems: "center",
	},
	companyInfo: {
		flex: 1,
		marginLeft: 20,
	},
	companyName: {
		fontSize: 18,
		fontWeight: 700,
		marginBottom: 5,
	},
	companyDetails: {
		fontSize: 10,
		color: "#666",
		lineHeight: 1.5,
	},
	receiptNumber: {
		backgroundColor: "#f0f0f0",
		padding: 10,
		borderRadius: 5,
		marginBottom: 30,
	},
	receiptNumberText: {
		fontSize: 12,
		textAlign: "center",
	},
	section: {
		marginBottom: 25,
	},
	sectionTitle: {
		fontSize: 14,
		fontWeight: 700,
		marginBottom: 10,
		backgroundColor: "#f5f5f5",
		padding: 8,
		borderRadius: 4,
	},
	row: {
		flexDirection: "row",
		marginBottom: 8,
		fontSize: 11,
	},
	label: {
		fontWeight: 700,
		width: "30%",
		color: "#333",
	},
	value: {
		flex: 1,
		color: "#555",
	},
	amountSection: {
		backgroundColor: "#f9f9f9",
		padding: 15,
		borderRadius: 8,
		marginBottom: 25,
		border: "1 solid #e0e0e0",
	},
	amountRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginBottom: 5,
	},
	amountLabel: {
		fontSize: 11,
	},
	amountValue: {
		fontSize: 11,
		fontWeight: 700,
	},
	totalAmount: {
		fontSize: 18,
		fontWeight: 700,
		color: "#2563eb",
		marginTop: 10,
		paddingTop: 10,
		borderTop: "1 solid #ddd",
	},
	amountInWords: {
		fontSize: 10,
		fontStyle: "italic",
		color: "#666",
		marginTop: 8,
	},
	signatureSection: {
		marginTop: 40,
		flexDirection: "row",
		justifyContent: "space-between",
	},
	signatureBox: {
		width: "45%",
		borderTop: "1 solid #333",
		paddingTop: 10,
		textAlign: "center",
	},
	signatureText: {
		fontSize: 10,
		color: "#666",
	},
	stamp: {
		fontSize: 8,
		color: "#999",
		marginTop: 20,
		textAlign: "center",
	},
	footer: {
		position: "absolute",
		bottom: 40,
		left: 40,
		right: 40,
		borderTop: "1 solid #e0e0e0",
		paddingTop: 15,
	},
	footerText: {
		fontSize: 8,
		textAlign: "center",
		color: "#999",
	},
});

export interface ReciboData {
	numero: number;
	valor: number;
	valor_extenso?: string;
	referente: string;
	dataEmissao: Date | string;
	emitente: {
		nome: string;
		cpfCnpj?: string;
		telefone?: string;
		email?: string;
		endereco?: string;
	};
	pagador?: {
		nome: string;
		cpfCnpj?: string;
	};
	assinado?: boolean;
	logoUrl?: string;
}

const ReciboPDFDocumentInternal = ({ data }: { data: ReciboData }) => (
	<Document>
		<Page size="A4" style={styles.page}>
			{/* Header */}
			<View style={styles.header}>
				<Text style={styles.title}>RECIBO</Text>
				<Text style={styles.subtitle}>Comprovante de Pagamento</Text>
			</View>

			{/* Logo e Informações da Empresa */}
			<View style={styles.logoSection}>
				{data.logoUrl ? (
					<Image src={data.logoUrl} style={{ width: 80, height: 80 }} />
				) : (
					<View style={styles.logoPlaceholder}>
						<Text style={{ fontSize: 10, color: "#999" }}>Logo</Text>
					</View>
				)}
				<View style={styles.companyInfo}>
					<Text style={styles.companyName}>{data.emitente.nome}</Text>
					<Text style={styles.companyDetails}>
						{data.emitente.endereco || "Endereço não informado"}
						{"\n"}
						{data.emitente.telefone
							? `Telefone: ${data.emitente.telefone}`
							: ""}
						{data.emitente.email ? `Email: ${data.emitente.email}` : ""}
					</Text>
				</View>
			</View>

			{/* Número do Recibo */}
			<View style={styles.receiptNumber}>
				<Text style={styles.receiptNumberText}>
					Nº {data.numero.toString().padStart(6, "0")} - Emitido em{" "}
					{format(new Date(data.dataEmissao), "dd/MM/yyyy 'às' HH:mm", {
						locale: ptBR,
					})}
				</Text>
			</View>

			{/* Informações do Pagador */}
			{data.pagador && (
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>PAGADOR</Text>
					<View style={styles.row}>
						<Text style={styles.label}>Nome:</Text>
						<Text style={styles.value}>{data.pagador.nome}</Text>
					</View>
					{data.pagador.cpfCnpj && (
						<View style={styles.row}>
							<Text style={styles.label}>CPF/CNPJ:</Text>
							<Text style={styles.value}>{data.pagador.cpfCnpj}</Text>
						</View>
					)}
				</View>
			)}

			{/* Informações do Pagamento */}
			<View style={styles.section}>
				<Text style={styles.sectionTitle}>REFERENTE A</Text>
				<Text style={{ fontSize: 11, lineHeight: 1.6, color: "#555" }}>
					{data.referente}
				</Text>
			</View>

			{/* Valor */}
			<View style={styles.amountSection}>
				<View style={styles.amountRow}>
					<Text style={styles.amountLabel}>Valor Total:</Text>
					<Text style={styles.totalAmount}>
						R${" "}
						{data.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
					</Text>
				</View>
				<Text style={styles.amountInWords}>
					({valorPorExtenso(data.valor)})
				</Text>
			</View>

			{/* Informações do Emitente */}
			<View style={styles.section}>
				<Text style={styles.sectionTitle}>EMITENTE</Text>
				<View style={styles.row}>
					<Text style={styles.label}>Nome:</Text>
					<Text style={styles.value}>{data.emitente.nome}</Text>
				</View>
				{data.emitente.cpfCnpj && (
					<View style={styles.row}>
						<Text style={styles.label}>CPF/CNPJ:</Text>
						<Text style={styles.value}>{data.emitente.cpfCnpj}</Text>
					</View>
				)}
			</View>

			{/* Assinaturas */}
			<View style={styles.signatureSection}>
				<View style={styles.signatureBox}>
					<Text style={styles.signatureText}>{data.emitente.nome}</Text>
					<Text style={{ fontSize: 8, marginTop: 5, color: "#999" }}>
						Assinatura do Emitente
					</Text>
				</View>
				{data.pagador && (
					<View style={styles.signatureBox}>
						<Text style={styles.signatureText}>{data.pagador.nome}</Text>
						<Text style={{ fontSize: 8, marginTop: 5, color: "#999" }}>
							Assinatura do Pagador
						</Text>
					</View>
				)}
			</View>

			{/* Carimbo de Assinatura Digital */}
			{data.assinado && (
				<Text style={styles.stamp}>
					✓ Este recibo foi assinado digitalmente em{" "}
					{format(new Date(data.dataEmissao), "dd/MM/yyyy 'às' HH:mm", {
						locale: ptBR,
					})}
				</Text>
			)}

			{/* Footer */}
			<View style={styles.footer}>
				<Text style={styles.footerText}>
					Este recibo serve como comprovante de pagamento para todos os fins de
					direito. Documento emitido eletronicamente conforme Lei nº 14.063/2020
					(Brasil).
				</Text>
			</View>
		</Page>
	</Document>
);

export default ReciboPDFDocumentInternal;
