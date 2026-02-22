
export type NotificationCategory = 'appointments' | 'patients' | 'system' | 'marketing';

export interface NotificationPreference {
  userId: string;
  category: NotificationCategory;
  enabled: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart?: string; // HH:mm format
  quietHoursEnd?: string;
  channels: {
    push: boolean;
    email: boolean;
    inApp: boolean;
  };
}

export interface NotificationPreferences {
  userId: string;
  appointments: NotificationPreference;
  patients: NotificationPreference;
  system: NotificationPreference;
  marketing: NotificationPreference;
  updatedAt: Date;
}
