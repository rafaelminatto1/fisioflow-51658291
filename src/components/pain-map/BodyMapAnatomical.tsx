import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { PainType } from '@/types/painMap';
import { MuscleSelectorModal } from './MuscleSelectorModal';
import { Muscle } from '@/lib/data/bodyMuscles';
import { Layers, Maximize2, Minimize2, Info, Zap } from 'lucide-react';
import { Badge } from '@/components/shared/ui/badge';
import { Button } from '@/components/shared/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/shared/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/shared/ui/tooltip';

export interface PainPoint {
  id: string;
  regionCode: string;
  region: string;
  muscleCode?: string;
  muscleName?: string;
  intensity: number;
  painType: PainType;
  notes?: string;
  x: number;
  y: number;
  date?: string;
}

interface BodyMapAnatomicalProps {
  view: 'front' | 'back';
  points: PainPoint[];
  onPointAdd?: (point: Omit<PainPoint, 'id'>) => void;
  onPointRemove?: (pointId: string) => void;
  onPointUpdate?: (point: PainPoint) => void;
  readOnly?: boolean;
  selectedIntensity?: number;
  selectedPainType?: PainPoint['painType'];
  className?: string;
  showFullscreenToggle?: boolean;
  onExpand?: () => void;
  onCollapse?: () => void;
}

// Paleta de cores melhorada
const INTENSITY_COLORS = {
  0: { primary: '#94a3b8', secondary: '#f1f5f9', label: 'Sem dor' },
  1: { primary: '#86efac', secondary: '#dcfce7', label: 'Mínima' },
  2: { primary: '#22c55e', secondary: '#bbf7d0', label: 'Leve' },
  3: { primary: '#a3e635', secondary: '#d9f99d', label: 'Leve-Moderada' },
  4: { primary: '#eab308', secondary: '#fef08a', label: 'Moderada' },
  5: { primary: '#f59e0b', secondary: '#fed7aa', label: 'Moderada' },
  6: { primary: '#f97316', secondary: '#fdba74', label: 'Alta' },
  7: { primary: '#ef4444', secondary: '#fca5a5', label: 'Severa' },
  8: { primary: '#dc2626', secondary: '#f87171', label: 'Muito Severa' },
  9: { primary: '#b91c1c', secondary: '#ef4444', label: 'Extrema' },
  10: { primary: '#7f1d1d', secondary: '#dc2626', label: 'Insuportável' },
};

const getIntensityColor = (intensity: number): string => INTENSITY_COLORS[intensity as keyof typeof INTENSITY_COLORS]?.primary || '#94a3b8';
const getIntensityBg = (intensity: number): string => INTENSITY_COLORS[intensity as keyof typeof INTENSITY_COLORS]?.secondary || '#f1f5f9';
const getIntensityLabel = (intensity: number): string => INTENSITY_COLORS[intensity as keyof typeof INTENSITY_COLORS]?.label || 'Desconhecido';

