import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Video, Loader2, PlayCircle, AlertCircle, CheckCircle2 } from 'lucide-react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFirebaseApp } from '@/integrations/firebase/app';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import { MotionCard } from '@fisioflow/ui';

interface AnalysisResult {
  reps: number;
  score: number;
  errors: string[];
  feedback: string;
  isValidExercise: boolean;
}

interface ServerSideVideoAnalyzerProps {
  exerciseName?: string;
  onAnalysisComplete?: (result: AnalysisResult) => void;
}

export const ServerSideVideoAnalyzer: React.FC<ServerSideVideoAnalyzerProps> = ({
  exerciseName = "Exercício Livre",
  onAnalysisComplete
}) => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        toast.error("O vídeo deve ter no máximo 50MB");
        return;
      }
      setVideoFile(file);
      setVideoUrl(URL.createObjectURL(file));
      setResult(null);
    }
  };

  const handleUploadAndAnalyze = async () => {
    if (!videoFile) return;

    try {
      setIsUploading(true);
      const storage = getStorage(getFirebaseApp());
      const fileName = `analysis/${Date.now()}_${videoFile.name}`;
      const storageRef = ref(storage, fileName);

      // Upload
      const snapshot = await uploadBytes(storageRef, videoFile);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      setUploadProgress(100);
      setIsUploading(false);
      setIsAnalyzing(true);

      // Call Cloud Function
      const functions = getFunctions(getFirebaseApp(), 'southamerica-east1');
      const analyzeFn = httpsCallable(functions, 'analyzeMovementVideo');
      
      const response = await analyzeFn({
        videoUrl: downloadURL,
        exerciseName: exerciseName
      });

      const analysisData = (response.data as any).analysis as AnalysisResult;
      setResult(analysisData);
      
      if (onAnalysisComplete) {
        onAnalysisComplete(analysisData);
      }
      
      toast.success("Análise concluída com sucesso!");

    } catch (error) {
      console.error("Erro na análise:", error);
      toast.error("Falha ao analisar o vídeo. Tente novamente.");
    } finally {
      setIsUploading(false);
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      <MotionCard variant="glass" className="p-6">
        <div className="flex flex-col items-center justify-center text-center space-y-4">
          <div className="p-4 rounded-full bg-primary/10 text-primary">
            <Video className="h-8 w-8" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Análise Biomecânica com IA</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Envie um vídeo do exercício para análise automática de técnica, contagem e feedback via Gemini 1.5 Pro.
            </p>
          </div>

          {!videoFile ? (
            <div className="w-full max-w-md">
              <input
                type="file"
                accept="video/*"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileSelect}
              />
              <Button 
                variant="outline" 
                className="w-full h-32 border-dashed border-2 flex flex-col gap-2 hover:bg-muted/50"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-6 w-6 text-muted-foreground" />
                <span className="text-muted-foreground">Clique para selecionar um vídeo</span>
              </Button>
            </div>
          ) : (
            <div className="w-full max-w-md space-y-4">
              <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
                <video src={videoUrl!} controls className="w-full h-full object-contain" />
              </div>
              
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => { setVideoFile(null); setResult(null); }}
                  disabled={isUploading || isAnalyzing}
                  className="flex-1"
                >
                  Trocar Vídeo
                </Button>
                <Button 
                  onClick={handleUploadAndAnalyze}
                  disabled={isUploading || isAnalyzing}
                  className="flex-1"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...
                    </>
                  ) : isAnalyzing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analisando...
                    </>
                  ) : (
                    <>
                      <PlayCircle className="mr-2 h-4 w-4" /> Analisar
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </MotionCard>

      {result && (
        <MotionCard variant="glass" className="p-0 overflow-hidden animate-in fade-in slide-in-from-bottom-4">
          <div className="p-6 border-b border-border/10 bg-primary/5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold">Resultado da Análise</h3>
                <p className="text-sm text-muted-foreground">Baseado na visão computacional do Gemini</p>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-3xl font-black text-primary">{result.score}/10</span>
                <span className="text-xs text-muted-foreground">Pontuação Técnica</span>
              </div>
            </div>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">Dados</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-background border border-border">
                    <span className="text-xs text-muted-foreground">Repetições</span>
                    <p className="text-2xl font-bold">{result.reps}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-background border border-border">
                    <span className="text-xs text-muted-foreground">Validação</span>
                    <div className="flex items-center gap-2 mt-1">
                      {result.isValidExercise ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-amber-500" />
                      )}
                      <span className="font-medium">{result.isValidExercise ? 'Válido' : 'Inválido'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">Feedback</h4>
                <p className="text-sm leading-relaxed bg-muted/30 p-3 rounded-lg">
                  {result.feedback}
                </p>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">Erros Identificados</h4>
              {result.errors.length > 0 ? (
                <ul className="space-y-2">
                  {result.errors.map((error, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm p-2 rounded-md bg-red-500/5 border border-red-500/10 text-red-700 dark:text-red-400">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-4 rounded-lg border border-dashed">
                  <CheckCircle2 className="h-8 w-8 text-green-500 mb-2" />
                  <p className="text-sm font-medium">Execução Perfeita!</p>
                  <p className="text-xs text-muted-foreground">Nenhum erro significativo detectado.</p>
                </div>
              )}
            </div>
          </div>
        </MotionCard>
      )}
    </div>
  );
};
