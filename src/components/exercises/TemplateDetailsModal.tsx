import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Search, AlertTriangle, Info, BookOpen, AlertCircle, X } from 'lucide-react';
import { useTemplateItems, type ExerciseTemplate } from '@/hooks/useExerciseTemplates';
import { useExercises } from '@/hooks/useExercises';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

interface TemplateDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: ExerciseTemplate;
}

export function TemplateDetailsModal({
  open,
  onOpenChange,
  template,
}: TemplateDetailsModalProps) {
  const { items, addItem, removeItem, loading } = useTemplateItems(template.id);
  const { exercises } = useExercises();
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [searchExercise, setSearchExercise] = useState('');
  const [selectedExercise, setSelectedExercise] = useState('');
  const [sets, setSets] = useState('3');
  const [reps, setReps] = useState('10');
  const [weekStart, setWeekStart] = useState('');
  const [weekEnd, setWeekEnd] = useState('');

  const filteredExercises = exercises.filter(e =>
    !items.some(i => i.exercise_id === e.id) &&
    e.name?.toLowerCase().includes(searchExercise.toLowerCase())
  );

  const handleAddExercise = () => {
    if (!selectedExercise) return;

    addItem({
      template_id: template.id,
      exercise_id: selectedExercise,
      order_index: items.length,
      sets: sets ? parseInt(sets) : undefined,
      repetitions: reps ? parseInt(reps) : undefined,
      week_start: weekStart ? parseInt(weekStart) : undefined,
      week_end: weekEnd ? parseInt(weekEnd) : undefined,
    });

    setSelectedExercise('');
    setSets('3');
    setReps('10');
    setWeekStart('');
    setWeekEnd('');
    setShowAddExercise(false);
  };

  const isPosOperatorio = template.category === 'pos_operatorio';

  // Função auxiliar para renderizar badge de nível de evidência
  const renderEvidenceBadge = (level?: string | null) => {
    if (!level) return null;

    const colors = {
      A: 'bg-green-100 text-green-800 border-green-300',
      B: 'bg-blue-100 text-blue-800 border-blue-300',
      C: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      D: 'bg-orange-100 text-orange-800 border-orange-300',
    };

    return (
      <Badge className={colors[level as keyof typeof colors] || 'bg-gray-100 text-gray-800'}>
        Nível de Evidência {level}
      </Badge>
    );
  };

  // Componente para seções clínicas
  const ClinicalSection = ({
    title,
    content,
    icon: Icon,
    variant = 'default',
  }: {
    title: string;
    content?: string | null;
    icon: React.ElementType;
    variant?: 'default' | 'warning' | 'danger';
  }) => {
    if (!content) return null;

    const colors = {
      default: 'bg-blue-50 border-blue-200 text-blue-900',
      warning: 'bg-yellow-50 border-yellow-200 text-yellow-900',
      danger: 'bg-red-50 border-red-200 text-red-900',
    };

    return (
      <div className={`p-4 rounded-lg border ${colors[variant]}`}>
        <div className="flex items-start gap-3">
          <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h4 className="font-semibold mb-2">{title}</h4>
            <p className="text-sm whitespace-pre-line">{content}</p>
          </div>
        </div>
      </div>
    );
  };

  // Componente para lista de referências
  const ReferencesSection = ({ references }: { references?: string[] | null }) => {
    if (!references || references.length === 0) return null;

    return (
      <div className="p-4 rounded-lg border bg-gray-50">
        <div className="flex items-start gap-3">
          <BookOpen className="h-5 w-5 mt-0.5 flex-shrink-0 text-gray-600" />
          <div className="flex-1">
            <h4 className="font-semibold mb-2">Referências Bibliográficas</h4>
            <ul className="text-sm space-y-1">
              {references.map((ref, idx) => (
                <li key={idx} className="text-gray-700">• {ref}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
        <DialogHeader className="pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="flex items-center gap-2 flex-wrap">
                {template.name}
                <Badge variant="outline">{template.condition_name}</Badge>
                {template.template_variant && (
                  <Badge>{template.template_variant}</Badge>
                )}
                {template.evidence_level && renderEvidenceBadge(template.evidence_level)}
              </DialogTitle>
              {template.description && (
                <p className="text-sm text-muted-foreground mt-2">{template.description}</p>
              )}
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="exercises" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-5">
            <TabsTrigger value="exercises">Exercícios</TabsTrigger>
            <TabsTrigger value="clinical">Informações Clínicas</TabsTrigger>
            <TabsTrigger value="contraindications">Contraindicações</TabsTrigger>
            <TabsTrigger value="progression">Progressão</TabsTrigger>
            <TabsTrigger value="references">Referências</TabsTrigger>
          </TabsList>

          <TabsContent value="exercises" className="flex-1 overflow-y-auto mt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Exercícios ({items.length})</h3>
                <Button size="sm" onClick={() => setShowAddExercise(!showAddExercise)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Exercício
                </Button>
              </div>

              {showAddExercise && (
                <Card className="p-4 space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar exercício..."
                      value={searchExercise}
                      onChange={(e) => setSearchExercise(e.target.value)}
                      className="pl-9"
                    />
                  </div>

                  <Select value={selectedExercise} onValueChange={setSelectedExercise}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um exercício" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredExercises.map((ex) => (
                        <SelectItem key={ex.id} value={ex.id}>
                          {ex.name} {ex.category && `(${ex.category})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Séries</Label>
                      <Input
                        type="number"
                        value={sets}
                        onChange={(e) => setSets(e.target.value)}
                        min="1"
                      />
                    </div>
                    <div>
                      <Label>Repetições</Label>
                      <Input
                        type="number"
                        value={reps}
                        onChange={(e) => setReps(e.target.value)}
                        min="1"
                      />
                    </div>
                  </div>

                  {isPosOperatorio && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Semana Início</Label>
                        <Input
                          type="number"
                          value={weekStart}
                          onChange={(e) => setWeekStart(e.target.value)}
                          min="0"
                          placeholder="Ex: 1"
                        />
                      </div>
                      <div>
                        <Label>Semana Fim</Label>
                        <Input
                          type="number"
                          value={weekEnd}
                          onChange={(e) => setWeekEnd(e.target.value)}
                          min="0"
                          placeholder="Ex: 4"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button onClick={handleAddExercise} disabled={!selectedExercise}>
                      Adicionar
                    </Button>
                    <Button variant="outline" onClick={() => setShowAddExercise(false)}>
                      Cancelar
                    </Button>
                  </div>
                </Card>
              )}

              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Carregando...</div>
              ) : items.length === 0 ? (
                <Card className="p-8 text-center text-muted-foreground">
                  Nenhum exercício adicionado ainda
                </Card>
              ) : (
                <div className="space-y-2">
                  {items.map((item, index) => (
                    <Card key={item.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <Badge variant="outline">{index + 1}</Badge>
                            <h4 className="font-medium">
                              {item.exercise?.name || 'Exercício'}
                            </h4>
                          </div>

                          <div className="flex gap-4 text-sm text-muted-foreground flex-wrap">
                            {item.sets && <span>{item.sets} séries</span>}
                            {item.repetitions && <span>{item.repetitions} reps</span>}
                            {item.duration && <span>{item.duration}s</span>}
                            {item.week_start !== null && item.week_start !== undefined && (
                              <span>
                                Semanas {item.week_start}
                                {item.week_end ? ` - ${item.week_end}` : '+'}
                              </span>
                            )}
                          </div>

                          {item.clinical_notes && (
                            <p className="text-sm text-gray-700 mt-2 bg-blue-50 p-2 rounded">
                              <Info className="h-3 w-3 inline mr-1" />
                              {item.clinical_notes}
                            </p>
                          )}

                          {item.focus_muscles && item.focus_muscles.length > 0 && (
                            <div className="mt-2">
                              <span className="text-xs text-muted-foreground">Foco: </span>
                              <div className="flex gap-1 flex-wrap mt-1">
                                {item.focus_muscles.map((muscle, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {muscle}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {item.exercise?.category && (
                            <Badge variant="secondary" className="mt-2">
                              {item.exercise.category}
                            </Badge>
                          )}
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(item.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="clinical" className="flex-1 overflow-y-auto mt-4 space-y-4">
            <ClinicalSection
              title="Observações Clínicas"
              content={template.clinical_notes}
              icon={Info}
              variant="default"
            />
            <ClinicalSection
              title="Precauções"
              content={template.precautions}
              icon={AlertCircle}
              variant="warning"
            />
          </TabsContent>

          <TabsContent value="contraindications" className="flex-1 overflow-y-auto mt-4">
            <ClinicalSection
              title="Contraindicações"
              content={template.contraindications}
              icon={AlertTriangle}
              variant="danger"
            />
          </TabsContent>

          <TabsContent value="progression" className="flex-1 overflow-y-auto mt-4">
            <ClinicalSection
              title="Notas de Progressão"
              content={template.progression_notes}
              icon={Info}
              variant="default"
            />
          </TabsContent>

          <TabsContent value="references" className="flex-1 overflow-y-auto mt-4">
            <ReferencesSection references={template.bibliographic_references} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
