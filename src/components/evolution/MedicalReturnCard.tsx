/**
 * Card de Retorno Médico na página de Evolução
 * Exibe e permite editar: data do retorno, médico, telefone; link para relatório médico
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Stethoscope, FileText, Plus, Edit2, Save, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useUpdatePatient } from '@/hooks/usePatientCrud';
import { useToast } from '@/hooks/use-toast';
import type { Patient } from '@/types';

interface MedicalReturnCardProps {
  patient: Patient | null | undefined;
  patientId: string | undefined;
  onPatientUpdated?: () => void;
}

export function MedicalReturnCard({ patient, patientId, onPatientUpdated }: MedicalReturnCardProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const updatePatient = useUpdatePatient();

  const [editing, setEditing] = useState(false);
  const [doctorName, setDoctorName] = useState(
    patient?.referring_doctor_name ?? (patient as Record<string, unknown>)?.referringDoctorName ?? ''
  );
  const [doctorPhone, setDoctorPhone] = useState(
    patient?.referring_doctor_phone ?? (patient as Record<string, unknown>)?.referringDoctorPhone ?? ''
  );
  const [returnDate, setReturnDate] = useState(
    patient?.medical_return_date ?? (patient as Record<string, unknown>)?.medicalReturnDate ?? ''
  );

  const reportDone = patient?.medical_report_done ?? (patient as Record<string, unknown>)?.medicalReportDone ?? false;
  const reportSent = patient?.medical_report_sent ?? (patient as Record<string, unknown>)?.medicalReportSent ?? false;

  const hasAnyData = doctorName || doctorPhone || returnDate;

  const handleSave = async () => {
    if (!patientId) return;
    try {
      await updatePatient.mutateAsync({
        id: patientId,
        data: {
          referring_doctor_name: doctorName || undefined,
          referring_doctor_phone: doctorPhone || undefined,
          medical_return_date: returnDate || undefined,
        },
      });
      setEditing(false);
      onPatientUpdated?.();
      toast({ title: 'Retorno médico atualizado', description: 'Dados salvos com sucesso.' });
    } catch {
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível atualizar o retorno médico.',
        variant: 'destructive',
      });
    }
  };

  const handleCancel = () => {
    setDoctorName(patient?.referring_doctor_name ?? (patient as Record<string, unknown>)?.referringDoctorName ?? '');
    setDoctorPhone(patient?.referring_doctor_phone ?? (patient as Record<string, unknown>)?.referringDoctorPhone ?? '');
    setReturnDate(patient?.medical_return_date ?? (patient as Record<string, unknown>)?.medicalReturnDate ?? '');
    setEditing(false);
  };

  const goToRelatorio = () => {
    if (patientId) navigate('/relatorios/medico', { state: { patientId } });
  };

  if (!patientId) return null;

  return (
    <Card className="border-primary/20 bg-primary/5 shadow-sm h-full">
      <CardHeader className="pb-1.5 pt-2.5 px-3 flex flex-row items-center justify-between">
        <CardTitle className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
          <Stethoscope className="h-3 w-3 text-primary" />
          Retorno Médico
        </CardTitle>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditing(true)}
            className="h-6 w-6 p-0 hover:bg-primary/10"
            title={editing ? '' : hasAnyData ? 'Editar' : 'Adicionar'}
          >
            {editing ? <Save className="h-2.5 w-2.5" onClick={handleSave} /> : hasAnyData ? <Edit2 className="h-2.5 w-2.5" /> : <Plus className="h-2.5 w-2.5" />}
          </Button>
          {editing && (
            <Button variant="ghost" size="sm" onClick={handleCancel} className="h-6 w-6 p-0 hover:bg-destructive/10">
              <X className="h-2.5 w-2.5" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-2.5">
        {editing ? (
          <div className="grid grid-cols-3 gap-1.5">
            <Input
              type="date"
              value={returnDate ? returnDate.split('T')[0] : ''}
              onChange={(e) => setReturnDate(e.target.value ? new Date(e.target.value).toISOString().split('T')[0] : '')}
              className="h-7 text-[10px]"
            />
            <Input
              value={doctorName}
              onChange={(e) => setDoctorName(e.target.value)}
              placeholder="Médico"
              className="h-7 text-[10px]"
            />
            <Input
              value={doctorPhone}
              onChange={(e) => setDoctorPhone(e.target.value)}
              placeholder="Telefone"
              className="h-7 text-[10px]"
            />
          </div>
        ) : (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              {hasAnyData ? (
                <div className="flex items-center gap-2 text-[10px]">
                  {returnDate && (
                    <span className="text-muted-foreground">
                      {format(new Date(returnDate), "dd/MM/yy", { locale: ptBR })}
                    </span>
                  )}
                  {doctorName && (
                    <span className="font-medium truncate max-w-[120px]">{doctorName}</span>
                  )}
                </div>
              ) : (
                <span className="text-[10px] text-muted-foreground">Sem retorno agendado</span>
              )}
              <div className="flex gap-1">
                {reportDone && <div className="h-1.5 w-1.5 rounded-full bg-green-500" />}
                {reportSent && <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full h-6 text-[10px] gap-1 hover:bg-primary/5 hover:border-primary/30"
              onClick={goToRelatorio}
            >
              <FileText className="h-2.5 w-2.5" />
              Relatório Médico
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
