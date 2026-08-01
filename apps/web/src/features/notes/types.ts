import type { ReactNode } from 'react';

export type NoteKind =
  | 'clinical-context'
  | 'team'
  | 'meeting'
  | 'knowledge'
  | 'operational'
  | 'private';

export type NoteVisibility = 'private' | 'restricted' | 'team' | 'organization';

export type NoteStatus = 'draft' | 'active' | 'archived';

export type NotePermission = 'view' | 'comment' | 'edit' | 'manage';

export interface NotesSpace {
  id: string;
  name: string;
  icon?: ReactNode;
  count?: number;
  accent?: 'primary' | 'accent' | 'muted';
}

export interface NoteListItem {
  id: string;
  title: string;
  preview?: string;
  kind: NoteKind;
  status: NoteStatus;
  updatedLabel: string;
  updatedAt?: string;
  authorName?: string;
  authorInitials?: string;
  spaceId?: string;
  patientName?: string;
  taskCount?: number;
  commentCount?: number;
  visibility: NoteVisibility;
  isFavorite?: boolean;
  isSharedWithMe?: boolean;
}

export interface NotePerson {
  id: string;
  name: string;
  initials: string;
  role?: string;
  avatarUrl?: string;
  permission?: NotePermission;
}

export interface NoteLinkedTask {
  id: string;
  title: string;
  status: 'todo' | 'in-progress' | 'done' | 'archived';
  dueLabel?: string;
  assignee?: NotePerson;
}

export interface NoteBacklink {
  id: string;
  title: string;
  description?: string;
  kind: 'note' | 'patient' | 'appointment' | 'task' | 'protocol';
}

export interface NoteMention {
  id: string;
  label: string;
  type: 'patient' | 'member' | 'task' | 'appointment' | 'note';
}

export interface NoteBlockViewModel {
  id: string;
  type: 'paragraph' | 'heading' | 'checklist' | 'callout' | 'divider' | 'attachment';
  content?: ReactNode;
  checked?: boolean;
}

export interface NotesHomeViewModel {
  workspaceName: string;
  spaces: NotesSpace[];
  notes: NoteListItem[];
  activeSpaceId?: string;
  activeFilter?: 'all' | 'recent' | 'shared' | 'favorites' | 'patient' | 'templates' | 'archived';
  currentUser?: NotePerson;
}

export interface NotesHomeProps {
  viewModel: NotesHomeViewModel;
  compact?: boolean;
  selectedNoteId?: string;
  onCreateNote?: () => void;
  onReturnToSystem?: () => void;
  onSelectNote?: (noteId: string) => void;
  onSelectSpace?: (spaceId: string) => void;
  onChangeFilter?: (filter: NonNullable<NotesHomeViewModel['activeFilter']>) => void;
  onSearch?: (query: string) => void;
  onToggleFavorite?: (noteId: string) => void;
}

export interface NoteEditorViewModel {
  id: string;
  title: string;
  emoji?: string;
  kind: NoteKind;
  status: NoteStatus;
  visibility: NoteVisibility;
  savedLabel: string;
  breadcrumbs: string[];
  blocks: NoteBlockViewModel[];
  /** Editor TipTap/Yjs injetado pela aplicação principal. */
  editorContent?: ReactNode;
  patient?: {
    id: string;
    name: string;
    details?: string;
    nextAppointmentLabel?: string;
  };
  collaborators: NotePerson[];
  linkedTasks: NoteLinkedTask[];
  backlinks: NoteBacklink[];
  mentions?: NoteMention[];
  commentCount?: number;
  versionLabel?: string;
}

export interface NoteEditorProps {
  viewModel: NoteEditorViewModel;
  onTitleChange?: (title: string) => void;
  onReturnToSystem?: () => void;
  onShare?: () => void;
  onOpenPatient?: (patientId: string) => void;
  onOpenTask?: (taskId: string) => void;
  onOpenBacklink?: (backlinkId: string) => void;
  onToggleTask?: (taskId: string, nextStatus: NoteLinkedTask['status']) => void;
  onCreateTask?: () => void;
  onOpenComments?: () => void;
  onOpenHistory?: () => void;
  onInsert?: (command: 'mention' | 'task' | 'attachment' | 'template', file?: File) => void;
}
