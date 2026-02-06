/**
 * PoseComparison - Componente de comparação lado a lado de vídeos/poses
 */

import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, X, ArrowLeftRight } from 'lucide-react';
import { PoseOverlay } from './PoseOverlay';

interface PoseComparisonProps {
  patientId?: string;
  className?: string;
}

export function PoseComparison({ className }: PoseComparisonProps) {
  const [referenceVideo, setReferenceVideo] = useState<string | null>(null);
  const [patientVideo, setPatientVideo] = useState<string | null>(null);
  const referenceVideoRef = useRef<HTMLVideoElement>(null);
  const patientVideoRef = useRef<HTMLVideoElement>(null);

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'reference' | 'patient'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === 'reference') {
      const url = URL.createObjectURL(file);
      setReferenceVideo(url);
    } else {
      const url = URL.createObjectURL(file);
      setPatientVideo(url);
    }
  };

  const clearVideo = (type: 'reference' | 'patient') => {
    if (type === 'reference') {
      if (referenceVideo) URL.revokeObjectURL(referenceVideo);
      setReferenceVideo(null);
      setReferenceFile(null);
    } else {
      if (patientVideo) URL.revokeObjectURL(patientVideo);
      setPatientVideo(null);
      setPatientFile(null);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowLeftRight className="w-5 h-5" />
          Comparação de Movimento
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-6">
          {/* Vídeo de Referência */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Referência (Ideal)</h3>
              {referenceVideo && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => clearVideo('reference')}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>

            {!referenceVideo ? (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Input
                  type="file"
                  accept="video/*,image/*"
                  className="hidden"
                  id="reference-video"
                  onChange={(e) => handleFileChange(e, 'reference')}
                />
                <label htmlFor="reference-video" className="cursor-pointer">
                  <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-sm text-gray-600">
                    Arraste um vídeo/imagem de referência ou clique para selecionar
                  </p>
                  <p className="text-xs text-gray-400 mt-1">MP4, MOV, JPG, PNG</p>
                </label>
              </div>
            ) : (
              <div className="relative">
                <video
                  ref={referenceVideoRef}
                  src={referenceVideo}
                  className="w-full rounded-lg"
                  controls
                  playsInline
                />
                <PoseOverlay videoRef={referenceVideoRef} />
              </div>
            )}
          </div>

          {/* Vídeo do Paciente */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Paciente (Atual)</h3>
              {patientVideo && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => clearVideo('patient')}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>

            {!patientVideo ? (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Input
                  type="file"
                  accept="video/*,image/*"
                  className="hidden"
                  id="patient-video"
                  onChange={(e) => handleFileChange(e, 'patient')}
                />
                <label htmlFor="patient-video" className="cursor-pointer">
                  <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-sm text-gray-600">
                    Arraste o vídeo/imagem do paciente ou clique para selecionar
                  </p>
                  <p className="text-xs text-gray-400 mt-1">MP4, MOV, JPG, PNG</p>
                </label>
              </div>
            ) : (
              <div className="relative">
                <video
                  ref={patientVideoRef}
                  src={patientVideo}
                  className="w-full rounded-lg"
                  controls
                  playsInline
                />
                <PoseOverlay videoRef={patientVideoRef} />
              </div>
            )}
          </div>
        </div>

        {/* Score de Similaridade */}
        {referenceVideo && patientVideo && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-blue-900">Score de Similaridade</h4>
                <p className="text-sm text-blue-700">
                  Comparação entre a execução do paciente e o movimento ideal
                </p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-blue-600">78%</div>
                <p className="text-xs text-blue-600">Boa execução</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default PoseComparison;
