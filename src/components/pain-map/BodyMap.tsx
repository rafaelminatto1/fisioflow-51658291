import { useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { PainType } from '@/types/painMap';

export interface PainPoint {
  id: string;
  regionCode: string;
  region: string;
  intensity: number;
  painType: PainType;
  notes?: string;
  x: number;
  y: number;
}

interface BodyMapProps {
  view: 'front' | 'back';
  points: PainPoint[];
  onPointAdd?: (point: Omit<PainPoint, 'id'>) => void;
  onPointRemove?: (pointId: string) => void;
  onPointUpdate?: (point: PainPoint) => void;
  readOnly?: boolean;
  selectedIntensity?: number;
  selectedPainType?: PainPoint['painType'];
  className?: string;
}

// Regiões do corpo com coordenadas aproximadas (% do SVG)
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

// Cores por intensidade de dor
const getIntensityColor = (intensity: number): string => {
  if (intensity <= 2) return '#22c55e'; // Verde - leve
  if (intensity <= 4) return '#eab308'; // Amarelo - moderada
  if (intensity <= 6) return '#f97316'; // Laranja - moderada-alta
  if (intensity <= 8) return '#ef4444'; // Vermelho - alta
  return '#7f1d1d'; // Vermelho escuro - severa
};

// Ícones por tipo de dor
const PAIN_TYPE_ICONS: Record<PainType, string> = {
  aguda: '⚡',
  cronica: '⏳',
  latejante: '💓',
  queimacao: '🔥',
  formigamento: '✨',
  dormencia: '❄️',
  peso: '🔒',
  pontada: '📌',
  sharp: '⚡',
  throbbing: '💓',
  burning: '🔥',
  tingling: '✨',
  numbness: '❄️',
  stiffness: '🔒',
};

export function BodyMap({
  view,
  points,
  onPointAdd,
  onPointRemove,
  onPointUpdate,
  readOnly = false,
  selectedIntensity = 5,
  selectedPainType = 'aguda',
  className,
}: BodyMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<string | null>(null);

  const regions = BODY_REGIONS[view];

  // Encontrar região mais próxima do clique
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

  // Handler de clique no mapa
  const handleMapClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (readOnly || !onPointAdd) return;

    const svg = svgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const region = findNearestRegion(x, y);

    // Verificar se já existe ponto nessa região
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
    <div className={cn('relative', className)}>
      {/* Legenda */}
      <div className="absolute top-2 right-2 bg-background/90 backdrop-blur p-2 rounded-lg text-xs space-y-1 z-10">
        <div className="font-medium mb-2">{view === 'front' ? 'Frente' : 'Costas'}</div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#22c55e' }} />
          <span>1-2: Leve</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#eab308' }} />
          <span>3-4: Moderada</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#f97316' }} />
          <span>5-6: Alta</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ef4444' }} />
          <span>7-8: Severa</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#7f1d1d' }} />
          <span>9-10: Extrema</span>
        </div>
      </div>

      {/* SVG do corpo */}
      <svg
        ref={svgRef}
        viewBox="0 0 100 100"
        className="w-full h-full cursor-crosshair"
        onClick={handleMapClick}
      >
        {/* Silhueta do corpo */}
        <g fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.3">
          {view === 'front' ? (
            // Silhueta frontal
            <path d="
              M50 4 
              C56 4 60 8 60 12 
              C60 16 56 20 50 20 
              C44 20 40 16 40 12 
              C40 8 44 4 50 4
              M50 20 L50 18
              M42 20 Q38 22 34 18 L26 20 L22 36 L18 50 L14 56
              M58 20 Q62 22 66 18 L74 20 L78 36 L82 50 L86 56
              M42 20 L42 50 L38 52 L38 75 L36 92 L44 96
              M58 20 L58 50 L62 52 L62 75 L64 92 L56 96
              M42 50 L58 50
            " />
          ) : (
            // Silhueta traseira
            <path d="
              M50 4 
              C56 4 60 8 60 12 
              C60 16 56 20 50 20 
              C44 20 40 16 40 12 
              C40 8 44 4 50 4
              M50 20 L50 18
              M42 20 Q38 22 34 18 L26 20 L22 36 L18 50 L14 56
              M58 20 Q62 22 66 18 L74 20 L78 36 L82 50 L86 56
              M42 20 L42 50 L38 54 L38 75 L36 92 L44 96
              M58 20 L58 50 L62 54 L62 75 L64 92 L56 96
              M42 50 L58 50
              M42 28 L58 28
              M42 38 L58 38
            " />
          )}
        </g>

        {/* Regiões clicáveis */}
        {regions.map(region => {
          const isHovered = hoveredRegion === region.code;
          const hasPoint = points.some(p => p.regionCode === region.code);

          return (
            <rect
              key={region.code}
              x={region.x - region.width / 2}
              y={region.y - region.height / 2}
              width={region.width}
              height={region.height}
              fill={isHovered ? 'rgba(59, 130, 246, 0.15)' : 'transparent'}
              stroke={isHovered ? 'rgba(59, 130, 246, 0.6)' : 'transparent'}
              strokeWidth={isHovered ? '1' : '0.5'}
              rx="2"
              className={cn(
                'cursor-pointer transition-all duration-200',
                isHovered && 'transform scale-105'
              )}
              onMouseEnter={() => setHoveredRegion(region.code)}
              onMouseLeave={() => setHoveredRegion(null)}
            />
          );
        })}

        {/* Pontos de dor */}
        {points.map(point => {
          const isSelected = selectedPoint === point.id;
          const color = getIntensityColor(point.intensity);
          const radius = isSelected ? 4 : 3;
          const glowRadius = radius * 2.5;

          return (
            <g key={point.id} className="pain-point-group">
              {/* Pulse Ring Animation - apenas para pontos de alta intensidade */}
              {point.intensity >= 7 && (
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={glowRadius}
                  fill={color}
                  opacity="0.3"
                  className="animate-pulse-ring pointer-events-none"
                  style={{
                    animation: 'pulse-ring 1.5s cubic-bezier(0.215, 0.61, 0.355, 1) infinite',
                  }}
                />
              )}

              {/* Glow Effect */}
              <circle
                cx={point.x}
                cy={point.y}
                r={radius + 1}
                fill={color}
                opacity="0.2"
                className="pointer-events-none"
              />

              {/* Círculo do ponto */}
              <circle
                cx={point.x}
                cy={point.y}
                r={radius}
                fill={color}
                stroke={isSelected ? '#fff' : color}
                strokeWidth={isSelected ? '1.5' : '1'}
                className={cn(
                  'cursor-pointer transition-all hover:scale-125',
                  isSelected && 'ring-2 ring-offset-2 ring-offset-background',
                  'drop-shadow-lg'
                )}
                style={{
                  filter: `drop-shadow(0 0 ${radius}px ${color}80)`,
                  transition: 'all 0.2s ease-out',
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPoint(isSelected ? null : point.id);
                }}
              />

              {/* Ícone do tipo de dor */}
              <text
                x={point.x}
                y={point.y + 0.5}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="2.5"
                className="pointer-events-none select-none drop-shadow-sm"
                style={{
                  filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.3))',
                }}
              >
                {PAIN_TYPE_ICONS[point.painType]}
              </text>

              {/* Intensidade */}
              <text
                x={point.x + (isSelected ? 5 : 4)}
                y={point.y}
                fontSize={isSelected ? '3' : '2.5'}
                fill={color}
                fontWeight="bold"
                className="pointer-events-none transition-all"
                style={{
                  filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.3))',
                }}
              >
                {point.intensity}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Tooltip da região */}
      {hoveredRegion && (
        <div className="absolute bottom-2 left-2 bg-background/90 backdrop-blur px-2 py-1 rounded text-sm">
          {regions.find(r => r.code === hoveredRegion)?.name}
        </div>
      )}

      {/* Painel do ponto selecionado */}
      {selectedPoint && !readOnly && (
        <div className="absolute bottom-2 right-2 bg-background border rounded-lg p-3 shadow-lg min-w-[200px]">
          {(() => {
            const point = points.find(p => p.id === selectedPoint);
            if (!point) return null;

            return (
              <div className="space-y-2">
                <div className="font-medium">{point.region}</div>
                <div className="text-sm text-muted-foreground">
                  Intensidade: {point.intensity}/10
                </div>
                <div className="text-sm text-muted-foreground">
                  Tipo: {PAIN_TYPE_ICONS[point.painType]} {point.painType}
                </div>
                {point.notes && (
                  <div className="text-sm text-muted-foreground">
                    Notas: {point.notes}
                  </div>
                )}
                <button
                  onClick={() => {
                    onPointRemove?.(point.id);
                    setSelectedPoint(null);
                  }}
                  className="text-sm text-destructive hover:underline"
                >
                  Remover ponto
                </button>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

