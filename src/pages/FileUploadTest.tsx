/**
 * File Upload Test Page - Migrated to Firebase
 */

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
import { useAuth } from '@/contexts/AuthContext';
import { getFirebaseStorage } from '@/integrations/firebase/storage';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

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
  const { user } = useAuth();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [, setIsDragging] = useState(false);

  const uploadFile = async (uploadedFile: UploadedFile) => {
    const { id: fileId, file } = uploadedFile;

    try {
      if (!user) {
        throw new Error('Usuário não autenticado.');
      }
      const filePath = `${user.uid}/${Date.now()}_${file.name}`;
      const storage = getFirebaseStorage();
      const storageRef = ref(storage, `documents/${filePath}`);

      // Upload file to Firebase Storage
      await uploadBytes(storageRef, file);

      // Get public URL
      const url = await getDownloadURL(storageRef);

      setFiles(prev =>
        prev.map(f =>
          f.id === fileId
            ? { ...f, progress: 100, status: 'success', url, path: filePath }
            : f
        )
      );

      toast({ title: 'Upload concluído com sucesso', description: file.name });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setFiles(prev =>
        prev.map(f =>
          f.id === fileId
            ? { ...f, status: 'error', error: errorMessage }
            : f
        )
      );
      toast({ title: 'Erro no upload', description: errorMessage, variant: 'destructive' });
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
      'image/*': ['.avif', '.avif', '.avif', '.gif'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    }
  });

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const clearAll = () => {
    setFiles([]);
  };

  return (
    <MainLayout>
      <div className="container mx-auto py-8 max-w-4xl">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Teste de Upload de Arquivos
            </CardTitle>
            <CardDescription>
              Teste o upload de arquivos usando Firebase Storage
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
                transition-colors duration-200
                ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
              `}
            >
              <input {...getInputProps()} />
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium mb-2">
                {isDragActive ? 'Solte os arquivos aqui' : 'Arraste arquivos aqui ou clique para selecionar'}
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                PDF, DOC, DOCX, Imagens (máx. 10MB)
              </p>
            </div>
          </CardContent>
        </Card>

        {files.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Arquivos</CardTitle>
              <Button variant="outline" size="sm" onClick={clearAll}>
                Limpar Todos
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {files.map(file => {
                  const getStatusIcon = () => {
                    switch (file.status) {
                      case 'success':
                        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
                      case 'error':
                        return <AlertCircle className="h-5 w-5 text-red-500" />;
                      default:
                        return null;
                    }
                  };

                  const getFileIcon = () => {
                    if (file.file.type.startsWith('image/')) {
                      return <FileImage className="h-5 w-5 text-blue-500" />;
                    } else if (file.file.type === 'application/pdf') {
                      return <FileText className="h-5 w-5 text-red-500" />;
                    } else {
                      return <FileText className="h-5 w-5 text-gray-500" />;
                    }
                  };

                  return (
                    <div key={file.id} className="flex items-center gap-4 p-4 border rounded-lg">
                      {getFileIcon()}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{file.file.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(file.file.size / 1024).toFixed(2)} KB
                        </p>
                        {file.status === 'uploading' && (
                          <Progress value={file.progress} className="mt-2" />
                        )}
                        {file.url && (
                          <a
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-500 hover:underline mt-1 block"
                          >
                            Ver arquivo
                          </a>
                        )}
                        {file.error && (
                          <p className="text-sm text-red-500 mt-1">{file.error}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={file.status === 'success' ? 'default' : file.status === 'error' ? 'destructive' : 'secondary'}
                        >
                          {file.status === 'uploading' ? 'Enviando...' : file.status === 'success' ? 'Sucesso' : 'Erro'}
                        </Badge>
                        {getStatusIcon()}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFile(file.id)}
                          disabled={file.status === 'uploading'}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {files.length > 0 && files.every(f => f.status !== 'uploading') && (
          <Alert className="mt-4">
            <AlertDescription>
              {files.filter(f => f.status === 'success').length} de {files.length} arquivos foram enviados com sucesso.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </MainLayout>
  );
};

export default FileUploadTest;
