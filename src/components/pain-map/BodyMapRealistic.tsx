import { useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { PainPoint } from './BodyMap';
import { PainDetailsForm } from './PainDetailsForm';
import { PainIntensity, PainType, PainEvolutionData } from '@/types/painMap';
import { PainMapService } from '@/lib/services/painMapService';
import { ZoomIn, ZoomOut, Maximize2, Move, RotateCcw, ImageOff } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';

interface BodyMapRealisticProps {
    view: 'front' | 'back';
    points: PainPoint[];
    onPointAdd?: (point: Omit<PainPoint, 'id'>) => void;
    onPointRemove?: (pointId: string) => void;
    onPointUpdate?: (point: PainPoint) => void;
    readOnly?: boolean;
    selectedIntensity?: number;
    selectedPainType?: PainPoint['painType'];
    className?: string;
    onViewChange?: (view: 'front' | 'back') => void;
    evolutionData?: PainEvolutionData[];
}

// Reusing regions from BodyMap.tsx
const BODY_REGIONS = {
    front: [
        { code: 'cabeca', name: 'Cabeça', x: 50, y: 6, width: 12, height: 8 },
        { code: 'pescoco', name: 'Pescoço', x: 50, y: 14, width: 8, height: 4 },
        { code: 'ombro_esquerdo', name: 'Ombro Esquerdo', x: 32, y: 18, width: 10, height: 6 },
        { code: 'ombro_direito', name: 'Ombro Direito', x: 68, y: 18, width: 10, height: 6 },
        { code: 'torax', name: 'Peito Esquerdo', x: 40, y: 22, width: 10, height: 10 },
        { code: 'torax', name: 'Peito Direito', x: 60, y: 22, width: 10, height: 10 },
        { code: 'braco_esquerdo', name: 'Braço Esquerdo', x: 25, y: 24, width: 7, height: 12 },
        { code: 'braco_direito', name: 'Braço Direito', x: 75, y: 24, width: 7, height: 12 },
        { code: 'abdomen', name: 'Abdômen Superior', x: 50, y: 34, width: 16, height: 8 },
        { code: 'antebraco_esquerdo', name: 'Antebraço Esquerdo', x: 20, y: 38, width: 6, height: 12 },
        { code: 'antebraco_direito', name: 'Antebraço Direito', x: 80, y: 38, width: 6, height: 12 },
        { code: 'abdomen', name: 'Abdômen Inferior', x: 50, y: 44, width: 16, height: 8 },
        { code: 'mao_esquerda', name: 'Mão Esquerda', x: 15, y: 52, width: 6, height: 8 },
        { code: 'mao_direita', name: 'Mão Direita', x: 85, y: 52, width: 6, height: 8 },
        { code: 'quadril_esquerdo', name: 'Quadril Esquerdo', x: 40, y: 52, width: 10, height: 8 },
        { code: 'quadril_direito', name: 'Quadril Direito', x: 60, y: 52, width: 10, height: 8 },
        { code: 'coxa_esquerda', name: 'Coxa Esquerda', x: 40, y: 62, width: 10, height: 14 },
        { code: 'coxa_direito', name: 'Coxa Direita', x: 60, y: 62, width: 10, height: 14 },
        { code: 'joelho_esquerdo', name: 'Joelho Esquerdo', x: 40, y: 76, width: 8, height: 6 },
        { code: 'joelho_direito', name: 'Joelho Direito', x: 60, y: 76, width: 8, height: 6 },
        { code: 'perna_esquerda', name: 'Panturrilha Esquerda', x: 40, y: 82, width: 7, height: 10 },
        { code: 'perna_direito', name: 'Panturrilha Direita', x: 60, y: 82, width: 7, height: 10 },
        { code: 'tornozelo_esquerdo', name: 'Tornozelo Esquerdo', x: 40, y: 92, width: 6, height: 4 },
        { code: 'tornozelo_direito', name: 'Tornozelo Direito', x: 60, y: 92, width: 6, height: 4 },
        { code: 'pe_esquerdo', name: 'Pé Esquerdo', x: 40, y: 96, width: 8, height: 4 },
        { code: 'pe_direito', name: 'Pé Direito', x: 60, y: 96, width: 8, height: 4 },
    ],
    back: [
        { code: 'cabeca', name: 'Cabeça', x: 50, y: 6, width: 12, height: 8 },
        { code: 'pescoco', name: 'Pescoço', x: 50, y: 14, width: 8, height: 4 },
        { code: 'ombro_esquerdo', name: 'Ombro Esquerdo', x: 32, y: 18, width: 10, height: 6 },
        { code: 'ombro_direito', name: 'Ombro Direito', x: 68, y: 18, width: 10, height: 6 },
        { code: 'torax', name: 'Costas Superior Esquerda', x: 40, y: 22, width: 10, height: 10 },
        { code: 'torax', name: 'Costas Superior Direita', x: 60, y: 22, width: 10, height: 10 },
        { code: 'braco_esquerdo', name: 'Braço Esquerdo', x: 25, y: 24, width: 7, height: 12 },
        { code: 'braco_direito', name: 'Braço Direito', x: 75, y: 24, width: 7, height: 12 },
        { code: 'torax', name: 'Costas Média Esquerda', x: 40, y: 34, width: 10, height: 8 },
        { code: 'torax', name: 'Costas Média Direita', x: 60, y: 34, width: 10, height: 8 },
        { code: 'antebraco_esquerdo', name: 'Antebraço Esquerdo', x: 20, y: 38, width: 6, height: 12 },
        { code: 'antebraco_direito', name: 'Antebraço Direito', x: 80, y: 38, width: 6, height: 12 },
        { code: 'lombar', name: 'Lombar Esquerda', x: 40, y: 44, width: 10, height: 8 },
        { code: 'lombar', name: 'Lombar Direita', x: 60, y: 44, width: 10, height: 8 },
        { code: 'quadril_esquerdo', name: 'Glúteo Esquerdo', x: 40, y: 54, width: 10, height: 8 },
        { code: 'quadril_direito', name: 'Glúteo Direito', x: 60, y: 54, width: 10, height: 8 },
        { code: 'coxa_esquerda', name: 'Coxa Esquerda', x: 40, y: 64, width: 10, height: 12 },
        { code: 'coxa_direito', name: 'Coxa Direita', x: 60, y: 64, width: 10, height: 12 },
        { code: 'perna_esquerda', name: 'Panturrilha Esquerda', x: 40, y: 80, width: 7, height: 12 },
        { code: 'perna_direito', name: 'Panturrilha Direita', x: 60, y: 80, width: 7, height: 12 },
        { code: 'tornozelo_esquerdo', name: 'Tornozelo Esquerdo', x: 40, y: 92, width: 6, height: 4 },
        { code: 'tornozelo_direito', name: 'Tornozelo Direito', x: 60, y: 92, width: 6, height: 4 },
    ],
};

export function BodyMapRealistic({
    view,
    points,
    onPointAdd,
    onPointRemove,
    onPointUpdate,
    readOnly = false,
    selectedIntensity = 5,
    selectedPainType = 'aguda',
    className,
    onViewChange,
    evolutionData = []
}: BodyMapRealisticProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [imageError, setImageError] = useState(false);

    const regions = BODY_REGIONS[view];

    const findNearestRegion = useCallback((x: number, y: number) => {
        let nearest = regions[0];
        let minDistance = Infinity;

        regions.forEach(region => {
            const distance = Math.sqrt(
                Math.pow(x - region.x, 2) + Math.pow(y - region.y, 2)
            );
            if (distance < minDistance) {
                minDistance = distance;
                nearest = region;
            }
        });

        return nearest;
    }, [regions]);

    const dragStartPosRef = useRef({ x: 0, y: 0 });

    const handleMouseDown = (e: React.MouseEvent) => {
        dragStartPosRef.current = { x: e.clientX, y: e.clientY };
        if (e.button === 0 && (e.altKey || e.ctrlKey || zoom > 1)) { // Only drag if zoomed or holding modifier
            setIsDragging(true);
            setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
            e.stopPropagation();
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isDragging) {
            setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleMapClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        // Calculate distance moved during click/drag to differentiate
        const moveDistance = Math.sqrt(
            Math.pow(e.clientX - dragStartPosRef.current.x, 2) +
            Math.pow(e.clientY - dragStartPosRef.current.y, 2)
        );

        if (moveDistance > 5) return; // Consider it a drag if moved more than 5px

        if (isDragging) return;
        if (readOnly || !onPointAdd) return;

        const container = containerRef.current;
        if (!container) return;

        const rect = container.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const adjustedX = (mouseX - pan.x - centerX) / zoom + centerX;
        const adjustedY = (mouseY - pan.y - centerY) / zoom + centerY;

        const xPercent = (adjustedX / rect.width) * 100;
        const yPercent = (adjustedY / rect.height) * 100;

        if (xPercent < 0 || xPercent > 100 || yPercent < 0 || yPercent > 100) return;

        const region = findNearestRegion(xPercent, yPercent);

        const existingPoint = points.find(p => p.regionCode === region.code);
        if (existingPoint) {
            setSelectedPointId(existingPoint.id);
            return;
        }

        onPointAdd({
            regionCode: region.code,
            region: region.name,
            intensity: selectedIntensity,
            painType: selectedPainType,
            x: region.x,
            y: region.y,
        });

    }, [readOnly, onPointAdd, findNearestRegion, points, selectedIntensity, selectedPainType, zoom, pan, isDragging]);

    const currentSelectedPoint = points.find(p => p.id === selectedPointId);

    const handleUpdatePoint = (intensity: PainIntensity, painType: PainType, description?: string) => {
        if (!currentSelectedPoint || !onPointUpdate) return;
        onPointUpdate({
            ...currentSelectedPoint,
            intensity,
            painType,
            notes: description
        });
    };

    const handleRemovePoint = (_region: any) => {
        if (!currentSelectedPoint || !onPointRemove) return;
        onPointRemove(currentSelectedPoint.id);
        setSelectedPointId(null);
    }

    // Process evolution data for the chart (last 7 points)
    const chartData = evolutionData ? evolutionData.slice(-7).map(d => ({
        day: d.date ? format(new Date(d.date), 'EEE', { locale: ptBR }).toUpperCase()[0] : '?',
        val: d.globalPainLevel
    })) : [];

    const handleZoomIn = () => setZoom(z => Math.min(z + 0.5, 3));
    const handleZoomOut = () => setZoom(z => Math.max(z - 0.5, 1));
    const handleReset = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

    if (imageError) {
        return (
            <div className={cn("w-full h-[500px] flex flex-col items-center justify-center bg-muted/30 rounded-lg border-2 border-dashed border-muted-foreground/25", className)}>
                <ImageOff className="h-10 w-10 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-muted-foreground">Erro ao carregar modelo 3D</h3>
                <p className="text-sm text-muted-foreground/80 mb-4">Verifique sua conexão ou tente recarregar a página.</p>
                <Button variant="outline" onClick={() => setImageError(false)}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Tentar Novamente
                </Button>
            </div>
        );
    }

    return (
        <div
            className={cn('relative w-full h-full min-h-[500px] overflow-hidden bg-background font-sans selection:bg-primary selection:text-primary-foreground group/canvas rounded-lg border shadow-sm', className)}
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
            <TooltipProvider>
                {/* 3D Background Image Container with Transform */}
                <div
                    className="absolute inset-0 z-0 flex justify-center items-center transition-transform duration-200 ease-out origin-center"
                    style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
                >
                    <div className="absolute inset-0 bg-[#050a14]">
                        {/* Vignette Overlay (Static relative to bg) */}
                        <div className="absolute inset-0 bg-radial-gradient from-transparent to-black/80 pointer-events-none z-10"></div>

                        {/* Grid background effect */}
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>

                        <img
                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCw4Z8IdeBFBBiKxydPoRR75gxNF9YCvC7iPcmOjaVcV6rREUezduQanXdc71JSAbcXf1JxyTa7Erypk3jS2viO4bE-6Cw7ErRGzAwynmz4ERghh1KKwQNX_n18Gqa2GelkMdY4MhNuXOXMvp615hkJFz0k5i-z5THnAJl723zsPAF6fC077aScklL21JGNVffCSTpRxKec3P8-5TrCjaPKuc4qNmafAhXJS468gPWpBjbUXwOvX4Qpsgh666JwqqQ2aOSnMmyYPV8"
                            alt="Modelo Anatômico 3D"
                            className={cn(
                                "h-[120%] w-auto object-cover opacity-90 transition-transform duration-500 max-w-none", // max-w-none important for zoom
                                view === 'back' && "scale-x-[-1]"
                            )}
                            style={{ filter: "contrast(1.1) brightness(0.9)" }}
                            draggable={false}
                            onError={() => setImageError(true)}
                        />
                    </div>

                    {/* Interactive Points Layer (Moves with Transform) */}
                    <div className="absolute inset-0 z-10">
                        {points.map(point => {
                            const isSelected = selectedPointId === point.id;
                            return (
                                <div
                                    key={point.id}
                                    className={cn(
                                        "absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-500",
                                        "group cursor-pointer"
                                    )}
                                    style={{ left: `${point.x}%`, top: `${point.y}%` }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedPointId(isSelected ? null : point.id);
                                    }}
                                >
                                    <div className={cn(
                                        "relative transition-all duration-300",
                                        isSelected ? "scale-125" : "scale-100",
                                        point.intensity >= 7 ? "w-24 h-24" : "w-16 h-16"
                                    )}>
                                        {/* Connecting Line */}
                                        {isSelected && (
                                            <div className="absolute top-1/2 left-1/2 w-[200px] h-[1px] bg-gradient-to-r from-primary/80 to-transparent -z-10 origin-left rotate-[-15deg] animate-pulse"></div>
                                        )}
                                        {/* Radial Glow */}
                                        <div className={cn(
                                            "absolute inset-0 rounded-full blur-xl opacity-60 animate-pulse",
                                            point.intensity >= 7 ? "bg-red-500" :
                                                point.intensity >= 4 ? "bg-orange-500" : "bg-emerald-500"
                                        )} style={{ mixBlendMode: 'screen' }} />
                                        {/* Core Dot */}
                                        <div className={cn(
                                            "absolute top-1/2 left-1/2 w-4 h-4 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_0_15px_3px_rgba(255,255,255,0.8)] z-20 border-2 border-white/80",
                                            point.intensity >= 7 ? "bg-red-500" :
                                                point.intensity >= 4 ? "bg-orange-500" : "bg-emerald-500"
                                        )} />
                                        {/* Label */}
                                        <div className={cn(
                                            "absolute top-full left-1/2 -translate-x-1/2 mt-2",
                                            "opacity-0 group-hover:opacity-100 transition-opacity",
                                            isSelected && "opacity-100"
                                        )}>
                                            <Badge variant="secondary" className="bg-black/80 text-white hover:bg-black/90 text-[10px] whitespace-nowrap">
                                                {PainMapService.getRegionLabel(point.region as any)}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* -- UI OVERLAYS (Static, do not move with zoom/pan) -- */}

                {/* Hidden interactive layer for clicks */}
                <div className="absolute inset-0 z-0 cursor-crosshair" onClick={handleMapClick}></div>

                {/* Header */}
                <div className="absolute top-6 left-6 z-20 pointer-events-none select-none">
                    <h1 className="text-2xl text-white mb-1 drop-shadow-md font-bold tracking-tight">Explorer 3D</h1>
                    <p className="text-slate-300 text-sm font-light flex items-center gap-2">
                        {zoom > 1 && <span className="bg-blue-500/20 text-blue-200 px-1.5 py-0.5 rounded text-[10px] font-medium border border-blue-500/30">ZOOM {zoom.toFixed(1)}x</span>}
                        {zoom > 1 ? "Arraste para mover" : "Selecione as áreas afetadas"}
                    </p>
                </div>

                {/* Right Side: Details Panel Overlay */}
                {currentSelectedPoint && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 z-30 w-[350px] animate-in slide-in-from-right-10 fade-in duration-300 max-h-[90%] overflow-y-auto hidden md:block">
                        <Card className="bg-background/95 backdrop-blur-xl border-border/50 shadow-2xl">
                            <CardHeader className="pb-3 border-b border-border/50">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-base">Detalhes da Dor</CardTitle>
                                        <CardDescription className="text-xs mt-1">
                                            Editando <span className="font-medium text-foreground">{currentSelectedPoint.region}</span>
                                        </CardDescription>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedPointId(null)}>
                                        <RotateCcw className="h-3 w-3" />
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-4">
                                <PainDetailsForm
                                    selectedRegion={currentSelectedPoint.regionCode as any}
                                    intensity={currentSelectedPoint.intensity as PainIntensity}
                                    painType={currentSelectedPoint.painType as PainType}
                                    description={currentSelectedPoint.notes || ''}
                                    onUpdate={handleUpdatePoint}
                                    onRemove={handleRemovePoint}
                                    className="text-left"
                                />
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Mobile Bottom Sheet for Details (Visible only on small screens) */}
                {currentSelectedPoint && (
                    <div className="absolute bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-xl border-t border-border p-4 md:hidden animate-in slide-in-from-bottom-full duration-300 rounded-t-2xl shadow-[0_-5px_20px_rgba(0,0,0,0.2)]">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-semibold text-sm">Detalhes: {currentSelectedPoint.region}</h3>
                            <Button variant="ghost" size="sm" onClick={() => setSelectedPointId(null)}>Fechar</Button>
                        </div>
                        <div className="max-h-[60vh] overflow-y-auto">
                            <PainDetailsForm
                                selectedRegion={currentSelectedPoint.regionCode as any}
                                intensity={currentSelectedPoint.intensity as PainIntensity}
                                painType={currentSelectedPoint.painType as PainType}
                                description={currentSelectedPoint.notes || ''}
                                onUpdate={handleUpdatePoint}
                                onRemove={handleRemovePoint}
                            />
                        </div>
                    </div>
                )}


                {/* View Controls & Zoom */}
                <div className="absolute bottom-6 right-6 z-20 flex flex-col gap-2 items-end">
                    {/* Zoom Controls */}
                    <Card className="bg-background/90 backdrop-blur-md p-1 border-border/50 flex flex-col gap-1 shadow-lg">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleReset}>
                                    <Maximize2 className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="left">Resetar Vista</TooltipContent>
                        </Tooltip>
                        <Separator />
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleZoomIn}>
                                    <ZoomIn className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="left">Aumentar Zoom</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleZoomOut}>
                                    <ZoomOut className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="left">Diminuir Zoom</TooltipContent>
                        </Tooltip>
                    </Card>

                    {/* View Switcher */}
                    <Card className="bg-background/90 backdrop-blur-md p-1 border-border/50 flex gap-1 shadow-lg">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant={view === 'front' ? 'secondary' : 'ghost'}
                                    size="sm"
                                    className={cn("h-9 px-3", view === 'front' && "bg-primary/10 text-primary hover:bg-primary/20")}
                                    onClick={() => onViewChange?.('front')}
                                >
                                    <span className="font-bold text-xs">ANT</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">Vista Anterior</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant={view === 'back' ? 'secondary' : 'ghost'}
                                    size="sm"
                                    className={cn("h-9 px-3", view === 'back' && "bg-primary/10 text-primary hover:bg-primary/20")}
                                    onClick={() => onViewChange?.('back')}
                                >
                                    <span className="font-bold text-xs">POST</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">Vista Posterior</TooltipContent>
                        </Tooltip>
                    </Card>
                </div>

                {/* Left Stats Overlay - Dynamic History */}
                <div className="absolute top-24 left-6 z-10 w-64 pointer-events-none hidden lg:block">
                    <Card className="bg-background/60 backdrop-blur-md border-white/10 shadow-lg mb-4">
                        <div className="p-4">
                            <div className="flex justify-between items-center mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full bg-primary animate-pulse"></div>
                                    <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Histórico (7 Dias)</h3>
                                </div>
                            </div>

                            {chartData.length > 0 ? (
                                <div className="h-24 flex items-end justify-between gap-1">
                                    {chartData.map((d, i) => (
                                        <div key={i} className="flex flex-col items-center gap-1 w-full h-full justify-end group">
                                            <div
                                                className={cn("w-full rounded-t-sm transition-all duration-500 relative",
                                                    i === chartData.length - 1 ? (d.val > 5 ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]" : "bg-primary shadow-[0_0_10px_rgba(59,130,246,0.4)]")
                                                        : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                                                )}
                                                style={{ height: `${Math.max(10, d.val * 10)}%` }}
                                            >
                                                <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-black text-white text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                                    Nível {d.val}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="h-24 flex items-center justify-center text-xs text-muted-foreground">
                                    Sem dados recentes
                                </div>
                            )}

                            <div className="flex justify-between text-[10px] text-muted-foreground mt-2 px-1 uppercase font-mono border-t border-white/5 pt-2">
                                {chartData.length > 0 ? chartData.map((d, i) => <span key={i}>{d.day}</span>) : <span>-</span>}
                            </div>
                        </div>
                    </Card>

                    {/* Tips Card */}
                    <Card className="bg-background/60 backdrop-blur-md border-white/10 shadow-sm p-3 flex items-start gap-3">
                        <div className="bg-primary/10 p-1.5 rounded-full mt-0.5">
                            <Move className="w-3 h-3 text-primary" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-foreground mb-0.5">Navegação</p>
                            <p className="text-[10px] text-muted-foreground leading-tight">
                                Use o zoom para detalhes. Arraste para mover o modelo quando o zoom estiver ativo.
                            </p>
                        </div>
                    </Card>
                </div>
            </TooltipProvider>
        </div>
    );
}
