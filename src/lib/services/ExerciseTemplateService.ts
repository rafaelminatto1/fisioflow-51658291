import { db, collection, getDocs, query, where } from '@/integrations/firebase/app';
import type { ExerciseV2Item } from '@/components/evolution/v2/types';

export interface ExerciseTemplate {
  id: string;
  name: string;
  diagnosis_cid?: string;
  description?: string;
  exercises: Omit<ExerciseV2Item, 'id'>[];
  category?: string;
}

export class ExerciseTemplateService {
  private static COLLECTION = 'exercise_templates';

  /**
   * Get all exercise templates
   */
  static async getAllTemplates(): Promise<ExerciseTemplate[]> {
    const q = query(collection(db, this.COLLECTION));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExerciseTemplate));
  }

  /**
   * Find templates by diagnosis CID or name
   */
  static async findTemplatesByDiagnosis(diagnosis: string): Promise<ExerciseTemplate[]> {
    const templates = await this.getAllTemplates();
    const search = diagnosis.toLowerCase();
    
    return templates.filter(t => 
      t.diagnosis_cid?.toLowerCase().includes(search) ||
      t.name.toLowerCase().includes(search) ||
      t.description?.toLowerCase().includes(search)
    );
  }

  /**
   * Get a default template for a specific clinical area
   */
  static async getTemplatesByCategory(category: string): Promise<ExerciseTemplate[]> {
    const q = query(collection(db, this.COLLECTION), where('category', '==', category));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExerciseTemplate));
  }
}
