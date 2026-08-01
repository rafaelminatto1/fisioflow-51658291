import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Archive,
  BookOpen,
  ChevronRight,
  Clock3,
  FilePlus2,
  FileText,
  FolderHeart,
  LayoutTemplate,
  LockKeyhole,
  Search,
  Share2,
  Star,
  UsersRound,
} from 'lucide-react';

import type { NoteKind, NoteListItem, NotesHomeProps, NotesHomeViewModel } from './types';

const filterItems: Array<{
  id: NonNullable<NotesHomeViewModel['activeFilter']>;
  label: string;
  icon: typeof Clock3;
}> = [
  { id: 'all', label: 'Todas as notas', icon: BookOpen },
  { id: 'recent', label: 'Recentes', icon: Clock3 },
  { id: 'shared', label: 'Compartilhadas', icon: Share2 },
  { id: 'favorites', label: 'Favoritas', icon: Star },
  { id: 'patient', label: 'Notas de pacientes', icon: FolderHeart },
  { id: 'templates', label: 'Templates', icon: LayoutTemplate },
  { id: 'archived', label: 'Arquivadas', icon: Archive },
];

const noteKindLabel: Record<NoteKind, string> = {
  'clinical-context': 'Contexto clínico',
  team: 'Equipe',
  meeting: 'Reunião',
  knowledge: 'Conhecimento',
  operational: 'Operacional',
  private: 'Pessoal',
};

