/**
 * VirtualizedBlockRenderer - Renders only visible blocks for performance
 *
 * Features:
 * - Renders only visible sections + buffer of 3
 * - Estimates block height for initial render
 * - Recalculates actual height after render
 * - Especially useful for forms with long exercise/measurement lists
 */

import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  useMemo,
  forwardRef,
} from 'react';
import { cn } from '@/lib/utils';

export interface VirtualBlock {
  id: string;
  height?: number; // Estimated height in pixels
  render: () => React.ReactNode;
}

interface VirtualizedBlockRendererProps {
  blocks: VirtualBlock[];
  className?: string;
  bufferSize?: number; // Number of extra blocks to render above/below viewport
  estimatedHeight?: number; // Default estimated height for blocks
  onBlockRendered?: (blockId: string, actualHeight: number) => void;
}

interface BlockMetadata {
  id: string;
  estimatedHeight: number;
  actualHeight?: number;
  position: number; // Cumulative position from top
}

export const VirtualizedBlockRenderer = forwardRef<
  HTMLDivElement,
  VirtualizedBlockRendererProps
>(
  (
    {
      blocks,
      className,
      bufferSize = 3,
      estimatedHeight = 200,
      onBlockRendered,
    },
    ref
  ) => {
    const [scrollOffset, setScrollOffset] = useState(0);
    const [visibleRange, setVisibleRange] = useState({ start: 0, end: 0 });
    const [blockHeights, setBlockHeights] = useState<Record<string, number>>({});
    const [viewportHeight, setViewportHeight] = useState(window.innerHeight);

    const containerRef = useRef<HTMLDivElement>(null);
    const blockRefs = useRef<Record<string, HTMLDivElement>>({});
    const scrollTimeoutRef = useRef<NodeJS.Timeout>();

    // Calculate block positions and total height
    const blockMetadata: BlockMetadata[] = useMemo(() => {
      let position = 0;
      return blocks.map((block) => {
        const height = blockHeights[block.id] || block.height || estimatedHeight;
        const metadata: BlockMetadata = {
          id: block.id,
          estimatedHeight: height,
          actualHeight: blockHeights[block.id],
          position,
        };
        position += height;
        return metadata;
      });
    }, [blocks, blockHeights, estimatedHeight]);

    const totalHeight = useMemo(() => {
      if (blockMetadata.length === 0) return 0;
      const lastBlock = blockMetadata[blockMetadata.length - 1];
      return lastBlock.position + lastBlock.estimatedHeight;
    }, [blockMetadata]);

    // Calculate visible blocks
    const calculateVisibleRange = useCallback(
      (offset: number, height: number) => {
        let start = 0;
        let end = blocks.length - 1;

        // Find first visible block
        for (let i = 0; i < blockMetadata.length; i++) {
          if (blockMetadata[i].position + blockMetadata[i].estimatedHeight > offset) {
            start = Math.max(0, i - bufferSize);
            break;
          }
        }

        // Find last visible block
        for (let i = blockMetadata.length - 1; i >= 0; i--) {
          if (blockMetadata[i].position < offset + height) {
            end = Math.min(blocks.length - 1, i + bufferSize);
            break;
          }
        }

        return { start, end };
      },
      [blockMetadata, blocks.length, bufferSize]
    );

    // Update visible range on scroll
    const handleScroll = useCallback(() => {
      if (!containerRef.current) return;

      const offset = containerRef.current.scrollTop;
      setScrollOffset(offset);

      // Throttle visible range calculation
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      scrollTimeoutRef.current = setTimeout(() => {
        const range = calculateVisibleRange(offset, viewportHeight);
        setVisibleRange(range);
      }, 16); // ~60fps
    }, [calculateVisibleRange, viewportHeight]);

    // Handle viewport resize
    useEffect(() => {
      const handleResize = () => {
        setViewportHeight(window.innerHeight);
        const range = calculateVisibleRange(scrollOffset, window.innerHeight);
        setVisibleRange(range);
      };

      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, [calculateVisibleRange, scrollOffset]);

    // Track actual block heights
    const trackBlockHeight = useCallback(
      (blockId: string) => {
        const element = blockRefs.current[blockId];
        if (!element) return;

        const actualHeight = element.offsetHeight;
        const estimatedHeight = blockHeights[blockId] || estimatedHeight;

        // Only update if height changed significantly (to avoid infinite loops)
        if (Math.abs(actualHeight - estimatedHeight) > 10) {
          setBlockHeights((prev) => ({
            ...prev,
            [blockId]: actualHeight,
          }));
          onBlockRendered?.(blockId, actualHeight);
        }
      },
      [blockHeights, estimatedHeight, onBlockRendered]
    );

    // Update visible range on mount
    useEffect(() => {
      if (containerRef.current) {
        const range = calculateVisibleRange(0, viewportHeight);
        setVisibleRange(range);
      }
    }, [calculateVisibleRange, viewportHeight]);

    // Track block heights after render
    useEffect(() => {
      const timeoutId = setTimeout(() => {
        Object.keys(blockRefs.current).forEach(trackBlockHeight);
      }, 100);

      return () => clearTimeout(timeoutId);
    }, [visibleRange, trackBlockHeight]);

    const visibleBlocks = blocks.slice(visibleRange.start, visibleRange.end + 1);
    const spacerHeight = blockMetadata[visibleRange.start]?.position || 0;

    return (
      <div
        ref={(node) => {
          containerRef.current = node;
          if (typeof ref === 'function') {
            ref(node);
          } else if (ref) {
            ref.current = node;
          }
        }}
        className={cn('virtualized-block-renderer', 'overflow-y-auto', className)}
        style={{ height: viewportHeight - 100 }}
        onScroll={handleScroll}
      >
        <div style={{ height: totalHeight, position: 'relative' }}>
          {/* Top spacer */}
          {spacerHeight > 0 && <div style={{ height: spacerHeight }} />}

          {/* Visible blocks */}
          {visibleBlocks.map((block) => {
            const metadata = blockMetadata.find((m) => m.id === block.id);
            const topPosition = metadata?.position || 0;

            return (
              <div
                key={block.id}
                ref={(node) => {
                  if (node) blockRefs.current[block.id] = node;
                }}
                style={{
                  position: 'absolute',
                  top: topPosition,
                  left: 0,
                  right: 0,
                }}
                data-block-id={block.id}
              >
                {block.render()}
              </div>
            );
          })}
        </div>
      </div>
    );
  }
);

VirtualizedBlockRenderer.displayName = 'VirtualizedBlockRenderer';

// Helper to create virtual blocks from React elements
export const createVirtualBlock = (
  id: string,
  renderFn: () => React.ReactNode,
  estimatedHeight?: number
): VirtualBlock => ({
  id,
  height: estimatedHeight,
  render: renderFn,
});

// Memoize for performance
export const MemoizedVirtualizedBlockRenderer = React.memo(
  VirtualizedBlockRenderer
);
MemoizedVirtualizedBlockRenderer.displayName =
  'VirtualizedBlockRenderer (Memoized)';
