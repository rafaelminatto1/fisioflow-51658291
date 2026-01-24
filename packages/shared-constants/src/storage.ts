// Storage Paths
export const STORAGE_PATHS = {
  PATIENT_PHOTOS: (patientId: string) => `patients/${patientId}/photos`,
  EXERCISE_VIDEOS: (exerciseId: string) => `exercises/${exerciseId}`,
  SESSION_VIDEOS: (sessionId: string) => `sessions/${sessionId}`,
  EVALUATION_ATTACHMENTS: (evaluationId: string) => `evaluations/${evaluationId}`,
  USER_PROFILE: (userId: string) => `users/${userId}/profile`,
} as const;

export const STORAGE_LIMITS = {
  MAX_VIDEO_SIZE: 100 * 1024 * 1024, // 100MB
  MAX_IMAGE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_TOTAL_SIZE: 5 * 1024 * 1024 * 1024, // 5GB per user
} as const;
