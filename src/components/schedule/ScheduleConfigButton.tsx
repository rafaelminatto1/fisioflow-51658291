import React, { useState, memo } from "react";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { QuickSettingsSheet } from "./QuickSettingsSheet";
import { Link } from "react-router-dom";

interface ScheduleConfigButtonProps {
	variant?:
		| "default"
		| "ghost"
		| "outline"
		| "secondary"
		| "destructive"
		| "link";
	size?: "default" | "sm" | "lg" | "icon";
	showLabel?: boolean;
	className?: string;
}

export const ScheduleConfigButton = memo(
	({
		variant = "outline",
		size = "sm",
		showLabel = true,
		className,
	}: ScheduleConfigButtonProps) => {
		const [open, setOpen] = useState(false);

		return (
			<>
				<Button
					variant={variant}
					size={size}
					onClick={() => setOpen(true)}
					className={cn("gap-2", className)}
				>
					<Settings className="w-4 h-4" />
					{showLabel && <span>Configurações Rápidas</span>}
				</Button>

				<QuickSettingsSheet open={open} onOpenChange={setOpen} />
			</>
		);
	},
);

ScheduleConfigButton.displayName = "ScheduleConfigButton";

// Export a simpler icon-only version that links to the full settings page
export const ScheduleConfigIconButton = memo(
	({ className }: { className?: string }) => {
		return (
			<Button
				variant="ghost"
				size="icon"
				asChild
				className={cn("h-8 w-8", className)}
			>
				<Link to="/agenda/settings">
					<Settings className="w-4 h-4" />
				</Link>
			</Button>
		);
	},
);

ScheduleConfigIconButton.displayName = "ScheduleConfigIconButton";

