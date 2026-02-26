/**
 * PoseDetectionService - Serviço unificado para detecção de pose
 * 
 * Implementa a interface PoseProvider para MediaPipe Web.
 */

import { 
  PoseDetection, 
  PoseProvider, 
  AnalysisType 
} from '@/types/pose';
import { fisioLogger as logger } from '@/lib/errors/logger';
import { nativePoseProvider } from './nativePoseProvider';

class MediaPipeWebProvider implements PoseProvider {
  // ... (código existente da classe permanece o mesmo)
  private landmarker: any = null;
  private isInitializing: boolean = false;
  private isLoaded: boolean = false;
  private streamCallback: ((result: PoseDetection) => void) | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private requestRef: number | null = null;

  async initialize(): Promise<void> {
    if (this.isLoaded) return;
    if (this.isInitializing) return;

    this.isInitializing = true;
    try {
      const vision = await import('@mediapipe/tasks-vision');
      const { PoseLandmarker, FilesetResolver } = vision;
      
      const filesetResolver = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );

      this.landmarker = await PoseLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`,
          delegate: "GPU"
        },
        runningMode: "VIDEO",
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      this.isLoaded = true;
      logger.info('[PoseDetectionService] MediaPipe inicializado', null, 'PoseDetectionService');
    } catch (err) {
      logger.error('Erro ao inicializar MediaPipe', err, 'PoseDetectionService');
      throw err;
    } finally {
      this.isInitializing = false;
    }
  }

  async detect(video: HTMLVideoElement | HTMLCanvasElement | ImageBitmap | HTMLImageElement): Promise<PoseDetection> {
    if (!this.isLoaded) await this.initialize();

    const startTimeMs = performance.now();
    let result;

    if (video instanceof HTMLVideoElement) {
      result = this.landmarker.detectForVideo(video, startTimeMs);
    } else {
      result = this.landmarker.detect(video);
    }

    if (result.landmarks && result.landmarks.length > 0) {
      return {
        landmarks: result.landmarks[0].map((l: any) => ({
          x: l.x,
          y: l.y,
          z: l.z,
          visibility: l.visibility || 0
        })),
        confidence: 0.8,
        timestamp: startTimeMs,
        analysisType: AnalysisType.FORM
      };
    }

    return {
      landmarks: [],
      confidence: 0,
      timestamp: startTimeMs,
      analysisType: AnalysisType.FORM
    };
  }

  startStream(video: HTMLVideoElement, callback: (result: PoseDetection) => void): void {
    this.videoElement = video;
    this.streamCallback = callback;
    this.loop();
  }

  private loop = () => {
    if (this.videoElement && this.streamCallback && this.isLoaded) {
      if (this.videoElement.readyState >= 2) {
        this.detect(this.videoElement).then(this.streamCallback);
      }
      this.requestRef = requestAnimationFrame(this.loop);
    }
  }

  stopStream(): void {
    if (this.requestRef) {
      cancelAnimationFrame(this.requestRef);
      this.requestRef = null;
    }
    this.streamCallback = null;
    this.videoElement = null;
  }

  close(): void {
    this.stopStream();
    if (this.landmarker) {
      this.landmarker.close();
      this.landmarker = null;
    }
    this.isLoaded = false;
  }

  isInitialized(): boolean {
    return this.isLoaded;
  }
}

/**
 * PoseDetectionOrchestrator - Orquestrador de Detecção de Pose
 * 
 * Decide qual provedor utilizar (Nativo ou Web) baseado no ambiente
 * e na disponibilidade, garantindo a melhor performance possível.
 */
class PoseDetectionOrchestrator implements PoseProvider {
  private webProvider = new MediaPipeWebProvider();
  private activeProvider: PoseProvider;

  constructor() {
    // Se estiver em ambiente nativo, prefere o NativePoseProvider
    if (nativePoseProvider.isSupported()) {
      this.activeProvider = nativePoseProvider;
      logger.info('[PoseOrchestrator] Usando Provedor Nativo (Capacitor)', null, 'PoseOrchestrator');
    } else {
      this.activeProvider = this.webProvider;
      logger.info('[PoseOrchestrator] Usando Provedor Web (MediaPipe)', null, 'PoseOrchestrator');
    }
  }

  async initialize(): Promise<void> {
    return this.activeProvider.initialize();
  }

  async detect(video: HTMLVideoElement | HTMLCanvasElement | ImageBitmap | HTMLImageElement): Promise<PoseDetection> {
    return this.activeProvider.detect(video);
  }

  startStream(video: HTMLVideoElement, callback: (result: PoseDetection) => void): void {
    return this.activeProvider.startStream(video, callback);
  }

  stopStream(): void {
    return this.activeProvider.stopStream();
  }

  close(): void {
    return this.activeProvider.close();
  }

  isInitialized(): boolean {
    return this.activeProvider.isInitialized();
  }

  /**
   * Permite forçar o uso do provedor web (útil para debug ou fallback)
   */
  useWebProvider() {
    this.activeProvider = this.webProvider;
    logger.info('[PoseOrchestrator] Forçando Provedor Web', null, 'PoseOrchestrator');
  }
}

// Singleton instance
export const poseDetectionService = new PoseDetectionOrchestrator();

// Legacy compatibility
export const initPoseEstimator = () => poseDetectionService.initialize();
export const detectPoseInImage = async (imageElement: HTMLImageElement) => {
  const result = await poseDetectionService.detect(imageElement);
  return result.landmarks;
};
