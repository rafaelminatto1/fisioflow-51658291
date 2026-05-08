import { useState, useEffect } from "react";
import { useOrganizations } from "@/hooks/useOrganizations";
import { useClinicHealthKPIs } from "@/hooks/useClinicHealthKPIs";

export function useBIMetrics() {
  const { currentOrganization, updateOrganization, isUpdating } = useOrganizations();
  const { data: kpis, isLoading: isKPIsLoading } = useClinicHealthKPIs();
  
  const [cacValue, setCacValue] = useState<number>(0);

  // Sync CAC from organization settings
  useEffect(() => {
    if (currentOrganization?.settings?.bi_cac) {
      setCacValue(Number(currentOrganization.settings.bi_cac));
    }
  }, [currentOrganization]);

  const handleSaveCAC = async (newCac: number) => {
    if (!currentOrganization?.id) return;
    
    await updateOrganization({
      id: currentOrganization.id,
      settings: {
        ...currentOrganization.settings,
        bi_cac: newCac,
      },
    });
    setCacValue(newCac);
  };

  const ltv = kpis?.ltv_estimate ?? 0;
  const ltvCacRatio = cacValue > 0 ? ltv / cacValue : null;
  const avgTicket = kpis?.avg_ticket ?? 0;
  const sessionsPerMonth = (kpis?.avg_sessions_per_patient_6m ?? 0) / 6;
  
  // Payback = CAC / Margem Mensal (considerando ticket médio e sessões por mês)
  const paybackMonths = cacValue > 0 && avgTicket > 0 && sessionsPerMonth > 0
    ? cacValue / (avgTicket * sessionsPerMonth)
    : null;

  return {
    kpis,
    cacValue,
    ltvCacRatio,
    paybackMonths,
    isLoading: isKPIsLoading || isUpdating,
    saveCAC: handleSaveCAC,
  };
}
