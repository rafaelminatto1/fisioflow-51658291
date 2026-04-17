import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";

import {
	Save,
	CheckCircle2,
	Keyboard,
	Cloud,
	Loader2,
	Download,
} from "lucide-react";
import { cn } from "@/lib/utils";

const SCROLL_THRESHOLD_PX = 200;
const MOBILE_BREAKPOINT_PX = 768;

interface FloatingActionBarProps {
	onSave: () => void;
	onComplete: () => void;
	onShowKeyboardHelp?: () => void;
	onExportPDF?: () => void;
	isSaving?: boolean;
	isCompleting?: boolean;
	isExporting?: boolean;
	autoSaveEnabled?: boolean;
	lastSavedAt?: Date | null;
	disabled?: boolean;
	className?: string;
}

export const FloatingActionBar: React.FC<FloatingActionBarProps> = ({
	onSave,
	onComplete,
	onShowKeyboardHelp,
	onExportPDF,
	isSaving = false,
	isCompleting = false,
	isExporting = false,
	autoSaveEnabled = true,
	lastSavedAt,
	disabled = false,
	className,
}) => {
	const [showFab, setShowFab] = useState(true);

	// Desktop: ocultar FAB quando header visível (scroll no topo). Mobile: sempre visível.
	useEffect(() => {
		const updateVisibility = () => {
			const isMobile =
				typeof window !== "undefined" &&
				window.innerWidth < MOBILE_BREAKPOINT_PX;
			if (isMobile) {
				setShowFab(true);
			} else {
				const scrollY = typeof window !== "undefined" ? window.scrollY : 0;
				setShowFab(scrollY > SCROLL_THRESHOLD_PX);
			}
		};
		updateVisibility();
		window.addEventListener("scroll", updateVisibility, { passive: true });
		window.addEventListener("resize", updateVisibility);
		return () => {
			window.removeEventListener("scroll", updateVisibility);
			window.removeEventListener("resize", updateVisibility);
		};
	}, []);

	if (!showFab) return null;

	return (
		<TooltipProvider>
			<div
				className={cn(
					"fixed bottom-6 left-1/2 -translate-x-1/2 z-50",
					"bg-white/90 backdrop-blur-md border border-primary/10",
					"px-4 py-2 rounded-2xl shadow-xl shadow-primary/5",
					"animate-in fade-in slide-in-from-bottom-4 duration-500",
					className,
				)}
			>
				<div className="flex items-center gap-3">
					{/* Left Section - Auto-save indicator */}
					{autoSaveEnabled && (
						<div className="hidden sm:flex items-center gap-2 px-3 border-r border-slate-100">
							<Cloud
								className={cn(
									"h-3.5 w-3.5",
									lastSavedAt ? "text-primary" : "text-slate-300",
								)}
							/>
							{lastSavedAt && (
								<span className="text-[10px] text-slate-500 font-bold">
									{lastSavedAt.toLocaleTimeString("pt-BR", {
										hour: "2-digit",
										minute: "2-digit",
									})}
								</span>
							)}
						</div>
					)}

					{/* Center Section - Keyboard hint */}
					{onShowKeyboardHelp && (
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant="ghost"
									size="icon"
									onClick={onShowKeyboardHelp}
									className="hidden md:flex h-8 w-8 text-slate-400 hover:text-primary transition-colors"
								>
									<Keyboard className="h-4 w-4" />
								</Button>
							</TooltipTrigger>
							<TooltipContent className="bg-slate-800 text-white border-none text-[10px] font-bold">
								<p>ATALHOS DE TECLADO</p>
							</TooltipContent>
						</Tooltip>
					)}

					{/* Right Section - Actions */}
					<div className="flex items-center gap-2">
						{/* Export PDF Button */}
						{onExportPDF && (
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										variant="ghost"
										size="sm"
										onClick={onExportPDF}
										disabled={disabled || isExporting}
										className="h-9 px-3 text-slate-500 hover:text-primary hover:bg-primary/5 transition-all"
									>
										{isExporting ? (
											<Loader2 className="h-4 w-4 animate-spin" />
										) : (
											<Download className="h-4 w-4" />
										)}
										<span className="hidden lg:inline ml-2 text-xs font-bold uppercase tracking-wider">
											{isExporting ? "Gerando" : "PDF"}
										</span>
									</Button>
								</TooltipTrigger>
								<TooltipContent className="bg-slate-800 text-white border-none text-[10px] font-bold">
									<p>EXPORTAR PDF</p>
								</TooltipContent>
							</Tooltip>
						)}

						{/* Save Button */}
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant="ghost"
									size="sm"
									onClick={onSave}
									disabled={disabled || isSaving}
									className="h-9 px-3 text-slate-500 hover:text-primary hover:bg-primary/5 transition-all"
								>
									{isSaving ? (
										<Loader2 className="h-4 w-4 animate-spin" />
									) : (
										<Save className="h-4 w-4" />
									)}
									<span className="hidden sm:inline ml-2 text-xs font-bold uppercase tracking-wider">
										{isSaving ? "Salvando" : "Salvar"}
									</span>
								</Button>
							</TooltipTrigger>
							<TooltipContent className="bg-slate-800 text-white border-none text-[10px] font-bold">
								<p>SALVAR (CTRL+S)</p>
							</TooltipContent>
						</Tooltip>

						{/* Complete Session Button */}
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									size="sm"
									onClick={onComplete}
									disabled={disabled || isSaving || isCompleting}
									className={cn(
										"h-9 px-5 shadow-lg shadow-primary/10 transition-all uppercase tracking-widest text-[10px] font-black",
										"bg-primary hover:bg-primary/90 text-white",
									)}
								>
									{isCompleting ? (
										<Loader2 className="h-4 w-4 animate-spin" />
									) : (
										<CheckCircle2 className="h-4 w-4" />
									)}
									<span className="ml-2">
										{isCompleting ? "Concluindo" : "Concluir"}
									</span>
								</Button>
							</TooltipTrigger>
							<TooltipContent className="bg-slate-800 text-white border-none text-[10px] font-bold">
								<p>CONCLUIR (CTRL+ENTER)</p>
							</TooltipContent>
						</Tooltip>
					</div>
				</div>
			</div>
		</TooltipProvider>
	);
};

export default FloatingActionBar;
