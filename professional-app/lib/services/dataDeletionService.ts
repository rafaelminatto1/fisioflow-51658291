import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  serverTimestamp, 
  addDoc,
  query,
  where,
  getDocs,
  updateDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { DataDeletionRequest, DeletionStatus } from '@/types/dataDeletion';

export class DataDeletionService {
  private static instance: DataDeletionService;

  private constructor() {}

  static getInstance(): DataDeletionService {
    if (!DataDeletionService.instance) {
      DataDeletionService.instance = new DataDeletionService();
    }
    return DataDeletionService.instance;
  }

  /**
   * Request data deletion
   */
  async requestDeletion(
    userId: string,
    reason?: string
  ): Promise<DataDeletionRequest> {
    const deletionRef = collection(db, 'deletion_requests');
    
    // Check if there is already a pending request
    const existing = await this.getDeletionStatus(userId);
    if (existing && existing.status === 'pending') {
      throw new Error('Já existe uma solicitação de exclusão pendente para esta conta.');
    }

    const now = new Date();
    const scheduledFor = new Date();
    scheduledFor.setDate(now.getDate() + 30); // 30 days grace period

    const requestData: Omit<DataDeletionRequest, 'id'> = {
      userId,
      requestedAt: now,
      scheduledFor,
      status: 'pending',
      reason,
      confirmationToken: Math.random().toString(36).substring(2, 15) // Simple token for simulation
    };

    const docRef = await addDoc(deletionRef, {
      ...requestData,
      requestedAt: serverTimestamp(),
      scheduledFor: scheduledFor, // Firestore handles JS Date
    });

    return {
      id: docRef.id,
      ...requestData,
    };
  }

  /**
   * Get current deletion status for a user
   */
  async getDeletionStatus(userId: string): Promise<DataDeletionRequest | null> {
    const q = query(
      collection(db, 'deletion_requests'),
      where('userId', '==', userId),
      where('status', '==', 'pending')
    );
    
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    
    const doc = snapshot.docs[0];
    const data = doc.data();
    
    return {
      id: doc.id,
      ...data,
      requestedAt: data.requestedAt?.toDate ? data.requestedAt.toDate() : data.requestedAt,
      scheduledFor: data.scheduledFor?.toDate ? data.scheduledFor.toDate() : data.scheduledFor,
    } as DataDeletionRequest;
  }

  /**
   * Cancel deletion request
   */
  async cancelDeletion(deletionId: string, userId: string): Promise<void> {
    const docRef = doc(db, 'deletion_requests', deletionId);
    const snapshot = await getDoc(docRef);
    
    if (!snapshot.exists()) throw new Error('Solicitação não encontrada.');
    if (snapshot.data().userId !== userId) throw new Error('Não autorizado.');
    
    await updateDoc(docRef, {
      status: 'cancelled',
      cancelledAt: serverTimestamp(),
    });
  }
}

export const dataDeletionService = DataDeletionService.getInstance();
