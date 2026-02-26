import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Upload, X, Loader2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { storage } from '@/integrations/firebase/app';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { knowledgeService } from '../../services/knowledgeService';
import { aiService } from '../../services/aiService';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface ArticleUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ArticleUploadDialog({ open, onOpenChange, onSuccess }: ArticleUploadDialogProps) {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState<'idle' | 'uploading' | 'indexing'>('idle');

  const { register, handleSubmit, reset, setValue } = useForm({
    defaultValues: {
      title: '',
      group: 'Ortopedia',
      subgroup: '',
      evidenceLevel: 'Consensus'
    }
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      // Auto-fill title from filename if empty
      setValue('title', e.target.files[0].name.replace('.pdf', '').replace(/_/g, ' '));
    }
  };

  const onSubmit = async (data: any) => {
    if (!file || !user?.organizationId) return;

    try {
      setIsUploading(true);
      setUploadStep('uploading');

      // 1. Upload to Storage
      const storageRef = ref(storage, `knowledge-base/${user.organizationId}/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      // 2. Create Firestore Record
      const artifactId = await knowledgeService.createArtifact({
        organizationId: user.organizationId,
        title: data.title,
        type: 'pdf',
        url: downloadURL,
        group: data.group,
        subgroup: data.subgroup,
        evidenceLevel: data.evidenceLevel,
        status: 'verified', // Auto-verified for internal uploads for now
        tags: [],
        vectorStatus: 'pending',
        metadata: {
          year: new Date().getFullYear(),
          authors: [{ name: user.email || 'Internal' }],
        },
        viewCount: 0,
        createdBy: user.uid
      });

      // 3. Trigger AI Processing
      setUploadStep('indexing');
      try {
        await aiService.processArtifact(artifactId);
        toast.success('Artigo adicionado e processado pela IA!');
      } catch (aiError) {
        console.error("AI Processing failed (can happen locally)", aiError);
        toast.warning('Artigo salvo, mas o processamento de IA falhou ou demorou.');
      }

      onSuccess();
      onOpenChange(false);
      reset();
      setFile(null);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao fazer upload do artigo.');
    } finally {
      setIsUploading(false);
      setUploadStep('idle');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Adicionar Conhecimento</DialogTitle>
          <DialogDescription>
            Faça upload de um PDF (Consenso, Diretriz ou Protocolo) para a base.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Arquivo PDF</Label>
            <div className="flex items-center gap-2">
              <Input 
                type="file" 
                accept="application/pdf" 
                onChange={handleFileChange}
                disabled={isUploading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Título do Artigo</Label>
            <Input {...register('title', { required: true })} placeholder="Ex: Consenso LCA 2024" disabled={isUploading} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Grupo</Label>
              <Select onValueChange={(v) => setValue('group', v)} defaultValue="Ortopedia" disabled={isUploading}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ortopedia">Ortopedia</SelectItem>
                  <SelectItem value="Esportiva">Esportiva</SelectItem>
                  <SelectItem value="Pós-Operatório">Pós-Operatório</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Subgrupo</Label>
              <Input {...register('subgroup')} placeholder="Ex: Joelho, Ombro" disabled={isUploading} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Nível de Evidência</Label>
            <Select onValueChange={(v) => setValue('evidenceLevel', v)} defaultValue="Consensus" disabled={isUploading}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CPG">Diretriz Clínica (CPG)</SelectItem>
                <SelectItem value="Consensus">Consenso</SelectItem>
                <SelectItem value="SystematicReview">Revisão Sistemática</SelectItem>
                <SelectItem value="Protocol">Protocolo Interno</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isUploading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isUploading || !file}>
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {uploadStep === 'uploading' ? 'Enviando...' : 'Indexando IA...'}
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Adicionar
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
