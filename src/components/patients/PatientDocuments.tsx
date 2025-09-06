import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  FileText, 
  Image, 
  Download, 
  Trash2,
  Plus
} from 'lucide-react';
import { usePatientDocuments } from '@/hooks/usePatientDocuments';
import { PatientDocument } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface PatientDocumentsProps {
  patientId: string;
}

export function PatientDocuments({ patientId }: PatientDocumentsProps) {
  const [uploadingFiles, setUploadingFiles] = useState<boolean>(false);
  const { loading, uploadDocument, deleteDocument, getDocumentsByPatient } = usePatientDocuments();
  
  const patientDocs = getDocumentsByPatient(patientId);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    setUploadingFiles(true);
    
    try {
      for (const file of Array.from(files)) {
        await uploadDocument(patientId, file, 'other');
      }
      toast.success('Documentos enviados com sucesso!');
    } catch {
      toast.error('Erro ao enviar documentos');
    } finally {
      setUploadingFiles(false);
      event.target.value = '';
    }
  };

  const handleDeleteDocument = async (doc: PatientDocument) => {
    try {
      await deleteDocument(doc.id, doc.fileUrl);
      toast.success('Documento excluído com sucesso!');
    } catch {
      toast.error('Erro ao excluir documento');
    }
  };

  const getDocumentIcon = (mimeType?: string) => {
    if (!mimeType) return <FileText className="h-4 w-4" />;
    
    if (mimeType.startsWith('image/')) {
      return <Image className="h-4 w-4" />;
    }
    
    return <FileText className="h-4 w-4" />;
  };

  const getDocumentTypeLabel = (type: PatientDocument['type']) => {
    const labels = {
      identity: 'Identidade',
      medical_exam: 'Exame Médico',
      insurance: 'Convênio',
      consent: 'Consentimento',
      prescription: 'Receita',
      other: 'Outros'
    };
    return labels[type];
  };

  const getDocumentTypeColor = (type: PatientDocument['type']) => {
    const colors = {
      identity: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      medical_exam: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      insurance: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      consent: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      prescription: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      other: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    };
    return colors[type];
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Documentos do Paciente</CardTitle>
          <div>
            <input
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              onChange={handleFileUpload}
              className="hidden"
              id="file-upload"
            />
            <Button 
              onClick={() => document.getElementById('file-upload')?.click()}
              disabled={uploadingFiles}
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              {uploadingFiles ? 'Enviando...' : 'Adicionar'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando documentos...</p>
          ) : patientDocs.length === 0 ? (
            <div className="text-center py-8">
              <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">
                Nenhum documento encontrado. Clique em "Adicionar" para enviar documentos.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {patientDocs.map((doc) => (
                <Card key={doc.id} className="group hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {getDocumentIcon(doc.mimeType)}
                        <span className="text-sm font-medium truncate">
                          {doc.name}
                        </span>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => window.open(doc.fileUrl, '_blank')}
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteDocument(doc)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Badge 
                        variant="secondary" 
                        className={getDocumentTypeColor(doc.type)}
                      >
                        {getDocumentTypeLabel(doc.type)}
                      </Badge>
                      
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>
                          Enviado em {format(doc.createdAt, "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                        {doc.fileSize && (
                          <p>{formatFileSize(doc.fileSize)}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}