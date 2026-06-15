import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface MutationRequest {
  id: string;
  endpoint: string;
  method: string;
  data?: any;
  params?: any;
  timestamp: number;
}

export interface SyncConflict {
  id: string;
  mutation: MutationRequest;
  serverData: any;
  localData: any;
}

interface SyncState {
  queue: MutationRequest[];
  isSyncing: boolean;
  conflict: SyncConflict | null;
  addMutation: (mutation: Omit<MutationRequest, "id" | "timestamp"> & { id?: string }) => string;
  removeMutation: (id: string) => void;
  setSyncing: (isSyncing: boolean) => void;
  setConflict: (conflict: SyncConflict | null) => void;
  clearQueue: () => void;
  resolveConflict: (resolution: "local" | "server" | "both") => void;
}

const generateUUID = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const useSyncStore = create<SyncState>()(
  persist(
    (set, get) => ({
      queue: [],
      isSyncing: false,
      conflict: null,

      addMutation: (mutation) => {
        const id = mutation.id || generateUUID();
        const newMutation: MutationRequest = {
          ...mutation,
          id,
          timestamp: Date.now(),
        };

        set((state) => ({
          queue: [...state.queue, newMutation],
        }));

        return id;
      },

      removeMutation: (id) => {
        set((state) => ({
          queue: state.queue.filter((m) => m.id !== id),
        }));
      },

      setSyncing: (isSyncing) => set({ isSyncing }),
      setConflict: (conflict) => set({ conflict }),
      clearQueue: () => set({ queue: [] }),

      resolveConflict: (resolution) => {
        const conflict = get().conflict;
        if (!conflict) return;

        if (resolution === "server") {
          // Discard local mutation
          get().removeMutation(conflict.mutation.id);
        } else if (resolution === "local" || resolution === "both") {
          // For 'local', we keep it to retry. The actual merge logic would be handled by the sync process.
          // For 'both', same. This just clears the modal so sync can resume/retry.
        }

        set({ conflict: null });
      },
    }),
    {
      name: "sync-storage",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
