/**
 * Automation Page - Dashboard de automações
 * Listagem e gerenciamento de automações visuais
 */

import {
	Plus,
	History,
	Sparkles,
	Lock,
	CheckCircle2,
	XCircle,
	SkipForward,
	Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import {
	useAutomationLogs,
	type AutomationLogEntry,
} from "@/hooks/useAutomationLogs";

function formatLogDate(value: AutomationLogEntry["started_at"]): string {
	if (!value) return "—";
	const date =
		typeof (value as { toDate?: () => Date }).toDate === "function"
			? (value as { toDate: () => Date }).toDate()
			: new Date((value as { seconds: number }).seconds * 1000);
	return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
}

export default function AutomationPage() {
	const { organizationId } = useAuth();

	const { data: automationLogs = [], isLoading: logsLoading } =
		useAutomationLogs(organizationId, { limitCount: 50 });

	return (
		<MainLayout>
			<div className="min-h-screen bg-background/50">
				{/* Header */}
				<div className="border-b bg-background/95 backdrop-blur">
					<div className="container mx-auto px-6 py-4">
						<div className="flex items-center justify-between">
							<div>
								<h1 className="text-2xl font-bold flex items-center gap-2">
									<Sparkles className="w-6 h-6 text-cyan-500" />
									Automações
								</h1>
								<p className="text-sm text-muted-foreground">
									Histórico operacional disponível; editor completo em implantação
								</p>
							</div>
							<Button disabled>
								<Plus className="w-4 h-4 mr-2" />
								Nova automação em implantação
							</Button>
						</div>
					</div>
				</div>

				<div className="container mx-auto px-6 py-6">
						<Tabs defaultValue="automations" className="space-y-6">
							<TabsList>
								<TabsTrigger value="automations">Minhas Automações</TabsTrigger>
								<TabsTrigger value="recipes">Biblioteca de Templates</TabsTrigger>
								<TabsTrigger value="history">Histórico de Execuções</TabsTrigger>
							</TabsList>

						{/* Minhas Automações */}
						<TabsContent value="automations" className="space-y-4">
							<EmptyState
								icon={Lock}
								title="Editor de automações em implantação"
								description="Esta tela não cria mais automações fictícias em memória. O histórico de execuções já é real; o CRUD do construtor visual será liberado quando a API de definições estiver pronta."
							/>
						</TabsContent>

						{/* Biblioteca de Templates */}
						<TabsContent value="recipes">
							<EmptyState
								icon={Sparkles}
								title="Biblioteca de templates indisponível por enquanto"
								description="Os templates voltarão quando a criação de automações estiver persistida no backend. Até lá, use esta área apenas para monitorar execuções."
							/>
						</TabsContent>

						{/* Histórico */}
						<TabsContent value="history">
							<Card>
								<CardHeader>
									<CardTitle>Histórico de Execuções</CardTitle>
									<CardDescription>
										Acompanhe a execução das suas automações
									</CardDescription>
								</CardHeader>
								<CardContent>
									{logsLoading ? (
										<div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
											<Loader2 className="h-5 w-5 animate-spin" />
											<span>Carregando histórico...</span>
										</div>
									) : automationLogs.length === 0 ? (
										<div className="text-center py-8 text-muted-foreground">
											<History className="w-12 h-12 mx-auto mb-4 opacity-50" />
											<p>Nenhuma execução registrada ainda.</p>
											<p className="text-sm mt-1">
												As execuções aparecem aqui quando suas automações forem
												disparadas.
											</p>
										</div>
									) : (
										<div className="rounded-md border overflow-x-auto">
											<table className="w-full text-sm">
												<thead>
													<tr className="border-b bg-muted/50">
														<th className="text-left p-3 font-medium">Data</th>
														<th className="text-left p-3 font-medium">
															Automação
														</th>
														<th className="text-left p-3 font-medium">
															Status
														</th>
														<th className="text-left p-3 font-medium">
															Duração
														</th>
														<th className="text-left p-3 font-medium">Erro</th>
													</tr>
												</thead>
												<tbody>
													{automationLogs.map((log) => (
														<tr
															key={log.id}
															className="border-b last:border-0 hover:bg-muted/30"
														>
															<td className="p-3 text-muted-foreground">
																{formatLogDate(log.started_at)}
															</td>
															<td className="p-3 font-medium">
																{log.automation_name}
															</td>
															<td className="p-3">
																{log.status === "success" && (
																	<Badge
																		variant="default"
																		className="gap-1 bg-green-600"
																	>
																		<CheckCircle2 className="h-3 w-3" />
																		Sucesso
																	</Badge>
																)}
																{log.status === "failed" && (
																	<Badge
																		variant="destructive"
																		className="gap-1"
																	>
																		<XCircle className="h-3 w-3" />
																		Falha
																	</Badge>
																)}
																{log.status === "skipped" && (
																	<Badge variant="secondary" className="gap-1">
																		<SkipForward className="h-3 w-3" />
																		Ignorada
																	</Badge>
																)}
															</td>
															<td className="p-3 text-muted-foreground">
																{log.duration_ms} ms
															</td>
															<td
																className="p-3 text-muted-foreground max-w-[200px] truncate"
																title={log.error}
															>
																{log.error ?? "—"}
															</td>
														</tr>
													))}
												</tbody>
											</table>
										</div>
									)}
								</CardContent>
							</Card>
						</TabsContent>
					</Tabs>
				</div>
			</div>
		</MainLayout>
	);
}
