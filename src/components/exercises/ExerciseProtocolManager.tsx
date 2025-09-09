import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  BookOpen, 
  Plus, 
  Search, 
  Filter,
  Edit,
  Trash2,
  Copy,
  Star,
  TrendingUp,
  Target,
  Clock,
  User,
  FileText
} from 'lucide-react';
import { useExerciseProtocols, ExerciseProtocol } from '@/hooks/useExerciseProtocols';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface ExerciseProtocolManagerProps {
  onProtocolSelect?: (protocol: ExerciseProtocol) => void;
  showSelectionMode?: boolean;
}

const BODY_REGIONS = [
  'Cervical', 'Torácica', 'Lombar', 'Ombro', 'Cotovelo', 
  'Punho/Mão', 'Quadril', 'Joelho', 'Tornozelo/Pé', 'Global'
];

const CONDITIONS = [
  'Lombalgia', 'Cervicalgia', 'Síndrome do Impacto', 'Gonartrose',
  'Síndrome do Túnel do Carpo', 'Fascite Plantar', 'Tendinite',
  'Bursite', 'Hérnia de Disco', 'Escoliose', 'Fibromialgia', 
  'Artrite Reumatoide', 'Osteoporose', 'Pós-Cirúrgico'
];

const EVIDENCE_LEVELS = {
  'A': 'Evidência Forte',
  'B': 'Evidência Moderada', 
  'C': 'Evidência Limitada',
  'D': 'Opinião de Especialista'
};

