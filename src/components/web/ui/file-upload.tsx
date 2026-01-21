import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/shared/ui/button';
import { Progress } from '@/components/shared/ui/progress';
import { Card, CardContent } from '@/components/shared/ui/card';
import { Badge } from '@/components/shared/ui/badge';
import { 
  Upload, 
  File, 
  Image, 
  Video, 
  FileText, 
  X, 
  Download,
  Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFileUpload, UseFileUploadOptions } from '@/hooks/useFileUpload';

interface FileUploadProps extends UseFileUploadOptions {
  className?: string;
  multiple?: boolean;
  disabled?: boolean;
  maxFiles?: number;
  accept?: Record<string, string[]>;
  placeholder?: string;
  showPreview?: boolean;
  showProgress?: boolean;
}

interface FilePreviewProps {
  file: {
    id: string;
    name: string;
    path: string;
    publicUrl: string;
    size: number;
  };
  onRemove: (id: string, path: string) => void;
  onView?: (url: string) => void;
  onDownload?: (url: string, name: string) => void;
}

function FilePreview({ file, onRemove, onView, onDownload }: FilePreviewProps) {
  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'webp':
        return <Image className="h-4 w-4" />;
      case 'mp4':
      case 'webm':
      case 'avi':
      case 'mov':
        return <Video className="h-4 w-4" />;
      case 'pdf':
        return <FileText className="h-4 w-4 text-red-500" />;
      case 'doc':
      case 'docx':
        return <FileText className="h-4 w-4 text-blue-500" />;
      default:
        return <File className="h-4 w-4" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const isImage = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '');
  };

  return (
    <Card className="p-3">
      <CardContent className="p-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            {isImage(file.name) ? (
              <img 
                src={file.publicUrl} 
                alt={file.name}
                className="h-10 w-10 rounded object-cover flex-shrink-0"
              />
            ) : (
              <div className="h-10 w-10 rounded bg-muted flex items-center justify-center flex-shrink-0">
                {getFileIcon(file.name)}
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(file.size)}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-1 flex-shrink-0">
            {onView && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onView(file.publicUrl)}
                className="h-8 w-8 p-0"
              >
                <Eye className="h-4 w-4" />
              </Button>
            )}
            
            {onDownload && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDownload(file.publicUrl, file.name)}
                className="h-8 w-8 p-0"
              >
                <Download className="h-4 w-4" />
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemove(file.id, file.path)}
              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function FileUpload({
  className,
  multiple = false,
  disabled = false,
  maxFiles = 10,
  accept,
  placeholder = "Arraste arquivos aqui ou clique para selecionar",
  showPreview = true,
  showProgress = true,
  ...uploadOptions
}: FileUploadProps) {
  const { 
    isUploading, 
    progress, 
    uploadedFiles, 
    upload, 
    removeFile 
  } = useFileUpload(uploadOptions);

  const [dragActive, setDragActive] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (disabled || isUploading) return;
    
    // Verificar limite de arquivos
    if (uploadedFiles.length + acceptedFiles.length > maxFiles) {
      // Aqui você pode mostrar um toast de erro
      return;
    }
    
    await upload(acceptedFiles);
  }, [disabled, isUploading, uploadedFiles.length, maxFiles, upload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    multiple,
    disabled: disabled || isUploading,
    onDragEnter: () => setDragActive(true),
    onDragLeave: () => setDragActive(false)
  });

  const handleViewFile = (url: string) => {
    window.open(url, '_blank');
  };

  const handleDownloadFile = (url: string, name: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Área de Drop */}
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
          "hover:border-primary/50 hover:bg-muted/50",
          isDragActive && "border-primary bg-primary/5",
          dragActive && "border-primary bg-primary/5",
          disabled && "cursor-not-allowed opacity-50",
          isUploading && "cursor-not-allowed"
        )}
      >
        <input {...getInputProps()} />
        
        <div className="flex flex-col items-center space-y-2">
          <Upload className={cn(
            "h-8 w-8 text-muted-foreground",
            (isDragActive || dragActive) && "text-primary"
          )} />
          
          <div className="space-y-1">
            <p className="text-sm font-medium">
              {isUploading ? 'Enviando arquivos...' : placeholder}
            </p>
            
            {!isUploading && (
              <p className="text-xs text-muted-foreground">
                {multiple ? `Máximo ${maxFiles} arquivos` : 'Apenas um arquivo'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Barra de Progresso */}
      {showProgress && isUploading && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Enviando...</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {/* Preview dos Arquivos */}
      {showPreview && uploadedFiles.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Arquivos enviados</h4>
            <Badge variant="secondary">
              {uploadedFiles.length} {uploadedFiles.length === 1 ? 'arquivo' : 'arquivos'}
            </Badge>
          </div>
          
          <div className="space-y-2">
            {uploadedFiles.map((file) => (
              <FilePreview
                key={file.id}
                file={file}
                onRemove={removeFile}
                onView={handleViewFile}
                onDownload={handleDownloadFile}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default FileUpload;