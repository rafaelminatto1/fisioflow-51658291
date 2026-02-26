import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  serverTimestamp, 
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { Consent, ConsentHistory, ConsentType, ConsentCategory } from '@/types/consent';
import { CONSENT_TYPES } from '@/constants/consentTypes';

export class ConsentManager {
  private static instance: ConsentManager;
  
  private constructor() {}

  static getInstance(): ConsentManager {
    if (!ConsentManager.instance) {
      ConsentManager.instance = new ConsentManager();
    }
    return ConsentManager.instance;
  }

  /**
   * Initialize consent manager for user
   */
  async initialize(userId: string): Promise<void> {
    // Check if initial consents exist, if not create default structure?
    // Mostly just ensuring we can read consents.
    // Maybe verify required consents.
    await this.getUserConsents(userId);
  }

  /**
   * Grant consent for a specific type
   */
  async grantConsent(
    userId: string,
    consentType: string,
    version: string,
    metadata?: Record<string, any>
  ): Promise<Consent> {
    const consentRef = doc(db, 'user_consents', `${userId}_${consentType}`);
    const historyRef = doc(collection(db, 'consent_history'));

    const consentData: Consent = {
      id: `${userId}_${consentType}`,
      userId,
      type: this.getConsentTypeCategory(consentType),
      category: this.getConsentCategory(consentType),
      name: consentType,
      description: this.getConsentDescription(consentType),
      version,
      status: 'granted',
      grantedAt: new Date(), // Local time, will be overwritten by serverTimestamp in Firestore but kept for return
      metadata
    };

    // Firestore writes
    await setDoc(consentRef, {
      ...consentData,
      grantedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // History write
    const historyEntry: Omit<ConsentHistory, 'id'> = {
      consentId: consentData.id,
      userId,
      action: 'granted',
      timestamp: new Date(),
      version
    };

    await setDoc(historyRef, {
      ...historyEntry,
      timestamp: serverTimestamp()
    });

    // TODO: Audit Log (Task 36)

    return consentData;
  }

  /**
   * Withdraw consent (only for optional consents)
   */
  async withdrawConsent(
    userId: string,
    consentType: string,
    reason?: string
  ): Promise<void> {
    const typeCategory = this.getConsentTypeCategory(consentType);
    if (typeCategory === 'required') {
      throw new Error('Cannot withdraw required consent');
    }

    const consentRef = doc(db, 'user_consents', `${userId}_${consentType}`);
    const historyRef = doc(collection(db, 'consent_history'));
    
    // Check if it exists first
    const snapshot = await getDoc(consentRef);
    if (!snapshot.exists()) {
       throw new Error('Consent record not found');
    }

    await setDoc(consentRef, {
      status: 'withdrawn',
      withdrawnAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });

    // History write
    const historyEntry: Omit<ConsentHistory, 'id'> = {
        consentId: `${userId}_${consentType}`,
        userId,
        action: 'withdrawn',
        timestamp: new Date(),
        version: snapshot.data().version, // Use current version
        reason
    };

    await setDoc(historyRef, {
        ...historyEntry,
        timestamp: serverTimestamp()
    });

    // TODO: Audit Log (Task 36)
  }

  /**
   * Check if user has granted specific consent
   */
  async hasConsent(userId: string, consentType: string): Promise<boolean> {
     const consentRef = doc(db, 'user_consents', `${userId}_${consentType}`);
     const snapshot = await getDoc(consentRef);
     if (!snapshot.exists()) return false;
     const data = snapshot.data() as Consent;
     return data.status === 'granted';
  }

  /**
   * Get all consents for user
   */
  async getUserConsents(userId: string): Promise<Consent[]> {
    const q = query(collection(db, 'user_consents'), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            ...data,
            grantedAt: data.grantedAt instanceof Timestamp ? data.grantedAt.toDate() : data.grantedAt,
            withdrawnAt: data.withdrawnAt instanceof Timestamp ? data.withdrawnAt.toDate() : data.withdrawnAt,
        } as Consent;
    });
  }

  /**
   * Get consent history
   */
  async getConsentHistory(userId: string, consentType?: string): Promise<ConsentHistory[]> {
    let q = query(
        collection(db, 'consent_history'), 
        where('userId', '==', userId),
        orderBy('timestamp', 'desc')
    );

    if (consentType) {
        // We need to filter by consentId which is userId_consentType
        // But the design says consentId, let's assume filtering by consentId
        q = query(
            collection(db, 'consent_history'),
            where('userId', '==', userId),
            where('consentId', '==', `${userId}_${consentType}`),
            orderBy('timestamp', 'desc')
        );
    }

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toDate() : data.timestamp,
        } as ConsentHistory;
    });
  }

  /**
   * Check if consent needs renewal (version changed)
   */
  async needsRenewal(userId: string, consentType: string, currentVersion: string): Promise<boolean> {
      const consentRef = doc(db, 'user_consents', `${userId}_${consentType}`);
      const snapshot = await getDoc(consentRef);
      if (!snapshot.exists()) return true;
      
      const data = snapshot.data() as Consent;
      // Simple version check: not equal means renewal needed? Or semver?
      // For now, strict inequality.
      return data.version !== currentVersion;
  }

  /**
   * Sync consent with device permissions
   */
  async syncDevicePermissions(userId: string): Promise<void> {
    // TODO: Implement syncing with PermissionManager (Task 24)
    console.log('Syncing device permissions for', userId);
  }
  
  // Helpers
  private getConsentTypeCategory(consentType: string): ConsentType {
      const required = [
          CONSENT_TYPES.PRIVACY_POLICY, 
          CONSENT_TYPES.TERMS_OF_SERVICE,
          CONSENT_TYPES.CAMERA_PERMISSION, 
          CONSENT_TYPES.PHOTOS_PERMISSION
      ];
      
      return required.includes(consentType as any) ? 'required' : 'optional';
  }

  private getConsentCategory(consentType: string): ConsentCategory {
      if (consentType === CONSENT_TYPES.PRIVACY_POLICY || consentType === CONSENT_TYPES.TERMS_OF_SERVICE) return 'legal';
      if (consentType.includes('permission')) return 'permission';
      if (consentType === CONSENT_TYPES.ANALYTICS || consentType === CONSENT_TYPES.CRASH_REPORTS) return 'analytics';
      if (consentType === CONSENT_TYPES.MARKETING_EMAILS) return 'marketing';
      return 'legal'; // Default
  }

  private getConsentDescription(consentType: string): string {
      // Return localized description
      // For now return hardcoded string or key, ideally this should come from translation file
      return consentType;
  }
}

export const consentManager = ConsentManager.getInstance();
