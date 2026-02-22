/**
 * TemplateSelector - Quick insert buttons for common SOAP structures
 *
 * Features:
 * - Templates for common visit types (Post-op, Chronic Pain, Sports Injury, etc.)
 * - Customizable by therapist
 * - Fuzzy search in templates
 * - One-click template application
 */

import React, { useState, useMemo } from 'react';
import { FileText, Plus, ChevronDown, Search, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';

export interface SOAPTemplate {
  id: string;
  name: string;
  category: 'initial' | 'followup' | 'procedure' | 'discharge' | 'custom';
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  isFavorite?: boolean;
  usageCount?: number;
}

interface TemplateSelectorProps {
  onSelect: (template: SOAPTemplate) => void;
  onCreate?: () => void;
  onToggleFavorite?: (templateId: string) => void;
  customTemplates?: SOAPTemplate[];
  disabled?: boolean;
  className?: string;
}

// Default SOAP templates
const DEFAULT_TEMPLATES: SOAPTemplate[] = [
  {
    id: 'post-op-day1',
    name: 'Pós-operatório - Dia 1',
    category: 'procedure',
    subjective:
      'Paciente refere dor moderada na região operada. Relata que a anestesia está passando. Nega náuseas ou vômitos.',
    objective:
      'Sinais vitais estáveis: PA 120/80 mmHg, FC 72 bpm, SatO2 98%. Ferida limpa e seca, curativo intacto.',
    assessment:
      'Paciente em pós-operatório imediato, evolução favorável. Dor controlada com analgésicos prescritos.',
    plan:
      '1. Manter curativo limpo e seco\n2. Repouso absoluto por 24h\n3. Analgésicos VO 6/6h\n4. Retorno em 24h para avaliação',
    usageCount: 0,
  },
  {
    id: 'chronic-pain',
    name: 'Dor Crônica',
    category: 'followup',
    subjective:
      'Paciente relata dor lombar há 6 meses, piorando com esforço físico. Refere irradiação para membro inferior esquerdo. Nega parestesias.',
    objective:
      'Postura antálgica com flexão de quadril à direita. Limitação de flexão de 90°. Palpação paravertebral L4-L5 sensível. Dor à palpação 7/10.',
    assessment:
      'Lombalgia crônica com componente radicular à esquerda. Provável compressão de raiz nervosa. Necessária investigação adicional.',
    plan:
      '1. Mobilização de coluna lombar\n2. Exercícios de estabilização\n3. Alongamento de isquiotibiais\n4. Avaliar RM em 2 semanas',
    usageCount: 0,
  },
  {
    id: 'sports-injury',
    name: 'Lesão Esportiva',
    category: 'initial',
    subjective:
      'Atleta refere dor aguda em tornozelo direito após entorse em jogo. Relata edema local e incapacidade de deambular.',
    objective:
      'Tornozelo direito com edema moderado (++). Dor à palpação lateral e anterior 6/10. Instabilidade ligamentar positiva. Amplitude de movimento reduzida.',
    assessment:
      'Entorse de tornozelo direito com possível envolvimento ligamentar. Edema indica resposta inflamatória aguda. Repouso obrigatório.',
    plan:
      '1. Protocolo RICE (Repouso, Gelo, Compressão, Elevação)\n2. Imobilização com tala\n3. Fortalecimento de eversores\n4. Retorno gradual ao esporte',
    usageCount: 0,
  },
  {
    id: 'shoulder-pain',
    name: 'Dor no Ombro',
    category: 'initial',
    subjective:
      'Paciente refere dor em ombro direito há 3 semanas, piorando à noite. Refere limitação para elevar o braço e dor ao vestir-se.',
    objective:
      'Ombro direito com postura antálgica. Limitação de elevação a 90° e rotação externa a 30°. Teste de Speed positivo. Dor à palpação 6/10.',
    assessment:
      'Lesão de manguito rotator provável. Limitações funcionais consistentes com síndrome do impacto. Necessário exame de imagem.',
    plan:
      '1. Exercícios de codman (pendular)\n2. Alongamento de rotadores\n3. Fortalecimento de manguito\n4. Evitar atividades acima da cabeça\n5. Avaliar ortopedista',
    usageCount: 0,
  },
  {
    id: 'standard-followup',
    name: 'Retorno Padrão',
    category: 'followup',
    subjective:
      'Paciente relata melhora significativa desde última sessão. Dor reduzida de 7/10 para 4/10. Maior amplitude de movimento.',
    objective:
      'Testes funcionais melhorados. Dor à palpação 3/10. Força muscular aumentada. Amplitude de movimento dentro da normalidade.',
    assessment:
      'Resposta favorável ao tratamento. Progresso funcional satisfatório. Pode iniciar fase de reabilitação específica.',
    plan:
      '1. Manter protocolo atual\n2. Aumentar intensidade dos exercícios\n3. Adicionar exercícios funcionais\n4. Retorno em 1 semana',
    usageCount: 0,
  },
];

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  onSelect,
  onCreate,
  onToggleFavorite,
  customTemplates = [],
  disabled = false,
  className,
}) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Combine default and custom templates
  const allTemplates = useMemo(() => {
    return [...DEFAULT_TEMPLATES, ...customTemplates];
  }, [customTemplates]);

  // Filter templates by search and category
  const filteredTemplates = useMemo(() => {
    return allTemplates.filter((template) => {
      const matchesSearch =
        !searchQuery ||
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.subjective.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.assessment.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = !selectedCategory || template.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [allTemplates, searchQuery, selectedCategory]);

  const categories = [
    { id: 'initial', name: 'Primeira Consulta', count: allTemplates.filter(t => t.category === 'initial').length },
    { id: 'followup', name: 'Retorno', count: allTemplates.filter(t => t.category === 'followup').length },
    { id: 'procedure', name: 'Procedimentos', count: allTemplates.filter(t => t.category === 'procedure').length },
    { id: 'discharge', name: 'Alta', count: allTemplates.filter(t => t.category === 'discharge').length },
    { id: 'custom', name: 'Personalizados', count: customTemplates.length },
  ];

  const handleSelectTemplate = (template: SOAPTemplate) => {
    onSelect(template);
    setOpen(false);
    setSearchQuery('');
  };

  const handleCreateTemplate = () => {
    onCreate?.();
    setOpen(false);
  };

  return (
    <div className={cn('template-selector', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-muted-foreground hover:bg-muted/50"
            disabled={disabled}
          >
            <FileText className="h-4 w-4" />
            <span>Templates SOAP</span>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[500px] p-0" align="end">
          {/* Search bar */}
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-full h-10 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                aria-label="Buscar templates"
              />
            </div>
          </div>

          {/* Category filters */}
          <div className="flex gap-1 p-2 border-b border-border">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id === selectedCategory ? null : cat.id)}
                className={cn(
                  'flex-1 px-3 py-1.5 text-sm rounded-md transition-colors',
                  selectedCategory === cat.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted/100'
                )}
              >
                {cat.name}
                <Badge variant="secondary" className="ml-1">
                  {cat.count}
                </Badge>
              </button>
            ))}
          </div>

          {/* Template list */}
          <div className="max-h-[400px] overflow-y-auto p-2">
            {filteredTemplates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-sm">Nenhum template encontrado</p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredTemplates.map((template) => (
                  <div
                    key={template.id}
                    onClick={() => handleSelectTemplate(template)}
                    className={cn(
                      'group p-3 rounded-lg border border-border/50 hover:border-primary/50 hover:bg-muted/50 cursor-pointer transition-all',
                      disabled && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {/* Template info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-foreground text-sm">
                            {template.name}
                          </h4>
                          {template.isFavorite && (
                            <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">
                            {template.category}
                          </Badge>
                          {template.usageCount && template.usageCount > 0 && (
                            <span className="text-xs text-muted-foreground">
                              {template.usageCount}x
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {template.assessment}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {onToggleFavorite && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleFavorite(template.id);
                          }}
                          className="p-1.5 rounded-md hover:bg-muted/100 transition-colors"
                          aria-label={template.isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                        >
                          <Star
                            className={cn(
                              'h-4 w-4',
                              template.isFavorite
                                ? 'text-amber-500 fill-amber-500'
                                : 'text-muted-foreground'
                            )}
                          />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Create new template button */}
          {onCreate && (
            <div className="p-3 border-t border-border">
              <Button
                variant="ghost"
                size="sm"
                className="w-full gap-2"
                onClick={handleCreateTemplate}
                disabled={disabled}
              >
                <Plus className="h-4 w-4" />
                <span>Criar Novo Template</span>
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
};
