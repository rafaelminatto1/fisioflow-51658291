import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SettingsSectionCardProps {
	icon: ReactNode;
	iconBg: string;
	title: string;
	description: string;
	children: ReactNode;
	action?: ReactNode;
	className?: string;
}

export function SettingsSectionCard({
	icon,
	iconBg,
	title,
	description,
	children,
	action,
	className,
}: SettingsSectionCardProps) {
	return (
		<div
			className={cn("rounded-xl border bg-muted/10 p-4 space-y-4", className)}
		>
			<div className="flex items-center justify-between gap-2 pb-3 border-b">
				<div className="flex items-center gap-2 min-w-0">
					<div className={cn("p-1.5 rounded-md shrink-0", iconBg)}>{icon}</div>
					<div className="min-w-0">
						<p className="text-sm font-semibold">{title}</p>
						<p className="text-xs text-muted-foreground">{description}</p>
					</div>
				</div>
				{action}
			</div>
			{children}
		</div>
	);
}
