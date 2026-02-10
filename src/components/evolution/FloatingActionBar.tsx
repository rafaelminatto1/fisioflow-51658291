import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import {
    Save,
    CheckCircle2,
    Keyboard,
    Cloud,
    Loader2,
    Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';

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
            const isMobile = typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT_PX;
            if (isMobile) {
                setShowFab(true);
            } else {
                const scrollY = typeof window !== 'undefined' ? window.scrollY : 0;
                setShowFab(scrollY > SCROLL_THRESHOLD_PX);
            }
        };
        updateVisibility();
        window.addEventListener('scroll', updateVisibility, { passive: true });
        window.addEventListener('resize', updateVisibility);
        return () => {
            window.removeEventListener('scroll', updateVisibility);
            window.removeEventListener('resize', updateVisibility);
        };
    }, []);

    if (!showFab) return null;

    return (
        <TooltipProvider>
            <div
                className={cn(
                    'fixed bottom-0 left-0 right-0 z-50',
                    'bg-background/80 backdrop-blur-lg border-t border-border/50',
                    'px-4 py-3 shadow-lg',
                    'safe-area-inset-bottom',
                    'animate-in slide-in-from-bottom-2 duration-200',
                    className
                )}
            >
                <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
                    {/* Left Section - Auto-save indicator */}
                    {autoSaveEnabled ? (
                        <div className="hidden sm:flex items-center gap-1.5">
                            <Cloud className={cn(
                                'h-3.5 w-3.5',
                                lastSavedAt ? 'text-green-500' : 'text-muted-foreground'
                            )} />
                            {lastSavedAt && (
                                <span className="text-[10px] text-muted-foreground">
                                    {lastSavedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            )}
                        </div>
                    ) : (
                        <div className="w-0" />
                    )}

                    {/* Center Section - Keyboard hint */}
                    {onShowKeyboardHelp && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={onShowKeyboardHelp}
                                    className="hidden md:flex h-8 px-2 text-muted-foreground hover:text-foreground"
                                >
                                    <Keyboard className="h-4 w-4 mr-1.5" />
                                    <kbd className="text-[10px] bg-muted/50 px-1.5 py-0.5 rounded">?</kbd>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Atalhos de teclado</p>
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
                                        variant="outline"
                                        size="sm"
                                        onClick={onExportPDF}
                                        disabled={disabled || isExporting}
                                        className="h-9 px-3 shadow-sm hover:shadow transition-shadow"
                                    >
                                        {isExporting ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Download className="h-4 w-4" />
                                        )}
                                        <span className="hidden lg:inline ml-1.5 text-sm">
                                            {isExporting ? 'Gerando...' : 'PDF'}
                                        </span>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Exportar evolução em PDF</p>
                                </TooltipContent>
                            </Tooltip>
                        )}

                        {/* Save Button */}
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={onSave}
                                    disabled={disabled || isSaving}
                                    className="h-9 px-3 sm:px-4 shadow-sm hover:shadow transition-shadow"
                                >
                                    {isSaving ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Save className="h-4 w-4" />
                                    )}
                                    <span className="hidden sm:inline ml-1.5 text-sm">
                                        {isSaving ? 'Salvando...' : 'Salvar'}
                                    </span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Salvar evolução <kbd className="ml-2 text-[10px] bg-muted/50 px-1 rounded">Ctrl+S</kbd></p>
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
                                        'h-9 px-3 sm:px-4 shadow-md hover:shadow-lg transition-all',
                                        'bg-gradient-to-r from-green-600 to-emerald-600',
                                        'hover:from-green-700 hover:to-emerald-700',
                                        'text-white font-medium'
                                    )}
                                >
                                    {isCompleting ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <CheckCircle2 className="h-4 w-4" />
                                    )}
                                    <span className="ml-1.5 text-sm">
                                        {isCompleting ? 'Concluindo...' : 'Concluir'}
                                    </span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Concluir atendimento <kbd className="ml-2 text-[10px] bg-muted/50 px-1 rounded">Ctrl+Enter</kbd></p>
                            </TooltipContent>
                        </Tooltip>
                    </div>
                </div>
            </div>
        </TooltipProvider>
    );
};

export default FloatingActionBar;
