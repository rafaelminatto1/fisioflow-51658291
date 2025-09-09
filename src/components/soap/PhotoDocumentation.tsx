import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Camera, 
  Image, 
  Upload, 
  X, 
  Eye, 
  Download, 
  Trash2,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PhotoRecord {
  id: string;
  url: string;
  filename: string;
  description: string;
  category: PhotoCategory;
  anatomical_region: string;
  view_angle: string;
  capture_date: string;
  file_size: number;
  annotations?: PhotoAnnotation[];
  privacy_consent: boolean;
}

interface PhotoAnnotation {
  id: string;
  type: 'arrow' | 'circle' | 'rectangle' | 'text';
  x: number;
  y: number;
  width?: number;
  height?: number;
  text?: string;
  color: string;
}

type PhotoCategory = 
  | 'posture_analysis'
  | 'skin_condition'
  | 'deformity'
  | 'swelling'
  | 'scar_tissue'
  | 'wound_care'
  | 'exercise_demonstration'
  | 'equipment_setup'
  | 'progress_comparison'
  | 'other';

interface PhotoDocumentationProps {
  photos: PhotoRecord[];
  onChange: (photos: PhotoRecord[]) => void;
  patientId?: string;
  maxPhotos?: number;
  maxFileSizeMB?: number;
  allowedFormats?: string[];
  className?: string;
}

const photoCategories = {
  posture_analysis: { label: 'Análise Postural', color: 'bg-blue-100 text-blue-800' },
  skin_condition: { label: 'Condição da Pele', color: 'bg-orange-100 text-orange-800' },
  deformity: { label: 'Deformidade', color: 'bg-purple-100 text-purple-800' },
  swelling: { label: 'Edema/Inchaço', color: 'bg-cyan-100 text-cyan-800' },
  scar_tissue: { label: 'Cicatriz/Aderência', color: 'bg-gray-100 text-gray-800' },
  wound_care: { label: 'Cuidado com Feridas', color: 'bg-red-100 text-red-800' },
  exercise_demonstration: { label: 'Demonstração de Exercício', color: 'bg-green-100 text-green-800' },
  equipment_setup: { label: 'Setup de Equipamento', color: 'bg-indigo-100 text-indigo-800' },
  progress_comparison: { label: 'Comparação de Progresso', color: 'bg-yellow-100 text-yellow-800' },
  other: { label: 'Outros', color: 'bg-slate-100 text-slate-800' }
};

const anatomicalRegions = [
  'Cabeça e Pescoço', 'Coluna Cervical', 'Ombros', 'Braços', 'Cotovelos', 'Punhos e Mãos',
  'Tórax', 'Coluna Torácica', 'Abdome', 'Coluna Lombar', 'Pelve', 'Quadris',
  'Coxas', 'Joelhos', 'Pernas', 'Tornozelos e Pés', 'Corpo Inteiro'
];

const viewAngles = [
  'Anterior', 'Posterior', 'Lateral Direita', 'Lateral Esquerda', 
  'Superior', 'Inferior', 'Oblíqua', 'Close-up', 'Panorâmica'
];

