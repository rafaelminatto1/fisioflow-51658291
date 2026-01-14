import React, { memo } from 'react';
import { isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';

interface TimeSlotCellProps {
    day: Date;
    time: string;
    rowIndex: number;
    colIndex: number;
    isClosed: boolean;
    isBlocked: boolean;
    isDropTarget: boolean;
    onTimeSlotClick: (date: Date, time: string) => void;
    handleDragOver: (e: React.DragEvent, date: Date, time: string) => void;
    handleDragLeave: (e: React.DragEvent) => void;
    handleDrop: (e: React.DragEvent, date: Date, time: string) => void;
}

export const TimeSlotCell = memo(({
    day,
    time,
    rowIndex,
    colIndex,
    isClosed,
    isBlocked,
    isDropTarget,
    onTimeSlotClick,
    handleDragOver,
    handleDragLeave,
    handleDrop
}: TimeSlotCellProps) => {
    const isHourStart = time.endsWith(':00');

    // Only render interaction handlers if enabled to save listeners? 
    // Actually React handles delegation, but standard practice.

    return (
        <div
            className={cn(
                "border-r border-slate-100 dark:border-slate-800 relative transition-all duration-200",
                isHourStart && "border-t border-slate-100 dark:border-slate-800", // Solid line for hours
                !isHourStart && "border-t border-dashed border-slate-50 dark:border-slate-900", // Dashed for half-hours
                colIndex === 6 && "border-r-0",
                isClosed && "bg-slate-50/50 dark:bg-slate-900/20 pattern-diagonal-lines",
                !isClosed && !isBlocked && "hover:bg-blue-50/30 dark:hover:bg-blue-900/10 cursor-pointer group/cell",
                isBlocked && "bg-slate-100/50 dark:bg-slate-800/50 cursor-not-allowed",
                isDropTarget && "bg-blue-50 dark:bg-blue-900/20 shadow-inner"
            )}
            style={{ gridRow: rowIndex + 1, gridColumn: colIndex + 2 }}
            onClick={() => !isBlocked && !isClosed && onTimeSlotClick(day, time)}
            onDragOver={(e) => !isBlocked && !isClosed && handleDragOver(e, day, time)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => !isBlocked && !isClosed && handleDrop(e, day, time)}
        >
            {/* Add button on hover - subtle */}
            {!isBlocked && !isClosed && (
                <div className="absolute inset-x-0 mx-auto w-fit -top-2.5 z-20 opacity-0 group-hover/cell:opacity-100 transition-opacity pointer-events-none">
                    <div className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white shadow-md transform scale-75 group-hover/cell:scale-100 transition-transform">
                        <span className="text-sm leading-none mb-px">+</span>
                    </div>
                </div>
            )}
        </div>
    );
}, (prev, next) => {
    // Custom comparison for performance if needed, but default shallow compare should work
    // provided props are stable.
    return (
        prev.time === next.time &&
        prev.rowIndex === next.rowIndex &&
        prev.colIndex === next.colIndex &&
        prev.isClosed === next.isClosed &&
        prev.isBlocked === next.isBlocked &&
        prev.isDropTarget === next.isDropTarget &&
        prev.day.getTime() === next.day.getTime()
        // handlers should be stable refs ideally
    );
});

TimeSlotCell.displayName = 'TimeSlotCell';
