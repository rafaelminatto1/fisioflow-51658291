import React, { useState } from 'react';
import { Plus, BookOpen, Check, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { KnowledgeBase } from '@/services/ai/KnowledgeBase';
import { useAuth } from '@/hooks/useAuth';

interface KnowledgeContributorProps {
  onSuccess?: () => void;
}

const KNOWLEDGE_TYPES = [
  { value: 'protocolo', label: 'Protocolo de Tratamento', icon: '📋' },
  { value: 'exercicio', label: 'Exercício Terapêutico', icon: '🏃‍♂️' },
  { value: 'tecnica', label: 'Técnica Manual', icon: '🤲' },
  { value: 'diagnostico', label: 'Diagnóstico Diferencial', icon: '🔍' },
  { value: 'caso_clinico', label: 'Caso Clínico', icon: '📖' }
];

const COMMON_TAGS = [
  'lombar', 'cervical', 'ombro', 'joelho', 'quadril', 'punho',
  'dor_cronica', 'pos_operatorio', 'neurologico', 'ortopedico',
  'fortalecimento', 'mobilizacao', 'alongamento', 'cardio',
  'idoso', 'pediatrico', 'esportivo', 'trabalho'
];

export function KnowledgeContributor({ onSuccess }: KnowledgeContributorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    type: '',
    title: '',
    content: '',
    tags: [] as string[],
    customTag: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const knowledgeBase = new KnowledgeBase();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.type || !formData.title || !formData.content) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha tipo, título e conteúdo',
        variant: 'destructive'
      });
      return;
    }

    if (!user?.id) {
      toast({
        title: 'Erro de autenticação',
        description: 'Você precisa estar logado para contribuir',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const success = await knowledgeBase.contribute(
        formData.type,
        formData.title,
        formData.content,
        formData.tags,
        user.id
      );

      if (success) {
        toast({
          title: 'Contribuição registrada!',
          description: 'Seu conhecimento foi adicionado à base de dados',
          duration: 4000
        });

        // Reset form
        setFormData({
          type: '',
          title: '',
          content: '',
          tags: [],
          customTag: ''
        });
        
        setIsOpen(false);
        onSuccess?.();
      } else {
        throw new Error('Falha ao salvar');
      }
    } catch (error) {
      console.error('Error contributing:', error);
      toast({
        title: 'Erro ao contribuir',
        description: 'Não foi possível salvar sua contribuição',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const addTag = (tag: string) => {
    if (!formData.tags.includes(tag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const addCustomTag = () => {
    if (formData.customTag.trim() && !formData.tags.includes(formData.customTag.trim())) {
      addTag(formData.customTag.trim().toLowerCase());
      setFormData(prev => ({ ...prev, customTag: '' }));
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        variant="outline"
        className="gap-2"
      >
        <Plus className="h-4 w-4" />
        Contribuir com Conhecimento
      </Button>
    );
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Contribuir com Base de Conhecimento
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Compartilhe seu conhecimento para ajudar outros profissionais
        </p>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tipo de Conhecimento */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Tipo de Conhecimento *
            </label>
            <Select 
              value={formData.type} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {KNOWLEDGE_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.icon} {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Título */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Título *
            </label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Ex: Protocolo para Lombalgia Aguda"
              required
            />
          </div>

          {/* Conteúdo */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Conteúdo *
            </label>
            <Textarea
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              placeholder="Descreva detalhadamente o protocolo, técnica ou conhecimento..."
              rows={8}
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Seja específico e inclua contraindicações quando relevante
            </p>
          </div>

          {/* Tags */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Tags (palavras-chave)
            </label>
            
            {/* Tags selecionadas */}
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {formData.tags.map(tag => (
                  <Badge 
                    key={tag} 
                    variant="secondary" 
                    className="cursor-pointer"
                    onClick={() => removeTag(tag)}
                  >
                    {tag} ×
                  </Badge>
                ))}
              </div>
            )}

            {/* Tags comuns */}
            <div className="flex flex-wrap gap-1 mb-2">
              {COMMON_TAGS.filter(tag => !formData.tags.includes(tag)).map(tag => (
                <Badge 
                  key={tag} 
                  variant="outline" 
                  className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                  onClick={() => addTag(tag)}
                >
                  + {tag}
                </Badge>
              ))}
            </div>

            {/* Tag customizada */}
            <div className="flex gap-2">
              <Input
                value={formData.customTag}
                onChange={(e) => setFormData(prev => ({ ...prev, customTag: e.target.value }))}
                placeholder="Tag personalizada"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomTag())}
              />
              <Button 
                type="button" 
                onClick={addCustomTag}
                variant="outline"
                size="sm"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Aviso sobre validação */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium">Processo de Validação</p>
                <p>Sua contribuição será revisada por outros profissionais antes de ser disponibilizada no sistema de IA.</p>
              </div>
            </div>
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="gap-2"
            >
              {isSubmitting ? (
                <>Salvando...</>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Contribuir
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}