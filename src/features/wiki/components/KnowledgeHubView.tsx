import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { ClinicalImportIA } from "./ClinicalImportIA";
import { KnowledgeActionBridge } from "./KnowledgeActionBridge";

import {
	ShieldCheck,
	LayoutGrid,
	Share2,
	Search,
	History,
	Pencil,
	Trash2,
	Plus,
	Copy,
	Lightbulb,
	Filter,
	TrendingUp,
	UserCheck,
	Calendar,
	AlertCircle,
	Eye,
	Stethoscope,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
	knowledgeGroups,
	knowledgeEvidenceLabels,
	type KnowledgeArticle,
	type EvidenceTier,
} from "@/data/knowledgeBase";

interface KnowledgeCardProps {
	item: KnowledgeArticle;
	onEdit: (item: KnowledgeArticle) => void;
	onAudit: (_item: KnowledgeArticle) => void;
	onDelete?: (item: KnowledgeArticle) => void;
	curationMap?: Map<string, any>;
	auditProfiles?: any;
	score?: number;
}

const evidenceColorMap: Record<EvidenceTier, string> = {
	CPG: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
	Consensus: "bg-blue-500/10 text-blue-700 border-blue-200",
	Guideline: "bg-indigo-500/10 text-indigo-700 border-indigo-200",
	SystematicReview: "bg-purple-500/10 text-purple-700 border-purple-200",
	PositionStatement: "bg-amber-500/10 text-amber-700 border-amber-200",
	Protocol: "bg-slate-500/10 text-slate-700 border-slate-200",
};

