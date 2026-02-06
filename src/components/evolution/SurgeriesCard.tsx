/**
 * Card de Cirurgias na página de Evolução
 * Lista cirurgias de forma compacta
 */


/** Formata tempo desde a cirurgia de forma compacta */

import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatDetailedDuration } from '@/utils/dateUtils';
import { Scissors, Plus, Edit2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePatientSurgeries } from '@/hooks/usePatientEvolution';
import { SurgeryFormModal } from '@/components/evolution/SurgeryFormModal';
import { getSurgeryTypeLabel, getAffectedSideLabel } from '@/lib/constants/surgery';
import type { Surgery } from '@/types/evolution';
function formatTimeSinceSurgery(surgeryDate: string): string {
  return formatDetailedDuration(surgeryDate);
}

interface SurgeriesCardProps {
  patientId: string | undefined;
}

export function SurgeriesCard({ patientId }: SurgeriesCardProps) {
  const { data: surgeries = [], isLoading } = usePatientSurgeries(patientId || '');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSurgery, setEditingSurgery] = useState<Surgery | null>(null);

  const handleAdd = () => {
    setEditingSurgery(null);
    setModalOpen(true);
  };

  const handleEdit = (s: Surgery) => {
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
      <Card className="border-primary/20 bg-primary/5 shadow-sm flex flex-col">
        <CardHeader className="pb-1.5 pt-2.5 px-3 flex flex-row items-center justify-between flex-shrink-0">
          <CardTitle className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
            <Scissors className="h-3 w-3 text-primary" />
            Cirurgias
            {surgeries.length > 0 && (
              <span className="ml-1 h-4 px-1 rounded-full bg-primary/10 text-primary text-[9px] flex items-center justify-center">
                {surgeries.length}
              </span>
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleAdd}
            className="h-6 w-6 p-0 hover:bg-primary/10"
            title="Adicionar cirurgia"
          >
            <Plus className="h-2.5 w-2.5" />
          </Button>
        </CardHeader>
        <CardContent className="px-3 pb-2.5 flex-1 min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : surgeries.length === 0 ? (
            <p className="text-[10px] text-muted-foreground text-center py-6">
              Nenhuma cirurgia registrada
            </p>
          ) : (
            <ScrollArea className="h-full pr-1">
              <ul className="space-y-1">
                {surgeries.map((s: any) => {
                  const surgeryDate = s.surgery_date as string;
                  const surgeryType = s.surgery_type as string | undefined;
                  const affectedSide = s.affected_side as string | undefined;
                  const timeSince = surgeryDate ? formatTimeSinceSurgery(surgeryDate) : '—';

                  return (
                    <li
                      key={s.id}
                      className="flex items-center justify-between gap-2 px-2 py-1 rounded bg-card/40 hover:bg-card/60 transition-colors group"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-medium truncate">
                          {s.surgery_name as string}
                        </p>
                        <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
                          {surgeryDate && (
                            <span>{format(new Date(surgeryDate), "dd/MM/yy", { locale: ptBR })}</span>
                          )}
                          <span>·</span>
                          <span className="text-primary">{timeSince}</span>
                          {surgeryType && (
                            <>
                              <span>·</span>
                              <span className="px-1 py-0 rounded bg-muted/50">{getSurgeryTypeLabel(surgeryType)}</span>
                            </>
                          )}
                          {affectedSide && (
                            <>
                              <span>·</span>
                              <span className="px-1 py-0 rounded bg-primary/10 text-primary">{getAffectedSideLabel(affectedSide)}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-0"
                        onClick={() => handleEdit(s as Surgery)}
                        aria-label="Editar cirurgia"
                      >
                        <Edit2 className="h-2.5 w-2.5" />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <SurgeryFormModal
        open={modalOpen}
        onOpenChange={handleCloseModal}
        patientId={patientId}
        surgery={editingSurgery}
      />
    </>
  );
}
