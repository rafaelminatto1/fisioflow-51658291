import React, { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScanFace, Upload, Video } from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { functions, storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';

export default function MovementLabPage() {
  const [file, setFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUploadAndAnalyze = async () => {
    if (!file) return;
    setLoading(true);
    setAnalysis('');

    try {
      // 1. Upload para Firebase Storage
      const storageRef = ref(storage, `movement_analysis/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const fileUrl = await getDownloadURL(storageRef);

      toast({ title: "Upload Completo", description: "Enviando para Gemini Vision..." });

      // 2. Chamar Cloud Function
      const aiMovementAnalysis = httpsCallable(functions, 'aiMovementAnalysis');
      const result = await aiMovementAnalysis({ 
        fileUrl, 
        mediaType: file.type.startsWith('video') ? 'video' : 'image' 
      });

      setAnalysis((result.data as any).analysis);

    } catch (error) {
      console.error(error);
      toast({ 
        title: "Erro", 
        description: "Falha na análise de movimento.", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
      <div className="flex items-center space-x-4 mb-8">
        <div className="p-3 bg-blue-100 rounded-lg">
          <ScanFace className="w-8 h-8 text-blue-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Laboratório de Movimento</h1>
          <p className="text-gray-500">Upload de vídeos para análise biomecânica com Gemini 1.5 Pro.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Entrada de Mídia</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:bg-gray-50 transition cursor-pointer relative">
              <Input 
                type="file" 
                accept="video/*,image/*" 
                className="absolute inset-0 opacity-0 cursor-pointer" 
                onChange={handleFileChange}
              />
              <div className="flex flex-col items-center">
                <Upload className="w-12 h-12 text-gray-500 mb-4" />
                <p className="text-sm font-medium text-gray-700">
                  {file ? file.name : "Arraste um vídeo ou clique para selecionar"}
                </p>
                <p className="text-xs text-gray-500 mt-1">MP4, MOV ou JPG</p>
              </div>
            </div>

            <Button 
              className="w-full bg-blue-600 hover:bg-blue-700"
              onClick={handleUploadAndAnalyze}
              disabled={!file || loading}
            >
              {loading ? "Analisando Biomecânica..." : "Iniciar Análise"}
            </Button>
          </CardContent>
        </Card>

        <Card className="min-h-[400px]">
          <CardHeader>
            <CardTitle>Análise Biomecânica</CardTitle>
          </CardHeader>
          <CardContent>
             {analysis ? (
              <div className="prose prose-blue max-w-none">
                <ReactMarkdown>{analysis}</ReactMarkdown>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <Video className="w-12 h-12 mb-2 opacity-20" />
                <p>O relatório aparecerá aqui.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      </div>
    </MainLayout>
  );
}
