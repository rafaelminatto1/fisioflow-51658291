import React, { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OptimizedImage } from "@/components/ui/OptimizedImage";
import { valorPorExtenso } from "@/hooks/useRecibos";

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
	disclaimer?: string;
	showDisclaimer?: boolean;
}

interface ReciboPDFProps {
	data: ReciboData;
	fileName?: string;
}

export const ReciboPDF: React.FC<ReciboPDFProps> = ({
	data,
	fileName = `recibo-${data.numero}`,
}) => {
	const [isGenerating, setIsGenerating] = useState(false);

	const handleDownload = async () => {
		setIsGenerating(true);
		try {
			const { exportReceiptPdf } = await import(
				"@/lib/export/receiptPdfExport"
			);
			await exportReceiptPdf(`${fileName}.pdf`, data);
		} finally {
			setIsGenerating(false);
		}
	};

	return (
		<div className="flex items-center gap-2">
			<Button
				variant="outline"
				size="sm"
				disabled={isGenerating}
				className="gap-2"
				onClick={() => void handleDownload()}
			>
				{isGenerating ? (
					<Loader2 className="h-4 w-4 animate-spin" />
				) : (
					<Download className="h-4 w-4" />
				)}
				{isGenerating ? "Gerando..." : "Baixar PDF"}
			</Button>
		</div>
	);
};

// Componente de preview do recibo - NÃO DEPENDE DE PDF RENDERER
export const ReciboPreview: React.FC<{ data: ReciboData }> = ({ data }) => {
	return (
		<div className="border rounded-lg p-8 bg-white max-w-2xl mx-auto shadow-lg">
			{/* Header */}
			<div className="text-center border-b-2 border-gray-300 pb-4 mb-6">
				<h1 className="text-2xl font-bold">RECIBO</h1>
				<p className="text-sm text-gray-500">Comprovante de Pagamento</p>
			</div>

			{/* Logo e Empresa */}
			<div className="flex items-start gap-4 mb-6">
				{data.logoUrl ? (
					<OptimizedImage
						src={data.logoUrl}
						alt="Logo"
						className="w-20 h-20 rounded-lg"
						aspectRatio="1:1"
					/>
				) : (
					<div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center">
						<span className="text-xs text-gray-500">Logo</span>
					</div>
				)}
				<div className="flex-1">
					<h2 className="text-lg font-bold">{data.emitente.nome}</h2>
					<p className="text-xs text-gray-500 whitespace-pre-line">
						{data.emitente.endereco || ""}
					</p>
					{data.emitente.telefone && (
						<p className="text-xs text-gray-500">
							Tel: {data.emitente.telefone}
						</p>
					)}
					{data.emitente.email && (
						<p className="text-xs text-gray-500">
							Email: {data.emitente.email}
						</p>
					)}
				</div>
			</div>

			{/* Número */}
			<div className="bg-gray-100 rounded p-3 text-center text-sm mb-6">
				Nº {data.numero.toString().padStart(6, "0")}
				{data.dataEmissao && (
					<>
						{" "} - Emitido em{" "}
						{format(new Date(data.dataEmissao), "dd/MM/yyyy 'às' HH:mm", {
							locale: ptBR,
						})}
					</>
				)}
			</div>

			{/* Pagador */}
			{data.pagador && (
				<div className="mb-6">
					<h3 className="text-sm font-bold bg-gray-50 p-2 rounded mb-2">
						PAGADOR
					</h3>
					<p className="text-sm">
						<span className="font-semibold">Nome:</span> {data.pagador.nome}
					</p>
					{data.pagador.cpfCnpj && (
						<p className="text-sm">
							<span className="font-semibold">CPF/CNPJ:</span>{" "}
							{data.pagador.cpfCnpj}
						</p>
					)}
				</div>
			)}

			{/* Referente a */}
			<div className="mb-6">
				<h3 className="text-sm font-bold bg-gray-50 p-2 rounded mb-2">
					REFERENTE A
				</h3>
				<p className="text-sm text-gray-700 leading-relaxed">
					{data.referente}
				</p>
			</div>

			{/* Valor */}
			<div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200">
				<div className="flex justify-between items-center">
					<span className="text-sm">Valor Total:</span>
					<span className="text-2xl font-bold text-blue-600">
						R${" "}
						{data.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
					</span>
				</div>
				<p className="text-xs text-gray-500 italic mt-2">
					({valorPorExtenso(data.valor)})
				</p>
			</div>

			{/* Emitente */}
			<div className="mb-8">
				<h3 className="text-sm font-bold bg-gray-50 p-2 rounded mb-2">
					EMITENTE
				</h3>
				<p className="text-sm">
					<span className="font-semibold">Nome:</span> {data.emitente.nome}
				</p>
				{data.emitente.cpfCnpj && (
					<p className="text-sm">
						<span className="font-semibold">CPF/CNPJ:</span>{" "}
						{data.emitente.cpfCnpj}
					</p>
				)}
			</div>

			{/* Assinaturas */}
			<div className="flex justify-between mb-6">
				<div className="w-[45%] border-t border-gray-800 pt-2 text-center">
					<p className="text-sm font-medium">{data.emitente.nome}</p>
					<p className="text-xs text-gray-500">Assinatura do Emitente</p>
				</div>
				{data.pagador && (
					<div className="w-[45%] border-t border-gray-800 pt-2 text-center">
						<p className="text-sm font-medium">{data.pagador.nome}</p>
						<p className="text-xs text-gray-500">Assinatura do Pagador</p>
					</div>
				)}
			</div>

			{data.assinado && (
				<div className="text-center text-xs text-gray-500 mb-4">
					✓ Este recibo foi assinado digitalmente em{" "}
					{format(new Date(data.dataEmissao), "dd/MM/yyyy 'às' HH:mm", {
						locale: ptBR,
					})}
				</div>
			)}

			{data.showDisclaimer !== false && (
				<div className="text-center text-xs text-gray-500 border-t pt-4">
					{data.disclaimer ||
						"Este recibo serve como comprovante de pagamento para todos os fins de direito. Documento emitido eletronicamente conforme Lei nº 14.063/2020 (Brasil)."}
				</div>
			)}
		</div>
	);
};

export default ReciboPDF;
