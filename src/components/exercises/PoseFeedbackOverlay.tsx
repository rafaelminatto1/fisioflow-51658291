/**
 * PoseFeedbackOverlay - Overlay Visual de Detecção de Pose
 *
 * Este componente visualiza o esqueleto do usuário em tempo real,
 * mostrando ângulos de articulações e feedback visual de forma.
 */

import React, { useRef, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  PoseLandmark,
  POSE_LANDMARKS,
  MainJoint,
  getAngleTriad,
  getJointNamePT,
} from '@/types/pose';
import { fisioLogger as logger } from '@/lib/errors/logger';

// ============================================================================
// TIPOS
// ============================================================================

export interface PoseFeedbackOverlayProps {
  /** Landmarks detectados (33 pontos) */
  landmarks: PoseLandmark[];
  /** Ângulos das articulações calculados */
  jointAngles?: Record<string, any>;
  /** Largura do canvas */
  width?: number;
  /** Altura do canvas */
  height?: number;
  /** Mostrar esqueleto */
  showSkeleton?: boolean;
  /** Mostrar ângulos */
  showAngles?: boolean;
  /** Mostrar conexões */
  showConnections?: boolean;
  /** Modo simplificado (menos detalhes) */
  simpleMode?: boolean;
  /** Cor de destaque */
  highlightColor?: string;
  /** Opacidade do overlay */
  opacity?: number;
  /** Callback para mudança de pose */
  onPoseChange?: (landmarks: PoseLandmark[]) => void;
}

/**
 * Conexões padrão do esqueleto (MediaPipe)
 */
const POSE_CONNECTIONS: [number, number][] = [
  // Rosto
  [0, 1], [1, 2], [2, 3], [3, 7], [0, 4], [4, 5], [5, 6], [6, 8],
  // Torso
  [11, 12], [11, 23], [12, 24], [23, 24],
  // Braço esquerdo
  [11, 13], [13, 15], [15, 17], [15, 19], [17, 21], [15, 21],
  // Braço direito
  [12, 14], [14, 16], [16, 18], [16, 20], [16, 22], [16, 22],
  // Perna esquerda
  [23, 25], [25, 27], [27, 29], [27, 31], [23, 25],
  // Perna direita
  [24, 26], [26, 28], [28, 30], [28, 32], [24, 26],
  // Pés
  [29, 31], [30, 32], [31, 32], [27, 28], [28, 30],
];

/**
 * Articulações principais para mostrar ângulos
 */
const MAIN_JOINTS: MainJoint[] = [
  MainJoint.LEFT_ELBOW,
  MainJoint.RIGHT_ELBOW,
  MainJoint.LEFT_KNEE,
  MainJoint.RIGHT_KNEE,
  MainJoint.LEFT_SHOULDER,
  MainJoint.RIGHT_SHOULDER,
  MainJoint.LEFT_HIP,
  MainJoint.RIGHT_HIP,
  MainJoint.LEFT_ANKLE,
  MainJoint.RIGHT_ANKLE,
  MainJoint.LEFT_WRIST,
  MainJoint.RIGHT_WRIST,
];

/**
 * Índices para separar lado esquerdo/direito
 */
const LEFT_SIDE_INDICES = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, // Rosto
  11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 33, // Corpo esquerdo
];

const RIGHT_SIDE_INDICES = [
  4, 5, 6, 7, 8, 9, 10, // Rosto
  12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, // Corpo direito
];

// ============================================================================
// COMPONENTE
// ============================================================================

