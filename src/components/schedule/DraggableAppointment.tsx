import { useDraggable, UseDraggableArguments } from '@dnd-kit/core';
import { memo, useMemo } from 'react';
import { cn } from '@/lib/utils';

interface DraggableAppointmentProps {
  id: string;
  style: React.CSSProperties;
  children: React.ReactNode;
  isDragging: boolean;
  isDragDisabled?: boolean;
  dragData?: UseDraggableArguments['data'];
  isPopoverOpen?: boolean;
}

/**
 * Comparison function for React.memo.
 * Only re-render when drag state or visual properties change.
 */
function draggableAppointmentAreEqual(
  prev: DraggableAppointmentProps,
  next: DraggableAppointmentProps
): boolean {
  return (
    prev.id === next.id &&
    prev.isDragging === next.isDragging &&
    prev.isDragDisabled === next.isDragDisabled &&
    prev.isPopoverOpen === next.isPopoverOpen &&
    // Simple style comparison - only check critical visual properties
    prev.style.height === next.style.height &&
    prev.style.width === next.style.width &&
    prev.style.gridColumn === next.style.gridColumn &&
    prev.style.gridRow === next.style.gridRow &&
    prev.style.left === next.style.left
  );
}

/**
 * Enhanced Wrapper component that makes an appointment card draggable using @dnd-kit.
 *
 * Features:
 * - Smooth transform animations during drag
 * - Ghost effect with configurable opacity
 * - Optimized re-renders with React.memo
 * - Proper cursor feedback
 * - Accessible drag handles
 */
export const DraggableAppointment = memo(({
  id,
  style,
  children,
  isDragging,
  isDragDisabled = false,
  dragData,
  isPopoverOpen = false
}: DraggableAppointmentProps) => {
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
  } = useDraggable({
    id,
    data: dragData,
    disabled: isDragDisabled,
  });

  // Memoize the drag style to avoid unnecessary recalculations
  const dragStyle: React.CSSProperties = useMemo(() => {
    if (!transform) {
      return {
        ...style,
        cursor: isDragDisabled ? 'default' : 'grab',
      };
    }

    return {
      ...style,
      transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      // Smooth transition during drag
      transition: isDragging
        ? 'transform 75ms ease-out, opacity 150ms ease-out'
        : 'transform 150ms ease-out, opacity 150ms ease-out',
      // During drag, the original card becomes semi-transparent ghost
      opacity: isDragging ? 0.2 : 1,
      // Scale down slightly during drag for visual feedback
      scale: isDragging ? 0.98 : 1,
      cursor: isDragDisabled ? 'default' : 'grabbing',
      // Elevate during drag
      zIndex: isDragging ? 1000 : style.zIndex ?? 10,
      boxShadow: isDragging
        ? '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
        : undefined,
    };
  }, [transform, style, isDragging, isDragDisabled]);

  return (
    <div
      ref={setNodeRef}
      style={dragStyle}
      {...attributes}
      {...listeners}
      className={cn(
        "absolute",
        !isDragDisabled && "cursor-grab active:cursor-grabbing touch-none",
        // Smooth scale animation on grab
        "transition-transform duration-75 ease-out will-change-transform"
      )}
    >
      {children}
    </div>
  );
}, draggableAppointmentAreEqual);

DraggableAppointment.displayName = 'DraggableAppointment';
