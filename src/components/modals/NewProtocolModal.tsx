import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Info, 
  Timer, 
  AlertTriangle, 
  Plus, 
  Trash2,
  CheckCircle2,
  Activity,
  Loader2
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery } from '@tanstack/react-query';
import { knowledgeService } from '@/features/wiki/services/knowledgeService';
import { useAuth } from '@/contexts/AuthContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { type ExerciseProtocol } from '@/hooks/useExerciseProtocols';

interface Milestone {
  week: number;
  description: string;
}

interface Restriction {
  week_start: number;
  week_end?: number;
  description: string;
}

interface ProtocolFormData {
  name: string;
  protocol_type: 'patologia' | 'pos_operatorio';
  condition_name: string;
  weeks_total: number;
  milestones: Milestone[];
  restrictions: Restriction[];
  evidence_level?: string;
  wiki_page_id?: string;
}

interface NewProtocolModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (protocol: any) => void;
  protocol?: ExerciseProtocol;
  isLoading?: boolean;
}

export const NewProtocolModal: React.FC<NewProtocolModalProps> = ({ 
  open, 
  onOpenChange, 
  onSubmit, 
  protocol,
  isLoading 
}) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<ProtocolFormData>({
    name: '',
    protocol_type: 'pos_operatorio',
    condition_name: '',
    weeks_total: 12,
    milestones: [],
    restrictions: [],
    evidence_level: 'B',
    wiki_page_id: ''
  });

  const { organizationId } = useAuth();
  const { data: wikiArticles = [] } = useQuery({
    queryKey: ['knowledge-artifacts', organizationId],
    queryFn: () => organizationId ? knowledgeService.listArtifacts(organizationId) : Promise.resolve([]),
    enabled: !!organizationId
  });

  // Sync with protocol prop when editing
  useEffect(() => {
    if (protocol && open) {
      setFormData({
        name: protocol.name || '',
        protocol_type: (protocol.protocol_type as any) || 'pos_operatorio',
        condition_name: protocol.condition_name || '',
        weeks_total: protocol.weeks_total || 12,
        milestones: Array.isArray(protocol.milestones) ? (protocol.milestones as any) : [],
        restrictions: Array.isArray(protocol.restrictions) ? (protocol.restrictions as any) : [],
        evidence_level: protocol.evidence_level || 'B',
        wiki_page_id: protocol.wiki_page_id || ''
      });
      setStep(1);
    } else if (!protocol && open) {
      setFormData({
        name: '',
        protocol_type: 'pos_operatorio',
        condition_name: '',
        weeks_total: 12,
        milestones: [],
        restrictions: [],
        evidence_level: 'B',
        wiki_page_id: ''
      });
      setStep(1);
    }
  }, [protocol, open]);

  const nextStep = () => setStep(s => Math.min(s + 1, 3));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  const handleSave = () => {
    onSubmit(formData);
  };

  const addMilestone = () => {
    setFormData(prev => ({
      ...prev,
      milestones: [...prev.milestones, { week: prev.milestones.length + 1, description: '' }]
    }));
  };

  const removeMilestone = (index: number) => {
    setFormData(prev => ({
      ...prev,
      milestones: prev.milestones.filter((_, i) => i !== index)
    }));
  };

  const updateMilestone = (index: number, field: keyof Milestone, value: any) => {
    const newMilestones = [...formData.milestones];
    newMilestones[index] = { ...newMilestones[index], [field]: value };
    setFormData(prev => ({ ...prev, milestones: newMilestones }));
  };

  const addRestriction = () => {
    setFormData(prev => ({
      ...prev,
      restrictions: [...prev.restrictions, { week_start: 1, week_end: 4, description: '' }]
    }));
  };

  const removeRestriction = (index: number) => {
    setFormData(prev => ({
      ...prev,
      restrictions: prev.restrictions.filter((_, i) => i !== index)
    }));
  };

  const updateRestriction = (index: number, field: keyof Restriction, value: any) => {
    const newRestrictions = [...formData.restrictions];
    newRestrictions[index] = { ...newRestrictions[index], [field]: value };
    setFormData(prev => ({ ...prev, restrictions: newRestrictions }));
  };

  const steps = [
    { id: 1, name: 'Informações', icon: Info },
    { id: 2, name: 'Marcos', icon: Timer },
    { id: 3, name: 'Restrições', icon: AlertTriangle },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden rounded-2xl border-border bg-background shadow-lg">
        <DialogTitle className="sr-only">
          {protocol ? 'Editar Protocolo' : 'Criar Novo Protocolo'}
        </DialogTitle>
        <div className="relative w-full h-full flex flex-col">
          {/* Header with Stepper */}
          <div className="relative p-6 border-b bg-muted/30">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Activity className="w-6 h-6 text-primary" />
                  {protocol ? 'Editar Protocolo' : 'Criar Novo Protocolo'}
                </h2>
                <p className="text-sm text-muted-foreground">Personalize a jornada de recuperação do paciente</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="flex items-center justify-between px-4">
              {steps.map((s, idx) => (
                <React.Fragment key={s.id}>
                  <div 
                    className="flex flex-col items-center gap-2 group cursor-pointer" 
                    onClick={() => step > s.id && setStep(s.id)}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 border-2",
                      step >= s.id 
                        ? "bg-primary/10 border-primary text-primary shadow-sm" 
                        : "bg-muted border-border text-muted-foreground"
                    )}>
                      <s.icon className="w-5 h-5" />
                    </div>
                    <span className={cn(
                      "text-[10px] font-semibold transition-colors uppercase tracking-wider",
                      step >= s.id ? "text-foreground" : "text-muted-foreground/50"
                    )}>
                      {s.name}
                    </span>
                  </div>
                  {idx < steps.length - 1 && (
                    <div className={cn(
                      "flex-1 h-0.5 mx-4 transition-colors",
                      step > s.id ? "bg-primary" : "bg-border"
                    )} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Content Area */}
          <div className="relative p-8 min-h-[400px] overflow-y-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              >
                {step === 1 && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2 space-y-2">
                        <Label>Nome do Protocolo</Label>
                        <Input 
                          placeholder="Ex: Reabilitação LCA - Fase Pós-Op" 
                          className="h-12 focus-visible:ring-primary"
                          value={formData.name}
                          onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        />
                      </div>
                      <div className="col-span-2 space-y-2">
                        <Label>Condição / Patologia</Label>
                        <Input 
                          placeholder="Ex: LCA, Menisco, Manguito Rotador" 
                          className="h-12 focus-visible:ring-primary"
                          value={formData.condition_name}
                          onChange={e => setFormData(prev => ({ ...prev, condition_name: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Tipo</Label>
                        <Select 
                          value={formData.protocol_type} 
                          onValueChange={v => setFormData(prev => ({ ...prev, protocol_type: v as any }))}
                        >
                          <SelectTrigger className="h-12">
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="patologia">Patologia</SelectItem>
                            <SelectItem value="pos_operatorio">Pós-Operatório</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Duração Total (Semanas)</Label>
                        <Input 
                          type="number"
                          className="h-12"
                          value={formData.weeks_total}
                          onChange={e => setFormData(prev => ({ ...prev, weeks_total: parseInt(e.target.value) || 0 }))}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Nível de Evidência</Label>
                        <Select 
                          value={formData.evidence_level} 
                          onValueChange={v => setFormData(prev => ({ ...prev, evidence_level: v }))}
                        >
                          <SelectTrigger className="h-12">
                            <SelectValue placeholder="Selecione o nível" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="A">Nível A (Ouro)</SelectItem>
                            <SelectItem value="B">Nível B (Prata)</SelectItem>
                            <SelectItem value="C">Nível C (Bronze)</SelectItem>
                            <SelectItem value="D">Nível D (Consenso)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="col-span-2 space-y-2">
                        <Label>Vincular Página da Wiki</Label>
                        <Select 
                          value={formData.wiki_page_id} 
                          onValueChange={v => setFormData(prev => ({ ...prev, wiki_page_id: v }))}
                        >
                          <SelectTrigger className="h-12">
                            <SelectValue placeholder="Selecione um artigo/consenso" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[300px]">
                            <SelectItem value="">Nenhum vínculo</SelectItem>
                            {wikiArticles.map(art => (
                              <SelectItem key={art.id} value={art.id}>
                                {art.title} ({art.subgroup})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-2">
                      <Label>Marcos de Evolução</Label>
                      <Button 
                        size="sm" 
                        onClick={addMilestone}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-8"
                      >
                        <Plus className="w-4 h-4 mr-1" /> Add Marco
                      </Button>
                    </div>

                    <div className="max-h-[300px] overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-muted">
                      {formData.milestones.length === 0 && (
                        <div className="text-center py-8 border-2 border-dashed border-border rounded-xl text-muted-foreground/30">
                          Nenhum marco adicionado ainda.
                        </div>
                      )}
                      {formData.milestones.map((m, idx) => (
                        <motion.div 
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          key={idx} 
                          className="flex gap-2 p-3 bg-muted/30 border border-border rounded-xl items-start"
                        >
                          <div className="w-16">
                            <Input 
                              type="number" 
                              placeholder="Sem"
                              className="p-2 h-9 text-xs"
                              value={m.week}
                              onChange={e => updateMilestone(idx, 'week', parseInt(e.target.value) || 0)}
                            />
                          </div>
                          <div className="flex-1">
                            <Input 
                              placeholder="Descrição do marco..."
                              className="p-2 h-9 text-xs"
                              value={m.description}
                              onChange={e => updateMilestone(idx, 'description', e.target.value)}
                            />
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => removeMilestone(idx)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-2">
                      <Label>Restrições Clínicas</Label>
                      <Button 
                        size="sm" 
                        onClick={addRestriction}
                        variant="destructive"
                        className="font-bold h-8"
                      >
                        <Plus className="w-4 h-4 mr-1" /> Add Restrição
                      </Button>
                    </div>

                    <div className="max-h-[300px] overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-muted">
                      {formData.restrictions.length === 0 && (
                        <div className="text-center py-8 border-2 border-dashed border-border rounded-xl text-muted-foreground/30">
                          Nenhuma restrição clínica definida.
                        </div>
                      )}
                      {formData.restrictions.map((r, idx) => (
                        <motion.div 
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          key={idx} 
                          className="flex gap-2 p-3 bg-destructive/5 border border-destructive/20 rounded-xl items-start"
                        >
                          <div className="flex gap-1 w-32">
                            <Input 
                              type="number"
                              className="p-2 h-9 text-xs font-mono"
                              value={r.week_start}
                              onChange={e => updateRestriction(idx, 'week_start', parseInt(e.target.value) || 0)}
                            />
                            <span className="text-muted-foreground/30 self-center">/</span>
                            <Input 
                              type="number"
                              className="p-2 h-9 text-xs font-mono"
                              value={r.week_end}
                              onChange={e => updateRestriction(idx, 'week_end', parseInt(e.target.value) || 0)}
                            />
                          </div>
                          <div className="flex-1">
                            <Input 
                              placeholder="Descreva a restrição..."
                              className="p-2 h-9 text-xs"
                              value={r.description}
                              onChange={e => updateRestriction(idx, 'description', e.target.value)}
                            />
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => removeRestriction(idx)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer Navigation */}
          <div className="p-6 border-t flex items-center justify-between bg-muted/30">
            <Button
              variant="ghost"
              onClick={prevStep}
              disabled={step === 1 || isLoading}
              className={cn(
                step === 1 && "opacity-0 pointer-events-none"
              )}
            >
              <ChevronLeft className="w-4 h-4 mr-2" /> Anterior
            </Button>

            <div className="flex gap-3">
              {step < 3 ? (
                <Button 
                  onClick={nextStep}
                  disabled={step === 1 && (!formData.name || !formData.condition_name)}
                  className="px-8 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continuar <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button 
                  onClick={handleSave}
                  disabled={isLoading}
                  className="px-8 group"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      {protocol ? 'Salvar Alterações' : 'Confirmar'} 
                      <CheckCircle2 className="w-4 h-4 ml-2 group-hover:scale-110 transition-transform" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
