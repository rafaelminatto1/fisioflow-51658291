/**
 * TemplateSelector - Quick insert buttons for common SOAP structures
 *
 * Features:
 * - Rich Notion-style templates loaded lazily from notion-templates.ts
 * - Templates for common visit types (Post-op, Chronic Pain, Sports Injury, etc.)
 * - Customizable by therapist
 * - Fuzzy search in templates (strips HTML for searching rich content)
 * - Category emoji badges with colored variants
 * - One-click template application
 */

import React, { useState, useMemo } from "react";
import { FileText, Plus, ChevronDown, Search, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

export interface SOAPTemplate {
	id: string;
	name: string;
	category: "initial" | "followup" | "procedure" | "discharge" | "custom";
	subjective: string;
	objective: string;
	assessment: string;
	plan: string;
	isFavorite?: boolean;
	usageCount?: number;
}

interface TemplateSelectorProps {
	onSelect: (template: SOAPTemplate) => void;
	onCreate?: () => void;
	onManage?: () => void;
	onToggleFavorite?: (templateId: string) => void;
	customTemplates?: SOAPTemplate[];
	disabled?: boolean;
	className?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Category metadata helpers
// ─────────────────────────────────────────────────────────────────────────────
const CATEGORY_META: Record<
	string,
	{ label: string; emoji: string; color: string; badgeClass: string }
> = {
	initial: {
		label: "1ª Consulta",
		emoji: "🆕",
		color: "text-sky-600",
		badgeClass:
			"border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-300",
	},
	followup: {
		label: "Retorno",
		emoji: "🔄",
		color: "text-emerald-600",
		badgeClass:
			"border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
	},
	procedure: {
		label: "Procedimento",
		emoji: "⚕️",
		color: "text-amber-600",
		badgeClass:
			"border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300",
	},
	discharge: {
		label: "Alta",
		emoji: "✅",
		color: "text-teal-600",
		badgeClass:
			"border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-800 dark:bg-teal-950 dark:text-teal-300",
	},
	custom: {
		label: "Personalizado",
		emoji: "⭐",
		color: "text-rose-600",
		badgeClass:
			"border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300",
	},
};

// ─────────────────────────────────────────────────────────────────────────────
// Strip HTML from rich template content for preview and search
// ─────────────────────────────────────────────────────────────────────────────
function stripHtml(html: string): string {
	return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// Legacy plain-text templates (kept for backwards compat)
// ─────────────────────────────────────────────────────────────────────────────
const LEGACY_TEMPLATES: SOAPTemplate[] = [
	{
		id: "post-op-day1",
		name: "Pós-operatório – Dia 1",
		category: "procedure",
		subjective:
			"Paciente refere dor moderada na região operada. Relata que a anestesia está passando. Nega náuseas ou vômitos.",
		objective:
			"Sinais vitais estáveis: PA 120/80 mmHg, FC 72 bpm, SatO2 98%. Ferida limpa e seca, curativo intacto.",
		assessment:
			"Paciente em pós-operatório imediato, evolução favorável. Dor controlada com analgésicos prescritos.",
		plan: "1. Manter curativo limpo e seco\n2. Repouso absoluto por 24h\n3. Analgésicos VO 6/6h\n4. Retorno em 24h para avaliação",
		usageCount: 0,
	},
	{
		id: "sports-injury",
		name: "Lesão Esportiva",
		category: "initial",
		subjective:
			"Atleta refere dor aguda em tornozelo direito após entorse em jogo. Relata edema local e incapacidade de deambular.",
		objective:
			"Tornozelo direito com edema moderado (++). Dor à palpação lateral e anterior 6/10. Instabilidade ligamentar positiva. Amplitude de movimento reduzida.",
		assessment:
			"Entorse de tornozelo direito com possível envolvimento ligamentar. Edema indica resposta inflamatória aguda. Repouso obrigatório.",
		plan: "1. Protocolo RICE (Repouso, Gelo, Compressão, Elevação)\n2. Imobilização com tala\n3. Fortalecimento de eversores\n4. Retorno gradual ao esporte",
		usageCount: 0,
	},
	{
		id: "standard-followup",
		name: "Retorno Padrão",
		category: "followup",
		subjective:
			"Paciente relata melhora significativa desde última sessão. Dor reduzida de 7/10 para 4/10. Maior amplitude de movimento.",
		objective:
			"Testes funcionais melhorados. Dor à palpação 3/10. Força muscular aumentada. Amplitude de movimento dentro da normalidade.",
		assessment:
			"Resposta favorável ao tratamento. Progresso funcional satisfatório. Pode iniciar fase de reabilitação específica.",
		plan: "1. Manter protocolo atual\n2. Aumentar intensidade dos exercícios\n3. Adicionar exercícios funcionais\n4. Retorno em 1 semana",
		usageCount: 0,
	},
];

// ─────────────────────────────────────────────────────────────────────────────
// Lazy-load the rich Notion templates (avoids potential circular deps)
// ─────────────────────────────────────────────────────────────────────────────
let _richTemplatesCache: SOAPTemplate[] | null = null;

async function getRichTemplates(): Promise<SOAPTemplate[]> {
	if (_richTemplatesCache) return _richTemplatesCache;
	try {
		const mod = await import("./notion-templates");
		_richTemplatesCache = mod.NOTION_TEMPLATES;
	} catch {
		_richTemplatesCache = [];
	}
	return _richTemplatesCache;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
	onSelect,
	onCreate,
	onManage,
	onToggleFavorite,
	customTemplates = [],
	disabled = false,
	className,
}) => {
	const [open, setOpen] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
	const [richTemplates, setRichTemplates] = useState<SOAPTemplate[]>([]);
	const [loadingRich, setLoadingRich] = useState(false);

	// Load rich templates when popover opens for the first time
	const handleOpenChange = (next: boolean) => {
		setOpen(next);
		if (next && richTemplates.length === 0 && !loadingRich) {
			setLoadingRich(true);
			getRichTemplates().then((tpls) => {
				setRichTemplates(tpls);
				setLoadingRich(false);
			});
		}
	};

	// Combine all template sources: rich → legacy → custom
	const allTemplates = useMemo(() => {
		return [...richTemplates, ...LEGACY_TEMPLATES, ...customTemplates];
	}, [richTemplates, customTemplates]);

	// Filter templates by search and category (HTML-aware)
	const filteredTemplates = useMemo(() => {
		return allTemplates.filter((template) => {
			const searchIn = [
				template.name,
				stripHtml(template.subjective),
				stripHtml(template.assessment),
				stripHtml(template.objective),
			]
				.join(" ")
				.toLowerCase();

			const matchesSearch =
				!searchQuery || searchIn.includes(searchQuery.toLowerCase());

			const matchesCategory =
				!selectedCategory || template.category === selectedCategory;

			return matchesSearch && matchesCategory;
		});
	}, [allTemplates, searchQuery, selectedCategory]);

	const categories = [
		{
			id: "initial",
			...CATEGORY_META.initial,
			count: allTemplates.filter((t) => t.category === "initial").length,
		},
		{
			id: "followup",
			...CATEGORY_META.followup,
			count: allTemplates.filter((t) => t.category === "followup").length,
		},
		{
			id: "procedure",
			...CATEGORY_META.procedure,
			count: allTemplates.filter((t) => t.category === "procedure").length,
		},
		{
			id: "discharge",
			...CATEGORY_META.discharge,
			count: allTemplates.filter((t) => t.category === "discharge").length,
		},
		{
			id: "custom",
			...CATEGORY_META.custom,
			count: customTemplates.length,
		},
	];

	const handleSelectTemplate = (template: SOAPTemplate) => {
		if (import.meta.env.DEV) {
			console.debug(
				"[TemplateSelector] Selected template",
				template.id,
				template.name,
			);
		}
		onSelect(template);
		setOpen(false);
		setSearchQuery("");
	};

	const handleCreateTemplate = () => {
		onCreate?.();
		setOpen(false);
	};

	const handleManageTemplates = () => {
		onManage?.();
		setOpen(false);
	};

	return (
		<div className={cn("template-selector", className)}>
			<Popover open={open} onOpenChange={handleOpenChange}>
				<PopoverTrigger asChild>
					<Button
						variant="ghost"
						size="sm"
						className="gap-2 text-muted-foreground hover:bg-muted/50"
						disabled={disabled}
					>
						<FileText className="h-4 w-4" />
						<span>Templates SOAP</span>
						<ChevronDown className="h-4 w-4" />
					</Button>
				</PopoverTrigger>
				<PopoverContent
					className="w-[540px] p-0 max-h-[min(85vh,700px)] flex flex-col shadow-xl border border-border/80"
					align="end"
				>
					{/* Header */}
					<div className="px-4 pt-4 pb-3 border-b border-border">
						<div className="flex items-center justify-between mb-3">
							<div>
								<h3 className="text-sm font-semibold text-foreground">
									Templates Clínicos
								</h3>
								<p className="text-[11px] text-muted-foreground">
									{allTemplates.length} templates disponíveis
									{loadingRich && " · Carregando..."}
								</p>
							</div>
						</div>

						{/* Search bar */}
						<div className="relative">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
							<input
								type="text"
								placeholder="Buscar por nome, técnica ou condição..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="pl-10 w-full h-9 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
								aria-label="Buscar templates"
							/>
						</div>
					</div>

					{/* Category filters */}
					<div className="flex gap-1 px-3 py-2 border-b border-border overflow-x-auto scrollbar-none">
						<button
							type="button"
							onClick={() => setSelectedCategory(null)}
							className={cn(
								"shrink-0 px-3 py-1 text-xs rounded-full font-medium transition-colors",
								!selectedCategory
									? "bg-foreground text-background"
									: "bg-muted/60 text-muted-foreground hover:bg-muted",
							)}
						>
							Todos · {allTemplates.length}
						</button>
						{categories.map((cat) => (
							<button
								key={cat.id}
								type="button"
								onClick={() =>
									setSelectedCategory(
										cat.id === selectedCategory ? null : cat.id,
									)
								}
								className={cn(
									"shrink-0 flex items-center gap-1.5 px-3 py-1 text-xs rounded-full font-medium transition-colors",
									selectedCategory === cat.id
										? "bg-foreground text-background"
										: "bg-muted/60 text-muted-foreground hover:bg-muted",
								)}
							>
								<span>{cat.emoji}</span>
								<span>{cat.label}</span>
								<span className="opacity-60">· {cat.count}</span>
							</button>
						))}
					</div>

					{/* Template list */}
					<div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1">
						{filteredTemplates.length === 0 ? (
							<div className="text-center py-10 text-muted-foreground">
								<FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
								<p className="text-sm font-medium">Nenhum template encontrado</p>
								<p className="text-xs mt-1 opacity-60">
									Tente outro termo de busca ou categoria
								</p>
							</div>
						) : (
							filteredTemplates.map((template) => {
								const meta =
									CATEGORY_META[template.category] ?? CATEGORY_META.custom;
								const subjectivePreview = stripHtml(template.subjective);
								return (
									<div
										key={template.id}
										onClick={() => !disabled && handleSelectTemplate(template)}
										data-testid={`soap-template-${template.id}`}
										className={cn(
											"group flex items-start gap-3 p-3 rounded-lg border border-transparent hover:border-border hover:bg-muted/40 cursor-pointer transition-all",
											disabled && "opacity-50 cursor-not-allowed",
										)}
									>
										{/* Emoji icon */}
										<span className="text-xl mt-0.5 select-none flex-shrink-0">
											{meta.emoji}
										</span>

										{/* Template info */}
										<div className="flex-1 min-w-0">
											<div className="flex items-center gap-2 mb-1">
												<h4 className="font-semibold text-foreground text-sm truncate">
													{template.name}
												</h4>
												{template.isFavorite && (
													<Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 flex-shrink-0" />
												)}
											</div>

											<div className="flex items-center gap-1.5 mb-1.5">
												<Badge
													variant="outline"
													className={cn(
														"text-[10px] px-1.5 py-0 h-4 rounded-sm font-medium",
														meta.badgeClass,
													)}
												>
													{meta.label}
												</Badge>
												{template.usageCount && template.usageCount > 0 && (
													<span className="text-[10px] text-muted-foreground">
														{template.usageCount}x usado
													</span>
												)}
											</div>

											<p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
												{subjectivePreview.slice(0, 120)}
												{subjectivePreview.length > 120 ? "..." : ""}
											</p>
										</div>

										{/* Favorite action */}
										{onToggleFavorite && (
											<button
												type="button"
												onClick={(e) => {
													e.stopPropagation();
													onToggleFavorite(template.id);
												}}
												className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-muted transition-all flex-shrink-0"
												aria-label={
													template.isFavorite
														? "Remover dos favoritos"
														: "Adicionar aos favoritos"
												}
											>
												<Star
													className={cn(
														"h-4 w-4",
														template.isFavorite
															? "text-amber-500 fill-amber-500"
															: "text-muted-foreground",
													)}
												/>
											</button>
										)}
									</div>
								);
							})
						)}
					</div>

					{/* Footer actions */}
					{(onCreate || onManage) && (
						<div className="p-3 border-t border-border flex gap-2">
							{onCreate && (
								<Button
									variant="outline"
									size="sm"
									className="flex-1 gap-2"
									onClick={handleCreateTemplate}
									disabled={disabled}
								>
									<Plus className="h-4 w-4" />
									<span>Novo Template</span>
								</Button>
							)}
							{onManage && (
								<Button
									variant="ghost"
									size="sm"
									className="flex-1 gap-2"
									onClick={handleManageTemplates}
									data-testid="manage-soap-templates"
									disabled={disabled}
								>
									<FileText className="h-4 w-4" />
									<span>Gerenciar</span>
								</Button>
							)}
						</div>
					)}
				</PopoverContent>
			</Popover>
		</div>
	);
};