export const PoseFeedbackOverlay: React.FC<PoseFeedbackOverlayProps> = ({
  landmarks,
  jointAngles = {},
  width = 640,
  height = 480,
  showSkeleton = true,
  showAngles = true,
  showConnections = true,
  simpleMode = false,
  highlightColor = '#3b82f6',
  opacity = 1,
  onPoseChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

  // Notificar mudança de pose
  useEffect(() => {
    if (onPoseChange && landmarks.length > 0) {
      onPoseChange(landmarks);
    }
  }, [landmarks, onPoseChange]);

  // Configurar contexto do canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctxRef.current = ctx;

    // Ajustar para retina
    const dpr = window.devicePixelRatio || 1;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
  }, [width, height]);

  // Desenhar
  useEffect(() => {
    if (!canvasRef.current || !ctxRef.current) return;

    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (landmarks.length === 0) {
      drawEmptyState(ctx, canvas.width, canvas.height);
      return;
    }

    // Desenhar conexões
    if (showConnections) {
      drawConnections(ctx, landmarks, canvas.width, canvas.height);
    }

    // Desenhar landmarks
    drawLandmarks(ctx, landmarks, canvas.width, canvas.height);

    // Desenhar ângulos
    if (showAngles) {
      drawAngles(ctx, landmarks, jointAngles, canvas.width, canvas.height);
    }
  }, [
    landmarks,
    jointAngles,
    showSkeleton,
    showConnections,
    showAngles,
    width,
    height,
  ]);

  /**
   * Desenhar estado vazio
   */
  const drawEmptyState = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number
  ) => {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.03)';
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = 'rgba(156, 163, 175, 0.5)';
    ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Aguardando detecção de pose...', w / 2, h / 2);
    ctx.restore();
  };

  /**
   * Desenhar conexões do esqueleto
   */
  const drawConnections = (
    ctx: CanvasRenderingContext2D,
    lm: PoseLandmark[],
    w: number,
    h: number
  ) => {
    if (!showConnections) return;

    ctx.save();
    ctx.lineWidth = simpleMode ? 3 : 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const [from, to] of POSE_CONNECTIONS) {
      const fromLm = lm[from];
      const toLm = lm[to];

      if (!fromLm || !toLm) continue;

      // Verificar visibilidade
      const fromVis = fromLm.visibility || 0;
      const toVis = toLm.visibility || 0;

      if (fromVis < 0.3 || toVis < 0.3) continue;

      // Determinar cor baseada no lado
      const color = LEFT_SIDE_INDICES.includes(from)
        ? '#10b981' // Verde para lado esquerdo
        : '#ef4444'; // Vermelho para lado direito

      // Opacidade baseada na visibilidade
      ctx.strokeStyle = color;
      ctx.globalAlpha = Math.min(fromVis, toVis) * opacity;

      ctx.beginPath();
      ctx.moveTo(fromLm.x * w, fromLm.y * h);
      ctx.lineTo(toLm.x * w, toLm.y * h);
      ctx.stroke();
    }

    ctx.restore();
  };

  /**
   * Desenhar landmarks (pontos das articulações)
   */
  const drawLandmarks = (
    ctx: CanvasRenderingContext2D,
    lm: PoseLandmark[],
    w: number,
    h: number
  ) => {
    if (!showSkeleton) return;

    ctx.save();

    for (let i = 0; i < lm.length; i++) {
      const landmark = lm[i];

      if (!landmark || (landmark.visibility || 0) < 0.3) continue;

      const x = landmark.x * w;
      const y = landmark.y * h;
      const isLeftSide = LEFT_SIDE_INDICES.includes(i);

      // Raio baseado na visibilidade
      const radius = simpleMode ? 4 : Math.max(3, (landmark.visibility || 0) * 6);

      // Cor do ponto
      const color = isLeftSide
        ? '#10b981' // Verde
        : '#ef4444'; // Vermelho

      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.globalAlpha = (landmark.visibility || 0) * opacity;
      ctx.fill();

      // Círculo branco interno
      ctx.beginPath();
      ctx.arc(x, y, radius * 0.5, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.fill();

      // Índice (apenas em modo detalhado)
      if (!simpleMode && i >= 11 && i <= 24) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(i.toString(), x, y - radius - 2);
      }
    }

    ctx.restore();
  };

  /**
   * Desenhar ângulos nas articulações
   */
  const drawAngles = (
    ctx: CanvasRenderingContext2D,
    lm: PoseLandmark[],
    angles: Record<string, any>,
    w: number,
    h: number
  ) => {
    if (!showAngles) return;

    ctx.save();

    for (const joint of MAIN_JOINTS) {
      const angleData = angles[joint];
      if (!angleData) continue;

      const { current, target, inRange } = angleData;

      if (typeof current !== 'number') continue;

      // Obter triângulo para desenhar
      const triad = getAngleTriad(joint);
      if (!triad) continue;

      const pivotLm = lm[triad.pivot];
      const aLm = lm[triad.a];
      const bLm = lm[triad.b];

      if (!pivotLm || !aLm || !bLm) continue;

      const pivotX = pivotLm.x * w;
      const pivotY = pivotLm.y * h;
      const aX = aLm.x * w;
      const aY = aLm.y * h;
      const bX = bLm.x * w;
      const bY = bLm.y * h;

      // Desenhar linha do ângulo
      ctx.beginPath();
      ctx.moveTo(aX, aY);
      ctx.lineTo(bX, bY);
      ctx.strokeStyle = inRange ? '#22c55e' : '#ef4444';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Desenhar arco do ângulo
      const startAngle = Math.atan2(aY - pivotY, aX - pivotX);
      const endAngle = Math.atan2(bY - pivotY, bX - pivotX);

      ctx.beginPath();
      ctx.arc(pivotX, pivotY, 30, startAngle, endAngle);
      ctx.strokeStyle = inRange ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Texto do ângulo
      const text = `${Math.round(current)}°`;
      ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = inRange ? '#22c55e' : '#ef4444';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(text, pivotX, pivotY - 10);
    }

    ctx.restore();
  };

  /**
   * Desenhar zona de movimento (ROM)
   */
  const drawMovementZone = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    joints: MainJoint[]
  ) => {
    if (!showSkeleton || simpleMode) return;

    ctx.save();
    ctx.fillStyle = 'rgba(59, 130, 246, 0.05)';
    ctx.fillRect(0, 0, w, h);

    // Desenhar linhas guia para zona de movimento
    for (const joint of joints) {
      const angleData = jointAngles[joint];
      if (!angleData || typeof angleData.current !== 'number') continue;

      const triad = getAngleTriad(joint);
      if (!triad) continue;

      const pivotLm = landmarks[triad.pivot];
      if (!pivotLm) continue;

      const pivotX = pivotLm.x * w;
      const pivotY = pivotLm.y * h;

      // Desenhar círculo de referência
      ctx.beginPath();
      ctx.arc(pivotX, pivotY, 40, 0, 2 * Math.PI);
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.2)';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.stroke();

      // Desenhar posição alvo (ângulo 90°)
      const targetX = pivotX + Math.cos(Math.PI / 4) * 35;
      const targetY = pivotY + Math.sin(Math.PI / 4) * 35;

      ctx.beginPath();
      ctx.arc(targetX, targetY, 5, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(59, 130, 246, 0.3)';
      ctx.fill();
    }

    ctx.restore();
  };

  return (
    <Card className="overflow-hidden bg-transparent border-0 shadow-none">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className={cn(
          'w-full h-full object-contain',
          opacity
        )}
        style={{
          width,
          height,
        }}
      />
    </Card>
  );
};

/**
 * Versão simplificada do overlay para demonstrações
 */
export const PoseFeedbackOverlaySimple: React.FC<PoseFeedbackOverlayProps> = (props) => {
  return (
    <PoseFeedbackOverlay
      {...props}
      simpleMode={true}
      showAngles={false}
      showConnections={true}
    />
  );
};

export default PoseFeedbackOverlay;