export function PhotoDocumentation({
  photos,
  onChange,
  _patientId,
  maxPhotos = 20,
  maxFileSizeMB = 10,
  allowedFormats = ['image/jpeg', 'image/png', 'image/webp'],
  className
}: PhotoDocumentationProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoRecord | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (files: FileList) => {
    if (photos.length + files.length > maxPhotos) {
      alert(`Máximo de ${maxPhotos} fotos permitidas.`);
      return;
    }

    setIsUploading(true);

    try {
      const newPhotos: PhotoRecord[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Validate file type
        if (!allowedFormats.includes(file.type)) {
          alert(`Formato não suportado: ${file.name}. Use JPEG, PNG ou WebP.`);
          continue;
        }

        // Validate file size
        if (file.size > maxFileSizeMB * 1024 * 1024) {
          alert(`Arquivo muito grande: ${file.name}. Máximo ${maxFileSizeMB}MB.`);
          continue;
        }

        // Create object URL for preview (in production, upload to storage)
        const url = URL.createObjectURL(file);

        const photoRecord: PhotoRecord = {
          id: `photo-${Date.now()}-${i}`,
          url,
          filename: file.name,
          description: '',
          category: 'other',
          anatomical_region: '',
          view_angle: '',
          capture_date: new Date().toISOString(),
          file_size: file.size,
          privacy_consent: false
        };

        newPhotos.push(photoRecord);
      }

      onChange([...photos, ...newPhotos]);
    } catch (error) {
      console.error('Error uploading photos:', error);
      alert('Erro ao fazer upload das fotos.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  const updatePhoto = (id: string, updates: Partial<PhotoRecord>) => {
    onChange(photos.map(photo => photo.id === id ? { ...photo, ...updates } : photo));
  };

  const removePhoto = (id: string) => {
    onChange(photos.filter(photo => photo.id !== id));
    if (selectedPhoto?.id === id) {
      setSelectedPhoto(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Documentação Fotográfica
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Registro visual para documentação clínica e acompanhamento de evolução
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="p-4 bg-muted rounded-full">
                  <Camera className="w-8 h-8 text-muted-foreground" />
                </div>
              </div>
              
              <div>
                <h4 className="font-medium">Adicionar Fotos</h4>
                <p className="text-sm text-muted-foreground">
                  Arraste e solte ou clique para selecionar
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Máximo {maxPhotos} fotos • Até {maxFileSizeMB}MB cada • JPEG, PNG, WebP
                </p>
              </div>

              <div className="flex justify-center gap-2">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading || photos.length >= maxPhotos}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Selecionar Arquivos
                </Button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept={allowedFormats.join(',')}
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) {
                    handleFileUpload(e.target.files);
                  }
                }}
              />
            </div>
          </div>

          {/* Photo Gallery */}
          {photos.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium">Fotos Anexadas ({photos.length}/{maxPhotos})</h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {photos.map((photo) => {
                  const category = photoCategories[photo.category];
                  
                  return (
                    <Card key={photo.id} className="overflow-hidden">
                      <div className="relative aspect-video bg-muted">
                        <img
                          src={photo.url}
                          alt={photo.description || 'Foto clínica'}
                          className="w-full h-full object-cover cursor-pointer"
                          onClick={() => setSelectedPhoto(photo)}
                        />
                        <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                          <Button size="sm" variant="secondary">
                            <Eye className="w-4 h-4 mr-2" />
                            Visualizar
                          </Button>
                        </div>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="absolute top-2 right-2"
                          onClick={() => removePhoto(photo.id)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                      
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge className={category.color} variant="secondary">
                            {category.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatFileSize(photo.file_size)}
                          </span>
                        </div>
                        
                        <Input
                          value={photo.description}
                          onChange={(e) => updatePhoto(photo.id, { description: e.target.value })}
                          placeholder="Descrição da foto..."
                          className="text-xs"
                        />
                        
                        <div className="grid grid-cols-2 gap-2">
                          <Select
                            value={photo.category}
                            onValueChange={(value: PhotoCategory) => updatePhoto(photo.id, { category: value })}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(photoCategories).map(([key, cat]) => (
                                <SelectItem key={key} value={key}>
                                  {cat.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          
                          <Select
                            value={photo.anatomical_region}
                            onValueChange={(value) => updatePhoto(photo.id, { anatomical_region: value })}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Região" />
                            </SelectTrigger>
                            <SelectContent>
                              {anatomicalRegions.map((region) => (
                                <SelectItem key={region} value={region}>
                                  {region}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`consent-${photo.id}`}
                            checked={photo.privacy_consent}
                            onChange={(e) => updatePhoto(photo.id, { privacy_consent: e.target.checked })}
                            className="w-3 h-3"
                          />
                          <label htmlFor={`consent-${photo.id}`} className="text-xs">
                            Consentimento obtido
                          </label>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Privacy Notice */}
          <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-800 mb-1">Aviso de Privacidade</p>
              <p className="text-amber-700">
                As fotografias clínicas são consideradas dados sensíveis pela LGPD. 
                Certifique-se de obter o consentimento expresso do paciente antes de capturar 
                e armazenar imagens. As fotos devem ser usadas exclusivamente para fins 
                terapêuticos e documentação médica.
              </p>
            </div>
          </div>

          {/* Photo Viewer Modal */}
          <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Image className="w-5 h-5" />
                  Visualização de Foto Clínica
                </DialogTitle>
              </DialogHeader>
              
              {selectedPhoto && (
                <div className="space-y-4">
                  <div className="relative bg-black rounded-lg overflow-hidden">
                    <img
                      src={selectedPhoto.url}
                      alt={selectedPhoto.description || 'Foto clínica'}
                      className="w-full max-h-96 object-contain"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Descrição</label>
                      <Textarea
                        value={selectedPhoto.description}
                        onChange={(e) => updatePhoto(selectedPhoto.id, { description: e.target.value })}
                        placeholder="Descrição detalhada da foto..."
                        rows={3}
                      />
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium">Categoria</label>
                        <Select
                          value={selectedPhoto.category}
                          onValueChange={(value: PhotoCategory) => updatePhoto(selectedPhoto.id, { category: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(photoCategories).map(([key, cat]) => (
                              <SelectItem key={key} value={key}>
                                {cat.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium">Região Anatômica</label>
                        <Select
                          value={selectedPhoto.anatomical_region}
                          onValueChange={(value) => updatePhoto(selectedPhoto.id, { anatomical_region: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a região" />
                          </SelectTrigger>
                          <SelectContent>
                            {anatomicalRegions.map((region) => (
                              <SelectItem key={region} value={region}>
                                {region}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium">Ângulo de Visão</label>
                        <Select
                          value={selectedPhoto.view_angle}
                          onValueChange={(value) => updatePhoto(selectedPhoto.id, { view_angle: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o ângulo" />
                          </SelectTrigger>
                          <SelectContent>
                            {viewAngles.map((angle) => (
                              <SelectItem key={angle} value={angle}>
                                {angle}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="text-sm text-muted-foreground">
                      <p>Capturada em: {format(new Date(selectedPhoto.capture_date), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</p>
                      <p>Tamanho: {formatFileSize(selectedPhoto.file_size)}</p>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => {
                          removePhoto(selectedPhoto.id);
                          setSelectedPhoto(null);
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remover
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}