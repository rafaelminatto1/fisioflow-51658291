/**
 * Card de Cirurgias na página de Evolução
 * Lista cirurgias de forma compacta
 */

import { useState, memo, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatDetailedDuration } from "@/utils/dateUtils";
import { Scissors, Plus, Edit2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePatientSurgeries } from "@/hooks/usePatientEvolution";
import { SurgeryFormModal } from "@/components/evolution/SurgeryFormModal";
import { getSurgeryTypeLabel, getAffectedSideAbbreviation } from "@/lib/constants/surgery";
import type { Surgery } from "@/types/evolution";

function formatTimeSinceSurgery(surgeryDate: string): string {
  if (!surgeryDate) return "—";
  return formatDetailedDuration(surgeryDate);
}

interface SurgeriesCardProps {
  patientId: string | undefined;
  defaultCollapsed?: boolean;
}

export const SurgeriesCard = memo(function SurgeriesCard({
  patientId,
  defaultCollapsed = false,
}: SurgeriesCardProps) {
  const { data: surgeries = [], isLoading } = usePatientSurgeries(patientId || "");
  const [modalOpen, setModalOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [editingSurgery, setEditingSurgery] = useState<Surgery | null>(null);

  // Colapsar automaticamente se não houver registros
  useEffect(() => {
    if (!isLoading && surgeries.length === 0) {
      setIsCollapsed(true);
    } else if (surgeries.length > 0) {
      setIsCollapsed(false);
    }
  }, [surgeries.length, isLoading]);

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSurgery(null);
    setModalOpen(true);
  };

  const handleEdit = (s: Surgery, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSurgery(s);
    setModalOpen(true);
  };

  const handleCloseModal = (open: boolean) => {
    setModalOpen(open);
    if (!open) setEditingSurgery(null);
  };

  if (!patientId) return null;

  return (
    <>
      <Card
        className={cn(
          "border-primary/10 bg-white shadow-sm transition-all duration-300 flex flex-col hover:border-primary/30",
          isCollapsed && "cursor-pointer hover:bg-slate-50/50",
        )}
        onClick={() => isCollapsed && setIsCollapsed(false)}
      >
        <CardHeader
          className={cn(
            "pb-2 pt-3 px-4 flex flex-row items-center justify-between flex-shrink-0 select-none",
            isCollapsed && "pb-3",
          )}
        >
          <div
            className="flex items-center gap-2 flex-1 cursor-pointer"
            onClick={(e) => {
              if (!isCollapsed) {
                e.stopPropagation();
                setIsCollapsed(true);
              }
            }}
          >
            <Scissors
              className={cn(
                "h-5 w-5 transition-colors",
                surgeries.length > 0 ? "text-primary" : "text-slate-400",
              )}
            />
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              Cirurgias
              {surgeries.length > 0 && (
                <Badge
                  variant="secondary"
                  className="bg-primary/5 text-primary border-primary/10 hover:bg-primary/10 h-5 px-1.5 font-bold"
                >
                  {surgeries.length}
                </Badge>
              )}
            </CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleAdd}
            className="h-7 w-7 p-0 hover:bg-primary/5 text-slate-400 hover:text-primary transition-colors"
            title="Adicionar cirurgia"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </CardHeader>

        {!isCollapsed && (
          <CardContent className="px-4 pb-3 flex-1 min-h-0 animate-in fade-in slide-in-from-top-1 duration-200">
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <RefreshCw className="h-4 w-4 text-primary/40 animate-spin" />
              </div>
            ) : surgeries.length === 0 ? (
              <div className="text-center py-4 border-t border-slate-50 mt-1">
                <p className="text-xs text-slate-400 italic">Nenhuma cirurgia</p>
              </div>
            ) : (
              <ScrollArea className="max-h-[200px] pr-2">
                <ul className="space-y-2">
                  {surgeries.map((s: Surgery) => {
                    const surgeryDate = s.surgery_date;
                    const surgeryType = s.surgery_type;
                    const affectedSide = s.affected_side;
                    const timeSince = surgeryDate ? formatTimeSinceSurgery(surgeryDate) : "—";

                    return (
                      <li
                        key={s.id}
                        className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-50/50 border border-slate-100 hover:border-primary/20 hover:bg-white transition-all group relative"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-slate-700 leading-tight">
                            {s.surgery_name}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500 font-medium flex-wrap">
                            {surgeryDate && (
                              <span>
                                {format(new Date(surgeryDate), "dd/MM/yy", {
                                  locale: ptBR,
                                })}
                              </span>
                            )}
                            <span className="text-slate-300">•</span>
                            <span className="text-primary font-bold">{timeSince}</span>
                            {surgeryType && (
                              <>
                                <span className="text-slate-300">•</span>
                                <span className="bg-slate-200/50 px-1 rounded">
                                  {getSurgeryTypeLabel(surgeryType)}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 p-0 text-slate-400 hover:text-primary transition-all"
                          onClick={(e) => handleEdit(s, e)}
                          aria-label="Editar cirurgia"
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              </ScrollArea>
            )}
          </CardContent>
        )}
      </Card>

      <SurgeryFormModal
        open={modalOpen}
        onOpenChange={handleCloseModal}
        patientId={patientId}
        surgery={editingSurgery}
      />
    </>
  );
});
