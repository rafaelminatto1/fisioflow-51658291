import { Button } from '@/components/ui/button';

  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FileText, Download } from "lucide-react";
import { useEventoFinancialReport } from "@/hooks/useEventoFinancialReport";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { fisioLogger as logger } from "@/lib/errors/logger";

interface EventoFinancialReportButtonProps {
  eventoId: string;
}

export function EventoFinancialReportButton({
  eventoId,
}: EventoFinancialReportButtonProps) {
  const { data: report, isLoading } = useEventoFinancialReport(eventoId);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);

  const handleExportPDF = () => {
    if (!report) return;
    logger.info("Exportar relatório", { report }, "EventoFinancialReportButton");
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FileText className="h-4 w-4 mr-2" />
          Relatório Financeiro
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Relatório Financeiro</DialogTitle>
          <DialogDescription>
            {report?.eventoNome || "Carregando..."}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : report ? (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Receitas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(report.receitas)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Custos Totais
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    {formatCurrency(report.custoTotal)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Saldo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className={`text-2xl font-bold ${
                      report.saldo >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {formatCurrency(report.saldo)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Margem: {report.margem}%
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Detalhamento de Custos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Prestadores</span>
                  <span className="font-medium">
                    {formatCurrency(report.custosPrestadores)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Insumos (Checklist)</span>
                  <span className="font-medium">
                    {formatCurrency(report.custosInsumos)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Outros Custos</span>
                  <span className="font-medium">
                    {formatCurrency(report.outrosCustos)}
                  </span>
                </div>
                {report.pagamentosPendentes > 0 && (
                  <div className="flex justify-between pt-2 border-t">
                    <span className="text-orange-600 font-medium">
                      Pagamentos Pendentes
                    </span>
                    <span className="font-medium text-orange-600">
                      {formatCurrency(report.pagamentosPendentes)}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {report.detalhePagamentos.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Histórico de Pagamentos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {report.detalhePagamentos.map((pag, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between items-center py-2 border-b last:border-b-0"
                      >
                        <div className="flex-1">
                          <p className="font-medium">{pag.descricao}</p>
                          <p className="text-xs text-muted-foreground">
                            {pag.tipo.toUpperCase()}
                            {pag.pagoEm && (
                              <> • {format(new Date(pag.pagoEm), "dd/MM/yyyy", { locale: ptBR })}</>
                            )}
                          </p>
                        </div>
                        <span
                          className={`font-medium ${
                            pag.tipo === "receita" ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {pag.tipo === "receita" ? "+" : "-"}
                          {formatCurrency(pag.valor)}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-end">
              <Button onClick={handleExportPDF} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Exportar PDF
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
