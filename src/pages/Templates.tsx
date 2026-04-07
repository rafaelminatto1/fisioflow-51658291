import {
	Activity,
	ClipboardList,
	History,
	LayoutGrid,
	Search,
	Zap,
	Stethoscope,
	Brain,
	Wind,
	ArrowRight,
	Info,
	Star,
	Plus,
	Pencil,
	type LucideIcon,
} from "lucide-react";
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useEvaluationForms, useDeleteEvaluationForm } from "@/hooks/useEvaluationForms";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { builtinEvaluationTemplates } from "@/data/defaultEvaluationTemplates";
import { toast } from "sonner";

const CATEGORY_CONFIG: Record<string, { label: string; icon: LucideIcon; color: string; bg: string }> = {
	ortopedica: { label: "Ortopédica", icon: Activity, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30" },
	esportiva: { label: "Esportiva", icon: Zap, color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-950/30" },
	"pos-operatorio": { label: "Pós-Op", icon: History, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950/30" },
	geral: { label: "Geral", icon: ClipboardList, color: "text-slate-600", bg: "bg-slate-50 dark:bg-slate-950/30" },
	pilates: { label: "Pilates", icon: Star, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
	"dor-cronica": { label: "Dor Crônica", icon: Stethoscope, color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/30" },
	neurologica: { label: "Neurológica", icon: Brain, color: "text-indigo-600", bg: "bg-indigo-50 dark:bg-indigo-950/30" },
	respiratoria: { label: "Respiratória", icon: Wind, color: "text-cyan-600", bg: "bg-cyan-50 dark:bg-cyan-950/30" },
};

export default function Templates() {
	const navigate = useNavigate();
	const [search, setSearch] = useState("");
	const [activeCategory, setActiveCategory] = useState<string | null>(null);
	const { data: customTemplates = [], isLoading } = useEvaluationForms("custom");
	const deleteMutation = useDeleteEvaluationForm();

	const allTemplates = useMemo(() => {
		const customMapped = (customTemplates || []).map((t) => ({
			id: t.id,
			nome: t.nome,
			descricao: t.descricao || "",
			category: "personalizado",
			isCustom: true,
			fieldsCount: t.fields?.length || 0,
		}));

		const builtinMapped = (builtinEvaluationTemplates || []).map((t) => ({
			id: t.id,
			nome: t.nome,
			descricao: t.descricao,
			category: t.category,
			isCustom: false,
			fieldsCount: t.fields.length,
		}));

		return [...customMapped, ...builtinMapped];
	}, [customTemplates, builtinEvaluationTemplates]);

	const filteredTemplates = useMemo(() => {
		return allTemplates.filter((t) => {
			const matchesSearch =
				t.nome.toLowerCase().includes(search.toLowerCase()) ||
				(t.descricao || "").toLowerCase().includes(search.toLowerCase());
			const matchesCategory = activeCategory ? t.category === activeCategory : true;
			return matchesSearch && matchesCategory;
		});
	}, [search, activeCategory, allTemplates]);

	const categories = useMemo(() => {
		const cats = new Set(allTemplates.map((t) => t.category));
		return Array.from(cats) as string[];
	}, [allTemplates]);

	const handleDelete = async (id: string) => {
		try {
			await deleteMutation.mutateAsync(id);
		} catch (error) {
			console.error("Erro ao excluir template:", error);
		}
	};

	return (
		<MainLayout>
			<div className="container mx-auto p-6 max-w-7xl space-y-10 pb-24 md:pb-12 animate-in fade-in duration-700">
				{/* Header Section */}
				<Card className="relative overflow-hidden rounded-[2.5rem] bg-slate-900 p-8 md:p-12 text-white border-0 shadow-premium-xl">
					<div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px]" />
					<div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-[100px]" />
					
					<div className="relative z-10 max-w-3xl space-y-4 text-left">
						<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-2">
							<ClipboardList className="w-4 h-4 text-primary" />
							<span className="text-[10px] font-black uppercase tracking-widest">Protocolos de Avaliação</span>
						</div>
						<h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-tight">
							Biblioteca de <span className="text-primary">Templates</span>
						</h1>
						<p className="text-white/60 text-lg md:text-xl font-medium max-w-2xl leading-relaxed">
							Economize tempo e padronize seus atendimentos com fichas de avaliação baseadas em evidência clínica e modelos padrão ouro.
						</p>
					</div>
				</Card>

				{/* Filters & Search */}
				<div className="flex flex-col md:flex-row gap-6 items-center">
					<div className="relative flex-1 w-full group text-left">
						<Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-primary transition-colors" />
						<Input
							placeholder="Buscar templates por patologia, nome ou descrição..."
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							className="h-14 pl-12 pr-4 rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border-border/40 shadow-premium-sm focus:shadow-premium-md transition-all text-base font-medium"
						/>
					</div>
					
					<div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
						<Button
							variant={activeCategory === null ? "default" : "outline"}
							onClick={() => setActiveCategory(null)}
							className={cn(
								"rounded-xl h-11 px-6 font-bold uppercase tracking-widest text-[10px] transition-all",
								activeCategory === null ? "shadow-premium-md" : "border-border/40 text-slate-500"
							)}
						>
							Todos
						</Button>
						{categories.map((cat) => {
							if (cat === "personalizado") {
								return (
									<Button
										key={cat}
										variant={activeCategory === cat ? "default" : "outline"}
										onClick={() => setActiveCategory(cat || null)}
										className={cn(
											"rounded-xl h-11 px-6 font-bold uppercase tracking-widest text-[10px] transition-all gap-2",
											activeCategory === cat ? "shadow-premium-md" : "border-border/40 text-slate-500"
										)}
									>
										<Star className="w-3.5 h-3.5" />
										Meus Modelos
									</Button>
								);
							}
							const config = (cat && CATEGORY_CONFIG[cat]) || CATEGORY_CONFIG.geral;
							return (
								<Button
									key={cat}
									variant={activeCategory === cat ? "default" : "outline"}
									onClick={() => setActiveCategory(cat || null)}
									className={cn(
										"rounded-xl h-11 px-6 font-bold uppercase tracking-widest text-[10px] transition-all gap-2",
										activeCategory === cat ? "shadow-premium-md" : "border-border/40 text-slate-500"
									)}
								>
									<config.icon className="w-3.5 h-3.5" />
									{config.label}
								</Button>
							);
						})}
					</div>
				</div>

				{/* Bento Grid */}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{filteredTemplates.map((template, idx) => {
						const categoryKey = template.category || "geral";
						const config = CATEGORY_CONFIG[categoryKey] || (categoryKey === "personalizado" ? { label: "Personalizado", icon: Star, color: "text-amber-500", bg: "bg-amber-50" } : CATEGORY_CONFIG.geral);
						
						return (
							<Card
								key={template.id}
								className={cn(
									"group relative overflow-hidden rounded-[2rem] border-border/40 bg-white dark:bg-slate-900 p-6 shadow-premium-sm hover:shadow-premium-xl transition-all duration-500 hover:-translate-y-2 border-t-4 text-left",
									template.isCustom ? "border-t-amber-500" : ""
								)}
								style={!template.isCustom ? { borderTopColor: "var(--primary)" } : {}}
							>
								{/* Category Badge */}
								<div className="flex items-center justify-between mb-6">
									<div className={cn("px-4 py-1.5 rounded-full flex items-center gap-2", config.bg)}>
										<config.icon className={cn("w-3.5 h-3.5", config.color)} />
										<span className={cn("text-[10px] font-black uppercase tracking-widest", config.color)}>
											{config.label}
										</span>
									</div>
									<div className="flex items-center gap-1.5 text-slate-400">
										<LayoutGrid className="w-4 h-4" />
										<span className="text-[11px] font-black">{template.fieldsCount} campos</span>
									</div>
								</div>

								{/* Content */}
								<div className="space-y-4">
									<div className="flex items-start justify-between">
										<h3 className="text-xl font-black tracking-tight group-hover:text-primary transition-colors flex-1">
											{template.nome}
										</h3>
										{template.isCustom && (
											<div className="flex gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
												<Button
													variant="ghost"
													size="icon"
													className="h-8 w-8 rounded-lg hover:bg-amber-50 hover:text-amber-600"
													onClick={() => navigate(`/templates/${template.id}/edit`)}
												>
													<Pencil className="w-4 h-4" />
												</Button>
												
												<AlertDialog>
													<AlertDialogTrigger asChild>
														<Button
															variant="ghost"
															size="icon"
															className="h-8 w-8 rounded-lg hover:bg-red-50 hover:text-red-600"
														>
															<Trash2 className="w-4 h-4" />
														</Button>
													</AlertDialogTrigger>
													<AlertDialogContent>
														<AlertDialogHeader>
															<AlertDialogTitle>Excluir Template?</AlertDialogTitle>
															<AlertDialogDescription>
																Esta ação não pode ser desfeita. O template "{template.nome}" será removido permanentemente.
															</AlertDialogDescription>
														</AlertDialogHeader>
														<AlertDialogFooter>
															<AlertDialogCancel>Cancelar</AlertDialogCancel>
															<AlertDialogAction 
																onClick={() => handleDelete(template.id)}
																className="bg-red-600 hover:bg-red-700"
															>
																Excluir
															</AlertDialogAction>
														</AlertDialogFooter>
													</AlertDialogContent>
												</AlertDialog>
											</div>
										)}
									</div>
									<p className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-relaxed line-clamp-3">
										{template.descricao}
									</p>
								</div>

								{/* Footer Actions */}
								<div className="mt-8 flex items-center justify-between">
									<Button
										variant="ghost"
										size="sm"
										className="h-9 gap-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-primary hover:bg-primary/5 px-3"
										onClick={() => {
											if (template.isCustom) {
												navigate(`/templates/${template.id}/edit`);
											}
										}}
									>
										<Info className="w-3.5 h-3.5" />
										Detalhes
									</Button>
									<Button
										size="sm"
										className="h-10 rounded-xl px-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:scale-105 transition-all shadow-premium-sm group-hover:bg-primary group-hover:text-white"
										onClick={() => {
											// Use logic
											toast.info("Em breve: Aplicar template direto no atendimento");
										}}
									>
										<span className="text-[10px] font-black uppercase tracking-widest mr-2">Usar Template</span>
										<ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
									</Button>
								</div>

								{/* Subtle Decoration */}
								<div className="absolute -bottom-10 -right-10 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-all duration-500" />
							</Card>
						);
					})}

					{/* Add Custom Suggestion Card */}
					<Card 
						onClick={() => navigate("/templates/new")}
						className="flex flex-col items-center justify-center p-8 rounded-[2rem] border-2 border-dashed border-border/60 bg-transparent hover:border-primary/40 transition-all group cursor-pointer space-y-4"
					>
						<div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
							<PlusCircle className="w-8 h-8 text-slate-400 group-hover:text-primary" />
						</div>
						<div className="text-center">
							<h4 className="text-lg font-black tracking-tight">Criar Personalizado</h4>
							<p className="text-sm text-slate-400 font-medium mt-1">
								Monte sua ficha do zero com campos personalizados.
							</p>
						</div>
						<Button variant="secondary" className="rounded-xl font-black text-[10px] uppercase tracking-widest">
							Começar agora
						</Button>
					</Card>
				</div>
			</div>
		</MainLayout>
	);
}

// Helper icons/btns if needed
function PlusCircle({ className }: { className?: string }) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			className={className}
		>
			<circle cx="12" cy="12" r="10" />
			<path d="M12 8v8" />
			<path d="M8 12h8" />
		</svg>
	);
}
