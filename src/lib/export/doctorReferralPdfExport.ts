import jsPDF from "jspdf";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface DoctorReferralPdfData {
	patient: {
		name: string;
		birthDate: string;
		condition: string;
		lastSession: string;
	};
	clinic: {
		name: string;
		doctorName: string;
		crf: string;
		address: string;
		phone: string;
	};
	analysis: {
		summary: string;
		evolution: string;
		adherence: number;
		level: number;
		streaks: number;
	};
}

export async function exportDoctorReferralPdf(
	fileName: string,
	data: DoctorReferralPdfData,
) {
	const doc = new jsPDF({
		unit: "mm",
		format: "a4",
	});

	const pageWidth = doc.internal.pageSize.getWidth();
	const margin = 18;
	let y = 18;

	const line = (text: string, spacing = 7) => {
		doc.text(text, margin, y);
		y += spacing;
	};

	const sectionTitle = (text: string) => {
		doc.setFillColor(241, 245, 249);
		doc.rect(margin, y - 5, pageWidth - margin * 2, 8, "F");
		doc.setFont("helvetica", "bold");
		doc.setFontSize(11);
		doc.text(text, margin + 2, y);
		y += 10;
		doc.setFont("helvetica", "normal");
		doc.setFontSize(10);
	};

	doc.setFont("helvetica", "bold");
	doc.setFontSize(18);
	doc.text(data.clinic.name, margin, y);
	doc.setFontSize(10);
	doc.setFont("helvetica", "normal");
	y += 6;
	line("Centro de Reabilitacao Fisioterapeutica");
	line(format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }), 10);

	doc.setDrawColor(15, 23, 42);
	doc.line(margin, y, pageWidth - margin, y);
	y += 10;

	doc.setFont("helvetica", "bold");
	doc.setFontSize(15);
	doc.text("Relatorio de Encaminhamento e Evolucao", pageWidth / 2, y, {
		align: "center",
	});
	y += 12;

	sectionTitle("Dados do Paciente");
	line(`Nome: ${data.patient.name}`);
	line(`Nascimento: ${data.patient.birthDate}`);
	line(`Condicao: ${data.patient.condition}`);
	line(`Ultima sessao: ${data.patient.lastSession}`, 10);

	sectionTitle("Adesao ao Tratamento");
	line(
		`Adesao: ${data.analysis.adherence}% dos exercicios prescritos concluidos`,
	);
	line(
		`Engajamento: Nivel ${data.analysis.level} • ${data.analysis.streaks} dias seguidos de atividade`,
	);
	line("* Metricas coletadas via monitoramento remoto FisioFlow AI.", 10);

	sectionTitle("Parecer Clinico");
	const summaryLines = doc.splitTextToSize(
		data.analysis.summary,
		pageWidth - margin * 2,
	);
	doc.text(summaryLines, margin, y);
	y += summaryLines.length * 5 + 8;

	sectionTitle("Evolucao das Ultimas Sessoes");
	const evolutionLines = doc.splitTextToSize(
		data.analysis.evolution || "Evolucao registrada.",
		pageWidth - margin * 2,
	);
	doc.text(evolutionLines, margin, y);
	y += evolutionLines.length * 5 + 16;

	doc.setDrawColor(51, 65, 85);
	doc.line(margin + 90, y, pageWidth - margin - 10, y);
	y += 6;
	doc.setFont("helvetica", "bold");
	doc.text(`Dr(a). ${data.clinic.doctorName}`, pageWidth - margin - 10, y, {
		align: "right",
	});
	doc.setFont("helvetica", "normal");
	y += 5;
	doc.text(`Fisioterapeuta • CRF: ${data.clinic.crf}`, pageWidth - margin - 10, y, {
		align: "right",
	});

	y = doc.internal.pageSize.getHeight() - 18;
	doc.setFontSize(8);
	doc.setTextColor(148, 163, 184);
	doc.text(
		`${data.clinic.address} • ${data.clinic.phone}`,
		pageWidth / 2,
		y,
		{ align: "center" },
	);
	doc.text(
		"Documento gerado eletronicamente por FisioFlow AI Platform",
		pageWidth / 2,
		y + 4,
		{ align: "center" },
	);

	doc.save(fileName);
}
