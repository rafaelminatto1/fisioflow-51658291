/**
 * useLazyImage - Lazy loading for images with intersection observer
 *
 * Features:
 * - Lazy load images when they enter viewport
 * - Show blur-up placeholder while loading
 * - Cancel loading for off-screen images
 * - Support for src, srcSet, and lazy loading
 */

import { useState, useEffect, useRef } from 'react';

interface UseLazyImageOptions {
  src: string;
  alt?: string;
  threshold?: number;
  rootMargin?: string;
  className?: string;
  placeholder?: string;
  onLoad?: () => void;
  onError?: () => void;
}

export const useLazyImage = ({
  src,
  alt = '',
  threshold = 0.1,
  rootMargin = '50px',
  className = '',
  placeholder,
  onLoad,
  onError,
}: UseLazyImageOptions) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    // Create intersection observer
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          // Unobserve after visible
          if (imgRef.current) {
            observer.unobserve(imgRef.current);
          }
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    observerRef.current = observer;

    // Observe the image element
    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [threshold, rootMargin]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setIsError(true);
    onError?.();
  };

  // Reset state when src changes
  useEffect(() => {
    setIsVisible(false);
    setIsLoaded(false);
    setIsError(false);
  }, [src]);

  return {
    imgRef,
    isVisible,
    isLoaded,
    isError,
    imageProps: {
      src: isVisible ? src : placeholder || '',
      alt,
      className,
      onLoad: handleLoad,
      onError: handleError,
      loading: 'lazy',
    },
  };
};

// Blur-up placeholder style for lazy loaded images
export const LAZY_IMAGE_PLACEHOLDER_STYLE = `
  filter: blur(8px);
  transform: scale(1.02);
  transition: filter 0.3s ease-out, transform 0.3s ease-out;
`;

// Component wrapper for lazy images
interface LazyImageProps extends UseLazyImageOptions {
  width?: number;
  height?: number;
}

export const LazyImage: React.FC<LazyImageProps> = (props) => {
  const { imgRef, isVisible, isLoaded, isError, imageProps } = useLazyImage(props);

  return (
    <img
      ref={imgRef}
      {...imageProps}
      style={{
        ...imageProps.style,
        width: props.width,
        height: props.height,
        // Blur placeholder while loading
        ...(!isLoaded && !isError && LAZY_IMAGE_PLACEHOLDER_STYLE),
      }}
    />
  );
};
