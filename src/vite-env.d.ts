/// <reference types="vite/client" />

declare const __APP_VERSION__: string;
declare const __BUILD_TIME__: string;
declare const __CACHE_BUSTER__: string;

interface Window {
  Pose: any;
  drawConnectors: any;
  drawLandmarks: any;
}
