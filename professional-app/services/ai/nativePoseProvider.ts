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

// Tenta importar o módulo nativo se disponível
let NativePoseModule: any = null;
try {
  // Exemplo de importação dinâmica segura
  // NativePoseModule = require('my-native-pose-library');
} catch (e) {
  console.warn('[NativePoseProvider] Módulo nativo não encontrado. A IA rodará em modo simulado ou Webview.');
}

export class NativePoseProvider implements PoseProvider {
  private isLoaded: boolean = false;
  
  async initialize(): Promise<void> {
    if (Platform.OS === 'web') {
      console.warn('[NativePoseProvider] Este provedor é apenas para iOS/Android.');
      return;
    }

    if (!NativePoseModule) {
      console.log('[NativePoseProvider] Inicializando (Modo Mock/Dev)...');
      this.isLoaded = true;
      return;
    }

    try {
      await NativePoseModule.initialize();
      this.isLoaded = true;
    } catch (e) {
      console.error('[NativePoseProvider] Falha ao inicializar módulo nativo', e);
      throw e;
    }
  }

  async detect(image: any): Promise<PoseDetection> {
    if (!this.isLoaded) throw new Error('Provider not initialized');

    if (NativePoseModule) {
      // Implementação real nativa
      return NativePoseModule.detect(image);
    }

    // Fallback/Mock para desenvolvimento sem build nativo
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
