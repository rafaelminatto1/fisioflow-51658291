/**
 * Componente: ExportButtonGroup
 * Grupo de botões de exportação reutilizável para PDF e Excel
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Download, FileText, Table, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ExportButtonGroupProps {
  onExportPDF?: () => Promise<void> | void;
  onExportExcel?: () => Promise<void> | void;
  pdfLabel?: string;
  excelLabel?: string;
  disabled?: boolean;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function ExportButtonGroup({
  onExportPDF,
  onExportExcel,
  pdfLabel = 'Exportar PDF',
  excelLabel = 'Exportar Excel',
  disabled = false,
  variant = 'outline',
  size = 'default',
  className,
}: ExportButtonGroupProps) {
  const { toast } = useToast();
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  const handlePDF = async () => {
    if (!onExportPDF) return;
    setIsExportingPDF(true);
    try {
      await onExportPDF();
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      toast({
        title: 'Erro na exportação',
        description: 'Não foi possível gerar o arquivo PDF.',
        variant: 'destructive',
      });
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleExcel = async () => {
    if (!onExportExcel) return;
    setIsExportingExcel(true);
    try {
      await onExportExcel();
    } catch (error) {
      console.error('Erro ao exportar Excel:', error);
      toast({
        title: 'Erro na exportação',
        description: 'Não foi possível gerar o arquivo Excel.',
        variant: 'destructive',
      });
    } finally {
      setIsExportingExcel(false);
    }
  };

  const hasMultiple = onExportPDF && onExportExcel;
  const isExporting = isExportingPDF || isExportingExcel;

  // Se só tem uma opção, mostra botão direto
  if (!hasMultiple) {
    if (onExportPDF) {
      return (
        <Button
          variant={variant}
          size={size}
          disabled={disabled || isExportingPDF}
          onClick={handlePDF}
          className={className}
        >
          {isExportingPDF ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <FileText className="mr-2 h-4 w-4" />
          )}
          {pdfLabel}
        </Button>
      );
    }
    if (onExportExcel) {
      return (
        <Button
          variant={variant}
          size={size}
          disabled={disabled || isExportingExcel}
          onClick={handleExcel}
          className={className}
        >
          {isExportingExcel ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Table className="mr-2 h-4 w-4" />
          )}
          {excelLabel}
        </Button>
      );
    }
    return null;
  }

  // Se tem múltiplas opções, mostra dropdown
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          disabled={disabled || isExporting}
          className={className}
        >
          {isExporting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {onExportPDF && (
          <DropdownMenuItem onClick={handlePDF} disabled={isExportingPDF}>
            {isExportingPDF ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileText className="mr-2 h-4 w-4" />
            )}
            {pdfLabel}
          </DropdownMenuItem>
        )}
        {onExportPDF && onExportExcel && <DropdownMenuSeparator />}
        {onExportExcel && (
          <DropdownMenuItem onClick={handleExcel} disabled={isExportingExcel}>
            {isExportingExcel ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Table className="mr-2 h-4 w-4" />
            )}
            {excelLabel}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default ExportButtonGroup;
