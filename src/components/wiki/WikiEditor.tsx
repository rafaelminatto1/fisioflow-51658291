/**
 * WikiEditor - Editor de páginas wiki
 * Editor por blocos estilo Notion com slash menu, drag-and-drop e preview.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Save,
  X,
  Eye,
  EyeOff,
  GripVertical,
  Plus,
  Trash2,
  Copy,
  ImagePlus,
  Video,
  Youtube,
  Globe,
  UploadCloud,
  ExternalLink,
  Heading1,
  Heading2,
  Heading3,
  ListChecks,
  Columns2,
  AlertCircle,
  ChevronDown,
  Database,
  Type,
  MessageSquare,
  History,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { uploadFile } from '@/integrations/firebase/storage';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { wikiService } from '@/lib/services/wikiService';
import type { WikiComment, WikiPage, WikiPageVersion } from '@/types/wiki';

interface WikiEditorProps {
  page: WikiPage | null;
  draft?: WikiEditorDraft | null;
  onCancel: () => void;
  onSave: (data: Omit<WikiPage, 'id' | 'created_at' | 'updated_at' | 'version'>) => void;
}

interface WikiEditorDraft {
  title?: string;
  content?: string;
  html_content?: string;
  icon?: string;
  category?: string;
  tags?: string[];
  is_published?: boolean;
  template_id?: string;
  triage_order?: number;
}

type WikiBlockType =
  | 'paragraph'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'callout'
  | 'toggle'
  | 'checklist'
  | 'columns'
  | 'image'
  | 'video'
  | 'youtube'
  | 'embed'
  | 'database';

type CalloutTone = 'info' | 'warning' | 'success' | 'error';
type DatabaseColumnType = 'text' | 'number' | 'date';

interface WikiChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

interface WikiDatabaseColumn {
  id: string;
  name: string;
  type: DatabaseColumnType;
}

interface WikiDatabaseRow {
  id: string;
  values: Record<string, string>;
}

interface WikiDatabaseConfig {
  title: string;
  columns: WikiDatabaseColumn[];
  rows: WikiDatabaseRow[];
  filter: string;
  sortColumnId: string;
  sortDirection: 'asc' | 'desc';
}

interface WikiBlock {
  id: string;
  type: WikiBlockType;
  text?: string;
  tone?: CalloutTone;
  title?: string;
  body?: string;
  open?: boolean;
  items?: WikiChecklistItem[];
  left?: string;
  right?: string;
  url?: string;
  database?: WikiDatabaseConfig;
}

interface SlashCommand {
  id: WikiBlockType;
  label: string;
  description: string;
  keywords: string[];
  icon: React.ComponentType<{ className?: string }>;
}

interface SerializedWikiBlocksDocument {
  version: 1;
  blocks: WikiBlock[];
}

interface DiffLine {
  type: 'same' | 'added' | 'removed';
  text: string;
}

interface BlockTextSelection {
  text: string;
  start: number;
  end: number;
}

const WIKI_BLOCK_DOC_PREFIX = 'wiki-blocks:v1:';
const MAX_IMAGE_UPLOAD_BYTES = 15 * 1024 * 1024;
const MAX_VIDEO_UPLOAD_BYTES = 250 * 1024 * 1024;
const IMAGE_EXTENSIONS_REGEX = /\.(avif|webp|png|jpe?g|gif|svg)$/i;
const VIDEO_EXTENSIONS_REGEX = /\.(mp4|webm|ogg|mov|m4v)$/i;

const CALLOUT_STYLES: Record<CalloutTone, { label: string; className: string }> = {
  info: {
    label: 'Informação',
    className: 'border-sky-300 bg-sky-50/80 text-sky-900 dark:border-sky-700 dark:bg-sky-950/30 dark:text-sky-100',
  },
  warning: {
    label: 'Atenção',
    className: 'border-amber-300 bg-amber-50/80 text-amber-900 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-100',
  },
  success: {
    label: 'Sucesso',
    className: 'border-emerald-300 bg-emerald-50/80 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-100',
  },
  error: {
    label: 'Erro',
    className: 'border-rose-300 bg-rose-50/80 text-rose-900 dark:border-rose-700 dark:bg-rose-950/30 dark:text-rose-100',
  },
};

const SLASH_COMMANDS: SlashCommand[] = [
  {
    id: 'paragraph',
    label: 'Parágrafo',
    description: 'Texto livre em markdown',
    keywords: ['texto', 'p', 'paragraph', 'body'],
    icon: Type,
  },
  {
    id: 'heading1',
    label: 'Título H1',
    description: 'Título principal da seção',
    keywords: ['h1', 'titulo', 'heading'],
    icon: Heading1,
  },
  {
    id: 'heading2',
    label: 'Título H2',
    description: 'Subtítulo de seção',
    keywords: ['h2', 'subtitulo', 'heading'],
    icon: Heading2,
  },
  {
    id: 'heading3',
    label: 'Título H3',
    description: 'Subdivisão menor',
    keywords: ['h3', 'subtitulo', 'heading'],
    icon: Heading3,
  },
  {
    id: 'callout',
    label: 'Callout',
    description: 'Bloco de destaque com cor/alerta',
    keywords: ['destaque', 'alerta', 'nota', 'callout'],
    icon: AlertCircle,
  },
  {
    id: 'toggle',
    label: 'Toggle',
    description: 'Bloco expansível/retrátil',
    keywords: ['detalhes', 'collapse', 'toggle'],
    icon: ChevronDown,
  },
  {
    id: 'checklist',
    label: 'Checklist',
    description: 'Lista de tarefas com checkboxes',
    keywords: ['tarefas', 'check', 'todo', 'lista'],
    icon: ListChecks,
  },
  {
    id: 'columns',
    label: 'Colunas',
    description: 'Layout em duas colunas',
    keywords: ['duas colunas', 'layout', 'columns'],
    icon: Columns2,
  },
  {
    id: 'image',
    label: 'Imagem',
    description: 'Imagem por URL ou upload',
    keywords: ['foto', 'media', 'imagem', 'image'],
    icon: ImagePlus,
  },
  {
    id: 'video',
    label: 'Vídeo',
    description: 'Vídeo por URL ou upload',
    keywords: ['video', 'media', 'mp4'],
    icon: Video,
  },
  {
    id: 'youtube',
    label: 'YouTube',
    description: 'Embed de YouTube',
    keywords: ['yt', 'youtube', 'embed'],
    icon: Youtube,
  },
  {
    id: 'embed',
    label: 'Embed Externo',
    description: 'Iframe de URL externa',
    keywords: ['iframe', 'embed', 'externo'],
    icon: Globe,
  },
  {
    id: 'database',
    label: 'Banco de Dados',
    description: 'Tabela embutida com filtro/sort',
    keywords: ['table', 'db', 'database', 'tabela'],
    icon: Database,
  },
];

function createId(): string {
  if (typeof globalThis !== 'undefined' && globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `wiki-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function buildSlug(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function sanitizeFileName(fileName: string): string {
  const cleaned = fileName
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9._-]/g, '');

  return cleaned || `arquivo-${Date.now()}`;
}

function normalizeUrl(rawUrl: string): string | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const parsedUrl = new URL(withProtocol);
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') return null;
    return parsedUrl.toString();
  } catch {
    return null;
  }
}

function getUrlPath(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

function isImageUrl(url: string): boolean {
  return IMAGE_EXTENSIONS_REGEX.test(getUrlPath(url));
}

function isVideoUrl(url: string): boolean {
  return VIDEO_EXTENSIONS_REGEX.test(getUrlPath(url));
}

function getYouTubeEmbedUrl(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
  return match ? `https://www.youtube.com/embed/${match[1]}` : null;
}

function getVimeoEmbedUrl(url: string): string | null {
  const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  return match ? `https://player.vimeo.com/video/${match[1]}` : null;
}

function createDefaultDatabaseConfig(): WikiDatabaseConfig {
  const nameColumnId = createId();
  const statusColumnId = createId();

  return {
    title: 'Tabela sem título',
    columns: [
      { id: nameColumnId, name: 'Nome', type: 'text' },
      { id: statusColumnId, name: 'Status', type: 'text' },
    ],
    rows: [
      {
        id: createId(),
        values: {
          [nameColumnId]: 'Exemplo',
          [statusColumnId]: 'Ativo',
        },
      },
    ],
    filter: '',
    sortColumnId: nameColumnId,
    sortDirection: 'asc',
  };
}

function createBlock(type: WikiBlockType): WikiBlock {
  switch (type) {
    case 'paragraph':
      return { id: createId(), type, text: '' };
    case 'heading1':
    case 'heading2':
    case 'heading3':
      return { id: createId(), type, text: '' };
    case 'callout':
      return { id: createId(), type, tone: 'info', text: '' };
    case 'toggle':
      return { id: createId(), type, title: 'Detalhes', body: '', open: false };
    case 'checklist':
      return {
        id: createId(),
        type,
        items: [
          { id: createId(), text: 'Nova tarefa', checked: false },
        ],
      };
    case 'columns':
      return { id: createId(), type, left: '', right: '' };
    case 'image':
    case 'video':
    case 'youtube':
    case 'embed':
      return { id: createId(), type, url: '' };
    case 'database':
      return { id: createId(), type, database: createDefaultDatabaseConfig() };
    default:
      return { id: createId(), type: 'paragraph', text: '' };
  }
}

function normalizeBlock(rawBlock: Partial<WikiBlock>): WikiBlock {
  const blockType = rawBlock.type ?? 'paragraph';
  const block = createBlock(blockType);

  return {
    ...block,
    ...rawBlock,
    id: rawBlock.id ?? block.id,
    type: blockType,
  };
}

function serializeBlocksDocument(blocks: WikiBlock[]): string {
  const safeBlocks = blocks.map((block) => normalizeBlock(block));
  const doc: SerializedWikiBlocksDocument = {
    version: 1,
    blocks: safeBlocks,
  };
  return `${WIKI_BLOCK_DOC_PREFIX}${JSON.stringify(doc)}`;
}

function deserializeBlocksDocument(htmlContent?: string): WikiBlock[] | null {
  if (!htmlContent || !htmlContent.startsWith(WIKI_BLOCK_DOC_PREFIX)) return null;

  try {
    const payload = htmlContent.slice(WIKI_BLOCK_DOC_PREFIX.length);
    const parsed = JSON.parse(payload) as SerializedWikiBlocksDocument;
    if (!parsed || !Array.isArray(parsed.blocks)) return null;

    return parsed.blocks.map((block) => normalizeBlock(block));
  } catch {
    return null;
  }
}

function parseLegacyMarkdownToBlocks(content: string): WikiBlock[] {
  const trimmed = content.trim();
  if (!trimmed) {
    return [createBlock('paragraph')];
  }

  const chunks = trimmed.split(/\n{2,}/).map((chunk) => chunk.trim()).filter(Boolean);
  const blocks: WikiBlock[] = [];

  chunks.forEach((chunk) => {
    const mediaCommand = chunk.match(/^\/(image|video|youtube|embed)\s+(.+)$/i);
    if (mediaCommand) {
      const type = mediaCommand[1].toLowerCase() as WikiBlockType;
      blocks.push(normalizeBlock({ id: createId(), type, url: mediaCommand[2].trim() }));
      return;
    }

    if (/^#\s+/.test(chunk)) {
      blocks.push(normalizeBlock({ id: createId(), type: 'heading1', text: chunk.replace(/^#\s+/, '') }));
      return;
    }

    if (/^##\s+/.test(chunk)) {
      blocks.push(normalizeBlock({ id: createId(), type: 'heading2', text: chunk.replace(/^##\s+/, '') }));
      return;
    }

    if (/^###\s+/.test(chunk)) {
      blocks.push(normalizeBlock({ id: createId(), type: 'heading3', text: chunk.replace(/^###\s+/, '') }));
      return;
    }

    const calloutMatch = chunk.match(/^>\s*\[!(INFO|WARNING|SUCCESS|ERROR)\]\s*([\s\S]*)$/i);
    if (calloutMatch) {
      const tone = calloutMatch[1].toLowerCase() as CalloutTone;
      blocks.push(normalizeBlock({ id: createId(), type: 'callout', tone, text: calloutMatch[2].trim() }));
      return;
    }

    const toggleMatch = chunk.match(/^<details>\s*<summary>([\s\S]*?)<\/summary>\s*([\s\S]*?)<\/details>$/i);
    if (toggleMatch) {
      blocks.push(normalizeBlock({
        id: createId(),
        type: 'toggle',
        title: toggleMatch[1].trim(),
        body: toggleMatch[2].trim(),
      }));
      return;
    }

    const checklistLines = chunk.split('\n').map((line) => line.trim()).filter(Boolean);
    if (checklistLines.length > 0 && checklistLines.every((line) => /^-\s\[(x| )\]\s+/i.test(line))) {
      blocks.push(normalizeBlock({
        id: createId(),
        type: 'checklist',
        items: checklistLines.map((line) => ({
          id: createId(),
          checked: /^-\s\[x\]/i.test(line),
          text: line.replace(/^-\s\[(x| )\]\s+/i, '').trim(),
        })),
      }));
      return;
    }

    const databaseMatch = chunk.match(/^```wiki-database\s*([\s\S]*?)```$/i);
    if (databaseMatch) {
      try {
        const parsed = JSON.parse(databaseMatch[1].trim()) as WikiDatabaseConfig;
        blocks.push(normalizeBlock({
          id: createId(),
          type: 'database',
          database: {
            ...createDefaultDatabaseConfig(),
            ...parsed,
          },
        }));
        return;
      } catch {
        // fallback para parágrafo
      }
    }

    blocks.push(normalizeBlock({ id: createId(), type: 'paragraph', text: chunk }));
  });

  return blocks.length > 0 ? blocks : [createBlock('paragraph')];
}

function buildBlocksFromSource(source: { content?: string; html_content?: string } | null): WikiBlock[] {
  if (!source) {
    return [createBlock('paragraph')];
  }

  const parsedDocument = deserializeBlocksDocument(source.html_content);
  if (parsedDocument && parsedDocument.length > 0) {
    return parsedDocument;
  }

  return parseLegacyMarkdownToBlocks(source.content || '');
}

function buildBlocksFromPage(page: WikiPage | null): WikiBlock[] {
  return buildBlocksFromSource(page);
}

function databaseToMarkdown(database: WikiDatabaseConfig): string {
  const columns = database.columns;
  if (columns.length === 0) return '';

  const header = `| ${columns.map((column) => column.name).join(' | ')} |`;
  const separator = `| ${columns.map(() => '---').join(' | ')} |`;

  const rows = database.rows.map((row) => {
    const values = columns.map((column) => row.values[column.id] ?? '');
    return `| ${values.join(' | ')} |`;
  });

  return [header, separator, ...rows].join('\n');
}

function blocksToMarkdown(blocks: WikiBlock[]): string {
  const chunks = blocks.map((block) => {
    switch (block.type) {
      case 'paragraph':
        return block.text?.trim() || '';
      case 'heading1':
        return `# ${block.text?.trim() || ''}`;
      case 'heading2':
        return `## ${block.text?.trim() || ''}`;
      case 'heading3':
        return `### ${block.text?.trim() || ''}`;
      case 'callout': {
        const tone = (block.tone || 'info').toUpperCase();
        return `> [!${tone}] ${block.text?.trim() || ''}`;
      }
      case 'toggle':
        return `<details>\n<summary>${block.title?.trim() || 'Detalhes'}</summary>\n\n${block.body?.trim() || ''}\n\n</details>`;
      case 'checklist':
        return (block.items || []).map((item) => `- [${item.checked ? 'x' : ' '}] ${item.text}`).join('\n');
      case 'columns':
        return `/columns\n::left\n${block.left?.trim() || ''}\n::right\n${block.right?.trim() || ''}\n/endcolumns`;
      case 'image':
        return block.url ? `/image ${block.url}` : '/image';
      case 'video':
        return block.url ? `/video ${block.url}` : '/video';
      case 'youtube':
        return block.url ? `/youtube ${block.url}` : '/youtube';
      case 'embed':
        return block.url ? `/embed ${block.url}` : '/embed';
      case 'database': {
        const database = block.database ?? createDefaultDatabaseConfig();
        const markdownTable = databaseToMarkdown(database);
        const serialized = JSON.stringify(database);
        return `### ${database.title || 'Banco de dados'}\n\n${markdownTable}\n\n\`\`\`wiki-database\n${serialized}\n\`\`\``;
      }
      default:
        return '';
    }
  });

  return chunks.filter(Boolean).join('\n\n').trim();
}

function getBlockLabel(type: WikiBlockType): string {
  switch (type) {
    case 'paragraph':
      return 'Parágrafo';
    case 'heading1':
      return 'Título H1';
    case 'heading2':
      return 'Título H2';
    case 'heading3':
      return 'Título H3';
    case 'callout':
      return 'Callout';
    case 'toggle':
      return 'Toggle';
    case 'checklist':
      return 'Checklist';
    case 'columns':
      return 'Colunas';
    case 'image':
      return 'Imagem';
    case 'video':
      return 'Vídeo';
    case 'youtube':
      return 'YouTube';
    case 'embed':
      return 'Embed';
    case 'database':
      return 'Banco de Dados';
    default:
      return 'Bloco';
  }
}

function getBlockExcerpt(block: WikiBlock): string {
  switch (block.type) {
    case 'paragraph':
    case 'heading1':
    case 'heading2':
    case 'heading3':
    case 'callout':
      return (block.text || '').slice(0, 180).trim();
    case 'toggle':
      return `${block.title || 'Toggle'} ${(block.body || '').slice(0, 120)}`.trim();
    case 'checklist':
      return (block.items || []).map((item) => item.text).join(' • ').slice(0, 180).trim();
    case 'columns':
      return `${block.left || ''} ${(block.right || '')}`.slice(0, 180).trim();
    case 'image':
    case 'video':
    case 'youtube':
    case 'embed':
      return block.url || `${getBlockLabel(block.type)} sem URL`;
    case 'database':
      return block.database?.title || 'Banco de dados';
    default:
      return '';
  }
}

function getDateFromTimestamp(value: unknown): Date | null {
  if (value && typeof value === 'object' && 'toDate' in value && typeof (value as { toDate?: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  if (value instanceof Date) {
    return value;
  }
  return null;
}

function formatTimestamp(value: unknown): string {
  const date = getDateFromTimestamp(value);
  if (!date) return '-';

  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getSelectionWithinElement(container: HTMLElement): BlockTextSelection | null {
  if (typeof window === 'undefined') return null;

  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    return null;
  }

  const range = selection.getRangeAt(0);
  if (!container.contains(range.commonAncestorContainer)) {
    return null;
  }

  const rawSelectedText = range.toString();
  const normalizedSelectedText = rawSelectedText.replace(/\s+/g, ' ').trim();
  if (!normalizedSelectedText) {
    return null;
  }

  const prefixRange = range.cloneRange();
  prefixRange.selectNodeContents(container);
  prefixRange.setEnd(range.startContainer, range.startOffset);

  const start = prefixRange.toString().length;
  const end = start + rawSelectedText.length;

  if (end <= start) {
    return null;
  }

  return {
    text: normalizedSelectedText,
    start,
    end,
  };
}

function computeLineDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  const oldLength = oldLines.length;
  const newLength = newLines.length;

  const dp: number[][] = Array.from({ length: oldLength + 1 }, () => Array(newLength + 1).fill(0));

  for (let i = oldLength - 1; i >= 0; i -= 1) {
    for (let j = newLength - 1; j >= 0; j -= 1) {
      if (oldLines[i] === newLines[j]) {
        dp[i][j] = dp[i + 1][j + 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  const result: DiffLine[] = [];
  let i = 0;
  let j = 0;

  while (i < oldLength && j < newLength) {
    if (oldLines[i] === newLines[j]) {
      result.push({ type: 'same', text: oldLines[i] });
      i += 1;
      j += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      result.push({ type: 'removed', text: oldLines[i] });
      i += 1;
    } else {
      result.push({ type: 'added', text: newLines[j] });
      j += 1;
    }
  }

  while (i < oldLength) {
    result.push({ type: 'removed', text: oldLines[i] });
    i += 1;
  }

  while (j < newLength) {
    result.push({ type: 'added', text: newLines[j] });
    j += 1;
  }

  return result;
}

function getFilteredAndSortedRows(
  database: WikiDatabaseConfig,
  search: string,
  sortColumnId: string,
  sortDirection: 'asc' | 'desc'
): WikiDatabaseRow[] {
  const loweredSearch = search.trim().toLowerCase();

  const filtered = loweredSearch
    ? database.rows.filter((row) =>
        database.columns.some((column) =>
          String(row.values[column.id] ?? '').toLowerCase().includes(loweredSearch)
        )
      )
    : database.rows;

  const sorted = [...filtered].sort((a, b) => {
    const valueA = String(a.values[sortColumnId] ?? '');
    const valueB = String(b.values[sortColumnId] ?? '');

    const comparison = valueA.localeCompare(valueB, 'pt-BR', { numeric: true, sensitivity: 'base' });
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  return sorted;
}

function insertBlockAfter(blocks: WikiBlock[], newBlock: WikiBlock, afterBlockId: string | null): WikiBlock[] {
  if (!afterBlockId) {
    return [...blocks, newBlock];
  }

  const index = blocks.findIndex((block) => block.id === afterBlockId);
  if (index === -1) {
    return [...blocks, newBlock];
  }

  return [...blocks.slice(0, index + 1), newBlock, ...blocks.slice(index + 1)];
}

function reorderBlocks(blocks: WikiBlock[], fromBlockId: string, toBlockId: string): WikiBlock[] {
  if (fromBlockId === toBlockId) {
    return blocks;
  }

  const fromIndex = blocks.findIndex((block) => block.id === fromBlockId);
  const toIndex = blocks.findIndex((block) => block.id === toBlockId);

  if (fromIndex < 0 || toIndex < 0) {
    return blocks;
  }

  const reordered = [...blocks];
  const [moved] = reordered.splice(fromIndex, 1);
  reordered.splice(toIndex, 0, moved);

  return reordered;
}

function InlineMarkdown({ text }: { text: string }) {
  return (
    <div className="prose prose-sm max-w-none prose-headings:scroll-mt-24 prose-a:text-primary prose-a:break-all prose-img:rounded-xl prose-img:border prose-pre:overflow-auto prose-pre:rounded-xl prose-pre:border prose-pre:bg-muted/40 prose-blockquote:border-l-primary/40 prose-table:w-full prose-th:bg-muted/40 dark:prose-invert">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          a: ({ _node, ...props }) => (
            <a
              {...props}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 underline underline-offset-2"
            />
          ),
          img: ({ _node, src, alt, ...props }) => (
            <img
              {...props}
              src={src}
              alt={alt ?? 'Imagem da wiki'}
              loading="lazy"
              className="w-full max-h-[520px] object-contain"
            />
          ),
          table: ({ _node, ...props }) => (
            <div className="overflow-x-auto rounded-xl border">
              <table {...props} />
            </div>
          ),
          code: ({ _node, inline, className: codeClassName, children, ...props }) => {
            if (inline) {
              return (
                <code
                  {...props}
                  className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs"
                >
                  {children}
                </code>
              );
            }

            return (
              <code {...props} className={codeClassName}>
                {children}
              </code>
            );
          },
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

function WikiMediaBlock({ block }: { block: WikiBlock }) {
  const url = block.url || '';
  const safeUrl = normalizeUrl(url);

  if (!safeUrl) {
    return (
      <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        URL inválida ou não informada.
      </div>
    );
  }

  if (block.type === 'image' || (block.type === 'embed' && isImageUrl(safeUrl))) {
    return (
      <figure className="overflow-hidden rounded-xl border bg-muted/20">
        <img
          src={safeUrl}
          alt="Imagem incorporada"
          className="max-h-[520px] w-full object-contain bg-background"
          loading="lazy"
        />
        <figcaption className="flex items-center justify-between gap-2 border-t bg-background/80 px-3 py-2 text-xs text-muted-foreground">
          <span>Imagem incorporada</span>
          <a
            href={safeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            Abrir fonte <ExternalLink className="h-3 w-3" />
          </a>
        </figcaption>
      </figure>
    );
  }

  const youtubeEmbedUrl = getYouTubeEmbedUrl(safeUrl);
  const vimeoEmbedUrl = getVimeoEmbedUrl(safeUrl);

  if (block.type === 'youtube' || youtubeEmbedUrl || vimeoEmbedUrl) {
    const iframeSource = youtubeEmbedUrl || vimeoEmbedUrl || safeUrl;
    return (
      <div className="overflow-hidden rounded-xl border bg-muted/20">
        <div className="aspect-video w-full">
          <iframe
            src={iframeSource}
            title="Vídeo incorporado"
            className="h-full w-full"
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      </div>
    );
  }

  if (block.type === 'video' || (block.type === 'embed' && isVideoUrl(safeUrl))) {
    return (
      <div className="overflow-hidden rounded-xl border bg-muted/20">
        <video
          controls
          className="max-h-[520px] w-full bg-black"
          src={safeUrl}
          preload="metadata"
        >
          Seu navegador não suporta vídeos incorporados.
        </video>
      </div>
    );
  }

  if (block.type === 'embed') {
    return (
      <div className="overflow-hidden rounded-xl border bg-muted/20">
        <div className="aspect-video w-full">
          <iframe
            src={safeUrl}
            title="Embed externo"
            className="h-full w-full bg-background"
            loading="lazy"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
      <a href={safeUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">
        Abrir mídia externa
      </a>
    </div>
  );
}

function WikiDatabaseViewer({ database }: { database: WikiDatabaseConfig }) {
  const [search, setSearch] = useState(database.filter || '');
  const [sortColumnId, setSortColumnId] = useState(database.sortColumnId || database.columns[0]?.id || '');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(database.sortDirection || 'asc');

  useEffect(() => {
    setSearch(database.filter || '');
    setSortColumnId(database.sortColumnId || database.columns[0]?.id || '');
    setSortDirection(database.sortDirection || 'asc');
  }, [database]);

  const visibleRows = useMemo(
    () => getFilteredAndSortedRows(database, search, sortColumnId, sortDirection),
    [database, search, sortColumnId, sortDirection]
  );

  if (database.columns.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        Tabela sem colunas.
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border bg-muted/10 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold">{database.title || 'Banco de dados'}</h4>
        <Badge variant="secondary">{visibleRows.length} registros</Badge>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div className="w-full sm:w-56">
          <Label className="mb-1 block text-xs text-muted-foreground">Filtro</Label>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar na tabela..."
            className="h-8"
          />
        </div>

        <div>
          <Label className="mb-1 block text-xs text-muted-foreground">Ordenar por</Label>
          <select
            className="h-8 rounded-md border bg-background px-2 text-sm"
            value={sortColumnId}
            onChange={(event) => setSortColumnId(event.target.value)}
          >
            {database.columns.map((column) => (
              <option key={column.id} value={column.id}>
                {column.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label className="mb-1 block text-xs text-muted-foreground">Direção</Label>
          <select
            className="h-8 rounded-md border bg-background px-2 text-sm"
            value={sortDirection}
            onChange={(event) => setSortDirection(event.target.value as 'asc' | 'desc')}
          >
            <option value="asc">Ascendente</option>
            <option value="desc">Descendente</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-background">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {database.columns.map((column) => (
                <th key={column.id} className="px-3 py-2 text-left font-medium">
                  {column.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.length > 0 ? (
              visibleRows.map((row) => (
                <tr key={row.id} className="border-t">
                  {database.columns.map((column) => (
                    <td key={`${row.id}-${column.id}`} className="px-3 py-2 align-top">
                      {row.values[column.id] || '-'}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-3 py-3 text-center text-muted-foreground" colSpan={database.columns.length}>
                  Nenhum registro encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function WikiBlockRenderer({ block }: { block: WikiBlock }) {
  switch (block.type) {
    case 'paragraph':
      return <InlineMarkdown text={block.text || ''} />;
    case 'heading1':
      return <h1 className="text-3xl font-bold tracking-tight">{block.text || 'Título H1'}</h1>;
    case 'heading2':
      return <h2 className="text-2xl font-semibold tracking-tight">{block.text || 'Título H2'}</h2>;
    case 'heading3':
      return <h3 className="text-xl font-semibold tracking-tight">{block.text || 'Título H3'}</h3>;
    case 'callout': {
      const tone = block.tone || 'info';
      const style = CALLOUT_STYLES[tone];
      return (
        <div className={cn('rounded-xl border p-4', style.className)}>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide">{style.label}</div>
          <InlineMarkdown text={block.text || ''} />
        </div>
      );
    }
    case 'toggle':
      return (
        <details className="rounded-xl border bg-muted/10 p-4" open={Boolean(block.open)}>
          <summary className="cursor-pointer select-none font-medium">{block.title || 'Detalhes'}</summary>
          <div className="mt-3">
            <InlineMarkdown text={block.body || ''} />
          </div>
        </details>
      );
    case 'checklist':
      return (
        <div className="space-y-2 rounded-xl border bg-muted/10 p-4">
          {(block.items || []).map((item) => (
            <label key={item.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={item.checked} readOnly className="h-4 w-4" />
              <span className={cn(item.checked && 'text-muted-foreground line-through')}>{item.text || '(sem texto)'}</span>
            </label>
          ))}
        </div>
      );
    case 'columns':
      return (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="rounded-xl border bg-muted/10 p-4">
            <InlineMarkdown text={block.left || ''} />
          </div>
          <div className="rounded-xl border bg-muted/10 p-4">
            <InlineMarkdown text={block.right || ''} />
          </div>
        </div>
      );
    case 'image':
    case 'video':
    case 'youtube':
    case 'embed':
      return <WikiMediaBlock block={block} />;
    case 'database':
      return <WikiDatabaseViewer database={block.database || createDefaultDatabaseConfig()} />;
    default:
      return <InlineMarkdown text={block.text || ''} />;
  }
}

interface BlockEditorFieldsProps {
  block: WikiBlock;
  isUploading: boolean;
  onUpdate: (blockId: string, updates: Partial<WikiBlock>) => void;
  onRequestUpload: (blockId: string, mediaType: 'image' | 'video') => void;
}

function BlockEditorFields({ block, isUploading, onUpdate, onRequestUpload }: BlockEditorFieldsProps) {
  switch (block.type) {
    case 'paragraph':
      return (
        <Textarea
          value={block.text || ''}
          onChange={(event) => onUpdate(block.id, { text: event.target.value })}
          placeholder="Escreva um parágrafo em markdown..."
          className="min-h-[100px]"
        />
      );

    case 'heading1':
    case 'heading2':
    case 'heading3':
      return (
        <Input
          value={block.text || ''}
          onChange={(event) => onUpdate(block.id, { text: event.target.value })}
          placeholder={`Texto do ${getBlockLabel(block.type)}`}
        />
      );

    case 'callout':
      return (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Label className="text-xs text-muted-foreground">Tipo</Label>
            <select
              className="h-8 rounded-md border bg-background px-2 text-sm"
              value={block.tone || 'info'}
              onChange={(event) => onUpdate(block.id, { tone: event.target.value as CalloutTone })}
            >
              <option value="info">Informação</option>
              <option value="warning">Atenção</option>
              <option value="success">Sucesso</option>
              <option value="error">Erro</option>
            </select>
          </div>
          <Textarea
            value={block.text || ''}
            onChange={(event) => onUpdate(block.id, { text: event.target.value })}
            placeholder="Conteúdo do callout..."
            className="min-h-[100px]"
          />
        </div>
      );

    case 'toggle':
      return (
        <div className="space-y-2">
          <Input
            value={block.title || ''}
            onChange={(event) => onUpdate(block.id, { title: event.target.value })}
            placeholder="Título do toggle"
          />
          <Textarea
            value={block.body || ''}
            onChange={(event) => onUpdate(block.id, { body: event.target.value })}
            placeholder="Conteúdo interno do toggle..."
            className="min-h-[100px]"
          />
        </div>
      );

    case 'checklist': {
      const items = block.items || [];
      return (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={item.checked}
                onChange={(event) => {
                  const nextItems = items.map((currentItem) =>
                    currentItem.id === item.id
                      ? { ...currentItem, checked: event.target.checked }
                      : currentItem
                  );
                  onUpdate(block.id, { items: nextItems });
                }}
                className="h-4 w-4"
              />
              <Input
                value={item.text}
                onChange={(event) => {
                  const nextItems = items.map((currentItem) =>
                    currentItem.id === item.id
                      ? { ...currentItem, text: event.target.value }
                      : currentItem
                  );
                  onUpdate(block.id, { items: nextItems });
                }}
                placeholder="Texto da tarefa"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  const nextItems = items.filter((currentItem) => currentItem.id !== item.id);
                  onUpdate(block.id, { items: nextItems });
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const nextItems = [...items, { id: createId(), text: '', checked: false }];
              onUpdate(block.id, { items: nextItems });
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Adicionar item
          </Button>
        </div>
      );
    }

    case 'columns':
      return (
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <Textarea
            value={block.left || ''}
            onChange={(event) => onUpdate(block.id, { left: event.target.value })}
            placeholder="Coluna esquerda..."
            className="min-h-[120px]"
          />
          <Textarea
            value={block.right || ''}
            onChange={(event) => onUpdate(block.id, { right: event.target.value })}
            placeholder="Coluna direita..."
            className="min-h-[120px]"
          />
        </div>
      );

    case 'image':
    case 'video':
    case 'youtube':
    case 'embed': {
      const placeholderMap: Record<WikiBlockType, string> = {
        paragraph: '',
        heading1: '',
        heading2: '',
        heading3: '',
        callout: '',
        toggle: '',
        checklist: '',
        columns: '',
        image: 'https://.../imagem.jpg',
        video: 'https://.../video.mp4',
        youtube: 'https://youtube.com/watch?v=...',
        embed: 'https://site.com/embed/...',
        database: '',
      };

      return (
        <div className="space-y-2">
          <Input
            value={block.url || ''}
            onChange={(event) => onUpdate(block.id, { url: event.target.value })}
            placeholder={placeholderMap[block.type]}
          />
          {(block.type === 'image' || block.type === 'video') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onRequestUpload(block.id, block.type)}
              disabled={isUploading}
            >
              <UploadCloud className="mr-2 h-4 w-4" />
              {isUploading ? 'Enviando...' : `Upload ${block.type === 'image' ? 'imagem' : 'vídeo'}`}
            </Button>
          )}
          <p className="text-xs text-muted-foreground">
            {block.type === 'youtube'
              ? 'Cole link do YouTube (watch, shorts ou youtu.be).'
              : block.type === 'embed'
                ? 'Cole URL compatível com iframe.'
                : 'Cole URL da mídia.'}
          </p>
        </div>
      );
    }

    case 'database': {
      const database = block.database || createDefaultDatabaseConfig();

      const updateDatabase = (nextDatabase: WikiDatabaseConfig) => {
        onUpdate(block.id, { database: nextDatabase });
      };

      return (
        <div className="space-y-3">
          <Input
            value={database.title}
            onChange={(event) => updateDatabase({ ...database, title: event.target.value })}
            placeholder="Nome da tabela"
          />

          <div className="rounded-lg border p-3">
            <div className="mb-2 flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Colunas</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const nextColumn: WikiDatabaseColumn = {
                    id: createId(),
                    name: `Coluna ${database.columns.length + 1}`,
                    type: 'text',
                  };
                  const nextRows = database.rows.map((row) => ({
                    ...row,
                    values: {
                      ...row.values,
                      [nextColumn.id]: '',
                    },
                  }));

                  updateDatabase({
                    ...database,
                    columns: [...database.columns, nextColumn],
                    rows: nextRows,
                    sortColumnId: database.sortColumnId || nextColumn.id,
                  });
                }}
              >
                <Plus className="mr-2 h-3.5 w-3.5" />
                Coluna
              </Button>
            </div>

            <div className="space-y-2">
              {database.columns.map((column) => (
                <div key={column.id} className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_130px_40px]">
                  <Input
                    value={column.name}
                    onChange={(event) => {
                      const nextColumns = database.columns.map((currentColumn) =>
                        currentColumn.id === column.id
                          ? { ...currentColumn, name: event.target.value }
                          : currentColumn
                      );
                      updateDatabase({ ...database, columns: nextColumns });
                    }}
                    placeholder="Nome da coluna"
                  />
                  <select
                    className="h-10 rounded-md border bg-background px-2 text-sm"
                    value={column.type}
                    onChange={(event) => {
                      const nextColumns = database.columns.map((currentColumn) =>
                        currentColumn.id === column.id
                          ? { ...currentColumn, type: event.target.value as DatabaseColumnType }
                          : currentColumn
                      );
                      updateDatabase({ ...database, columns: nextColumns });
                    }}
                  >
                    <option value="text">Texto</option>
                    <option value="number">Número</option>
                    <option value="date">Data</option>
                  </select>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      const nextColumns = database.columns.filter((currentColumn) => currentColumn.id !== column.id);
                      const nextRows = database.rows.map((row) => {
                        const nextValues = { ...row.values };
                        delete nextValues[column.id];
                        return { ...row, values: nextValues };
                      });

                      updateDatabase({
                        ...database,
                        columns: nextColumns,
                        rows: nextRows,
                        sortColumnId:
                          database.sortColumnId === column.id
                            ? nextColumns[0]?.id || ''
                            : database.sortColumnId,
                      });
                    }}
                    disabled={database.columns.length <= 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border p-3">
            <div className="mb-2 flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Linhas</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const newRow: WikiDatabaseRow = {
                    id: createId(),
                    values: database.columns.reduce<Record<string, string>>((acc, column) => {
                      acc[column.id] = '';
                      return acc;
                    }, {}),
                  };
                  updateDatabase({ ...database, rows: [...database.rows, newRow] });
                }}
              >
                <Plus className="mr-2 h-3.5 w-3.5" />
                Linha
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr>
                    {database.columns.map((column) => (
                      <th key={column.id} className="px-2 py-1 text-left text-xs font-medium text-muted-foreground">
                        {column.name}
                      </th>
                    ))}
                    <th className="px-2 py-1" />
                  </tr>
                </thead>
                <tbody>
                  {database.rows.map((row) => (
                    <tr key={row.id} className="border-t">
                      {database.columns.map((column) => (
                        <td key={`${row.id}-${column.id}`} className="px-2 py-1">
                          <Input
                            value={row.values[column.id] || ''}
                            onChange={(event) => {
                              const nextRows = database.rows.map((currentRow) =>
                                currentRow.id === row.id
                                  ? {
                                      ...currentRow,
                                      values: {
                                        ...currentRow.values,
                                        [column.id]: event.target.value,
                                      },
                                    }
                                  : currentRow
                              );
                              updateDatabase({ ...database, rows: nextRows });
                            }}
                            placeholder="Valor"
                            className="h-8"
                          />
                        </td>
                      ))}
                      <td className="px-2 py-1 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const nextRows = database.rows.filter((currentRow) => currentRow.id !== row.id);
                            updateDatabase({ ...database, rows: nextRows });
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            <div>
              <Label className="mb-1 block text-xs text-muted-foreground">Filtro inicial</Label>
              <Input
                value={database.filter}
                onChange={(event) => updateDatabase({ ...database, filter: event.target.value })}
                placeholder="Texto de busca"
              />
            </div>
            <div>
              <Label className="mb-1 block text-xs text-muted-foreground">Ordenar por</Label>
              <select
                className="h-10 w-full rounded-md border bg-background px-2 text-sm"
                value={database.sortColumnId}
                onChange={(event) => updateDatabase({ ...database, sortColumnId: event.target.value })}
              >
                {database.columns.map((column) => (
                  <option key={column.id} value={column.id}>
                    {column.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="mb-1 block text-xs text-muted-foreground">Direção</Label>
              <select
                className="h-10 w-full rounded-md border bg-background px-2 text-sm"
                value={database.sortDirection}
                onChange={(event) => updateDatabase({ ...database, sortDirection: event.target.value as 'asc' | 'desc' })}
              >
                <option value="asc">Ascendente</option>
                <option value="desc">Descendente</option>
              </select>
            </div>
          </div>
        </div>
      );
    }

    default:
      return (
        <Textarea
          value={block.text || ''}
          onChange={(event) => onUpdate(block.id, { text: event.target.value })}
          placeholder="Conteúdo do bloco"
        />
      );
  }
}

function getVersionContent(page: WikiPage, versions: WikiPageVersion[], versionValue: string): string {
  if (versionValue === 'current') {
    return page.content;
  }

  const version = versions.find((item) => String(item.version) === versionValue);
  return version?.content || '';
}

function WikiHistoryDiff({ page, versions }: { page: WikiPage; versions: WikiPageVersion[] }) {
  const [baseVersion, setBaseVersion] = useState<string>('current');
  const [compareVersion, setCompareVersion] = useState<string>('current');

  useEffect(() => {
    if (versions.length > 0) {
      setBaseVersion(String(versions[0].version));
      setCompareVersion('current');
    } else {
      setBaseVersion('current');
      setCompareVersion('current');
    }
  }, [page.id, versions]);

  const diffLines = useMemo(() => {
    const baseContent = getVersionContent(page, versions, baseVersion);
    const compareContent = getVersionContent(page, versions, compareVersion);
    return computeLineDiff(baseContent, compareContent);
  }, [page, versions, baseVersion, compareVersion]);

  return (
    <div className="space-y-3 rounded-xl border bg-muted/10 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <History className="h-4 w-4" /> Histórico e Diff Visual
        </h3>
        <Badge variant="secondary">{versions.length} versões</Badge>
      </div>

      <div className="flex flex-wrap gap-2">
        <div>
          <Label className="mb-1 block text-xs text-muted-foreground">Base</Label>
          <select
            className="h-8 rounded-md border bg-background px-2 text-sm"
            value={baseVersion}
            onChange={(event) => setBaseVersion(event.target.value)}
          >
            <option value="current">Atual</option>
            {versions.map((version) => (
              <option key={`base-${version.id}`} value={String(version.version)}>
                v{version.version} - {formatTimestamp(version.created_at)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label className="mb-1 block text-xs text-muted-foreground">Comparar com</Label>
          <select
            className="h-8 rounded-md border bg-background px-2 text-sm"
            value={compareVersion}
            onChange={(event) => setCompareVersion(event.target.value)}
          >
            <option value="current">Atual</option>
            {versions.map((version) => (
              <option key={`compare-${version.id}`} value={String(version.version)}>
                v{version.version} - {formatTimestamp(version.created_at)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="max-h-72 overflow-auto rounded-lg border bg-background font-mono text-xs">
        {diffLines.map((line, index) => (
          <div
            key={`${line.type}-${index}`}
            className={cn(
              'flex gap-2 border-b px-2 py-1 last:border-b-0',
              line.type === 'added' && 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100',
              line.type === 'removed' && 'bg-rose-50 text-rose-900 dark:bg-rose-950/30 dark:text-rose-100'
            )}
          >
            <span className="w-4 text-center">
              {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
            </span>
            <span className="whitespace-pre-wrap break-words">{line.text || ' '}</span>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Versões disponíveis</h4>
        <div className="space-y-1">
          {versions.map((version) => (
            <div key={version.id} className="rounded-md border bg-background px-3 py-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-medium">Versão {version.version}</span>
                <span className="text-muted-foreground">{formatTimestamp(version.created_at)}</span>
              </div>
              {version.comment && <p className="mt-1 text-muted-foreground">{version.comment}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function WikiEditor({ page, draft, onCancel, onSave }: WikiEditorProps) {
  const { user, organizationId } = useAuth();
  const source = page ?? draft ?? null;
  const [title, setTitle] = useState(source?.title || '');
  const [icon, setIcon] = useState(source?.icon || '');
  const [category, setCategory] = useState(source?.category || '');
  const [tags, setTags] = useState(source?.tags?.join(', ') || '');
  const [isPublished, setIsPublished] = useState(source?.is_published ?? true);
  const [showPreview, setShowPreview] = useState(false);
  const [blocks, setBlocks] = useState<WikiBlock[]>(() => buildBlocksFromSource(source));
  const [slashInput, setSlashInput] = useState('');
  const [insertAfterBlockId, setInsertAfterBlockId] = useState<string | null>(null);
  const [draggingBlockId, setDraggingBlockId] = useState<string | null>(null);
  const [uploadingBlockId, setUploadingBlockId] = useState<string | null>(null);
  const [pendingUpload, setPendingUpload] = useState<{ blockId: string; mediaType: 'image' | 'video' } | null>(null);

  const slashInputRef = useRef<HTMLInputElement | null>(null);
  const imageUploadInputRef = useRef<HTMLInputElement | null>(null);
  const videoUploadInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const nextSource = page ?? draft ?? null;
    setTitle(nextSource?.title || '');
    setIcon(nextSource?.icon || '');
    setCategory(nextSource?.category || '');
    setTags(nextSource?.tags?.join(', ') || '');
    setIsPublished(nextSource?.is_published ?? true);
    setBlocks(buildBlocksFromSource(nextSource));
    setSlashInput('');
    setInsertAfterBlockId(null);
    setDraggingBlockId(null);
  }, [page, draft]);

  const slashSearchTerm = slashInput.trim().startsWith('/')
    ? slashInput.trim().slice(1).toLowerCase()
    : '';

  const filteredCommands = useMemo(() => {
    if (!slashSearchTerm) return SLASH_COMMANDS;

    return SLASH_COMMANDS.filter((command) => {
      const haystack = `${command.label} ${command.description} ${command.keywords.join(' ')}`.toLowerCase();
      return haystack.includes(slashSearchTerm);
    });
  }, [slashSearchTerm]);

  const updateBlock = (blockId: string, updates: Partial<WikiBlock>) => {
    setBlocks((previousBlocks) =>
      previousBlocks.map((block) =>
        block.id === blockId
          ? normalizeBlock({ ...block, ...updates })
          : block
      )
    );
  };

  const insertBlockFromCommand = (command: SlashCommand) => {
    const nextBlock = createBlock(command.id);
    setBlocks((previousBlocks) => insertBlockAfter(previousBlocks, nextBlock, insertAfterBlockId));
    setInsertAfterBlockId(nextBlock.id);
    setSlashInput('');

    requestAnimationFrame(() => {
      slashInputRef.current?.focus();
    });
  };

  const duplicateBlock = (blockId: string) => {
    setBlocks((previousBlocks) => {
      const blockToDuplicate = previousBlocks.find((block) => block.id === blockId);
      if (!blockToDuplicate) return previousBlocks;

      const duplicatedBlock: WikiBlock = normalizeBlock({
        ...blockToDuplicate,
        id: createId(),
        items: blockToDuplicate.items?.map((item) => ({ ...item, id: createId() })),
        database: blockToDuplicate.database
          ? {
              ...blockToDuplicate.database,
              rows: blockToDuplicate.database.rows.map((row) => ({ id: createId(), values: { ...row.values } })),
            }
          : undefined,
      });

      return insertBlockAfter(previousBlocks, duplicatedBlock, blockId);
    });
  };

  const removeBlock = (blockId: string) => {
    setBlocks((previousBlocks) => {
      if (previousBlocks.length <= 1) {
        toast.error('A página precisa de pelo menos um bloco.');
        return previousBlocks;
      }
      return previousBlocks.filter((block) => block.id !== blockId);
    });

    if (insertAfterBlockId === blockId) {
      setInsertAfterBlockId(null);
    }
  };

  const requestUpload = (blockId: string, mediaType: 'image' | 'video') => {
    setPendingUpload({ blockId, mediaType });
    if (mediaType === 'image') {
      imageUploadInputRef.current?.click();
      return;
    }
    videoUploadInputRef.current?.click();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, mediaType: 'image' | 'video') => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file || !pendingUpload || pendingUpload.mediaType !== mediaType) {
      return;
    }

    const { blockId } = pendingUpload;
    const block = blocks.find((currentBlock) => currentBlock.id === blockId);
    if (!block) {
      setPendingUpload(null);
      return;
    }

    if (mediaType === 'image' && !file.type.startsWith('image/')) {
      toast.error('Selecione um arquivo de imagem válido.');
      setPendingUpload(null);
      return;
    }

    if (mediaType === 'video' && !file.type.startsWith('video/')) {
      toast.error('Selecione um arquivo de vídeo válido.');
      setPendingUpload(null);
      return;
    }

    if (mediaType === 'image' && file.size > MAX_IMAGE_UPLOAD_BYTES) {
      toast.error('Imagem muito grande. Limite de 15MB.');
      setPendingUpload(null);
      return;
    }

    if (mediaType === 'video' && file.size > MAX_VIDEO_UPLOAD_BYTES) {
      toast.error('Vídeo muito grande. Limite de 250MB.');
      setPendingUpload(null);
      return;
    }

    setUploadingBlockId(blockId);

    try {
      const organizationId = user?.organizationId ?? 'global';
      const userId = user?.id ?? 'anon';
      const pageSlug = buildSlug(title) || 'nova-pagina';
      const folder = mediaType === 'image' ? 'images' : 'videos';
      const path = `wiki/${organizationId}/${userId}/${pageSlug}/${folder}/${Date.now()}-${sanitizeFileName(file.name)}`;
      const uploadedUrl = await uploadFile(path, file);

      updateBlock(blockId, { url: uploadedUrl });
      toast.success(`${mediaType === 'image' ? 'Imagem' : 'Vídeo'} enviado com sucesso.`);
    } catch (_error) {
      toast.error('Não foi possível enviar o arquivo.');
    } finally {
      setPendingUpload(null);
      setUploadingBlockId(null);
    }
  };

  const handleSave = () => {
    if (!title.trim()) {
      toast.error('Título é obrigatório');
      return;
    }

    const slug = buildSlug(title);
    const markdownContent = blocksToMarkdown(blocks);
    const htmlContent = serializeBlocksDocument(blocks);

    const isE2E = typeof window !== 'undefined' && window.location.search.includes('e2e=true');
    if (isE2E) {
      console.info(
        '[E2E][WikiEditor][handleSave]',
        JSON.stringify({
          title,
          slug,
          template_id: page?.template_id ?? draft?.template_id,
          tags: tags ? tags.split(',').map((tag) => tag.trim()).filter(Boolean) : [],
          category: category || null,
          is_published: isPublished,
          blocks_count: blocks.length,
          organization_id: organizationId,
          user_id: user?.uid,
        })
      );
    }

    onSave({
      slug,
      title,
      template_id: page?.template_id ?? draft?.template_id,
      triage_order: page?.triage_order ?? draft?.triage_order,
      content: markdownContent,
      html_content: htmlContent,
      icon: icon || undefined,
      category: category || undefined,
      tags: tags ? tags.split(',').map((tag) => tag.trim()).filter(Boolean) : [],
      is_published: isPublished,
      organization_id: organizationId || 'org-1',
      created_by: user?.uid || 'user-1',
      updated_by: user?.uid || 'user-1',
      parent_id: undefined,
      view_count: page?.view_count ?? 0,
      attachments: page?.attachments ?? [],
      cover_image: page?.cover_image,
    });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b bg-background px-6 py-3">
        <div className="flex items-center gap-3">
          <Input
            placeholder="Título da página..."
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="w-64 font-semibold"
          />
          <Input
            placeholder="Emoji"
            value={icon}
            onChange={(event) => setIcon(event.target.value)}
            className="w-20 text-center text-xl"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreview((previous) => !previous)}
          >
            {showPreview ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
            {showPreview ? 'Ocultar preview' : 'Mostrar preview'}
          </Button>
          <Button variant="outline" size="sm" onClick={onCancel}>
            <X className="mr-2 h-4 w-4" />
            Cancelar
          </Button>
          <Button size="sm" onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" />
            Salvar
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <div className={cn('min-h-0 flex-1', showPreview && 'grid grid-cols-1 2xl:grid-cols-2')}>
          <div className={cn('flex min-h-0 min-w-0 flex-1 flex-col', showPreview && '2xl:border-r')}>
            <div className="relative border-b bg-muted/20 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  ref={slashInputRef}
                  value={slashInput}
                  onChange={(event) => setSlashInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && slashInput.trim().startsWith('/')) {
                      event.preventDefault();
                      const firstCommand = filteredCommands[0];
                      if (firstCommand) {
                        insertBlockFromCommand(firstCommand);
                      }
                    }
                  }}
                  placeholder="Digite / para inserir blocos com busca"
                  className="max-w-xl"
                />
                <Badge variant="secondary" className="h-9 px-3">
                  Inserção: {insertAfterBlockId ? 'após bloco selecionado' : 'no final'}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => insertBlockFromCommand(SLASH_COMMANDS[0])}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Novo parágrafo
                </Button>
              </div>

              {slashInput.trim().startsWith('/') && (
                <div className="absolute left-4 top-[56px] z-20 w-[520px] max-w-[calc(100%-2rem)] rounded-lg border bg-popover p-2 shadow-lg">
                  {filteredCommands.length > 0 ? (
                    <div className="max-h-72 overflow-auto">
                      {filteredCommands.map((command) => {
                        const Icon = command.icon;
                        return (
                          <button
                            key={command.id}
                            type="button"
                            className="flex w-full items-start gap-3 rounded-md px-3 py-2 text-left hover:bg-muted"
                            onClick={() => insertBlockFromCommand(command)}
                          >
                            <Icon className="mt-0.5 h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="text-sm font-medium">{command.label}</div>
                              <div className="text-xs text-muted-foreground">{command.description}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="px-3 py-2 text-sm text-muted-foreground">Nenhum bloco encontrado para essa busca.</div>
                  )}
                </div>
              )}

              <p className="mt-2 text-xs text-muted-foreground">
                Slash menu visual ativo. Arraste e solte blocos para reordenar.
              </p>
            </div>

            <div className="flex-1 overflow-auto p-4">
              <div className="space-y-4">
                {blocks.map((block) => (
                  <div
                    key={block.id}
                    draggable
                    onDragStart={() => setDraggingBlockId(block.id)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => {
                      if (!draggingBlockId) return;
                      setBlocks((previousBlocks) => reorderBlocks(previousBlocks, draggingBlockId, block.id));
                      setDraggingBlockId(null);
                    }}
                    onDragEnd={() => setDraggingBlockId(null)}
                    className={cn(
                      'rounded-xl border bg-background shadow-sm transition',
                      draggingBlockId === block.id && 'opacity-50'
                    )}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2">
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        <Badge variant="outline">{getBlockLabel(block.type)}</Badge>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setInsertAfterBlockId(block.id);
                            setSlashInput('/');
                            requestAnimationFrame(() => slashInputRef.current?.focus());
                          }}
                        >
                          <Plus className="mr-1 h-3.5 w-3.5" />
                          Inserir abaixo
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => duplicateBlock(block.id)}
                          title="Duplicar bloco"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeBlock(block.id)}
                          title="Excluir bloco"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="p-3">
                      <BlockEditorFields
                        block={block}
                        isUploading={uploadingBlockId === block.id}
                        onUpdate={updateBlock}
                        onRequestUpload={requestUpload}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <input
              ref={imageUploadInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => handleFileUpload(event, 'image')}
            />
            <input
              ref={videoUploadInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(event) => handleFileUpload(event, 'video')}
            />
          </div>

          {showPreview && (
            <div className="min-h-0 overflow-auto bg-muted/10 p-6">
              <h3 className="mb-3 text-sm font-medium text-muted-foreground">Pré-visualização por blocos</h3>
              <div className="space-y-4">
                {blocks.map((block) => (
                  <div key={`preview-${block.id}`} className="rounded-xl border bg-background p-4">
                    <WikiBlockRenderer block={block} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="w-80 space-y-6 overflow-auto border-l bg-muted/30 p-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="published">Publicar</Label>
            <Switch
              id="published"
              checked={isPublished}
              onCheckedChange={setIsPublished}
            />
          </div>

          <div className="space-y-2">
            <Label>Categoria</Label>
            <Input
              placeholder="Ex: Protocolos"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Tags</Label>
            <Input
              placeholder="tag1, tag2, tag3"
              value={tags}
              onChange={(event) => setTags(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">Separadas por vírgula</p>
          </div>

          {page && (
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>Criado em: {formatTimestamp(page.created_at)}</p>
              <p>Versão: {page.version}</p>
              <p>Visualizações: {page.view_count}</p>
            </div>
          )}

          <div className="text-xs text-muted-foreground">
            <p className="mb-2 font-medium">Recursos estilo Notion habilitados:</p>
            <ul className="space-y-1">
              <li><code>/</code> Slash menu com busca de blocos</li>
              <li>Drag-and-drop para reordenar</li>
              <li>Callout, Toggle, Checklist e Colunas</li>
              <li>Tabela embutida com filtro e sort</li>
              <li>Mídia: imagem, vídeo, YouTube, embed</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * WikiPageViewer - Visualizador de página wiki
 * Renderiza blocos e habilita comentários inline + histórico com diff.
 */
