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
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Megaphone, Plus } from "lucide-react";
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

interface Announcement {
	id: string;
	title: string;
	content: string;
	is_mandatory: boolean;
	type: string;
	created_at: string;
	is_read: boolean;
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

export function CompanyAnnouncements() {
	const { user } = useAuth();
	const { toast } = useToast();
	const queryClient = useQueryClient();
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [newTitle, setNewTitle] = useState("");
	const [newContent, setNewContent] = useState("");
	const [pushNotify, setPushNotify] = useState(true);

	const isAdmin = user?.role === "admin" || user?.role === "owner";

	const { data: announcements = [], isLoading } = useQuery<Announcement[]>({
		queryKey: ["announcements", "announcement"],
		queryFn: async () => {
			const res = await request("/api/announcements?type=announcement");
			return res.data;
		},
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
			toast({ title: "Comunicado enviado com sucesso!" });
			setIsDialogOpen(false);
			setNewTitle("");
			setNewContent("");
		},
		onError: () => {
			toast({ title: "Erro ao enviar comunicado", variant: "destructive" });
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
		},
	});

	const handleCreate = () => {
		if (!newTitle.trim() || !newContent.trim()) return;
		createMutation.mutate({
			title: newTitle,
			content: newContent,
			type: "announcement",
			isMandatory: false,
		});
	};

	if (isLoading) {
		return (
			<div className="p-8 text-center text-muted-foreground animate-pulse">
				Carregando comunicados...
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex justify-between items-center">
				<div>
					<h2 className="text-xl font-bold tracking-tight">Mural de Avisos</h2>
					<p className="text-sm text-muted-foreground">
						Novidades e comunicados importantes da clínica.
					</p>
				</div>

				{isAdmin && (
					<Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
						<DialogTrigger asChild>
							<Button className="gap-2 shadow-premium-sm">
								<Plus className="w-4 h-4" /> Novo Comunicado
							</Button>
						</DialogTrigger>
						<DialogContent className="sm:max-w-lg">
							<DialogHeader>
								<DialogTitle className="text-xl font-bold">
									Criar Novo Comunicado
								</DialogTitle>
							</DialogHeader>
							<div className="space-y-4 py-4">
								<div className="space-y-2">
									<Label className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">
										Título
									</Label>
									<Input
										className="rounded-xl"
										placeholder="Ex: Nova parceria de convênio"
										value={newTitle}
										onChange={(e) => setNewTitle(e.target.value)}
									/>
								</div>
								<div className="space-y-2">
									<Label className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">
										Mensagem
									</Label>
									<Textarea
										className="rounded-xl resize-none"
										placeholder="Detalhes do comunicado..."
										rows={6}
										value={newContent}
										onChange={(e) => setNewContent(e.target.value)}
									/>
								</div>
								<div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-dashed border-muted-foreground/30">
									<Switch
										id="push-notify"
										checked={pushNotify}
										onCheckedChange={setPushNotify}
									/>
									<Label
										htmlFor="push-notify"
										className="flex flex-col cursor-pointer flex-1"
									>
										<span className="font-bold text-sm">
											Notificar via Push
										</span>
										<span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
											Dispara notificação para todos os aparelhos
										</span>
									</Label>
								</div>
								<Button
									className="w-full py-6 rounded-xl font-bold text-lg"
									onClick={handleCreate}
									disabled={createMutation.isPending}
								>
									{createMutation.isPending
										? "Enviando..."
										: "Publicar Comunicado"}
								</Button>
							</div>
						</DialogContent>
					</Dialog>
				)}
			</div>

			<div className="grid gap-4">
				{announcements.length === 0 ? (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						className="border-2 border-dashed rounded-3xl bg-muted/20 p-20 flex flex-col items-center justify-center text-muted-foreground text-center"
					>
						<Megaphone className="w-16 h-16 mb-4 opacity-10" />
						<p className="font-medium tracking-tight">
							Nenhum comunicado disponível.
						</p>
					</motion.div>
				) : (
					<AnimatePresence mode="popLayout">
						{announcements.map((announcement, index) => (
							<motion.div
								key={announcement.id}
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, scale: 0.95 }}
								transition={{ delay: index * 0.05 }}
							>
								<Card
									className={cn(
										"border-border/40 hover:border-primary/40 transition-all duration-300 rounded-2xl overflow-hidden relative group",
										!announcement.is_read &&
											!isAdmin &&
											"bg-primary/[0.01] border-primary/20 shadow-sm",
									)}
								>
									{!announcement.is_read && !isAdmin && (
										<div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
									)}
									<CardHeader className="pb-3">
										<div className="flex justify-between items-start gap-4">
											<div className="space-y-1">
												<CardTitle className="text-lg font-bold tracking-tight group-hover:text-primary transition-colors">
													{announcement.title}
												</CardTitle>
												<CardDescription className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
													<span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-muted-foreground">
														{format(
															new Date(announcement.created_at),
															"dd MMM, yyyy",
															{ locale: ptBR },
														)}
													</span>
													<span className="text-muted-foreground/40">•</span>
													<span className="text-muted-foreground">
														{format(
															new Date(announcement.created_at),
															"HH:mm",
															{ locale: ptBR },
														)}
													</span>
												</CardDescription>
											</div>
											<div className="flex gap-2 shrink-0">
												{!announcement.is_read && !isAdmin && (
													<Button
														variant="secondary"
														size="sm"
														className="h-8 rounded-lg gap-1.5 font-bold text-[11px] bg-primary/10 text-primary hover:bg-primary/20 border-none"
														onClick={() =>
															markReadMutation.mutate(announcement.id)
														}
													>
														<CheckCircle2 className="w-3.5 h-3.5" /> Marcar Lido
													</Button>
												)}
												{announcement.is_read && !isAdmin && (
													<Badge className="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-100/50">
														<CheckCircle2 className="w-3 h-3 mr-1" /> Lido
													</Badge>
												)}
											</div>
										</div>
									</CardHeader>
									<CardContent>
										<div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-600 dark:text-slate-400">
											{announcement.content}
										</div>
									</CardContent>
								</Card>
							</motion.div>
						))}
					</AnimatePresence>
				)}
			</div>
		</div>
	);
}
