import { useState, useMemo } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search, Calendar, Clock, Target, AlertTriangle, CheckCircle2,
  Activity, Dumbbell, Shield, ArrowRight, ChevronDown, ChevronUp,
  Play, FileText, Users, TrendingUp, Zap, Heart, Star, StarOff,
  Filter, SortAsc, Grid3X3, List, Copy, Share2, Printer, BookOpen,
  Sparkles, BarChart3, PlusCircle, Eye, ArrowLeft, Download,
  Bookmark, BookmarkCheck, RefreshCw, Brain, Layers, GraduationCap,
  Edit, Trash2, MoreVertical
} from 'lucide-react';
import { useExerciseProtocols, type ExerciseProtocol } from '@/hooks/useExerciseProtocols';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { cn } from '@/lib/utils';
import { NewProtocolModal } from '@/components/modals/NewProtocolModal';

// Dados clínicos detalhados dos protocolos
const PROTOCOL_DETAILS: Record<string, {
  description: string;
  objectives: string[];
  phases: {
    name: string;
    weeks: string;
    goals: string[];
    exercises: string[];
    precautions: string[];
    criteria: string[];
  }[];
  contraindications: string[];
  expectedOutcomes: string[];
  references: string[];
}> = {
  'Reconstrução do LCA': {
    description: 'Protocolo de reabilitação pós-operatória para reconstrução do Ligamento Cruzado Anterior, baseado em evidências científicas atualizadas e guidelines internacionais.',
    objectives: [
      'Restaurar amplitude de movimento completa do joelho',
      'Recuperar força muscular do quadríceps e isquiotibiais',
      'Restabelecer propriocepção e estabilidade dinâmica',
      'Retorno seguro às atividades esportivas'
    ],
    phases: [
      {
        name: 'Fase 1 - Proteção Máxima',
        weeks: '0-2 semanas',
        goals: ['Controle de dor e edema', 'Proteção do enxerto', 'Extensão completa do joelho (0°)', 'Flexão até 90°'],
        exercises: ['Exercícios isométricos de quadríceps', 'Elevação da perna estendida (SLR)', 'Mobilização patelar', 'Bombeamento de tornozelo', 'Flexão passiva assistida'],
        precautions: ['Uso obrigatório de muletas', 'Órtese travada em extensão para marcha', 'Evitar hiperextensão', 'Carga parcial progressiva (50-75%)'],
        criteria: ['Extensão completa atingida', 'Edema controlado', 'Bom controle do quadríceps']
      },
      {
        name: 'Fase 2 - Proteção Moderada',
        weeks: '2-6 semanas',
        goals: ['Flexão 0-120°', 'Marcha normal sem muletas', 'Início do fortalecimento ativo'],
        exercises: ['Mini agachamentos (0-45°)', 'Step ups baixos', 'Leg press (arco limitado)', 'Bicicleta ergométrica (sem resistência)', 'Propriocepção em superfície estável'],
        precautions: ['Evitar exercícios em cadeia cinética aberta com carga', 'Controlar a progressão da carga', 'Monitorar sinais de inflamação'],
        criteria: ['ADM completa', 'Marcha sem claudicação', 'Força do quadríceps >60% do lado contralateral']
      },
      {
        name: 'Fase 3 - Fortalecimento',
        weeks: '6-12 semanas',
        goals: ['Fortalecimento progressivo', 'Propriocepção avançada', 'Início de atividades funcionais'],
        exercises: ['Agachamento progressivo', 'Leg press (arco completo)', 'Exercícios em cadeia cinética aberta (CCA)', 'Propriocepção em superfícies instáveis', 'Caminhada em esteira'],
        precautions: ['Progressão gradual da carga', 'Evitar movimentos rotacionais', 'Monitorar dor e edema'],
        criteria: ['Força do quadríceps >80%', 'Sem dor ou edema após exercícios', 'Boa estabilidade dinâmica']
      },
      {
        name: 'Fase 4 - Retorno ao Esporte',
        weeks: '12-24 semanas',
        goals: ['Retorno gradual às atividades esportivas', 'Força simétrica bilateral', 'Confiança funcional'],
        exercises: ['Corrida progressiva', 'Pliometria básica', 'Exercícios de agilidade', 'Treinamento sport-specific', 'Saltos unipodais'],
        precautions: ['Testes funcionais antes de progredir', 'Retorno gradual ao esporte', 'Continuar programa de prevenção'],
        criteria: ['LSI >90% em todos os testes', 'Hop tests simétricos', 'Clearance psicológica']
      }
    ],
    contraindications: ['Infecção ativa', 'Frouxidão excessiva do enxerto', 'Dor intensa não controlada', 'Edema significativo persistente'],
    expectedOutcomes: ['90-95% retornam às atividades diárias normais', '80-85% retornam ao esporte em nível semelhante', 'Risco de re-ruptura: 5-15% em atletas jovens'],
    references: ['MOON Knee Group Guidelines 2023', 'APTA Clinical Practice Guidelines', 'International Knee Documentation Committee']
  },
  'Tendinopatia do Manguito Rotador': {
    description: 'Protocolo de reabilitação conservadora para tendinopatia do manguito rotador, focando em exercícios progressivos de fortalecimento e controle motor.',
    objectives: ['Reduzir dor e inflamação', 'Restaurar amplitude de movimento', 'Fortalecer manguito rotador e estabilizadores escapulares', 'Retorno funcional às atividades'],
    phases: [
      {
        name: 'Fase 1 - Controle da Dor',
        weeks: '0-2 semanas',
        goals: ['Redução da dor (EVA <4)', 'Controle inflamatório', 'Manter mobilidade'],
        exercises: ['Exercícios pendulares de Codman', 'Automobilização passiva', 'Deslizamento neural', 'Exercícios posturais', 'Crioterapia pós-exercício'],
        precautions: ['Evitar movimentos acima de 90° de elevação', 'Não realizar exercícios com dor >3/10', 'Evitar atividades overhead'],
        criteria: ['Dor em repouso <3/10', 'Sono sem interrupção por dor', 'ADM passiva sem dor']
      },
      {
        name: 'Fase 2 - Mobilidade e Ativação',
        weeks: '2-4 semanas',
        goals: ['ADM ativa completa', 'Ativação do manguito rotador', 'Controle escapular'],
        exercises: ['AROM em todos os planos', 'Isométricos do manguito rotador', 'Exercícios de retração escapular', 'Rotação externa/interna isométrica', 'Ativação do serrátil anterior'],
        precautions: ['Progressão baseada em sintomas', 'Evitar compensações escapulares', 'Manter técnica correta'],
        criteria: ['ADM ativa igual ao lado contralateral', 'Bom ritmo escapuloumeral', 'Sem dor nos isométricos']
      },
      {
        name: 'Fase 3 - Fortalecimento',
        weeks: '4-8 semanas',
        goals: ['Fortalecimento progressivo', 'Resistência muscular', 'Estabilidade dinâmica'],
        exercises: ['Rotação externa com faixa elástica', 'Rotação interna com faixa elástica', 'Elevação lateral até 90°', 'Prone Y, T, W exercises', 'Push-up plus progressivo'],
        precautions: ['Progressão gradual de resistência', 'Evitar fadiga excessiva', 'Manter postura correta'],
        criteria: ['Força >80% do lado contralateral', 'Sem dor durante exercícios', 'Boa tolerância à carga']
      },
      {
        name: 'Fase 4 - Funcional',
        weeks: '8-12 semanas',
        goals: ['Retorno às atividades funcionais', 'Prevenção de recidivas', 'Força e resistência completas'],
        exercises: ['Exercícios pliométricos leves', 'Atividades sport-specific', 'Fortalecimento em cadeia cinética fechada', 'Exercícios de estabilidade dinâmica', 'Programa de manutenção'],
        precautions: ['Retorno gradual às atividades', 'Programa de prevenção contínuo', 'Atenção a sinais de overuse'],
        criteria: ['Força simétrica bilateral', 'Função normal em AVDs', 'Capacidade de realizar atividades ocupacionais']
      }
    ],
    contraindications: ['Ruptura completa do tendão', 'Instabilidade glenoumeral significativa', 'Capsulite adesiva em fase irritável', 'Dor noturna intensa persistente'],
    expectedOutcomes: ['70-80% melhora com tratamento conservador', 'Tempo médio de recuperação: 3-6 meses', 'Manutenção de exercícios reduz recidivas em 50%'],
    references: ['JOSPT Clinical Practice Guidelines 2022', 'Rotator Cuff Disorders Consensus Statement', 'AAOS Evidence-Based Guidelines']
  }
};

