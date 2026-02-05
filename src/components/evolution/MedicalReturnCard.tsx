/**
 * Card de Retorno Médico na página de Evolução
 * Exibe e permite editar: data do retorno, médico, telefone; link para relatório médico; status relatório feito/enviado
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Stethoscope, FileText, CheckCircle2, Send, Edit2, Save, X, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-1.5 pt-3 px-3 flex flex-row items-center justify-between">
        <CardTitle className="text-sm flex items-center gap-2">
          <Stethoscope className="h-3.5 w-3.5 text-primary" />
          Retorno médico
        </CardTitle>
        {!editing ? (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditing(true)}
              className="h-7 gap-0.5"
              title="Adicionar retorno médico"
            >
              <Plus className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)} className="h-7" title="Editar">
              <Edit2 className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={handleCancel} className="h-7">
              <X className="h-3 w-3" />
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleSave}
              disabled={updatePatient.isPending}
              className="h-7"
            >
              <Save className="h-3 w-3" />
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-2">
        {editing ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-[11px]">Data do retorno</Label>
              <Input
                type="date"
                value={returnDate ? returnDate.split('T')[0] : ''}
                onChange={(e) => setReturnDate(e.target.value ? new Date(e.target.value).toISOString().split('T')[0] : '')}
                className="h-7 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Médico assistente</Label>
              <Input
                value={doctorName}
                onChange={(e) => setDoctorName(e.target.value)}
                placeholder="Nome do médico"
                className="h-7 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Telefone do médico</Label>
              <Input
                value={doctorPhone}
                onChange={(e) => setDoctorPhone(e.target.value)}
                placeholder="(00) 00000-0000"
                className="h-7 text-xs"
              />
            </div>
          </div>
        ) : (
          <div className="text-xs space-y-0.5">
            {returnDate && (
              <p className="leading-tight">
                <span className="text-muted-foreground">Retorno: </span>
                {format(new Date(returnDate), "dd/MM/yyyy", { locale: ptBR })}
              </p>
            )}
            {doctorName && (
              <p className="leading-tight">
                <span className="text-muted-foreground">Médico: </span>
                {doctorName}
              </p>
            )}
            {doctorPhone && (
              <p className="leading-tight">
                <span className="text-muted-foreground">Telefone: </span>
                {doctorPhone}
              </p>
            )}
            {!hasAnyData && (
              <p className="text-muted-foreground text-[11px]">Clique em editar para adicionar data do retorno, médico e telefone.</p>
            )}
          </div>
        )}

        {(reportDone || reportSent) && (
          <div className="flex flex-wrap gap-1">
            {reportDone && (
              <Badge variant="secondary" className="text-[11px] gap-0.5 py-0.5">
                <CheckCircle2 className="h-2.5 w-2.5" />
                Relatório feito
              </Badge>
            )}
            {reportSent && (
              <Badge variant="secondary" className="text-[11px] gap-0.5 py-0.5">
                <Send className="h-2.5 w-2.5" />
                Relatório enviado
              </Badge>
            )}
          </div>
        )}

        <Button variant="outline" size="sm" className="w-full gap-1.5 h-7 text-xs" onClick={goToRelatorio}>
          <FileText className="h-3.5 w-3.5" />
          Gerar relatório para o médico
        </Button>
      </CardContent>
    </Card>
  );
}
