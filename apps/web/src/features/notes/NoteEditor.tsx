import { useRef, useState } from 'react';
import {
  ArrowLeft,
  AtSign,
  Bold,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Circle,
  Clock3,
  FileText,
  History,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListChecks,
  ListTree,
  LockKeyhole,
  MessageCircle,
  Paperclip,
  Plus,
  Quote,
  Share2,
  Sparkles,
  Tags,
  TableProperties,
  UsersRound,
} from 'lucide-react';

import type { NoteBlockViewModel, NoteEditorProps, NoteLinkedTask, NotePermission } from './types';

const permissionText: Record<NotePermission, string> = {
  view: 'Pode visualizar',
  comment: 'Pode comentar',
  edit: 'Pode editar',
  manage: 'Gerencia o acesso',
};

const taskStyles: Record<NoteLinkedTask['status'], string> = {
  todo: 'border-muted-foreground/40 text-muted-foreground',
  'in-progress': 'border-primary bg-primary/5 text-primary',
  done: 'border-accent/40 bg-accent/10 text-accent-foreground',
  archived: 'border-border bg-muted text-muted-foreground',
};

const kindLabel: Record<NoteBlockViewModel['type'] | NoteEditorProps['viewModel']['kind'], string> =
  {
    paragraph: 'Texto',
    heading: 'Título',
    checklist: 'Checklist',
    callout: 'Destaque',
    divider: 'Separador',
    attachment: 'Anexo',
    'clinical-context': 'Contexto clínico',
    team: 'Equipe',
    meeting: 'Reunião',
    knowledge: 'Conhecimento',
    operational: 'Operacional',
    private: 'Pessoal',
  };

