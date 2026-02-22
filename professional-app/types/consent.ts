export type ConsentType = 'required' | 'optional';
export type ConsentCategory = 'legal' | 'permission' | 'analytics' | 'marketing';
export type ConsentStatus = 'granted' | 'withdrawn' | 'pending';

export interface Consent {
  id: string;
  userId: string;
  type: ConsentType;
  category: ConsentCategory;
  name: string;
  description: string;
  version: string;
  status: ConsentStatus;
  grantedAt?: Date;
  withdrawnAt?: Date;
  metadata?: Record<string, any>;
}

export interface ConsentHistory {
  id: string;
  consentId: string;
  userId: string;
  action: 'granted' | 'withdrawn' | 'updated';
  timestamp: Date;
  version: string;
  reason?: string;
}