const getIntensityColorWithAlpha = (intensity: number, alpha: number = 0.4): string => {
  const color = getIntensityColor(intensity);
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// Ícones e labels por tipo de dor
const PAIN_TYPE_DATA: Record<PainType, { icon: string; label: string; color: string }> = {
  aguda: { icon: '⚡', label: 'Aguda', color: '#fbbf24' },
  cronica: { icon: '⏳', label: 'Crônica', color: '#a855f7' },
  latejante: { icon: '💓', label: 'Latejante', color: '#f43f5e' },
  queimacao: { icon: '🔥', label: 'Queimação', color: '#ef4444' },
  formigamento: { icon: '✨', label: 'Formigamento', color: '#fbbf24' },
  dormencia: { icon: '❄️', label: 'Dormência', color: '#06b6d4' },
  peso: { icon: '🔒', label: 'Peso', color: '#6b7280' },
  pontada: { icon: '📌', label: 'Pontada', color: '#ec4899' },
  sharp: { icon: '⚡', label: 'Aguda', color: '#fbbf24' },
  throbbing: { icon: '💓', label: 'Latejante', color: '#f43f5e' },
  burning: { icon: '🔥', label: 'Queimação', color: '#ef4444' },
  tingling: { icon: '✨', label: 'Formigamento', color: '#fbbf24' },
  numbness: { icon: '❄️', label: 'Dormência', color: '#06b6d4' },
  stiffness: { icon: '🔒', label: 'Rigidez', color: '#6b7280' },
};

// Definição das regiões musculares para desenho anatômico
interface MusclePath {
  code: string;
  name: string;
  d: string;
  x: number;
  y: number;
  muscleGroup?: string;
}

const MUSCLE_PATHS_FRONT: MusclePath[] = [
  // Cabeça e Pescoço
  { code: 'head_front', name: 'Cabeça', d: 'M 50 4 C 56 4 60 8 60 12 C 60 16 56 20 50 20 C 44 20 40 16 40 12 C 40 8 44 4 50 4', x: 50, y: 12, muscleGroup: 'Cabeça' },
  { code: 'neck_front', name: 'Pescoço', d: 'M 45 20 L 45 26 L 55 26 L 55 20', x: 50, y: 23, muscleGroup: 'Pescoço' },

  // Ombros
  { code: 'shoulder_left_front', name: 'Ombro Esquerdo', d: 'M 26 20 Q 24 24 26 30 L 34 30 Q 36 24 34 18 L 26 20', x: 30, y: 24, muscleGroup: 'Ombro' },
  { code: 'shoulder_right_front', name: 'Ombro Direito', d: 'M 74 20 Q 76 24 74 30 L 66 30 Q 64 24 66 18 L 74 20', x: 70, y: 24, muscleGroup: 'Ombro' },

  // Peito
  { code: 'chest_left', name: 'Peito Esquerdo', d: 'M 34 30 Q 32 35 34 45 L 48 45 Q 50 35 48 30 L 34 30', x: 41, y: 37, muscleGroup: 'Peito' },
  { code: 'chest_right', name: 'Peito Direito', d: 'M 66 30 Q 68 35 66 45 L 52 45 Q 50 35 52 30 L 66 30', x: 59, y: 37, muscleGroup: 'Peito' },

  // Braços
  { code: 'arm_left_front', name: 'Braço Esquerdo', d: 'M 26 30 Q 22 35 22 50 L 28 50 Q 28 35 26 30', x: 24, y: 40, muscleGroup: 'Braço' },
  { code: 'arm_right_front', name: 'Braço Direito', d: 'M 74 30 Q 78 35 78 50 L 72 50 Q 72 35 74 30', x: 76, y: 40, muscleGroup: 'Braço' },

  // Abdômen
  { code: 'abdomen_upper', name: 'Abdômen Superior', d: 'M 34 45 Q 32 50 34 54 L 66 54 Q 68 50 66 45 L 34 45', x: 50, y: 50, muscleGroup: 'Abdômen' },
  { code: 'abdomen_lower', name: 'Abdômen Inferior', d: 'M 34 54 Q 32 58 34 62 L 66 62 Q 68 58 66 54 L 34 54', x: 50, y: 58, muscleGroup: 'Abdômen' },

  // Antebraços
  { code: 'forearm_left_front', name: 'Antebraço Esquerdo', d: 'M 22 50 Q 20 55 20 65 L 26 65 Q 26 55 22 50', x: 22, y: 57, muscleGroup: 'Antebraço' },
  { code: 'forearm_right_front', name: 'Antebraço Direito', d: 'M 78 50 Q 80 55 80 65 L 74 65 Q 74 55 78 50', x: 78, y: 57, muscleGroup: 'Antebraço' },

  // Mãos
  { code: 'hand_left', name: 'Mão Esquerda', d: 'M 20 65 Q 18 68 20 75 L 26 75 Q 28 68 26 65 L 20 65', x: 22, y: 70, muscleGroup: 'Mão' },
  { code: 'hand_right', name: 'Mão Direita', d: 'M 80 65 Q 82 68 80 75 L 74 75 Q 72 68 74 65 L 80 65', x: 78, y: 70, muscleGroup: 'Mão' },

  // Quadris
  { code: 'hip_left_front', name: 'Quadril Esquerdo', d: 'M 34 62 Q 30 66 32 72 L 48 72 Q 50 66 48 62 L 34 62', x: 40, y: 67, muscleGroup: 'Quadril' },
  { code: 'hip_right_front', name: 'Quadril Direito', d: 'M 66 62 Q 70 66 68 72 L 52 72 Q 50 66 52 62 L 66 62', x: 60, y: 67, muscleGroup: 'Quadril' },

  // Coxas
  { code: 'thigh_left_front', name: 'Coxa Esquerda', d: 'M 32 72 Q 28 78 30 88 L 46 88 Q 48 78 46 72 L 32 72', x: 38, y: 80, muscleGroup: 'Coxa' },
  { code: 'thigh_right_front', name: 'Coxa Direita', d: 'M 68 72 Q 72 78 70 88 L 54 88 Q 52 78 54 72 L 68 72', x: 62, y: 80, muscleGroup: 'Coxa' },

  // Joelhos
  { code: 'knee_left', name: 'Joelho Esquerdo', d: 'M 30 88 Q 28 92 30 96 L 46 96 Q 48 92 46 88 L 30 88', x: 38, y: 92, muscleGroup: 'Joelho' },
  { code: 'knee_right', name: 'Joelho Direito', d: 'M 70 88 Q 72 92 70 96 L 54 96 Q 52 92 54 88 L 70 88', x: 62, y: 92, muscleGroup: 'Joelho' },

  // Panturrilhas
  { code: 'calf_left_front', name: 'Panturrilha Esquerda', d: 'M 30 96 Q 28 100 30 106 L 44 106 Q 46 100 44 96 L 30 96', x: 37, y: 101, muscleGroup: 'Panturrilha' },
  { code: 'calf_right_front', name: 'Panturrilha Direita', d: 'M 70 96 Q 72 100 70 106 L 56 106 Q 54 100 56 96 L 70 96', x: 63, y: 101, muscleGroup: 'Panturrilha' },

  // Tornozelos e Pés
  { code: 'ankle_left', name: 'Tornozelo Esquerdo', d: 'M 30 106 L 44 106 L 44 108 L 30 108 Z', x: 37, y: 107, muscleGroup: 'Tornozelo' },
  { code: 'ankle_right', name: 'Tornozelo Direito', d: 'M 70 106 L 56 106 L 56 108 L 70 108 Z', x: 63, y: 107, muscleGroup: 'Tornozelo' },
  { code: 'foot_left', name: 'Pé Esquerdo', d: 'M 28 108 Q 26 110 28 112 L 46 112 Q 48 110 46 108 L 28 108', x: 37, y: 110, muscleGroup: 'Pé' },
  { code: 'foot_right', name: 'Pé Direito', d: 'M 72 108 Q 74 110 72 112 L 54 112 Q 52 110 54 108 L 72 108', x: 63, y: 110, muscleGroup: 'Pé' },
];

const MUSCLE_PATHS_BACK: MusclePath[] = [
  // Cabeça e Pescoço
  { code: 'head_back', name: 'Cabeça', d: 'M 50 4 C 56 4 60 8 60 12 C 60 16 56 20 50 20 C 44 20 40 16 40 12 C 40 8 44 4 50 4', x: 50, y: 12, muscleGroup: 'Cabeça' },
  { code: 'neck_back', name: 'Pescoço', d: 'M 45 20 L 45 26 L 55 26 L 55 20', x: 50, y: 23, muscleGroup: 'Pescoço' },

  // Ombros e Costas Superiores
  { code: 'shoulder_left_back', name: 'Ombro Esquerdo', d: 'M 26 20 Q 24 24 26 30 L 34 30 Q 36 24 34 18 L 26 20', x: 30, y: 24, muscleGroup: 'Ombro' },
  { code: 'shoulder_right_back', name: 'Ombro Direito', d: 'M 74 20 Q 76 24 74 30 L 66 30 Q 64 24 66 18 L 74 20', x: 70, y: 24, muscleGroup: 'Ombro' },
  { code: 'upper_back_left', name: 'Costas Superior Esquerda', d: 'M 34 30 Q 32 35 34 45 L 48 45 Q 50 35 48 30 L 34 30', x: 41, y: 37, muscleGroup: 'Costas' },
  { code: 'upper_back_right', name: 'Costas Superior Direita', d: 'M 66 30 Q 68 35 66 45 L 52 45 Q 50 35 52 30 L 66 30', x: 59, y: 37, muscleGroup: 'Costas' },

  // Braços
  { code: 'arm_left_back', name: 'Braço Esquerdo', d: 'M 26 30 Q 22 35 22 50 L 28 50 Q 28 35 26 30', x: 24, y: 40, muscleGroup: 'Braço' },
  { code: 'arm_right_back', name: 'Braço Direito', d: 'M 74 30 Q 78 35 78 50 L 72 50 Q 72 35 74 30', x: 76, y: 40, muscleGroup: 'Braço' },

  // Costas Médias
  { code: 'middle_back_left', name: 'Costas Média Esquerda', d: 'M 34 45 Q 32 50 34 54 L 48 54 Q 50 50 48 45 L 34 45', x: 41, y: 50, muscleGroup: 'Costas' },
  { code: 'middle_back_right', name: 'Costas Média Direita', d: 'M 66 45 Q 68 50 66 54 L 52 54 Q 50 50 52 45 L 66 45', x: 59, y: 50, muscleGroup: 'Costas' },

  // Antebraços
  { code: 'forearm_left_back', name: 'Antebraço Esquerdo', d: 'M 22 50 Q 20 55 20 65 L 26 65 Q 26 55 22 50', x: 22, y: 57, muscleGroup: 'Antebraço' },
  { code: 'forearm_right_back', name: 'Antebraço Direito', d: 'M 78 50 Q 80 55 80 65 L 74 65 Q 74 55 78 50', x: 78, y: 57, muscleGroup: 'Antebraço' },

  // Lombar
  { code: 'lower_back_left', name: 'Lombar Esquerda', d: 'M 34 54 Q 32 58 34 62 L 48 62 Q 50 58 48 54 L 34 54', x: 41, y: 58, muscleGroup: 'Lombar' },
  { code: 'lower_back_right', name: 'Lombar Direita', d: 'M 66 54 Q 68 58 66 62 L 52 62 Q 50 58 52 54 L 66 54', x: 59, y: 58, muscleGroup: 'Lombar' },

  // Glúteos
  { code: 'glute_left', name: 'Glúteo Esquerdo', d: 'M 34 62 Q 28 66 30 72 L 48 72 Q 50 66 48 62 L 34 62', x: 39, y: 67, muscleGroup: 'Glúteo' },
  { code: 'glute_right', name: 'Glúteo Direito', d: 'M 66 62 Q 72 66 70 72 L 52 72 Q 50 66 52 62 L 66 62', x: 61, y: 67, muscleGroup: 'Glúteo' },

  // Coxas (Posterior)
  { code: 'thigh_left_back', name: 'Coxa Esquerda', d: 'M 30 72 Q 26 78 28 88 L 46 88 Q 48 78 46 72 L 30 72', x: 37, y: 80, muscleGroup: 'Coxa' },
  { code: 'thigh_right_back', name: 'Coxa Direita', d: 'M 70 72 Q 74 78 72 88 L 54 88 Q 52 78 54 72 L 70 72', x: 63, y: 80, muscleGroup: 'Coxa' },

  // Panturrilhas (Posterior)
  { code: 'calf_left_back', name: 'Panturrilha Esquerda', d: 'M 28 88 Q 26 94 28 102 L 44 102 Q 46 94 44 88 L 28 88', x: 36, y: 95, muscleGroup: 'Panturrilha' },
  { code: 'calf_right_back', name: 'Panturrilha Direita', d: 'M 72 88 Q 74 94 72 102 L 56 102 Q 54 94 56 88 L 72 88', x: 64, y: 95, muscleGroup: 'Panturrilha' },

  // Tornozelos e Pés (Posterior)
  { code: 'ankle_left', name: 'Tornozelo Esquerdo', d: 'M 28 102 L 44 102 L 44 106 L 28 106 Z', x: 36, y: 104, muscleGroup: 'Tornozelo' },
  { code: 'ankle_right', name: 'Tornozelo Direito', d: 'M 72 102 L 56 102 L 56 106 L 72 106 Z', x: 64, y: 104, muscleGroup: 'Tornozelo' },
];

type DisplayMode = 'regions' | 'muscles' | 'combined';
type FilterType = 'all' | 'high-intensity' | 'chronic' | 'muscle-specific';
type SortOption = 'intensity-desc' | 'intensity-asc' | 'region' | 'recent';

export function BodyMapAnatomical({
  view,
  points,
  onPointAdd,
  onPointRemove,
  onPointUpdate,
  readOnly = false,
  selectedIntensity = 5,
  selectedPainType = 'aguda',
  className,
  showFullscreenToggle = false,
  onExpand,
  onCollapse,
}: BodyMapAnatomicalProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<string | null>(null);
  const [muscleModalOpen, setMuscleModalOpen] = useState(false);
  const [pendingRegion, setPendingRegion] = useState<{ code: string; name: string; x: number; y: number } | null>(null);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('combined');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortOption>('intensity-desc');
  const [showLabels, setShowLabels] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const musclePaths = view === 'front' ? MUSCLE_PATHS_FRONT : MUSCLE_PATHS_BACK;

  // Filtrar e ordenar pontos
  const processedPoints = useMemo(() => {
    let result = [...points];

    // Aplicar filtros
    if (filterType === 'high-intensity') {
      result = result.filter(p => p.intensity >= 7);
    } else if (filterType === 'chronic') {
      result = result.filter(p => p.painType === 'cronica' || p.painType === 'stiffness');
    } else if (filterType === 'muscle-specific') {
      result = result.filter(p => p.muscleCode);
    }

    // Ordenar
    result.sort((a, b) => {
      if (sortBy === 'intensity-desc') return b.intensity - a.intensity;
      if (sortBy === 'intensity-asc') return a.intensity - b.intensity;
      if (sortBy === 'region') return a.region.localeCompare(b.region);
      if (sortBy === 'recent') {
        if (!a.date && !b.date) return 0;
        if (!a.date) return 1;
        if (!b.date) return -1;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
      return 0;
    });

    return result;
  }, [points, filterType, sortBy]);

  // Calcular estatísticas por região
  const regionStats = useMemo(() => {
    const stats = new Map<string, {
      count: number;
      maxIntensity: number;
      avgIntensity: number;
      hasMuscleSpecific: boolean;
      types: Set<PainType>;
    }>();

    points.forEach(point => {
      const current = stats.get(point.regionCode) || {
        count: 0,
        maxIntensity: 0,
        avgIntensity: 0,
        hasMuscleSpecific: false,
        types: new Set(),
      };

      current.count++;
      current.maxIntensity = Math.max(current.maxIntensity, point.intensity);
      current.avgIntensity = (current.avgIntensity * (current.count - 1) + point.intensity) / current.count;
      current.hasMuscleSpecific = current.hasMuscleSpecific || !!point.muscleCode;
      current.types.add(point.painType);

      stats.set(point.regionCode, current);
    });

    return stats;
  }, [points]);

  // Estatísticas globais
  const globalStats = useMemo(() => {
    const totalPoints = points.length;
    const avgIntensity = totalPoints > 0
      ? points.reduce((sum, p) => sum + p.intensity, 0) / totalPoints
      : 0;
    const highIntensityCount = points.filter(p => p.intensity >= 7).length;
    const muscleSpecificCount = points.filter(p => p.muscleCode).length;
    const chronicCount = points.filter(p => p.painType === 'cronica' || p.painType === 'stiffness').length;

    // Distribuição por tipo
    const typeDistribution = new Map<PainType, number>();
    points.forEach(p => {
      typeDistribution.set(p.painType, (typeDistribution.get(p.painType) || 0) + 1);
    });

    return {
      totalPoints,
      avgIntensity: Math.round(avgIntensity * 10) / 10,
      highIntensityCount,
      muscleSpecificCount,
      chronicCount,
      typeDistribution,
    };
  }, [points]);

  // Encontrar região mais próxima
  const findNearestRegion = useCallback((x: number, y: number) => {
    let nearest = musclePaths[0];
    let minDistance = Infinity;

    musclePaths.forEach(region => {
      const distance = Math.sqrt(
        Math.pow(x - region.x, 2) + Math.pow(y - region.y, 2)
      );
      if (distance < minDistance) {
        minDistance = distance;
        nearest = region;
      }
    });

    return nearest;
  }, [musclePaths]);

  // Handlers
  const handleMapClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (readOnly || !onPointAdd) return;

    const svg = svgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const region = findNearestRegion(x, y);

    const existingPoint = points.find(p => p.regionCode === region.code);
    if (existingPoint) {
      setSelectedPoint(existingPoint.id);
      return;
    }

    setPendingRegion({ code: region.code, name: region.name, x: region.x, y: region.y });
    setMuscleModalOpen(true);
  }, [readOnly, onPointAdd, findNearestRegion, points]);

  const handleMuscleSelect = useCallback((muscle: Muscle) => {
    if (!pendingRegion || !onPointAdd) return;
    onPointAdd({
      regionCode: pendingRegion.code,
      region: pendingRegion.name,
      muscleCode: muscle.code,
      muscleName: muscle.name,
      intensity: selectedIntensity,
      painType: selectedPainType,
      x: pendingRegion.x,
      y: pendingRegion.y,
      date: new Date().toISOString(),
    });
    setMuscleModalOpen(false);
    setPendingRegion(null);
  }, [pendingRegion, onPointAdd, selectedIntensity, selectedPainType]);

  const handleMuscleSkip = useCallback(() => {
    if (!pendingRegion || !onPointAdd) return;
    onPointAdd({
      regionCode: pendingRegion.code,
      region: pendingRegion.name,
      intensity: selectedIntensity,
      painType: selectedPainType,
      x: pendingRegion.x,
      y: pendingRegion.y,
      date: new Date().toISOString(),
    });
    setMuscleModalOpen(false);
    setPendingRegion(null);
  }, [pendingRegion, onPointAdd, selectedIntensity, selectedPainType]);

  const handlePointRemove = useCallback((pointId: string) => {
    onPointRemove?.(pointId);
    setSelectedPoint(null);
  }, [onPointRemove]);

  const handlePointUpdate = useCallback((point: PainPoint) => {
    onPointUpdate?.(point);
    setSelectedPoint(null);
  }, [onPointUpdate]);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => {
      const newValue = !prev;
      if (newValue && onExpand) {
        onExpand();
      } else if (!newValue && onCollapse) {
        onCollapse();
      }
      return newValue;
    });
  }, [onExpand, onCollapse]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedPoint(null);
        if (muscleModalOpen) {
          setMuscleModalOpen(false);
          setPendingRegion(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [muscleModalOpen]);

  return (
    <TooltipProvider>
      <div className={cn(
        'relative transition-all duration-300',
        isFullscreen && 'fixed inset-0 z-50 bg-background',
        !isFullscreen && 'w-full h-full',
        className
      )}>
        {/* Toolbar Superior */}
        <div className="absolute top-2 left-2 right-2 z-20 flex flex-wrap gap-2 items-start justify-between">
          <div className="flex flex-wrap gap-2 items-center">
            {/* Select Modo de Exibição */}
            <Select value={displayMode} onValueChange={(v) => setDisplayMode(v as DisplayMode)}>
              <SelectTrigger className="h-8 w-[130px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="regions">
                  <div className="flex items-center gap-2">
                    <Layers className="h-3 w-3" />
                    <span>Regiões</span>
                  </div>
                </SelectItem>
                <SelectItem value="muscles">
                  <div className="flex items-center gap-2">
                    <Layers className="h-3 w-3" />
                    <span>Músculos</span>
                  </div>
                </SelectItem>
                <SelectItem value="combined">
                  <div className="flex items-center gap-2">
                    <Layers className="h-3 w-3" />
                    <span>Combinado</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Select Filtro */}
            <Select value={filterType} onValueChange={(v) => setFilterType(v as FilterType)}>
              <SelectTrigger className="h-8 w-[140px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="high-intensity">Alta Intensidade</SelectItem>
                <SelectItem value="chronic">Crônico</SelectItem>
                <SelectItem value="muscle-specific">Músculos Específicos</SelectItem>
              </SelectContent>
            </Select>

            {/* Select Ordenação */}
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
              <SelectTrigger className="h-8 w-[140px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="intensity-desc">Maior Intensidade</SelectItem>
                <SelectItem value="intensity-asc">Menor Intensidade</SelectItem>
                <SelectItem value="region">Por Região</SelectItem>
                <SelectItem value="recent">Mais Recente</SelectItem>
              </SelectContent>
            </Select>

            {/* Toggle Labels */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn('h-8 px-3', showLabels ? 'bg-primary/10' : '')}
                  onClick={() => setShowLabels(!showLabels)}
                >
                  <Info className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {showLabels ? 'Esconder labels' : 'Mostrar labels'}
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Estatísticas e Ações */}
          <div className="flex flex-wrap gap-2 items-center">
            {/* Badges de estatísticas */}
            <div className="flex gap-1">
              <Badge variant="outline" className="text-xs">
                {processedPoints.length}/{points.length}
              </Badge>
              {globalStats.avgIntensity > 0 && (
                <Badge
                  variant="outline"
                  className="text-xs font-semibold"
                  style={{
                    borderColor: getIntensityColor(Math.round(globalStats.avgIntensity)),
                    color: getIntensityColor(Math.round(globalStats.avgIntensity)),
                  }}
                >
                  Média: {globalStats.avgIntensity}
                </Badge>
              )}
              {globalStats.highIntensityCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  <Zap className="h-3 w-3 mr-1" />
                  {globalStats.highIntensityCount}
                </Badge>
              )}
            </div>

            {/* Botão Fullscreen */}
            {showFullscreenToggle && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3"
                    onClick={toggleFullscreen}
                  >
                    {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {/* SVG do corpo anatômico */}
        <svg
          ref={svgRef}
          viewBox="0 0 100 115"
          className={cn(
            'w-full h-full cursor-crosshair transition-all duration-300',
            'bg-gradient-to-b from-slate-50 via-white to-slate-100',
            'dark:from-slate-900 dark:via-slate-800 dark:to-slate-900'
          )}
          onClick={handleMapClick}
        >
          {/* Silhueta do corpo */}
          <g fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.1">
            <path d="
              M 50 4
              C 56 4 60 8 60 12
              C 60 16 56 20 50 20
              C 44 20 40 16 40 12
              C 40 8 44 4 50 4
              M 50 20 L 50 26
              M 40 20 Q 38 22 34 18 L 26 20 L 22 36 L 18 50 L 14 56
              M 60 20 Q 62 22 66 18 L 74 20 L 78 36 L 82 50 L 86 56
              M 40 20 L 40 50 L 36 52 L 36 92 L 44 112
              M 60 20 L 60 50 L 64 52 L 64 92 L 56 112
              M 40 50 L 60 50
              M 40 62 L 60 62
              M 36 72 L 64 72
            " />
          </g>

          {/* Regiões musculares */}
          {musclePaths.map(region => {
            const isHovered = hoveredRegion === region.code;
            const stats = regionStats.get(region.code);
            const hasPain = stats && stats.count > 0;
            const maxIntensity = stats?.maxIntensity || 0;

            return (
              <g key={region.code}>
                {/* Caminho do músculo */}
                <path
                  d={region.d}
                  fill={hasPain ? getIntensityColorWithAlpha(maxIntensity, 0.25) : 'transparent'}
                  stroke={
                    isHovered ? 'rgb(59, 130, 246)' :
                    hasPain ? getIntensityColor(maxIntensity) :
                    'rgb(203, 213, 225)'
                  }
                  strokeWidth={isHovered ? 2 : hasPain ? 1.2 : 0.6}
                  className={cn(
                    'transition-all duration-300 cursor-pointer',
                    isHovered && 'filter drop-shadow-lg',
                    hasPain && 'opacity-90'
                  )}
                  onMouseEnter={() => setHoveredRegion(region.code)}
                  onMouseLeave={() => setHoveredRegion(null)}
                />

                {/* Glow para hover */}
                {isHovered && (
                  <path
                    d={region.d}
                    fill="rgb(59, 130, 246)"
                    opacity="0.1"
                    className="pointer-events-none"
                  />
                )}

                {/* Label da região */}
                {showLabels && (
                  <text
                    x={region.x}
                    y={region.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={isHovered ? '3.5' : '2.5'}
                    fontWeight={hasPain ? '600' : '400'}
                    fill={isHovered ? 'rgb(59, 130, 246)' : hasPain ? getIntensityColor(maxIntensity) : 'rgb(100, 116, 139)'}
                    className="pointer-events-none select-none transition-all duration-200"
                    style={{
                      textShadow: '0 1px 2px rgba(255,255,255,0.8)',
                    }}
                  >
                    {region.name}
                  </text>
                )}

                {/* Indicador de pontos */}
                {stats && stats.count > 0 && (
                  <g className="pointer-events-none">
                    <circle
                      cx={region.x + 4}
                      cy={region.y - 4}
                      r={2.5 + stats.count * 0.3}
                      fill={getIntensityColor(maxIntensity)}
                      opacity="0.9"
                      className="animate-pulse"
                    />
                    {stats.count > 1 && (
                      <text
                        x={region.x + 4}
                        y={region.y - 4}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize="2.5"
                        fontWeight="bold"
                        fill="white"
                        className="select-none"
                      >
                        {stats.count}
                      </text>
                    )}
                  </g>
                )}

                {/* Indicador de músculo específico */}
                {stats?.hasMuscleSpecific && (
                  <circle
                    cx={region.x - 4}
                    cy={region.y + 4}
                    r="2"
                    fill="none"
                    stroke="rgb(59, 130, 246)"
                    strokeWidth="1"
                    className="pointer-events-none"
                  />
                )}
              </g>
            );
          })}

          {/* Pontos de dor */}
          {processedPoints.map((point, index) => {
            const isSelected = selectedPoint === point.id;
            const color = getIntensityColor(point.intensity);
            const painData = PAIN_TYPE_DATA[point.painType];
            const radius = isSelected ? 4 : 3;
            const animationDelay = `${index * 50}ms`;

            return (
              <g key={point.id} className="pain-point-group" style={{ animationDelay }}>
                {/* Animação de entrada */}
                <animate
                  attributeName="opacity"
                  from="0"
                  to="1"
                  dur="0.3s"
                  fill="freeze"
                  begin={animationDelay}
                />

                {/* Glow Effect expandido */}
                {point.intensity >= 7 && (
                  <>
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={radius * 4}
                      fill={color}
                      opacity="0.1"
                      className="pointer-events-none animate-pulse"
                    />
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={radius * 2.5}
                      fill={color}
                      opacity="0.2"
                      className="pointer-events-none animate-pulse"
                      style={{ animationDelay: '0.5s' }}
                    />
                  </>
                )}

                {/* Glow normal */}
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={radius + 1.5}
                  fill={color}
                  opacity="0.3"
                  className="pointer-events-none"
                />

                {/* Círculo principal */}
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={radius}
                  fill={getIntensityBg(point.intensity)}
                  stroke={color}
                  strokeWidth={isSelected ? 2 : 1.5}
                  className={cn(
                    'cursor-pointer transition-all duration-200',
                    'hover:scale-125',
                    isSelected && 'ring-2 ring-offset-2 ring-offset-background ring-primary'
                  )}
                  style={{ filter: `drop-shadow(0 0 3px ${color}80)` }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPoint(isSelected ? null : point.id);
                  }}
                />

                {/* Ícone do tipo de dor */}
                <text
                  x={point.x}
                  y={point.y + 0.3}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="2.5"
                  className="pointer-events-none select-none"
                  style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}
                >
                  {painData.icon}
                </text>

                {/* Indicador de músculo específico */}
                {point.muscleCode && (
                  <circle
                    cx={point.x + 2.5}
                    cy={point.y - 2.5}
                    r="1.8"
                    fill="rgb(59, 130, 246)"
                    className="pointer-events-none"
                    opacity="0.8"
                  />
                )}
              </g>
            );
          })}
        </svg>

        {/* Tooltip da região */}
        {hoveredRegion && (
          <div className="absolute bottom-20 left-2 z-30">
            <div className="bg-background/95 backdrop-blur-sm px-4 py-3 rounded-xl shadow-xl border">
              {(() => {
                const region = musclePaths.find(r => r.code === hoveredRegion);
                const stats = regionStats.get(hoveredRegion);
                if (!region) return null;

                return (
                  <div className="space-y-2">
                    <div className="font-semibold text-sm">{region.name}</div>
                    {stats && stats.count > 0 && (
                      <>
                        <div className="text-xs text-muted-foreground">
                          {stats.count} ponto{stats.count !== 1 ? 's' : ''}
                        </div>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                            style={{
                              backgroundColor: getIntensityBg(stats.maxIntensity),
                              color: getIntensityColor(stats.maxIntensity),
                              border: `1px solid ${getIntensityColor(stats.maxIntensity)}`,
                            }}
                          >
                            {stats.avgIntensity.toFixed(1)}
                          </div>
                          {stats.hasMuscleSpecific && (
                            <span className="text-xs text-primary">💪 Específico</span>
                          )}
                        </div>
                        <div className="flex gap-1 flex-wrap">
                          {Array.from(stats.types).map(type => (
                            <Badge
                              key={type}
                              variant="outline"
                              className="text-[10px] h-5"
                              style={{ borderColor: PAIN_TYPE_DATA[type]?.color }}
                            >
                              {PAIN_TYPE_DATA[type]?.icon} {PAIN_TYPE_DATA[type]?.label}
                            </Badge>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* Painel do ponto selecionado */}
        {selectedPoint && !readOnly && (
          <div className="absolute bottom-2 right-2 z-30 w-[280px]">
            {(() => {
              const point = points.find(p => p.id === selectedPoint);
              if (!point) return null;
              const color = getIntensityColor(point.intensity);
              const painData = PAIN_TYPE_DATA[point.painType];

              return (
                <div className="bg-background/95 backdrop-blur-md rounded-xl shadow-2xl border p-4 animate-in slide-in-from-bottom-4">
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-semibold text-base">{point.region}</div>
                        {point.muscleName && (
                          <div className="text-sm text-primary font-medium flex items-center gap-1">
                            💪 {point.muscleName}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => setSelectedPoint(null)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Intensidade */}
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg border-2"
                        style={{
                          backgroundColor: getIntensityBg(point.intensity),
                          color: color,
                          borderColor: color,
                        }}
                      >
                        {point.intensity}
                      </div>
                      <div className="flex-1">
                        <div className="text-xs text-muted-foreground">Intensidade</div>
                        <div className="font-semibold" style={{ color }}>{getIntensityLabel(point.intensity)}</div>
                      </div>
                    </div>

                    {/* Tipo */}
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="flex-1 justify-center py-2"
                        style={{ borderColor: painData.color, color: painData.color }}
                      >
                        {painData.icon} {painData.label}
                      </Badge>
                    </div>

                    {/* Notas */}
                    {point.notes && (
                      <div className="text-sm bg-muted/50 rounded-lg p-3">
                        <div className="text-xs text-muted-foreground mb-1">Observações:</div>
                        <div className="line-clamp-3">{point.notes}</div>
                      </div>
                    )}

                    {/* Data */}
                    {point.date && (
                      <div className="text-xs text-muted-foreground">
                        Registrado em {new Date(point.date).toLocaleString('pt-BR')}
                      </div>
                    )}

                    {/* Ações */}
                    <div className="flex gap-2 pt-2 border-t">
                      <button
                        onClick={() => handlePointUpdate(point)}
                        className="flex-1 text-xs bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:opacity-90 transition-opacity font-medium"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handlePointRemove(point.id)}
                        className="flex-1 text-xs bg-destructive text-destructive-foreground px-4 py-2 rounded-lg hover:opacity-90 transition-opacity font-medium"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Legenda */}
        <div className="absolute bottom-2 left-2 z-20">
          <div className="bg-background/90 backdrop-blur-sm px-4 py-3 rounded-xl shadow-lg border">
            <div className="font-semibold text-xs mb-3 text-center">
              {view === 'front' ? 'VISTA FRONTAL' : 'VISTA POSTERIOR'}
            </div>
            <div className="space-y-2">
              {[0, 2, 4, 6, 8, 10].map(level => (
                <div key={level} className="flex items-center gap-2">
                  <div
                    className="w-5 h-5 rounded-full border-2"
                    style={{
                      backgroundColor: getIntensityBg(level),
                      borderColor: getIntensityColor(level),
                    }}
                  />
                  <span className="text-xs font-medium" style={{ color: getIntensityColor(level) }}>
                    {level === 0 ? 'Sem dor' : `${level} - ${getIntensityLabel(level)}`}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t flex flex-col gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                <span>= Músculo específico</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg">💥</span>
                <span>= Clique para editar/remover</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal de seleção de músculos */}
        {pendingRegion && (
          <MuscleSelectorModal
            regionCode={pendingRegion.code}
            regionName={pendingRegion.name}
            view={view}
            isOpen={muscleModalOpen}
            onClose={() => {
              setMuscleModalOpen(false);
              setPendingRegion(null);
            }}
            onSelect={handleMuscleSelect}
            onSkip={handleMuscleSkip}
          />
        )}
      </div>
    </TooltipProvider>
  );
}

export default BodyMapAnatomical;
