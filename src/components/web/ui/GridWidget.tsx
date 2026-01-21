import React, { forwardRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { cn } from '@/lib/utils';
import { GripHorizontal, Maximize2, X, GripVertical, MoveDiagonal2 } from 'lucide-react';
import { Button } from '@/components/shared/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/shared/ui/tooltip';

interface GridWidgetProps extends React.HTMLAttributes<HTMLDivElement> {
    title?: React.ReactNode;
    icon?: React.ReactNode;
    onRemove?: () => void;
    isDraggable?: boolean;
    children: React.ReactNode;
    headerActions?: React.ReactNode;
    extraHeaderContent?: React.ReactNode;
    headerClassName?: string;
    contentClassName?: string;
    className?: string;
    // Props injected by react-grid-layout
    style?: React.CSSProperties;
    className_rgl?: string;
    onMouseDown?: React.MouseEventHandler;
    onMouseUp?: React.MouseEventHandler;
    onTouchEnd?: React.TouchEventHandler;
}

/**
 * GridWidget - A draggable grid widget with enhanced UX affordances
 *
 * Features:
 * - Clear visual drag handle with tooltip
 * - Hover and grab states for better feedback
 * - Smooth transitions and animations
 * - Accessible keyboard navigation support
 * - Touch-friendly drag handle (44px minimum)
 */
export const GridWidget = forwardRef<HTMLDivElement, GridWidgetProps>(
    (
        {
            title,
            icon,
            children,
            onRemove,
            isDraggable = false,
            headerActions,
            extraHeaderContent,
            headerClassName,
            contentClassName,
            className,
            style,
            className_rgl,
            onMouseDown,
            onMouseUp,
            onTouchEnd,
            ...props
        },
        ref
    ) => {
        const [isGrabbed, setIsGrabbed] = useState(false);

        const handleMouseDown = (e: React.MouseEvent) => {
            if (isDraggable && (e.currentTarget as HTMLElement).closest('.drag-handle')) {
                setIsGrabbed(true);
            }
            if (onMouseDown) onMouseDown(e);
        };

        const handleMouseUp = (e: React.MouseEvent) => {
            setIsGrabbed(false);
            if (onMouseUp) onMouseUp(e);
        };

        const handleMouseLeave = () => {
            if (isGrabbed) setIsGrabbed(false);
        };

        return (
            <div
                ref={ref}
                style={style}
                className={cn('h-full', className, className_rgl)}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
                onTouchEnd={onTouchEnd}
                {...props}
            >
                <Card className={cn(
                    "h-full flex flex-col shadow-sm transition-all duration-200 overflow-hidden select-none group",
                    "border-2 border-border/60",
                    isDraggable && "hover:border-primary/30",
                    isDraggable && isGrabbed && "shadow-xl ring-4 ring-primary/10 scale-[1.01] border-primary/50 z-[100]" // Higher z-index when grabbed
                )}>
                    {(title || icon || isDraggable || extraHeaderContent || headerActions) && (
                        <CardHeader className={cn(
                            "p-3 pb-2 flex-row items-center justify-between space-y-0 shrink-0 border-b border-border/40",
                            headerClassName,
                            isDraggable && isGrabbed && "bg-muted/50" // Header highlight on grab
                        )}>
                            <div className="flex items-center gap-2 min-w-0">
                                {isDraggable && (
                                    <TooltipProvider>
                                        <Tooltip delayDuration={300}>
                                            <TooltipTrigger asChild>
                                                <div
                                                    className="drag-handle cursor-grab active:cursor-grabbing p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground mr-1 transition-all duration-150 hover:scale-110"
                                                    aria-label="Arrastar widget"
                                                    role="button"
                                                    tabIndex={0}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' || e.key === ' ') {
                                                            e.preventDefault();
                                                            // Allow keyboard-based dragging activation
                                                            const widget = (e.currentTarget as HTMLElement).closest('.react-grid-item');
                                                            if (widget) {
                                                                widget.classList.add('react-grid-placeholder');
                                                            }
                                                        }
                                                    }}
                                                >
                                                    <GripVertical className="h-4 w-4" aria-hidden="true" />
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent side="bottom" className="text-xs">
                                                <p>Arraste para mover este widget</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                )}
                                {icon && <div className="text-muted-foreground shrink-0">{icon}</div>}
                                {title && (
                                    <CardTitle className="text-sm font-medium truncate">
                                        {title}
                                    </CardTitle>
                                )}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                                {extraHeaderContent}
                                {headerActions}
                                {onRemove && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 hover:bg-destructive/10 hover:text-destructive"
                                        onClick={onRemove}
                                        aria-label="Remover widget"
                                    >
                                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                    )}
                    <CardContent className={cn("p-0 flex-1 overflow-hidden flex flex-col", contentClassName)}>
                        {children}
                    </CardContent>
                    {isDraggable && (
                        <div className="react-resizable-handle react-resizable-handle-se absolute bottom-1 right-1 opacity-10 group-hover:opacity-100 transition-opacity cursor-se-resize p-1 z-[110]">
                            <MoveDiagonal2 className="h-3 w-3 text-primary rotate-90" />
                        </div>
                    )}
                </Card>
            </div>
        );
    }
);

GridWidget.displayName = 'GridWidget';
