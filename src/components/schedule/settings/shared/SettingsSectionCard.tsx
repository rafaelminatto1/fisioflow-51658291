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
	variant?: "default" | "highlight" | "warning";
}

export function SettingsSectionCard({
	icon,
	iconBg,
	title,
	description,
	children,
	action,
	className,
	variant = "default",
}: SettingsSectionCardProps) {
	return (
		<div
			className={cn(
				"rounded-2xl border bg-card shadow-sm overflow-hidden transition-shadow hover:shadow-md",
				variant === "highlight" &&
					"border-primary/30 bg-primary/[0.02] dark:bg-primary/[0.04]",
				variant === "warning" &&
					"border-amber-200 bg-amber-50/30 dark:border-amber-800/50 dark:bg-amber-950/10",
				className,
			)}
		>
			{/* Card Header */}
			<div
				className={cn(
					"flex items-center justify-between gap-3 px-5 py-4 border-b",
					variant === "highlight" && "border-primary/20",
					variant === "warning" && "border-amber-200/60 dark:border-amber-800/40",
				)}
			>
				<div className="flex items-center gap-3 min-w-0">
					<div
						className={cn(
							"flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-sm",
							iconBg,
						)}
					>
						{icon}
					</div>
					<div className="min-w-0">
						<p className="text-sm font-semibold leading-tight">{title}</p>
						<p className="text-xs text-muted-foreground mt-0.5 leading-tight">
							{description}
						</p>
					</div>
				</div>
				{action}
			</div>

			{/* Card Body */}
			<div className="p-5">{children}</div>
		</div>
	);
}
