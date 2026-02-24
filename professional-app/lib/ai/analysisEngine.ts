/**
 * Analysis Engine - Motor de Análise Biomecânica (Mobile)
 * 
 * Portado e adaptado do Web App.
 * Calcula ângulos, detecta problemas posturais e gera métricas.
 */

import {
  PoseLandmark,
  PoseDetection,
  AnalysisResult,
  PostureIssue,
  SeverityLevel,
  PostureIssueType,
  MainJoint,
  ExerciseType,
  ExerciseTemplate,
  getExerciseTemplate,
  RomData,
  ExerciseMetrics,
} from '../../types/pose';
import { calculateAngle } from './geometry';

const DEFAULT_CONFIG = {
  visibilityThreshold: 0.5,
  smoothingFactor: 0.7,
  instabilityThreshold: 15,
};

export class AnalysisEngine {
  private previousLandmarks: PoseLandmark[] = [];
  private frameCount: number = 0;
  private angleHistory: Map<string, number[]> = new Map();
  private analysisStartTime: number = Date.now();
  private exerciseType: ExerciseType;
  private exerciseTemplate: ExerciseTemplate;
  private isActive: boolean = false;

  constructor(exerciseType: ExerciseType = ExerciseType.SQUAT) {
    this.exerciseType = exerciseType;
    this.exerciseTemplate = getExerciseTemplate(exerciseType);
  }

  public setExerciseType(type: ExerciseType) {
    this.exerciseType = type;
    this.exerciseTemplate = getExerciseTemplate(type);
    this.reset();
  }

  public start() {
    this.isActive = true;
    this.reset();
  }

  public stop() {
    this.isActive = false;
  }

  public reset() {
    this.previousLandmarks = [];
    this.frameCount = 0;
    this.angleHistory.clear();
    this.analysisStartTime = Date.now();
  }

  public processFrame(poseDetection: PoseDetection): AnalysisResult {
    if (!this.isActive || !poseDetection.landmarks || poseDetection.landmarks.length === 0) {
      return this.createEmptyResult();
    }

    this.frameCount++;

    // Suavizar landmarks
    const smoothedLandmarks = this.smoothLandmarks(poseDetection.landmarks);

    // Calcular ângulos
    const jointAnglesMap = this.calculateJointAngles(smoothedLandmarks);

    // Detectar problemas posturais
    const postureIssues = this.detectPostureIssues(smoothedLandmarks, jointAnglesMap);

    // Calcular score de forma
    const formScore = this.calculateFormScore(jointAnglesMap, postureIssues);

    // Detectar orientação
    const orientation = this.detectOrientation(smoothedLandmarks);

    // Calcular estabilidade
    const stabilityScore = this.calculateStability(jointAnglesMap);

    // Calcular ROM
    const romData = this.calculateRangeOfMotion(jointAnglesMap);

    // Atualizar estado
    this.updateState(smoothedLandmarks, jointAnglesMap);

    return {
      pose: poseDetection,
      jointAngles: jointAnglesMap,
      postureIssues,
      repCount: 0, // Gerenciado por contador externo
      repetitions: [],
      metrics: {
        formScore,
        stabilityScore,
        rangeOfMotion: romData.rom,
        romPercentage: romData.percentageOfNormal,
        repetitions: 0,
        avgAngles: {},
        duration: (Date.now() - this.analysisStartTime) / 1000,
        avgFps: 0,
      },
      timestamp: Date.now(),
    };
  }

  private smoothLandmarks(landmarks: PoseLandmark[]): PoseLandmark[] {
    if (this.previousLandmarks.length === 0) {
      this.previousLandmarks = landmarks;
      return landmarks;
    }

    return landmarks.map((lm, index) => {
      const prev = this.previousLandmarks[index];
      if (!prev) return lm;

      return {
        x: lm.x * (1 - DEFAULT_CONFIG.smoothingFactor) + prev.x * DEFAULT_CONFIG.smoothingFactor,
        y: lm.y * (1 - DEFAULT_CONFIG.smoothingFactor) + prev.y * DEFAULT_CONFIG.smoothingFactor,
        z: lm.z !== undefined && prev.z !== undefined 
           ? lm.z * (1 - DEFAULT_CONFIG.smoothingFactor) + prev.z * DEFAULT_CONFIG.smoothingFactor 
           : lm.z,
        visibility: lm.visibility * (1 - DEFAULT_CONFIG.smoothingFactor) + prev.visibility * DEFAULT_CONFIG.smoothingFactor,
      };
    });
  }

