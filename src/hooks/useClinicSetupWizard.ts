import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { patientsApi } from "@/api/v2";
import { useOrganizations } from "./useOrganizations";

const STORAGE_KEY = "fisioflow:setup-wizard-dismissed";

export function useClinicSetupWizard() {
  const { currentOrganization, isCurrentOrgLoading } = useOrganizations();
  const [open, setOpen] = useState(false);

  const dismissed = typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY) === "true";

  const { data: patients, isLoading: patientsLoading } = useQuery({
    queryKey: ["patients", "setup-check"],
    queryFn: () => patientsApi.list({ limit: 1 }),
    enabled: !dismissed && !isCurrentOrgLoading && !!currentOrganization,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (dismissed || isCurrentOrgLoading || patientsLoading) return;
    if (!currentOrganization) return;

    const patientCount = (patients as any)?.data?.length ?? 0;

    // Fire wizard for orgs created in last 72h with no patients yet
    const createdAt = new Date(currentOrganization.created_at ?? 0).getTime();
    const ageHours = (Date.now() - createdAt) / 3_600_000;

    if (patientCount === 0 && ageHours < 72) {
      setOpen(true);
    }
  }, [currentOrganization, isCurrentOrgLoading, patients, patientsLoading, dismissed]);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setOpen(false);
  };

  return { open, dismiss };
}
