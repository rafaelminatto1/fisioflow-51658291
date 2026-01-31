import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { Checkbox } from '@/components/ui/checkbox';
import { db } from '@/integrations/firebase/app';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { toast } from 'sonner';
import { FileText, Download, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { fisioLogger as logger } from '@/lib/errors/logger';

type ReportType = 'appointments' | 'financial' | 'patients' | 'analytics' | 'complete';
type ExportFormat = 'pdf' | 'csv' | 'json';

interface ReportSection {
  id: string;
  label: string;
  enabled: boolean;
}

export function AdvancedReportGenerator() {
  const [reportType, setReportType] = useState<ReportType>('appointments');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('pdf');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [isGenerating, setIsGenerating] = useState(false);
  const [sections, setSections] = useState<ReportSection[]>([
    { id: 'summary', label: 'Resumo Executivo', enabled: true },
    { id: 'details', label: 'Dados Detalhados', enabled: true },
    { id: 'charts', label: 'Gráficos e Análises', enabled: true },
    { id: 'insights', label: 'Insights e Recomendações', enabled: false },
  ]);

  const toggleSection = (id: string) => {
    setSections(sections.map(s => (s.id === id ? { ...s, enabled: !s.enabled } : s)));
  };

  const fetchReportData = async () => {
    const startDate = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : null;
    const endDate = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : null;

    let q = query(collection(db, 'appointments'), orderBy('appointment_date', 'desc'));

    if (startDate) {
      q = query(collection(db, 'appointments'), where('appointment_date', '>=', startDate), orderBy('appointment_date', 'desc'));
    }
    if (endDate) {
      q = query(collection(db, 'appointments'), where('appointment_date', '<=', endDate), orderBy('appointment_date', 'desc'));
    }

    const snapshot = await getDocs(q);
    const data: AppointmentData[] = [];
    snapshot.forEach((doc) => {
      const appointmentData = doc.data();
      // For now, we'll just get the basic data. Patient names would need to be fetched separately.
      data.push({
        id: doc.id,
        ...appointmentData,
        patients: { full_name: appointmentData.patient_name || 'N/A' }
      });
    });

    return data;
  };

  // Define interface for appointment data from database
  interface AppointmentData {
    appointment_date: string | Date;
    patients?: { full_name: string; email?: string; phone?: string } | null;
    type?: string;
    status?: string;
    payment_amount?: number;
  }

  const generatePDF = async (data: unknown[]) => {
    const formattedData = data as AppointmentData[];
    const doc = new jsPDF();

    // Header
    doc.setFontSize(20);
    doc.text('FisioFlow - Relatório de Agendamentos', 14, 20);

    // Date range
    doc.setFontSize(10);
    doc.text(
      `Período: ${dateRange?.from ? format(dateRange.from, 'dd/MM/yyyy') : 'Início'} - ${dateRange?.to ? format(dateRange.to, 'dd/MM/yyyy') : 'Fim'}`,
      14,
      30
    );

    // Summary
    if (sections.find(s => s.id === 'summary')?.enabled) {
      doc.setFontSize(14);
      doc.text('Resumo Executivo', 14, 40);
      doc.setFontSize(10);
      doc.text(`Total de Agendamentos: ${data.length}`, 14, 48);
      doc.text(
        `Receita Total: R$ ${formattedData.reduce((sum, d) => sum + (d.payment_amount || 0), 0).toFixed(2)}`,
        14,
        56
      );
    }

    // Details table
    if (sections.find(s => s.id === 'details')?.enabled) {
      const tableData = formattedData.map(d => [
        format(new Date(d.appointment_date), 'dd/MM/yyyy'),
        d.patients?.full_name || 'N/A',
        d.type || 'N/A',
        d.status || 'N/A',
        `R$ ${d.payment_amount?.toFixed(2) || '0,00'}`,
      ]);

      autoTable(doc, {
        startY: 70,
        head: [['Data', 'Paciente', 'Tipo', 'Status', 'Valor']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [91, 79, 232] },
      });
    }

    return doc;
  };

  const generateCSV = (data: unknown[]) => {
    const formattedData = data as AppointmentData[];
    const headers = ['Data', 'Paciente', 'Email', 'Telefone', 'Tipo', 'Status', 'Valor'];
    const rows = formattedData.map(d => [
      format(new Date(d.appointment_date), 'dd/MM/yyyy'),
      d.patients?.full_name || '',
      d.patients?.email || '',
      d.patients?.phone || '',
      d.type || '',
      d.status || '',
      d.payment_amount?.toFixed(2) || '0,00',
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    return csvContent;
  };

  const handleGenerate = async () => {
    if (!dateRange?.from || !dateRange?.to) {
      toast.error('Selecione um período para o relatório');
      return;
    }

    setIsGenerating(true);

    try {
      const data = await fetchReportData();

      if (!data || data.length === 0) {
        toast.warning('Nenhum dado encontrado para o período selecionado');
        setIsGenerating(false);
        return;
      }

      let blob: Blob;
      let filename: string;

      switch (exportFormat) {
        case 'pdf': {
          const pdf = await generatePDF(data);
          blob = pdf.output('blob');
          filename = `relatorio-${reportType}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
          break;
        }
        case 'csv': {
          const csv = generateCSV(data);
          blob = new Blob([csv], { type: 'text/csv' });
          filename = `relatorio-${reportType}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
          break;
        }
        case 'json':
          blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
          filename = `relatorio-${reportType}-${format(new Date(), 'yyyy-MM-dd')}.json`;
          break;
      }

      // Download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Relatório gerado com sucesso!');
    } catch (error) {
      logger.error('Error generating report', error, 'AdvancedReportGenerator');
      toast.error('Erro ao gerar relatório');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Gerador de Relatórios Avançado
        </CardTitle>
        <CardDescription>
          Crie relatórios personalizados com múltiplos formatos de exportação
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Report Type */}
        <div className="space-y-2">
          <Label>Tipo de Relatório</Label>
          <Select value={reportType} onValueChange={(v: ReportType) => setReportType(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="appointments">Agendamentos</SelectItem>
              <SelectItem value="financial">Financeiro</SelectItem>
              <SelectItem value="patients">Pacientes</SelectItem>
              <SelectItem value="analytics">Analytics</SelectItem>
              <SelectItem value="complete">Relatório Completo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Date Range */}
        <div className="space-y-2">
          <Label>Período</Label>
          <DatePickerWithRange date={dateRange} setDate={setDateRange} />
        </div>

        {/* Export Format */}
        <div className="space-y-2">
          <Label>Formato de Exportação</Label>
          <Select value={exportFormat} onValueChange={(v: ExportFormat) => setExportFormat(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pdf">PDF</SelectItem>
              <SelectItem value="csv">CSV (Excel)</SelectItem>
              <SelectItem value="json">JSON</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Sections */}
        <div className="space-y-3">
          <Label>Seções do Relatório</Label>
          <div className="space-y-2">
            {sections.map(section => (
              <div key={section.id} className="flex items-center space-x-2">
                <Checkbox
                  id={section.id}
                  checked={section.enabled}
                  onCheckedChange={() => toggleSection(section.id)}
                />
                <Label
                  htmlFor={section.id}
                  className="text-sm font-normal cursor-pointer"
                >
                  {section.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Generate Button */}
        <Button onClick={handleGenerate} disabled={isGenerating} className="w-full" size="lg">
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Gerando Relatório...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Gerar Relatório
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
