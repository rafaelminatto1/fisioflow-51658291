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
    <nav className="flex flex-col space-y-4">
      {NAV_ITEMS.map((item) => {
        const isActive = active === item.value;
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onSelect(item.value)}
            className={cn(
              "group relative flex items-center text-left transition-all",
              isActive ? "opacity-100" : "opacity-40 hover:opacity-100",
            )}
          >
            {isActive && (
              <span className="absolute -left-6 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-slate-900 dark:bg-slate-50" />
            )}
            <span className={cn("text-base font-medium tracking-tight", isActive ? "text-slate-900 dark:text-slate-50" : "text-slate-600 dark:text-slate-400")}>
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
