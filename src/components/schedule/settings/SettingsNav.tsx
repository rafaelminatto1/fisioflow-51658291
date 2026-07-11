import { CalendarClock, CalendarOff, Palette, Shield, SlidersHorizontal } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TabValue } from "./tabRedirects";

export interface NavItem {
  value: TabValue;
  label: string;
  description: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { value: "funcionamento", label: "Funcionamento", description: "Horários, slots e capacidade", icon: CalendarClock },
  { value: "atendimentos", label: "Atendimentos", description: "Tipos e status", icon: Shield },
  { value: "disponibilidade", label: "Disponibilidade", description: "Bloqueios e folgas", icon: CalendarOff },
  { value: "politicas", label: "Políticas", description: "Cancelamento e lembretes", icon: Palette },
  { value: "aparencia", label: "Aparência", description: "Densidade e visual", icon: SlidersHorizontal },
];

export function SettingsNav({
  active,
  onSelect,
}: {
  active: TabValue;
  onSelect: (v: TabValue) => void;
}) {
  return (
    <nav className="flex flex-col space-y-1">
      {NAV_ITEMS.map((item) => {
        const isActive = active === item.value;
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onSelect(item.value)}
            className={cn(
              "group flex flex-col items-start gap-0.5 text-left transition-all py-2.5 border-l-2 pl-4",
              isActive
                ? "border-slate-900 dark:border-slate-50 opacity-100"
                : "border-transparent opacity-60 hover:opacity-100 hover:border-slate-200 dark:hover:border-slate-800",
            )}
          >
            <span
              className={cn(
                "text-sm font-semibold tracking-tight",
                isActive ? "text-slate-900 dark:text-slate-50" : "text-slate-600 dark:text-slate-400"
              )}
            >
              {item.label}
            </span>
            <span className="text-[11px] font-medium text-slate-500">
              {item.description}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
