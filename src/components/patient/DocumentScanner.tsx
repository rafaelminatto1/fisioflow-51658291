import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, FileSearch, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api/v2/client';
import { API_URLS } from '@/lib/api/v2/config';
import { useToast } from '@/hooks/use-toast';

export const DocumentScanner = ({ onScanComplete }: { onScanComplete: (text: string) => void }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const startScan = async () => {
    if (!preview) return;
    
    try {
      setIsScanning(true);
      const base64 = preview.split(',')[1];
      
      const response = await apiClient.post<{ data: { text: string } }>(
        API_URLS.clinical.scanReport,
        { imageBase64: base64 }
      );

      toast({
        title: 'Scanner Concluído',
        description: 'O texto do laudo foi extraído com sucesso.'
      });

      onScanComplete(response.data.text);
      setPreview(null);
    } catch (_err) {
      toast({
        title: 'Erro no Scanner',
        description: 'Não foi possível ler o documento.',
        variant: 'destructive'
      });
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <Card className="border-dashed">
      <CardHeader className="py-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <FileSearch className="h-4 w-4 text-blue-500" />
          Scanner Inteligente de Laudos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!preview ? (
          <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg bg-muted/20">
            <Camera className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-xs text-muted-foreground text-center mb-4">
              Tire uma foto do laudo médico para extrair o texto automaticamente.
            </p>
            <Button size="sm" onClick={() => fileInputRef.current?.click()}>
              Selecionar Imagem
            </Button>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleFileSelect} 
            />
          </div>
        ) : (
          <div className="space-y-4">
            <img src={preview} alt="Preview" className="rounded-lg max-h-[300px] mx-auto" />
            <div className="flex gap-2">
              <Button 
                className="flex-1 bg-blue-600" 
                onClick={startScan} 
                disabled={isScanning}
              >
                {isScanning ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileSearch className="h-4 w-4 mr-2" />}
                {isScanning ? 'Lendo Documento...' : 'Iniciar Scanner IA'}
              </Button>
              <Button variant="outline" onClick={() => setPreview(null)} disabled={isScanning}>
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
