import React, { useState, useEffect } from 'react';
import {
  collection,
  query,
  orderBy,
  getDocs,
  doc,
  getDoc,
  deleteDoc,
  where
} from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { db, getFirebaseStorage } from '@/lib/firebase';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Video,
  Download,
  Trash2,
  Eye,
  Calendar,
  User,
  FileVideo,
  Shield,
  ShieldAlert,
  Search,
  Filter,
  MoreVertical,
  ExternalLink,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface MarketingExport {
  id: string;
  patient_id: string;
  organization_id: string;
  export_type: string;
  file_path: string;
  file_url: string;
  is_anonymized: boolean;
  metrics_overlay: string[];
  created_at: string;
  patient_name?: string;
}

export default function MarketingExportsPage() {
  const { toast } = useToast();
  const [exports, setExports] = useState<MarketingExport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAnonymized, setFilterAnonymized] = useState<'all' | 'yes' | 'no'>('all');
  const [filterType, setFilterType] = useState<'all' | 'video_comparison'>('all');

  useEffect(() => {
    const fetchExports = async () => {
      try {
        setLoading(true);

        const exportsQuery = query(
          collection(db, 'marketing_exports'),
          orderBy('created_at', 'desc')
        );

        const snapshot = await getDocs(exportsQuery);
        const exportsData: MarketingExport[] = [];

        for (const docSnap of snapshot.docs) {
          const data = docSnap.data() as Omit<MarketingExport, 'id'>;

          // Fetch patient name
          let patientName = 'Desconhecido';
          try {
            const patientRef = doc(db, 'patients', data.patient_id);
            const patientSnap = await getDoc(patientRef);
            if (patientSnap.exists()) {
              patientName = patientSnap.data().name || 'Desconhecido';
            }
          } catch (err) {
            console.error('Error fetching patient:', err);
          }

          exportsData.push({
            id: docSnap.id,
            ...data,
            patient_name: patientName,
          });
        }

        setExports(exportsData);
      } catch (error) {
        console.error('Error fetching exports:', error);
        toast({
          variant: 'destructive',
          title: 'Erro ao carregar exportações',
          description: 'Não foi possível carregar o histórico de exportações.',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchExports();
  }, [toast]);

  const handleDelete = async (exportItem: MarketingExport) => {
    try {
      const storage = getFirebaseStorage();

      // Delete from Storage
      try {
        const storageRef = ref(storage, exportItem.file_path);
        await deleteObject(storageRef);
      } catch (err) {
        console.error('Error deleting from storage:', err);
      }

      // Delete from Firestore
      await deleteDoc(doc(db, 'marketing_exports', exportItem.id));

      // Update local state
      setExports((prev) => prev.filter((e) => e.id !== exportItem.id));

      toast({
        title: 'Exportação excluída',
        description: 'O arquivo foi removido com sucesso.',
      });
    } catch (error) {
      console.error('Error deleting export:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir a exportação.',
      });
    }
  };

  const filteredExports = exports.filter((exp) => {
    const matchesSearch =
      exp.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exp.export_type.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesAnonymized =
      filterAnonymized === 'all' ||
      (filterAnonymized === 'yes' && exp.is_anonymized) ||
      (filterAnonymized === 'no' && !exp.is_anonymized);

    const matchesType =
      filterType === 'all' || exp.export_type === filterType;

    return matchesSearch && matchesAnonymized && matchesType;
  });

  if (loading) {
    return (
      <MainLayout>
        <div className="p-6 max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-4">
              <Video className="h-8 w-8 animate-pulse text-primary" />
              <p className="text-muted-foreground">Carregando exportações...</p>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <FileVideo className="h-8 w-8" />
            Exportações de Marketing
          </h1>
          <p className="text-muted-foreground mt-1">
            Histórico de conteúdos gerados para marketing
          </p>
        </div>
        <Button asChild>
          <a href="/marketing/content-generator">
            <Video className="h-4 w-4 mr-2" />
            Nova Exportação
          </a>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Exportações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{exports.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Anonimizados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {exports.filter((e) => e.is_anonymized).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" />
              Identificáveis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {exports.filter((e) => !e.is_anonymized).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Vídeos Comparativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {exports.filter((e) => e.export_type === 'video_comparison').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por paciente ou tipo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select value={filterAnonymized} onValueChange={(v: typeof filterAnonymized) => setFilterAnonymized(v)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Privacidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="yes">Anonimizados</SelectItem>
                  <SelectItem value="no">Identificáveis</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterType} onValueChange={(v: typeof filterType) => setFilterType(v)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="video_comparison">Vídeo Comparativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Exports List */}
      {filteredExports.length === 0 ? (
        <Card>
          <CardContent className="p-12">
            <div className="text-center">
              <FileVideo className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">
                {searchTerm || filterAnonymized !== 'all' || filterType !== 'all'
                  ? 'Nenhuma exportação encontrada com os filtros aplicados.'
                  : 'Nenhuma exportação ainda.'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Crie sua primeira exportação de conteúdo de marketing.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredExports.map((exportItem) => (
            <Card key={exportItem.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    {/* Thumbnail / Icon */}
                    <div className="flex-shrink-0 w-16 h-16 rounded-lg bg-gradient-to-br from-purple-500/10 to-pink-500/10 flex items-center justify-center">
                      <Video className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold">
                          {exportItem.export_type === 'video_comparison'
                            ? 'Vídeo Comparativo'
                            : exportItem.export_type}
                        </h3>
                        {exportItem.is_anonymized ? (
                          <Badge variant="secondary" className="gap-1">
                            <Shield className="h-3 w-3" />
                            Anonimizado
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1 text-amber-600 border-amber-600">
                            <ShieldAlert className="h-3 w-3" />
                            Identificável
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          {exportItem.patient_name || 'Paciente Desconhecido'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(exportItem.created_at), "dd/MM/yyyy 'às' HH:mm", {
                            locale: ptBR,
                          })}
                        </span>
                      </div>

                      {exportItem.metrics_overlay && exportItem.metrics_overlay.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {exportItem.metrics_overlay.map((metric, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {metric}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button asChild variant="outline" size="sm">
                      <a href={exportItem.file_url} target="_blank" rel="noopener noreferrer">
                        <Eye className="h-4 w-4 mr-2" />
                        Visualizar
                      </a>
                    </Button>
                    <Button asChild size="sm">
                      <a href={exportItem.file_url} download>
                        <Download className="h-4 w-4 mr-2" />
                        Baixar
                      </a>
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir exportação?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação não pode ser desfeita. O arquivo será removido do armazenamento e o registro será excluído permanentemente.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(exportItem)}
                            className="bg-destructive text-destructive-foreground"
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* LGPD Notice */}
      <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-900 dark:text-amber-100">
                LGPD - Proteção de Dados
              </p>
              <p className="text-amber-800 dark:text-amber-200 mt-1">
                Todas as exportações são armazenadas com registro de consentimento. Use apenas conteúdo de pacientes
                que assinaram o Termo de Consentimento para Uso de Imagem em Marketing. Anonimize sempre que possível.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </MainLayout>
  );
}
