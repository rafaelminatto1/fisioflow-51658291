import { useQuery } from '@tanstack/react-query';
import { FinancialService, FinancialReport } from '@/services/financialService';

export type { FinancialReport };

export function useEventoFinancialReport(eventoId: string) {
  return useQuery({
    queryKey: ["evento-financial-report", eventoId],
    queryFn: () => FinancialService.getEventReport(eventoId),
  });
}
