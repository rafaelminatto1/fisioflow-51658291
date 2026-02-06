import { useState, useMemo } from 'react';

  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Calendar, Clock, Activity } from 'lucide-react';
import { useExerciseTemplates } from '@/hooks/useExerciseTemplates';
import { useApplyExerciseTemplate } from '@/hooks/useApplyExerciseTemplate';
import { usePatientSurgeries } from '@/hooks/usePatientEvolution';
import { format, differenceInWeeks } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ApplyTemplateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  patientName: string;
}

export function ApplyTemplateModal({
  open,
  onOpenChange,
  patientId,
  patientName,
}: ApplyTemplateModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [selectedSurgery, setSelectedSurgery] = useState<string>('');
  const [adjustByWeeks, setAdjustByWeeks] = useState(true);
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  const { templates, loading } = useExerciseTemplates();
  const { data: surgeries } = usePatientSurgeries(patientId);
  const { applyTemplate, isApplying } = useApplyExerciseTemplate();

  // Filtrar templates
  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      const matchesSearch =
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.condition_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.template_variant &&
          t.template_variant.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory =
        selectedCategory === 'all' || t.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [templates, searchQuery, selectedCategory]);

  // Agrupar templates por condição
  const groupedTemplates = useMemo(() => {
    const groups: Record<string, typeof filteredTemplates> = {};
    filteredTemplates.forEach((template) => {
      if (!groups[template.condition_name]) {
        groups[template.condition_name] = [];
      }
      groups[template.condition_name].push(template);
    });
    return groups;
  }, [filteredTemplates]);

  const selectedTemplateData = templates.find((t) => t.id === selectedTemplate);
  const selectedSurgeryData = surgeries?.find((s) => s.id === selectedSurgery);

  // Calcular semana pós-operatória atual
  const currentWeek = useMemo(() => {
    if (!selectedSurgeryData) return 0;
    return differenceInWeeks(new Date(), new Date(selectedSurgeryData.surgery_date));
  }, [selectedSurgeryData]);

  const handleApply = () => {
    if (!selectedTemplate) return;

    applyTemplate(
      {
        templateId: selectedTemplate,
        patientId,
        surgeryDate: selectedSurgeryData?.surgery_date,
        adjustWeeks: adjustByWeeks,
        startDate,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setSelectedTemplate('');
          setSelectedSurgery('');
          setSearchQuery('');
        },
      }
    );
  };

  const isPosOperatorio = selectedTemplateData?.category === 'pos_operatorio';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Aplicar Template de Exercícios</DialogTitle>
          <DialogDescription>
            Criar plano personalizado para {patientName} baseado em template
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 flex-1 overflow-hidden">
          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar template..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="patologia">Patologias</SelectItem>
                <SelectItem value="pos_operatorio">Pós-Operatórios</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Lista de templates */}
          <ScrollArea className="flex-1 pr-4">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando templates...
              </div>
            ) : Object.keys(groupedTemplates).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum template encontrado
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(groupedTemplates).map(([condition, temps]) => (
                  <div key={condition}>
                    <h3 className="font-semibold mb-2 text-sm text-muted-foreground uppercase">
                      {condition}
                    </h3>
                    <div className="space-y-2">
                      {temps.map((template) => (
                        <Card
                          key={template.id}
                          className={`p-3 cursor-pointer transition-all ${
                            selectedTemplate === template.id
                              ? 'ring-2 ring-primary bg-accent'
                              : 'hover:bg-accent/50'
                          }`}
                          onClick={() => setSelectedTemplate(template.id)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium truncate">
                                  {template?.name ?? 'Sem nome'}
                                </h4>
                                {template.template_variant && (
                                  <Badge variant="secondary" className="text-xs">
                                    {template.template_variant}
                                  </Badge>
                                )}
                              </div>
                              {template.description && (
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                  {template.description}
                                </p>
                              )}
                            </div>
                            <Badge
                              variant={
                                template.category === 'pos_operatorio'
                                  ? 'default'
                                  : 'outline'
                              }
                            >
                              {template.category === 'pos_operatorio'
                                ? 'Pós-Op'
                                : 'Patologia'}
                            </Badge>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Configurações do plano */}
          {selectedTemplate && (
            <Card className="p-4 space-y-4 border-primary/20">
              <h3 className="font-semibold flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Configurações do Plano
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start-date">Data de Início</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="start-date"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                {isPosOperatorio && surgeries && surgeries.length > 0 && (
                  <div>
                    <Label htmlFor="surgery">Cirurgia Relacionada</Label>
                    <Select value={selectedSurgery} onValueChange={setSelectedSurgery}>
                      <SelectTrigger id="surgery">
                        <SelectValue placeholder="Selecione a cirurgia" />
                      </SelectTrigger>
                      <SelectContent>
                        {surgeries.map((surgery) => (
                          <SelectItem key={surgery.id} value={surgery.id}>
                            {surgery.surgery_name} -{' '}
                            {format(new Date(surgery.surgery_date), 'dd/MM/yyyy', {
                              locale: ptBR,
                            })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {isPosOperatorio && selectedSurgeryData && (
                <>
                  <div className="flex items-center justify-between p-3 bg-accent rounded-lg">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        Ajustar exercícios por fase (Semana {currentWeek})
                      </span>
                    </div>
                    <Switch checked={adjustByWeeks} onCheckedChange={setAdjustByWeeks} />
                  </div>

                  {adjustByWeeks && (
                    <p className="text-xs text-muted-foreground">
                      Apenas exercícios adequados para a semana {currentWeek} serão
                      incluídos no plano.
                    </p>
                  )}
                </>
              )}
            </Card>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleApply}
            disabled={!selectedTemplate || isApplying}
          >
            {isApplying ? 'Aplicando...' : 'Aplicar Template'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
