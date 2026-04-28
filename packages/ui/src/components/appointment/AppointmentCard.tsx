import React from "react";
import { MotionCard } from "../MotionCard";
import { cn } from "../../lib/utils";
import { CheckCircle2 } from "lucide-react";

export interface AppointmentCardProps extends React.HTMLAttributes<HTMLDivElement> {
  patientName: string;
  time: string;
  endTime?: string;
  type?: string;
  status?: string;
  isDragging?: boolean;
  isSaving?: boolean;
  isDropTarget?: boolean;
  isSelected?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  statusConfig?: {
    color?: string;
    icon?: React.ElementType;
  };
  compact?: boolean;
}

export const AppointmentCard = React.forwardRef<HTMLDivElement, AppointmentCardProps>(
  (
    {
      patientName,
      time,
      endTime,
      type,
      status: _status = "agendado",
      isDragging,
      isSaving,
      isDropTarget,
      isSelected,
      onClick,
      statusConfig,
      compact = false,
      style,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const StatusIcon = statusConfig?.icon || CheckCircle2;
    const numericHeight =
      typeof style?.height === "number"
        ? style.height
        : typeof style?.height === "string" && style.height.endsWith("px")
          ? Number.parseFloat(style.height)
          : undefined;
    const isVeryCompact = compact && typeof numericHeight === "number" && numericHeight <= 44;

    const hasCustomBg = style?.backgroundColor || style?.background;
    const isCalendarCard = className?.includes("calendar-card-");

    // The parent (CalendarAppointmentCard) used to draw its own borderLeft via
    // inline style, which doubled with the accent strip below. We now own the
    // accent strip exclusively here and the parent passes only the background.
    const { borderLeft: _ignoreBorderLeft, ...cleanStyle } = (style as any) || {};

    return (
      <MotionCard
        ref={ref}
        variant={isCalendarCard || hasCustomBg ? "none" : "glass"}
        onClick={onClick}
        style={{
          ...cleanStyle,
          background: isCalendarCard ? undefined : cleanStyle?.background,
        }}
        className={cn(
          "relative overflow-hidden cursor-pointer flex flex-col",
          "transition-[transform,box-shadow,background-color] duration-200",
          isDragging && "opacity-50 scale-95 z-50 ring-2 ring-primary/40 shadow-2xl",
          isSaving && "animate-pulse-twice ring-2 ring-amber-400/50 z-30",
          isDropTarget && "ring-2 ring-primary/60 shadow-2xl scale-105 z-25",
          isSelected && "ring-2 ring-primary shadow-xl z-40",
          compact && "calendar-card-weekly",
          compact ? "justify-start px-2 py-1.5 pl-2.5" : "justify-center p-3 pl-4",
          className,
        )}
        {...(props as any)}
      >
        {/* Status accent strip — single source of truth for the side bar */}
        <div
          className={cn("absolute left-0 top-0 bottom-0 rounded-l-[inherit]", compact ? "w-1" : "w-1.5")}
          style={
            statusConfig?.color
              ? { backgroundColor: statusConfig.color }
              : { backgroundColor: "#94a3b8" }
          }
        />

        {/* Content */}
        <div className={cn("flex flex-col w-full min-w-0", compact ? "gap-0.5" : "gap-0.5")}>
          {/* Patient name takes the lead — biggest, boldest token in the card */}
          <span
            className={cn(
              "font-semibold min-w-0 tracking-tight",
              compact
                ? isVeryCompact
                  ? "text-[11px] leading-tight truncate"
                  : "text-[12px] leading-snug line-clamp-2"
                : "text-base leading-tight truncate",
            )}
          >
            {patientName}
          </span>

          <div
            className={cn(
              "flex items-center justify-between gap-1.5 w-full",
              compact ? "mt-0" : "mt-0.5",
            )}
          >
            <span
              className={cn(
                "font-mono tabular-nums tracking-tight opacity-75 leading-none",
                compact ? "text-[10px]" : "text-xs",
              )}
            >
              {time}
              {endTime && !compact && <span className="opacity-60"> – {endTime}</span>}
            </span>

            {!compact && (
              <div className="opacity-60 shrink-0">
                <StatusIcon className="w-3.5 h-3.5" />
              </div>
            )}
          </div>

          {!compact && type && (
            <span className="text-[11px] opacity-70 truncate mt-1 font-medium">{type}</span>
          )}
        </div>

        {children}
      </MotionCard>
    );
  },
);

AppointmentCard.displayName = "AppointmentCard";
