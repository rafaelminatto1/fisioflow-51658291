import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {

  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  FileText, 
  Share2, 
  MoreVertical, 
  Trash2, 
  Eye, 
  Download,
  MessageCircle,
  Loader2,
  Calendar,
  Dumbbell
} from 'lucide-react';
import { format, parseISO, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Prescription } from '@/hooks/usePrescriptions';
import { downloadPrescriptionPDF } from '@/lib/export/prescriptionPdfExport';
import { toast } from 'sonner';
import { PatientHelpers } from '@/types';
import { fisioLogger as logger } from '@/lib/errors/logger';

interface PrescriptionCardProps {
  prescription: Prescription;
  onDelete?: (id: string) => void;
  onView?: (prescription: Prescription) => void;
}

export function PrescriptionCard({ prescription, onDelete, onView }: PrescriptionCardProps) {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);

  const isExpired = prescription.valid_until && isAfter(new Date(), parseISO(prescription.valid_until));
  const exercises = Array.isArray(prescription.exercises) ? prescription.exercises : [];
  const completedExercises = Array.isArray(prescription.completed_exercises) 
    ? prescription.completed_exercises 
    : [];
  const progressPercent = exercises.length > 0 
    ? (completedExercises.length / exercises.length) * 100 
    : 0;

  const publicUrl = `${window.location.origin}/prescricoes/publica/${prescription.qr_code}`;

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      await downloadPrescriptionPDF({
        id: prescription.id,
        qr_code: prescription.qr_code,
        title: prescription.title,
        patient_name: prescription.patient?.name || 'Paciente',
        therapist_name: prescription.therapist?.full_name || '',
        created_at: prescription.created_at,
        valid_until: prescription.valid_until || '',
        exercises: exercises,
        notes: prescription.notes,
      });
      toast.success('PDF gerado com sucesso');
    } catch (error) {
      toast.error('Erro ao gerar PDF');
      logger.error('Erro ao gerar PDF de prescrição', error, 'PrescriptionCard');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleSendWhatsApp = async () => {
    if (!prescription.patient?.phone) {
      toast.error('Paciente não possui telefone cadastrado');
      return;
    }

    setIsSendingWhatsApp(true);
    
    try {
      const patientName = PatientHelpers.getName(prescription.patient);
      const message = `🏋️ *Sua prescrição está pronta!*

Olá ${patientName}!

Sua nova prescrição de exercícios foi criada com ${exercises.length} exercícios personalizados.

📋 *${prescription.title}*
📅 Válida até: ${prescription.valid_until ? format(parseISO(prescription.valid_until), 'dd/MM/yyyy', { locale: ptBR }) : 'N/A'}

🔗 Acesse sua prescrição online:
${publicUrl}

Marque os exercícios concluídos e acompanhe seu progresso!

_Enviado via FisioFlow_`;

      const phone = prescription.patient.phone.replace(/\D/g, '');
      const whatsappUrl = `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
      
      toast.success('WhatsApp aberto com a mensagem');
    } catch {
      toast.error('Erro ao enviar via WhatsApp');
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    toast.success('Link copiado!');
  };

  const getStatusBadge = () => {
    if (isExpired) {
      return <Badge variant="destructive">Expirada</Badge>;
    }
    
    switch (prescription.status) {
      case 'ativo':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Ativa</Badge>;
      case 'concluido':
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Concluída</Badge>;
      case 'cancelado':
        return <Badge variant="secondary">Cancelada</Badge>;
      default:
        return <Badge variant="outline">{prescription.status}</Badge>;
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              {prescription.title}
            </CardTitle>
            <CardDescription>
              {prescription.patient?.name || 'Paciente não informado'}
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2">
            {getStatusBadge()}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onView?.(prescription)}>
                  <Eye className="h-4 w-4 mr-2" />
                  Ver detalhes
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCopyLink}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Copiar link
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDownloadPdf} disabled={isGeneratingPdf}>
                  <Download className="h-4 w-4 mr-2" />
                  Baixar PDF
                </DropdownMenuItem>
                {onDelete && (
                  <DropdownMenuItem 
                    onClick={() => onDelete(prescription.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Dumbbell className="h-4 w-4" />
            <span>{exercises.length} exercícios</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>{format(parseISO(prescription.created_at), 'dd/MM/yyyy', { locale: ptBR })}</span>
          </div>
          {prescription.view_count > 0 && (
            <div className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              <span>{prescription.view_count} visualizações</span>
            </div>
          )}
        </div>

        {/* Progress */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progresso do paciente</span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
          <Progress value={progressPercent} className="h-1.5" />
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
          >
            {isGeneratingPdf ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Gerar PDF
          </Button>
          
          <Button 
            size="sm" 
            className="flex-1 bg-green-600 hover:bg-green-700"
            onClick={handleSendWhatsApp}
            disabled={isSendingWhatsApp || !prescription.patient?.phone}
          >
            {isSendingWhatsApp ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <MessageCircle className="h-4 w-4 mr-2" />
            )}
            WhatsApp
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
