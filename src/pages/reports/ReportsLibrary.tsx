import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Play, 
  Edit, 
  Copy, 
  Trash2, 
  MoreVertical,
  FileText,
  Calendar,
  Clock,
  Share
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { MainLayout } from '@/components/layout/MainLayout';
import { ReportBuilder, ReportConfig } from '@/components/reports/ReportBuilder';
import { 
  useReports, 
  useReportTemplates, 
  useCreateReport, 
  useDeleteReport, 
  useExecuteReport,
  useReportExecutions,
  REPORT_TEMPLATES
} from '@/hooks/useReports';
import { ExportService } from '@/services/analytics/exportService';

export default function ReportsLibrary() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingReport, setEditingReport] = useState<any>(null);

  // Hooks
  const { data: reports = [], isLoading: reportsLoading } = useReports();
  const { data: templates = [] } = useReportTemplates();
  const { data: executions = [] } = useReportExecutions();
  const createReport = useCreateReport();
  const deleteReport = useDeleteReport();
  const executeReport = useExecuteReport();

  // Filter reports based on search
  const filteredReports = reports.filter(report =>
    report.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateFromTemplate = (templateId: string) => {
    const template = REPORT_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setEditingReport({
        name: template.name,
        description: template.description,
        template_type: template.template_type,
        query_config: template.query_config,
        schedule_config: template.schedule_config,
        is_public: false
      });
      setShowBuilder(true);
    }
  };

  const handleSaveReport = async (config: ReportConfig) => {
    try {
      await createReport.mutateAsync({
        ...config,
        is_public: false
      });
      setShowBuilder(false);
      setEditingReport(null);
    } catch (error) {
      console.error('Error saving report:', error);
    }
  };

  const handleExecuteReport = async (reportId: string, format: 'pdf' | 'excel' | 'csv' = 'pdf') => {
    try {
      await executeReport.mutateAsync({
        report_id: reportId,
        format
      });
    } catch (error) {
      console.error('Error executing report:', error);
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    if (confirm('Tem certeza que deseja excluir este relatório?')) {
      try {
        await deleteReport.mutateAsync(reportId);
      } catch (error) {
        console.error('Error deleting report:', error);
      }
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'secondary',
      running: 'default',
      completed: 'secondary',
      failed: 'destructive'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {status === 'pending' ? 'Pendente' :
         status === 'running' ? 'Executando' :
         status === 'completed' ? 'Concluído' :
         'Falha'}
      </Badge>
    );
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Biblioteca de Relatórios
            </h1>
            <p className="text-muted-foreground">
              Gerencie, execute e agende seus relatórios personalizados
            </p>
          </div>

          <Button 
            onClick={() => setShowBuilder(true)}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Criar Relatório
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Buscar relatórios..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" className="gap-2">
            <Filter className="w-4 h-4" />
            Filtros
          </Button>
        </div>

        {/* Content Tabs */}
        <Tabs defaultValue="reports" className="space-y-4">
          <TabsList>
            <TabsTrigger value="reports">Meus Relatórios ({filteredReports.length})</TabsTrigger>
            <TabsTrigger value="templates">Templates ({REPORT_TEMPLATES.length})</TabsTrigger>
            <TabsTrigger value="executions">Execuções ({executions.length})</TabsTrigger>
          </TabsList>

          {/* My Reports */}
          <TabsContent value="reports" className="space-y-4">
            {filteredReports.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Nenhum relatório encontrado</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    {searchTerm 
                      ? 'Não encontramos relatórios com esse termo de busca.'
                      : 'Você ainda não criou nenhum relatório. Comece criando um novo ou use um template.'
                    }
                  </p>
                  <Button onClick={() => setShowBuilder(true)}>
                    Criar Primeiro Relatório
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredReports.map((report) => (
                  <Card key={report.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base">{report.name}</CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">
                            {report.description}
                          </p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              onClick={() => handleExecuteReport(report.id)}
                              className="gap-2"
                            >
                              <Play className="w-4 h-4" />
                              Executar
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2">
                              <Edit className="w-4 h-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2">
                              <Copy className="w-4 h-4" />
                              Duplicar
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2">
                              <Share className="w-4 h-4" />
                              Compartilhar
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteReport(report.id)}
                              className="gap-2 text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          Criado em {format(new Date(report.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <FileText className="w-3 h-3" />
                          {report.query_config.metrics?.length || 0} métricas
                        </div>

                        {report.schedule_config?.frequency && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            Agendado {report.schedule_config.frequency}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 mt-4">
                        <Button 
                          size="sm" 
                          onClick={() => handleExecuteReport(report.id)}
                          className="flex-1"
                        >
                          <Play className="w-3 h-3 mr-1" />
                          Executar
                        </Button>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="outline">
                              <Download className="w-3 h-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem 
                              onClick={() => handleExecuteReport(report.id, 'pdf')}
                            >
                              Exportar PDF
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleExecuteReport(report.id, 'excel')}
                            >
                              Exportar Excel
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleExecuteReport(report.id, 'csv')}
                            >
                              Exportar CSV
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Templates */}
          <TabsContent value="templates" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {REPORT_TEMPLATES.map((template) => (
                <Card key={template.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-base">{template.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {template.description}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 mb-4">
                      <Badge variant="outline" className="capitalize">
                        {template.template_type}
                      </Badge>
                      
                      <div className="text-sm text-muted-foreground">
                        {template.query_config.metrics?.length || 0} métricas incluídas
                      </div>
                    </div>

                    <Button 
                      className="w-full"
                      onClick={() => handleCreateFromTemplate(template.id)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Usar Template
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Executions */}
          <TabsContent value="executions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Histórico de Execuções</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {executions.map((execution) => (
                    <div key={execution.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <p className="font-medium">Relatório #{execution.report_id.slice(0, 8)}</p>
                        <p className="text-sm text-muted-foreground">
                          Executado em {format(new Date(execution.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                        </p>
                        {execution.completed_at && (
                          <p className="text-xs text-muted-foreground">
                            Concluído em {format(new Date(execution.completed_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {getStatusBadge(execution.status)}
                        
                        {execution.status === 'completed' && execution.file_url && (
                          <Button size="sm" variant="outline" asChild>
                            <a href={execution.file_url} download>
                              <Download className="w-3 h-3 mr-1" />
                              Download
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}

                  {executions.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Nenhuma execução encontrada</p>
                      <p className="text-sm">Execute um relatório para ver o histórico aqui</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Report Builder Dialog */}
        <Dialog open={showBuilder} onOpenChange={setShowBuilder}>
          <DialogContent className="max-w-6xl h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingReport ? 'Editar Relatório' : 'Criar Novo Relatório'}
              </DialogTitle>
            </DialogHeader>
            <ReportBuilder
              initialConfig={editingReport}
              onSave={handleSaveReport}
              onPreview={(config) => console.log('Preview:', config)}
            />
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}