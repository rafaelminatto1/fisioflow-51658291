import { useState, useEffect } from "react";
import {
	Sparkles,
	Plus,
	Loader2,
	Power,
	PowerOff,
	Trash2,
	Edit,
	AlertCircle,
	Variable,
} from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import {
	fetchAutomationRules,
	createAutomationRule,
	updateAutomationRule,
	deleteAutomationRule,
	type AutomationRule,
} from "@/services/whatsapp-api";

const TRIGGER_TYPES = [
	{ value: "message_received", label: "Mensagem recebida" },
	{ value: "conversation_created", label: "Conversa criada" },
	{ value: "status_changed", label: "Status alterado" },
	{ value: "keyword_match", label: "Palavra-chave detectada" },
	{ value: "no_response", label: "Sem resposta (SLA)" },
];

const TEMPLATE_VARIABLES = [
	{ name: "{{contact.name}}", description: "Nome do contato" },
	{ name: "{{contact.phone}}", description: "Telefone do contato" },
	{ name: "{{patient.name}}", description: "Nome do paciente" },
	{ name: "{{agent.name}}", description: "Nome do agente" },
	{ name: "{{conversation.id}}", description: "ID da conversa" },
	{ name: "{{conversation.status}}", description: "Status da conversa" },
	{ name: "{{message.content}}", description: "Conteúdo da mensagem" },
	{ name: "{{current.date}}", description: "Data atual" },
	{ name: "{{current.time}}", description: "Hora atual" },
];

