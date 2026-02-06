/**
 * SessionImageUpload - Upload de imagens para sessão (antes/depois)
 * RF01.3 - Upload de imagens (antes/depois, exames) - até 5 por sessão
 *
 * Features:
 * - Upload de imagens com preview
 * - Categorização (antes, depois, exame, outros)
 * - Drag & drop
 * - Validação de tamanho e tipo
 * - Galería de imagens da sessão
 */

import React, { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {

  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import {
  AlertCircle,
  Image as ImageIcon,
  Upload,
  ZoomIn,
  Download,
  Trash2,
  Camera,
  File
} from 'lucide-react';
import { useUploadSessionAttachment, useDeleteSessionAttachment, useSessionAttachments, type SessionAttachmentCategory, type SessionAttachment } from '@/hooks/useSoapRecords';
import { fisioLogger as logger } from '@/lib/errors/logger';

interface SessionImageUploadProps {
  patientId: string;
  soapRecordId?: string;
  maxFiles?: number;
  readonly?: boolean;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];

const CATEGORY_LABELS: Record<SessionAttachmentCategory, string> = {
  before_after: 'Antes/Depois',
  exam: 'Exame',
  imaging: 'Imagem',
  document: 'Documento',
  other: 'Outro'
};

export const SessionImageUpload: React.FC<SessionImageUploadProps> = ({
  patientId,
  soapRecordId,
  maxFiles = 5,
  readonly = false
}) => {
  const [selectedCategory, setSelectedCategory] = useState<SessionAttachmentCategory>('before_after');
  const [previewImage, setPreviewImage] = useState<SessionAttachment | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { data: attachments = [] } = useSessionAttachments(soapRecordId, patientId);
  const uploadMutation = useUploadSessionAttachment();
  const deleteMutation = useDeleteSessionAttachment();

  const imageCount = attachments.filter(a =>
    a.file_type === 'jpg' || a.file_type === 'png' || a.file_type === 'gif'
  ).length;

  const canUploadMore = imageCount < maxFiles;

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (readonly || !canUploadMore) return;

    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }, [readonly, canUploadMore]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFiles(files);
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFiles = async (files: File[]) => {
    if (readonly || !canUploadMore) return;

    let successCount = 0;
    let errorCount = 0;

    for (const file of files) {
      // Validate file type
      if (!ACCEPTED_TYPES.includes(file.type)) {
        toast({
          title: 'Tipo de arquivo não suportado',
          description: `O arquivo "${file.name}" não é suportado. Use JPG, PNG, GIF, WebP ou PDF.`,
          variant: 'destructive'
        });
        errorCount++;
        continue;
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: 'Arquivo muito grande',
          description: `O arquivo "${file.name}" excede o limite de 10MB.`,
          variant: 'destructive'
        });
        errorCount++;
        continue;
      }

      setIsUploading(true);
      setUploadProgress(0);

      try {
        await uploadMutation.mutateAsync({
          file,
          soapRecordId,
          patientId,
          category: selectedCategory
        });

        setUploadProgress(100);
        successCount++;
      } catch (error) {
        logger.error('Upload error', error, 'SessionImageUpload');
        errorCount++;
        toast({
          title: 'Erro no upload',
          description: `Não foi possível fazer upload de "${file.name}". Tente novamente.`,
          variant: 'destructive'
        });
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
      }
    }

    // Show summary if multiple files were uploaded
    if (files.length > 1) {
      if (successCount > 0 && errorCount === 0) {
        toast({
          title: 'Upload concluído',
          description: `${successCount} arquivo(s) enviado(s) com sucesso.`
        });
      } else if (successCount > 0 && errorCount > 0) {
        toast({
          title: 'Upload parcial',
          description: `${successCount} arquivo(s) enviado(s), ${errorCount} com erro.`,
          variant: 'default'
        });
      }
    }
  };

  const handleDelete = async (attachmentId: string, attachmentName: string) => {
    if (readonly) return;
    setDeleteConfirm({ id: attachmentId, name: attachmentName });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;

    try {
      await deleteMutation.mutateAsync({
        attachmentId: deleteConfirm.id,
        patientId,
        soapRecordId
      });
    } catch (error) {
      logger.error('Delete error', error, 'SessionImageUpload');
    } finally {
      setDeleteConfirm(null);
    }
  };

  const isImage = (attachment: SessionAttachment) => {
    return ['jpg', 'png', 'gif', 'webp'].includes(attachment.file_type);
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              Anexos da Sessão
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              {imageCount}/{maxFiles}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Upload area */}
          {!readonly && canUploadMore && (
            <div>
              <div className="flex gap-2 mb-3">
                <Select
                  value={selectedCategory}
                  onValueChange={(v) => setSelectedCategory(v as SessionAttachmentCategory)}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="gap-2"
                >
                  <Camera className="h-4 w-4" />
                  Selecionar
                </Button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_TYPES.join(',')}
                multiple
                onChange={handleFileInput}
                className="hidden"
              />

              {/* Drop zone */}
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
                  dragActive
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50 hover:bg-muted/20'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                {isUploading ? (
                  <div className="space-y-2">
                    <Upload className="h-8 w-8 mx-auto text-primary animate-pulse" />
                    <p className="text-sm text-muted-foreground">Enviando arquivo...</p>
                    <Progress value={uploadProgress} className="h-1" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                    <p className="text-sm font-medium">
                      Arraste arquivos aqui ou clique para selecionar
                    </p>
                    <p className="text-xs text-muted-foreground">
                      JPG, PNG, PDF (máx. 10MB)
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Limit reached warning */}
          {!readonly && !canUploadMore && (
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              Limite de {maxFiles} arquivos atingido
            </div>
          )}

          {/* Gallery */}
          {attachments.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="group relative aspect-square rounded-lg overflow-hidden border border-border hover:border-primary/50 transition-colors cursor-pointer"
                  onClick={() => setPreviewImage(attachment)}
                >
                  {isImage(attachment) ? (
                    <img
                      src={attachment.file_url}
                      alt={attachment.original_name || attachment.file_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}

                  {/* Overlay with actions */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-white hover:text-white hover:bg-white/20"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(attachment.file_url, '_blank');
                      }}
                    >
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                    {!readonly && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-white hover:text-white hover:bg-red-500/80"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(attachment.id, attachment.original_name || attachment.file_name);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {/* Category badge */}
                  <Badge
                    variant="secondary"
                    className="absolute top-1 left-1 text-[10px] px-1 py-0 h-5"
                  >
                    {CATEGORY_LABELS[attachment.category]}
                  </Badge>
                </div>
              ))}
            </div>
          )}

          {attachments.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-20" />
              <p className="text-sm">Nenhum anexo nesta sessão</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Image preview dialog */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {previewImage?.original_name || 'Anexo'}
            </DialogTitle>
          </DialogHeader>

          {previewImage && (
            <div className="space-y-4">
              {/* Image */}
              {isImage(previewImage) ? (
                <div className="flex items-center justify-center bg-muted rounded-lg overflow-hidden max-h-[60vh]">
                  <img
                    src={previewImage.file_url}
                    alt={previewImage.original_name || previewImage.file_name}
                    className="max-w-full max-h-[60vh] object-contain"
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center bg-muted rounded-lg p-12">
                  <div className="text-center">
                    <ImageIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Visualização não disponível para este tipo de arquivo
                    </p>
                    <Button
                      variant="outline"
                      className="mt-4 gap-2"
                      onClick={() => window.open(previewImage.file_url, '_blank')}
                    >
                      <Download className="h-4 w-4" />
                      Baixar arquivo
                    </Button>
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">Categoria</Label>
                  <p>{CATEGORY_LABELS[previewImage.category]}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Tamanho</Label>
                  <p>{previewImage.size_bytes
                    ? `${(previewImage.size_bytes / 1024).toFixed(0)} KB`
                    : '-'}</p>
                </div>
                {previewImage.description && (
                  <div className="col-span-2">
                    <Label className="text-muted-foreground">Descrição</Label>
                    <p>{previewImage.description}</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => window.open(previewImage.file_url, '_blank')}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Baixar
                </Button>
                <Button onClick={() => setPreviewImage(null)}>
                  Fechar
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o arquivo "{deleteConfirm?.name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default SessionImageUpload;
