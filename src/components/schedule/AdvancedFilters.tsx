import React, { useState } from "react";
import { Filter, X, ChevronRight, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CustomModal,
  CustomModalHeader,
  CustomModalTitle,
  CustomModalBody,
  CustomModalFooter,
} from "@/components/ui/custom-modal";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { ScrollArea } from "@/components/ui/scroll-area";

interface FilterOptions {
  status: string[];
  types: string[];
  therapists: string[];
}

interface AdvancedFiltersProps {
  filters: FilterOptions;
  onChange: (filters: FilterOptions) => void;
  onClear: () => void;
  dateRange?: {
    from: string;
    to: string;
  };
  onDateRangeChange?: (range: { from: string; to: string }) => void;
}

const STATUS_OPTIONS = [
  {
    value: "agendado",
    label: "Agendado",
    color: "bg-blue-500 hover:bg-blue-600",
  },
  {
    value: "aguardando_confirmacao",
    label: "Aguardando",
    color: "bg-amber-500 hover:bg-amber-600",
  },
  {
    value: "presenca_confirmada",
    label: "Presença Confirmada",
    color: "bg-emerald-600 hover:bg-emerald-700",
  },
  {
    value: "atendido",
    label: "Atendido",
    color: "bg-purple-500 hover:bg-purple-600",
  },
  {
    value: "avaliacao",
    label: "Avaliação",
    color: "bg-violet-500 hover:bg-violet-600",
  },
  { value: "faltou", label: "Faltou", color: "bg-rose-500 hover:bg-rose-600" },
  {
    value: "faltou_com_aviso",
    label: "Faltou (com aviso)",
    color: "bg-amber-500 hover:bg-amber-600",
  },
  {
    value: "faltou_sem_aviso",
    label: "Faltou (sem aviso)",
    color: "bg-rose-700 hover:bg-rose-800",
  },
  {
    value: "remarcar",
    label: "Remarcar",
    color: "bg-orange-500 hover:bg-orange-600",
  },
  {
    value: "nao_atendido",
    label: "Não Atendido",
    color: "bg-slate-500 hover:bg-slate-600",
  },
  {
    value: "cancelado",
    label: "Cancelado",
    color: "bg-slate-900 hover:bg-slate-950",
  },
];

const TYPE_OPTIONS = [
  "Fisioterapia",
  "Consulta Inicial",
  "Reavaliação",
  "Pilates Clínico",
  "RPG",
  "Terapia Manual",
];

export const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({
  filters,
  onChange,
  onClear,
  dateRange,
  onDateRangeChange,
}) => {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const activeFiltersCount =
    filters.status.length + filters.types.length + filters.therapists.length;

  const toggleFilter = (category: keyof FilterOptions, value: string) => {
    const current = filters[category];
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];

    onChange({ ...filters, [category]: updated });
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className={cn(
          "relative gap-2 animate-slide-up-fade min-h-[44px] sm:min-h-0 rounded-xl transition-all",
          activeFiltersCount > 0
            ? "border-primary bg-primary/5 text-primary ring-1 ring-primary/20"
            : "border-slate-200",
        )}
        aria-label={
          activeFiltersCount > 0
            ? `Abrir filtros avançados (${activeFiltersCount} ativos)`
            : "Abrir filtros avançados"
        }
      >
        <Filter className="h-4 w-4" />
        <span className="hidden xs:inline">Filtros</span>
        {activeFiltersCount > 0 && (
          <Badge
            variant="default"
            className="h-5 w-5 p-0 flex items-center justify-center text-[10px] rounded-full"
          >
            {activeFiltersCount}
          </Badge>
        )}
      </Button>

      <CustomModal
        open={isOpen}
        onOpenChange={setIsOpen}
        isMobile={isMobile}
        contentClassName="max-w-md h-[80vh]"
      >
        <CustomModalHeader onClose={() => setIsOpen(false)}>
          <div className="flex flex-col gap-1">
            <CustomModalTitle className="flex items-center gap-2 text-xl font-bold">
              <SlidersHorizontal className="h-5 w-5 text-primary" />
              Filtros Avançados
            </CustomModalTitle>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              Refine a visualização da sua agenda
            </p>
          </div>
          {activeFiltersCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              className="ml-auto mr-4 h-8 text-xs font-bold text-primary hover:bg-primary/5 rounded-lg"
            >
              Limpar Tudo
            </Button>
          )}
        </CustomModalHeader>

        <CustomModalBody className="p-0 sm:p-0">
          <ScrollArea className="h-full">
            <div className="p-6 space-y-8">
              {/* Date Range Filters */}
              {dateRange && onDateRangeChange && (
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    <ChevronRight className="h-3.5 w-3.5" />
                    Período de Visualização
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase text-slate-500 pl-1">
                        Data Início
                      </label>
                      <input
                        type="date"
                        value={dateRange.from}
                        onChange={(e) =>
                          onDateRangeChange({
                            ...dateRange,
                            from: e.target.value,
                          })
                        }
                        className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold shadow-sm focus:ring-2 focus:ring-primary/20 outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase text-slate-500 pl-1">
                        Data Fim
                      </label>
                      <input
                        type="date"
                        value={dateRange.to}
                        onChange={(e) =>
                          onDateRangeChange({
                            ...dateRange,
                            to: e.target.value,
                          })
                        }
                        className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold shadow-sm focus:ring-2 focus:ring-primary/20 outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Status Filters */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <ChevronRight className="h-3.5 w-3.5" />
                  Status do Agendamento
                </h3>
                <div className="flex flex-wrap gap-2">
                  {STATUS_OPTIONS.map((option) => {
                    const isActive = filters.status.includes(option.value);
                    return (
                      <button
                        key={option.value}
                        onClick={() => toggleFilter("status", option.value)}
                        className={cn(
                          "px-3 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-2",
                          isActive
                            ? `${option.color} text-white border-transparent shadow-md scale-105`
                            : "bg-white border-slate-200 text-slate-600 hover:border-slate-300",
                        )}
                      >
                        {!isActive && (
                          <div className={cn("w-2 h-2 rounded-full", option.color.split(" ")[0])} />
                        )}
                        {option.label}
                        {isActive && <X className="h-3 w-3 ml-1 opacity-70" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Type Filters */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <ChevronRight className="h-3.5 w-3.5" />
                  Tipo de Serviço
                </h3>
                <div className="flex flex-wrap gap-2">
                  {TYPE_OPTIONS.map((type) => {
                    const isActive = filters.types.includes(type);
                    return (
                      <button
                        key={type}
                        onClick={() => toggleFilter("types", type)}
                        className={cn(
                          "px-3 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-2",
                          isActive
                            ? "bg-slate-900 text-white border-transparent shadow-md scale-105"
                            : "bg-white border-slate-200 text-slate-600 hover:border-slate-300",
                        )}
                      >
                        {type}
                        {isActive && <X className="h-3 w-3 ml-1 opacity-70" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </ScrollArea>
        </CustomModalBody>

        <CustomModalFooter isMobile={isMobile} className="bg-slate-50 border-t-0">
          <Button
            variant="ghost"
            onClick={() => setIsOpen(false)}
            className="rounded-xl h-11 px-6 font-bold text-slate-500"
          >
            Fechar
          </Button>
          <div className="flex-1" />
          <Button
            onClick={() => setIsOpen(false)}
            className="rounded-xl h-11 px-8 bg-slate-900 text-white shadow-xl shadow-slate-900/20 font-bold uppercase tracking-wider"
          >
            Ver Resultados
          </Button>
        </CustomModalFooter>
      </CustomModal>
    </>
  );
};
