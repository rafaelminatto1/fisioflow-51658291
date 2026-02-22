/**
 * AppointmentTemplates - Templates de agendamento
 *
 * Features:
 * - Criar templates de agendamentos
 * - Aplicar template a novo agendamento
 * - Gerenciar templates
 * - Variáveis dinâmicas
 * - Categorias de templates
 */

import React, { useState, useMemo, useCallback } from 'react';
import { FileText, Plus, Edit, Trash2, Copy, Check, X, LayoutTemplate } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export interface AppointmentTemplateVariable {
  key: string;
  label: string;
  example: string;
}

export const TEMPLATE_VARIABLES: AppointmentTemplateVariable[] = [
  { key: '{{paciente}}', label: 'Nome do paciente', example: 'João Silva' },
  { key: '{{data}}', label: 'Data do agendamento', example: '22/02/2026' },
  { key: '{{hora}}', label: 'Horário', example: '14:30' },
  { key: '{{profissional}}', label: 'Nome do profissional', example: 'Dr. Maria Santos' },
  { key: '{{servico}}', label: 'Nome do serviço', example: 'Fisioterapia' },
  { key: '{{duracao}}', label: 'Duração', example: '60 min' },
  { key: '{{observacoes}}', label: 'Observações', example: 'Trazer exames recentes' },
];

export interface AppointmentTemplate {
  id: string;
  name: string;
  description?: string;
  category?: string;
  service?: string;
  duration?: number;
  notes?: string;
  color?: string;
  variables?: Record<string, string>;
  isDefault?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AppointmentTemplatesProps {
  onApplyTemplate?: (template: AppointmentTemplate) => void;
  onCreateTemplate?: (template: Partial<AppointmentTemplate>) => void;
  onEditTemplate?: (template: AppointmentTemplate) => void;
  onDeleteTemplate?: (templateId: string) => void;
  className?: string;
}

// Templates padrão
const DEFAULT_TEMPLATES: AppointmentTemplate[] = [
  {
    id: 'evaluacao-inicial',
    name: 'Avaliação Inicial',
    description: 'Primeira consulta de avaliação',
    category: 'Avaliação',
    service: 'Avaliação Fisioterapêutica',
    duration: 60,
    notes: 'Anamnese completa, avaliação postural, teste de amplitude de movimento',
    color: '#3b82f6',
    isDefault: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'sessao-padrao',
    name: 'Sessão Padrão',
    description: 'Sessão de fisioterapia de rotina',
    category: 'Sessão',
    service: 'Fisioterapia',
    duration: 60,
    notes: 'Exercícios de alongamento, fortalecimento e mobilização',
    color: '#10b981',
    isDefault: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'retorno',
    name: 'Retorno',
    description: 'Consulta de retorno para acompanhamento',
    category: 'Acompanhamento',
    service: 'Fisioterapia',
    duration: 45,
    notes: 'Reavaliação do quadro atual, ajuste no plano de tratamento',
    color: '#f59e0b',
    isDefault: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export const AppointmentTemplates: React.FC<AppointmentTemplatesProps> = ({
  onApplyTemplate,
  onCreateTemplate,
  onEditTemplate,
  onDeleteTemplate,
  className,
}) => {
  const [templates, setTemplates] = useState<AppointmentTemplate[]>(DEFAULT_TEMPLATES);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<AppointmentTemplate | null>(null);

  // Filtrar templates
  const filteredTemplates = useMemo(() => {
    return templates.filter((template) => {
      const matchesSearch = !searchQuery ||
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.description?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = !selectedCategory || template.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [templates, searchQuery, selectedCategory]);

  // Categorias únicas
  const categories = useMemo(() => {
    const cats = new Set(templates.map(t => t.category).filter(Boolean) as string[]);
    return Array.from(cats);
  }, [templates]);

  // Criar novo template
  const handleCreate = useCallback((template: Partial<AppointmentTemplate>) => {
    const newTemplate: AppointmentTemplate = {
      id: `template-${Date.now()}`,
      name: template.name || 'Novo Template',
      description: template.description,
      category: template.category,
      service: template.service,
      duration: template.duration,
      notes: template.notes,
      color: template.color || '#6366f1',
      variables: template.variables || {},
      isDefault: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setTemplates(prev => [...prev, newTemplate]);
    onCreateTemplate?.(newTemplate);
    setIsCreating(false);
  }, [onCreateTemplate]);

  // Editar template
  const handleEdit = useCallback((template: AppointmentTemplate) => {
    const updated = {
      ...template,
      updatedAt: new Date(),
    };

    setTemplates(prev => prev.map(t => t.id === template.id ? updated : t));
    onEditTemplate?.(updated);
    setEditingTemplate(null);
  }, [onEditTemplate]);

  // Deletar template
  const handleDelete = useCallback((templateId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este template?')) return;
    setTemplates(prev => prev.filter(t => t.id !== templateId));
    onDeleteTemplate?.(templateId);
  }, [onDeleteTemplate]);

  // Duplicar template
  const handleDuplicate = useCallback((template: AppointmentTemplate) => {
    const duplicate: AppointmentTemplate = {
      ...template,
      id: `template-${Date.now()}`,
      name: `${template.name} (Cópia)`,
      isDefault: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setTemplates(prev => [...prev, duplicate]);
  }, []);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LayoutTemplate className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Templates de Agendamento</h3>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Novo Template
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Busca */}
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Buscar templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 pl-10 rounded-lg border bg-background"
          />
          <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        </div>

        {/* Categorias */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedCategory(null)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm transition-colors',
              selectedCategory === null ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
            )}
          >
            Todos
          </button>
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm transition-colors',
                selectedCategory === category ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
              )}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de templates */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.map((template) => (
          <div
            key={template.id}
            className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
          >
            {/* Header com cor */}
            <div
              className="px-4 py-3 flex items-start justify-between"
              style={{ backgroundColor: `${template.color}20` }}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: template.color }}
                  />
                  <h4 className="font-semibold">{template.name}</h4>
                  {template.isDefault && (
                    <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">
                      Padrão
                    </span>
                  )}
                </div>
                {template.description && (
                  <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
                )}
                {template.category && (
                  <span className="text-xs text-muted-foreground">{template.category}</span>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-1">
                <button
                  onClick={() => onApplyTemplate?.(template)}
                  className="p-1.5 hover:bg-black/10 rounded transition-colors"
                  title="Aplicar template"
                >
                  <Copy className="w-4 h-4" />
                </button>
                {!template.isDefault && (
                  <>
                    <button
                      onClick={() => setEditingTemplate(template)}
                      className="p-1.5 hover:bg-black/10 rounded transition-colors"
                      title="Editar"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(template.id)}
                      className="p-1.5 hover:bg-black/10 rounded transition-colors text-destructive"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Detalhes */}
            <div className="px-4 py-3 space-y-2 bg-muted/30">
              {template.service && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Serviço:</span>
                  <span className="font-medium">{template.service}</span>
                </div>
              )}
              {template.duration && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Duração:</span>
                  <span className="font-medium">{template.duration} min</span>
                </div>
              )}
              {template.notes && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Obs:</span>
                  <span className="line-clamp-2">{template.notes}</span>
                </div>
              )}
            </div>
          </div>
        ))}

