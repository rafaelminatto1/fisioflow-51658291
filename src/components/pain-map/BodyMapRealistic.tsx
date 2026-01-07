import { useState, useRef, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { PainPoint } from './BodyMap';
import { PainDetailsForm } from './PainDetailsForm';
import { PainIntensity, PainType, PainEvolutionData } from '@/types/painMap';
import { ZoomIn, ZoomOut, Maximize2, Move } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
        { code: 'head_front', name: 'Cabeça', x: 50, y: 6, width: 12, height: 8 },
        { code: 'neck_front', name: 'Pescoço', x: 50, y: 14, width: 8, height: 4 },
        { code: 'shoulder_left_front', name: 'Ombro Esquerdo', x: 32, y: 18, width: 10, height: 6 },
        { code: 'shoulder_right_front', name: 'Ombro Direito', x: 68, y: 18, width: 10, height: 6 },
        { code: 'chest_left', name: 'Peito Esquerdo', x: 40, y: 22, width: 10, height: 10 },
        { code: 'chest_right', name: 'Peito Direito', x: 60, y: 22, width: 10, height: 10 },
        { code: 'arm_left_front', name: 'Braço Esquerdo', x: 25, y: 24, width: 7, height: 12 },
        { code: 'arm_right_front', name: 'Braço Direito', x: 75, y: 24, width: 7, height: 12 },
        { code: 'abdomen_upper', name: 'Abdômen Superior', x: 50, y: 34, width: 16, height: 8 },
        { code: 'forearm_left_front', name: 'Antebraço Esquerdo', x: 20, y: 38, width: 6, height: 12 },
        { code: 'forearm_right_front', name: 'Antebraço Direito', x: 80, y: 38, width: 6, height: 12 },
        { code: 'abdomen_lower', name: 'Abdômen Inferior', x: 50, y: 44, width: 16, height: 8 },
        { code: 'hand_left', name: 'Mão Esquerda', x: 15, y: 52, width: 6, height: 8 },
        { code: 'hand_right', name: 'Mão Direita', x: 85, y: 52, width: 6, height: 8 },
        { code: 'hip_left_front', name: 'Quadril Esquerdo', x: 40, y: 52, width: 10, height: 8 },
        { code: 'hip_right_front', name: 'Quadril Direito', x: 60, y: 52, width: 10, height: 8 },
        { code: 'thigh_left_front', name: 'Coxa Esquerda', x: 40, y: 62, width: 10, height: 14 },
        { code: 'thigh_right_front', name: 'Coxa Direita', x: 60, y: 62, width: 10, height: 14 },
        { code: 'knee_left', name: 'Joelho Esquerdo', x: 40, y: 76, width: 8, height: 6 },
        { code: 'knee_right', name: 'Joelho Direito', x: 60, y: 76, width: 8, height: 6 },
        { code: 'calf_left_front', name: 'Panturrilha Esquerda', x: 40, y: 82, width: 7, height: 10 },
        { code: 'calf_right_front', name: 'Panturrilha Direita', x: 60, y: 82, width: 7, height: 10 },
        { code: 'ankle_left', name: 'Tornozelo Esquerdo', x: 40, y: 92, width: 6, height: 4 },
        { code: 'ankle_right', name: 'Tornozelo Direito', x: 60, y: 92, width: 6, height: 4 },
        { code: 'foot_left', name: 'Pé Esquerdo', x: 40, y: 96, width: 8, height: 4 },
        { code: 'foot_right', name: 'Pé Direito', x: 60, y: 96, width: 8, height: 4 },
    ],
    back: [
        { code: 'head_back', name: 'Cabeça', x: 50, y: 6, width: 12, height: 8 },
        { code: 'neck_back', name: 'Pescoço', x: 50, y: 14, width: 8, height: 4 },
        { code: 'shoulder_left_back', name: 'Ombro Esquerdo', x: 32, y: 18, width: 10, height: 6 },
        { code: 'shoulder_right_back', name: 'Ombro Direito', x: 68, y: 18, width: 10, height: 6 },
        { code: 'upper_back_left', name: 'Costas Superior Esquerda', x: 40, y: 22, width: 10, height: 10 },
        { code: 'upper_back_right', name: 'Costas Superior Direita', x: 60, y: 22, width: 10, height: 10 },
        { code: 'arm_left_back', name: 'Braço Esquerdo', x: 25, y: 24, width: 7, height: 12 },
        { code: 'arm_right_back', name: 'Braço Direito', x: 75, y: 24, width: 7, height: 12 },
        { code: 'middle_back_left', name: 'Costas Média Esquerda', x: 40, y: 34, width: 10, height: 8 },
        { code: 'middle_back_right', name: 'Costas Média Direita', x: 60, y: 34, width: 10, height: 8 },
        { code: 'forearm_left_back', name: 'Antebraço Esquerdo', x: 20, y: 38, width: 6, height: 12 },
        { code: 'forearm_right_back', name: 'Antebraço Direito', x: 80, y: 38, width: 6, height: 12 },
        { code: 'lower_back_left', name: 'Lombar Esquerda', x: 40, y: 44, width: 10, height: 8 },
        { code: 'lower_back_right', name: 'Lombar Direita', x: 60, y: 44, width: 10, height: 8 },
        { code: 'glute_left', name: 'Glúteo Esquerdo', x: 40, y: 54, width: 10, height: 8 },
        { code: 'glute_right', name: 'Glúteo Direito', x: 60, y: 54, width: 10, height: 8 },
        { code: 'thigh_left_back', name: 'Coxa Esquerda', x: 40, y: 64, width: 10, height: 12 },
        { code: 'thigh_right_back', name: 'Coxa Direita', x: 60, y: 64, width: 10, height: 12 },
        { code: 'calf_left_back', name: 'Panturrilha Esquerda', x: 40, y: 80, width: 7, height: 12 },
        { code: 'calf_right_back', name: 'Panturrilha Direita', x: 60, y: 80, width: 7, height: 12 },
        { code: 'ankle_left', name: 'Tornozelo Esquerdo', x: 40, y: 92, width: 6, height: 4 },
        { code: 'ankle_right', name: 'Tornozelo Direito', x: 60, y: 92, width: 6, height: 4 },
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

    const handleMouseDown = (e: React.MouseEvent) => {
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
        if (isDragging) return;
        if (readOnly || !onPointAdd) return;

        const container = containerRef.current;
        if (!container) return;

        // Correct for Zoom/Pan
        const rect = container.getBoundingClientRect();

        // Calculate relative coordinates in the container (0-1)
        let relX = (e.clientX - rect.left) / rect.width;
        let relY = (e.clientY - rect.top) / rect.height;

        // If zoomed/panned, strict hitting might be tricky without complex matrix inversion.
        // Simplified approach: Inverse the transform.
        // Center of container is pivot.

        // Current implementation relies on simple % coordinates. Pan/Zoom transforms the visual layer.
        // For accurate clicking with zoom, we need to adjust calculating x/y.
        // Let's rely on standard logic but adjusted:
        // x_original = (x_screen - pan.x - center.x) / zoom + center.x

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const adjustedX = (mouseX - pan.x - centerX) / zoom + centerX;
        const adjustedY = (mouseY - pan.y - centerY) / zoom + centerY;

        const xPercent = (adjustedX / rect.width) * 100;
        const yPercent = (adjustedY / rect.height) * 100;

        // Bounds check
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

    const handleRemovePoint = (region: any) => {
        if (!currentSelectedPoint || !onPointRemove) return;
        onPointRemove(currentSelectedPoint.id);
        setSelectedPointId(null);
    }

    // Process evolution data for the chart (last 7 points)
    const chartData = evolutionData.slice(-7).map(d => ({
        day: format(new Date(d.date), 'EEE', { locale: ptBR }).toUpperCase()[0], // S, T, Q...
        val: d.globalPainLevel
    }));

    const handleZoomIn = () => setZoom(z => Math.min(z + 0.5, 3));
    const handleZoomOut = () => setZoom(z => Math.max(z - 0.5, 1));
    const handleReset = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

    return (
        <div
            className={cn('relative w-full h-full min-h-[500px] overflow-hidden bg-black font-sans selection:bg-blue-500 selection:text-white', className)}
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
            {/* 3D Background Image Container with Transform */}
            <div
                className="absolute inset-0 z-0 flex justify-center items-center transition-transform duration-200 ease-out origin-center"
                style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
            >
                <div className="absolute inset-0 bg-[#050a14]">
                    {/* Vignette Overlay (Static relative to bg) */}
                    <div className="absolute inset-0 bg-radial-gradient from-transparent to-black/80 pointer-events-none z-10"></div>

                    {/* Grid background effect */}
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(64,196,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(64,196,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>

                    <img
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuCw4Z8IdeBFBBiKxydPoRR75gxNF9YCvC7iPcmOjaVcV6rREUezduQanXdc71JSAbcXf1JxyTa7Erypk3jS2viO4bE-6Cw7ErRGzAwynmz4ERghh1KKwQNX_n18Gqa2GelkMdY4MhNuXOXMvp615hkJFz0k5i-z5THnAJl723zsPAF6fC077aScklL21JGNVffCSTpRxKec3P8-5TrCjaPKuc4qNmafAhXJS468gPWpBjbUXwOvX4Qpsgh666JwqqQ2aOSnMmyYPV8"
                        alt="3D Anatomical Model"
                        className={cn(
                            "h-[120%] w-auto object-cover opacity-90 transition-transform duration-500 max-w-none", // max-w-none important for zoom
                            view === 'back' && "scale-x-[-1]"
                        )}
                        style={{ filter: "contrast(1.1) brightness(0.9)" }}
                        draggable={false}
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
                                {/* Scale points slightly down when zoomed out so they don't clutter? Or keep size? Keeping const size usually better UX */}
                                <div className={cn(
                                    "relative transition-all duration-300",
                                    isSelected ? "scale-125" : "scale-100",
                                    // Scale inverse to zoom to keep roughly same visual size if desired, but here we let them scale with zoom for "realism"
                                    point.intensity >= 7 ? "w-24 h-24" : "w-16 h-16"
                                )}>
                                    {/* Connecting Line */}
                                    {isSelected && (
                                        <div className="absolute top-1/2 left-1/2 w-[200px] h-[1px] bg-gradient-to-r from-blue-400/80 to-transparent -z-10 origin-left rotate-[-15deg] animate-pulse"></div>
                                    )}
                                    {/* Radial Glow */}
                                    <div className={cn(
                                        "absolute inset-0 rounded-full blur-xl opacity-60 animate-pulse",
                                        point.intensity >= 7 ? "bg-red-500" :
                                            point.intensity >= 4 ? "bg-orange-500" : "bg-green-500"
                                    )} style={{ mixBlendMode: 'screen' }} />
                                    {/* Core Dot */}
                                    <div className={cn(
                                        "absolute top-1/2 left-1/2 w-4 h-4 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_0_15px_3px_rgba(255,255,255,0.8)] z-20 border-2 border-white/80",
                                        point.intensity >= 7 ? "bg-red-500" :
                                            point.intensity >= 4 ? "bg-orange-500" : "bg-green-500"
                                    )} />
                                    {/* Label */}
                                    <div className={cn(
                                        "absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 rounded bg-black/60 backdrop-blur border border-white/10 text-[10px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity",
                                        isSelected && "opacity-100"
                                    )}>
                                        {point.region}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* -- UI OVERLAYS (Static, do not move with zoom/pan) -- */}

            {/* Hidden interactive layer for clicks - Needs to capture clicks but respect transform logic used in handleMapClick if we want to click "empty" space */}
            <div className="absolute inset-0 z-0 cursor-crosshair" onClick={handleMapClick}></div>

            {/* Header */}
            <div className="absolute top-6 left-8 z-20 pointer-events-none">
                <h1 className="text-3xl text-white mb-1 drop-shadow-md font-extrabold tracking-tight">3D Anatomical Explorer</h1>
                <p className="text-slate-400 text-sm font-light">
                    {zoom > 1 ? "Arraste para mover. " : ""}Selecione as áreas afetadas.
                </p>
            </div>

            {/* Right Side: Details Panel Overlay */}
            {currentSelectedPoint && (
                <div className="absolute right-8 top-1/2 -translate-y-1/2 z-30 w-[350px] animate-in slide-in-from-right-10 fade-in duration-300">
                    <div className="bg-[#141e2d]/90 backdrop-blur-xl border border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.5)] rounded-2xl p-6 text-white">
                        <div className="flex justify-between items-start mb-4 border-b border-white/5 pb-4">
                            <div>
                                <h2 className="text-lg font-bold text-white leading-none">Detalhes da Dor</h2>
                                <p className="text-xs text-slate-400 mt-1">Editando {currentSelectedPoint.region}</p>
                            </div>
                            <button onClick={() => setSelectedPointId(null)} className="text-slate-400 hover:text-white transition-colors">
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <PainDetailsForm
                            selectedRegion={currentSelectedPoint.regionCode as any}
                            intensity={currentSelectedPoint.intensity as PainIntensity}
                            painType={currentSelectedPoint.painType as PainType}
                            description={currentSelectedPoint.notes || ''}
                            onUpdate={handleUpdatePoint}
                            onRemove={handleRemovePoint}
                            className="text-left"
                        />
                    </div>
                </div>
            )}

            {/* View Controls & Zoom */}
            <div className="absolute bottom-8 right-8 z-20 flex flex-col gap-2 items-end">
                {/* Zoom Controls */}
                <div className="bg-[#141e2d]/90 backdrop-blur-md p-1 rounded-xl border border-white/10 flex flex-col gap-1 shadow-lg mb-2">
                    <button onClick={handleReset} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-slate-300" title="Reset View"><Maximize2 className="w-4 h-4" /></button>
                    <div className="w-full h-[1px] bg-white/10"></div>
                    <button onClick={handleZoomIn} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-slate-300" title="Zoom In"><ZoomIn className="w-4 h-4" /></button>
                    <button onClick={handleZoomOut} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-slate-300" title="Zoom Out"><ZoomOut className="w-4 h-4" /></button>
                </div>

                {/* View Switcher */}
                <div className="bg-[#141e2d]/90 backdrop-blur-md p-1.5 rounded-xl border border-white/10 flex gap-1 shadow-lg">
                    <button
                        className={cn("w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white/10 text-slate-300 transition-colors", view === 'front' && "bg-blue-500/20 text-blue-400 border border-blue-500/30")}
                        onClick={() => onViewChange?.('front')}
                        title="Vista Anterior"
                    >
                        <span className="font-bold text-xs">ANT</span>
                    </button>
                    <button
                        className={cn("w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white/10 text-slate-300 transition-colors", view === 'back' && "bg-blue-500/20 text-blue-400 border border-blue-500/30")}
                        onClick={() => onViewChange?.('back')}
                        title="Vista Posterior"
                    >
                        <span className="font-bold text-xs">POST</span>
                    </button>
                </div>
            </div>

            {/* Left Stats Overlay - Dynamic History */}
            <div className="absolute top-24 left-8 z-10 w-64 pointer-events-none hidden lg:block">
                <div className="bg-[#141e2d]/80 backdrop-blur-md border border-white/5 rounded-xl p-4 mb-4">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Histórico (7 Dias)</h3>
                    </div>

                    {chartData.length > 0 ? (
                        <div className="h-24 flex items-end justify-between gap-1 px-1">
                            {chartData.map((d, i) => (
                                <div key={i} className="flex flex-col items-center gap-1 w-full h-full justify-end">
                                    <div
                                        className={cn("w-full rounded-t-sm transition-all duration-500",
                                            // Highlight last day
                                            i === chartData.length - 1 ? (d.val > 5 ? "bg-[#f87171] shadow-[0_0_8px_rgba(248,113,113,0.5)]" : "bg-[#3b82f6]")
                                                : "bg-slate-600/50"
                                        )}
                                        style={{ height: `${Math.max(10, d.val * 10)}%` }} // Min height so 0 is visible
                                        title={`Nível: ${d.val}`}
                                    ></div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="h-24 flex items-center justify-center text-xs text-slate-600">
                            Sem dados recentes
                        </div>
                    )}

                    <div className="flex justify-between text-[10px] text-slate-500 mt-1 px-1 uppercase font-mono">
                        {chartData.length > 0 ? chartData.map((d, i) => <span key={i}>{d.day}</span>) : <span>-</span>}
                    </div>
                </div>

                {/* Tips Card */}
                <div className="bg-[#141e2d]/80 backdrop-blur-md border border-white/5 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-1">
                        <Move className="w-3 h-3 text-blue-400" />
                        <span className="text-[10px] font-bold text-slate-300">Navegação</span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-tight">
                        Use o zoom para detalhes. Arraste para mover o modelo quando o zoom estiver ativo.
                    </p>
                </div>
            </div>
        </div>
    );
}
