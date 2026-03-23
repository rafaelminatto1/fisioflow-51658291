import React, { useState } from "react";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Brain,
	Upload,
	FileText,
	Loader2,
	Sparkles,
	CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { aiApi } from "@/api/v2";

const SPECIALTIES = [
	"Traumato-ortopedia",
	"Pilates",
	"Neurologia",
	"Geriatria",
	"Pediatria",
	"Esportiva",
	"Cardiorrespiratória",
	"Saúde da Mulher",
];

const BODY_PARTS = [
	"Joelho",
	"Coluna",
	"Ombro",
	"Quadril",
	"Tornozelo",
	"Mão/Punho",
	"Pé",
	"Geral",
];

const CONTENT_TYPES = [
	"Artigo Científico",
	"Protocolo Interno",
	"Diretriz Clínica",
	"Caso Clínico",
	"Outro",
];

export function ClinicalImportIA() {
	const [loading, setLoading] = useState(false);
	const [success, setSuccess] = useState(false);
	const [content, setContent] = useState("");
	const [metadata, setMetadata] = useState({
		specialty: "",
		body_part: "",
		content_type: "",
	});

	const handleImport = async () => {
		if (!content.trim() || !metadata.specialty || !metadata.body_part) {
			toast.error("Por favor, preencha o conteúdo e os metadados básicos.");
			return;
		}

		setLoading(true);
		try {
			// Usando o endpoint de ingestão via Worker (precisamos garantir que ele exista ou simular via serviço)
			// Para fins desta implementação, vamos enviar para uma rota que processa e salva no Vectorize
			const response = await fetch(
				`${import.meta.env.VITE_WORKERS_API_URL}/api/ai/ingest`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						text: content,
						metadata: {
							...metadata,
							source: "wiki-upload",
							timestamp: new Date().toISOString(),
						},
					}),
				},
			);

			if (!response.ok) throw new Error("Falha na importação");

			setSuccess(true);
			toast.success("Conhecimento clínico importado com sucesso para a IA!");
			setContent("");
			setTimeout(() => setSuccess(false), 5000);
		} catch (error) {
			console.error(error);
			toast.error("Erro ao importar conhecimento para a IA.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<Card className="border-primary/20 shadow-md bg-gradient-to-br from-background to-primary/5">
			<CardHeader>
				<div className="flex items-center gap-3">
					<div className="p-2 bg-primary/10 rounded-lg">
						<Brain className="h-5 w-5 text-primary" />
					</div>
					<div>
						<CardTitle>Importação Clínica IA</CardTitle>
						<CardDescription>
							Alimente o "Cérebro" do sistema com artigos e protocolos internos.
						</CardDescription>
					</div>
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					<div className="space-y-2">
						<Label className="text-xs font-bold uppercase text-muted-foreground">
							Especialidade
						</Label>
						<Select
							onValueChange={(v) =>
								setMetadata((prev) => ({ ...prev, specialty: v }))
							}
						>
							<SelectTrigger>
								<SelectValue placeholder="Selecione..." />
							</SelectTrigger>
							<SelectContent>
								{SPECIALTIES.map((s) => (
									<SelectItem key={s} value={s}>
										{s}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-2">
						<Label className="text-xs font-bold uppercase text-muted-foreground">
							Parte do Corpo
						</Label>
						<Select
							onValueChange={(v) =>
								setMetadata((prev) => ({ ...prev, body_part: v }))
							}
						>
							<SelectTrigger>
								<SelectValue placeholder="Selecione..." />
							</SelectTrigger>
							<SelectContent>
								{BODY_PARTS.map((b) => (
									<SelectItem key={b} value={b}>
										{b}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-2">
						<Label className="text-xs font-bold uppercase text-muted-foreground">
							Tipo de Conteúdo
						</Label>
						<Select
							onValueChange={(v) =>
								setMetadata((prev) => ({ ...prev, content_type: v }))
							}
						>
							<SelectTrigger>
								<SelectValue placeholder="Selecione..." />
							</SelectTrigger>
							<SelectContent>
								{CONTENT_TYPES.map((t) => (
									<SelectItem key={t} value={t}>
										{t}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>

				<div className="space-y-2">
					<Label className="text-xs font-bold uppercase text-muted-foreground">
						Conteúdo Clínico (Texto ou Resumo)
					</Label>
					<Textarea
						placeholder="Cole aqui o texto do artigo, protocolo ou diretriz clínica..."
						className="min-h-[200px] bg-background/50"
						value={content}
						onChange={(e) => setContent(e.target.value)}
					/>
				</div>

				<div className="flex items-center justify-between pt-2">
					<div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium italic">
						<Sparkles className="h-3 w-3 text-amber-500" />
						Este conteúdo será processado via Cloudflare AI Gateway e salvo no
						banco vetorial.
					</div>
					<Button
						onClick={handleImport}
						disabled={loading || success}
						className="gap-2"
					>
						{loading ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : success ? (
							<CheckCircle2 className="h-4 w-4" />
						) : (
							<Upload className="h-4 w-4" />
						)}
						{loading
							? "Processando..."
							: success
								? "Importado!"
								: "Alimentar IA"}
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
