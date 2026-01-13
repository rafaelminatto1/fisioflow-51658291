/**
 * DicomViewer - Visualizador DICOM otimizado com lazy loading
 * Carrega o Cornerstone.js apenas quando o componente é montado
 * Reduz significativamente o tamanho inicial do bundle
 */

import React, { useEffect, useRef, useState, Suspense, lazy } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Ruler, MousePointer2, ZoomIn, Move, Loader2 } from 'lucide-react';
import { ComponentErrorBoundary, ComputerVisionFallback } from '@/components/error/ComponentErrorBoundary';

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

/**
 * Hook para pré-carregar o DicomViewer
 * Use quando o usuário provavelmente vai abrir o visualizador
 *
 * @example
 * const preloadDicomViewer = usePreloadDicomViewer();
 * <button onMouseEnter={preloadDicomViewer}>Ver DICOM</button>
 */
export function usePreloadDicomViewer() {
  const [isLoaded, setIsLoaded] = useState(false);

  const preload = () => {
    if (!isLoaded) {
      setIsLoaded(true);
      // Inicia o lazy loading
      import('./DicomViewerInner');
    }
  };

  return { preload, isLoaded };
}

export default DicomViewer;
