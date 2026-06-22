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
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = active === item.value;
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onSelect(item.value)}
            className={cn(
              "group flex w-full items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-left transition",
              isActive
                ? "border-blue-200 bg-blue-50 text-blue-950 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100"
                : "hover:bg-slate-50 dark:hover:bg-slate-900",
            )}
          >
            <span
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
                isActive
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
              )}
            >
              <Icon className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{item.label}</span>
              <span className="mt-0.5 block truncate text-[11px] font-normal text-muted-foreground">
                {item.description}
              </span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}
