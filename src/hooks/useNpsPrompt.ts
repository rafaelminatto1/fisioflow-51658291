import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganizations } from "./useOrganizations";

const STORAGE_KEY = "fisioflow:nps-dismissed-at";
const SNOOZE_DAYS = 30;

export function useNpsPrompt() {
  const { user } = useAuth();
  const { currentOrganization, isCurrentOrgLoading } = useOrganizations();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user || isCurrentOrgLoading || !currentOrganization) return;

    const dismissedAt = localStorage.getItem(STORAGE_KEY);
    if (dismissedAt) {
      const daysSince = (Date.now() - Number(dismissedAt)) / 86_400_000;
      if (daysSince < SNOOZE_DAYS) return;
    }

    const createdAt = new Date(currentOrganization.created_at ?? 0).getTime();
    const ageDays = (Date.now() - createdAt) / 86_400_000;

    // Show prompt between day 7 and day 60
    if (ageDays >= 7 && ageDays <= 60) {
      // Slight delay so it doesn't flash on page load
      const timer = setTimeout(() => setOpen(true), 5000);
      return () => clearTimeout(timer);
    }
  }, [user, currentOrganization, isCurrentOrgLoading]);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
    setOpen(false);
  };

  return { open, dismiss };
}
