/**
 * Wiki / Knowledge Base Types
 * Sistema de documentação colaborativa estilo Notion
 */

import { Timestamp } from '@/integrations/firebase/app';

/**
 * Página da Wiki
 */
export interface WikiPage {
  id: string;
  slug: string;                    // URL-friendly, único por organização
  title: string;
  content: string;                 // Markdown
  html_content?: string;           // Renderizado (cache para performance)
  parent_id?: string;              // Hierarquia: página pai
  organization_id: string;
  created_by: string;
  updated_by: string;
  tags: string[];
  category?: string;
  is_published: boolean;
  view_count: number;
  attachments: WikiAttachment[];
  icon?: string;                   // Emoji para ícone da página
  cover_image?: string;            // URL da imagem de capa
  created_at: Timestamp;
  updated_at: Timestamp;
  version: number;                 // Versão atual
  deleted_at?: Timestamp;
}

/**
 * Histórico de versões de uma página
 */
export interface WikiPageVersion {
  id: string;
  page_id: string;
  content: string;
  title: string;                   // Título naquela versão
  created_by: string;
  created_at: Timestamp;
  version: number;
  comment?: string;                // Mensagem de commit ("Correção de ortografia")
  changes?: VersionChange[];       // Diff summary
}

/**
 * Mudança em uma versão
 */
export interface VersionChange {
  type: 'added' | 'modified' | 'deleted';
  section?: string;                // Seção alterada (opcional)
  lines?: number;                  // Quantidade de linhas alteradas
}

/**
 * Comentário em uma página wiki
 */
export interface WikiComment {
  id: string;
  page_id: string;
  parent_comment_id?: string;      // Para respostas aninhadas
  content: string;
  created_by: string;
  created_at: Timestamp;
  updated_at?: Timestamp;
  deleted_at?: Timestamp;
  resolved?: boolean;
}

/**
 * Attachment em uma página wiki
 */
export interface WikiAttachment {
  id: string;
  name: string;
  type: 'image' | 'video' | 'document' | 'link';
  url: string;
  size_bytes?: number;
  uploaded_by: string;
  uploaded_at: Timestamp;
}

/**
 * Categoria/Folder de páginas wiki
 */
export interface WikiCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;                  // Hex color
  organization_id: string;
  parent_id?: string;              // Subcategorias
  order_index: number;
  created_at: Timestamp;
}

/**
 * Template de página wiki
 */
export interface WikiTemplate {
  id: string;
  name: string;
  description?: string;
  content: string;                 // Markdown com placeholders {{variable}}
  category?: string;
  organization_id?: string;        // null = template global
  icon?: string;
  variables: TemplateVariable[];
  created_by: string;
  created_at: Timestamp;
}

/**
 * Variável de template
 */
export interface TemplateVariable {
  name: string;                    // {{patient_name}}
  label: string;                   // "Nome do Paciente"
  type: 'text' | 'textarea' | 'date' | 'select';
  options?: string[];              // Para type='select'
  default?: string;
  required: boolean;
}

/**
 * Resultado de busca wiki
 */
export interface WikiSearchResult {
  page: WikiPage;
  snippet: string;                 // Trecho com highlight
  relevance_score: number;
  matched_terms: string[];
}

/**
 * Párvore de páginas para sidebar
 */
export interface WikiPageTree {
  page: WikiPage;
  children: WikiPageTree[];
  level: number;
}

/**
 * Permissões de wiki
 */
export interface WikiPermissions {
  can_read: boolean;
  can_write: boolean;
  can_delete: boolean;
  can_comment: boolean;
  can_manage: boolean;
}

/**
 * Estatísticas de uso da wiki
 */
export interface WikiStats {
  total_pages: number;
  total_views: number;
  most_viewed: WikiPage[];
  recent_edits: WikiPage[];
  categories_count: number;
}