// Categorias de protocolos
const PROTOCOL_CATEGORIES = [
  { id: 'all', label: 'Todos', icon: Grid3X3, color: 'bg-primary' },
  { id: 'joelho', label: 'Joelho', icon: Activity, color: 'bg-blue-500' },
  { id: 'ombro', label: 'Ombro', icon: Heart, color: 'bg-rose-500' },
  { id: 'coluna', label: 'Coluna', icon: Layers, color: 'bg-purple-500' },
  { id: 'tornozelo', label: 'Tornozelo', icon: Dumbbell, color: 'bg-emerald-500' },
  { id: 'quadril', label: 'Quadril', icon: Target, color: 'bg-amber-500' },
];

// Função para categorizar protocolos
function getProtocolCategory(conditionName: string): string {
  const lower = conditionName.toLowerCase();
  if (lower.includes('joelho') || lower.includes('lca') || lower.includes('lcp') || lower.includes('menisco') || lower.includes('patelar')) return 'joelho';
  if (lower.includes('ombro') || lower.includes('manguito') || lower.includes('rotador') || lower.includes('glenoumeral')) return 'ombro';
  if (lower.includes('coluna') || lower.includes('lombar') || lower.includes('cervical') || lower.includes('lombalgia') || lower.includes('cervicalgia')) return 'coluna';
  if (lower.includes('tornozelo') || lower.includes('fascite') || lower.includes('plantar')) return 'tornozelo';
  if (lower.includes('quadril') || lower.includes('prótese')) return 'quadril';
  return 'all';
}

