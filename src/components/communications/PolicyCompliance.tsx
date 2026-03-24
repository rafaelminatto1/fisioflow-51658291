import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { request } from "@/api/v2/base";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
	CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
	FileSignature,
	CheckCircle2,
	FileText,
	Plus,
	Users,
	Shield,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface Policy {
	id: string;
	title: string;
	content: string;
	is_mandatory: boolean;
	type: string;
	media_url?: string;
	created_at: string;
	is_read: boolean;
}

interface ComplianceStat {
	id: string;
	title: string;
	read_count: string | number;
}

function Badge({ children, className, ...props }: any) {
	return (
		<div
			className={cn(
				"inline-flex items-center rounded-lg border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider transition-colors",
				className,
			)}
			{...props}
		>
			{children}
		</div>
	);
}

export function PolicyCompliance() {
	const { user } = useAuth();
	const { toast } = useToast();
	const queryClient = useQueryClient();
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [newTitle, setNewTitle] = useState("");
	const [newContent, setNewContent] = useState("");

	const isAdmin = user?.role === "admin" || user?.role === "owner";

	const { data: policies = [], isLoading } = useQuery<Policy[]>({
		queryKey: ["announcements", "policy"],
		queryFn: async () => {
			const res = await request("/api/announcements?type=policy");
			return res.data;
		},
	});

	const { data: stats = [] } = useQuery<ComplianceStat[]>({
		queryKey: ["announcements", "compliance"],
		queryFn: async () => {
			const res = await request("/api/announcements/compliance");
			return res.data;
		},
		enabled: isAdmin,
	});

	const createMutation = useMutation({
		mutationFn: async (data: any) => {
			const res = await request("/api/announcements", {
				method: "POST",
				body: JSON.stringify(data),
			});
			return res;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["announcements"] });
			toast({ title: "Política publicada com sucesso!" });
			setIsDialogOpen(false);
			setNewTitle("");
			setNewContent("");
		},
		onError: () => {
			toast({ title: "Erro ao publicar", variant: "destructive" });
		},
	});

	const markReadMutation = useMutation({
		mutationFn: async (id: string) => {
			return await request(`/api/announcements/${id}/read`, {
				method: "POST",
			});
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["announcements"] });
			toast({ title: "Leitura confirmada!" });
		},
	});

	const handleCreate = () => {
		if (!newTitle.trim() || !newContent.trim()) return;
		createMutation.mutate({
			title: newTitle,
			content: newContent,
			type: "policy",
			isMandatory: true,
		});
	};

	const mandatoryPolicies = policies.filter((p) => p.is_mandatory);
	const readPolicies = mandatoryPolicies.filter((p) => p.is_read);
	const progressPercentage =
		mandatoryPolicies.length > 0
			? Math.round((readPolicies.length / mandatoryPolicies.length) * 100)
			: 100;

	if (isLoading) {
		return (
			<div className="p-8 text-center text-muted-foreground animate-pulse">
				Carregando políticas...
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex justify-between items-start gap-6">
				<div className="space-y-4 flex-1">
					<div>
						<h2 className="text-xl font-bold tracking-tight">
							Cultura & Políticas
						</h2>
						<p className="text-sm text-muted-foreground">
							Documentos e diretrizes obrigatórias da clínica.
						</p>
					</div>

					{!isAdmin && mandatoryPolicies.length > 0 && (
						<motion.div
							initial={{ opacity: 0, scale: 0.95 }}
							animate={{ opacity: 1, scale: 1 }}
							className="bg-white dark:bg-slate-900 border border-border/40 p-5 rounded-2xl shadow-premium-sm space-y-3 max-w-md"
						>
							<div className="flex justify-between text-[11px] font-black uppercase tracking-widest text-muted-foreground">
								<span className="flex items-center gap-2">
									<Shield className="w-3.5 h-3.5 text-primary" />
									Progresso de Conformidade
								</span>
								<span className="text-primary">{progressPercentage}%</span>
							</div>
							<Progress
								value={progressPercentage}
								className="h-1.5 bg-slate-100 dark:bg-slate-800"
							/>
							{progressPercentage < 100 && (
								<p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
									Faltam {mandatoryPolicies.length - readPolicies.length}{" "}
									documentos obrigatórios.
								</p>
							)}
						</motion.div>
					)}
				</div>

				{isAdmin && (
					<Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
						<DialogTrigger asChild>
							<Button className="gap-2 shadow-premium-sm">
								<Plus className="w-4 h-4" /> Nova Política
							</Button>
						</DialogTrigger>
						<DialogContent className="sm:max-w-xl">
							<DialogHeader>
								<DialogTitle className="text-xl font-bold">
									Publicar Política Obrigatória
								</DialogTitle>
							</DialogHeader>
							<div className="space-y-4 py-4">
								<div className="space-y-2">
									<Label className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">
										Título do Documento
									</Label>
									<Input
										className="rounded-xl"
										placeholder="Ex: Código de Ética e Conduta"
										value={newTitle}
										onChange={(e) => setNewTitle(e.target.value)}
									/>
								</div>
								<div className="space-y-2">
									<Label className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">
										Conteúdo Detalhado
									</Label>
									<Textarea
										className="rounded-xl resize-none"
										placeholder="Descreva as regras e diretrizes..."
										rows={10}
										value={newContent}
										onChange={(e) => setNewContent(e.target.value)}
									/>
								</div>
								<div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 rounded-2xl">
									<p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
										<strong>Nota:</strong> Este documento será marcado como
										obrigatório. Todos os profissionais receberão um alerta até
										que confirmem a leitura.
									</p>
								</div>
								<Button
									className="w-full py-6 rounded-xl font-bold text-lg"
									onClick={handleCreate}
									disabled={createMutation.isPending}
								>
									{createMutation.isPending
										? "Publicando..."
										: "Publicar e Exigir Leitura"}
								</Button>
							</div>
						</DialogContent>
					</Dialog>
				)}
			</div>

			{isAdmin && stats.length > 0 && (
				<div className="mb-8">
					<h3 className="text-[10px] font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-2 text-muted-foreground/60">
						<Users className="w-3.5 h-3.5" /> Dashboard de Conformidade
					</h3>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						{stats.map((stat) => (
							<Card
								key={stat.id}
								className="bg-white dark:bg-slate-900 border-border/40 shadow-premium-sm overflow-hidden group hover:border-primary/30 transition-all"
							>
								<CardContent className="p-5">
									<p
										className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground truncate"
										title={stat.title}
									>
										{stat.title}
									</p>
									<div className="mt-3 flex items-center justify-between">
										<div className="flex items-baseline gap-1">
											<span className="text-3xl font-black tracking-tighter text-slate-900 dark:text-white">
												{stat.read_count}
											</span>
											<span className="text-[10px] font-bold uppercase text-muted-foreground/60">
												Lidos
											</span>
										</div>
										<div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
											<FileSignature className="w-5 h-5" />
										</div>
									</div>
								</CardContent>
							</Card>
						))}
					</div>
				</div>
			)}

			<div className="grid gap-6 md:grid-cols-2">
				{policies.length === 0 ? (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						className="col-span-2 text-center p-20 border-2 border-dashed rounded-3xl bg-muted/20 text-muted-foreground"
					>
						<FileText className="w-16 h-16 mx-auto mb-4 opacity-10" />
						<p className="font-medium">Nenhum documento cadastrado.</p>
					</motion.div>
				) : (
					<AnimatePresence mode="popLayout">
						{policies.map((policy, index) => (
							<motion.div
								key={policy.id}
								initial={{ opacity: 0, scale: 0.95 }}
								animate={{ opacity: 1, scale: 1 }}
								transition={{ delay: index * 0.05 }}
							>
								<Card
									className={cn(
										"flex flex-col h-full rounded-2xl border-border/40 hover:border-primary/30 transition-all duration-300 overflow-hidden relative group",
										!policy.is_read &&
											!isAdmin &&
											"bg-amber-50/[0.03] border-amber-500/20 shadow-sm shadow-amber-500/5",
									)}
								>
									{!policy.is_read && !isAdmin && (
										<div className="absolute top-0 right-0 p-2">
											<Badge className="bg-amber-500 text-white border-none animate-pulse">
												Pendente
											</Badge>
										</div>
									)}
									<CardHeader className="pb-4">
										<div className="space-y-1">
											<div className="flex items-center gap-2 mb-1">
												<div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
													<FileText className="w-4 h-4" />
												</div>
												<Badge variant="outline" className="text-[9px]">
													Documento Oficial
												</Badge>
											</div>
											<CardTitle className="text-lg font-bold tracking-tight group-hover:text-primary transition-colors">
												{policy.title}
											</CardTitle>
										</div>
									</CardHeader>
									<CardContent className="flex-1">
										<div className="text-sm leading-relaxed text-slate-500 dark:text-slate-400 line-clamp-4 hover:line-clamp-none transition-all duration-500 bg-slate-50/50 dark:bg-slate-900/50 p-4 rounded-xl border border-border/20">
											{policy.content}
										</div>
									</CardContent>
									<CardFooter className="border-t border-border/40 bg-slate-50/30 dark:bg-slate-900/30 p-5 flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
										<div className="flex flex-col">
											<span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">
												Publicado em
											</span>
											<span className="text-[11px] font-bold text-muted-foreground">
												{format(new Date(policy.created_at), "dd/MM/yyyy")}
											</span>
										</div>

										{!policy.is_read && !isAdmin ? (
											<Button
												onClick={() => markReadMutation.mutate(policy.id)}
												className="rounded-xl font-bold gap-2 px-6 shadow-lg shadow-primary/20"
												disabled={markReadMutation.isPending}
											>
												<CheckCircle2 className="w-4 h-4" />
												{markReadMutation.isPending
													? "Confirmando..."
													: "Confirmar Recebimento"}
											</Button>
										) : isAdmin ? (
											<Badge
												variant="outline"
												className="bg-slate-100 dark:bg-slate-800 border-none font-black"
											>
												Admin View
											</Badge>
										) : (
											<div className="flex items-center gap-2 text-emerald-500 font-bold text-sm">
												<CheckCircle2 className="w-5 h-5" /> Confirmado
											</div>
										)}
									</CardFooter>
								</Card>
							</motion.div>
						))}
					</AnimatePresence>
				)}
			</div>
		</div>
	);
}
