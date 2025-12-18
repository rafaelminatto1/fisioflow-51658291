import { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { 
  Search, Calendar, Clock, Target, AlertTriangle, CheckCircle2, 
  Activity, Dumbbell, Shield, ArrowRight, ChevronDown, ChevronUp,
  Play, FileText, Users, TrendingUp, Zap, Heart
} from 'lucide-react';
import { useExerciseProtocols, type ExerciseProtocol } from '@/hooks/useExerciseProtocols';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

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
        goals: [
          'Controle de dor e edema',
          'Proteção do enxerto',
          'Extensão completa do joelho (0°)',
          'Flexão até 90°'
        ],
        exercises: [
          'Exercícios isométricos de quadríceps',
          'Elevação da perna estendida (SLR)',
          'Mobilização patelar',
          'Bombeamento de tornozelo',
          'Flexão passiva assistida'
        ],
        precautions: [
          'Uso obrigatório de muletas',
          'Órtese travada em extensão para marcha',
          'Evitar hiperextensão',
          'Carga parcial progressiva (50-75%)'
        ],
        criteria: [
          'Extensão completa atingida',
          'Edema controlado',
          'Bom controle do quadríceps'
        ]
      },
      {
        name: 'Fase 2 - Proteção Moderada',
        weeks: '2-6 semanas',
        goals: [
          'Flexão 0-120°',
          'Marcha normal sem muletas',
          'Início do fortalecimento ativo'
        ],
        exercises: [
          'Mini agachamentos (0-45°)',
          'Step ups baixos',
          'Leg press (arco limitado)',
          'Bicicleta ergométrica (sem resistência)',
          'Propriocepção em superfície estável'
        ],
        precautions: [
          'Evitar exercícios em cadeia cinética aberta com carga',
          'Controlar a progressão da carga',
          'Monitorar sinais de inflamação'
        ],
        criteria: [
          'ADM completa',
          'Marcha sem claudicação',
          'Força do quadríceps >60% do lado contralateral'
        ]
      },
      {
        name: 'Fase 3 - Fortalecimento',
        weeks: '6-12 semanas',
        goals: [
          'Fortalecimento progressivo',
          'Propriocepção avançada',
          'Início de atividades funcionais'
        ],
        exercises: [
          'Agachamento progressivo',
          'Leg press (arco completo)',
          'Exercícios em cadeia cinética aberta (CCA)',
          'Propriocepção em superfícies instáveis',
          'Caminhada em esteira'
        ],
        precautions: [
          'Progressão gradual da carga',
          'Evitar movimentos rotacionais',
          'Monitorar dor e edema'
        ],
        criteria: [
          'Força do quadríceps >80%',
          'Sem dor ou edema após exercícios',
          'Boa estabilidade dinâmica'
        ]
      },
      {
        name: 'Fase 4 - Retorno ao Esporte',
        weeks: '12-24 semanas',
        goals: [
          'Retorno gradual às atividades esportivas',
          'Força simétrica bilateral',
          'Confiança funcional'
        ],
        exercises: [
          'Corrida progressiva',
          'Pliometria básica',
          'Exercícios de agilidade',
          'Treinamento sport-specific',
          'Saltos unipodais'
        ],
        precautions: [
          'Testes funcionais antes de progredir',
          'Retorno gradual ao esporte',
          'Continuar programa de prevenção'
        ],
        criteria: [
          'LSI >90% em todos os testes',
          'Hop tests simétricos',
          'Clearance psicológica'
        ]
      }
    ],
    contraindications: [
      'Infecção ativa',
      'Frouxidão excessiva do enxerto',
      'Dor intensa não controlada',
      'Edema significativo persistente'
    ],
    expectedOutcomes: [
      '90-95% retornam às atividades diárias normais',
      '80-85% retornam ao esporte em nível semelhante',
      'Risco de re-ruptura: 5-15% em atletas jovens'
    ],
    references: [
      'MOON Knee Group Guidelines 2023',
      'APTA Clinical Practice Guidelines',
      'International Knee Documentation Committee'
    ]
  },
  'Tendinopatia do Manguito Rotador': {
    description: 'Protocolo de reabilitação conservadora para tendinopatia do manguito rotador, focando em exercícios progressivos de fortalecimento e controle motor.',
    objectives: [
      'Reduzir dor e inflamação',
      'Restaurar amplitude de movimento',
      'Fortalecer manguito rotador e estabilizadores escapulares',
      'Retorno funcional às atividades'
    ],
    phases: [
      {
        name: 'Fase 1 - Controle da Dor',
        weeks: '0-2 semanas',
        goals: [
          'Redução da dor (EVA <4)',
          'Controle inflamatório',
          'Manter mobilidade'
        ],
        exercises: [
          'Exercícios pendulares de Codman',
          'Automobilização passiva',
          'Deslizamento neural',
          'Exercícios posturais',
          'Crioterapia pós-exercício'
        ],
        precautions: [
          'Evitar movimentos acima de 90° de elevação',
          'Não realizar exercícios com dor >3/10',
          'Evitar atividades overhead'
        ],
        criteria: [
          'Dor em repouso <3/10',
          'Sono sem interrupção por dor',
          'ADM passiva sem dor'
        ]
      },
      {
        name: 'Fase 2 - Mobilidade e Ativação',
        weeks: '2-4 semanas',
        goals: [
          'ADM ativa completa',
          'Ativação do manguito rotador',
          'Controle escapular'
        ],
        exercises: [
          'AROM em todos os planos',
          'Isométricos do manguito rotador',
          'Exercícios de retração escapular',
          'Rotação externa/interna isométrica',
          'Ativação do serrátil anterior'
        ],
        precautions: [
          'Progressão baseada em sintomas',
          'Evitar compensações escapulares',
          'Manter técnica correta'
        ],
        criteria: [
          'ADM ativa igual ao lado contralateral',
          'Bom ritmo escapuloumeral',
          'Sem dor nos isométricos'
        ]
      },
      {
        name: 'Fase 3 - Fortalecimento',
        weeks: '4-8 semanas',
        goals: [
          'Fortalecimento progressivo',
          'Resistência muscular',
          'Estabilidade dinâmica'
        ],
        exercises: [
          'Rotação externa com faixa elástica',
          'Rotação interna com faixa elástica',
          'Elevação lateral até 90°',
          'Prone Y, T, W exercises',
          'Push-up plus progressivo'
        ],
        precautions: [
          'Progressão gradual de resistência',
          'Evitar fadiga excessiva',
          'Manter postura correta'
        ],
        criteria: [
          'Força >80% do lado contralateral',
          'Sem dor durante exercícios',
          'Boa tolerância à carga'
        ]
      },
      {
        name: 'Fase 4 - Funcional',
        weeks: '8-12 semanas',
        goals: [
          'Retorno às atividades funcionais',
          'Prevenção de recidivas',
          'Força e resistência completas'
        ],
        exercises: [
          'Exercícios pliométricos leves',
          'Atividades sport-specific',
          'Fortalecimento em cadeia cinética fechada',
          'Exercícios de estabilidade dinâmica',
          'Programa de manutenção'
        ],
        precautions: [
          'Retorno gradual às atividades',
          'Programa de prevenção contínuo',
          'Atenção a sinais de overuse'
        ],
        criteria: [
          'Força simétrica bilateral',
          'Função normal em AVDs',
          'Capacidade de realizar atividades ocupacionais'
        ]
      }
    ],
    contraindications: [
      'Ruptura completa do tendão',
      'Instabilidade glenoumeral significativa',
      'Capsulite adesiva em fase irritável',
      'Dor noturna intensa persistente'
    ],
    expectedOutcomes: [
      '70-80% melhora com tratamento conservador',
      'Tempo médio de recuperação: 3-6 meses',
      'Manutenção de exercícios reduz recidivas em 50%'
    ],
    references: [
      'JOSPT Clinical Practice Guidelines 2022',
      'Rotator Cuff Disorders Consensus Statement',
      'AAOS Evidence-Based Guidelines'
    ]
  }
};

