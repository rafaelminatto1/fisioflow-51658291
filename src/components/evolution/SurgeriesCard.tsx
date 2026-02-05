/**
 * Card de Cirurgias na página de Evolução
 * Lista cirurgias com data e tempo decorrido (X dias, Y semanas, W meses); fácil adicionar e editar.
 * Nota: ícone de cirurgia usa Scissors (lucide-react não exporta Scalpel).
 */

import { useState } from 'react';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Scissors, Plus, Edit2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePatientSurgeries } from '@/hooks/usePatientEvolution';
import { SurgeryFormModal } from '@/components/evolution/SurgeryFormModal';
import { getSurgeryTypeLabel, getAffectedSideLabel } from '@/lib/constants/surgery';
import type { Surgery } from '@/types/evolution';

/** Formata tempo desde a cirurgia: "X dias, Y semanas e W meses" (totais desde a data) */
export function formatTimeSinceSurgery(surgeryDate: string): string {
  const now = new Date();
  const date = new Date(surgeryDate);
  const totalDays = differenceInDays(now, date);

  if (totalDays < 0) return 'Data futura';
  if (totalDays === 0) return 'Hoje';

  const totalWeeks = Math.floor(totalDays / 7);
  const totalMonths = Math.floor(totalDays / 30);

  const parts: string[] = [];
  parts.push(`${totalDays} ${totalDays === 1 ? 'dia' : 'dias'}`);
  if (totalWeeks > 0) parts.push(`${totalWeeks} ${totalWeeks === 1 ? 'semana' : 'semanas'}`);
  if (totalMonths > 0) parts.push(`${totalMonths} ${totalMonths === 1 ? 'mês' : 'meses'}`);

  return parts.join(', ');
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
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-1.5 pt-3 px-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Scissors className="h-3.5 w-3.5 text-primary" />
            Cirurgias
          </CardTitle>
          <Button variant="outline" size="sm" onClick={handleAdd} className="h-7 gap-0.5">
            <Plus className="h-3 w-3" />
            Adicionar
          </Button>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : surgeries.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Nenhuma cirurgia registrada. Clique em Adicionar para incluir.
            </p>
          ) : (
            <ScrollArea className="h-[min(200px,40vh)] pr-1">
              <ul className="space-y-2">
                {surgeries.map((s) => {
                  const surgeryDate = (s as Record<string, unknown>).surgery_date as string;
                  const surgeryType = (s as Record<string, unknown>).surgery_type as string | undefined;
                  const affectedSide = (s as Record<string, unknown>).affected_side as string | undefined;
                  const notes = (s as Record<string, unknown>).notes as string | undefined;
                  const timeSince = surgeryDate ? formatTimeSinceSurgery(surgeryDate) : '—';
                  return (
                    <li
                      key={s.id}
                      className="flex items-start justify-between gap-2 p-2 rounded-md border border-border/50 hover:bg-muted/40 transition-colors group"
                    >
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <p className="font-medium text-xs truncate">
                          {(s as Record<string, unknown>).surgery_name as string}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-muted-foreground">
                          {surgeryType && (
                            <span className="inline-block px-1 py-0.5 rounded bg-muted font-medium">
                              {getSurgeryTypeLabel(surgeryType)}
                            </span>
                          )}
                          {affectedSide && (
                            <span className="inline-block px-1 py-0.5 rounded bg-primary/10 text-primary font-medium">
                              {getAffectedSideLabel(affectedSide)}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          {surgeryDate
                            ? format(new Date(surgeryDate), "dd/MM/yyyy", { locale: ptBR })
                            : '—'}{' '}
                          · {timeSince}
                        </p>
                        {notes && (
                          <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                            {notes}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 shrink-0 opacity-70 group-hover:opacity-100"
                        onClick={() => handleEdit(s as Surgery)}
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
