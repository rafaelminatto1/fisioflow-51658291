import React, { useState } from 'react';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { QuickSettingsSheet } from './QuickSettingsSheet';

interface ScheduleConfigButtonProps {
    variant?: 'default' | 'ghost' | 'outline' | 'secondary' | 'destructive' | 'link';
    size?: 'default' | 'sm' | 'lg' | 'icon';
    showLabel?: boolean;
    className?: string;
}

export const ScheduleConfigButton = memo(({
    variant = 'outline',
    size = 'sm',
    showLabel = true,
    className
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
                {showLabel && <span>Configurações</span>}
            </Button>

            <QuickSettingsSheet open={open} onOpenChange={setOpen} />
        </>
    );
});

ScheduleConfigButton.displayName = 'ScheduleConfigButton';

// Export a simpler icon-only version
export const ScheduleConfigIconButton = memo(({
    className
}: { className?: string }) => {
    const [open, setOpen] = useState(false);

    return (
        <>
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setOpen(true)}
                className={cn("h-8 w-8", className)}
            >
                <Settings className="w-4 h-4" />
            </Button>

            <QuickSettingsSheet open={open} onOpenChange={setOpen} />
        </>
    );
});

ScheduleConfigIconButton.displayName = 'ScheduleConfigIconButton';
