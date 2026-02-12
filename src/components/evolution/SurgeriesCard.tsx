/**
 * Card de Cirurgias na página de Evolução
 * Lista cirurgias de forma compacta
 */

import { useState, memo } from 'react';
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
  if (!surgeryDate) return '—';
  return formatDetailedDuration(surgeryDate);
}

interface SurgeriesCardProps {
  patientId: string | undefined;
}

export const SurgeriesCard = memo(function SurgeriesCard({ patientId }: SurgeriesCardProps) {
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
        <CardHeader className="pb-2 pt-3 px-4 flex flex-row items-center justify-between flex-shrink-0">
          <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
            <Scissors className="h-5 w-5 text-primary" />
            Cirurgias
            {surgeries.length > 0 && (
              <span className="ml-1 h-5 px-2 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold">
                {surgeries.length}
              </span>
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleAdd}
            className="h-8 w-8 p-0 hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
            title="Adicionar cirurgia"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </CardHeader>
        <CardContent className="px-4 pb-3 flex-1 min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : surgeries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma cirurgia registrada
            </p>
          ) : (
            <ScrollArea className="h-full pr-2">
              <ul className="space-y-2.5">
                {surgeries.map((s: Surgery) => {
                  const surgeryDate = s.surgery_date;
                  const surgeryType = s.surgery_type;
                  const affectedSide = s.affected_side;
                  const timeSince = surgeryDate ? formatTimeSinceSurgery(surgeryDate) : '—';

                  return (
                    <li
                      key={s.id}
                      className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-md bg-card/60 border border-transparent hover:border-primary/10 hover:bg-card/80 transition-all group shadow-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-base font-medium text-foreground leading-tight">
                          {s.surgery_name}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 text-sm text-muted-foreground flex-wrap">
                          {surgeryDate && (
                            <span className="font-medium">{format(new Date(surgeryDate), "dd/MM/yy", { locale: ptBR })}</span>
                          )}
                          <span className="text-border">•</span>
                          <span className="text-primary font-semibold">{timeSince}</span>
                          {surgeryType && (
                            <>
                              <span className="text-border">•</span>
                              <span className="px-2 py-0.5 rounded bg-muted text-foreground/80 font-medium">{getSurgeryTypeLabel(surgeryType)}</span>
                            </>
                          )}
                          {affectedSide && (
                            <>
                              <span className="text-border">•</span>
                              <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-medium">{getAffectedSideLabel(affectedSide)}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-0 text-muted-foreground hover:text-primary"
                        onClick={() => handleEdit(s)}
                        aria-label="Editar cirurgia"
                      >
                        <Edit2 className="h-4 w-4" />
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
});
