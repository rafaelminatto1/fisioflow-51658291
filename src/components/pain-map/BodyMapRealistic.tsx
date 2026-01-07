import { useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { PainPoint } from './BodyMap';

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
}

// Reusing regions from BodyMap.tsx but mapped for this specific 3D image if needed.
// For now, we reuse the same logic as BodyMap.tsx for hit detection to keep it compatible,
// assuming the image aligns reasonably well with standard anatomical position 50% X center.
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
    selectedPainType = 'sharp',
    className,
    onViewChange,
}: BodyMapRealisticProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
    const [selectedPoint, setSelectedPoint] = useState<string | null>(null);

    const regions = BODY_REGIONS[view];

    // Find nearest region logic
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

    const handleMapClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (readOnly || !onPointAdd) return;

        const container = containerRef.current;
        if (!container) return;

        const rect = container.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        const region = findNearestRegion(x, y);

        // Check if points already exist
        const existingPoint = points.find(p => p.regionCode === region.code);
        if (existingPoint) {
            setSelectedPoint(existingPoint.id);
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
    }, [readOnly, onPointAdd, findNearestRegion, points, selectedIntensity, selectedPainType]);

    return (
        <div className={cn('relative w-full h-full min-h-[500px] overflow-hidden bg-navy-950 rounded-xl', className)} ref={containerRef}>
            {/* 3D Background Image */}
            <div className="absolute inset-0 z-0 flex justify-center items-center bg-gradient-to-b from-navy-950 via-[#060e1f] to-navy-950">
                {/* Grid background effect */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none opacity-20"></div>

                <img
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuBBwEq8qjTGvhroTPPoJ6l5G7CWNQ5GvWuu89MSHW0BgKeXBhu23qrh2XJ0SXSenC94dO0JHB2si88dGTfeApRyaKfGkrAaOTUINMyRBb2ueje82D2toEutIZjBBVOLzqGmwVN2N1SO46hMja9AGbm4qaKc4Oo_C02tqGXL0EWr7L4EbKBLqIvF01_95hopItxP_A8vCuCpl_JiRGwXq405b3NdwHT76jWHuCDC5SXpV2hB7-MGrMKiSPS79Ii0MYxVvlm7fSR2brY"
                    alt="3D Anatomical Model"
                    className="h-[90%] w-auto object-contain opacity-90 drop-shadow-[0_0_30px_rgba(56,189,248,0.15)] pointer-events-none select-none"
                />
            </div>

            {/* Interactive Layer */}
            <div
                className="absolute inset-0 z-10 cursor-crosshair"
                onClick={handleMapClick}
            >
                {/* Render Points */}
                {points.map(point => {
                    const isSelected = selectedPoint === point.id;

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
                                setSelectedPoint(isSelected ? null : point.id);
                            }}
                        >
                            {/* Visual Representation of Pain - Realistic Glow */}
                            <div className={cn(
                                "relative",
                                point.intensity >= 7 ? "w-24 h-24" : "w-16 h-16"
                            )}>
                                {/* Radial Glow */}
                                <div className={cn(
                                    "absolute inset-0 rounded-full blur-xl opacity-60 animate-pulse",
                                    point.intensity >= 7 ? "bg-red-500" :
                                        point.intensity >= 4 ? "bg-orange-500" : "bg-green-500"
                                )} style={{ mixBlendMode: 'screen' }} />

                                {/* Core Dot */}
                                <div className={cn(
                                    "absolute top-1/2 left-1/2 w-3 h-3 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_0_15px_3px_rgba(255,255,255,0.8)] z-20",
                                    point.intensity >= 7 ? "bg-red-400" :
                                        point.intensity >= 4 ? "bg-orange-400" : "bg-green-400"
                                )} />

                                {/* Connector Line & Card (Only if selected or hover) */}
                                {(isSelected) && (
                                    <div className="absolute top-1/2 left-full ml-4 z-50 min-w-[200px] animate-in fade-in slide-in-from-left-4 duration-300">
                                        {/* Line */}
                                        <div className="absolute top-1/2 right-full w-4 h-[1px] bg-slate-400/50" />
                                        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700/50 p-4 rounded-xl shadow-2xl text-left">
                                            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">Região</div>
                                            <h3 className="text-lg font-bold text-white mb-1 leading-tight">{point.region}</h3>

                                            <div className="mt-2 flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className={cn(
                                                        "text-xs font-bold px-2 py-0.5 rounded border",
                                                        point.intensity >= 7 ? "bg-red-500/20 text-red-400 border-red-500/30" :
                                                            point.intensity >= 4 ? "bg-orange-500/20 text-orange-400 border-orange-500/30" : "bg-green-500/20 text-green-400 border-green-500/30"
                                                    )}>
                                                        {point.intensity}/10
                                                    </span>
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onPointRemove?.(point.id);
                                                    }}
                                                    className="text-slate-500 hover:text-red-400 transition-colors"
                                                >
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                                                </button>
                                            </div>
                                            {point.notes && (
                                                <p className="mt-2 text-xs text-slate-300 border-t border-slate-700/50 pt-2">{point.notes}</p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Controls Overlay */}
            <div className="absolute top-6 right-6 z-20 flex flex-col gap-2">
                <div className="bg-slate-800/80 backdrop-blur p-2 rounded-lg border border-slate-700 shadow-lg flex flex-col gap-1">
                    <button
                        className={cn("px-3 py-1.5 rounded text-xs font-medium transition-colors", view === 'front' ? "bg-primary-600 text-white" : "text-slate-400 hover:text-white")}
                        onClick={() => onViewChange?.('front')}
                    >
                        Anterior
                    </button>
                    <button
                        className={cn("px-3 py-1.5 rounded text-xs font-medium transition-colors", view === 'back' ? "bg-primary-600 text-white" : "text-slate-400 hover:text-white")}
                        onClick={() => onViewChange?.('back')}
                    >
                        Posterior
                    </button>
                </div>
            </div>

            {/* Legend Overlay */}
            <div className="absolute bottom-6 left-6 z-20 pointer-events-none">
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.5)]"></div>
                        <span className="text-xs text-slate-400 font-medium">Leve (1-3)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-orange-400 shadow-[0_0_10px_rgba(251,146,60,0.5)]"></div>
                        <span className="text-xs text-slate-400 font-medium">Moderada (4-6)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-400 shadow-[0_0_10px_rgba(248,113,113,0.5)]"></div>
                        <span className="text-xs text-slate-400 font-medium">Intensa (7-10)</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
