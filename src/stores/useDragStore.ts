/**
 * Zustand store para gerenciamento de estado de drag and drop
 * @module stores/useDragStore
 */


// =====================================================================
// STORE STATE
// =====================================================================

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { DragState, DropTarget, DraggedAppointment } from '@/lib/calendar/types';

interface DragStore extends DragState {
  /** Alvo de drop atual */
  dropTarget: DropTarget | null;

  /** Define o estado de drag */
  setDragState: (state: DragState) => void;

  /** Define o appointment sendo arrastado */
  setDraggedAppointment: (appointment: DraggedAppointment | null) => void;

  /** Inicia o drag */
  startDrag: (appointment: DraggedAppointment) => void;

  /** Finaliza o drag */
  endDrag: () => void;

  /** Define o alvo de drop */
  setDropTarget: (target: DropTarget | null) => void;

  /** Limpa o alvo de drop */
  clearDropTarget: () => void;

  /** Reseta todo o estado */
  reset: () => void;
}

// =====================================================================
// INITIAL STATE
// =====================================================================

const initialState: DragState = {
  appointment: null,
  isDragging: false,
};

// =====================================================================
// STORE
// =====================================================================

export const useDragStore = create<DragStore>()(
  devtools(
    (set) => ({
      // State inicial
      ...initialState,
      dropTarget: null,

      // Actions
      setDragState: (state) => set({ ...state }),

      setDraggedAppointment: (appointment) =>
        set({
          appointment,
          isDragging: appointment !== null,
        }),

      startDrag: (appointment) =>
        set({
          appointment,
          isDragging: true,
        }),

      endDrag: () =>
        set({
          appointment: null,
          isDragging: false,
          dropTarget: null,
        }),

      setDropTarget: (target) => set({ dropTarget: target }),

      clearDropTarget: () => set({ dropTarget: null }),

      reset: () =>
        set({
          ...initialState,
          dropTarget: null,
        }),
    }),
    { name: 'DragStore' }
  )
);

// =====================================================================
// SELECTORS
// =====================================================================

/**
 * Selector para obter o estado de dragging
 */
export const selectIsDragging = (state: DragStore) => state.isDragging;

/**
 * Selector para obter o appointment sendo arrastado
 */
export const selectDraggedAppointment = (state: DragStore) => state.appointment;

/**
 * Selector para obter o alvo de drop
 */
export const selectDropTarget = (state: DragStore) => state.dropTarget;

/**
 * Selector para verificar se pode fazer drop
 */
export const selectCanDrop = (state: DragStore) =>
  state.isDragging && state.dropTarget !== null;

// =====================================================================
// EXPORTS
// =====================================================================

export default useDragStore;
