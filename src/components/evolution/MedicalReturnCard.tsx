/**
 * Card de Retorno Médico na página de Evolução
 * Exibe e permite editar: data do retorno, médico, telefone; link para relatório médico
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Stethoscope, FileText, Plus, Edit2, Phone, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { usePatientMedicalReturns } from '@/hooks/usePatientEvolution';
import { MedicalReturnFormModal } from '@/components/evolution/MedicalReturnFormModal';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { fisioLogger as logger } from '@/lib/errors/logger';
import type { Patient } from '@/types';
import type { MedicalReturn } from '@/types/evolution';

interface MedicalReturnCardProps {
  patient: Patient | null | undefined;
  patientId: string | undefined;
  onPatientUpdated?: () => void;
}

export function MedicalReturnCard({ patient, patientId, onPatientUpdated }: MedicalReturnCardProps) {
  const navigate = useNavigate();
  const {
    data: medicalReturns = [],
    isLoading,
    error,
    refetch,
    isFetching,
  } = usePatientMedicalReturns(patientId || '');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingReturn, setEditingReturn] = useState<MedicalReturn | null>(null);
  const hasQueryError = !!error && medicalReturns.length === 0;

  useEffect(() => {
    if (!error) return;

    const typedError = error as { code?: string; message?: string };
    logger.error(
      'Erro ao carregar retornos médicos do paciente',
      {
        patientId,
        code: typedError.code,
        message: typedError.message,
      },
      'MedicalReturnCard'
    );
  }, [error, patientId]);

  const handleAdd = () => {
    setEditingReturn(null);
    setModalOpen(true);
  };

  const handleEdit = (r: MedicalReturn) => {
    setEditingReturn(r);
    setModalOpen(true);
  };

  const handleCloseModal = (open: boolean) => {
    setModalOpen(open);
    if (!open) setEditingReturn(null);
  };

  const goToRelatorio = () => {
    if (patientId) {
      navigate(`/relatorios/medico?patientId=${patientId}`);
    }
  };

  const getPeriodLabel = (period?: string) => {
    switch (period) {
      case 'manha': return 'Manhã';
      case 'tarde': return 'Tarde';
      case 'noite': return 'Noite';
      default: return null;
    }
  };

  if (!patientId) return null;

  return (
    <>
      <Card className="border-primary/20 bg-primary/5 shadow-sm flex flex-col">
        <CardHeader className="pb-2 pt-3 px-4 flex flex-row items-center justify-between flex-shrink-0">
          <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
            <Stethoscope className="h-5 w-5 text-primary" />
            Retorno Médico
            {medicalReturns.length > 0 && (
              <span className="ml-1 h-5 px-2 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold">
                {medicalReturns.length}
              </span>
            )}
          </CardTitle>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={goToRelatorio}
              className="h-8 px-3 text-xs font-medium gap-2 hover:bg-primary/10 border-primary/20"
              title="Gerar Relatório Médico"
            >
              <FileText className="h-3.5 w-3.5" />
              Relatório
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAdd}
              className="h-8 w-8 p-0 hover:bg-primary/10"
              title="Adicionar retorno"
            >
              <Plus className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-3 flex-1 min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : hasQueryError ? (
            <div className="text-center py-6 space-y-3">
              <p className="text-sm text-muted-foreground">
                Não foi possível carregar os retornos médicos.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs gap-2"
                onClick={() => refetch()}
                disabled={isFetching}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                Tentar novamente
              </Button>
            </div>
          ) : medicalReturns.length === 0 ? (
            <div className="text-center py-6 space-y-3">
              <p className="text-sm text-muted-foreground">
                Nenhum retorno médico registrado
              </p>
              {patient?.referring_doctor_name && (
                <div className="pt-3 border-t border-primary/10">
                  <p className="text-sm font-medium text-foreground">Médico Assistente:</p>
                  <p className="text-sm text-muted-foreground">{patient.referring_doctor_name}</p>
                </div>
              )}
            </div>
          ) : (
            <ScrollArea className="h-full pr-2">
              <ul className="space-y-2.5">
                {medicalReturns.map((r) => {
                  const returnDate = r.return_date;
                  const period = getPeriodLabel(r.return_period);
                  const isUpcoming = returnDate ? new Date(returnDate) > new Date() : false;

                  return (
                    <li
                      key={r.id}
                      className="flex flex-col gap-2 p-3 rounded-md bg-card/60 border border-transparent hover:border-primary/10 hover:bg-card/80 transition-all group relative shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-base font-medium text-foreground leading-tight">
                            {r.doctor_name}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5 text-sm text-muted-foreground flex-wrap">
                            <span className={`flex items-center gap-1.5 ${isUpcoming ? "text-primary font-semibold" : ""}`}>
                              {returnDate ? format(new Date(returnDate), "dd/MM/yy", { locale: ptBR }) : '—'}
                            </span>
                            {period && (
                              <>
                                <span className="text-border">•</span>
                                <span className="text-foreground/80">{period}</span>
                              </>
                            )}
                            {r.doctor_phone && (
                              <>
                                <span className="text-border">•</span>
                                <span className="flex items-center gap-1.5 hover:text-primary transition-colors cursor-pointer">
                                  <Phone className="h-3.5 w-3.5" />
                                  {r.doctor_phone}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-0 text-muted-foreground hover:text-primary"
                          onClick={() => handleEdit(r)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="flex gap-2 mt-1">
                        {r.report_done ? (
                          <Badge variant="outline" className="h-6 text-xs font-medium bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20 px-2 gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Relatório OK
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="h-6 text-xs font-medium bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20 px-2 gap-1.5">
                            <AlertCircle className="h-3.5 w-3.5" />
                            Pendente
                          </Badge>
                        )}
                        {r.report_sent && (
                          <Badge variant="outline" className="h-6 text-xs font-medium bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20 px-2 gap-1.5">
                            <FileText className="h-3.5 w-3.5" />
                            Enviado
                          </Badge>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <MedicalReturnFormModal
        open={modalOpen}
        onOpenChange={handleCloseModal}
        patientId={patientId}
        medicalReturn={editingReturn}
        onSuccess={onPatientUpdated}
      />
    </>
  );
}
