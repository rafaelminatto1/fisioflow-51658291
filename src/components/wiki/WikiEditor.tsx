/**
 * WikiEditor - Editor de páginas wiki
 * Usa SmartTextarea com markdown e suporte a embeds
 */

import React, { useState } from 'react';
import { Save, X, Eye, EyeOff } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { SmartTextarea } from '@/components/ui/SmartTextarea';
import { toast } from 'sonner';

import type { WikiPage } from '@/types/wiki';

interface WikiEditorProps {
  page: WikiPage | null;
  onCancel: () => void;
  onSave: (data: Omit<WikiPage, 'id' | 'created_at' | 'updated_at' | 'version'>) => void;
}

export function WikiEditor({ page, onCancel, onSave }: WikiEditorProps) {
  const [title, setTitle] = useState(page?.title || '');
  const [content, setContent] = useState(page?.content || '');
  const [icon, setIcon] = useState(page?.icon || '');
  const [category, setCategory] = useState(page?.category || '');
  const [tags, setTags] = useState(page?.tags?.join(', ') || '');
  const [isPublished, setIsPublished] = useState(page?.is_published ?? true);
  const [showPreview, setShowPreview] = useState(false);

  const handleSave = () => {
    if (!title.trim()) {
      toast.error('Título é obrigatório');
      return;
    }

    // Generate slug from title
    const slug = title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    onSave({
      slug,
      title,
      content,
      icon,
      category,
      tags: tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      is_published: isPublished,
      organization_id: 'org-1',
      created_by: 'user-1',
      updated_by: 'user-1',
      parent_id: undefined,
      description: '',
      html_content: undefined,
      view_count: 0,
      attachments: [],
      created_at: { seconds: Date.now() / 1000, nanoseconds: 0 } as any,
      updated_at: { seconds: Date.now() / 1000, nanoseconds: 0 } as any,
      version: 1,
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-3 border-b bg-background">
        <div className="flex items-center gap-3">
          <Input
            placeholder="Título da página..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-64 font-semibold"
          />
          <Input
            placeholder="Emoji (ícone)"
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            className="w-20 text-center text-xl"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
          >
            {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </Button>
          <Button variant="outline" size="sm" onClick={onCancel}>
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
          <Button size="sm" onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            Salvar
          </Button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 flex">
        {/* Main Editor */}
        <div className="flex-1 flex flex-col">
          <SmartTextarea
            value={content}
            onChange={setContent}
            placeholder="Comece a escrever... Use markdown para formatação."
            className="flex-1 min-h-[500px] border-0 rounded-none focus-visible:ring-0 resize-none"
            showToolbar
            fullScreenEnabled
          />
        </div>

        {/* Sidebar */}
        <div className="w-64 border-l bg-muted/30 p-4 space-y-6">
          {/* Status */}
          <div className="flex items-center justify-between">
            <Label htmlFor="published">Publicar</Label>
            <Switch
              id="published"
              checked={isPublished}
              onCheckedChange={setIsPublished}
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Input
              placeholder="Ex: Protocolos"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags</Label>
            <Input
              placeholder="tag1, tag2, tag3"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Separadas por vírgula
            </p>
          </div>

          {/* Info */}
          {page && (
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Criado em: {new Date(page.created_at.toDate()).toLocaleDateString('pt-BR')}</p>
              <p>Versão: {page.version}</p>
              <p>Visualizações: {page.view_count}</p>
            </div>
          )}

          {/* Markdown Help */}
          <div className="text-xs text-muted-foreground">
            <p className="font-medium mb-2">Markdown disponível:</p>
            <ul className="space-y-1">
              <li># Título</li>
              <li>**negrito**</li>
              <li>*itálico*</li>
              <li>- lista</li>
              <li>`código`</li>
              <li>[link](url)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * WikiPageViewer - Visualizador de página wiki
 */
export function WikiPageViewer({
  page,
  onEdit,
}: {
  page: WikiPage;
  onEdit: () => void;
}) {
  return (
    <div className="max-w-4xl mx-auto p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            {page.icon && (
              <span className="text-6xl mb-4 block">{page.icon}</span>
            )}
            <h1 className="text-4xl font-bold mb-2">{page.title}</h1>
            {page.category && (
              <Badge variant="outline" className="mb-4">
                {page.category}
              </Badge>
            )}
          </div>
          <Button variant="outline" onClick={onEdit}>
            Editar
          </Button>
        </div>

        {/* Metadata */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>
            Última atualização:{' '}
            {new Date(page.updated_at.toDate()).toLocaleDateString('pt-BR')}
          </span>
          <span>•</span>
          <span>{page.view_count} visualizações</span>
        </div>
      </div>

      {/* Content */}
      <div className="prose prose-sm max-w-none">
        <div className="whitespace-pre-wrap">{page.content}</div>
      </div>

      {/* Tags */}
      {page.tags.length > 0 && (
        <div className="mt-8 pt-8 border-t">
          <div className="flex flex-wrap gap-2">
            {page.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
