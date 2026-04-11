import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { RelatorioMedicoData, RelatorioTemplate } from "@/pages/relatorios/RelatorioMedicoPage";

export function RelatorioTemplateManager({
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
}: {
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
}) {
	return (
		<Card>
			<CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
				<div>
					<CardTitle>Modelos de Relatório</CardTitle>
					<CardDescription>
						Crie e reutilize configurações para acelerar o fluxo.
					</CardDescription>
				</div>
				<Button variant="outline" size="sm" onClick={startCreateTemplate}>
					Novo modelo
				</Button>
			</CardHeader>
			<CardContent className="space-y-3">
				{isLoadingTemplates ? (
					<div className="text-sm text-muted-foreground">Carregando modelos...</div>
				) : (
					<div className="space-y-3">
						{templates.map((template) => {
							const isBuiltin = template.organization_id === "__builtin__";
							const handleEdit = () =>
								isBuiltin ? duplicateTemplate(template) : startEditTemplate(template);
							return (
								<div
									key={template.id}
									className="p-4 border rounded-lg flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
								>
									<div className="flex items-start gap-3">
										<div className="p-2 bg-muted rounded-lg">
											{templateIcon(template.tipo_relatorio)}
										</div>
										<div>
											<div className="flex items-center gap-2">
												<p className="font-semibold text-sm">{template.nome}</p>
												{isBuiltin && <Badge variant="outline">Padrão</Badge>}
											</div>
											<p className="text-xs text-muted-foreground">
												{template.descricao}
											</p>
											<div className="flex flex-wrap gap-1 mt-2">
												{template.campos.map((campo) => {
													const label =
														templateFieldOptions.find((o) => o.id === campo)
															?.label ?? campo;
													return (
														<Badge
															key={campo}
															variant="secondary"
															className="text-[10px]"
														>
															{label}
														</Badge>
													);
												})}
											</div>
										</div>
									</div>
									<div className="flex flex-wrap items-center gap-2">
										<Button size="sm" onClick={() => applyTemplate(template)}>
											Aplicar
										</Button>
										<Button size="sm" variant="outline" onClick={handleEdit}>
											Editar
										</Button>
										{!isBuiltin && (
											<Button
												size="sm"
												variant="destructive"
												onClick={() => onDeleteTemplate(template.id)}
												disabled={deleteTemplatePending}
											>
												Excluir
											</Button>
										)}
									</div>
								</div>
							);
						})}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
