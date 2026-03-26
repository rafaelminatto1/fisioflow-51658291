import { useState } from "react";
import { cn } from "@/lib/utils";
import {
	useWhatsAppTemplates,
	useUpdateWhatsAppTemplate,
} from "@/hooks/useWhatsAppTemplates";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Save, RefreshCw, FileText, CheckCircle2 } from "lucide-react";

export function TemplateManager() {
	const { data: templates = [], isLoading } = useWhatsAppTemplates();
	const updateTemplate = useUpdateWhatsAppTemplate();
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [editContent, setEditContent] = useState("");

	const selectedTemplate = templates.find((t) => t.id === selectedId);

	const handleSelect = (template: any) => {
		setSelectedId(template.id);
		setEditContent(template.content);
	};

	const handleSave = async () => {
		if (!selectedId) return;
		await updateTemplate.mutateAsync({
			id: selectedId,
			content: editContent,
		});
	};

	return (
		<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
			{/* Left: Template List */}
			<Card className="col-span-1 h-[calc(100vh-16rem)] flex flex-col">
				<CardHeader className="pb-3">
					<CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground">
						Meus Templates
					</CardTitle>
				</CardHeader>
				<ScrollArea className="flex-1">
					<div className="p-2 space-y-1">
						{isLoading ? (
							[1, 2, 3].map((i) => (
								<Skeleton key={i} className="h-16 w-full rounded-xl" />
							))
						) : templates.length === 0 ? (
							<p className="text-center p-8 text-xs text-muted-foreground uppercase font-bold tracking-widest">
								Nenhum template encontrado
							</p>
						) : (
							templates.map((t) => (
								<button
									key={t.id}
									onClick={() => handleSelect(t)}
									className={cn(
										"w-full text-left p-3 rounded-xl transition-all",
										selectedId === t.id
											? "bg-primary text-primary-foreground shadow-md"
											: "hover:bg-accent",
									)}
								>
									<div className="flex items-center gap-2 mb-1">
										<FileText className="h-3 w-3" />
										<span className="text-xs font-black uppercase tracking-tight truncate">
											{t.name}
										</span>
									</div>
									<p
										className={cn(
											"text-[10px] line-clamp-1 opacity-70",
											selectedId === t.id
												? "text-primary-foreground"
												: "text-muted-foreground",
										)}
									>
										{t.content}
									</p>
								</button>
							))
						)}
					</div>
				</ScrollArea>
			</Card>

			{/* Right: Editor */}
			<Card className="col-span-1 md:col-span-2 h-[calc(100vh-16rem)] flex flex-col">
				{selectedTemplate ? (
					<>
						<CardHeader className="border-b bg-muted/20">
							<div className="flex items-center justify-between">
								<div className="space-y-1">
									<CardTitle className="text-lg font-black tracking-tight">
										{selectedTemplate.name}
									</CardTitle>
									<div className="flex items-center gap-2">
										<Badge
											variant="outline"
											className="text-[10px] font-black uppercase tracking-widest"
										>
											{selectedTemplate.category}
										</Badge>
										<Badge className="text-[10px] font-black uppercase tracking-widest bg-green-500/10 text-green-600 border-green-500/20">
											Ativo
										</Badge>
									</div>
								</div>
								<Button
									onClick={handleSave}
									disabled={
										updateTemplate.isPending ||
										editContent === selectedTemplate.content
									}
									className="rounded-xl font-black uppercase text-[10px] tracking-widest gap-2"
								>
									{updateTemplate.isPending ? (
										<RefreshCw className="h-3 w-3 animate-spin" />
									) : (
										<Save className="h-3 w-3" />
									)}
									Salvar Alterações
								</Button>
							</div>
						</CardHeader>
						<CardContent className="flex-1 p-6 space-y-6">
							<div className="space-y-3">
								<div className="flex items-center justify-between">
									<label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
										Conteúdo da Mensagem
									</label>
									<div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-500/10 text-amber-600 border border-amber-500/20">
										<CheckCircle2 className="h-3 w-3" />
										<span className="text-[9px] font-black uppercase tracking-tighter">
											Variáveis suportadas: {"{{name}}"}, {"{{date}}"},{" "}
											{"{{time}}"}
										</span>
									</div>
								</div>
								<Textarea
									value={editContent}
									onChange={(e) => setEditContent(e.target.value)}
									className="min-h-[200px] text-sm leading-relaxed rounded-2xl border-border/40 focus:ring-primary/20 resize-none font-medium"
									placeholder="Escreva o conteúdo do template aqui..."
								/>
							</div>

							<div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-border/40 space-y-2">
								<h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
									Dica de Especialista
								</h4>
								<p className="text-xs text-muted-foreground leading-relaxed">
									Mantenha suas mensagens curtas e diretas. O uso de emojis
									ajuda a humanizar o contato clínico, mas não exagere.
									Lembre-se que o WhatsApp é um canal de alta prioridade para o
									paciente.
								</p>
							</div>
						</CardContent>
					</>
				) : (
					<div className="flex-1 flex flex-col items-center justify-center text-center p-12 space-y-4">
						<div className="w-16 h-16 bg-muted rounded-3xl flex items-center justify-center opacity-30">
							<FileText className="h-8 w-8" />
						</div>
						<div className="max-w-xs space-y-1">
							<p className="text-sm font-black uppercase tracking-tight">
								Selecione um template
							</p>
							<p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest leading-relaxed">
								Escolha um template à esquerda para editar seu conteúdo ou
								gerenciar sua disponibilidade.
							</p>
						</div>
					</div>
				)}
			</Card>
		</div>
	);
}
