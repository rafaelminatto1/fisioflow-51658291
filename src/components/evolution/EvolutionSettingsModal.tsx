import React, { useState, useEffect } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Settings, GripVertical, Eye, EyeOff, Save } from "lucide-react";
import { EvolutionVersion } from "./v2-improved/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface SlashCommandConfig {
	id: string;
	title: string;
	visible: boolean;
}

export interface EvolutionSettings {
	defaultViewVersion: EvolutionVersion;
	slashCommands: SlashCommandConfig[];
}

export const DEFAULT_SETTINGS: EvolutionSettings = {
	defaultViewVersion: "v4-tiptap",
	slashCommands: [
		{ id: "ai", title: "Assistente IA", visible: true },
		{ id: "soap", title: "Template SOAP", visible: true },
		{ id: "exercises", title: "Lista de Exercícios", visible: true },
		{ id: "image", title: "Imagem/Exame", visible: true },
	],
};

const SETTINGS_KEY = "fisioflow_evolution_settings_v1";

export function getEvolutionSettings(): EvolutionSettings {
	try {
		const stored = localStorage.getItem(SETTINGS_KEY);
		if (stored) {
			const parsed = JSON.parse(stored);
			// Merge with defaults to ensure all commands exist
			return {
				...DEFAULT_SETTINGS,
				...parsed,
				slashCommands: DEFAULT_SETTINGS.slashCommands
					.map((defaultCmd) => {
						const storedCmd = parsed.slashCommands?.find(
							(c: any) => c.id === defaultCmd.id,
						);
						return storedCmd
							? { ...defaultCmd, visible: storedCmd.visible }
							: defaultCmd;
					})
					.sort((a, b) => {
						const idxA =
							parsed.slashCommands?.findIndex((c: any) => c.id === a.id) ?? -1;
						const idxB =
							parsed.slashCommands?.findIndex((c: any) => c.id === b.id) ?? -1;
						if (idxA !== -1 && idxB !== -1) return idxA - idxB;
						if (idxA !== -1) return -1;
						if (idxB !== -1) return 1;
						return 0;
					}),
			};
		}
	} catch (e) {
		console.error("Error loading evolution settings:", e);
	}
	return DEFAULT_SETTINGS;
}

export function saveEvolutionSettings(settings: EvolutionSettings) {
	localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

interface EvolutionSettingsModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	currentViewVersion: EvolutionVersion;
	onViewVersionChange: (version: EvolutionVersion) => void;
}

export function EvolutionSettingsModal({
	open,
	onOpenChange,
	currentViewVersion: _currentViewVersion,
	onViewVersionChange,
}: EvolutionSettingsModalProps) {
	const [settings, setSettings] = useState<EvolutionSettings>(DEFAULT_SETTINGS);

	useEffect(() => {
		if (open) {
			setSettings(getEvolutionSettings());
		}
	}, [open]);

	const handleSave = () => {
		saveEvolutionSettings(settings);
		onViewVersionChange(settings.defaultViewVersion);
		toast.success("Configurações salvas com sucesso");
		onOpenChange(false);
	};

	const moveCommand = (index: number, direction: -1 | 1) => {
		const newCommands = [...settings.slashCommands];
		if (index + direction < 0 || index + direction >= newCommands.length)
			return;

		const temp = newCommands[index];
		newCommands[index] = newCommands[index + direction];
		newCommands[index + direction] = temp;

		setSettings({ ...settings, slashCommands: newCommands });
	};

	const toggleCommandVisibility = (id: string) => {
		setSettings({
			...settings,
			slashCommands: settings.slashCommands.map((cmd) =>
				cmd.id === id ? { ...cmd, visible: !cmd.visible } : cmd,
			),
		});
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Settings className="w-5 h-5" />
						Configurações da Evolução
					</DialogTitle>
					<DialogDescription>
						Personalize como você prefere visualizar e usar o prontuário.
					</DialogDescription>
				</DialogHeader>

				<div className="py-4 space-y-6">
					<div className="space-y-3">
						<Label className="text-base font-semibold">
							Visualização Padrão
						</Label>
						<div className="grid grid-cols-2 gap-2">
							<Button
								variant={
									settings.defaultViewVersion === "v4-tiptap"
										? "default"
										: "outline"
								}
								className="justify-start"
								onClick={() =>
									setSettings({ ...settings, defaultViewVersion: "v4-tiptap" })
								}
							>
								Tiptap (Recomendado)
							</Button>
							<Button
								variant={
									settings.defaultViewVersion === "v3-notion"
										? "default"
										: "outline"
								}
								className="justify-start"
								onClick={() =>
									setSettings({ ...settings, defaultViewVersion: "v3-notion" })
								}
							>
								Estilo Notion
							</Button>
							<Button
								variant={
									settings.defaultViewVersion === "v2-texto"
										? "default"
										: "outline"
								}
								className="justify-start"
								onClick={() =>
									setSettings({ ...settings, defaultViewVersion: "v2-texto" })
								}
							>
								Blocos de Texto
							</Button>
							<Button
								variant={
									settings.defaultViewVersion === "v1-soap"
										? "default"
										: "outline"
								}
								className="justify-start"
								onClick={() =>
									setSettings({ ...settings, defaultViewVersion: "v1-soap" })
								}
							>
								SOAP Clássico
							</Button>
						</div>
					</div>

					<div className="space-y-3">
						<Label className="text-base font-semibold">
							Comandos Rápidos ( / )
						</Label>
						<p className="text-xs text-muted-foreground">
							Reordene ou oculte os atalhos disponíveis no editor Tiptap.
						</p>
						<div className="space-y-2 border rounded-md p-2 bg-muted/20">
							{settings.slashCommands.map((cmd, idx) => (
								<div
									key={cmd.id}
									className={cn(
										"flex items-center justify-between p-2 rounded-md border bg-background",
										!cmd.visible && "opacity-60",
									)}
								>
									<div className="flex items-center gap-2">
										<div className="flex flex-col">
											<button
												onClick={() => moveCommand(idx, -1)}
												disabled={idx === 0}
												className="text-muted-foreground hover:text-foreground disabled:opacity-30"
											>
												<GripVertical className="w-3 h-3" />
											</button>
										</div>
										<span className="text-sm font-medium">{cmd.title}</span>
									</div>
									<div className="flex items-center gap-3">
										<Button
											variant="ghost"
											size="sm"
											className="h-8 px-2"
											onClick={() => toggleCommandVisibility(cmd.id)}
										>
											{cmd.visible ? (
												<Eye className="w-4 h-4" />
											) : (
												<EyeOff className="w-4 h-4" />
											)}
										</Button>
									</div>
								</div>
							))}
						</div>
					</div>
				</div>

				<div className="flex justify-end gap-2 mt-4">
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancelar
					</Button>
					<Button onClick={handleSave} className="gap-2">
						<Save className="w-4 h-4" />
						Salvar Preferências
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