export function NotesHome({
  viewModel,
  compact = false,
  selectedNoteId,
  onChangeFilter,
  onCreateNote,
  onReturnToSystem,
  onSearch,
  onSelectNote,
  onSelectSpace,
  onToggleFavorite,
}: NotesHomeProps) {
  const [query, setQuery] = useState('');
  const visibleNotes = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('pt-BR');
    if (!normalized) return viewModel.notes;

    return viewModel.notes.filter((note) =>
      [note.title, note.preview, note.patientName, note.authorName]
        .filter(Boolean)
        .some((value) => value?.toLocaleLowerCase('pt-BR').includes(normalized))
    );
  }, [query, viewModel.notes]);

  function handleSearch(value: string) {
    setQuery(value);
    onSearch?.(value);
  }

  if (compact) {
    return (
      <section
        className="flex h-full min-h-0 flex-col bg-card text-foreground"
        aria-label="Navegador de notas"
      >
        <div className="border-b border-border px-4 py-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className="grid size-8 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                <BookOpen className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  FisioFlow
                </p>
                <h1 className="truncate font-display text-lg font-bold tracking-tight">Notas</h1>
              </div>
            </div>
            <button
              type="button"
              onClick={onCreateNote}
              className="grid size-8 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground transition hover:bg-primary/90"
              aria-label="Criar nova nota"
            >
              <FilePlus2 className="size-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={onReturnToSystem}
            className="mb-3 inline-flex items-center gap-1.5 rounded-md px-1 py-1 text-xs font-semibold text-muted-foreground transition hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <ArrowLeft className="size-3.5" />
            Voltar ao FisioFlow
          </button>
          <label className="relative block">
            <span className="sr-only">Pesquisar notas</span>
            <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => handleSearch(event.target.value)}
              placeholder="Buscar notas..."
              className="h-9 w-full rounded-md border border-input bg-background pr-3 pl-9 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/20"
            />
          </label>
        </div>
        <nav
          aria-label="Filtros de notas"
          className="flex gap-1 overflow-x-auto border-b border-border px-3 py-2 lg:block lg:space-y-0.5 lg:overflow-visible"
        >
          {filterItems.map((item) => {
            const Icon = item.icon;
            const active = (viewModel.activeFilter ?? 'all') === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onChangeFilter?.(item.id)}
                className={`flex shrink-0 items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs font-semibold transition lg:w-full ${active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
              >
                <Icon className="size-3.5" />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <div className="mb-2 flex items-center justify-between px-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              {query ? 'Resultados' : 'Recentes'}
            </p>
            <span className="text-[11px] tabular-nums text-muted-foreground">
              {visibleNotes.length}
            </span>
          </div>
          <div className="space-y-1">
            {visibleNotes.map((note) => (
              <button
                key={note.id}
                type="button"
                onClick={() => onSelectNote?.(note.id)}
                className={`group flex w-full items-start gap-2.5 rounded-md px-2.5 py-2.5 text-left transition ${selectedNoteId === note.id ? 'bg-primary/10 text-foreground ring-1 ring-primary/15' : 'hover:bg-muted/70'}`}
              >
                <span
                  className={`mt-1 size-2 shrink-0 rounded-full ${note.kind === 'clinical-context' ? 'bg-blue-500' : note.kind === 'team' ? 'bg-emerald-500' : note.kind === 'knowledge' ? 'bg-amber-500' : 'bg-muted-foreground/40'}`}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-semibold">
                      {note.title || 'Sem título'}
                    </span>
                    {note.isFavorite ? (
                      <Star className="size-3 shrink-0 fill-amber-400 text-amber-400" />
                    ) : null}
                  </span>
                  <span className="mt-0.5 block line-clamp-1 text-xs text-muted-foreground">
                    {note.preview || 'Nota sem conteúdo ainda.'}
                  </span>
                  <span className="mt-1 block text-[10px] text-muted-foreground">
                    {note.updatedLabel}
                    {note.patientName ? ` · ${note.patientName}` : ''}
                  </span>
                </span>
              </button>
            ))}
            {!visibleNotes.length ? (
              <div className="px-2 py-8 text-center">
                <p className="text-xs text-muted-foreground">Nenhuma nota encontrada.</p>
                <button
                  type="button"
                  onClick={onCreateNote}
                  className="mt-3 rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground transition hover:bg-primary/90"
                >
                  Criar nota
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-full bg-background text-foreground" aria-label="Central de notas">
      <div className="mx-auto grid min-h-full max-w-[1600px] grid-cols-1 xl:grid-cols-[252px_minmax(0,1fr)]">
        <aside className="border-b border-border bg-card px-4 py-5 xl:border-r xl:border-b-0">
          <button
            type="button"
            onClick={onReturnToSystem}
            className="mb-5 inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-bold text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <ArrowLeft className="size-3.5" />
            Voltar ao FisioFlow
          </button>
          <div className="mb-7 flex items-center justify-between gap-3 px-2">
            <div>
              <p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">
                FisioFlow
              </p>
              <h1 className="font-display text-xl font-bold tracking-tight">Notas</h1>
            </div>
            <span
              className="grid size-9 place-items-center rounded-lg bg-accent/15 text-accent"
              aria-hidden="true"
            >
              <BookOpen className="size-4" />
            </span>
          </div>

          <button
            type="button"
            onClick={onCreateNote}
            className="mb-6 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <FilePlus2 className="size-4" />
            Nova nota
          </button>

          <nav aria-label="Filtros de notas" className="space-y-1">
            {filterItems.map((item) => {
              const Icon = item.icon;
              const active = (viewModel.activeFilter ?? 'all') === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onChangeFilter?.(item.id)}
                  className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-semibold transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${
                    active
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <Icon className="size-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="mt-8 border-t border-border pt-5">
            <div className="mb-2 flex items-center justify-between px-3">
              <p className="text-xs font-bold tracking-[0.12em] text-muted-foreground uppercase">
                Espaços
              </p>
              <span className="text-[10px] text-muted-foreground">{viewModel.spaces.length}</span>
            </div>
            <div className="space-y-1">
              {viewModel.spaces.map((space) => {
                const active = space.id === viewModel.activeSpaceId;
                return (
                  <button
                    key={space.id}
                    type="button"
                    onClick={() => onSelectSpace?.(space.id)}
                    className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${
                      active
                        ? 'bg-muted font-bold text-foreground'
                        : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                    }`}
                  >
                    <span
                      className={`grid size-6 place-items-center rounded-sm ${space.accent === 'accent' ? 'bg-accent/15 text-accent' : space.accent === 'primary' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}
                    >
                      {space.icon ?? <FileText className="size-3.5" />}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{space.name}</span>
                    {space.count !== undefined ? (
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {space.count}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-8 rounded-lg border border-primary/15 bg-primary/[0.035] p-3">
            <div className="mb-2 flex items-center gap-2 text-primary">
              <UsersRound className="size-4" />
              <span className="text-sm font-bold">Trabalho conectado</span>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Mencione pacientes, tarefas e colegas sem tirar o contexto do lugar.
            </p>
          </div>
        </aside>

        <main className="min-w-0 px-5 py-6 sm:px-8 lg:px-10">
          <header className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                <span>{viewModel.workspaceName}</span>
                <ChevronRight className="size-3.5" />
                <span>Central de notas</span>
              </div>
              <h2 className="font-display text-3xl font-bold tracking-tight">
                Pensar junto, cuidar melhor.
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Notas, decisões e contexto da equipe — conectados ao cuidado sem se confundirem com
                o prontuário oficial.
              </p>
            </div>

            <label className="relative block w-full max-w-md lg:w-80">
              <span className="sr-only">Pesquisar notas</span>
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => handleSearch(event.target.value)}
                placeholder="Buscar notas no seu espaço..."
                className="h-11 w-full rounded-md border border-input bg-card pr-4 pl-10 text-sm shadow-xs outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/20"
              />
            </label>
          </header>

          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold">{query ? 'Resultados' : 'Em movimento'}</p>
              <p className="text-xs text-muted-foreground">
                {visibleNotes.length} notas no seu contexto atual
              </p>
            </div>
            <button
              type="button"
              onClick={() => onChangeFilter?.('archived')}
              className="hidden items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground sm:flex"
            >
              Arquivadas
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
            {visibleNotes.map((note) => (
              <NotePreviewCard
                key={note.id}
                note={note}
                onOpen={onSelectNote}
                onToggleFavorite={onToggleFavorite}
              />
            ))}
          </div>

          {visibleNotes.length === 0 ? (
            <div className="mt-4 rounded-lg border border-dashed border-border bg-card p-10 text-center">
              <Search className="mx-auto mb-3 size-5 text-muted-foreground" />
              <p className="font-bold">Nenhuma nota encontrada</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Tente outro termo ou crie uma nova nota.
              </p>
              <button
                type="button"
                onClick={onCreateNote}
                className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition hover:bg-primary/90"
              >
                Nova nota
              </button>
            </div>
          ) : null}
        </main>
      </div>
    </section>
  );
}

export function NotePreviewCard({
  note,
  onOpen,
  onToggleFavorite,
}: {
  note: NoteListItem;
  onOpen?: (noteId: string) => void;
  onToggleFavorite?: (noteId: string) => void;
}) {
  const isRestricted = note.visibility === 'restricted' || note.visibility === 'private';

  return (
    <article className="group relative rounded-lg border border-border bg-card p-4 shadow-xs transition duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={`inline-flex rounded-sm px-2 py-1 text-[11px] font-bold ${note.kind === 'clinical-context' ? 'bg-accent/15 text-accent-foreground' : 'bg-muted text-muted-foreground'}`}
          >
            {noteKindLabel[note.kind]}
          </span>
          {isRestricted ? (
            <LockKeyhole
              className="size-3.5 shrink-0 text-muted-foreground"
              aria-label="Nota restrita"
            />
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onToggleFavorite?.(note.id)}
            className={`rounded-sm p-1.5 transition hover:bg-muted ${note.isFavorite ? 'text-amber-500' : 'text-muted-foreground'}`}
            aria-label={note.isFavorite ? 'Remover das favoritas' : 'Adicionar às favoritas'}
          >
            <Star className={`size-4 ${note.isFavorite ? 'fill-current' : ''}`} />
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onOpen?.(note.id)}
        className="block w-full text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <h3 className="font-display line-clamp-2 text-lg font-bold tracking-tight">{note.title}</h3>
        {note.preview ? (
          <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-relaxed text-muted-foreground">
            {note.preview}
          </p>
        ) : (
          <div className="mt-2 min-h-10" />
        )}
      </button>

      <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border pt-3 text-xs text-muted-foreground">
        {note.patientName ? (
          <span className="font-semibold text-foreground/75">{note.patientName}</span>
        ) : null}
        {note.taskCount ? <span>{note.taskCount} tarefas</span> : null}
        {note.commentCount ? <span>{note.commentCount} comentários</span> : null}
        <span className="ml-auto">{note.updatedLabel}</span>
      </div>

      <span className="pointer-events-none absolute right-4 bottom-4 opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100">
        <ChevronRight className="size-4 text-primary" />
      </span>
    </article>
  );
}