function ProtocolCard({ protocol, onClick }: { protocol: ExerciseProtocol; onClick: () => void }) {
  const getMilestones = () => {
    if (!protocol.milestones) return [];
    if (Array.isArray(protocol.milestones)) return protocol.milestones;
    return [];
  };

  const milestones = getMilestones();

  return (
    <Card 
      className="p-6 hover:shadow-lg transition-all cursor-pointer group border-2 hover:border-primary/30"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">
            {protocol.name}
          </h3>
          <p className="text-sm text-muted-foreground">{protocol.condition_name}</p>
        </div>
        <Badge variant={protocol.protocol_type === 'pos_operatorio' ? 'default' : 'secondary'}>
          {protocol.protocol_type === 'pos_operatorio' ? 'Pós-Op' : 'Patologia'}
        </Badge>
      </div>

      {protocol.weeks_total && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">Duração Total</span>
            <span className="font-medium">{protocol.weeks_total} semanas</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary/60 via-primary to-green-500 rounded-full"
              style={{ width: '100%' }}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <span>{milestones.length} marcos</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="h-4 w-4 text-blue-500" />
          <span>{Math.ceil((protocol.weeks_total || 12) / 4)} fases</span>
        </div>
      </div>

      <Button variant="outline" className="w-full mt-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
        Ver Protocolo Completo
        <ArrowRight className="h-4 w-4 ml-2" />
      </Button>
    </Card>
  );
}

function ProtocolDetailView({ protocol, onBack }: { protocol: ExerciseProtocol; onBack: () => void }) {
  const details = PROTOCOL_DETAILS[protocol.condition_name];
  const [expandedPhases, setExpandedPhases] = useState<string[]>(['Fase 1']);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={onBack}>
          ← Voltar
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{protocol.name}</h1>
          <p className="text-muted-foreground">{protocol.condition_name}</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="text-base px-3 py-1">
            <Clock className="h-4 w-4 mr-2" />
            {protocol.weeks_total} semanas
          </Badge>
          <Badge variant={protocol.protocol_type === 'pos_operatorio' ? 'default' : 'secondary'} className="text-base px-3 py-1">
            {protocol.protocol_type === 'pos_operatorio' ? 'Pós-Operatório' : 'Patologia'}
          </Badge>
        </div>
      </div>

      {/* Description */}
      {details && (
        <Card className="p-6 bg-primary/5 border-primary/20">
          <p className="text-foreground leading-relaxed">{details.description}</p>
        </Card>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <Calendar className="h-8 w-8 mx-auto text-primary mb-2" />
          <p className="text-2xl font-bold">{protocol.weeks_total}</p>
          <p className="text-sm text-muted-foreground">Semanas</p>
        </Card>
        <Card className="p-4 text-center">
          <Target className="h-8 w-8 mx-auto text-green-500 mb-2" />
          <p className="text-2xl font-bold">{getMilestones().length}</p>
          <p className="text-sm text-muted-foreground">Marcos</p>
        </Card>
        <Card className="p-4 text-center">
          <Zap className="h-8 w-8 mx-auto text-blue-500 mb-2" />
          <p className="text-2xl font-bold">{details?.phases.length || 4}</p>
          <p className="text-sm text-muted-foreground">Fases</p>
        </Card>
        <Card className="p-4 text-center">
          <AlertTriangle className="h-8 w-8 mx-auto text-amber-500 mb-2" />
          <p className="text-2xl font-bold">{getRestrictions().length}</p>
          <p className="text-sm text-muted-foreground">Restrições</p>
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
              <div key={i} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span>{obj}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Timeline Visual */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Linha do Tempo de Progressão
        </h3>
        <div className="relative py-4">
          <div className="absolute top-1/2 left-0 right-0 h-1 bg-muted rounded-full -translate-y-1/2" />
          <div className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-red-500 via-amber-500 via-yellow-500 to-green-500 rounded-full -translate-y-1/2" style={{ width: '100%' }} />
          <div className="relative flex justify-between">
            {getMilestones().slice(0, 6).map((milestone: any, i: number) => (
              <div key={i} className="flex flex-col items-center">
                <div className="h-4 w-4 rounded-full bg-background border-2 border-primary mb-2" />
                <span className="text-xs font-medium">Sem {milestone.week}</span>
              </div>
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
          <div className="space-y-4">
            {details.phases.map((phase, i) => (
              <Collapsible 
                key={i} 
                open={expandedPhases.includes(phase.name.split(' - ')[0])}
                onOpenChange={() => togglePhase(phase.name.split(' - ')[0])}
              >
                <CollapsibleTrigger asChild>
                  <Card className="p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white font-bold ${
                          i === 0 ? 'bg-red-500' : 
                          i === 1 ? 'bg-amber-500' : 
                          i === 2 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}>
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
                  <div className="mt-2 ml-14 space-y-4 p-4 bg-muted/30 rounded-lg">
                    {/* Goals */}
                    <div>
                      <h5 className="font-medium text-sm text-muted-foreground mb-2 flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        Objetivos da Fase
                      </h5>
                      <ul className="space-y-1">
                        {phase.goals.map((goal, j) => (
                          <li key={j} className="flex items-center gap-2 text-sm">
                            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                            {goal}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Exercises */}
                    <div>
                      <h5 className="font-medium text-sm text-muted-foreground mb-2 flex items-center gap-2">
                        <Dumbbell className="h-4 w-4" />
                        Exercícios Recomendados
                      </h5>
                      <div className="flex flex-wrap gap-2">
                        {phase.exercises.map((ex, j) => (
                          <Badge key={j} variant="outline" className="text-xs">
                            {ex}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Precautions */}
                    <div>
                      <h5 className="font-medium text-sm text-muted-foreground mb-2 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        Precauções
                      </h5>
                      <ul className="space-y-1">
                        {phase.precautions.map((prec, j) => (
                          <li key={j} className="flex items-start gap-2 text-sm text-amber-600 dark:text-amber-400">
                            <AlertTriangle className="h-3 w-3 mt-1 flex-shrink-0" />
                            {prec}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Criteria */}
                    <div>
                      <h5 className="font-medium text-sm text-muted-foreground mb-2 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        Critérios para Próxima Fase
                      </h5>
                      <ul className="space-y-1">
                        {phase.criteria.map((crit, j) => (
                          <li key={j} className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                            <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
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
        <div className="space-y-3">
          {getMilestones().map((milestone: any, i: number) => (
            <div key={i} className="flex items-start gap-4 p-4 bg-green-500/10 rounded-lg border border-green-500/20">
              <div className="h-10 w-10 rounded-full bg-green-500 text-white flex items-center justify-center font-bold flex-shrink-0">
                {milestone.week}
              </div>
              <div>
                <p className="font-medium">Semana {milestone.week}</p>
                <p className="text-muted-foreground">{milestone.description}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Contraindications & Expected Outcomes */}
      {details && (
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Shield className="h-5 w-5 text-red-500" />
              Contraindicações
            </h3>
            <ul className="space-y-2">
              {details.contraindications.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Resultados Esperados
            </h3>
            <ul className="space-y-2">
              {details.expectedOutcomes.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      {/* References */}
      {details && (
        <Card className="p-6 bg-muted/50">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Referências
          </h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            {details.references.map((ref, i) => (
              <li key={i}>• {ref}</li>
            ))}
          </ul>
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-4">
        <Button className="flex-1" size="lg">
          <Play className="h-5 w-5 mr-2" />
          Aplicar a Paciente
        </Button>
        <Button variant="outline" size="lg">
          <FileText className="h-5 w-5 mr-2" />
          Exportar PDF
        </Button>
      </div>
    </div>
  );
}

export default function ProtocolsPage() {
  const [activeTab, setActiveTab] = useState<'pos_operatorio' | 'patologia'>('pos_operatorio');
  const [search, setSearch] = useState('');
  const [selectedProtocol, setSelectedProtocol] = useState<ExerciseProtocol | null>(null);

  const { protocols, loading } = useExerciseProtocols(activeTab);

  const filteredProtocols = protocols.filter(p => 
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.condition_name?.toLowerCase().includes(search.toLowerCase())
  );

  if (selectedProtocol) {
    return (
      <MainLayout>
        <div className="p-6 max-w-6xl mx-auto">
          <ProtocolDetailView 
            protocol={selectedProtocol} 
            onBack={() => setSelectedProtocol(null)} 
          />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Protocolos de Reabilitação</h1>
          <p className="text-muted-foreground">
            Protocolos clínicos baseados em evidências para guiar o tratamento de seus pacientes
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{protocols.length}</p>
                <p className="text-xs text-muted-foreground">Protocolos</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Activity className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{protocols.filter(p => p.protocol_type === 'pos_operatorio').length}</p>
                <p className="text-xs text-muted-foreground">Pós-Operatórios</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Heart className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{protocols.filter(p => p.protocol_type === 'patologia').length}</p>
                <p className="text-xs text-muted-foreground">Patologias</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">24</p>
                <p className="text-xs text-muted-foreground">Em uso</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Tabs and Search */}
        <Card className="p-6">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <TabsList>
                <TabsTrigger value="pos_operatorio" className="gap-2">
                  <Calendar className="h-4 w-4" />
                  Pós-Operatórios
                </TabsTrigger>
                <TabsTrigger value="patologia" className="gap-2">
                  <Target className="h-4 w-4" />
                  Patologias
                </TabsTrigger>
              </TabsList>

              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar protocolos..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <TabsContent value={activeTab}>
              {loading ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3].map(i => (
                    <Card key={i} className="p-6">
                      <Skeleton className="h-6 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-1/2 mb-4" />
                      <Skeleton className="h-2 w-full mb-4" />
                      <div className="grid grid-cols-2 gap-2">
                        <Skeleton className="h-4" />
                        <Skeleton className="h-4" />
                      </div>
                    </Card>
                  ))}
                </div>
              ) : filteredProtocols.length === 0 ? (
                <div className="text-center py-12">
                  <Target className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhum protocolo encontrado</h3>
                  <p className="text-muted-foreground">
                    {search ? 'Tente uma busca diferente' : 'Adicione seu primeiro protocolo'}
                  </p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredProtocols.map(protocol => (
                    <ProtocolCard 
                      key={protocol.id} 
                      protocol={protocol} 
                      onClick={() => setSelectedProtocol(protocol)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </MainLayout>
  );
}
