/**
 * NativePoseProvider - Provedor de Pose Nativo (Adapter)
 * 
 * Este arquivo serve como ponte para a implementação nativa de Pose Detection.
 * 
 * ATENÇÃO:
 * Para funcionar em dispositivos móveis, este provedor requer:
 * 1. Instalação de biblioteca nativa (ex: react-native-vision-camera + plugin mediapipe)
 * 2. Compilação de um Development Client (não funciona no Expo Go padrão)
 * 
 * @module services/ai/nativePoseProvider
 */

import { 
  PoseDetection, 
  PoseProvider, 
  AnalysisType 
} from '../../types/pose';
import { Platform } from 'react-native';
import * as VisionPoseDetector from '../../modules/expo-vision-pose-detector';

export class NativePoseProvider implements PoseProvider {
  private isLoaded: boolean = false;
  
  async initialize(): Promise<void> {
    if (Platform.OS === 'web') {
      console.warn('[NativePoseProvider] Este provedor é apenas para iOS/Android.');
      return;
    }

    // O módulo Expo não precisa de inicialização manual, ele é injetado pelo Expo Autolinking
    this.isLoaded = true;
    console.log('[NativePoseProvider] Inicializado com VisionPoseDetector (iOS Native)');
  }

  async detect(image: any): Promise<PoseDetection> {
    if (!this.isLoaded) throw new Error('Provider not initialized');

    if (Platform.OS === 'ios') {
      try {
        // Assume image is a local URI
        const results = await VisionPoseDetector.detectPoseAsync(image);
        if (results && results.length > 0) {
          const mainPose = results[0];
          return {
            landmarks: mainPose.landmarks,
            confidence: mainPose.confidence,
            timestamp: Date.now(),
            analysisType: AnalysisType.FORM
          };
        }
      } catch (e) {
        console.error('[NativePoseProvider] Erro na detecção nativa iOS:', e);
      }
    }

    // Fallback/Mock para desenvolvimento
    return {
      landmarks: [],
      confidence: 0,
      timestamp: Date.now(),
      analysisType: AnalysisType.FORM
    };
  }

  startStream(video: any, callback: (result: PoseDetection) => void): void {
    if (!this.isLoaded) return;
    
    // Em uma implementação real com Vision Camera, aqui configuraríamos o Frame Processor
    console.log('[NativePoseProvider] Stream iniciado (simulado)');
  }

  stopStream(): void {
    console.log('[NativePoseProvider] Stream parado');
  }

  close(): void {
    this.isLoaded = false;
  }

  isInitialized(): boolean {
    return this.isLoaded;
  }
}

export const nativePoseProvider = new NativePoseProvider();