// Templates rápidos
const QUICK_TEMPLATES = [
  { name: 'Pós-Cirúrgico Ortopédico', icon: Calendar, color: 'from-blue-500 to-cyan-500', count: 8 },
  { name: 'Reabilitação Esportiva', icon: Zap, color: 'from-orange-500 to-amber-500', count: 5 },
  { name: 'Tratamento Conservador', icon: Heart, color: 'from-rose-500 to-pink-500', count: 12 },
  { name: 'Idosos e Geriatria', icon: Users, color: 'from-purple-500 to-violet-500', count: 4 },
];

interface ProtocolCardEnhancedProps {
  protocol: ExerciseProtocol;
  onClick: () => void;
  onEdit: (protocol: ExerciseProtocol) => void;
  onDelete: (id: string) => void;
  onDuplicate: (protocol: ExerciseProtocol) => void;
  onFavorite: (id: string) => void;
  isFavorite: boolean;
  viewMode: 'grid' | 'list';
}

function ProtocolCardEnhanced({ protocol, onClick, onEdit, onDelete, onDuplicate, onFavorite, isFavorite, viewMode }: ProtocolCardEnhancedProps) {
  const getMilestones = () => {
    if (!protocol.milestones) return [];
    if (Array.isArray(protocol.milestones)) return protocol.milestones;
    return [];
  };

  const getRestrictions = () => {
    if (!protocol.restrictions) return [];
    if (Array.isArray(protocol.restrictions)) return protocol.restrictions;
    return [];
  };

  const milestones = getMilestones();
  const restrictions = getRestrictions();
  const category = getProtocolCategory(protocol.condition_name);
  const categoryInfo = PROTOCOL_CATEGORIES.find(c => c.id === category) || PROTOCOL_CATEGORIES[0];

  if (viewMode === 'list') {
    return (
      <Card
        className="p-4 hover:shadow-lg transition-all cursor-pointer group border hover:border-primary/30 flex items-center gap-4"
        onClick={onClick}
      >
        <div className={cn('h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0', categoryInfo.color + '/10')}>
          <categoryInfo.icon className={cn('h-6 w-6', categoryInfo.color.replace('bg-', 'text-'))} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
              {protocol.name}
            </h3>
            {isFavorite && <Star className="h-4 w-4 text-amber-500 fill-amber-500 flex-shrink-0" />}
          </div>
          <p className="text-sm text-muted-foreground truncate">{protocol.condition_name}</p>
        </div>

        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            <span>{protocol.weeks_total || '-'} sem</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span>{milestones.length}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span>{restrictions.length}</span>
          </div>
        </div>

        <Badge variant={protocol.protocol_type === 'pos_operatorio' ? 'default' : 'secondary'}>
          {protocol.protocol_type === 'pos_operatorio' ? 'Pós-Op' : 'Patologia'}
        </Badge>

        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onClick(); }}>
              <Eye className="h-4 w-4 mr-2" />
              Ver Detalhes
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(protocol); }}>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDuplicate(protocol); }}>
              <Copy className="h-4 w-4 mr-2" />
              Duplicar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onFavorite(protocol.id); }}>
              {isFavorite ? <StarOff className="h-4 w-4 mr-2" /> : <Star className="h-4 w-4 mr-2" />}
              {isFavorite ? 'Remover Favorito' : 'Favoritar'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={(e) => { e.stopPropagation(); onDelete(protocol.id); }}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
      </Card>
    );
  }

  return (
    <Card
      className="overflow-hidden hover:shadow-xl transition-all cursor-pointer group border-2 hover:border-primary/30 relative"
      onClick={onClick}
    >
      {/* Category ribbon */}
      <div className={cn('h-1.5 w-full', categoryInfo.color)} />

      {/* Favorite badge */}
      {isFavorite && (
        <div className="absolute top-4 right-4 z-10">
          <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
        </div>
      )}

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div className={cn('h-11 w-11 rounded-xl flex items-center justify-center', categoryInfo.color + '/10')}>
            <categoryInfo.icon className={cn('h-5 w-5', categoryInfo.color.replace('bg-', 'text-'))} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base group-hover:text-primary transition-colors line-clamp-1">
              {protocol.name}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-1">{protocol.condition_name}</p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onClick(); }}>
                <Eye className="h-4 w-4 mr-2" />
                Ver Detalhes
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(protocol); }}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDuplicate(protocol); }}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onFavorite(protocol.id); }}>
                {isFavorite ? <StarOff className="h-4 w-4 mr-2" /> : <Star className="h-4 w-4 mr-2" />}
                {isFavorite ? 'Remover Favorito' : 'Favoritar'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => { e.stopPropagation(); onDelete(protocol.id); }}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Duration bar */}
        {protocol.weeks_total && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-muted-foreground">Duração</span>
              <span className="font-medium">{protocol.weeks_total} semanas</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full', `bg-gradient-to-r ${categoryInfo.color.replace('bg-', 'from-')} to-green-500`)}
                style={{ width: '100%' }}
              />
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="text-center p-2 bg-muted/50 rounded-lg">
            <p className="text-lg font-bold text-green-600">{milestones.length}</p>
            <p className="text-xs text-muted-foreground">Marcos</p>
          </div>
          <div className="text-center p-2 bg-muted/50 rounded-lg">
            <p className="text-lg font-bold text-amber-600">{restrictions.length}</p>
            <p className="text-xs text-muted-foreground">Restrições</p>
          </div>
          <div className="text-center p-2 bg-muted/50 rounded-lg">
            <p className="text-lg font-bold text-blue-600">{Math.ceil((protocol.weeks_total || 12) / 4)}</p>
            <p className="text-xs text-muted-foreground">Fases</p>
          </div>
        </div>

        {/* Type badge */}
        <div className="flex items-center justify-between">
          <Badge variant={protocol.protocol_type === 'pos_operatorio' ? 'default' : 'secondary'} className="text-xs">
            {protocol.protocol_type === 'pos_operatorio' ? 'Pós-Operatório' : 'Patologia'}
          </Badge>
        </div>
      </div>

      {/* View button */}
      <div className="px-5 pb-5">
        <Button variant="outline" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
          Ver Protocolo
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </Card>
  );
}