export function NoteEditor({
  viewModel,
  onCreateTask,
  onInsert,
  onOpenBacklink,
  onOpenComments,
  onOpenHistory,
  onOpenPatient,
  onOpenTask,
  onReturnToSystem,
  onShare,
  onTitleChange,
  onToggleTask,
}: NoteEditorProps) {
  const [isContextOpen, setIsContextOpen] = useState(true);
  const [contextTab, setContextTab] = useState<
    'overview' | 'outline' | 'links' | 'tasks' | 'access'
  >('overview');
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const isRestricted = viewModel.visibility === 'restricted' || viewModel.visibility === 'private';

  return (
    <section
      className="min-h-full overflow-hidden bg-background text-foreground"
      aria-label="Editor de nota"
    >
      <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between gap-3 border-b border-border bg-card/95 px-4 backdrop-blur sm:px-6">
        <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
          <button
            type="button"
            onClick={onReturnToSystem}
            className="inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-2 font-semibold transition hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            aria-label="Voltar ao FisioFlow"
          >
            <ArrowLeft className="size-4" />
            <span className="hidden lg:inline">Voltar</span>
          </button>
          <FileText className="size-4 shrink-0 text-primary" />
          <span className="hidden sm:inline">Notas</span>
          {viewModel.breadcrumbs.map((crumb) => (
            <span key={crumb} className="flex min-w-0 items-center gap-2">
              <ChevronRight className="size-3.5 shrink-0" />
              <span className="truncate">{crumb}</span>
            </span>
          ))}
        </div>
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <span className="mr-1 hidden items-center gap-1.5 text-xs font-semibold text-muted-foreground md:flex">
            <span className="size-2 rounded-full bg-accent animate-pulse-subtle" />
            {viewModel.savedLabel}
          </span>
          <button
            type="button"
            onClick={onOpenHistory}
            className="rounded-md p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label="Abrir histórico de versões"
          >
            <History className="size-4" />
          </button>
          <button
            type="button"
            onClick={onOpenComments}
            className="relative rounded-md p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label="Abrir comentários"
          >
            <MessageCircle className="size-4" />
            {viewModel.commentCount ? (
              <span className="absolute -top-0.5 -right-0.5 grid size-4 place-items-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                {viewModel.commentCount}
              </span>
            ) : null}
          </button>
          <button
            type="button"
            onClick={onShare}
            className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-bold text-primary-foreground transition hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <Share2 className="size-4" />
            <span className="hidden sm:inline">Compartilhar</span>
          </button>
        </div>
      </header>

      <div
        className={`grid min-h-[calc(100vh-4rem)] grid-cols-1 ${isContextOpen ? '2xl:grid-cols-[minmax(0,1fr)_336px]' : ''}`}
      >
        <main className="min-w-0 px-5 py-8 sm:px-10 lg:px-[clamp(2.5rem,8vw,9rem)] xl:py-12">
          <div className="mx-auto max-w-3xl">
            <div className="mb-6 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-sm bg-accent/15 px-2.5 py-1 text-xs font-bold text-accent-foreground">
                <Sparkles className="size-3.5" />
                Nota colaborativa
              </span>
              {isRestricted ? (
                <span className="inline-flex items-center gap-1.5 rounded-sm bg-muted px-2.5 py-1 text-xs font-bold text-muted-foreground">
                  <LockKeyhole className="size-3.5" />
                  {viewModel.visibility === 'private' ? 'Somente você' : 'Acesso restrito'}
                </span>
              ) : null}
              <span className="text-xs text-muted-foreground">
                Não substitui a evolução clínica oficial
              </span>
            </div>

            <div className="mb-5 flex items-start gap-3">
              <span
                className="mt-1 text-4xl leading-none sm:text-5xl"
                role="img"
                aria-label="Ícone da nota"
              >
                {viewModel.emoji ?? '📝'}
              </span>
              <label className="min-w-0 flex-1">
                <span className="sr-only">Título da nota</span>
                <input
                  value={viewModel.title}
                  onChange={(event) => onTitleChange?.(event.target.value)}
                  className="w-full border-0 bg-transparent p-0 font-display text-3xl font-bold tracking-tight outline-none placeholder:text-muted-foreground focus:ring-0 sm:text-4xl"
                  placeholder="Título sem título"
                />
              </label>
            </div>

            <div className="mb-7 flex flex-wrap items-center gap-1.5 border-y border-border/80 py-2 text-xs text-muted-foreground">
              <PropertyPill icon={CircleDot} label={kindLabel[viewModel.kind]} />
              <PropertyPill
                icon={CheckCircle2}
                label={
                  viewModel.status === 'draft'
                    ? 'Rascunho'
                    : viewModel.status === 'archived'
                      ? 'Arquivada'
                      : 'Ativa'
                }
              />
              <PropertyPill
                icon={isRestricted ? LockKeyhole : UsersRound}
                label={isRestricted ? 'Acesso restrito' : 'Equipe'}
              />
              {viewModel.patient ? (
                <PropertyPill icon={CalendarDays} label={viewModel.patient.name} tone="patient" />
              ) : null}
              <span className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1.5 font-semibold text-muted-foreground">
                <Tags className="size-3.5" />
                Propriedades
              </span>
            </div>

            {viewModel.editorContent ? (
              <div className="mt-6" aria-label="Conteúdo da nota">
                {viewModel.editorContent}
              </div>
            ) : (
              <>
                <EditorToolbar onInsert={onInsert} attachmentInputRef={attachmentInputRef} />
                <input
                  ref={attachmentInputRef}
                  type="file"
                  className="sr-only"
                  accept="application/pdf,image/jpeg,image/png,image/webp,text/plain,.docx"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) onInsert?.('attachment', file);
                    event.currentTarget.value = '';
                  }}
                />
                <div className="mt-8 space-y-4" aria-label="Conteúdo da nota">
                  {viewModel.blocks.map((block) => (
                    <NoteBlock key={block.id} block={block} />
                  ))}
                </div>
              </>
            )}

            <div className="mt-9 border-t border-dashed border-border pt-5">
              <button
                type="button"
                onClick={() => onInsert?.('template')}
                className="inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <Plus className="size-4" />
                Digite{' '}
                <kbd className="rounded border border-border bg-card px-1.5 py-0.5 text-xs">
                  /
                </kbd>{' '}
                para inserir um bloco
              </button>
            </div>
          </div>
        </main>

        {isContextOpen ? (
          <NoteContextPanel
            {...viewModel}
            onCreateTask={onCreateTask}
            onOpenBacklink={onOpenBacklink}
            onOpenPatient={onOpenPatient}
            onOpenTask={onOpenTask}
            onToggleTask={onToggleTask}
            activeTab={contextTab}
            onChangeTab={setContextTab}
          />
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => setIsContextOpen((open) => !open)}
        className="fixed right-4 bottom-4 left-4 z-30 mx-auto inline-flex w-fit max-w-[calc(100%-2rem)] items-center gap-2 rounded-full border border-border bg-card/95 px-4 py-2 text-sm font-bold shadow-lg backdrop-blur transition hover:bg-muted 2xl:hidden"
        aria-expanded={isContextOpen}
      >
        <UsersRound className="size-4 text-primary" />
        Contexto
      </button>
    </section>
  );
}

