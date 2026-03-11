import { patientApi } from '@/lib/api';
import { asyncResult, Result } from '@/lib/async';
import { perf } from '@/lib/performance';

export function subscribeToEvolutions(
  userId: string,
  callback: (evolutions: any[]) => void,
): () => void {
  const load = async () => {
    const result = await getEvolutions(userId);
    callback(result.success ? result.data ?? [] : []);
  };

  load();
  const interval = setInterval(load, 30000);
  return () => clearInterval(interval);
}

export async function getEvolutions(
  _userId: string,
  startDate?: Date,
  endDate?: Date,
): Promise<Result<any[]>> {
  return asyncResult(async () => {
    perf.start('api_get_evolutions');
    const progress = await patientApi.getProgress();
    perf.end('api_get_evolutions', true);

    let evolutions = progress.evolutions || [];
    if (startDate || endDate) {
      evolutions = evolutions.filter((evolution: any) => {
        const evolutionDate = new Date(evolution.record_date || evolution.date || Date.now());
        if (startDate && evolutionDate < startDate) return false;
        if (endDate && evolutionDate > endDate) return false;
        return true;
      });
    }

    return evolutions;
  }, 'getEvolutions');
}

export async function getEvolutionStats(userId: string): Promise<Result<any>> {
  return asyncResult(async () => {
    perf.start('api_get_evolution_stats');
    const evolutionsResult = await getEvolutions(userId);
    const evolutions = evolutionsResult.success ? evolutionsResult.data ?? [] : [];

    if (evolutions.length === 0) {
      return {
        totalSessions: 0,
        averagePain: 0,
        painImprovement: 0,
        totalDays: 0,
      };
    }

    const totalSessions = evolutions.length;
    const painLevels = evolutions.map((evolution: any) => evolution.pain_level || 0);
    const averagePain = painLevels.reduce((sum: number, value: number) => sum + value, 0) / painLevels.length;

    const dates = evolutions
      .map((evolution: any) => new Date(evolution.record_date || evolution.date || Date.now()))
      .sort((a: Date, b: Date) => a.getTime() - b.getTime());

    const firstDate = dates[0];
    const lastDate = dates[dates.length - 1];
    const totalDays = Math.max(
      1,
      Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)),
    );

    const firstPain = evolutions[evolutions.length - 1]?.pain_level || 0;
    const lastPain = evolutions[0]?.pain_level || 0;
    const painImprovement = firstPain - lastPain;

    perf.end('api_get_evolution_stats', true);

    return {
      totalSessions,
      averagePain: Math.round(averagePain * 10) / 10,
      painImprovement: Math.round(painImprovement * 10) / 10,
      totalDays,
    };
  }, 'getEvolutionStats');
}
