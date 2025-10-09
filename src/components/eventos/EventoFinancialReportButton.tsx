import React from 'react';
import { FileText, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEventoFinancialReport } from '@/hooks/useEventoFinancialReport';
import { exportEventoFinancialReportPDF } from '@/lib/export/eventosPdfExport';
import { useToast } from '@/hooks/use-toast';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface EventoFinancialReportButtonProps {
  eventoId: string;
  eventoNome: string;
}

export const EventoFinancialReportButton: React.FC<EventoFinancialReportButtonProps> = ({
  eventoId,
  eventoNome,
}) => {
  const { data: report, isLoading, error } = useEventoFinancialReport(eventoId);
  const { toast } = useToast();

  const handleExportPDF = () => {
    if (!report) return;

    try {
      exportEventoFinancialReportPDF(report);
      toast({
        title: 'Relatório exportado!',
        description: 'PDF do relatório financeiro baixado com sucesso.',
      });
    } catch (err) {
      toast({
        title: 'Erro ao exportar',
        description: 'Não foi possível gerar o PDF. Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <FileText className="h-4 w-4" />
          <span className="hidden sm:inline">Relatório Financeiro</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Relatório Financeiro - {eventoNome}</DialogTitle>
          <DialogDescription>
            Resumo completo dos custos e pagamentos do evento
          </DialogDescription>
        </DialogHeader>

        {isLoading && <LoadingSkeleton type="card" rows={3} />}

        {error && (
          <div className="text-destructive text-sm">
            Erro ao carregar relatório. Tente novamente.
          </div>
        )}

        {report && (
          <div className="space-y-4">
            {/* Resumo Geral */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Resumo Geral</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Prestadores:</span>
                  <span className="font-semibold">
                    R$ {report.resumo.custo_prestadores.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Checklist/Insumos:</span>
                  <span className="font-semibold">
                    R$ {report.resumo.custo_checklist.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Outros Pagamentos:</span>
                  <span className="font-semibold">
                    R$ {report.resumo.outros_pagamentos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-2 mt-2">
                  <span className="font-bold">TOTAL:</span>
                  <span className="font-bold text-lg">
                    R$ {report.resumo.custo_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Prestadores */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Prestadores</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="text-2xl font-bold">{report.prestadores.total}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Valor Total</p>
                    <p className="text-2xl font-bold">
                      R$ {report.prestadores.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Pagos</p>
                    <p className="text-lg font-semibold text-green-600">
                      {report.prestadores.pagos} (R$ {report.prestadores.valor_pago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Pendentes</p>
                    <p className="text-lg font-semibold text-amber-600">
                      {report.prestadores.pendentes} (R$ {report.prestadores.valor_pendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Checklist */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Checklist / Insumos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total de Itens</p>
                    <p className="text-2xl font-bold">{report.checklist.total_itens}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Custo Total</p>
                    <p className="text-2xl font-bold">
                      R$ {report.checklist.custo_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Concluídos</p>
                    <p className="text-lg font-semibold text-green-600">{report.checklist.itens_ok}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Pendentes</p>
                    <p className="text-lg font-semibold text-amber-600">{report.checklist.itens_abertos}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Botão Exportar */}
            <Button onClick={handleExportPDF} className="w-full gap-2">
              <Download className="h-4 w-4" />
              Exportar Relatório em PDF
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