export function WikiPageViewer({
  page,
  onEdit,
}: {
  page: WikiPage;
  onEdit: () => void;
}) {
  const { user, organizationId } = useAuth();
  const queryClient = useQueryClient();

  const blocks = useMemo(() => buildBlocksFromPage(page), [page]);

  const { data: comments = [] } = useQuery({
    queryKey: ['wiki-comments', user?.organizationId, page.id],
    queryFn: () => (user?.organizationId ? wikiService.listComments(user.organizationId, page.id) : Promise.resolve([])),
    enabled: !!user?.organizationId && !!page.id,
  });

  const { data: versions = [] } = useQuery({
    queryKey: ['wiki-versions', user?.organizationId, page.id],
    queryFn: () => (user?.organizationId ? wikiService.listPageVersions(user.organizationId, page.id) : Promise.resolve([])),
    enabled: !!user?.organizationId && !!page.id,
  });

  const [activeCommentBlockId, setActiveCommentBlockId] = useState<string | null>(null);
  const [commentDraftsByBlock, setCommentDraftsByBlock] = useState<Record<string, string>>({});
  const [selectedTextByBlock, setSelectedTextByBlock] = useState<Record<string, BlockTextSelection>>({});
  const blockContentRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    setActiveCommentBlockId(null);
    setCommentDraftsByBlock({});
    setSelectedTextByBlock({});
  }, [page.id]);

  const commentsByBlock = useMemo(() => {
    return comments.reduce<Record<string, WikiComment[]>>((acc, comment) => {
      const blockId = comment.block_id || 'general';
      if (!acc[blockId]) {
        acc[blockId] = [];
      }
      acc[blockId].push(comment);
      return acc;
    }, {});
  }, [comments]);

  const handleCaptureSelection = (blockId: string) => {
    const container = blockContentRefs.current[blockId];
    if (!container) return;

    const selection = getSelectionWithinElement(container);
    setSelectedTextByBlock((currentSelections) => {
      const nextSelections = { ...currentSelections };
      if (selection) {
        nextSelections[blockId] = selection;
      } else {
        delete nextSelections[blockId];
      }
      return nextSelections;
    });
  };

  const handleSubmitInlineComment = async (block: WikiBlock) => {
    if (!user?.organizationId || !user.id) {
      toast.error('Usuário sem organização válida para comentar.');
      return;
    }

    const draft = (commentDraftsByBlock[block.id] || '').trim();
    if (!draft) {
      toast.error('Digite um comentário antes de enviar.');
      return;
    }
    const selectedRange = selectedTextByBlock[block.id];

    try {
      await wikiService.addComment(user.organizationId, {
        page_id: page.id,
        parent_comment_id: undefined,
        content: draft,
        created_by: user.id,
        block_id: block.id,
        selection_text: selectedRange?.text || getBlockExcerpt(block),
        selection_start: selectedRange?.start,
        selection_end: selectedRange?.end,
        resolved: false,
      });

      setCommentDraftsByBlock((currentDrafts) => ({
        ...currentDrafts,
        [block.id]: '',
      }));
      setSelectedTextByBlock((currentSelections) => {
        const nextSelections = { ...currentSelections };
        delete nextSelections[block.id];
        return nextSelections;
      });
      setActiveCommentBlockId(null);

      await queryClient.invalidateQueries({ queryKey: ['wiki-comments', user.organizationId, page.id] });
      toast.success('Comentário inline adicionado.');
    } catch (error) {
      console.error('Erro ao adicionar comentário inline:', error);
      toast.error('Não foi possível adicionar o comentário.');
    }
  };

  return (
    <div className="mx-auto max-w-5xl p-8">
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            {page.icon && <span className="mb-4 block text-6xl">{page.icon}</span>}
            <h1 className="mb-2 text-4xl font-bold">{page.title}</h1>
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

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>Última atualização: {formatTimestamp(page.updated_at)}</span>
          <span>•</span>
          <span>{page.view_count} visualizações</span>
        </div>
      </div>

      <div className="space-y-4">
        {blocks.map((block) => {
          const blockComments = commentsByBlock[block.id] || [];
          const isCommenting = activeCommentBlockId === block.id;
          const selectedRange = selectedTextByBlock[block.id];

          return (
            <div key={block.id} className="group rounded-xl border bg-background shadow-sm">
              <div className="flex items-center justify-between border-b px-3 py-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{getBlockLabel(block.type)}</Badge>
                  {blockComments.length > 0 && (
                    <Badge variant="secondary" className="gap-1">
                      <MessageSquare className="h-3 w-3" />
                      {blockComments.length}
                    </Badge>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveCommentBlockId((currentValue) => (currentValue === block.id ? null : block.id))}
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Comentar trecho
                </Button>
              </div>

              <div
                ref={(element) => {
                  blockContentRefs.current[block.id] = element;
                }}
                onMouseUp={() => handleCaptureSelection(block.id)}
                onTouchEnd={() => handleCaptureSelection(block.id)}
                onKeyUp={() => handleCaptureSelection(block.id)}
                className="p-4"
              >
                <WikiBlockRenderer block={block} />
              </div>

              {isCommenting && (
                <div className="border-t bg-muted/20 p-3">
                  <Label className="mb-2 block text-xs text-muted-foreground">
                    Trecho: {selectedRange?.text || getBlockExcerpt(block) || 'Bloco sem texto'}
                  </Label>
                  {selectedRange && (
                    <p className="mb-2 text-[11px] text-muted-foreground">
                      Offsets no bloco: {selectedRange.start} - {selectedRange.end}
                    </p>
                  )}
                  <Textarea
                    value={commentDraftsByBlock[block.id] || ''}
                    onChange={(event) => {
                      const nextDraft = event.target.value;
                      setCommentDraftsByBlock((currentDrafts) => ({
                        ...currentDrafts,
                        [block.id]: nextDraft,
                      }));
                    }}
                    placeholder="Escreva seu comentário inline..."
                    className="min-h-[86px]"
                  />
                  <div className="mt-2 flex items-center justify-end gap-2">
                    {selectedRange && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedTextByBlock((currentSelections) => {
                            const nextSelections = { ...currentSelections };
                            delete nextSelections[block.id];
                            return nextSelections;
                          });
                        }}
                      >
                        Limpar seleção
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => setActiveCommentBlockId(null)}>
                      Cancelar
                    </Button>
                    <Button size="sm" onClick={() => handleSubmitInlineComment(block)}>
                      Salvar comentário
                    </Button>
                  </div>
                </div>
              )}

              {blockComments.length > 0 && (
                <div className="space-y-2 border-t bg-muted/10 p-3">
                  {blockComments.map((comment) => (
                    <div key={comment.id} className="rounded-md border bg-background px-3 py-2 text-xs">
                      {comment.selection_text && (
                        <p className="mb-1 line-clamp-2 text-muted-foreground">
                          Trecho: {comment.selection_text}
                        </p>
                      )}
                      <p className="whitespace-pre-wrap">{comment.content}</p>
                      {typeof comment.selection_start === 'number' && typeof comment.selection_end === 'number' && (
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          Offsets: {comment.selection_start} - {comment.selection_end}
                        </p>
                      )}
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {formatTimestamp(comment.created_at)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {page.tags.length > 0 && (
        <div className="mt-8 border-t pt-8">
          <div className="flex flex-wrap gap-2">
            {page.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8">
        <WikiHistoryDiff page={page} versions={versions} />
      </div>
    </div>
  );
}
