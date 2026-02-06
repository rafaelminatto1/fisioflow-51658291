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
        <CardHeader className="pb-1.5 pt-2.5 px-3 flex flex-row items-center justify-between flex-shrink-0">
          <CardTitle className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
            <Stethoscope className="h-3 w-3 text-primary" />
            Retorno Médico
            {medicalReturns.length > 0 && (
              <span className="ml-1 h-4 px-1 rounded-full bg-primary/10 text-primary text-[9px] flex items-center justify-center">
                {medicalReturns.length}
              </span>
            )}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={goToRelatorio}
              className="h-6 px-2 text-[9px] gap-1 hover:bg-primary/10 border-primary/20"
              title="Gerar Relatório Médico"
            >
              <FileText className="h-2.5 w-2.5" />
              Relatório
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAdd}
              className="h-6 w-6 p-0 hover:bg-primary/10"
              title="Adicionar retorno"
            >
              <Plus className="h-2.5 w-2.5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-3 pb-2.5 flex-1 min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : hasQueryError ? (
            <div className="text-center py-4 space-y-2">
              <p className="text-[10px] text-muted-foreground">
                Não foi possível carregar os retornos médicos.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="h-6 text-[10px] gap-1"
                onClick={() => refetch()}
                disabled={isFetching}
              >
                <RefreshCw className={`h-2.5 w-2.5 ${isFetching ? 'animate-spin' : ''}`} />
                Tentar novamente
              </Button>
            </div>
          ) : medicalReturns.length === 0 ? (
            <div className="text-center py-4 space-y-2">
              <p className="text-[10px] text-muted-foreground">
                Nenhum retorno médico registrado
              </p>
              {patient?.referring_doctor_name && (
                <div className="pt-2 border-t border-primary/10">
                  <p className="text-[9px] font-medium text-foreground">Médico Assistente:</p>
                  <p className="text-[9px] text-muted-foreground">{patient.referring_doctor_name}</p>
                </div>
              )}
            </div>
          ) : (
            <ScrollArea className="h-full pr-1">
              <ul className="space-y-1.5">
                {medicalReturns.map((r) => {
                  const returnDate = r.return_date;
                  const period = getPeriodLabel(r.return_period);
                  const isUpcoming = returnDate ? new Date(returnDate) > new Date() : false;

                  return (
                    <li
                      key={r.id}
                      className="flex flex-col gap-1 p-2 rounded bg-card/40 hover:bg-card/60 transition-colors group relative"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-medium truncate">
                            {r.doctor_name}
                          </p>
                          <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground flex-wrap">
                            <span className={isUpcoming ? "text-primary font-medium" : ""}>
                              {returnDate ? format(new Date(returnDate), "dd/MM/yy", { locale: ptBR }) : '—'}
                            </span>
                            {period && (
                              <>
                                <span>·</span>
                                <span className="text-xs text-primary/70">{period}</span>
                              </>
                            )}
                            {r.doctor_phone && (
                              <>
                                <span>·</span>
                                <span className="flex items-center gap-0.5">
                                  <Phone className="h-2 w-2" />
                                  {r.doctor_phone}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-0"
                          onClick={() => handleEdit(r)}
                        >
                          <Edit2 className="h-2.5 w-2.5" />
                        </Button>
                      </div>

                      <div className="flex gap-2">
                        {r.report_done ? (
                          <Badge variant="outline" className="h-4 text-[8px] bg-green-500/10 text-green-600 border-green-500/20 px-1 gap-0.5">
                            <CheckCircle2 className="h-2 w-2" />
                            Relatório OK
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="h-4 text-[8px] bg-yellow-500/10 text-yellow-600 border-yellow-500/20 px-1 gap-0.5">
                            <AlertCircle className="h-2 w-2" />
                            Pendente
                          </Badge>
                        )}
                        {r.report_sent && (
                          <Badge variant="outline" className="h-4 text-[8px] bg-blue-500/10 text-blue-600 border-blue-500/20 px-1 gap-0.5">
                            <FileText className="h-2 w-2" />
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
