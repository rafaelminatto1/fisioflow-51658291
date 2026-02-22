/**
 * AttachmentsBlock - Improved V2
 *
 * Enhanced attachments block with better file handling,
 * professional design, and improved visual presentation.
 */
import React, { useState, useCallback, useEffect } from 'react';
import {
  Paperclip,
  X,
  FileText,
  Image as ImageIcon,
  File,
  Eye,
  Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface Attachment {
  id: string;
  name: string;
  url: string;
  type?: 'image' | 'document' | 'other';
  size?: number;
}

interface AttachmentsBlockProps {
  patientId?: string;
  value: string[];
  onChange: (attachments: string[]) => void;
  disabled?: boolean;
  className?: string;
}

const getFileIcon = (type?: string): { icon: React.ReactNode; bgColor: string; textColor: string } => {
  switch (type) {
    case 'image':
      return {
        icon: <ImageIcon className="h-4 w-4" />,
        bgColor: 'bg-violet-500/10',
        textColor: 'text-violet-600'
      };
    case 'document':
      return {
        icon: <FileText className="h-4 w-4" />,
        bgColor: 'bg-blue-500/10',
        textColor: 'text-blue-600'
      };
    default:
      return {
        icon: <File className="h-4 w-4" />,
        bgColor: 'bg-gray-500/10',
        textColor: 'text-gray-600'
      };
  }
};

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

const getFileTypeFromName = (name: string): 'image' | 'document' | 'other' => {
  const ext = name.split('.').pop()?.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif'].includes(ext || '')) return 'image';
  if (['pdf', 'doc', 'docx', 'txt'].includes(ext || '')) return 'document';
  return 'other';
};

export const AttachmentsBlock: React.FC<AttachmentsBlockProps> = ({
  patientId,
  value = [],
  onChange,
  disabled = false,
  className,
}) => {
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>(() => {
    return value.map((url, i) => {
      const name = url.split('/').pop() || `Anexo ${i + 1}`;
      return {
        id: `att_${i}`,
        name,
        url,
        type: getFileTypeFromName(name),
      };
    });
  });

  useEffect(() => {
    setAttachments(value.map((url, i) => {
      const name = url.split('/').pop() || `Anexo ${i + 1}`;
      return {
        id: `att_${i}`,
        name,
        url,
        type: getFileTypeFromName(name),
      };
    }));
  }, [value]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('Arquivo muito grande. Tamanho máximo: 10MB');
        return;
      }
      setSelectedFile(file);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('Arquivo muito grande. Tamanho máximo: 10MB');
        return;
      }
      setSelectedFile(file);
    }
  }, []);

  const handleUpload = useCallback(() => {
    if (!selectedFile) return;

    const fakeUrl = URL.createObjectURL(selectedFile);
    const newAttachment: Attachment = {
      id: `att_${Date.now()}`,
      name: selectedFile.name,
      url: fakeUrl,
      type: getFileTypeFromName(selectedFile.name),
      size: selectedFile.size,
    };

    const updated = [...attachments, newAttachment];
    setAttachments(updated);
    onChange(updated.map((a) => a.url));
    setSelectedFile(null);
    setUploadModalOpen(false);
  }, [selectedFile, attachments, onChange]);

  const handleRemove = useCallback((id: string) => {
    const updated = attachments.filter((a) => a.id !== id);
    setAttachments(updated);
    onChange(updated.map((a) => a.url));
  }, [attachments, onChange]);

  return (
    <>
      <div className={cn(
        'relative transition-all duration-300 group',
        className
      )}>
        {/* Header */}
        <div className="relative">
          <div className="flex items-center justify-between px-2 py-1.5 opacity-70 group-hover:opacity-100 transition-opacity">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 border border-cyan-500/20">
                <Paperclip className="h-4 w-4 text-cyan-500" />
              </div>
              <div className="flex flex-col">
                <h3 className="text-sm font-semibold text-foreground">Anexos</h3>
                {attachments.length > 0 && (
                  <span className="text-[10px] text-muted-foreground">
                    {attachments.length} arquivo{attachments.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="px-2 pb-2">
          {/* Attachments list */}
          {attachments.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-muted to-muted/50 mx-auto mb-3 flex items-center justify-center">
                <Paperclip className="h-7 w-7 opacity-30" />
              </div>
              <p className="text-sm font-medium">Nenhum anexo</p>
              <p className="text-xs mt-1.5 opacity-70">Adicione fotos, documentos ou outros arquivos</p>
            </div>
          ) : (
            <div className="space-y-2">
              {attachments.map((attachment) => {
                const { icon, bgColor, textColor } = getFileIcon(attachment.type);
                return (
                  <div
                    key={attachment.id}
                    className="group relative flex items-center gap-3 p-3 rounded-xl border border-border/50 hover:border-cyan-200 hover:bg-cyan-500/5 transition-all"
                  >
                    <div className={cn(
                      'p-2 rounded-xl flex-shrink-0 transition-colors',
                      bgColor,
                      textColor
                    )}>
                      {icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{attachment.name}</p>
                      {attachment.size && (
                        <p className="text-xs text-muted-foreground">{formatFileSize(attachment.size)}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {attachment.type === 'image' && (
                        <button
                          className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                          title="Visualizar"
                        >
                          <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                      )}
                      <button
                        onClick={() => handleRemove(attachment.id)}
                        disabled={disabled}
                        className="p-1.5 rounded-lg hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                        title="Remover"
                      >
                        <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add attachment button */}
          <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={disabled}
                className="w-full mt-3 gap-2 border-dashed h-9 rounded-lg hover:border-cyan-300 hover:bg-cyan-500/5 hover:text-cyan-600"
              >
                <Upload className="h-3.5 w-3.5" />
                Adicionar Anexo
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[440px] rounded-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-lg">
                  <div className="p-1.5 rounded-lg bg-gradient-to-br from-cyan-500/10 to-cyan-500/5">
                    <Upload className="h-5 w-5 text-cyan-500" />
                  </div>
                  Anexar Arquivo
                </DialogTitle>
                <DialogDescription className="text-sm">
                  Adicione fotos, documentos ou outros arquivos à evolução. Máximo: 10MB
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {/* Drop zone */}
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  className={cn(
                    'relative border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer',
                    isDragging ? 'border-cyan-500 bg-cyan-500/5' : 'border-border hover:border-border/80 hover:bg-muted/30'
                  )}
                  onClick={() => document.getElementById('file-upload')?.click()}
                >
                  <input
                    id="file-upload"
                    type="file"
                    accept="image/*,.pdf,.doc,.docx"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-muted to-muted/50 mx-auto mb-3 flex items-center justify-center">
                    <Upload className="h-6 w-6 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm font-medium">
                    {isDragging ? 'Solte o arquivo aqui' : 'Arraste um arquivo ou clique para selecionar'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Imagens (JPG, PNG), PDF - Máx. 10MB
                  </p>
                </div>

                {selectedFile && (
                  <div className="p-3 rounded-xl bg-muted/30 border border-border/50">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-600">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                        <p className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
                      </div>
                      <button
                        onClick={() => setSelectedFile(null)}
                        className="p-1 rounded-lg hover:bg-muted"
                      >
                        <X className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setUploadModalOpen(false);
                    setSelectedFile(null);
                  }}
                  className="rounded-lg"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={!selectedFile}
                  className="rounded-lg"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Anexar Arquivo
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </>
  );
};
