import { useEffect, useState } from 'react';

export function useImagePreload(src: string): boolean {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!src) {
      setLoaded(false);
      return;
    }

    const img = new Image();
    img.onload = () => setLoaded(true);
    img.onerror = () => setLoaded(false);
    img.src = src;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src]);

  return loaded;
}

export function useImagesPreload(srcs: string[]): boolean {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!srcs.length) {
      setLoaded(true);
      return;
    }

    let mounted = true;
    let loadedCount = 0;

    srcs.forEach((src) => {
      const img = new Image();
      img.onload = () => {
        loadedCount += 1;
        if (mounted && loadedCount === srcs.length) {
          setLoaded(true);
        }
      };
      img.onerror = () => {
        loadedCount += 1;
        if (mounted && loadedCount === srcs.length) {
          setLoaded(true);
        }
      };
      img.src = src;
    });

    return () => {
      mounted = false;
    };
  }, [srcs]);

  return loaded;
}
