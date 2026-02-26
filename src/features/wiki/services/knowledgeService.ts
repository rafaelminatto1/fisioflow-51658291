import { 
  db, 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  doc, 
  query, 
  where, 
  orderBy, 
  Timestamp,
  serverTimestamp
} from '@/integrations/firebase/app';
import type { KnowledgeArtifact, KnowledgeNote } from '../types/knowledge';

const COLLECTION_KNOWLEDGE = 'knowledge_articles';
const COLLECTION_NOTES = 'knowledge_notes';

export const knowledgeService = {
  // --- Artifacts (Papers/Docs) ---

  async listArtifacts(organizationId: string, group?: string): Promise<KnowledgeArtifact[]> {
    try {
      let q = query(
        collection(db, COLLECTION_KNOWLEDGE), 
        where('organizationId', '==', organizationId)
      );

      if (group && group !== 'Todas') {
        q = query(q, where('group', '==', group));
      }

      // Order by created_at desc manually after fetch if index missing, or add simple orderBy
      // preventing index errors for now by sorting in memory
      const snapshot = await getDocs(q);
      
      const artifacts = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as KnowledgeArtifact[];

      return artifacts.sort((a, b) => {
        const tA = a.updatedAt?.toMillis?.() || 0;
        const tB = b.updatedAt?.toMillis?.() || 0;
        return tB - tA;
      });
    } catch (error) {
      console.error("Error listing knowledge artifacts:", error);
      return [];
    }
  },

  async createArtifact(data: Omit<KnowledgeArtifact, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const docRef = await addDoc(collection(db, COLLECTION_KNOWLEDGE), {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      viewCount: 0
    });
    return docRef.id;
  },

  async updateArtifact(id: string, data: Partial<KnowledgeArtifact>): Promise<void> {
    const docRef = doc(db, COLLECTION_KNOWLEDGE, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  },

  // --- Notes (NotebookLM feature) ---

  async listNotes(artifactId: string, userId: string): Promise<KnowledgeNote[]> {
    const q = query(
      collection(db, COLLECTION_NOTES),
      where('artifactId', '==', artifactId),
      where('userId', '==', userId)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({
      id: d.id,
      ...d.data()
    })) as KnowledgeNote[];
  },

  async addNote(note: Omit<KnowledgeNote, 'id' | 'createdAt'>): Promise<string> {
    const docRef = await addDoc(collection(db, COLLECTION_NOTES), {
      ...note,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  }
};
