/**
 * Pose Analyzer using MediaPipe for movement analysis
 * Supports posture analysis, repetition counting, and range of motion measurement
 */

import '@mediapipe/pose';
import { Pose } from '@mediapipe/pose';
import { Camera } from '@mediapipe/camera_utils';

export type AnalysisType = 'posture' | 'repetition' | 'range';

export interface AnalysisResult {
  type: AnalysisType;
  score: number;
  feedback: string[];
  repCount?: number;
  postureIssues?: PostureIssue[];
  rangeOfMotion?: RangeOfMotionResult;
  frames: AnalyzedFrame[];
}

export interface PostureIssue {
  type: 'head_forward' | 'rounded_shoulders' | 'uneven_hips' | 'kyphosis' | 'lordosis';
  severity: 'mild' | 'moderate' | 'severe';
  description: string;
}

export interface RangeOfMotionResult {
  joint: string;
  maxAngle: number;
  minAngle: number;
  range: number;
  expected: { min: number; max: number };
}

export interface AnalyzedFrame {
  timestamp: number;
  landmarks: any[];
  repCount?: number;
  angle?: number;
}

export class PoseAnalyzer {
  private pose: Pose | null = null;
  private camera: Camera | null = null;
  private resultsCallback: ((result: any) => void) | null = null;
  private analysisType: AnalysisType = 'posture';
  private repCount = 0;
  private lastPhase: 'up' | 'down' | null = null;
  private maxAngle = -Infinity;
  private minAngle = Infinity;
  private frames: AnalyzedFrame[] = [];
  private startTime = 0;

  async initialize() {
    this.pose = new Pose({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
      },
    });

