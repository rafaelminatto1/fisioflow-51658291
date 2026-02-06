export type VideoProvider = 'builtin' | 'whereby' | 'twilio' | 'agora' | 'daily';

export interface VideoIntegrationConfig {
  provider: VideoProvider;
  apiKey?: string;
  roomUrl?: string;
  enableRecording?: boolean;
  enableChat?: boolean;
  enableScreenShare?: boolean;
}
