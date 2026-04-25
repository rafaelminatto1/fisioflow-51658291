import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Download, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LazyPdfDownloadButton } from "@/components/pdf/LazyPdfDownloadButton";
import type { RelatorioMedicoData } from "@/pages/relatorios/RelatorioMedicoPage";
import { CloudReportActions } from "./CloudReportActions";

export function RelatorioMedicoPreviewDialog({
  relatorio,
  onClose,
  onEdit,
  loadDocument,
}: {
  relatorio: RelatorioMedicoData | null;
  onClose: () => void;
  onEdit: (relatorio: RelatorioMedicoData) => void;
  loadDocument: () => Promise<{
    default: React.ComponentType<{ data: RelatorioMedicoData }>;
  }>;
}) {
  if (!relatorio) return null;

  return (
    <Dialog open={!!relatorio} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Visualização do Relatório</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="font-semibold">Paciente:</span> {relatorio.paciente?.nome}
              </div>
              <div>
                <span className="font-semibold">Tipo:</span> {relatorio.tipo_relatorio}
              </div>
              <div>
                <span className="font-semibold">Data:</span>{" "}
                {format(new Date(relatorio.data_emissao), "dd/MM/yyyy", {
                  locale: ptBR,
                })}
              </div>
              <div>
                <span className="font-semibold">Urgência:</span> {relatorio.urgencia}
              </div>
            </div>
            {relatorio.profissional_destino?.nome && (
              <div className="text-sm">
                <span className="font-semibold">Destinatário:</span>{" "}
                {relatorio.profissional_destino.nome} -{" "}
                {relatorio.profissional_destino.especialidade}
              </div>
            )}
          </div>

          <CloudReportActions
            reportData={relatorio}
            patientId={relatorio.patientId || ""}
            patientName={relatorio.paciente?.nome || ""}
            type={relatorio.tipo_relatorio}
          />

          <div className="flex justify-end gap-2 border-t pt-4">
            <Button variant="outline" onClick={() => onEdit(relatorio)}>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
            <LazyPdfDownloadButton
              loadDocument={loadDocument}
              documentProps={{ data: relatorio }}
              fileName={`relatorio-medico-${relatorio.paciente?.nome?.replace(/\s+/g, "-")}-${format(new Date(relatorio.data_emissao), "dd-MM-yyyy")}.pdf`}
              label="Baixar PDF"
              icon={<Download className="mr-2 h-4 w-4" />}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
