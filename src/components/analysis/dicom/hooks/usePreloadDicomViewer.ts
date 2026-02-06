
/**
 * Hook para pré-carregar o DicomViewer
 * Use quando o usuário provavelmente vai abrir o visualizador
 *
 * @example
 * const preloadDicomViewer = usePreloadDicomViewer();
 * <button onMouseEnter={preloadDicomViewer}>Ver DICOM</button>
 */

import { useState } from 'react';

export function usePreloadDicomViewer() {
  const [isLoaded, setIsLoaded] = useState(false);

  const preload = () => {
    if (!isLoaded) {
      setIsLoaded(true);
      // Inicia o lazy loading
      import('../DicomViewerInner');
    }
  };

  return { preload, isLoaded };
}
