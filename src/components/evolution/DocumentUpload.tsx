import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  FileText,
  Upload,
  Download,
  Trash2,
  Eye,
  FileIcon,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  usePatientDocuments,
  useUploadDocument,
  useDeleteDocument,
  useDownloadDocument,
  type PatientDocument
} from '@/hooks/usePatientDocuments';

interface DocumentUploadProps {
  patientId: string;
}

const categoryLabels: Record<PatientDocument['category'], string> = {
  laudo: 'Laudo Médico',
  exame: 'Exame de Imagem',
  receita: 'Receita',
  termo: 'Termo de Consentimento',
  outro: 'Outro'
};

const categoryColors: Record<PatientDocument['category'], string> = {
  laudo: 'bg-blue-500/10 text-blue-500',
  exame: 'bg-green-500/10 text-green-500',
  receita: 'bg-purple-500/10 text-purple-500',
  termo: 'bg-orange-500/10 text-orange-500',
  outro: 'bg-gray-500/10 text-gray-500'
};

export const DocumentUpload: React.FC<DocumentUploadProps> = ({ patientId }) => {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [category, setCategory] = useState<PatientDocument['category']>('outro');
  const [description, setDescription] = useState('');

  const { data: documents = [], isLoading } = usePatientDocuments(patientId);
  const uploadMutation = useUploadDocument();
  const deleteMutation = useDeleteDocument();
  const downloadMutation = useDownloadDocument();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validar tamanho (10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('Arquivo muito grande. Tamanho máximo: 10MB');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    await uploadMutation.mutateAsync({
      patient_id: patientId,
      file: selectedFile,
      category,
      description: description || undefined
    });

    // Reset
    setSelectedFile(null);
    setCategory('outro');
    setDescription('');
    setIsUploadOpen(false);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Documentos Anexados
          </CardTitle>
          <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
            <DialogTrigger asChild>
              <Button>
                <Upload className="h-4 w-4 mr-2" />
                Anexar Documento
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Anexar Documento ao Prontuário</DialogTitle>
                <DialogDescription>
                  Envie laudos, exames ou outros documentos relacionados ao paciente.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="file">Arquivo (PDF, JPG, PNG, DOC - Max: 10MB)</Label>
                  <Input
                    id="file"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={handleFileSelect}
                  />
                  {selectedFile && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {selectedFile.name} - {formatFileSize(selectedFile.size)}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="category">Categoria</Label>
                  <Select value={category} onValueChange={(v) => setCategory(v as PatientDocument['category'])}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(categoryLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="description">Descrição (Opcional)</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ex: Ressonância do joelho direito - 15/11/2024"
                    rows={3}
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setIsUploadOpen(false)}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleUpload}
                    disabled={!selectedFile || uploadMutation.isPending}
                  >
                    {uploadMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Enviar
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum documento anexado ainda</p>
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <FileIcon className="h-8 w-8 text-primary flex-shrink-0" />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium truncate">{doc.file_name}</p>
                      <Badge className={categoryColors[doc.category]}>
                        {categoryLabels[doc.category]}
                      </Badge>
                    </div>
                    {doc.description && (
                      <p className="text-sm text-muted-foreground truncate">
                        {doc.description}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(doc.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })} • {formatFileSize(doc.file_size)}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => downloadMutation.mutate(doc)}
                      disabled={downloadMutation.isPending}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm(`Deseja realmente remover "${doc.file_name}"?`)) {
                          deleteMutation.mutate(doc);
                        }
                      }}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
