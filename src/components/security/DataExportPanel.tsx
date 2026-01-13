import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Download, Trash2, Clock, CheckCircle, AlertCircle, FileArchive } from "lucide-react";
import { useDataExport } from "@/hooks/useDataExport";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function DataExportPanel() {
  const {
    requests,
    isLoading,
    requestExport,
    isRequesting,
    hasPendingExport,
    hasPendingDeletion,
    _completedRequests,
  } = useDataExport();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4" />;
      case "processing":
        return <Clock className="h-4 w-4 animate-spin" />;
      case "completed":
        return <CheckCircle className="h-4 w-4" />;
      case "failed":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "default";
      case "processing":
        return "secondary";
      case "completed":
        return "default";
      case "failed":
        return "destructive";
      default:
        return "default";
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileArchive className="h-5 w-5" />
            Portabilidade de Dados
          </CardTitle>
          <CardDescription>
            Solicite uma cópia de todos os seus dados ou a exclusão permanente da sua conta
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Download className="h-4 w-4" />
            <AlertDescription>
              <strong>Direito à Portabilidade (Art. 18 LGPD):</strong> Você pode solicitar uma cópia completa
              dos seus dados em formato estruturado. O arquivo será disponibilizado em até 15 dias.
            </AlertDescription>
          </Alert>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Exportar Dados</CardTitle>
                <CardDescription>
                  Receba todos os seus dados pessoais em formato JSON
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => requestExport("export")}
                  disabled={isRequesting || hasPendingExport}
                  className="w-full"
                >
                  <Download className="mr-2 h-4 w-4" />
                  {hasPendingExport ? "Exportação Pendente" : "Solicitar Exportação"}
                </Button>
              </CardContent>
            </Card>

            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-base text-destructive">Excluir Conta</CardTitle>
                <CardDescription>
                  Solicitar exclusão permanente de todos os dados
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (
                      confirm(
                        "Tem certeza? Esta ação é irreversível e todos os seus dados serão permanentemente excluídos."
                      )
                    ) {
                      requestExport("deletion");
                    }
                  }}
                  disabled={isRequesting || hasPendingDeletion}
                  className="w-full"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {hasPendingDeletion ? "Exclusão Pendente" : "Solicitar Exclusão"}
                </Button>
              </CardContent>
            </Card>
          </div>

          {!isLoading && requests && requests.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Histórico de Solicitações</h4>
              <div className="space-y-2">
                {requests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(request.status)}
                      <div>
                        <p className="text-sm font-medium">
                          {request.request_type === "export" ? "Exportação" : "Exclusão"} de Dados
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Solicitado em {format(new Date(request.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getStatusColor(request.status) as any}>
                        {request.status === "pending" && "Pendente"}
                        {request.status === "processing" && "Processando"}
                        {request.status === "completed" && "Concluído"}
                        {request.status === "failed" && "Falhou"}
                      </Badge>
                      {request.status === "completed" && request.data_package_url && (
                        <Button size="sm" variant="outline" asChild>
                          <a href={request.data_package_url} download>
                            <Download className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
