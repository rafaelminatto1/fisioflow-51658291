import React from "react";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Contrast, ZapOff, Type, Info, Monitor, Sun, Moon } from "lucide-react";
import { useTheme, type FontSize } from "@/components/ui/theme/ThemeProvider";

export function AccessibilityTab() {
	const { theme, setTheme } = useTheme();

	return (
		<div className="space-y-4">
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Contrast className="h-5 w-5" /> Aparência e Visual
					</CardTitle>
					<CardDescription>
						Personalize a interface do sistema para suas preferências
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					{/* Mode Selection */}
					<div className="space-y-3">
						<Label className="text-sm font-medium">Modo do Tema</Label>
						<div className="grid grid-cols-3 gap-3">
							{[
								{ id: "light", label: "Claro", icon: Sun },
								{ id: "dark", label: "Escuro", icon: Moon },
								{ id: "system", label: "Sistema", icon: Monitor },
							].map((mode) => (
								<Button
									key={mode.id}
									variant={theme.mode === mode.id ? "default" : "outline"}
									className="flex flex-col items-center justify-center gap-2 h-20"
									onClick={() => setTheme({ mode: mode.id as any })}
								>
									<mode.icon className="h-5 w-5" />
									<span className="text-xs">{mode.label}</span>
								</Button>
							))}
						</div>
					</div>

					<Separator />

					{/* High Contrast */}
					<div className="flex items-center justify-between">
						<div className="space-y-0.5">
							<Label className="cursor-pointer">Modo Alto Contraste</Label>
							<p className="text-xs text-muted-foreground">
								Melhora a legibilidade com cores mais saturadas
							</p>
						</div>
						<Switch
							checked={theme.highContrast}
							onCheckedChange={(v) => setTheme({ highContrast: v })}
						/>
					</div>

					{/* Reduced Motion */}
					<div className="flex items-center justify-between">
						<div className="space-y-0.5">
							<Label className="flex items-center gap-2 cursor-pointer">
								<ZapOff className="h-4 w-4" /> Movimento Reduzido
							</Label>
							<p className="text-xs text-muted-foreground">
								Minimiza animações e transições do sistema
							</p>
						</div>
						<Switch
							checked={theme.reduceMotion}
							onCheckedChange={(v) => setTheme({ reduceMotion: v })}
						/>
					</div>

					<Separator />

					{/* Font Size */}
					<div className="space-y-3">
						<Label className="flex items-center gap-2 text-sm font-medium">
							<Type className="h-4 w-4" /> Tamanho da Fonte
						</Label>
						<div className="grid grid-cols-4 gap-2">
							{(["sm", "md", "lg", "xl"] as FontSize[]).map((size) => (
								<Button
									key={size}
									variant={theme.fontSize === size ? "default" : "outline"}
									size="sm"
									className="px-2"
									onClick={() => setTheme({ fontSize: size })}
								>
									{size === "sm"
										? "Pequeno"
										: size === "md"
											? "Médio"
											: size === "lg"
												? "Grande"
												: "Extra"}
								</Button>
							))}
						</div>
					</div>

					<Separator />

					{/* Color Scheme */}
					<div className="space-y-3">
						<Label className="text-sm font-medium">Esquema de Cores</Label>
						<div className="flex flex-wrap gap-3">
							{[
								{ id: "default", color: "#2563eb", name: "Padrão" },
								{ id: "green", color: "#059669", name: "Verde" },
								{ id: "purple", color: "#7c3aed", name: "Roxo" },
								{ id: "orange", color: "#ea580c", name: "Laranja" },
								{ id: "rose", color: "#e11d48", name: "Rosa" },
							].map((scheme) => (
								<button
									key={scheme.id}
									onClick={() => setTheme({ colorScheme: scheme.id as any })}
									className={`group relative flex items-center justify-center h-10 w-10 rounded-full border-2 transition-all hover:scale-110 ${
										theme.colorScheme === scheme.id
											? "border-foreground ring-2 ring-ring ring-offset-2"
											: "border-transparent"
									}`}
									title={scheme.name}
								>
									<span
										className="h-7 w-7 rounded-full shadow-inner"
										style={{ backgroundColor: scheme.color }}
									/>
									<span className="absolute -bottom-6 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
										{scheme.name}
									</span>
								</button>
							))}
						</div>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="text-base">Acessibilidade Assistiva</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4 text-sm">
					<div className="flex items-start gap-3">
						<div className="mt-1 p-1 bg-muted rounded">
							<Info className="h-4 w-4 text-muted-foreground" />
						</div>
						<div>
							<p className="font-medium">Navegação por Teclado</p>
							<p className="text-xs text-muted-foreground mt-1">
								Use <kbd className="px-1 bg-muted border rounded">Tab</kbd> para
								navegar, <kbd className="px-1 bg-muted border rounded">Enter</kbd>{" "}
								para selecionar e <kbd className="px-1 bg-muted border rounded">Esc</kbd>{" "}
								para cancelar.
							</p>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