function KnowledgeCard({
	item,
	onEdit,
	onAudit: _onAudit,
	onDelete,
	curationMap,
	auditProfiles,
	score: _score,
}: KnowledgeCardProps) {
	const navigate = useNavigate();

	const curation = curationMap?.get(item.id);
	const reviewerName = curation?.assigned_to
		? auditProfiles?.[curation.assigned_to]?.full_name
		: null;

	const handleCopySummary = () => {
		const text = `*${item.title}*\n${item.group} - ${item.subgroup}\n\nDestaques:\n${item.highlights.map((h) => `- ${h}`).join("\n")}\n\nLink: ${item.url || "N/A"}`;
		navigator.clipboard.writeText(text);
		toast.success("Resumo copiado para a área de transferência!");
	};

	return (
		<Card className="hover:shadow-md transition-all flex flex-col h-full border-slate-200/60 overflow-hidden group">
			<CardContent className="p-0 flex flex-col h-full">
				{/* Header with Background Accent */}
				<div
					className={`h-1.5 w-full ${item.status === "verified" ? "bg-emerald-500" : item.status === "review" ? "bg-amber-500" : "bg-slate-300"}`}
				/>

				<div className="p-4 flex flex-col h-full space-y-3">
					<div className="flex items-start justify-between gap-3">
						<div className="flex-1">
							<h4
								className="font-semibold leading-tight line-clamp-2 text-slate-900 dark:text-slate-100"
								title={item.title}
							>
								{item.title}
							</h4>
							<div className="flex items-center gap-2 mt-1">
								<span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
									{item.group}
								</span>
								<span className="text-muted-foreground/30">•</span>
								<span className="text-[10px] font-medium text-muted-foreground">
									{item.subgroup}
								</span>
							</div>
						</div>
						<div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
							<Button
								variant="ghost"
								size="icon"
								onClick={() => navigate(`/wiki/article/${item.id}`)}
								className="h-7 w-7 text-emerald-600 hover:bg-emerald-50"
								title="Ver Detalhes"
							>
								<Eye className="h-3.5 w-3.5" />
							</Button>
							<Button
								variant="ghost"
								size="icon"
								onClick={handleCopySummary}
								className="h-7 w-7 text-slate-400 hover:text-slate-600"
								title="Copiar Resumo"
							>
								<Copy className="h-3.5 w-3.5" />
							</Button>
							<Button
								variant="ghost"
								size="icon"
								onClick={() => onEdit(item)}
								className="h-7 w-7 text-slate-400 hover:text-slate-600"
								title="Editar"
							>
								<Pencil className="h-3.5 w-3.5" />
							</Button>
							{onDelete && (
								<Button
									variant="ghost"
									size="icon"
									onClick={() => onDelete(item)}
									className="h-7 w-7 text-destructive/40 hover:text-destructive hover:bg-destructive/5"
									title="Excluir"
								>
									<Trash2 className="h-3.5 w-3.5" />
								</Button>
							)}
						</div>
					</div>

					<div className="flex flex-wrap items-center gap-2">
						<div className={`p-1.5 rounded-lg ${(item.evidence && evidenceColorMap[item.evidence]) ? evidenceColorMap[item.evidence].split(' ')[0] : "bg-slate-100"}`}>
							{item.group === "Ortopedia" && <Stethoscope className="h-3.5 w-3.5 text-emerald-600" />}
							{item.group === "Esportiva" && <TrendingUp className="h-3.5 w-3.5 text-amber-600" />}
							{item.group === "Pos-operatorio esportivo" && <ShieldCheck className="h-3.5 w-3.5 text-sky-600" />}
						</div>
						<Badge
							variant="outline"
							className={`${evidenceColorMap[item.evidence] || ""} border-0 font-bold text-[10px] px-2 py-0.5`}
						>
							{knowledgeEvidenceLabels[item.evidence] || item.evidence}
						</Badge>
						{item.status === "review" && reviewerName && (
							<Badge
								variant="secondary"
								className="bg-amber-100 text-amber-800 border-0 text-[10px] flex items-center gap-1"
							>
								<UserCheck className="h-3 w-3" />
								Validando: {reviewerName ? reviewerName.split(" ")[0] : "---"}
							</Badge>
						)}
						{item.status === "pending" && (
							<Badge
								variant="outline"
								className="text-[10px] bg-slate-50 text-slate-500 border-slate-200 flex items-center gap-1"
							>
								<AlertCircle className="h-3 w-3" />
								IA Pendente
							</Badge>
						)}
						{item.year && (
							<span className="text-[10px] text-muted-foreground font-medium">
								{item.year}
							</span>
						)}
					</div>

					{item.keyQuestions && item.keyQuestions.length > 0 && (
						<div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-lg p-2.5">
							<div className="flex items-center gap-1.5 text-slate-500 mb-1">
								<Lightbulb className="h-3 w-3 text-amber-500" />
								<span className="text-[10px] font-bold uppercase tracking-tight">
									Clinician Q&A:
								</span>
							</div>
							<p className="text-xs font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
								"{item.keyQuestions[0]}"
							</p>
						</div>
					)}

					<div className="flex-1 space-y-3 pt-1">
						<div className="text-xs">
							<p className="font-bold text-[10px] uppercase tracking-wider text-slate-400 mb-1.5">
								Key Findings
							</p>
							<div className="space-y-1.5">
								{(item.highlights && item.highlights.length
									? item.highlights.slice(0, 2)
									: ["Aguardando curadoria..."]
								).map((hl, idx) => (
									<div
										key={idx}
										className="flex items-start gap-2 text-slate-600 dark:text-slate-400 leading-snug"
									>
										<span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-300" />
										<span className="line-clamp-2">{hl}</span>
									</div>
								))}
							</div>
						</div>

						{/* Action Bridge - Evidence to Action */}
						<KnowledgeActionBridge 
							article={item}
							onActionSelect={(type, id) => {
								if (type === 'test') {
									toast.info(`Explorando técnica do teste: ${id}`);
								} else {
									toast.info(`Visualizando protocolo de exercício: ${id}`);
								}
							}}
						/>
					</div>


					<div className="pt-3 border-t border-slate-100 dark:border-slate-800 mt-auto flex items-center justify-between">
						<div className="flex flex-wrap gap-1">
							{item.tags &&
								item.tags.slice(0, 2).map((tag) => (
									<span
										key={tag}
										className="text-[10px] text-muted-foreground font-medium bg-slate-50 dark:bg-slate-900 px-1.5 py-0.5 rounded"
									>
										#{tag}
									</span>
								))}
						</div>

						{item.url && (
							<Button
								asChild
								variant="link"
								size="sm"
								className="h-auto p-0 text-xs font-bold text-primary"
							>
								<a href={item.url} target="_blank" rel="noreferrer">
									Ver Fonte
								</a>
							</Button>
						)}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

function KnowledgeMapView({ items }: { items: KnowledgeArticle[] }) {
	const groups = knowledgeGroups.map((group, groupIndex) => {
		const subgroups = Array.from(
			new Set(
				items
					.filter((item) => item.group === group.id)
					.map((item) => item.subgroup),
			),
		);
		return {
			group,
			subgroups,
			x: (groupIndex + 1) / (knowledgeGroups.length + 1),
		};
	});

	const nodes = groups.flatMap((group) =>
		group.subgroups.map((subgroup, index) => ({
			group: group.group,
			subgroup,
			x: group.x,
			y: (index + 1) / (group.subgroups.length + 1),
			count: items.filter(
				(item) => item.group === group.group.id && item.subgroup === subgroup,
			).length,
		})),
	);

	return (
		<div className="relative rounded-3xl border bg-slate-50/50 p-8 min-h-[650px] overflow-hidden shadow-inner animate-in fade-in duration-1000">
			<div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(circle_at_center,#64748b_0%,transparent_70%)]" />
			
			<svg
				className="absolute inset-0 w-full h-full"
				viewBox="0 0 100 100"
				preserveAspectRatio="none"
			>
				{nodes.map((node) => {
					const startX = node.x * 100;
					const startY = 8;
					const endX = node.x * 100;
					const endY = node.y * 100;
					const cp1y = startY + (endY - startY) * 0.4;
					const cp2y = startY + (endY - startY) * 0.6;
					
					// Slight horizontal offset for the curve control points to make it more organic
					const groupOffset = (node.group.id === "Ortopedia" ? -2 : node.group.id === "Esportiva" ? 0 : 2);
					const cp1x = startX + groupOffset;
					const cp2x = endX + groupOffset;

					return (
						<path
							key={`${node.group.id}-${node.subgroup}`}
							d={`M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`}
							fill="none"
							stroke={node.group.id === "Ortopedia" ? "#10b981" : node.group.id === "Esportiva" ? "#f59e0b" : "#0ea5e9"}
							strokeWidth="0.25"
							strokeOpacity="0.2"
							strokeDasharray="1,1"
							className="transition-all duration-700"
						/>
					);
				})}
			</svg>

			<div className="relative z-10 flex justify-between text-xs mb-20">
				{groups.map((group) => (
					<div key={group.group.id} className="text-center w-full px-4">
						<div
							className={`mx-auto inline-flex items-center gap-2 rounded-xl px-5 py-2.5 shadow-lg border border-white/20 ${
								group.group.id === "Ortopedia" ? "bg-emerald-500 text-white" : 
								group.group.id === "Esportiva" ? "bg-amber-500 text-white" : 
								"bg-sky-500 text-white"
							}`}
						>
							<span className="font-black uppercase tracking-widest text-[10px]">
								{group.group.label}
							</span>
						</div>
					</div>
				))}
			</div>

			<div className="relative z-10">
				{nodes.map((node) => (
					<div
						key={`${node.group.id}-${node.subgroup}-node`}
						className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-2xl border-2 bg-white shadow-md px-5 py-4 min-w-[140px] transition-all hover:scale-110 hover:shadow-2xl cursor-pointer group/node ${
							node.group.id === "Ortopedia" ? "border-emerald-100 hover:border-emerald-500" : 
							node.group.id === "Esportiva" ? "border-amber-100 hover:border-amber-500" : 
							"border-sky-100 hover:border-sky-500"
						}`}
						style={{ 
							left: `${node.x * 100}%`, 
							top: `${node.y * 100}%`,
						}}
					>
						<div className="flex flex-col items-center text-center gap-1.5">
							<div className="font-black text-[12px] uppercase tracking-tight text-slate-800 group-hover/node:text-slate-950 transition-colors">
								{node.subgroup}
							</div>
							<div className={`text-[10px] font-black px-3 py-1 rounded-full ${
								node.group.id === "Ortopedia" ? "bg-emerald-50 text-emerald-600" : 
								node.group.id === "Esportiva" ? "bg-amber-50 text-amber-600" : 
								"bg-sky-50 text-sky-600"
							}`}>
								{node.count} {node.count === 1 ? 'item' : 'itens'}
							</div>
						</div>
						
						{/* Subtle indicator of depth/organic feel */}
						<div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full opacity-20 ${
							node.group.id === "Ortopedia" ? "bg-emerald-500" : 
							node.group.id === "Esportiva" ? "bg-amber-500" : 
							"bg-sky-500"
						}`} />
					</div>
				))}
			</div>
		</div>
	);
}

interface KnowledgeHubViewProps {
	knowledgeStats: { total: number; verified: number };
	knowledgeGroupsFiltered: Map<string, KnowledgeArticle[]>;
	filteredKnowledge: KnowledgeArticle[];
	auditItems: any[];
	auditProfiles: any;
	semanticScoreMap: Map<string, number>;
	kbFilters: any;
	setKbFilters: any;
	syncing: boolean;
	indexing: boolean;
	onSync: () => void;
	onIndex: () => void;
	onCreateArticle: () => void;
	onEditArticle: (article: KnowledgeArticle) => void;
	onDeleteArticle: (article: KnowledgeArticle) => void;
	onAuditArticle: (article: KnowledgeArticle | null) => void;
	articleTitleMap: Map<string, string>;
	curationMap: Map<string, any>;
}

export function KnowledgeHubView({
	knowledgeStats,
	knowledgeGroupsFiltered: _knowledgeGroupsFiltered,
	filteredKnowledge,
	auditItems,
	auditProfiles,
	semanticScoreMap,
	kbFilters,
	setKbFilters,
	syncing: _syncing,
	indexing: _indexing,
	onCreateArticle,
	onEditArticle,
	onDeleteArticle,
	onAuditArticle,
	articleTitleMap,
	curationMap,
}: KnowledgeHubViewProps) {
	const trendingArticles = filteredKnowledge.slice(0, 3);

	return (
		<div className="flex flex-col lg:flex-row gap-6">
			{/* Sidebar de Filtros (Left) */}
			<aside className="lg:w-72 shrink-0 space-y-8 animate-in slide-in-from-left duration-700 hidden lg:block">
				<div className="space-y-5">
					<div className="flex items-center gap-2 px-1">
						<Filter className="h-4 w-4 text-blue-500" />
						<h3 className="text-xs font-black uppercase tracking-widest text-slate-400">
							Filtros Avançados
						</h3>
					</div>

					<div className="rounded-xl border bg-card p-4 space-y-6">
						<div className="space-y-2">
							<Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">
								Especialidade
							</Label>
							<Select
								value={kbFilters.group}
								onValueChange={(v) => setKbFilters.setGroup(v)}
							>
								<SelectTrigger className="h-9">
									<SelectValue placeholder="Todas" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="Todas">Todas</SelectItem>
									{knowledgeGroups.map((g) => (
										<SelectItem key={g.id} value={g.id}>
											{g.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">
								Nível de Evidência
							</Label>
							<div className="grid grid-cols-1 gap-1">
								<Button
									variant={
										kbFilters.evidence === "Todas" ? "secondary" : "ghost"
									}
									size="sm"
									className="justify-start h-8 text-xs font-medium"
									onClick={() => setKbFilters.setEvidence("Todas")}
								>
									Todas as fontes
								</Button>
								{(
									[
										"CPG",
										"Consensus",
										"Guideline",
										"SystematicReview",
									] as EvidenceTier[]
								).map((tier) => (
									<Button
										key={tier}
										variant={
											kbFilters.evidence === tier ? "secondary" : "ghost"
										}
										size="sm"
										className="justify-start h-8 text-xs font-medium"
										onClick={() => setKbFilters.setEvidence(tier)}
									>
										{knowledgeEvidenceLabels[tier]}
									</Button>
								))}
							</div>
						</div>

						<Separator />

						<div className="space-y-3">
							<Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">
								Status de Curadoria
							</Label>
							<ToggleGroup
								type="single"
								value={kbFilters.status}
								onValueChange={(v) => v && setKbFilters.setStatus(v)}
								className="flex flex-col gap-1 w-full"
							>
								<ToggleGroupItem
									value="all"
									className="justify-start px-3 h-8 text-xs w-full"
								>
									Todos
								</ToggleGroupItem>
								<ToggleGroupItem
									value="verified"
									className="justify-start px-3 h-8 text-xs w-full"
								>
									Verificados
								</ToggleGroupItem>
								<ToggleGroupItem
									value="pending"
									className="justify-start px-3 h-8 text-xs w-full"
								>
									Pendentes
								</ToggleGroupItem>
							</ToggleGroup>
						</div>
					</div>
				</div>

				{/* Estatísticas Rápidas */}
				<div className="rounded-2xl bg-slate-900 text-white p-5 space-y-5 shadow-xl border border-white/5 relative overflow-hidden group">
					<div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
						<Stethoscope className="h-16 w-16" />
					</div>
					<div className="flex items-center gap-2 relative z-10">
						<div className="h-7 w-7 rounded-lg bg-emerald-500/20 flex items-center justify-center">
							<ShieldCheck className="h-4 w-4 text-emerald-400 animate-pulse" />
						</div>
						<h4 className="text-xs font-black uppercase tracking-wider">Base Certificada</h4>
					</div>
					<div className="space-y-2.5">
						<div className="flex justify-between items-end">
							<span className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">Status da Base</span>
							<span className="text-base font-bold leading-none">
								{knowledgeStats.total}
							</span>
						</div>
						<div className="w-full bg-white/10 h-1 rounded-full overflow-hidden">
							<div
								className="bg-emerald-500 h-full transition-all duration-1000"
								style={{
									width: `${(knowledgeStats.verified / (knowledgeStats.total || 1)) * 100}%`,
								}}
							/>
						</div>
						<p className="text-[9px] text-slate-400 leading-relaxed italic opacity-70">
							A meta é manter 90% da base "Verificada".
						</p>
					</div>
				</div>

				<Separator className="opacity-50" />

				{/* Trending Widget (Moved from right) */}
				<div className="space-y-4">
					<div className="flex items-center gap-2 px-1">
						<TrendingUp className="h-4 w-4 text-amber-500" />
						<h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">
							Em Destaque
						</h3>
					</div>
					<div className="space-y-3">
						{trendingArticles.map((article, idx) => (
							<div
								key={article.id}
								className="flex gap-3 group cursor-pointer p-2 rounded-lg hover:bg-slate-50 transition-colors"
								onClick={() => onEditArticle(article)}
							>
								<div className="h-7 w-7 rounded-md bg-slate-100 flex items-center justify-center shrink-0 font-bold text-[10px] text-slate-400 group-hover:bg-amber-50 group-hover:text-amber-600 transition-colors">
									{idx + 1}
								</div>
								<div className="min-w-0">
									<h4 className="text-[11px] font-bold truncate leading-none mb-1 group-hover:text-amber-700 transition-colors">
										{article.title}
									</h4>
									<span className="text-[9px] font-medium text-muted-foreground uppercase tracking-tight">
										{article.subgroup}
									</span>
								</div>
							</div>
						))}
					</div>
				</div>

				<Separator className="opacity-50" />

				{/* Timeline de Auditoria (Moved from right - Minimalist) */}
				<div className="space-y-4">
					<div className="flex items-center justify-between px-1">
						<div className="flex items-center gap-2">
							<History className="h-4 w-4 text-blue-500" />
							<h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">
								Atividade
							</h3>
						</div>
						<Button
							variant="ghost"
							size="sm"
							className="h-6 px-2 text-[9px] font-bold uppercase text-slate-400 hover:text-primary"
							onClick={() => onAuditArticle(null)}
						>
							Ver tudo
						</Button>
					</div>

					<div className="space-y-4 px-1">
						{auditItems && auditItems.length === 0 && (
							<p className="text-[10px] text-muted-foreground italic">
								Nenhuma atividade registrada.
							</p>
						)}
						{auditItems &&
							auditItems.slice(0, 5).map((entry) => {
								const title =
									articleTitleMap.get(entry.article_id) || entry.article_id;
								const date =
									(entry.created_at as any).toDate?.() ||
									new Date(entry.created_at);
								const actorName =
									(auditProfiles &&
										auditProfiles[entry.actor_id]?.full_name) ||
									"Sistema";
								return (
									<div key={entry.id} className="flex gap-3 group items-start">
										<div className="h-2 w-2 rounded-full bg-slate-200 mt-1.5 shrink-0 group-hover:bg-blue-500 transition-colors" />
										<div className="min-w-0 space-y-0.5">
											<p className="text-[10px] leading-tight text-slate-600">
												<span className="font-bold text-slate-900">
													{actorName ? actorName.split(" ")[0] : "Sistema"}
												</span>
												<span className="mx-1 opacity-70">
													{entry.action}
												</span>
											</p>
											<p className="text-[10px] font-medium text-slate-400 truncate italic">
												{title}
											</p>
											<div className="flex items-center gap-1 text-[9px] text-slate-300 font-bold uppercase tracking-tighter">
												{date.toLocaleDateString("pt-BR", {
													day: "2-digit",
													month: "short",
													hour: "2-digit",
													minute: "2-digit",
												})}
											</div>
										</div>
									</div>
								);
							})}
					</div>
				</div>
			</aside>

			{/* Main Content (Center) */}
			<main className="flex-1 space-y-6 min-w-0">
				<ClinicalImportIA />

				<header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-background sticky top-0 z-20 pb-2">
					<div className="relative flex-1 max-w-xl">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
						<Input
							placeholder="Pesquisar diretrizes clinicas..."
							value={kbFilters.query}
							onChange={(e) => setKbFilters.setQuery(e.target.value)}
							className="pl-10 h-11 bg-muted/50 border-transparent focus:border-primary transition-all rounded-xl"
						/>
					</div>
					<div className="flex items-center gap-2">
						<div className="flex items-center gap-2 mr-2 bg-muted/50 px-3 py-1.5 rounded-lg border border-transparent">
							<Switch
								checked={kbFilters.useSemantic}
								onCheckedChange={setKbFilters.setUseSemantic}
								size="sm"
							/>
							<span className="text-xs font-bold text-muted-foreground uppercase tracking-tight">
								IA Semantic
							</span>
						</div>
						<ToggleGroup
							type="single"
							value={kbFilters.view}
							onValueChange={(v) => v && setKbFilters.setView(v)}
							className="bg-muted/50 p-1 rounded-lg"
						>
							<ToggleGroupItem
								value="library"
								className="h-8 w-8 p-0"
								title="Grade"
							>
								<LayoutGrid className="h-4 w-4" />
							</ToggleGroupItem>
							<ToggleGroupItem
								value="map"
								className="h-8 w-8 p-0"
								title="Mapa de Conhecimento"
							>
								<Share2 className="h-4 w-4" />
							</ToggleGroupItem>
						</ToggleGroup>
						<Button
							variant="default"
							size="sm"
							onClick={onCreateArticle}
							className="h-9 px-4 rounded-lg font-bold shadow-sm shadow-primary/20"
						>
							<Plus className="h-4 w-4 mr-2" /> Novo
						</Button>
					</div>
				</header>

				{kbFilters.view === "library" && (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 animate-in fade-in duration-700">
						{filteredKnowledge.map((item) => (
							<KnowledgeCard
								key={item.id}
								item={item}
								onEdit={onEditArticle}
								onAudit={onAuditArticle}
								onDelete={onDeleteArticle}
								curationMap={curationMap}
								auditProfiles={auditProfiles}
								score={
									kbFilters.useSemantic
										? semanticScoreMap.get(item.id)
										: undefined
								}
							/>
						))}
					</div>
				)}

				{kbFilters.view === "map" && (
					<KnowledgeMapView items={filteredKnowledge} />
				)}

				{filteredKnowledge.length === 0 && (
					<div className="flex flex-col items-center justify-center py-32 text-center animate-in fade-in zoom-in duration-500">
						<div className="h-24 w-24 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-6 relative">
							<div className="absolute inset-0 rounded-full bg-blue-400/20 animate-ping" />
							<Search className="h-10 w-10 text-blue-600 dark:text-blue-400 relative z-10" />
						</div>
						<h3 className="text-2xl font-bold text-slate-900 dark:text-white font-display">Nenhuma diretriz localizada</h3>
						<p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-3 font-medium">
							Tente ajustar seus filtros de especialidade ou termos de pesquisa para localizar o recurso desejado.
						</p>
						<Button variant="outline" className="mt-8 rounded-xl font-bold border-slate-200" onClick={() => setKbFilters.setSearch("")}>
							Limpar todos os filtros
						</Button>
					</div>
				)}
			</main>

		</div>
	);
}
