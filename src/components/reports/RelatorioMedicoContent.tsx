import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
	Cloud,
	Download,
	Edit,
	Eye,
	FileText,
	Stethoscope,
	Trash2,
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { PatientCombobox } from "@/components/ui/patient-combobox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LazyPdfDownloadButton } from "@/components/pdf/LazyPdfDownloadButton";
import { RelatorioTemplateManager } from "@/components/reports/RelatorioTemplateManager";
import type {
	RelatorioMedicoData,
	RelatorioTemplate,
} from "@/pages/relatorios/RelatorioMedicoPage";

export function RelatorioMedicoContent({
	activeTab,
	setActiveTab,
	pacientes,
	selectedPatientId,
	handlePatientSelect,
	templates,
	isLoadingTemplates,
	templateFieldOptions,
	templateIcon,
	startCreateTemplate,
	applyTemplate,
	startEditTemplate,
	duplicateTemplate,
	deleteTemplatePending,
	onDeleteTemplate,
	relatorios,
	isLoading,
	onPreviewRelatorio,
	onEditRelatorio,
	onDeleteRelatorio,
	deleteRelatorioPending,
	onGenerateGoogleDocs,
	loadRelatorioMedicoPdf,
}: {
	activeTab: "criar" | "lista";
	setActiveTab: (value: "criar" | "lista") => void;
	pacientes: any[];
	selectedPatientId: string;
	handlePatientSelect: (value: string) => void;
	templates: RelatorioTemplate[];
	isLoadingTemplates: boolean;
	templateFieldOptions: Array<{ id: string; label: string }>;
	templateIcon: (tipo: RelatorioMedicoData["tipo_relatorio"]) => React.ReactNode;
	startCreateTemplate: () => void;
	applyTemplate: (template: RelatorioTemplate) => void;
	startEditTemplate: (template: RelatorioTemplate) => void;
	duplicateTemplate: (template: RelatorioTemplate) => void;
	deleteTemplatePending: boolean;
	onDeleteTemplate: (templateId: string) => void;
	relatorios: RelatorioMedicoData[];
	isLoading: boolean;
	onPreviewRelatorio: (relatorio: RelatorioMedicoData) => void;
	onEditRelatorio: (relatorio: RelatorioMedicoData) => void;
	onDeleteRelatorio: (relatorioId: string) => void;
	deleteRelatorioPending: boolean;
	onGenerateGoogleDocs: (relatorio: RelatorioMedicoData) => void;
	loadRelatorioMedicoPdf: () => Promise<{
		default: React.ComponentType<{ data: RelatorioMedicoData }>;
	}>;
}) {
	return (
		<MainLayout>
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-3xl font-bold flex items-center gap-2">
							<Stethoscope className="h-8 w-8 text-primary" />
							Relatórios para Médicos
						</h1>
						<p className="text-muted-foreground mt-1">
							Crie relatórios para comunicação com profissionais de saúde
						</p>
					</div>
				</div>

				<Alert>
					<FileText className="h-4 w-4" />
					<AlertDescription>
						Estes relatórios são destinados à comunicação entre profissionais de
						saúde. Todas as informações são confidenciais e protegidas por
						sigilo profissional.
					</AlertDescription>
				</Alert>

				<Tabs
					value={activeTab}
					onValueChange={(v) => setActiveTab(v as "criar" | "lista")}
				>
					<TabsList>
						<TabsTrigger value="criar">Criar Relatório</TabsTrigger>
						<TabsTrigger value="lista">Relatórios Salvos</TabsTrigger>
					</TabsList>

					<TabsContent value="criar" className="space-y-4">
						<Card>
							<CardHeader>
								<CardTitle>Selecione o Paciente</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="space-y-2">
									<Label>Paciente *</Label>
									<PatientCombobox
										patients={pacientes}
										value={selectedPatientId}
										onValueChange={handlePatientSelect}
										className="w-full"
									/>
								</div>
							</CardContent>
						</Card>

						<RelatorioTemplateManager
							templates={templates}
							isLoadingTemplates={isLoadingTemplates}
							templateFieldOptions={templateFieldOptions}
							templateIcon={templateIcon}
							startCreateTemplate={startCreateTemplate}
							applyTemplate={applyTemplate}
							startEditTemplate={startEditTemplate}
							duplicateTemplate={duplicateTemplate}
							deleteTemplatePending={deleteTemplatePending}
							onDeleteTemplate={onDeleteTemplate}
						/>
					</TabsContent>

					<TabsContent value="lista" className="space-y-4">
						<Card>
							<CardContent className="pt-4">
								{isLoading ? (
									<div className="text-center py-8 text-muted-foreground">
										Carregando...
									</div>
								) : !relatorios.length ? (
									<div className="text-center py-12 text-muted-foreground">
										<FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
										<p>Nenhum relatório salvo ainda.</p>
									</div>
								) : (
									<div className="space-y-2">
										{relatorios.map((relatorio) => (
											<div
												key={relatorio.id}
												className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/5"
											>
												<div className="flex-1">
													<div className="flex items-center gap-2">
														<p className="font-semibold">
															{relatorio.paciente?.nome}
														</p>
														{relatorio.urgencia === "alta" && (
															<Badge variant="destructive">Alta</Badge>
														)}
													</div>
													<p className="text-sm text-muted-foreground">
														{format(
															new Date(relatorio.data_emissao),
															"dd/MM/yyyy 'às' HH:mm",
															{ locale: ptBR },
														)}
													</p>
													<div className="flex items-center gap-2 mt-1">
														<Badge variant="outline">
															{relatorio.tipo_relatorio}
														</Badge>
														{relatorio.profissional_destino?.nome && (
															<Badge variant="secondary">
																Para: {relatorio.profissional_destino.nome}
															</Badge>
														)}
													</div>
												</div>
												<div className="flex items-center gap-2">
													<Button
														variant="ghost"
														size="sm"
														onClick={() => onPreviewRelatorio(relatorio)}
													>
														<Eye className="h-4 w-4 mr-1" />
														Visualizar
													</Button>
													<Button
														variant="ghost"
														size="sm"
														onClick={() => onEditRelatorio(relatorio)}
													>
														<Edit className="h-4 w-4 mr-1" />
														Editar
													</Button>
													<Button
														variant="ghost"
														size="sm"
														className="text-destructive"
														disabled={deleteRelatorioPending}
														onClick={() => {
															if (
																window.confirm(
																	"Excluir este relatório definitivamente?",
																)
															) {
																onDeleteRelatorio(relatorio.id);
															}
														}}
													>
														<Trash2 className="h-4 w-4 mr-1" />
														Excluir
													</Button>
													<Button
														variant="ghost"
														size="sm"
														onClick={() => onGenerateGoogleDocs(relatorio)}
													>
														<Cloud className="h-4 w-4 mr-1 text-blue-500" />
														Google Docs
													</Button>
													<LazyPdfDownloadButton
														loadDocument={loadRelatorioMedicoPdf}
														documentProps={{ data: relatorio }}
														fileName={`relatorio-medico-${relatorio.paciente?.nome?.replace(/\s+/g, "-")}-${format(new Date(relatorio.data_emissao), "dd-MM-yyyy")}.pdf`}
														label="PDF"
														icon={<Download className="mr-1 h-4 w-4" />}
														buttonProps={{ size: "sm" }}
													/>
												</div>
											</div>
										))}
									</div>
								)}
							</CardContent>
						</Card>
					</TabsContent>
				</Tabs>
			</div>
		</MainLayout>
	);
}
