import { useQuery } from "@tanstack/react-query";
import { patientApi } from "@/lib/api";

export function useReferral() {
  return useQuery({
    queryKey: ["referral-code"],
    queryFn: () => patientApi.getReferralCode(),
    staleTime: Infinity, // O código não muda com frequência
  });
}
