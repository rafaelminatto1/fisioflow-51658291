import { useState } from 'react';
import { Download, FileText, FileSpreadsheet, Braces, Printer, Copy, Check, FileOutput } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import type { PainPoint } from './BodyMap';
import {
  exportPainMap,
  exportPainMapPDF,
  printPainMap,
  copyToClipboard,
  generateTextReport,
  calculatePainMapStatistics,
  type PainMapExportData,
} from '@/lib/utils/painMapExport';
import { logger } from '@/lib/errors/logger';

interface PainMapToolbarProps {
  patientName: string;
  frontPoints: PainPoint[];
  backPoints: PainPoint[];
  disabled?: boolean;
}

export function PainMapToolbar({
  patientName,
  frontPoints,
  backPoints,
  disabled = false,
}: PainMapToolbarProps) {
  const [copied, setCopied] = useState(false);

  const totalPoints = frontPoints.length + backPoints.length;

  const handleExport = (format: 'txt' | 'csv' | 'json') => {
    const data: PainMapExportData = {
      patientName,
      date: new Date().toISOString(),
      view: frontPoints.length > 0 && backPoints.length > 0 ? 'both' : frontPoints.length > 0 ? 'front' : 'back',
      frontPoints,
      backPoints,
      statistics: calculatePainMapStatistics(frontPoints, backPoints),
    };

    try {
      exportPainMap(data, format);
      toast.success(`Relatório exportado em ${format.toUpperCase()}`);
    } catch (error) {
      toast.error('Erro ao exportar relatório');
      logger.error('Error exporting pain map report', error, 'PainMapToolbar');
    }
  };

  const handlePDFExport = async () => {
    const data: PainMapExportData = {
      patientName,
      date: new Date().toISOString(),
      view: frontPoints.length > 0 && backPoints.length > 0 ? 'both' : frontPoints.length > 0 ? 'front' : 'back',
      frontPoints,
      backPoints,
      statistics: calculatePainMapStatistics(frontPoints, backPoints),
    };

    try {
      await exportPainMapPDF(data);
      toast.success('Relatório PDF exportado com sucesso');
    } catch (error) {
      toast.error('Erro ao exportar PDF');
      logger.error('Error exporting pain map PDF', error, 'PainMapToolbar');
    }
  };

  const handlePrint = () => {
    const data: PainMapExportData = {
      patientName,
      date: new Date().toISOString(),
      view: frontPoints.length > 0 && backPoints.length > 0 ? 'both' : frontPoints.length > 0 ? 'front' : 'back',
      frontPoints,
      backPoints,
      statistics: calculatePainMapStatistics(frontPoints, backPoints),
    };

    try {
      printPainMap(data);
      toast.success('Relatório enviado para impressão');
    } catch (error) {
      toast.error('Erro ao imprimir relatório');
      logger.error('Error printing pain map report', error, 'PainMapToolbar');
    }
  };

  const handleCopy = async () => {
    const data: PainMapExportData = {
      patientName,
      date: new Date().toISOString(),
      view: frontPoints.length > 0 && backPoints.length > 0 ? 'both' : frontPoints.length > 0 ? 'front' : 'back',
      frontPoints,
      backPoints,
      statistics: calculatePainMapStatistics(frontPoints, backPoints),
    };

    const report = generateTextReport(data);

    try {
      const success = await copyToClipboard(report);
      if (success) {
        setCopied(true);
        toast.success('Relatório copiado para a área de transferência');
        setTimeout(() => setCopied(false), 2000);
      } else {
        toast.error('Erro ao copiar relatório');
      }
    } catch (error) {
      toast.error('Erro ao copiar relatório');
      logger.error('Error copying pain map report', error, 'PainMapToolbar');
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Indicador de pontos */}
      {totalPoints > 0 && (
        <div className="text-sm text-muted-foreground mr-2">
          {totalPoints} ponto{totalPoints !== 1 ? 's' : ''} registrado{totalPoints !== 1 ? 's' : ''}
        </div>
      )}

      {/* Copiar */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleCopy}
        disabled={disabled || totalPoints === 0}
        className="min-w-[100px]"
      >
        {copied ? (
          <>
            <Check className="h-4 w-4 mr-2" />
            Copiado!
          </>
        ) : (
          <>
            <Copy className="h-4 w-4 mr-2" />
            Copiar
          </>
        )}
      </Button>

      {/* Imprimir */}
      <Button
        variant="outline"
        size="sm"
        onClick={handlePrint}
        disabled={disabled || totalPoints === 0}
      >
        <Printer className="h-4 w-4 mr-2" />
        Imprimir
      </Button>

      {/* Exportar Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="default" size="sm" disabled={disabled || totalPoints === 0}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => handleExport('txt')}>
            <FileText className="h-4 w-4 mr-2" />
            <div className="flex flex-col">
              <span className="font-medium">Texto (.txt)</span>
              <span className="text-xs text-muted-foreground">Relatório formatado</span>
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => handleExport('csv')}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            <div className="flex flex-col">
              <span className="font-medium">CSV (.csv)</span>
              <span className="text-xs text-muted-foreground">Planilha</span>
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => handleExport('json')}>
            <Braces className="h-4 w-4 mr-2" />
            <div className="flex flex-col">
              <span className="font-medium">JSON (.json)</span>
              <span className="text-xs text-muted-foreground">Dados estruturados</span>
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem onClick={handlePDFExport}>
            <FileOutput className="h-4 w-4 mr-2" />
            <div className="flex flex-col">
              <span className="font-medium">PDF (.pdf)</span>
              <span className="text-xs text-muted-foreground">Documento formatado</span>
            </div>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Imprimir relatório
          </DropdownMenuItem>

          <DropdownMenuItem onClick={handleCopy}>
            <Copy className="h-4 w-4 mr-2" />
            Copiar para área de transferência
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