    this.pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    this.pose.onResults(this.onResults.bind(this));
  }

  async startAnalysis(
    videoElement: any,
    callback: (result: Partial<AnalysisResult>) => void,
    type: AnalysisType = 'posture'
  ) {
    this.resultsCallback = callback;
    this.analysisType = type;
    this.startTime = Date.now();
    this.frames = [];

    if (type === 'repetition') {
      this.repCount = 0;
      this.lastPhase = null;
    } else if (type === 'range') {
      this.maxAngle = -Infinity;
      this.minAngle = Infinity;
    }

    this.camera = new Camera(videoElement, {
      onFrame: async () => {
        if (this.pose && videoElement) {
          await this.pose.send({ image: videoElement });
        }
      },
      width: 640,
      height: 480,
    });

    await this.camera.start();
  }

  async stopAnalysis(): Promise<AnalysisResult | null> {
    if (this.camera) {
      await this.camera.stop();
    }

    const result = this.generateFinalResult();
    this.cleanup();
    return result;
  }

  private onResults(results: any) {
    if (!results.poseLandmarks) return;

    const timestamp = Date.now() - this.startTime;
    const landmarks = results.poseLandmarks;

    // Store frame
    this.frames.push({ timestamp, landmarks });

    // Process based on analysis type
    if (this.analysisType === 'repetition') {
      this.processRepetitionFrame(landmarks);
    } else if (this.analysisType === 'range') {
      this.processRangeFrame(landmarks);
    } else if (this.analysisType === 'posture') {
      this.processPostureFrame(landmarks);
    }
  }

  private processRepetitionFrame(landmarks: any[]) {
    // Calculate hip y position (landmark 24)
    const leftHip = landmarks[24];
    const rightHip = landmarks[23];
    const hipY = (leftHip.y + rightHip.y) / 2;

    // Determine phase based on hip position
    const currentPhase = hipY < 0.5 ? 'up' : 'down';

    // Count rep when transitioning from up to down
    if (currentPhase === 'down' && this.lastPhase === 'up') {
      this.repCount++;
      this.lastPhase = 'down';

      if (this.resultsCallback) {
        this.resultsCallback({ repCount: this.repCount });
      }
    } else if (currentPhase === 'up' && this.lastPhase === 'down') {
      this.lastPhase = 'up';
    }
  }

  private processRangeFrame(landmarks: any[]) {
    // Calculate knee angle for squat analysis
    const leftHip = landmarks[23];
    const leftKnee = landmarks[25];
    const leftAnkle = landmarks[27];

    const angle = this.calculateAngle(leftHip, leftKnee, leftAnkle);
    this.maxAngle = Math.max(this.maxAngle, angle);
    this.minAngle = Math.min(this.minAngle, angle);

    if (this.resultsCallback) {
      this.resultsCallback({
        angle,
        range: this.maxAngle - this.minAngle,
      });
    }
  }

  private processPostureFrame(landmarks: any[]) {
    const issues: PostureIssue[] = [];

    // Check head forward posture
    const nose = landmarks[0];
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const shoulderX = (leftShoulder.x + rightShoulder.x) / 2;

    if (nose.x < shoulderX - 0.05 || nose.x > shoulderX + 0.05) {
      issues.push({
        type: 'head_forward',
        severity: 'moderate',
        description: 'Cabeça posicionada à frente dos ombros',
      });
    }

    // Check shoulder level
    if (Math.abs(leftShoulder.y - rightShoulder.y) > 0.05) {
      issues.push({
        type: 'rounded_shoulders',
        severity: 'mild',
        description: 'Ombros assimétricos',
      });
    }

    // Check hip level
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    if (Math.abs(leftHip.y - rightHip.y) > 0.05) {
      issues.push({
        type: 'uneven_hips',
        severity: 'mild',
        description: 'Quadris assimétricos',
      });
    }
  }

  private calculateAngle(p1: any, p2: any, p3: any): number {
    const radians = Math.atan2(p3.y - p2.y, p3.x - p2.x) -
                   Math.atan2(p1.y - p2.y, p1.x - p2.x);
    let angle = Math.abs(radians * 180 / Math.PI);
    if (angle > 180) angle = 360 - angle;
    return angle;
  }

  private generateFinalResult(): AnalysisResult | null {
    if (this.frames.length === 0) return null;

    if (this.analysisType === 'posture') {
      const lastFrame = this.frames[this.frames.length - 1];
      const issues = this.analyzePosture(lastFrame.landmarks);

      return {
        type: 'posture',
        score: this.calculatePostureScore(issues),
        feedback: issues.map(i => i.description),
        postureIssues: issues,
        frames: this.frames,
      };
    }

    if (this.analysisType === 'repetition') {
      return {
        type: 'repetition',
        score: Math.min(this.repCount * 10, 100),
        feedback: [
          `${this.repCount} repetições completadas`,
          'Mantenha a forma correta',
        ],
        repCount: this.repCount,
        frames: this.frames,
      };
    }

    if (this.analysisType === 'range') {
      const range = this.maxAngle - this.minAngle;
      return {
        type: 'range',
        score: Math.min(range / 1.5, 100), // Normalize to 0-100
        feedback: [
          `Arco de movimento: ${range.toFixed(0)}°`,
          `Máximo: ${this.maxAngle.toFixed(0)}°`,
          `Mínimo: ${this.minAngle.toFixed(0)}°`,
        ],
        rangeOfMotion: {
          joint: 'joelho',
          maxAngle: this.maxAngle,
          minAngle: this.minAngle,
          range,
          expected: { min: 70, max: 140 },
        },
        frames: this.frames,
      };
    }

    return null;
  }

  private analyzePosture(landmarks: any[]): PostureIssue[] {
    const issues: PostureIssue[] = [];

    // Similar logic to processPostureFrame
    const nose = landmarks[0];
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const shoulderX = (leftShoulder.x + rightShoulder.x) / 2;

    if (nose.x < shoulderX - 0.05 || nose.x > shoulderX + 0.05) {
      issues.push({
        type: 'head_forward',
        severity: 'moderate',
        description: 'Cabeça posicionada à frente dos ombros',
      });
    }

    if (Math.abs(leftShoulder.y - rightShoulder.y) > 0.05) {
      issues.push({
        type: 'rounded_shoulders',
        severity: 'mild',
        description: 'Ombros assimétricos',
      });
    }

    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    if (Math.abs(leftHip.y - rightHip.y) > 0.05) {
      issues.push({
        type: 'uneven_hips',
        severity: 'mild',
        description: 'Quadris assimétricos',
      });
    }

    return issues;
  }

  private calculatePostureScore(issues: PostureIssue[]): number {
    let score = 100;
    issues.forEach(issue => {
      switch (issue.severity) {
        case 'mild':
          score -= 10;
          break;
        case 'moderate':
          score -= 20;
          break;
        case 'severe':
          score -= 30;
          break;
      }
    });
    return Math.max(score, 0);
  }

  cleanup() {
    if (this.camera) {
      this.camera.stop();
      this.camera = null;
    }
    this.pose = null;
    this.resultsCallback = null;
    this.frames = [];
  }
}
