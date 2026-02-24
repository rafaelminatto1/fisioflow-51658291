/**
 * Analysis Engine - Motor de Análise Biomecânica (Patient App)
 * 
 * Responsável pelo cálculo de ângulos e feedback visual para o paciente.
 */

import { 
  PoseDetection, 
  AnalysisResult, 
  ExerciseType, 
  JointAngle,
  AnalysisType
} from '../../types/ai/pose';

const POSE_LANDMARKS = {
  LEFT_SHOULDER: 11, RIGHT_SHOULDER: 12,
  LEFT_HIP: 23, RIGHT_HIP: 24,
  LEFT_KNEE: 25, RIGHT_KNEE: 26,
  LEFT_ANKLE: 27, RIGHT_ANKLE: 28
};

export class AnalysisEngine {
  private exerciseType: ExerciseType;
  private repCount: number = 0;
  private lastPhase: 'up' | 'down' = 'up';

  constructor(exerciseType: ExerciseType = ExerciseType.SQUAT) {
    this.exerciseType = exerciseType;
  }

  public processFrame(pose: PoseDetection): AnalysisResult {
    const jointAngles = this.calculateJointAngles(pose);
    
    // Simulação simples de contagem para o paciente
    const kneeAngle = jointAngles.get('left_knee')?.current || 180;
    if (this.lastPhase === 'up' && kneeAngle < 100) {
      this.lastPhase = 'down';
    } else if (this.lastPhase === 'down' && kneeAngle > 160) {
      this.lastPhase = 'up';
      this.repCount++;
    }

    return {
      pose,
      jointAngles,
      repCount: this.repCount,
      metrics: {
        formScore: 100,
        stabilityScore: 100,
        rangeOfMotion: 180 - kneeAngle,
        repetitions: this.repCount,
        duration: 0
      },
      timestamp: Date.now(),
      feedback: this.generateFeedback(this.repCount)
    };
  }

  private calculateJointAngles(pose: PoseDetection): Map<string, JointAngle> {
    const angles = new Map<string, JointAngle>();
    const lm = pose.landmarks;

    if (!lm || lm.length < 33) return angles;

    const calcAngle = (p1: number, p2: number, p3: number): number => {
      const a = lm[p1]; const b = lm[p2]; const c = lm[p3];
      const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
      let angle = Math.abs(radians * 180.0 / Math.PI);
      if (angle > 180.0) angle = 360 - angle;
      return angle;
    };

    const kneeL = calcAngle(POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.LEFT_KNEE, POSE_LANDMARKS.LEFT_ANKLE);
    angles.set('left_knee', { joint: 'left_knee', current: kneeL, min: 0, max: 180, average: kneeL, target: { min: 80, max: 100 }, inRange: true });

    return angles;
  }

  private generateFeedback(reps: number): string[] {
    if (reps === 0) return ['Prepare-se para começar'];
    if (reps % 5 === 0) return ['Muito bem!', 'Continue assim'];
    return [`Repetição ${reps}`];
  }
}
