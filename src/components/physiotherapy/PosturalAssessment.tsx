import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Save, Camera } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/lib/errors/logger';

interface PosturalData {
  headPosition: string;
  shoulderAlignment: string;
  spineAlignment: string;
  pelvisPosition: string;
  kneeAlignment: string;
  footPosition: string;
  observations: string;
}

export const PosturalAssessment = () => {
  const [posturalData, setPosturalData] = useState<PosturalData>({
    headPosition: '',
    shoulderAlignment: '',
    spineAlignment: '',
    pelvisPosition: '',
    kneeAlignment: '',
    footPosition: '',
    observations: ''
  });

  const handleSave = () => {
    logger.info('Salvando avaliação postural', { posturalData }, 'PosturalAssessment');
    toast({
      title: "Avaliação salva",
      description: "Avaliação postural registrada com sucesso.",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5" />
          Avaliação Postural
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Posição da Cabeça</Label>
            <Select 
              value={posturalData.headPosition}
              onValueChange={(value) => setPosturalData({...posturalData, headPosition: value})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="anteriorizada">Anteriorizada</SelectItem>
                <SelectItem value="inclinada-direita">Inclinada à direita</SelectItem>
                <SelectItem value="inclinada-esquerda">Inclinada à esquerda</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Alinhamento dos Ombros</Label>
            <Select 
              value={posturalData.shoulderAlignment}
              onValueChange={(value) => setPosturalData({...posturalData, shoulderAlignment: value})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="simetricos">Simétricos</SelectItem>
                <SelectItem value="protrusos">Protrusos</SelectItem>
                <SelectItem value="elevado-direito">Elevado à direita</SelectItem>
                <SelectItem value="elevado-esquerdo">Elevado à esquerda</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Alinhamento da Coluna</Label>
            <Select 
              value={posturalData.spineAlignment}
              onValueChange={(value) => setPosturalData({...posturalData, spineAlignment: value})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="hiperlordose">Hiperlordose</SelectItem>
                <SelectItem value="hipercifose">Hipercifose</SelectItem>
                <SelectItem value="escoliose">Escoliose</SelectItem>
                <SelectItem value="retificacao">Retificação</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Posição da Pelve</Label>
            <Select 
              value={posturalData.pelvisPosition}
              onValueChange={(value) => setPosturalData({...posturalData, pelvisPosition: value})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="neutra">Neutra</SelectItem>
                <SelectItem value="anteversao">Anteversão</SelectItem>
                <SelectItem value="retroversao">Retroversão</SelectItem>
                <SelectItem value="obliquidade">Obliquidade</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Alinhamento dos Joelhos</Label>
            <Select 
              value={posturalData.kneeAlignment}
              onValueChange={(value) => setPosturalData({...posturalData, kneeAlignment: value})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="varo">Varo</SelectItem>
                <SelectItem value="valgo">Valgo</SelectItem>
                <SelectItem value="recurvatum">Recurvatum</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Posição dos Pés</Label>
            <Select 
              value={posturalData.footPosition}
              onValueChange={(value) => setPosturalData({...posturalData, footPosition: value})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="pe-plano">Pé Plano</SelectItem>
                <SelectItem value="pe-cavo">Pé Cavo</SelectItem>
                <SelectItem value="pronado">Pronado</SelectItem>
                <SelectItem value="supinado">Supinado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Observações</Label>
          <Textarea
            placeholder="Observações adicionais sobre a avaliação postural..."
            value={posturalData.observations}
            onChange={(e) => setPosturalData({...posturalData, observations: e.target.value})}
            rows={4}
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button variant="outline" className="flex-1">
            <Camera className="w-4 h-4 mr-2" />
            Adicionar Fotos
          </Button>
          <Button onClick={handleSave} className="flex-1 bg-primary">
            <Save className="w-4 h-4 mr-2" />
            Salvar Avaliação
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
