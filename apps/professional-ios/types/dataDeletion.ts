
export type DeletionStatus = 'pending' | 'cancelled' | 'completed';

export interface DataDeletionRequest {
  id: string;
  userId: string;
  requestedAt: Date;
  scheduledFor: Date; // 30 days after request
  cancelledAt?: Date;
  completedAt?: Date;
  status: DeletionStatus;
  reason?: string;
  confirmationToken: string;
}

export interface DeletionScope {
  deleteAccount: boolean;
  deletePatients: boolean;
  deleteSOAPNotes: boolean;
  deletePhotos: boolean;
  deleteProtocols: boolean;
  deleteExercises: boolean;
  deleteAppointments: boolean;
  // Audit log is retained for 1 year minimum per compliance
  retainAuditLog: boolean;
}
