import { Clock, Users } from "lucide-react";

export interface ScheduleEventColors {
	background: string;
	accent: string;
	text: string;
}

export interface ScheduleEventContentProps {
	title: string;
	timeText: string;
	isAllDay: boolean;
	isGroup: boolean;
	groupCount?: number;
	isTask: boolean;
	colors: ScheduleEventColors;
	isSelected: boolean;
}

/**
 * React-native render for a single calendar event. Replaces the HTML-string
 * approach used by DayFlowCalendar (which was hard to maintain and test).
 *
 * Kept deliberately small and style-token-driven so FullCalendar's virtualized
 * render stays fast even with hundreds of events in month view.
 */
export function ScheduleEventContent({
	title,
	timeText,
	isAllDay,
	isGroup,
	groupCount,
	isTask,
	colors,
	isSelected,
}: ScheduleEventContentProps) {
	const safeColors = colors || { background: "transparent", accent: "currentColor", text: "inherit" };

	return (
		<div
			className="flex h-full w-full flex-col overflow-hidden rounded-md"
			style={{
				background: safeColors.background,
				borderLeft: `3px solid ${safeColors.accent}`,
				color: safeColors.text,
				opacity: isSelected ? 0.85 : 1,
				padding: "2px 4px",
				fontSize: "var(--agenda-card-font-scale, 0.75rem)",
			}}
		>
			{!isAllDay && timeText && (
				<div
					className="flex items-center gap-1 text-[0.85em] leading-tight"
					style={{ color: safeColors.text }}
				>
					<Clock className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
					<span className="truncate font-medium">{timeText}</span>
					{isGroup && (
						<span className="ml-auto flex items-center gap-0.5 text-[0.85em] opacity-80">
							<Users className="h-3 w-3 shrink-0" aria-hidden />
							{groupCount ?? ""}
						</span>
					)}
				</div>
			)}
			<div
				className="line-clamp-2 break-words text-[0.95em] font-semibold leading-tight"
				style={{ color: safeColors.text }}
			>
				{isTask ? `🗒 ${title}` : title}
			</div>
		</div>
	);
}
