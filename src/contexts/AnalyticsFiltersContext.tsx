import React, { createContext, useContext, useState, ReactNode } from "react";
import { DateRange } from "react-day-picker";
import { startOfMonth, endOfMonth, subDays, startOfDay, endOfDay } from "date-fns";

interface AnalyticsFilters {
  dateRange: DateRange | undefined;
  professionalId: string;
}

interface AnalyticsFiltersContextType {
  filters: AnalyticsFilters;
  setDateRange: (range: DateRange | undefined) => void;
  setProfessionalId: (id: string) => void;
  applyPreset: (days: number) => void;
}

const AnalyticsFiltersContext = createContext<AnalyticsFiltersContextType | undefined>(undefined);

export function AnalyticsFiltersProvider({ children }: { children: ReactNode }) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [professionalId, setProfessionalId] = useState<string>("all");

  const applyPreset = (days: number) => {
    const end = endOfDay(new Date());
    const start = startOfDay(subDays(end, days - 1));
    setDateRange({ from: start, to: end });
  };

  return (
    <AnalyticsFiltersContext.Provider
      value={{
        filters: { dateRange, professionalId },
        setDateRange,
        setProfessionalId,
        applyPreset,
      }}
    >
      {children}
    </AnalyticsFiltersContext.Provider>
  );
}

export function useAnalyticsFilters() {
  const context = useContext(AnalyticsFiltersContext);
  if (context === undefined) {
    throw new Error("useAnalyticsFilters must be used within an AnalyticsFiltersProvider");
  }
  return context;
}