        {filteredTemplates.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <LayoutTemplate className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum template encontrado</p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-primary hover:underline mt-2"
              >
                Limpar busca
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modal de criação/edição */}
      {(isCreating || editingTemplate) && (
        <TemplateEditor
          template={editingTemplate}
          onSave={isCreating ? handleCreate : handleEdit}
          onCancel={() => {
            setIsCreating(false);
            setEditingTemplate(null);
          }}
        />
      )}
    </div>
  );
};

// ============================================================================
// TEMPLATE EDITOR COMPONENT
// ============================================================================

interface TemplateEditorProps {
  template: AppointmentTemplate | null;
  onSave: (template: Partial<AppointmentTemplate>) => void;
  onCancel: () => void;
}

const COLORS = [
  { name: 'Azul', value: '#3b82f6' },
  { name: 'Verde', value: '#10b981' },
  { name: 'Amarelo', value: '#f59e0b' },
  { name: 'Vermelho', value: '#ef4444' },
  { name: 'Roxo', value: '#8b5cf6' },
  { name: 'Rosa', value: '#ec4899' },
];

const TemplateEditor: React.FC<TemplateEditorProps> = ({
  template,
  onSave,
  onCancel,
}) => {
  const [name, setName] = useState(template?.name || '');
  const [description, setDescription] = useState(template?.description || '');
  const [category, setCategory] = useState(template?.category || '');
  const [service, setService] = useState(template?.service || '');
  const [duration, setDuration] = useState(template?.duration || 60);
  const [notes, setNotes] = useState(template?.notes || '');
  const [color, setColor] = useState(template?.color || '#6366f1');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...(template || {}),
      name,
      description,
      category,
      service,
      duration,
      notes,
      color,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-lg bg-background rounded-2xl shadow-2xl">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {template ? 'Editar Template' : 'Novo Template'}
          </h2>
          <button onClick={onCancel} className="p-2 hover:bg-muted rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Nome */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Nome *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-2 rounded-lg border bg-background"
              placeholder="Ex: Sessão Padrão"
            />
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Descrição</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border bg-background"
              placeholder="Breve descrição do template"
            />
          </div>

          {/* Categoria */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Categoria</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border bg-background"
              placeholder="Ex: Avaliação, Sessão"
            />
          </div>

          {/* Serviço e Duração */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Serviço</label>
              <input
                type="text"
                value={service}
                onChange={(e) => setService(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border bg-background"
                placeholder="Ex: Fisioterapia"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Duração (min)</label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value) || 60)}
                min="15"
                step="15"
                className="w-full px-4 py-2 rounded-lg border bg-background"
              />
            </div>
          </div>

          {/* Cor */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Cor de identificação</label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={cn(
                    'w-10 h-10 rounded-lg transition-all hover:scale-110',
                    color === c.value ? 'ring-2 ring-primary ring-offset-2' : ''
                  )}
                  style={{ backgroundColor: c.value }}
                  title={c.name}
                />
              ))}
            </div>
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Observações</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 rounded-lg border bg-background resize-none"
              placeholder="Observações padrão para este template"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 rounded-lg border hover:bg-muted transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
            >
              <Check className="w-4 h-4 inline mr-2" />
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