function AutomationRuleCard({
	rule,
	onToggle,
	onEdit,
	onDelete,
}: {
	rule: AutomationRule;
	onToggle: () => void;
	onEdit: () => void;
	onDelete: () => void;
}) {
	const triggerLabel =
		TRIGGER_TYPES.find((t) => t.value === rule.triggerType)?.label ||
		rule.triggerType;

	return (
		<Card className={rule.active ? "" : "opacity-60"}>
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div
							className={`h-8 w-8 rounded-lg flex items-center justify-center ${rule.active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}
						>
							<Sparkles className="h-4 w-4" />
						</div>
						<div>
							<CardTitle className="text-base">{rule.name}</CardTitle>
							{rule.description && (
								<CardDescription className="text-xs mt-0.5">
									{rule.description}
								</CardDescription>
							)}
						</div>
					</div>
					<div className="flex items-center gap-2">
						<Switch checked={rule.active} onCheckedChange={onToggle} />
						<Button
							variant="ghost"
							size="icon"
							className="h-8 w-8"
							onClick={onEdit}
						>
							<Edit className="h-4 w-4" />
						</Button>
						<Button
							variant="ghost"
							size="icon"
							className="h-8 w-8 text-destructive"
							onClick={onDelete}
						>
							<Trash2 className="h-4 w-4" />
						</Button>
					</div>
				</div>
			</CardHeader>
			<CardContent>
				<div className="flex items-center gap-4 text-xs text-muted-foreground">
					<span>
						Gatilho:{" "}
						<Badge variant="outline" className="text-[10px]">
							{triggerLabel}
						</Badge>
					</span>
					<span>Ações: {rule.actions.length}</span>
					{rule.team && <span>Equipe: {rule.team}</span>}
					<Badge
						variant={rule.active ? "default" : "secondary"}
						className="text-[10px]"
					>
						{rule.active ? (
							<span className="flex items-center gap-1">
								<Power className="h-3 w-3" /> Ativa
							</span>
						) : (
							<span className="flex items-center gap-1">
								<PowerOff className="h-3 w-3" /> Inativa
							</span>
						)}
					</Badge>
				</div>
			</CardContent>
		</Card>
	);
}

export default function WhatsAppAutomationsPage() {
	const [rules, setRules] = useState<AutomationRule[]>([]);
	const [loading, setLoading] = useState(true);
	const [showDialog, setShowDialog] = useState(false);
	const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);
	const [form, setForm] = useState({
		name: "",
		description: "",
		triggerType: "message_received",
		conditions: "{}",
		actions: "[{}]",
		active: true,
		team: "",
	});
	const [saving, setSaving] = useState(false);

	const loadRules = async () => {
		try {
			const data = await fetchAutomationRules();
			setRules(data);
		} catch {
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		loadRules();
	});

	const openCreate = () => {
		setEditingRule(null);
		setForm({
			name: "",
			description: "",
			triggerType: "message_received",
			conditions: "{}",
			actions: '[{"type": "send_message", "params": {"content": ""}}]',
			active: true,
			team: "",
		});
		setShowDialog(true);
	};

	const openEdit = (rule: AutomationRule) => {
		setEditingRule(rule);
		setForm({
			name: rule.name,
			description: rule.description || "",
			triggerType: rule.triggerType,
			conditions: JSON.stringify(rule.conditions, null, 2),
			actions: JSON.stringify(rule.actions, null, 2),
			active: rule.active,
			team: rule.team || "",
		});
		setShowDialog(true);
	};

	const handleSave = async () => {
		setSaving(true);
		try {
			const parsedConditions = JSON.parse(form.conditions);
			const parsedActions = JSON.parse(form.actions);

			if (editingRule) {
				await updateAutomationRule(editingRule.id, {
					name: form.name,
					description: form.description || undefined,
					triggerType: form.triggerType as AutomationRule["triggerType"],
					conditions: parsedConditions,
					actions: parsedActions,
					active: form.active,
					team: form.team || undefined,
				});
			} else {
				await createAutomationRule({
					name: form.name,
					description: form.description || undefined,
					triggerType: form.triggerType as AutomationRule["triggerType"],
					conditions: parsedConditions,
					actions: parsedActions,
					active: form.active,
					team: form.team || undefined,
				});
			}
			setShowDialog(false);
			loadRules();
		} catch {
		} finally {
			setSaving(false);
		}
	};

	const handleToggle = async (rule: AutomationRule) => {
		await updateAutomationRule(rule.id, { active: !rule.active });
		loadRules();
	};

	const handleDelete = async (rule: AutomationRule) => {
		await deleteAutomationRule(rule.id);
		loadRules();
	};

	return (
		<MainLayout>
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
							<Sparkles className="h-6 w-6 text-cyan-500" />
							Automações WhatsApp
						</h1>
						<p className="text-muted-foreground">
							Gerencie regras de automação para o inbox
						</p>
					</div>
					<Button onClick={openCreate}>
						<Plus className="h-4 w-4 mr-2" />
						Nova automação
					</Button>
				</div>

				{loading ? (
					<div className="flex items-center justify-center h-64">
						<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
					</div>
				) : rules.length === 0 ? (
					<EmptyState
						icon={Sparkles}
						title="Nenhuma automação configurada"
						description="Crie automações para responder mensagens automaticamente, categorizar conversas e muito mais."
						action={
							<Button onClick={openCreate}>
								<Plus className="h-4 w-4 mr-2" />
								Criar automação
							</Button>
						}
					/>
				) : (
					<div className="grid gap-4 md:grid-cols-2">
						{rules.map((rule) => (
							<AutomationRuleCard
								key={rule.id}
								rule={rule}
								onToggle={() => handleToggle(rule)}
								onEdit={() => openEdit(rule)}
								onDelete={() => handleDelete(rule)}
							/>
						))}
					</div>
				)}

				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-base">
							<Variable className="h-5 w-5" />
							Variáveis de template
						</CardTitle>
						<CardDescription>
							Use estas variáveis nas condições e ações das automações
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-2 md:grid-cols-3 gap-2">
							{TEMPLATE_VARIABLES.map((v) => (
								<div
									key={v.name}
									className="flex items-center gap-2 p-2 rounded-md bg-muted/50"
								>
									<code className="text-xs font-mono text-primary">
										{v.name}
									</code>
									<span className="text-xs text-muted-foreground">
										{v.description}
									</span>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			</div>

			<Dialog open={showDialog} onOpenChange={setShowDialog}>
				<DialogContent className="max-w-2xl">
					<DialogHeader>
						<DialogTitle>
							{editingRule ? "Editar automação" : "Nova automação"}
						</DialogTitle>
					</DialogHeader>
					<div className="space-y-4">
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label htmlFor="wa-auto-name">Nome</Label>
								<Input
									id="wa-auto-name"
									value={form.name}
									onChange={(e) =>
										setForm((f) => ({ ...f, name: e.target.value }))
									}
									placeholder="Nome da automação"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="wa-auto-trigger">Tipo de gatilho</Label>
								<Select
									value={form.triggerType}
									onValueChange={(v) =>
										setForm((f) => ({ ...f, triggerType: v }))
									}
								>
									<SelectTrigger id="wa-auto-trigger">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{TRIGGER_TYPES.map((t) => (
											<SelectItem key={t.value} value={t.value}>
												{t.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>
						<div className="space-y-2">
							<Label htmlFor="wa-auto-desc">Descrição</Label>
							<Input
								id="wa-auto-desc"
								value={form.description}
								onChange={(e) =>
									setForm((f) => ({ ...f, description: e.target.value }))
								}
								placeholder="Descrição (opcional)"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="wa-auto-team">Equipe</Label>
							<Input
								id="wa-auto-team"
								value={form.team}
								onChange={(e) =>
									setForm((f) => ({ ...f, team: e.target.value }))
								}
								placeholder="Equipe (opcional)"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="wa-auto-conditions">Condições (JSON)</Label>
							<Textarea
								id="wa-auto-conditions"
								value={form.conditions}
								onChange={(e) =>
									setForm((f) => ({ ...f, conditions: e.target.value }))
								}
								rows={4}
								className="font-mono text-xs"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="wa-auto-actions">Ações (JSON)</Label>
							<Textarea
								id="wa-auto-actions"
								value={form.actions}
								onChange={(e) =>
									setForm((f) => ({ ...f, actions: e.target.value }))
								}
								rows={6}
								className="font-mono text-xs"
							/>
						</div>
						<div className="flex items-center gap-2">
							<Switch
								checked={form.active}
								onCheckedChange={(v) => setForm((f) => ({ ...f, active: v }))}
							/>
							<span className="text-sm">Ativa</span>
						</div>
					</div>
					<DialogFooter>
						<DialogClose asChild>
							<Button variant="outline">Cancelar</Button>
						</DialogClose>
						<Button onClick={handleSave} disabled={saving || !form.name}>
							{saving ? (
								<Loader2 className="h-4 w-4 animate-spin mr-2" />
							) : null}
							{editingRule ? "Salvar" : "Criar"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</MainLayout>
	);
}
