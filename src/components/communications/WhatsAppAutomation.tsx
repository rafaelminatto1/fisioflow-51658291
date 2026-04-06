import React from "react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { whatsappApi } from "@/api/v2";
import { 
	MessageSquare, 
	Settings, 
	RefreshCcw, 
	CheckCircle2, 
	Bell,
	Calendar,
	History
} from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function WhatsAppAutomation() {
	const queryClient = useQueryClient();

	// Queries
	const { data: config, isLoading: loadingConfig } = useQuery({
		queryKey: ["whatsapp-config"],
		queryFn: async () => {
			const res = await whatsappApi.getConfig();
			return res?.data ?? { enabled: false };
		},
	});

	const { data: templates, isLoading: loadingTemplates } = useQuery({
		queryKey: ["whatsapp-templates"],
		queryFn: async () => {
			const res = await whatsappApi.listTemplates();
			return res?.data ?? [];
		},
	});

	const { data: logs } = useQuery({
		queryKey: ["whatsapp-logs"],
		queryFn: async () => {
			const res = await whatsappApi.listWebhookLogs({ limit: 10 });
			return res?.data ?? [];
		},
	});

	// Mutation
	const updateTemplateMutation = useMutation({
		mutationFn: (vars: { id: string; status: string }) => 
			whatsappApi.updateTemplate(vars.id, { status: vars.status }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["whatsapp-templates"] });
			toast.success("Status do template atualizado!");
		},
		onError: () => toast.error("Falha ao atualizar template."),
	});

	if (loadingConfig || loadingTemplates) {
		return (
			<div className="space-y-6">
				<Skeleton className="h-32 w-full rounded-2xl" />
				<div className="grid gap-6 md:grid-cols-2">
					<Skeleton className="h-64 w-full rounded-2xl" />
					<Skeleton className="h-64 w-full rounded-2xl" />
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-8 animate-fade-in max-w-6xl mx-auto">
			{/* Master Switch & Status */}
			<Card className="border-none shadow-sm ring-1 ring-border/50 bg-background overflow-hidden">
				<div className={`h-1.5 w-full ${config?.enabled ? 'bg-emerald-500' : 'bg-slate-300'}`} />
				<CardHeader className="flex flex-row items-center justify-between pb-6">
					<div className="space-y-1">
						<div className="flex items-center gap-2">
							<div className={`p-2 rounded-lg ${config?.enabled ? 'bg-emerald-500/10' : 'bg-slate-100'}`}>
								<MessageSquare className={`h-5 w-5 ${config?.enabled ? 'text-emerald-600' : 'text-slate-500'}`} />
							</div>
							<CardTitle className="text-xl font-bold">Automação de WhatsApp</CardTitle>
						</div>
						<CardDescription>
							Envio automático de lembretes, confirmações e notificações via Meta API Oficial
						</CardDescription>
					</div>
					<div className="flex items-center gap-4 bg-muted/30 p-3 rounded-2xl border border-border/50">
						<div className="flex flex-col items-end mr-2">
							<span className="text-[10px] font-bold uppercase text-muted-foreground">Status do Serviço</span>
							<span className={`text-xs font-bold ${config?.enabled ? 'text-emerald-600' : 'text-slate-500'}`}>
								{config?.enabled ? 'CONECTADO' : 'DESATIVADO'}
							</span>
						</div>
						<Switch 
							checked={config?.enabled as boolean} 
							onCheckedChange={() => toast.info("Funcionalidade em transição de sandbox")} 
						/>
					</div>
				</CardHeader>
			</Card>

			<div className="grid gap-8 lg:grid-cols-3">
				{/* Templates Section */}
				<div className="lg:col-span-2 space-y-6">
					<div className="flex items-center justify-between">
						<h3 className="text-lg font-bold flex items-center gap-2">
							<Settings className="h-5 w-5 text-primary" />
							Regras de Disparo (Templates)
						</h3>
						<Button variant="outline" size="sm" className="rounded-xl h-8 text-xs font-bold gap-2">
							<RefreshCcw className="h-3 w-3" />
							Sincronizar Meta
						</Button>
					</div>

					<div className="grid gap-4">
						{templates.map((template) => (
							<Card key={template.id} className="border-none shadow-sm ring-1 ring-border/50 bg-background hover:ring-primary/20 transition-all">
								<CardContent className="p-5">
									<div className="flex items-start justify-between gap-4">
										<div className="space-y-3 flex-1">
											<div className="flex items-center gap-2">
												<div className="p-1.5 bg-primary/5 rounded-md">
													<Calendar className="h-3.5 w-3.5 text-primary" />
												</div>
												<span className="font-bold text-sm tracking-tight capitalize">
													{template.name.replace(/_/g, ' ')}
												</span>
												<Badge variant={template.status === 'ativo' ? 'secondary' : 'outline'} className="text-[9px] h-4 font-black uppercase tracking-tighter">
													{template.status}
												</Badge>
											</div>
											<p className="text-xs text-muted-foreground leading-relaxed bg-muted/20 p-3 rounded-xl border border-dashed border-border">
												{template.content}
											</p>
										</div>
										<div className="flex flex-col items-end gap-4">
											<Switch 
												checked={template.status === 'ativo'} 
												onCheckedChange={(checked) => updateTemplateMutation.mutate({ 
													id: template.id, 
													status: checked ? 'ativo' : 'inativo' 
												})}
											/>
											<span className="text-[10px] text-muted-foreground font-medium">Auto-envio</span>
										</div>
									</div>
								</CardContent>
							</Card>
						))}
					</div>
				</div>

				{/* Quick Stats & Activity */}
				<div className="space-y-6">
					<h3 className="text-lg font-bold flex items-center gap-2">
						<History className="h-5 w-5 text-blue-500" />
						Atividade Recente
					</h3>

					<Card className="border-none shadow-sm ring-1 ring-border/50 bg-background overflow-hidden">
						<CardHeader className="bg-muted/30 border-b border-border/40 pb-3">
							<CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Últimos Eventos Webhook</CardTitle>
						</CardHeader>
						<CardContent className="p-0">
							<ScrollArea className="h-[400px]">
								{logs.length > 0 ? logs.map((log, i) => (
									<div key={log.id} className={`p-4 border-b border-border/40 last:border-0 ${i % 2 === 0 ? 'bg-background' : 'bg-muted/5'}`}>
										<div className="flex items-center justify-between mb-1.5">
											<div className="flex items-center gap-2">
												{log.event_type.includes('deliver') || log.event_type.includes('sent') ? (
													<CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
												) : (
													<Bell className="h-3.5 w-3.5 text-blue-500" />
												)}
												<span className="text-xs font-bold tracking-tight">
													{log.event_type.replace(/_/g, ' ')}
												</span>
											</div>
											<span className="text-[10px] text-muted-foreground font-medium">
												{format(new Date(log.created_at), "HH:mm", { locale: ptBR })}
											</span>
										</div>
										<p className="text-[11px] text-muted-foreground truncate font-medium">
											Para: {log.phone_number || 'Sandbox'}
										</p>
									</div>
								)) : (
									<div className="p-8 text-center text-muted-foreground text-sm font-medium italic">
										Nenhuma atividade registrada hoje.
									</div>
								)}
							</ScrollArea>
						</CardContent>
					</Card>

					<div className="p-5 rounded-2xl bg-blue-500/5 border border-blue-500/10 space-y-3">
						<div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wider">
							<Settings className="h-3.5 w-3.5" />
							Configurações do Robô
						</div>
						<div className="space-y-2">
							<div className="flex items-center justify-between">
								<span className="text-xs font-medium text-muted-foreground">Antecedência</span>
								<Badge variant="outline" className="text-[10px] font-bold">24 horas</Badge>
							</div>
							<div className="flex items-center justify-between">
								<span className="text-xs font-medium text-muted-foreground">Horário de disparo</span>
								<Badge variant="outline" className="text-[10px] font-bold">09:00 AM</Badge>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
