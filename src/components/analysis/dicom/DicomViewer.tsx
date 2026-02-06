/* eslint-disable react-refresh/only-export-components */
/**
 * DicomViewer - Visualizador DICOM otimizado com lazy loading
 * Carrega o Cornerstone.js apenas quando o componente é montado
 * Reduz significativamente o tamanho inicial do bundle
 */


 
// Re-export the hook for convenience - this is a valid pattern for organizing related code

import React, { Suspense, lazy } from 'react';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { ComponentErrorBoundary, ComputerVisionFallback } from '@/components/error/ComponentErrorBoundary';

export { usePreloadDicomViewer } from './hooks/usePreloadDicomViewer';
 

interface DicomViewerProps {
  file?: File; // Local mode
  studyInstanceUid?: string; // WADO-RS mode
  seriesInstanceUid?: string;
  wadoUrl?: string; // Base URL for WADO-RS Proxy
}

/**
 * Componente interno que importa o Cornerstone
 * Só é carregado quando o DicomViewer é renderizado
 */
const DicomViewerInner = lazy(() => import('./DicomViewerInner'));

/**
 * Fallback de carregamento para o DicomViewer
 */
function DicomViewerLoading() {
  return (
    <Card className="w-full h-[500px] flex items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
        <div className="space-y-2">
          <p className="font-medium">Carregando visualizador DICOM...</p>
          <p className="text-sm text-muted-foreground">
            Isso pode levar alguns segundos na primeira vez
          </p>
        </div>
      </div>
    </Card>
  );
}

/**
 * DicomViewer otimizado com lazy loading
 *
 * @example
 * <DicomViewer file={dicomFile} />
 */
export const DicomViewer: React.FC<DicomViewerProps> = (props) => {
  return (
    <ComponentErrorBoundary
      fallback={<ComputerVisionFallback />}
      componentName="DicomViewer"
    >
      <Suspense fallback={<DicomViewerLoading />}>
        <DicomViewerInner {...props} />
      </Suspense>
    </ComponentErrorBoundary>
  );
};

export default DicomViewer;