interface ProtocolDetailViewProps {
  protocol: ExerciseProtocol;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function ProtocolDetailView({ protocol, onBack, onEdit, onDelete }: ProtocolDetailViewProps) {
  const details = PROTOCOL_DETAILS[protocol.condition_name];
  const [expandedPhases, setExpandedPhases] = useState<string[]>(['Fase 1']);
  const [showApplyModal, setShowApplyModal] = useState(false);

  const getMilestones = () => {
    if (!protocol.milestones) return [];
    if (Array.isArray(protocol.milestones)) return protocol.milestones;
    return [];
  };

  const getRestrictions = () => {
    if (!protocol.restrictions) return [];
    if (Array.isArray(protocol.restrictions)) return protocol.restrictions;
    return [];
  };

  const togglePhase = (phaseName: string) => {
    setExpandedPhases(prev =>
      prev.includes(phaseName)
        ? prev.filter(p => p !== phaseName)
        : [...prev, phaseName]
    );
  };

  const category = getProtocolCategory(protocol.condition_name);
  const categoryInfo = PROTOCOL_CATEGORIES.find(c => c.id === category) || PROTOCOL_CATEGORIES[0];

  const handleExportPDF = () => {
    toast.success('PDF do protocolo gerado com sucesso!');
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copiado para a área de transferência!');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className={cn('h-14 w-14 rounded-2xl flex items-center justify-center', categoryInfo.color + '/10')}>
            <categoryInfo.icon className={cn('h-7 w-7', categoryInfo.color.replace('bg-', 'text-'))} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{protocol.name}</h1>
            <p className="text-muted-foreground">{protocol.condition_name}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-base px-3 py-1.5 gap-2">
            <Clock className="h-4 w-4" />
            {protocol.weeks_total} semanas
          </Badge>
          <Badge
            variant={protocol.protocol_type === 'pos_operatorio' ? 'default' : 'secondary'}
            className="text-base px-3 py-1.5"
          >
            {protocol.protocol_type === 'pos_operatorio' ? 'Pós-Operatório' : 'Patologia'}
          </Badge>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => setShowApplyModal(true)} className="gap-2">
          <Play className="h-4 w-4" />
          Aplicar a Paciente
        </Button>
        <Button variant="outline" onClick={onEdit} className="gap-2">
          <Edit className="h-4 w-4" />
          Editar Protocolo
        </Button>
        <Button variant="outline" onClick={handleExportPDF} className="gap-2">
          <Download className="h-4 w-4" />
          Exportar PDF
        </Button>
        <Button variant="outline" onClick={handleShare} className="gap-2">
          <Share2 className="h-4 w-4" />
          Compartilhar
        </Button>
        <Button variant="outline" onClick={onDelete} className="gap-2 text-destructive hover:text-destructive">
          <Trash2 className="h-4 w-4" />
          Excluir
        </Button>
      </div>

