import { db, collection, getDocs, query, where, orderBy, limit } from '@/integrations/firebase/app';
import { fisioLogger as logger } from '@/lib/errors/logger';

export interface EngagementStatus {
  patientId: string;
  status: 'active' | 'drifting' | 'at_risk';
  lastActivityDate?: string;
  daysSinceLastActivity: number;
  completionRate: number;
}

export class EngagementService {
  /**
   * Analyze patient engagement based on exercise completion
   */
  static async getPatientEngagement(patientId: string): Promise<EngagementStatus> {
    try {
      // Get last 10 sessions to calculate rate
      const q = query(
        collection(db, 'treatment_sessions'),
        where('patient_id', '==', patientId),
        orderBy('session_date', 'desc'),
        limit(10)
      );
      
      const snapshot = await getDocs(q);
      const sessions = snapshot.docs.map(doc => doc.data());
      
      if (sessions.length === 0) {
        return { patientId, status: 'active', daysSinceLastActivity: 0, completionRate: 0 };
      }

      const lastSession = sessions[0];
      const lastDate = new Date(lastSession.session_date);
      const today = new Date();
      const diffDays = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Simulação de taxa de conclusão (em produção viria do patient-app)
      const completionRate = 0.85; 

      let status: EngagementStatus['status'] = 'active';
      if (diffDays >= 7) status = 'at_risk';
      else if (diffDays >= 3) status = 'drifting';

      return {
        patientId,
        status,
        lastActivityDate: lastSession.session_date,
        daysSinceLastActivity: diffDays,
        completionRate
      };
    } catch (error) {
      logger.error('Failed to analyze engagement', error, 'EngagementService');
      return { patientId, status: 'active', daysSinceLastActivity: 0, completionRate: 0 };
    }
  }
}
