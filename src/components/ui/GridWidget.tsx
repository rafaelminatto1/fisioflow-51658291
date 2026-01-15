import React, { forwardRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { GripHorizontal, Maximize2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface GridWidgetProps extends React.HTMLAttributes<HTMLDivElement> {
    title?: React.ReactNode;
    icon?: React.ReactNode;
    onRemove?: () => void;
    isDraggable?: boolean;
    children: React.ReactNode;
    headerActions?: React.ReactNode;
    extraHeaderContent?: React.ReactNode;
    headerClassName?: string;
    className?: string;
    // Props injected by react-grid-layout
    style?: React.CSSProperties;
    className_rgl?: string;
    onMouseDown?: React.MouseEventHandler;
    onMouseUp?: React.MouseEventHandler;
    onTouchEnd?: React.TouchEventHandler;
}

export const GridWidget = forwardRef<HTMLDivElement, GridWidgetProps>(
    (
        {
            title,
            icon,
            children,
            onRemove,
            isDraggable = true,
            headerActions,
            extraHeaderContent,
            headerClassName,
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
        return (
            <div
                ref={ref}
                style={style}
                className={cn('h-full', className, className_rgl)}
                onMouseDown={onMouseDown}
                onMouseUp={onMouseUp}
                onTouchEnd={onTouchEnd}
                {...props}
            >
                <Card className="h-full flex flex-col shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden select-none">
                    {(title || icon || isDraggable || extraHeaderContent || headerActions) && (
                        <CardHeader className={cn(
                            "p-3 pb-2 flex-row items-center justify-between space-y-0 shrink-0 border-b border-border/40",
                            headerClassName
                        )}>
                            <div className="flex items-center gap-2 min-w-0">
                                {isDraggable && (
                                    <div className="drag-handle cursor-move p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground mr-1 transition-colors">
                                        <GripHorizontal className="h-4 w-4" />
                                    </div>
                                )}
                                {icon && <div className="text-muted-foreground">{icon}</div>}
                                {title && (
                                    <CardTitle className="text-sm font-medium truncate">
                                        {title}
                                    </CardTitle>
                                )}
                            </div>
                            <div className="flex items-center gap-1">
                                {extraHeaderContent}
                                {headerActions}
                                {onRemove && (
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onRemove}>
                                        <X className="h-3.5 w-3.5 text-muted-foreground" />
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                    )}
                    <CardContent className="p-0 flex-1 overflow-auto flex flex-col">
                        {/* Add a small padding container or let children handle it */}
                        <div className="h-full w-full">{children}</div>
                    </CardContent>
                </Card>
            </div>
        );
    }
);

GridWidget.displayName = 'GridWidget';
