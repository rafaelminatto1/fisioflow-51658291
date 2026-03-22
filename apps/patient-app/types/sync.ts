export interface QueuedOperation {
  id: string;
  type: 'complete_exercise' | 'submit_feedback' | 'update_profile' | 'appointment';
  data: any;
  timestamp: number;
  retries: number;
  userId: string;
}

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSync?: Date;
}