  private calculateJointAngles(landmarks: PoseLandmark[]): Map<MainJoint, any> {
    const angles = new Map<MainJoint, any>();

    for (const triad of this.exerciseTemplate.angleTriads || []) {
      const pivot = landmarks[triad.pivot];
      const a = landmarks[triad.a];
      const b = landmarks[triad.b];

      if (pivot && a && b &&
          pivot.visibility > DEFAULT_CONFIG.visibilityThreshold &&
          a.visibility > DEFAULT_CONFIG.visibilityThreshold &&
          b.visibility > DEFAULT_CONFIG.visibilityThreshold) {

        const angle = calculateAngle(a, pivot, b);
        const jointName = this.getJointNameByPivot(triad.pivot);

        angles.set(jointName, {
          current: angle,
          min: Math.min(angle, this.getMinFromHistory(triad.pivot)),
          max: Math.max(angle, this.getMaxFromHistory(triad.pivot)),
          average: angle, // Placeholder
          target: this.exerciseTemplate.thresholds[triad.pivot.toString()] || { min: 0, max: 180 },
          inRange: true, // Placeholder
          pivotIndex: triad.pivot,
        });
      }
    }

    return angles;
  }

  private detectPostureIssues(landmarks: PoseLandmark[], angles: Map<MainJoint, any>): PostureIssue[] {
    const issues: PostureIssue[] = [];
    
    // Alinhamento cabeça-ombros
    const nose = landmarks[0];
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];

    if (nose && leftShoulder && rightShoulder) {
      const midShoulderX = (leftShoulder.x + rightShoulder.x) / 2;
      const offset = Math.abs(nose.x - midShoulderX);
      if (offset > 0.08) {
        issues.push({
          type: PostureIssueType.HEAD_FORWARD,
          severity: SeverityLevel.MODERATE,
          description: 'Cabeça desalinhada',
          suggestion: 'Mantenha o olhar para frente',
          scoreImpact: 15
        });
      }
    }

    // Assimetria de ombros
    if (leftShoulder && rightShoulder) {
      if (Math.abs(leftShoulder.y - rightShoulder.y) > 0.05) {
        issues.push({
          type: PostureIssueType.SHOULDERS_ASYMMETRICAL,
          severity: SeverityLevel.MILD,
          description: 'Ombros desalinhados',
          suggestion: 'Tente nivelar os ombros',
          scoreImpact: 5
        });
      }
    }

    return issues;
  }

  private calculateFormScore(angles: Map<MainJoint, any>, issues: PostureIssue[]): number {
    let score = 100;
    for (const issue of issues) {
      score -= issue.scoreImpact;
    }
    return Math.max(0, score);
  }

  private calculateStability(angles: Map<MainJoint, any>): number {
    return 100; // Simplificado para mobile
  }

  private calculateRangeOfMotion(angles: Map<MainJoint, any>): any {
    return { rom: 0, percentageOfNormal: 0 }; // Simplificado
  }

  private updateState(landmarks: PoseLandmark[], angles: Map<MainJoint, any>) {
    this.previousLandmarks = [...landmarks];
    // Atualizar histórico...
  }

  private detectOrientation(landmarks: PoseLandmark[]): 'FRONT' | 'SIDE_LEFT' | 'SIDE_RIGHT' | 'BACK' {
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    const nose = landmarks[0];

    if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) return 'FRONT';

    const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x);
    const trunkHeight = Math.abs((leftShoulder.y + rightShoulder.y) / 2 - (leftHip.y + rightHip.y) / 2);
    const ratio = shoulderWidth / trunkHeight;

    if (ratio < 0.25) {
      if (nose && nose.x < leftShoulder.x) return 'SIDE_LEFT';
      return 'SIDE_RIGHT';
    }

    if (nose && nose.z !== undefined && leftShoulder.z !== undefined) {
       if (nose.z > leftShoulder.z) return 'BACK';
    }

    return 'FRONT';
  }

  private getMinFromHistory(pivot: number): number { return 180; }
  private getMaxFromHistory(pivot: number): number { return 0; }

  private getJointNameByPivot(pivot: number): MainJoint {
    if (pivot === 23) return MainJoint.LEFT_HIP;
    if (pivot === 24) return MainJoint.RIGHT_HIP;
    if (pivot === 25) return MainJoint.LEFT_KNEE;
    if (pivot === 26) return MainJoint.RIGHT_KNEE;
    return MainJoint.LEFT_KNEE; // Default
  }

  private createEmptyResult(): AnalysisResult {
    return {
      pose: { landmarks: [], confidence: 0, timestamp: Date.now(), analysisType: 'form' as any },
      jointAngles: new Map(),
      postureIssues: [],
      repCount: 0,
      repetitions: [],
      metrics: { formScore: 0, stabilityScore: 0, rangeOfMotion: 0, romPercentage: 0, repetitions: 0, avgAngles: {}, duration: 0, avgFps: 0 },
      timestamp: Date.now(),
    };
  }
}
