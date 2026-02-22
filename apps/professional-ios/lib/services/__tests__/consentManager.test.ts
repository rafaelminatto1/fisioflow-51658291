import { ConsentManager, consentManager } from '../consentManager';
import { db } from '../../firebase';
import { 
  setDoc, 
  getDoc, 
  getDocs, 
  collection, 
  doc, 
  serverTimestamp 
} from 'firebase/firestore';

jest.mock('../../firebase', () => ({
  db: {}
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  setDoc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(() => Promise.resolve({ docs: [] })),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  serverTimestamp: jest.fn(),
  Timestamp: {
    now: jest.fn(() => ({ toDate: () => new Date() })),
    fromDate: jest.fn((date) => ({ toDate: () => date }))
  }
}));

describe('ConsentManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be a singleton', () => {
    const instance1 = ConsentManager.getInstance();
    const instance2 = ConsentManager.getInstance();
    expect(instance1).toBe(instance2);
    expect(consentManager).toBe(instance1);
  });

  describe('grantConsent', () => {
    it('should save consent and history', async () => {
      const userId = 'user123';
      const consentType = 'analytics';
      const version = '1.0';

      await consentManager.grantConsent(userId, consentType, version);

      expect(doc).toHaveBeenCalledWith(db, 'user_consents', `${userId}_${consentType}`);
      // It also calls doc for history collection
      expect(setDoc).toHaveBeenCalledTimes(2); // Consent + History
    });
  });

  describe('withdrawConsent', () => {
    it('should withdraw optional consent', async () => {
      const userId = 'user123';
      const consentType = 'analytics';

      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => ({ version: '1.0' })
      });

      await consentManager.withdrawConsent(userId, consentType);

      expect(setDoc).toHaveBeenCalledTimes(2); // Update status + History
    });

    it('should throw error for required consent', async () => {
      const userId = 'user123';
      const consentType = 'privacy-policy'; // Required

      await expect(consentManager.withdrawConsent(userId, consentType))
        .rejects.toThrow('Cannot withdraw required consent');
    });
  });

  describe('hasConsent', () => {
      it('should return true if status is granted', async () => {
          (getDoc as jest.Mock).mockResolvedValue({
              exists: () => true,
              data: () => ({ status: 'granted' })
          });
          const result = await consentManager.hasConsent('u1', 'c1');
          expect(result).toBe(true);
      });

      it('should return false if status is not granted', async () => {
        (getDoc as jest.Mock).mockResolvedValue({
            exists: () => true,
            data: () => ({ status: 'withdrawn' })
        });
        const result = await consentManager.hasConsent('u1', 'c1');
        expect(result).toBe(false);
    });

    it('should return false if record does not exist', async () => {
        (getDoc as jest.Mock).mockResolvedValue({
            exists: () => false
        });
        const result = await consentManager.hasConsent('u1', 'c1');
        expect(result).toBe(false);
    });
  });
});