function EditorToolbar({
  onInsert,
  attachmentInputRef,
}: Pick<NoteEditorProps, 'onInsert'> & {
  attachmentInputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const commands = [
    { label: 'Negrito', icon: Bold },
    { label: 'Itálico', icon: Italic },
    { label: 'Lista', icon: List },
    { label: 'Checklist', icon: ListChecks, action: 'task' as const },
    { label: 'Citação', icon: Quote },
    { label: 'Tabela', icon: TableProperties },
    { label: 'Anexar arquivo', icon: Paperclip, action: 'attachment' as const },
    { label: 'Adicionar imagem', icon: ImagePlus, action: 'attachment' as const },
    { label: 'Mencionar', icon: AtSign, action: 'mention' as const },
    { label: 'Inserir link', icon: Link2 },
  ];

  return (
    <div
      className="flex flex-wrap items-center gap-1 rounded-lg border border-border bg-card p-1.5 shadow-xs"
      aria-label="Ferramentas do editor"
    >
      {commands.map((command) => {
        const Icon = command.icon;
        return (
          <button
            key={command.label}
            type="button"
            onClick={() =>
              command.action === 'attachment'
                ? attachmentInputRef.current?.click()
                : command.action && onInsert?.(command.action)
            }
            className="grid size-8 place-items-center rounded-sm text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            aria-label={command.label}
            title={command.label}
          >
            <Icon className="size-4" />
          </button>
        );
      })}
    </div>
  );
}

function NoteBlock({ block }: { block: NoteBlockViewModel }) {
  if (block.type === 'divider') return <hr className="my-7 border-border" />;
  if (block.type === 'heading')
    return <h2 className="font-display text-xl font-bold tracking-tight">{block.content}</h2>;
  if (block.type === 'callout')
    return (
      <div className="rounded-md border border-primary/15 bg-primary/[0.045] px-4 py-3 text-sm leading-relaxed text-foreground">
        {block.content}
      </div>
    );
  if (block.type === 'attachment')
    return (
      <div className="flex items-center gap-3 rounded-md border border-border bg-card p-3 text-sm">
        <Paperclip className="size-4 text-primary" />
        {block.content}
      </div>
    );
  if (block.type === 'checklist')
    return (
      <div className="flex items-start gap-3 text-[15px] leading-7">
        <span
          className={`mt-1 grid size-5 place-items-center rounded-sm border ${block.checked ? 'border-accent bg-accent text-accent-foreground' : 'border-muted-foreground/50'}`}
        >
          {block.checked ? <CheckCircle2 className="size-3.5" /> : null}
        </span>
        <span>{block.content}</span>
      </div>
    );
  return <p className="text-[15px] leading-7 text-foreground/90">{block.content}</p>;
}

function NoteContextPanel({
  backlinks,
  collaborators,
  linkedTasks,
  onCreateTask,
  onOpenBacklink,
  onOpenPatient,
  onOpenTask,
  onToggleTask,
  activeTab,
  onChangeTab,
  patient,
}: NoteEditorProps['viewModel'] &
  Pick<
    NoteEditorProps,
    'onCreateTask' | 'onOpenBacklink' | 'onOpenPatient' | 'onOpenTask' | 'onToggleTask'
  > & {
    activeTab: 'overview' | 'outline' | 'links' | 'tasks' | 'access';
    onChangeTab: (tab: 'overview' | 'outline' | 'links' | 'tasks' | 'access') => void;
  }) {
  const tabs = [
    { id: 'overview' as const, label: 'Visão geral', icon: CalendarDays },
    { id: 'outline' as const, label: 'Estrutura', icon: ListTree },
    { id: 'links' as const, label: 'Links', icon: Link2 },
    { id: 'tasks' as const, label: 'Tarefas', icon: ListChecks },
    { id: 'access' as const, label: 'Acesso', icon: UsersRound },
  ];

  return (
    <aside className="border-t border-border bg-card/70 px-5 py-6 2xl:border-t-0 2xl:border-l">
      <div className="mx-auto max-w-md space-y-5 2xl:mx-0">
        <div
          className="-mx-1 flex gap-1 overflow-x-auto border-b border-border pb-2"
          role="tablist"
          aria-label="Contexto da nota"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => onChangeTab?.(tab.id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] font-semibold transition ${activeTab === tab.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
              >
                <Icon className="size-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === 'overview' && patient ? (
          <section>
            <PanelHeading label="Paciente vinculado" icon={CalendarDays} />
            <button
              type="button"
              onClick={() => onOpenPatient?.(patient.id)}
              className="w-full rounded-lg border border-border bg-card p-3 text-left shadow-xs transition hover:border-primary/30 hover:shadow-sm"
            >
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {patient.name
                    .split(' ')
                    .map((part) => part[0])
                    .slice(0, 2)
                    .join('')}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">{patient.name}</span>
                  {patient.details ? (
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {patient.details}
                    </span>
                  ) : null}
                </span>
                <ChevronRight className="size-4 text-muted-foreground" />
              </div>
              {patient.nextAppointmentLabel ? (
                <span className="mt-3 flex items-center gap-2 border-t border-border pt-2.5 text-xs text-muted-foreground">
                  <Clock3 className="size-3.5" />
                  {patient.nextAppointmentLabel}
                </span>
              ) : null}
            </button>
          </section>
        ) : null}

        {activeTab === 'overview' || activeTab === 'tasks' ? (
          <section>
            <div className="mb-3 flex items-center justify-between">
              <PanelHeading label="Tarefas vinculadas" icon={ListChecks} />
              <button
                type="button"
                onClick={onCreateTask}
                className="rounded-sm p-1 text-primary hover:bg-primary/10"
                aria-label="Criar tarefa vinculada"
              >
                <Plus className="size-4" />
              </button>
            </div>
            <div className="space-y-2">
              {linkedTasks.map((task) => (
                <LinkedTask key={task.id} task={task} onOpen={onOpenTask} onToggle={onToggleTask} />
              ))}
              {linkedTasks.length === 0 ? (
                <p className="rounded-md border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
                  Nenhuma tarefa vinculada.
                </p>
              ) : null}
            </div>
          </section>
        ) : null}

        {activeTab === 'overview' || activeTab === 'access' ? (
          <section>
            <PanelHeading label="Colaboradores" icon={UsersRound} />
            <div className="mt-3 space-y-2">
              {collaborators.map((person) => (
                <div key={person.id} className="flex items-center gap-2.5">
                  <span className="grid size-8 place-items-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                    {person.initials}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">{person.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {person.permission ? permissionText[person.permission] : person.role}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {activeTab === 'overview' || activeTab === 'links' ? (
          <section>
            <PanelHeading label="Onde esta nota aparece" icon={Link2} />
            <div className="mt-2 divide-y divide-border rounded-lg border border-border bg-card">
              {backlinks.map((backlink) => (
                <button
                  type="button"
                  key={backlink.id}
                  onClick={() => onOpenBacklink?.(backlink.id)}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left transition hover:bg-muted"
                >
                  <FileText className="size-3.5 shrink-0 text-primary" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{backlink.title}</span>
                    {backlink.description ? (
                      <span className="block truncate text-xs text-muted-foreground">
                        {backlink.description}
                      </span>
                    ) : null}
                  </span>
                  <ChevronRight className="size-3.5 text-muted-foreground" />
                </button>
              ))}
              {backlinks.length === 0 ? (
                <p className="px-3 py-4 text-center text-xs text-muted-foreground">
                  Sem backlinks ainda.
                </p>
              ) : null}
            </div>
          </section>
        ) : null}

        {activeTab === 'outline' ? (
          <section>
            <PanelHeading label="Estrutura da nota" icon={ListTree} />
            <div className="mt-3 space-y-1 rounded-lg border border-border bg-card p-2">
              {viewModel.blocks
                .filter((block) => block.type === 'heading')
                .map((block) => (
                  <button
                    key={block.id}
                    type="button"
                    className="block w-full truncate rounded-md px-2 py-2 text-left text-sm font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  >
                    {block.content || 'Seção sem título'}
                  </button>
                ))}
              {!viewModel.blocks.some((block) => block.type === 'heading') ? (
                <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                  Use títulos para criar a estrutura da nota.
                </p>
              ) : null}
            </div>
          </section>
        ) : null}
      </div>
    </aside>
  );
}

function PropertyPill({
  icon: Icon,
  label,
  tone = 'default',
}: {
  icon: typeof CalendarDays;
  label: string;
  tone?: 'default' | 'patient';
}) {
  return (
    <span
      className={`inline-flex max-w-full items-center gap-1.5 rounded-md px-2 py-1.5 font-semibold ${tone === 'patient' ? 'bg-blue-500/10 text-blue-700' : 'bg-muted text-muted-foreground'}`}
    >
      <Icon className="size-3.5 shrink-0" />
      <span className="max-w-[180px] truncate">{label}</span>
    </span>
  );
}

function PanelHeading({ icon: Icon, label }: { icon: typeof CalendarDays; label: string }) {
  return (
    <h2 className="flex items-center gap-2 text-xs font-bold tracking-[0.12em] text-muted-foreground uppercase">
      <Icon className="size-3.5 text-primary" />
      {label}
    </h2>
  );
}

function LinkedTask({
  task,
  onOpen,
  onToggle,
}: {
  task: NoteLinkedTask;
  onOpen?: (taskId: string) => void;
  onToggle?: (taskId: string, nextStatus: NoteLinkedTask['status']) => void;
}) {
  const done = task.status === 'done';
  return (
    <div className="rounded-md border border-border bg-card p-3 shadow-xs">
      <div className="flex items-start gap-2.5">
        <button
          type="button"
          onClick={() => onToggle?.(task.id, done ? 'todo' : 'done')}
          className="mt-0.5 rounded-sm text-muted-foreground hover:text-accent"
          aria-label={done ? 'Marcar tarefa como pendente' : 'Concluir tarefa'}
        >
          {done ? <CheckCircle2 className="size-4 text-accent" /> : <Circle className="size-4" />}
        </button>
        <button
          type="button"
          onClick={() => onOpen?.(task.id)}
          className="min-w-0 flex-1 text-left"
        >
          <span
            className={`block text-sm font-semibold ${done ? 'text-muted-foreground line-through' : ''}`}
          >
            {task.title}
          </span>
          <span className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            {task.dueLabel ? <span>{task.dueLabel}</span> : null}
            {task.assignee ? <span>{task.assignee.initials}</span> : null}
          </span>
        </button>
      </div>
      <span
        className={`mt-2 inline-flex rounded-sm border px-1.5 py-0.5 text-[10px] font-bold uppercase ${taskStyles[task.status]}`}
      >
        {task.status === 'in-progress'
          ? 'Em andamento'
          : task.status === 'todo'
            ? 'A fazer'
            : task.status === 'done'
              ? 'Concluída'
              : 'Arquivada'}
      </span>
    </div>
  );
}