export function ExerciseProtocolManager({ 
  onProtocolSelect, 
  showSelectionMode = false 
}: ExerciseProtocolManagerProps) {
  const [protocols, setProtocols] = useState<ExerciseProtocol[]>([]);
  const [filteredProtocols, setFilteredProtocols] = useState<ExerciseProtocol[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCondition, setSelectedCondition] = useState('all');
  const [selectedPhase, setSelectedPhase] = useState('all');
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [selectedEvidence, setSelectedEvidence] = useState('all');
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const [newProtocol, setNewProtocol] = useState({
    name: '',
    description: '',
    condition: '',
    body_region: '',
    phase: 'chronic' as const,
    evidence_level: 'C' as const,
    duration_weeks: 4,
    frequency_per_week: 3,
    objectives: [''],
    contraindications: [''],
    expected_outcomes: [''],
  });

  const {
    protocols: protocolsData,
    protocolStats,
    loading,
    addProtocol,
    deleteProtocol,
    searchProtocols,
    incrementProtocolUsage,
  } = useExerciseProtocols();

  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    setProtocols(protocolsData);
    setFilteredProtocols(protocolsData);
  }, [protocolsData]);

  useEffect(() => {
    // Apply filters
    const filtered = searchProtocols(searchQuery, {
      condition: selectedCondition === 'all' ? undefined : selectedCondition,
      bodyRegion: selectedRegion === 'all' ? undefined : selectedRegion,
      phase: selectedPhase === 'all' ? undefined : selectedPhase,
      evidenceLevel: selectedEvidence === 'all' ? undefined : selectedEvidence,
    });
    setFilteredProtocols(filtered);
  }, [searchQuery, selectedCondition, selectedPhase, selectedRegion, selectedEvidence, protocols, searchProtocols]);

  const handleCreateProtocol = async () => {
    if (!newProtocol.name.trim()) {
      toast({
        title: 'Erro',
        description: 'Nome do protocolo é obrigatório',
        variant: 'destructive'
      });
      return;
    }

    try {
      await addProtocol({
        ...newProtocol,
        exercises: [],
        created_by: user?.id || '',
        is_template: true,
      });

      toast({
        title: 'Sucesso',
        description: 'Protocolo criado com sucesso'
      });

      setShowCreateDialog(false);
      resetNewProtocol();
    } catch (error) {
      console.error('Error creating protocol:', error);
    }
  };



  const handleDeleteProtocol = async (protocolId: string) => {
    try {
      await deleteProtocol(protocolId);
      
      toast({
        title: 'Sucesso',
        description: 'Protocolo excluído com sucesso'
      });

      setDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting protocol:', error);
    }
  };

  const handleSelectProtocol = async (protocol: ExerciseProtocol) => {
    await incrementProtocolUsage(protocol.id);
    onProtocolSelect?.(protocol);
  };

  const resetNewProtocol = () => {
    setNewProtocol({
      name: '',
      description: '',
      condition: '',
      body_region: '',
      phase: 'chronic',
      evidence_level: 'C',
      duration_weeks: 4,
      frequency_per_week: 3,
      objectives: [''],
      contraindications: [''],
      expected_outcomes: [''],
    });
  };

  const addArrayField = (field: 'objectives' | 'contraindications' | 'expected_outcomes') => {
    setNewProtocol(prev => ({
      ...prev,
      [field]: [...prev[field], '']
    }));
  };

  const updateArrayField = (
    field: 'objectives' | 'contraindications' | 'expected_outcomes', 
    index: number, 
    value: string
  ) => {
    setNewProtocol(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => i === index ? value : item)
    }));
  };

  const removeArrayField = (field: 'objectives' | 'contraindications' | 'expected_outcomes', index: number) => {
    setNewProtocol(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const getEvidenceColor = (level: string) => {
    switch (level) {
      case 'A': return 'bg-green-100 text-green-800';
      case 'B': return 'bg-blue-100 text-blue-800';
      case 'C': return 'bg-yellow-100 text-yellow-800';
      case 'D': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case 'acute': return 'bg-red-100 text-red-800';
      case 'subacute': return 'bg-orange-100 text-orange-800';
      case 'chronic': return 'bg-blue-100 text-blue-800';
      case 'maintenance': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{protocolStats.totalProtocols}</p>
                <p className="text-sm text-muted-foreground">Protocolos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                <Star className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {protocolStats.protocolsByEvidence?.A || 0}
                </p>
                <p className="text-sm text-muted-foreground">Evidência A</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {protocolStats.mostUsedProtocols?.[0]?.usage_count || 0}
                </p>
                <p className="text-sm text-muted-foreground">Mais Usado</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center">
                <Target className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {Object.keys(protocolStats.protocolsByCondition || {}).length}
                </p>
                <p className="text-sm text-muted-foreground">Condições</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Protocolos Baseados em Evidências</CardTitle>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Protocolo
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Criar Protocolo de Exercícios</DialogTitle>
                  <DialogDescription>
                    Crie um novo protocolo baseado em evidências científicas
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome do Protocolo</Label>
                      <Input
                        id="name"
                        value={newProtocol.name}
                        onChange={(e) => setNewProtocol(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Ex: Protocolo de Fortalecimento para Lombalgia Crônica"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="condition">Condição</Label>
                      <Select
                        value={newProtocol.condition}
                        onValueChange={(value) => setNewProtocol(prev => ({ ...prev, condition: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a condição" />
                        </SelectTrigger>
                        <SelectContent>
                          {CONDITIONS.map(condition => (
                            <SelectItem key={condition} value={condition}>
                              {condition}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      value={newProtocol.description}
                      onChange={(e) => setNewProtocol(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Descreva o protocolo, indicações e metodologia..."
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="body_region">Região Corporal</Label>
                      <Select
                        value={newProtocol.body_region}
                        onValueChange={(value) => setNewProtocol(prev => ({ ...prev, body_region: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {BODY_REGIONS.map(region => (
                            <SelectItem key={region} value={region}>
                              {region}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phase">Fase</Label>
                      <Select
                        value={newProtocol.phase}
                        onValueChange={(value: 'acute' | 'subacute' | 'chronic' | 'maintenance') => setNewProtocol(prev => ({ ...prev, phase: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="acute">Aguda</SelectItem>
                          <SelectItem value="subacute">Subaguda</SelectItem>
                          <SelectItem value="chronic">Crônica</SelectItem>
                          <SelectItem value="maintenance">Manutenção</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="evidence_level">Nível de Evidência</Label>
                      <Select
                        value={newProtocol.evidence_level}
                        onValueChange={(value: 'A' | 'B' | 'C' | 'D') => setNewProtocol(prev => ({ ...prev, evidence_level: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(EVIDENCE_LEVELS).map(([level, description]) => (
                            <SelectItem key={level} value={level}>
                              {level} - {description}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="duration">Duração (semanas)</Label>
                      <Input
                        id="duration"
                        type="number"
                        min="1"
                        max="52"
                        value={newProtocol.duration_weeks}
                        onChange={(e) => setNewProtocol(prev => ({ 
                          ...prev, 
                          duration_weeks: parseInt(e.target.value) || 1 
                        }))}
                      />
                    </div>
                  </div>

                  {/* Objectives */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Objetivos</Label>
                      <Button 
                        type="button" 
                        size="sm" 
                        variant="outline"
                        onClick={() => addArrayField('objectives')}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Adicionar
                      </Button>
                    </div>
                    {newProtocol.objectives.map((objective, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={objective}
                          onChange={(e) => updateArrayField('objectives', index, e.target.value)}
                          placeholder={`Objetivo ${index + 1}`}
                        />
                        {newProtocol.objectives.length > 1 && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => removeArrayField('objectives', index)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Contraindications */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Contraindicações</Label>
                      <Button 
                        type="button" 
                        size="sm" 
                        variant="outline"
                        onClick={() => addArrayField('contraindications')}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Adicionar
                      </Button>
                    </div>
                    {newProtocol.contraindications.map((contraindication, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={contraindication}
                          onChange={(e) => updateArrayField('contraindications', index, e.target.value)}
                          placeholder={`Contraindicação ${index + 1}`}
                        />
                        {newProtocol.contraindications.length > 1 && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => removeArrayField('contraindications', index)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Expected Outcomes */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Resultados Esperados</Label>
                      <Button 
                        type="button" 
                        size="sm" 
                        variant="outline"
                        onClick={() => addArrayField('expected_outcomes')}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Adicionar
                      </Button>
                    </div>
                    {newProtocol.expected_outcomes.map((outcome, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={outcome}
                          onChange={(e) => updateArrayField('expected_outcomes', index, e.target.value)}
                          placeholder={`Resultado ${index + 1}`}
                        />
                        {newProtocol.expected_outcomes.length > 1 && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => removeArrayField('expected_outcomes', index)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreateProtocol}>
                    Criar Protocolo
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and filters */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar protocolos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={selectedCondition} onValueChange={setSelectedCondition}>
              <SelectTrigger>
                <SelectValue placeholder="Condição" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas condições</SelectItem>
                {CONDITIONS.map(condition => (
                  <SelectItem key={condition} value={condition}>
                    {condition}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedRegion} onValueChange={setSelectedRegion}>
              <SelectTrigger>
                <SelectValue placeholder="Região" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas regiões</SelectItem>
                {BODY_REGIONS.map(region => (
                  <SelectItem key={region} value={region}>
                    {region}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedPhase} onValueChange={setSelectedPhase}>
              <SelectTrigger>
                <SelectValue placeholder="Fase" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas fases</SelectItem>
                <SelectItem value="acute">Aguda</SelectItem>
                <SelectItem value="subacute">Subaguda</SelectItem>
                <SelectItem value="chronic">Crônica</SelectItem>
                <SelectItem value="maintenance">Manutenção</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedEvidence} onValueChange={setSelectedEvidence}>
              <SelectTrigger>
                <SelectValue placeholder="Evidência" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas evidências</SelectItem>
                {Object.entries(EVIDENCE_LEVELS).map(([level, description]) => (
                  <SelectItem key={level} value={level}>
                    {level} - {description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Results counter */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{filteredProtocols.length} protocolos encontrados</span>
            <Button variant="ghost" size="sm">
              <Filter className="w-4 h-4 mr-1" />
              Limpar filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Protocol Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProtocols.map((protocol) => (
          <Card 
            key={protocol.id} 
            className="hover:shadow-lg transition-all duration-200 cursor-pointer group"
            onClick={() => showSelectionMode && handleSelectProtocol(protocol)}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg leading-tight group-hover:text-primary transition-colors">
                    {protocol.name}
                  </CardTitle>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className={getEvidenceColor(protocol.evidence_level)}>
                      Evidência {protocol.evidence_level}
                    </Badge>
                    <Badge variant="outline" className={getPhaseColor(protocol.phase)}>
                      {protocol.phase}
                    </Badge>
                  </div>
                </div>
                
                {protocol.usage_count > 0 && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <TrendingUp className="w-3 h-3" />
                    {protocol.usage_count}x
                  </div>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground line-clamp-3">
                {protocol.description}
              </p>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Target className="w-3 h-3" />
                  {protocol.condition} • {protocol.body_region}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {protocol.duration_weeks} semanas • {protocol.frequency_per_week}x/semana
                </div>
              </div>

              {/* Objectives preview */}
              {protocol.objectives.length > 0 && (
                <div className="space-y-1">
                  <h5 className="text-xs font-medium text-muted-foreground">Objetivos:</h5>
                  <ul className="text-xs space-y-1">
                    {protocol.objectives.slice(0, 2).map((objective, index) => (
                      <li key={index} className="flex items-start gap-1">
                        <span className="w-1 h-1 bg-primary rounded-full mt-1.5 flex-shrink-0" />
                        <span className="line-clamp-1">{objective}</span>
                      </li>
                    ))}
                    {protocol.objectives.length > 2 && (
                      <li className="text-muted-foreground">
                        +{protocol.objectives.length - 2} mais...
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {/* Action buttons */}
              {!showSelectionMode && (
                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline" className="flex-1">
                    <FileText className="w-3 h-3 mr-1" />
                    Ver Detalhes
                  </Button>
                  <Button size="sm" className="flex-1">
                    <User className="w-3 h-3 mr-1" />
                    Usar Protocolo
                  </Button>
                </div>
              )}

              {/* Admin actions */}
              {user && (
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                    <Copy className="w-3 h-3" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                    onClick={() => setDeleteConfirm(protocol.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty state */}
      {filteredProtocols.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <BookOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum protocolo encontrado</h3>
            <p className="text-muted-foreground mb-6">
              Tente ajustar os filtros ou criar um novo protocolo
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Criar Primeiro Protocolo
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirm !== null} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Protocolo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este protocolo? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirm(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteConfirm && handleDeleteProtocol(deleteConfirm)}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}