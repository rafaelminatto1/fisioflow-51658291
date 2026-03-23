import jsPDF from "jspdf";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { valorPorExtenso } from "@/hooks/useRecibos";
import type { ReciboData } from "@/components/financial/ReciboPDF";

export async function exportReceiptPdf(fileName: string, data: ReciboData) {
	const doc = new jsPDF({
		unit: "mm",
		format: "a4",
	});

	const pageWidth = doc.internal.pageSize.getWidth();
	const margin = 18;
	let y = 18;

	const line = (text: string, spacing = 6) => {
		doc.text(text, margin, y);
		y += spacing;
	};

	const sectionTitle = (text: string) => {
		doc.setFillColor(245, 245, 245);
		doc.rect(margin, y - 5, pageWidth - margin * 2, 8, "F");
		doc.setFont("helvetica", "bold");
		doc.setFontSize(11);
		doc.text(text, margin + 2, y);
		y += 10;
		doc.setFont("helvetica", "normal");
		doc.setFontSize(10);
	};

	doc.setFont("helvetica", "bold");
	doc.setFontSize(22);
	doc.text("RECIBO", pageWidth / 2, y, { align: "center" });
	y += 6;
	doc.setFontSize(10);
	doc.setFont("helvetica", "normal");
	doc.text("Comprovante de Pagamento", pageWidth / 2, y, { align: "center" });
	y += 10;

	doc.setDrawColor(51, 51, 51);
	doc.line(margin, y, pageWidth - margin, y);
	y += 12;

	doc.setFont("helvetica", "bold");
	doc.setFontSize(14);
	doc.text(data.emitente.nome, margin, y);
	doc.setFont("helvetica", "normal");
	doc.setFontSize(10);
	y += 6;
	const issuerLines = doc.splitTextToSize(
		[
			data.emitente.endereco || "Endereco nao informado",
			data.emitente.telefone ? `Telefone: ${data.emitente.telefone}` : "",
			data.emitente.email ? `Email: ${data.emitente.email}` : "",
		]
			.filter(Boolean)
			.join(" • "),
		pageWidth - margin * 2,
	);
	doc.text(issuerLines, margin, y);
	y += issuerLines.length * 5 + 6;

	doc.setFillColor(240, 240, 240);
	doc.roundedRect(margin, y - 4, pageWidth - margin * 2, 10, 2, 2, "F");
	doc.setFont("helvetica", "bold");
	doc.text(
		`Nº ${data.numero.toString().padStart(6, "0")} - Emitido em ${format(new Date(data.dataEmissao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
		pageWidth / 2,
		y + 2,
		{ align: "center" },
	);
	y += 16;

	if (data.pagador) {
		sectionTitle("PAGADOR");
		line(`Nome: ${data.pagador.nome}`);
		if (data.pagador.cpfCnpj) {
			line(`CPF/CNPJ: ${data.pagador.cpfCnpj}`);
		}
		y += 4;
	}

	sectionTitle("REFERENTE A");
	const referenteLines = doc.splitTextToSize(
		data.referente,
		pageWidth - margin * 2,
	);
	doc.text(referenteLines, margin, y);
	y += referenteLines.length * 5 + 8;

	doc.setFillColor(249, 249, 249);
	doc.roundedRect(margin, y - 4, pageWidth - margin * 2, 24, 3, 3, "F");
	doc.setDrawColor(224, 224, 224);
	doc.roundedRect(margin, y - 4, pageWidth - margin * 2, 24, 3, 3, "S");
	doc.setFont("helvetica", "normal");
	doc.text("Valor Total", margin + 4, y + 3);
	doc.setFont("helvetica", "bold");
	doc.setFontSize(16);
	doc.setTextColor(37, 99, 235);
	doc.text(
		`R$ ${data.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
		pageWidth - margin - 4,
		y + 3,
		{ align: "right" },
	);
	doc.setFontSize(9);
	doc.setTextColor(102, 102, 102);
	const extenso = data.valor_extenso || valorPorExtenso(data.valor);
	doc.text(`(${extenso})`, margin + 4, y + 11);
	y += 30;

	sectionTitle("EMITENTE");
	line(`Nome: ${data.emitente.nome}`);
	if (data.emitente.cpfCnpj) {
		line(`CPF/CNPJ: ${data.emitente.cpfCnpj}`);
	}
	y += 16;

	doc.setDrawColor(51, 51, 51);
	doc.line(margin, y, margin + 70, y);
	doc.line(pageWidth - margin - 70, y, pageWidth - margin, y);
	y += 6;
	doc.setFontSize(9);
	doc.setTextColor(102, 102, 102);
	doc.text(data.emitente.nome, margin + 35, y, { align: "center" });
	if (data.pagador) {
		doc.text(data.pagador.nome, pageWidth - margin - 35, y, {
			align: "center",
		});
	}
	y += 4;
	doc.text("Assinatura do Emitente", margin + 35, y, { align: "center" });
	if (data.pagador) {
		doc.text("Assinatura do Pagador", pageWidth - margin - 35, y, {
			align: "center",
		});
	}

	if (data.assinado) {
		y += 10;
		doc.text(
			`Este recibo foi assinado digitalmente em ${format(new Date(data.dataEmissao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
			pageWidth / 2,
			y,
			{ align: "center" },
		);
	}

	y = doc.internal.pageSize.getHeight() - 18;
	doc.setFontSize(8);
	doc.setTextColor(153, 153, 153);
	doc.text(
		"Este recibo serve como comprovante de pagamento para todos os fins de direito.",
		pageWidth / 2,
		y,
		{ align: "center" },
	);
	doc.text(
		"Documento emitido eletronicamente conforme Lei nº 14.063/2020 (Brasil).",
		pageWidth / 2,
		y + 4,
		{ align: "center" },
	);

	doc.save(fileName);
}
