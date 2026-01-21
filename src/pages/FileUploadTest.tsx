import React, { useState, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Upload, X, CheckCircle2, AlertCircle, FileText, FileImage, FileVideo } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useDropzone } from 'react-dropzone';
import { supabase } from '@/integrations/supabase/client';

interface UploadedFile {
  id: string;
  file: File;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  url?: string;
  error?: string;
  path?: string;
}

const FileUploadTest = () => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [, setIsDragging] = useState(false);

  const uploadFile = async (uploadedFile: UploadedFile) => {
    const { id: fileId, file } = uploadedFile;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado.');
      }
      const filePath = `${user.id}/${Date.now()}_${file.name}`;

      const { error } = await supabase.storage
        .from('documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        throw error;
      }

      const { data: publicUrlData } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      if (!publicUrlData) {
        throw new Error('Não foi possível obter a URL pública.');
      }

      setFiles(prev =>
        prev.map(f =>
          f.id === fileId
            ? { ...f, progress: 100, status: 'success', url: publicUrlData.publicUrl, path: filePath }
            : f
        )
      );

      toast({ title: 'Upload concluído com sucesso', description: file.name });
    } catch (error: any) {
      setFiles(prev =>
        prev.map(f =>
          f.id === fileId
            ? { ...f, status: 'error', error: error.message }
            : f
        )
      );
      toast({ title: 'Erro no upload', description: error.message, variant: 'destructive' });
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: UploadedFile[] = acceptedFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      progress: 0,
      status: 'uploading'
    }));

    setFiles(prev => [...prev, ...newFiles]);

    newFiles.forEach(uploadedFile => {
      uploadFile(uploadedFile);
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDragEnter: () => setIsDragging(true),
    onDragLeave: () => setIsDragging(false),
    maxSize: 10 * 1024 * 1024, // 10MB
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'video/*': ['.mp4', '.mov']
    }
  });

  const removeFile = async (fileId: string) => {
    const fileToRemove = files.find(f => f.id === fileId);
    setFiles(prev => prev.filter(f => f.id !== fileId));

    if (fileToRemove && fileToRemove.status === 'success' && fileToRemove.path) {
      const { error } = await supabase.storage
        .from('documents')
        .remove([fileToRemove.path]);

      if (error) {
        setFiles(prev => [...prev, fileToRemove]);
        toast({
          title: 'Erro ao remover arquivo',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({ title: 'Arquivo removido com sucesso' });
      }
    }
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext || '')) {
      return <FileImage className="w-8 h-8 text-blue-500" />;
    }
    if (['mp4', 'mov', 'avi'].includes(ext || '')) {
      return <FileVideo className="w-8 h-8 text-purple-500" />;
    }
    return <FileText className="w-8 h-8 text-gray-500" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const totalFiles = files.length;
  const successFiles = files.filter(f => f.status === 'success').length;
  const uploadingFiles = files.filter(f => f.status === 'uploading').length;
  const errorFiles = files.filter(f => f.status === 'error').length;

  return (
    <MainLayout>
      <div className="space-y-6">
        <section className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-primary grid place-items-center shadow-medical">
              <Upload className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Upload de Arquivos</h1>
              <p className="text-muted-foreground">
                Sistema de upload e gerenciamento de arquivos
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Badge variant="secondary">
              {totalFiles} {totalFiles === 1 ? 'arquivo' : 'arquivos'}
            </Badge>
            {uploadingFiles > 0 && (
              <Badge variant="default">
                {uploadingFiles} enviando
              </Badge>
            )}
          </div>
        </section>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Tamanho máximo por arquivo: 10MB. Formatos aceitos: imagens, PDF, DOC, DOCX, vídeos.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Área de Upload</CardTitle>
            <CardDescription>
              Arraste arquivos ou clique para selecionar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors
                ${isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
            >
              <input {...getInputProps()} />
              <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragActive ? 'text-primary' : 'text-muted-foreground'}`} />
              {isDragActive ? (
                <p className="text-lg font-medium text-primary">Solte os arquivos aqui...</p>
              ) : (
                <>
                  <p className="text-lg font-medium mb-2">
                    Arraste arquivos aqui ou clique para selecionar
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Suporta múltiplos arquivos
                  </p>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {files.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Arquivos</CardTitle>
              <CardDescription>
                {successFiles} de {totalFiles} arquivos enviados com sucesso
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {files.map((uploadedFile) => (
                  <div
                    key={uploadedFile.id}
                    className="flex items-center gap-4 p-4 border rounded-lg"
                  >
                    <div className="flex-shrink-0">
                      {getFileIcon(uploadedFile.file.name)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium truncate">
                          {uploadedFile.file.name}
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(uploadedFile.id)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs text-muted-foreground">
                          {formatFileSize(uploadedFile.file.size)}
                        </span>
                        {uploadedFile.status === 'success' && (
                          <Badge variant="default" className="gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Concluído
                          </Badge>
                        )}
                        {uploadedFile.status === 'error' && (
                          <Badge variant="destructive" className="gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Erro
                          </Badge>
                        )}
                        {uploadedFile.status === 'uploading' && (
                          <Badge variant="secondary">
                            {Math.round(uploadedFile.progress)}%
                          </Badge>
                        )}
                      </div>
                      
                      {uploadedFile.status === 'uploading' && (
                        <Progress value={uploadedFile.progress} className="h-2" />
                      )}

                      {uploadedFile.status === 'success' && uploadedFile.url && (
                        <a
                          href={uploadedFile.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline"
                        >
                          Visualizar arquivo
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {totalFiles > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Estatísticas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{successFiles}</div>
                  <div className="text-sm text-muted-foreground">Sucesso</div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{uploadingFiles}</div>
                  <div className="text-sm text-muted-foreground">Enviando</div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{errorFiles}</div>
                  <div className="text-sm text-muted-foreground">Erros</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
};

export default FileUploadTest;