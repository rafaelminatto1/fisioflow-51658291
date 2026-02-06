/**
 * Movement Lab Page - Google AI Suite (EXPANDIDA)
 *
 * Funcionalidades:
 * - MediaPipe Pose Landmarker (33 keypoints em 3D)
 * - Comparação lado a lado com vídeo de referência
 * - Análise de articulações com ângulos
 * - Timeline de progresso
 * - Banco de exercícios de referência
 */

import React, { useState, useRef } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ScanFace,
  Upload,
  Video,
  Play,
  Pause,
  Download,
  Activity,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  BarChart3,
} from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { functions, storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';
import { PoseOverlay } from '@/components/ai/PoseOverlay';
import { PoseComparison } from '@/components/ai/PoseComparison';
import { ProgressTimeline } from '@/components/ai/ProgressTimeline';

interface PoseAnalysis {
  summary: string;
  overallScore: number;
  postureScore: number;
  romScore: number;
  controlScore: number;
  tempoScore: number;
  joints: {
    leftShoulder?: { angle: number; status: string };
    rightShoulder?: { angle: number; status: string };
    leftElbow?: { angle: number; status: string };
    rightElbow?: { angle: number; status: string };
    leftHip?: { angle: number; status: string };
    rightHip?: { angle: number; status: string };
    leftKnee?: { angle: number; status: string };
    rightKnee?: { angle: number; status: string };
  };
  deviations: string[];
  recommendations: string[];
}

interface JointAnalysis {
  name: string;
  leftAngle?: number;
  rightAngle?: number;
  asymmetry?: number;
  status: 'normal' | 'warning' | 'critical';
}

export default function MovementLabPage() {
  const [file, setFile] = useState<File | null>(null);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<PoseAnalysis | null>(null);
  const [jointAnalysis, setJointAnalysis] = useState<JointAnalysis[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('upload');
  const [patientId, setPatientId] = useState<string>('');
  const { toast } = useToast();

  const patientVideoRef = useRef<HTMLVideoElement>(null);
  const referenceVideoRef = useRef<HTMLVideoElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'main' | 'reference' = 'main') => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (type === 'main') {
        setFile(selectedFile);
      } else {
        setReferenceFile(selectedFile);
      }
    }
  };

  const handleUploadAndAnalyze = async () => {
    if (!file) return;
    setLoading(true);
    setAnalysis(null);
    setJointAnalysis([]);

    try {
      // 1. Upload para Firebase Storage
      const storageRef = ref(storage, `movement_analysis/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const fileUrl = await getDownloadURL(storageRef);

      toast({ title: 'Upload Completo', description: 'Enviando para análise...' });

      // 2. Chamar Cloud Function com MediaPipe
      const aiMovementAnalysis = httpsCallable(functions, 'aiMovementAnalysisWithPose');
      const result = await aiMovementAnalysis({
        fileUrl,
        mediaType: file.type.startsWith('video') ? 'video' : 'image',
        includePoseData: true,
      });

      const data = result.data as unknown as PoseAnalysis;
      setAnalysis(data);

      // Processar análise de articulações
      if (data.joints) {
        const joints: JointAnalysis[] = [];

        if (data.joints.leftShoulder) {
          joints.push({
            name: 'Ombro Esquerdo',
            leftAngle: data.joints.leftShoulder.angle,
            status: data.joints.leftShoulder.status,
          });
        }
        if (data.joints.rightShoulder) {
          joints.push({
            name: 'Ombro Direito',
            rightAngle: data.joints.rightShoulder.angle,
            status: data.joints.rightShoulder.status,
          });
        }
        // ... adicionar outras articulações

        // Calcular assimetrias
        const processed = joints.map((joint) => {
          if (joint.leftAngle && joint.rightAngle) {
            joint.asymmetry = Math.abs(joint.leftAngle - joint.rightAngle);
            if (joint.asymmetry > 15) {
              joint.status = 'critical';
            } else if (joint.asymmetry > 10) {
              joint.status = 'warning';
            }
          }
          return joint;
        });

        setJointAnalysis(processed);
      }

      toast({
        title: 'Análise Concluída',
        description: '33 pontos de referência detectados com MediaPipe',
      });
    } catch (error) {
      console.error(error);
      toast({
        title: 'Erro',
        description: 'Falha na análise de movimento.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'critical':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-blue-100 rounded-lg">
            <ScanFace className="w-8 h-8 text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Laboratório de Movimento</h1>
            <p className="text-gray-500">
              Análise biomecânica com MediaPipe Pose Landmarker (33 keypoints em 3D)
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="upload">Upload</TabsTrigger>
            <TabsTrigger value="analysis">Análise</TabsTrigger>
            <TabsTrigger value="comparison">Comparação</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
          </TabsList>

          {/* Upload Tab */}
          <TabsContent value="upload">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Video Principal */}
              <Card>
                <CardHeader>
                  <CardTitle>Vídeo do Paciente</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:bg-gray-50 transition cursor-pointer relative">
                    <Input
                      type="file"
                      accept="video/*,image/*"
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      onChange={(e) => handleFileChange(e, 'main')}
                    />
                    <div className="flex flex-col items-center">
                      <Upload className="w-12 h-12 text-gray-500 mb-4" />
                      <p className="text-sm font-medium text-gray-700">
                        {file ? file.name : 'Arraste um vídeo ou clique para selecionar'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">MP4, MOV, JPG, PNG</p>
                    </div>
                  </div>

                  {file && (
                    <video
                      ref={patientVideoRef}
                      src={URL.createObjectURL(file)}
                      className="w-full rounded-lg"
                      controls
                      playsInline
                    />
                  )}

                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    onClick={handleUploadAndAnalyze}
                    disabled={!file || loading}
                  >
                    {loading ? 'Analisando...' : 'Iniciar Análise'}
                  </Button>
                </CardContent>
              </Card>

              {/* Vídeo de Referência */}
              <Card>
                <CardHeader>
                  <CardTitle>Vídeo de Referência (Opcional)</CardTitle>
                  <CardDescription>
                    Compare com um movimento ideal para análise detalhada
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:bg-gray-50 transition cursor-pointer relative">
                    <Input
                      type="file"
                      accept="video/*,image/*"
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      onChange={(e) => handleFileChange(e, 'reference')}
                    />
                    <div className="flex flex-col items-center">
                      <Upload className="w-12 h-12 text-gray-500 mb-4" />
                      <p className="text-sm font-medium text-gray-700">
                        {referenceFile
                          ? referenceFile.name
                          : 'Arraste o vídeo de referência ou clique'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Exercício ideal para comparação
                      </p>
                    </div>
                  </div>

                  {referenceFile && (
                    <video
                      ref={referenceVideoRef}
                      src={URL.createObjectURL(referenceFile)}
                      className="w-full rounded-lg"
                      controls
                      playsInline
                    />
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Analysis Tab */}
          <TabsContent value="analysis">
            {analysis ? (
              <div className="space-y-6">
                {/* Scores Gerais */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-3xl font-bold mb-1">
                        <span className={getScoreColor(analysis.overallScore)}>
                          {analysis.overallScore}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">Geral</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-3xl font-bold mb-1">
                        <span className={getScoreColor(analysis.postureScore)}>
                          {analysis.postureScore}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">Postura</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-3xl font-bold mb-1">
                        <span className={getScoreColor(analysis.romScore)}>
                          {analysis.romScore}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">ADM</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-3xl font-bold mb-1">
                        <span className={getScoreColor(analysis.controlScore)}>
                          {analysis.controlScore}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">Controle</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-3xl font-bold mb-1">
                        <span className={getScoreColor(analysis.tempoScore)}>
                          {analysis.tempoScore}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">Tempo</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Análise de Articulações */}
                {jointAnalysis.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Análise de Articulações</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {jointAnalysis.map((joint, index) => (
                          <div
                            key={index}
                            className={`p-4 rounded-lg border ${getStatusColor(joint.status)}`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-semibold">{joint.name}</h4>
                              <Badge
                                variant="outline"
                                className={
                                  joint.status === 'normal'
                                    ? 'border-green-600 text-green-600'
                                    : joint.status === 'warning'
                                    ? 'border-yellow-600 text-yellow-600'
                                    : 'border-red-600 text-red-600'
                                }
                              >
                                {joint.status === 'normal'
                                  ? 'Normal'
                                  : joint.status === 'warning'
                                  ? 'Atenção'
                                  : 'Crítico'}
                              </Badge>
                            </div>

                            {joint.leftAngle !== undefined && (
                              <div className="text-sm text-green-700 mb-1">
                                Esquerda: {joint.leftAngle.toFixed(1)}°
                              </div>
                            )}
                            {joint.rightAngle !== undefined && (
                              <div className="text-sm text-red-700 mb-1">
                                Direita: {joint.rightAngle.toFixed(1)}°
                              </div>
                            )}
                            {joint.asymmetry !== undefined && (
                              <div className="text-sm">
                                Assimetria:{' '}
                                <span
                                  className={
                                    joint.asymmetry > 15
                                      ? 'font-bold text-red-600'
                                      : joint.asymmetry > 10
                                      ? 'text-yellow-600'
                                      : 'text-gray-600'
                                  }
                                >
                                  {joint.asymmetry.toFixed(1)}°
                                </span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Recomendações */}
                {analysis.recommendations.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Recomendações</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {analysis.recommendations.map((rec, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                            <span className="text-sm text-gray-700">{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Desvios */}
                {analysis.deviations.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-orange-600" />
                        Desvios Identificados
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {analysis.deviations.map((deviation, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-orange-600">⚠️</span>
                            <span className="text-sm text-gray-700">{deviation}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Resumo */}
                <Card>
                  <CardHeader>
                    <CardTitle>Resumo da Análise</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-blue max-w-none">
                      <ReactMarkdown>{analysis.summary}</ReactMarkdown>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="py-16">
                  <div className="text-center text-gray-500">
                    <Activity className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>Faça upload de um vídeo para iniciar a análise</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Comparison Tab */}
          <TabsContent value="comparison">
            <PoseComparison />
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            {patientId ? (
              <ProgressTimeline
                patientId={patientId}
                patientName="Paciente"
              />
            ) : (
              <Card>
                <CardContent className="py-16">
                  <div className="text-center text-gray-500">
                    <Activity className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>Selecione um paciente para ver o histórico</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
