import React, { useState, useEffect, useMemo } from 'react';
import {

  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Search,
  FileText,
  Calendar,
  Users,
  Activity,
  Target,
  Settings,
  Zap,
  Sparkles,
  Clock,
  BarChart3,
  FolderOpen,
  Command,
  type LucideIcon
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: LucideIcon;
  category: string;
  action: () => void;
  shortcut?: string;
  keywords?: string[];
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId?: string;
  patientName?: string;
}

const CATEGORIES = {
  navigation: { label: 'Navegação', icon: FolderOpen },
  actions: { label: 'Ações Rápidas', icon: Zap },
  patient: { label: 'Paciente', icon: Users },
  clinical: { label: 'Clínico', icon: Activity },
  ai: { label: 'Inteligência Artificial', icon: Sparkles },
};

export function CommandPalette({ open, onOpenChange, patientId, patientName }: CommandPaletteProps) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Command items available in the context
  const commandItems = useMemo((): CommandItem[] => [
    // Navigation
    {
      id: 'nav-schedule',
      label: 'Agenda',
      description: 'Ver agenda de atendimentos',
      icon: Calendar,
      category: 'navigation',
      action: () => navigate('/schedule'),
      shortcut: 'G+A',
      keywords: ['agenda', 'calendario', 'atendimentos', 'marcacoes']
    },
    {
      id: 'nav-patients',
      label: 'Pacientes',
      description: 'Gerenciar pacientes',
      icon: Users,
      category: 'navigation',
      action: () => navigate('/patients'),
      shortcut: 'G+P',
      keywords: ['pacientes', 'lista', 'cadastro']
    },
    {
      id: 'nav-exercises',
      label: 'Exercícios',
      description: 'Biblioteca de exercícios',
      icon: Activity,
      category: 'navigation',
      action: () => navigate('/exercises'),
      shortcut: 'G+E',
      keywords: ['exercicios', 'biblioteca', 'pratica', 'movimento']
    },
    {
      id: 'nav-reports',
      label: 'Relatórios',
      description: 'Ver relatórios e estatísticas',
      icon: BarChart3,
      category: 'navigation',
      action: () => navigate('/reports'),
      shortcut: 'G+R',
      keywords: ['relatorios', 'estatisticas', 'dashboards', 'analytics']
    },
    {
      id: 'nav-settings',
      label: 'Configurações',
      description: 'Configurações da conta',
      icon: Settings,
      category: 'navigation',
      action: () => navigate('/settings'),
      keywords: ['configuracoes', 'preferencias', 'perfil', 'conta']
    },

    // Patient-specific actions (only if patientId is provided)
    ...(patientId ? [
      {
        id: 'patient-profile',
        label: 'Perfil do Paciente',
        description: `Ver perfil de ${patientName || 'paciente'}`,
        icon: Users,
        category: 'patient',
        action: () => navigate(`/patients/${patientId}`),
        keywords: ['perfil', 'detalhes', 'ficha', 'paciente']
      },
      {
        id: 'patient-history',
        label: 'Histórico',
        description: 'Ver histórico completo do paciente',
        icon: Clock,
        category: 'patient',
        action: () => navigate(`/patients/${patientId}?tab=clinical`),
        keywords: ['historico', 'evolucao', 'timeline', 'passado']
      },
      {
        id: 'patient-goals',
        label: 'Metas e Objetivos',
        description: 'Gerenciar metas do paciente',
        icon: Target,
        category: 'patient',
        action: () => navigate(`/patients/${patientId}?tab=overview`),
        keywords: ['metas', 'objetivos', 'alvos', 'progresso']
      },
      {
        id: 'patient-documents',
        label: 'Documentos',
        description: 'Ver documentos do paciente',
        icon: FileText,
        category: 'patient',
        action: () => navigate(`/patients/${patientId}?tab=documents`),
        keywords: ['documentos', 'arquivos', 'exames', 'anexos']
      },
    ] as CommandItem[] : []),

    // Clinical actions (only if patientId is provided)
    ...(patientId ? [
      {
        id: 'clinical-new-evolution',
        label: 'Nova Evolução',
        description: 'Criar nova evolução SOAP',
        icon: FileText,
        category: 'clinical',
        action: () => navigate(`/patients/${patientId}/evolution`),
        keywords: ['evolucao', 'soap', 'anotacao', 'consulta', 'sessao', 'atendimento']
      },
      {
        id: 'clinical-evaluation',
        label: 'Avaliação',
        description: 'Ficha de avaliação',
        icon: Activity,
        category: 'clinical',
        action: () => navigate(`/patients/${patientId}/evaluation`),
        keywords: ['avaliacao', 'ficha', 'anamnese', 'avaliar']
      },
      {
        id: 'clinical-measurements',
        label: 'Medições',
        description: 'Registrar medições',
        icon: BarChart3,
        category: 'clinical',
        action: () => navigate(`/patients/${patientId}?tab=clinical`),
        keywords: ['medicoes', 'mensuracao', 'avaliacao', 'teste', 'escala']
      },
    ] as CommandItem[] : []),

    // AI actions (only if patientId is provided)
    ...(patientId ? [
      {
        id: 'ai-suggestions',
        label: 'Sugestões de Tratamento',
        description: 'Obter sugestões com IA',
        icon: Sparkles,
        category: 'ai',
        action: () => {
          // Open AI tab in evolution page if we're there
          const aiButton = document.querySelector('[data-value="ai"]') as HTMLButtonElement;
          if (aiButton) {
            aiButton.click();
          } else {
            navigate(`/patients/${patientId}/evolution`);
          }
        },
        keywords: ['ia', 'ai', 'inteligencia', 'sugestao', 'tratamento', 'assistente']
      },
      {
        id: 'ai-predict',
        label: 'Previsão de Adesão',
        description: 'Análise de adesão ao tratamento',
        icon: Sparkles,
        category: 'ai',
        action: () => {
          // Trigger adherence prediction
          const predictButton = document.querySelector('[data-action="predict-adherence"]') as HTMLButtonElement;
          if (predictButton) {
            predictButton.click();
          }
        },
        keywords: ['adesao', 'previsao', 'predicao', 'risco', 'abandono']
      },
      {
        id: 'ai-report',
        label: 'Gerar Relatório',
        description: 'Gerar relatório com IA',
        icon: FileText,
        category: 'ai',
        action: () => {
          const reportButton = document.querySelector('[data-action="generate-report"]') as HTMLButtonElement;
          if (reportButton) {
            reportButton.click();
          }
        },
        keywords: ['relatorio', 'gerar', 'criar', 'laudo', 'documento']
      },
    ] as CommandItem[] : []),

    // Quick actions
    {
      id: 'action-save',
      label: 'Salvar',
      description: 'Salvar alterações',
      icon: Zap,
      category: 'actions',
      action: () => {
        const saveButton = document.querySelector('[data-action="save"]') as HTMLButtonElement;
        if (saveButton) {
          saveButton.click();
        }
      },
      shortcut: 'Ctrl+S',
      keywords: ['salvar', 'gravar', 'guardar']
    },
    {
      id: 'action-template',
      label: 'Aplicar Template',
      description: 'Abrir templates de SOAP',
      icon: FolderOpen,
      category: 'actions',
      action: () => {
        const templateButton = document.querySelector('[data-action="open-templates"]') as HTMLButtonElement;
        if (templateButton) {
          templateButton.click();
        }
      },
      shortcut: 'Alt+T',
      keywords: ['template', 'modelo', 'padrao', 'formularios']
    },
    {
      id: 'action-shortcuts',
      label: 'Atalhos',
      description: 'Ver atalhos de teclado',
      icon: Command,
      category: 'actions',
      action: () => {
        const shortcutsButton = document.querySelector('[data-action="open-shortcuts"]') as HTMLButtonElement;
        if (shortcutsButton) {
          shortcutsButton.click();
        }
      },
      shortcut: '?',
      keywords: ['atalhos', 'shortcuts', 'teclado', 'ajuda', 'help']
    },
  ], [navigate, patientId, patientName]);

  // Filter items based on search query
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) {
      return commandItems;
    }

    const searchLower = searchQuery.toLowerCase();
    return commandItems.filter(item => {
      const matchLabel = item.label.toLowerCase().includes(searchLower);
      const matchDescription = item.description?.toLowerCase().includes(searchLower);
      const matchKeywords = item.keywords?.some(keyword => keyword.toLowerCase().includes(searchLower));

      return matchLabel || matchDescription || matchKeywords;
    });
  }, [commandItems, searchQuery]);

  // Group items by category
  const groupedItems = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {};

    filteredItems.forEach(item => {
      if (!groups[item.category]) {
        groups[item.category] = [];
      }
      groups[item.category].push(item);
    });

    return groups;
  }, [filteredItems]);

  // Reset selection when items change
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const flatItems = filteredItems;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => (prev + 1) % flatItems.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => (prev - 1 + flatItems.length) % flatItems.length);
          break;
        case 'Enter':
          e.preventDefault();
          if (flatItems[selectedIndex]) {
            flatItems[selectedIndex].action();
            onOpenChange(false);
          }
          break;
        case 'Escape':
          onOpenChange(false);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, filteredItems, selectedIndex, onOpenChange]);

  const handleExecuteItem = (item: CommandItem) => {
    item.action();
    onOpenChange(false);
    setSearchQuery('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 max-w-2xl">
        <DialogHeader className="px-4 pt-4 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Command className="h-5 w-5" />
            Busca Rápida
          </DialogTitle>
          <DialogDescription className="sr-only">
            Busca rápida para navegação e ações. Use Ctrl+K para abrir.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center px-4 py-2 border-b">
          <Search className="h-4 w-4 mr-2 text-muted-foreground shrink-0" />
          <Input
            placeholder="Buscar comandos, pacientes, ações..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border-0 focus-visible:ring-0 h-9"
            autoFocus
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => setSearchQuery('')}
            >
              Limpar
            </Button>
          )}
        </div>

        <ScrollArea className="max-h-[400px]">
          <div className="px-2 py-2">
            {Object.entries(groupedItems).map(([category, items]) => {
              const categoryInfo = CATEGORIES[category as keyof typeof CATEGORIES];
              if (!categoryInfo || items.length === 0) return null;

              const CategoryIcon = categoryInfo.icon;

              return (
                <div key={category} className="mb-4 last:mb-0">
                  <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <CategoryIcon className="h-3 w-3" />
                    {categoryInfo.label}
                  </div>
                  <div className="mt-1 space-y-1">
                    {items.map((item, _index) => {
                      const globalIndex = filteredItems.indexOf(item);
                      const isSelected = globalIndex === selectedIndex;
                      const Icon = item.icon;

                      return (
                        <button
                          key={item.id}
                          onClick={() => handleExecuteItem(item)}
                          onMouseEnter={() => setSelectedIndex(globalIndex)}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 rounded-md text-left text-sm",
                            "hover:bg-accent hover:text-accent-foreground",
                            "transition-colors",
                            isSelected && "bg-accent"
                          )}
                        >
                          <div className="shrink-0">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium truncate">{item.label}</span>
                              {item.shortcut && (
                                <Badge variant="outline" className="text-[10px] px-1 py-0">
                                  {item.shortcut}
                                </Badge>
                              )}
                            </div>
                            {item.description && (
                              <p className="text-xs text-muted-foreground truncate">
                                {item.description}
                              </p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <div className="flex items-center justify-between px-4 py-2 border-t text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span>
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">↑↓</kbd> navegar
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">↵</kbd> selecionar
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">esc</kbd> fechar
            </span>
          </div>
          <span>{filteredItems.length} resultados</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