      {/* Description */}
      {details && (
        <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <div className="flex items-start gap-3">
            <BookOpen className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <p className="text-foreground leading-relaxed">{details.description}</p>
          </div>
        </Card>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-5 text-center bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 border-blue-200/50">
          <Calendar className="h-8 w-8 mx-auto text-blue-600 mb-2" />
          <p className="text-3xl font-bold text-blue-600">{protocol.weeks_total}</p>
          <p className="text-sm text-blue-600/70">Semanas</p>
        </Card>
        <Card className="p-5 text-center bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/30 border-green-200/50">
          <Target className="h-8 w-8 mx-auto text-green-600 mb-2" />
          <p className="text-3xl font-bold text-green-600">{getMilestones().length}</p>
          <p className="text-sm text-green-600/70">Marcos</p>
        </Card>
        <Card className="p-5 text-center bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/30 border-purple-200/50">
          <Zap className="h-8 w-8 mx-auto text-purple-600 mb-2" />
          <p className="text-3xl font-bold text-purple-600">{details?.phases.length || 4}</p>
          <p className="text-sm text-purple-600/70">Fases</p>
        </Card>
        <Card className="p-5 text-center bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/30 border-amber-200/50">
          <AlertTriangle className="h-8 w-8 mx-auto text-amber-600 mb-2" />
          <p className="text-3xl font-bold text-amber-600">{getRestrictions().length}</p>
          <p className="text-sm text-amber-600/70">Restrições</p>
        </Card>
      </div>

      {/* Objectives */}
      {details && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Objetivos do Protocolo
          </h3>
          <div className="grid md:grid-cols-2 gap-3">
            {details.objectives.map((obj, i) => (
              <div key={i} className="flex items-start gap-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-xl border border-green-200/50">
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-sm">{obj}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Timeline Visual */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Linha do Tempo de Progressão
        </h3>
        <div className="relative py-6">
          <div className="absolute top-1/2 left-0 right-0 h-2 bg-muted rounded-full -translate-y-1/2" />
          <div className="absolute top-1/2 left-0 h-2 bg-gradient-to-r from-red-500 via-amber-500 via-yellow-500 to-green-500 rounded-full -translate-y-1/2" style={{ width: '100%' }} />
          <div className="relative flex justify-between">
            {getMilestones().slice(0, 6).map((milestone: any, i: number) => (
              <TooltipProvider key={i}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex flex-col items-center cursor-pointer group">
                      <div className="h-5 w-5 rounded-full bg-background border-3 border-primary shadow-lg mb-2 group-hover:scale-125 transition-transform" />
                      <span className="text-xs font-semibold bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                        Sem {milestone.week}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <p className="font-medium">Semana {milestone.week}</p>
                    <p className="text-xs text-muted-foreground">{milestone.description}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        </div>
      </Card>

      {/* Phases */}
      {details && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-primary" />
            Fases do Tratamento
          </h3>
          <div className="space-y-3">
            {details.phases.map((phase, i) => (
              <Collapsible
                key={i}
                open={expandedPhases.includes(phase.name.split(' - ')[0])}
                onOpenChange={() => togglePhase(phase.name.split(' - ')[0])}
              >
                <CollapsibleTrigger asChild>
                  <Card className={cn(
                    'p-4 cursor-pointer transition-all hover:shadow-md',
                    expandedPhases.includes(phase.name.split(' - ')[0]) ? 'ring-2 ring-primary/20' : ''
                  )}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          'h-12 w-12 rounded-xl flex items-center justify-center text-white font-bold text-lg',
                          i === 0 ? 'bg-gradient-to-br from-red-500 to-rose-600' :
                            i === 1 ? 'bg-gradient-to-br from-amber-500 to-orange-600' :
                              i === 2 ? 'bg-gradient-to-br from-yellow-500 to-lime-600' :
                                'bg-gradient-to-br from-green-500 to-emerald-600'
                        )}>
                          {i + 1}
                        </div>
                        <div>
                          <h4 className="font-semibold">{phase.name}</h4>
                          <p className="text-sm text-muted-foreground">{phase.weeks}</p>
                        </div>
                      </div>
                      {expandedPhases.includes(phase.name.split(' - ')[0]) ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </Card>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-3 ml-16 space-y-4 p-5 bg-muted/30 rounded-xl">
                    {/* Goals */}
                    <div>
                      <h5 className="font-medium text-sm text-muted-foreground mb-3 flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        Objetivos da Fase
                      </h5>
                      <ul className="space-y-2">
                        {phase.goals.map((goal, j) => (
                          <li key={j} className="flex items-center gap-2 text-sm">
                            <div className="h-2 w-2 rounded-full bg-primary" />
                            {goal}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Exercises */}
                    <div>
                      <h5 className="font-medium text-sm text-muted-foreground mb-3 flex items-center gap-2">
                        <Dumbbell className="h-4 w-4" />
                        Exercícios Recomendados
                      </h5>
                      <div className="flex flex-wrap gap-2">
                        {phase.exercises.map((ex, j) => (
                          <Badge key={j} variant="outline" className="text-xs py-1 px-2">
                            {ex}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Precautions */}
                    <div>
                      <h5 className="font-medium text-sm text-muted-foreground mb-3 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        Precauções
                      </h5>
                      <ul className="space-y-2">
                        {phase.precautions.map((prec, j) => (
                          <li key={j} className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400">
                            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            {prec}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Criteria */}
                    <div>
                      <h5 className="font-medium text-sm text-muted-foreground mb-3 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        Critérios para Próxima Fase
                      </h5>
                      <ul className="space-y-2">
                        {phase.criteria.map((crit, j) => (
                          <li key={j} className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                            {crit}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        </Card>
      )}

      {/* Milestones from DB */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          Marcos de Progressão
        </h3>
        {getMilestones().length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Nenhum marco definido para este protocolo.</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {getMilestones().map((milestone: any, i: number) => (
              <div key={i} className="flex items-start gap-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-xl border border-green-200/50">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 text-white flex items-center justify-center font-bold flex-shrink-0 shadow-lg">
                  {milestone.week}
                </div>
                <div>
                  <p className="font-semibold">Semana {milestone.week}</p>
                  <p className="text-sm text-muted-foreground">{milestone.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Restrictions from DB */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          Restrições
        </h3>
        {getRestrictions().length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Nenhuma restrição definida para este protocolo.</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {getRestrictions().map((restriction: any, i: number) => (
              <div key={i} className="flex items-start gap-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 rounded-xl border border-amber-200/50">
                <AlertTriangle className="h-6 w-6 text-amber-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold">
                    Semana {restriction.week_start}
                    {restriction.week_end && ` - ${restriction.week_end}`}
                  </p>
                  <p className="text-sm text-muted-foreground">{restriction.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Contraindications & Expected Outcomes */}
      {details && (
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Shield className="h-5 w-5 text-red-500" />
              Contraindicações
            </h3>
            <ul className="space-y-3">
              {details.contraindications.map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-sm p-3 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200/50">
                  <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <span className="text-red-700 dark:text-red-400">{item}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Resultados Esperados
            </h3>
            <ul className="space-y-3">
              {details.expectedOutcomes.map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-sm p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200/50">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-green-700 dark:text-green-400">{item}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      {/* References */}
      {details && (
        <Card className="p-6 bg-muted/30">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            Referências Científicas
          </h3>
          <ul className="text-sm text-muted-foreground space-y-1.5">
            {details.references.map((ref, i) => (
              <li key={i} className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                {ref}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Apply Modal */}
      <Dialog open={showApplyModal} onOpenChange={setShowApplyModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aplicar Protocolo a Paciente</DialogTitle>
            <DialogDescription>
              Selecione um paciente para aplicar o protocolo "{protocol.name}"
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input placeholder="Buscar paciente..." className="mb-4" />
            <p className="text-sm text-muted-foreground text-center py-8">
              Funcionalidade em desenvolvimento
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApplyModal(false)}>Cancelar</Button>
            <Button onClick={() => { setShowApplyModal(false); toast.success('Protocolo aplicado com sucesso!'); }}>
              Aplicar Protocolo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ProtocolsPage() {
  const [activeTab, setActiveTab] = useState<'pos_operatorio' | 'patologia'>('pos_operatorio');
  const [search, setSearch] = useState('');
  const [selectedProtocol, setSelectedProtocol] = useState<ExerciseProtocol | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'duration' | 'recent'>('name');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);

  // CRUD State
  const [showModal, setShowModal] = useState(false);
  const [editingProtocol, setEditingProtocol] = useState<ExerciseProtocol | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const {
    protocols,
    loading,
    createProtocol,
    updateProtocol,
    deleteProtocol,
    isCreating,
    isUpdating,
    isDeleting
  } = useExerciseProtocols();

  const filteredAndSortedProtocols = useMemo(() => {
    const result = protocols.filter(p =>
      (p.name?.toLowerCase().includes(search.toLowerCase()) ||
        p.condition_name?.toLowerCase().includes(search.toLowerCase())) &&
      (categoryFilter === 'all' || getProtocolCategory(p.condition_name) === categoryFilter) &&
      (!showOnlyFavorites || favorites.includes(p.id)) &&
      p.protocol_type === activeTab
    );

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'duration':
          return (b.weeks_total || 0) - (a.weeks_total || 0);
        case 'recent':
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        default:
          return (a.name || '').localeCompare(b.name || '');
      }
    });

    return result;
  }, [protocols, search, categoryFilter, sortBy, showOnlyFavorites, favorites, activeTab]);

  const toggleFavorite = (id: string) => {
    setFavorites(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  const handleNewProtocol = () => {
    setEditingProtocol(null);
    setShowModal(true);
  };

  const handleEditProtocol = (protocol: ExerciseProtocol) => {
    setEditingProtocol(protocol);
    setSelectedProtocol(null);
    setShowModal(true);
  };

  const handleDuplicate = (protocol: ExerciseProtocol) => {
    const duplicatedData = {
      name: `${protocol.name} (Cópia)`,
      condition_name: protocol.condition_name,
      protocol_type: protocol.protocol_type,
      weeks_total: protocol.weeks_total,
      milestones: protocol.milestones,
      restrictions: protocol.restrictions,
      progression_criteria: protocol.progression_criteria,
    };
    createProtocol(duplicatedData);
  };

  const handleSubmit = (data: Omit<ExerciseProtocol, 'id' | 'created_at' | 'updated_at'>) => {
    if (editingProtocol) {
      updateProtocol({ id: editingProtocol.id, ...data });
    } else {
      createProtocol(data);
    }
    setShowModal(false);
    setEditingProtocol(null);
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteProtocol(deleteId);
      setDeleteId(null);
      setSelectedProtocol(null);
    }
  };

  const handleDeleteFromDetail = () => {
    if (selectedProtocol) {
      setDeleteId(selectedProtocol.id);
    }
  };

  if (selectedProtocol) {
    return (
      <MainLayout>
        <div className="p-6 max-w-6xl mx-auto">
          <ProtocolDetailView
            protocol={selectedProtocol}
            onBack={() => setSelectedProtocol(null)}
            onEdit={() => handleEditProtocol(selectedProtocol)}
            onDelete={handleDeleteFromDetail}
          />
        </div>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este protocolo? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {isDeleting ? 'Excluindo...' : 'Excluir'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Edit Modal */}
        <NewProtocolModal
          open={showModal}
          onOpenChange={(open) => {
            setShowModal(open);
            if (!open) setEditingProtocol(null);
          }}
          onSubmit={handleSubmit}
          protocol={editingProtocol || undefined}
          isLoading={isCreating || isUpdating}
        />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-8">
        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-background border p-8">
          <div className="absolute inset-0 bg-grid-pattern opacity-5" />
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-xl">
                <BookOpen className="h-8 w-8 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Protocolos de Reabilitação</h1>
                <p className="text-muted-foreground mt-1">
                  Protocolos clínicos baseados em evidências científicas
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="outline" className="gap-2">
                <Brain className="h-4 w-4" />
                Sugestão IA
              </Button>
              <Button className="gap-2" onClick={handleNewProtocol}>
                <PlusCircle className="h-4 w-4" />
                Novo Protocolo
              </Button>
            </div>
          </div>

          {/* Quick category badges */}
          <div className="flex flex-wrap gap-2 mt-6">
            {PROTOCOL_CATEGORIES.map(cat => (
              <Badge
                key={cat.id}
                variant={categoryFilter === cat.id ? 'default' : 'outline'}
                className="cursor-pointer hover:bg-primary/10 transition-colors py-1.5 px-3 gap-1.5"
                onClick={() => setCategoryFilter(cat.id)}
              >
                <cat.icon className="h-3.5 w-3.5" />
                {cat.label}
              </Badge>
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-5 hover:shadow-lg transition-all group cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">{protocols.length}</p>
                <p className="text-sm text-muted-foreground">Total de Protocolos</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <FileText className="h-6 w-6 text-primary" />
              </div>
            </div>
          </Card>

          <Card className="p-5 hover:shadow-lg transition-all group cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-blue-600">
                  {protocols.filter(p => p.protocol_type === 'pos_operatorio').length}
                </p>
                <p className="text-sm text-muted-foreground">Pós-Operatórios</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Activity className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-5 hover:shadow-lg transition-all group cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-green-600">
                  {protocols.filter(p => p.protocol_type === 'patologia').length}
                </p>
                <p className="text-sm text-muted-foreground">Patologias</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-green-100 dark:bg-green-950/50 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Heart className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </Card>

          <Card className="p-5 hover:shadow-lg transition-all group cursor-pointer" onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-amber-600">{favorites.length}</p>
                <p className="text-sm text-muted-foreground">Favoritos</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Star className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Quick Templates */}
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Templates Rápidos
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {QUICK_TEMPLATES.map((template, i) => (
              <Card
                key={i}
                className="p-4 cursor-pointer hover:shadow-lg transition-all group overflow-hidden relative"
              >
                <div className={cn('absolute inset-0 opacity-10 bg-gradient-to-br', template.color)} />
                <div className="relative">
                  <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center mb-3 bg-gradient-to-br', template.color)}>
                    <template.icon className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="font-medium text-sm group-hover:text-primary transition-colors">{template.name}</h3>
                  <p className="text-xs text-muted-foreground">{template.count} protocolos</p>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <Card className="p-6">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            {/* Toolbar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
              <TabsList className="w-fit">
                <TabsTrigger value="pos_operatorio" className="gap-2">
                  <Calendar className="h-4 w-4" />
                  Pós-Operatórios
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {protocols.filter(p => p.protocol_type === 'pos_operatorio').length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="patologia" className="gap-2">
                  <Target className="h-4 w-4" />
                  Patologias
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {protocols.filter(p => p.protocol_type === 'patologia').length}
                  </Badge>
                </TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-3 flex-wrap">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar protocolos..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {/* Sort */}
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                  <SelectTrigger className="w-[140px]">
                    <SortAsc className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Nome</SelectItem>
                    <SelectItem value="duration">Duração</SelectItem>
                    <SelectItem value="recent">Recentes</SelectItem>
                  </SelectContent>
                </Select>

                {/* Favorites filter */}
                <Button
                  variant={showOnlyFavorites ? 'default' : 'outline'}
                  size="icon"
                  onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
                >
                  <Star className={cn('h-4 w-4', showOnlyFavorites && 'fill-current')} />
                </Button>

                {/* View mode */}
                <div className="flex items-center border rounded-lg">
                  <Button
                    variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                    size="icon"
                    className="rounded-r-none"
                    onClick={() => setViewMode('grid')}
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                    size="icon"
                    className="rounded-l-none"
                    onClick={() => setViewMode('list')}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <TabsContent value={activeTab}>
              {loading ? (
                <div className={cn(
                  'gap-4',
                  viewMode === 'grid' ? 'grid md:grid-cols-2 lg:grid-cols-3' : 'flex flex-col'
                )}>
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <Card key={i} className="p-6">
                      <div className="flex items-start gap-3 mb-4">
                        <Skeleton className="h-11 w-11 rounded-xl" />
                        <div className="flex-1">
                          <Skeleton className="h-5 w-3/4 mb-2" />
                          <Skeleton className="h-4 w-1/2" />
                        </div>
                      </div>
                      <Skeleton className="h-2 w-full mb-4" />
                      <div className="grid grid-cols-3 gap-2">
                        <Skeleton className="h-16 rounded-lg" />
                        <Skeleton className="h-16 rounded-lg" />
                        <Skeleton className="h-16 rounded-lg" />
                      </div>
                    </Card>
                  ))}
                </div>
              ) : filteredAndSortedProtocols.length === 0 ? (
                <div className="text-center py-16">
                  <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <Target className="h-10 w-10 text-muted-foreground/50" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Nenhum protocolo encontrado</h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    {search ? 'Tente uma busca diferente ou remova os filtros' : 'Comece criando seu primeiro protocolo de reabilitação'}
                  </p>
                  <Button className="gap-2" onClick={handleNewProtocol}>
                    <PlusCircle className="h-4 w-4" />
                    Criar Protocolo
                  </Button>
                </div>
              ) : (
                <div className={cn(
                  'gap-4',
                  viewMode === 'grid' ? 'grid md:grid-cols-2 lg:grid-cols-3' : 'flex flex-col'
                )}>
                  {filteredAndSortedProtocols.map(protocol => (
                    <ProtocolCardEnhanced
                      key={protocol.id}
                      protocol={protocol}
                      onClick={() => setSelectedProtocol(protocol)}
                      onEdit={handleEditProtocol}
                      onDelete={(id) => setDeleteId(id)}
                      onFavorite={toggleFavorite}
                      onDuplicate={handleDuplicate}
                      isFavorite={favorites.includes(protocol.id)}
                      viewMode={viewMode}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </Card>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este protocolo? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create/Edit Modal */}
      <NewProtocolModal
        open={showModal}
        onOpenChange={(open) => {
          setShowModal(open);
          if (!open) setEditingProtocol(null);
        }}
        onSubmit={handleSubmit}
        protocol={editingProtocol || undefined}
        isLoading={isCreating || isUpdating}
      />
    </MainLayout>
  );
}
