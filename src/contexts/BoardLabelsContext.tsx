import { createContext, useContext } from "react";
import type { BoardLabel } from "@/types/boards";

interface BoardLabelsContextValue {
  labels: BoardLabel[];
  labelsMap: Map<string, BoardLabel>;
}

export const BoardLabelsContext = createContext<BoardLabelsContextValue>({
  labels: [],
  labelsMap: new Map(),
});

export function useBoardLabels() {
  return useContext(BoardLabelsContext);
}
