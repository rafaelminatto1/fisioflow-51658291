export interface TabSaveHandle {
  isDirty: boolean;
  isSaving: boolean;
  lastSavedAt: Date | null;
  save: () => void;
  discard: () => void;
}

export interface TabComponentProps {
  registerHandle: (handle: TabSaveHandle | null) => void;
}
