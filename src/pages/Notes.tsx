import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { AtSign, BookOpen, CheckCircle2, Download, FileText, LayoutTemplate, LockKeyhole, MessageSquarePlus, Paperclip, RotateCcw, ShieldCheck, Sparkles, Trash2, UsersRound } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { NoteEditor, NotesHome, type NoteEditorViewModel, type NoteKind, type NotesHomeViewModel } from "../../apps/web/src/features/notes";
import type { NoteMentionRecord, NoteRecord, NoteRevisionRecord } from "@/api/v2/notes";
import { useCreateNote, useCreateNoteComment, useCreateNoteMention, useCreateNoteTask, useDeleteNoteAttachment, useGrantNotePermission, useNoteAttachments, useNoteBacklinks, useNoteComments, useNoteFavoriteIds, useNotePermissions, useNoteRevisions, useNoteTasks, useRevokeNotePermission, useToggleNoteFavorite, useUpdateNote, useUpdateNoteCommentStatus, useUploadNoteAttachment, useWorkerNote, useWorkerNotes } from "@/hooks/useWorkerNotes";
import { notesApi } from "@/api/v2/notes";
import { toast } from "sonner";
import { useUsers } from "@/hooks/useUsers";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NotesRichTextEditor, type NotesCollaborationStatus } from "@/components/notes/NotesRichTextEditor";
import { showFeature } from "@/lib/featureFlags/envFlags";

const kindByType: Record<NoteRecord["type"], NoteKind> = {
  personal: "private",
  team: "team",
  patient_context: "clinical-context",
  appointment: "clinical-context",
  meeting: "meeting",
  clinical_protocol: "knowledge",
  operational: "operational",
  template: "knowledge",
};

const SHAREABLE_ROLES = [
  { value: "admin", label: "Administradores" },
  { value: "fisioterapeuta", label: "Fisioterapeutas" },
  { value: "estagiario", label: "Estagiários" },
  { value: "recepcionista", label: "Recepcionistas" },
] as const;

type ShareSubjectType = "user" | "role" | "organization";
type NoteTemplate = {
  id: string;
  title: string;
  description: string;
  type: NoteRecord["type"];
  classification?: "private" | "team" | "operational" | "clinical";
  contentText: string;
  requiresPatient?: boolean;
};

const STARTER_TEMPLATES: NoteTemplate[] = [
  { id: "meeting", title: "Reunião", description: "Pauta, decisões e próximos passos.", type: "meeting", classification: "team", contentText: "Objetivo da reunião\n\nParticipantes\n\nPauta\n\nDecisões\n\nPróximos passos" },
  { id: "team", title: "Nota de equipe", description: "Alinhamentos operacionais do time.", type: "team", classification: "team", contentText: "Contexto\n\nAlinhamentos\n\nResponsáveis\n\nPróxima revisão" },
  { id: "protocol", title: "Protocolo", description: "Base reutilizável de conhecimento interno.", type: "clinical_protocol", classification: "operational", contentText: "Objetivo\n\nIndicações\n\nPasso a passo\n\nCuidados e contraindicações\n\nReferências" },
  { id: "pre-session", title: "Pré-atendimento", description: "Preparação segura antes da sessão.", type: "patient_context", contentText: "Objetivo da sessão\n\nContexto relevante\n\nPontos para confirmar\n\nPlano de abordagem", requiresPatient: true },
  { id: "post-session", title: "Pós-atendimento", description: "Pendências e acompanhamento após a sessão.", type: "patient_context", contentText: "Resumo do contexto\n\nPendências\n\nOrientações a reforçar\n\nPróximo passo", requiresPatient: true },
];
const MENTIONABLE_TYPES = [
  { value: "patient", label: "Pacientes" },
  { value: "profile", label: "Pessoas" },
  { value: "task", label: "Tarefas" },
  { value: "appointment", label: "Agenda" },
  { value: "session", label: "Evoluções" },
  { value: "note", label: "Notas" },
] as const satisfies ReadonlyArray<{ value: NoteMentionRecord["mentionType"]; label: string }>;

function visibility(note: NoteRecord): "private" | "restricted" | "team" | "organization" {
  if (note.classification === "clinical" || note.sensitivity === "restricted") return "restricted";
  if (note.classification === "team") return "team";
  return "private";
}

function toHomeModel(notes: NoteRecord[], favoriteIds: Set<string>, activeFilter: NotesHomeViewModel["activeFilter"] = "all", currentUserId?: string): NotesHomeViewModel {
  return {
    workspaceName: "FisioFlow",
    activeFilter,
    spaces: [
      { id: "mine", name: "Minhas notas", icon: <LockKeyhole className="size-3.5" />, count: notes.filter((note) => note.classification === "private").length, accent: "primary" },
      { id: "team", name: "Equipe", icon: <UsersRound className="size-3.5" />, count: notes.filter((note) => note.classification === "team").length, accent: "accent" },
      { id: "clinical", name: "Contexto clínico", icon: <FileText className="size-3.5" />, count: notes.filter((note) => note.patientId).length },
    ],
    notes: notes.map((note) => ({
      id: note.id,
      title: note.title,
      preview: note.contentText?.slice(0, 160) || "Nota sem conteúdo ainda.",
      kind: kindByType[note.type],
      status: note.status === "under_review" ? "active" : note.status,
      updatedLabel: new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(note.updatedAt)),
      updatedAt: note.updatedAt,
      taskCount: 0,
      commentCount: 0,
      visibility: visibility(note),
      isFavorite: favoriteIds.has(note.id),
      isSharedWithMe: Boolean(currentUserId && note.ownerId && note.ownerId !== currentUserId),
    })),
  };
}

function toEditorModel(note: NoteRecord, context: { taskData: ReturnType<typeof useNoteTasks>["data"]; commentCount: number; backlinkData: ReturnType<typeof useNoteBacklinks>["data"] }): NoteEditorViewModel {
  const paragraphs = (note.contentText || "Comece a registrar o contexto desta nota.")
    .split(/\n{2,}/)
    .filter(Boolean)
    .map((content, index) => ({ id: `paragraph-${index}`, type: "paragraph" as const, content }));
  return {
    id: note.id,
    title: note.title,
    emoji: note.patientId ? "🩺" : "📝",
    kind: kindByType[note.type],
    status: note.status === "under_review" ? "active" : note.status,
    visibility: visibility(note),
    savedLabel: "Salvamento automático ativo",
    breadcrumbs: [note.patientId ? "Contexto clínico" : "Meu espaço", note.type === "meeting" ? "Reuniões" : "Notas"],
    blocks: paragraphs,
    patient: note.patientId ? { id: note.patientId, name: "Paciente vinculado", details: "Acesso restrito à equipe autorizada" } : undefined,
    collaborators: [],
    linkedTasks: (context.taskData ?? []).map((task) => ({ id: task.id, title: task.titulo, status: task.status === "CONCLUIDO" ? "done" : task.status === "EM_ANDAMENTO" ? "in-progress" : "todo" })),
    backlinks: (context.backlinkData ?? []).map((backlink) => ({ id: backlink.id, title: backlink.title, kind: "note", description: backlink.relationTypes.join(", ") })),
    commentCount: context.commentCount,
  };
}

export default function Notes() {
  const navigate = useNavigate();
  const { noteId } = useParams();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const patientId = searchParams.get("patientId") ?? undefined;
  const list = useWorkerNotes(patientId);
  const favorites = useNoteFavoriteIds();
  const toggleFavorite = useToggleNoteFavorite();
  const detail = useWorkerNote(noteId);
  const create = useCreateNote();
  const createTask = useCreateNoteTask();
  const createMention = useCreateNoteMention();
  const createComment = useCreateNoteComment();
  const updateCommentStatus = useUpdateNoteCommentStatus();
  const uploadAttachment = useUploadNoteAttachment();
  const attachments = useNoteAttachments(noteId);
  const deleteAttachment = useDeleteNoteAttachment();
  const grantPermission = useGrantNotePermission();
  const notePermissions = useNotePermissions(noteId);
  const noteTasks = useNoteTasks(noteId);
  const noteComments = useNoteComments(noteId);
  const noteRevisions = useNoteRevisions(noteId);
  const noteBacklinks = useNoteBacklinks(noteId);
  const portalPublications = useQuery({
    queryKey: ["workers", "notes", noteId, "portal-publications"],
    queryFn: () => notesApi.listPatientPortalPublications(noteId!),
    enabled: Boolean(noteId),
    select: (result) => result.data,
  });
  const revokePermission = useRevokeNotePermission();
  const { users } = useUsers();
  const update = useUpdateNote();
  const [title, setTitle] = useState("");
  const [semanticQuery, setSemanticQuery] = useState("");
  const [homeFilter, setHomeFilter] = useState<NonNullable<NotesHomeViewModel["activeFilter"]>>("all");
  const [collaborationStatus, setCollaborationStatus] = useState<NotesCollaborationStatus>("idle");
  const [shareOpen, setShareOpen] = useState(false);
  const [shareSubjectType, setShareSubjectType] = useState<ShareSubjectType>("user");
  const [memberId, setMemberId] = useState("");
  const [permission, setPermission] = useState<"viewer" | "commenter" | "editor">("viewer");
  const [mentionOpen, setMentionOpen] = useState(false);
  const [patientSearch, setPatientSearch] = useState("");
  const [mentionType, setMentionType] = useState<NoteMentionRecord["mentionType"]>("patient");
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [attachmentsOpen, setAttachmentsOpen] = useState(false);
  const [commentBody, setCommentBody] = useState("");
  const [portalOpen, setPortalOpen] = useState(false);
  const [portalText, setPortalText] = useState("");
  const [portalLoading, setPortalLoading] = useState(false);
  const mentionMatches = useQuery({ queryKey: ["notes", "mentionables", mentionType, patientSearch], queryFn: ({ signal }) => notesApi.mentionables(patientSearch, [mentionType], { signal }), enabled: mentionOpen && patientSearch.trim().length >= 2 });
  const semanticSearch = useQuery({
    queryKey: ["notes", "semantic-search", semanticQuery],
    queryFn: ({ signal }) => notesApi.semanticSearch(semanticQuery.trim(), { signal }),
    enabled: semanticQuery.trim().length >= 3,
    staleTime: 1000 * 30,
  });

  useEffect(() => {
    if (detail.data) setTitle(detail.data.title);
  }, [detail.data?.id, detail.data?.title]);

  useEffect(() => {
    if (!detail.data || !title.trim() || title === detail.data.title) return;
    const timeout = window.setTimeout(() => {
      // O Y.Doc pode salvar conteúdo em paralelo e avançar a versão da nota;
      // para título, a API já faz compare-and-swap com a versão recém-lida.
      update.mutate({ id: detail.data!.id, title: title.trim() });
    }, 700);
    return () => window.clearTimeout(timeout);
  }, [detail.data, title, update]);

  const homeNotes = useMemo(() => {
    if (semanticQuery.trim().length < 3 || !semanticSearch.data?.data) return list.data ?? [];
    return semanticSearch.data.data.map((result) => {
      const local = list.data?.find((note) => note.id === result.id);
      return local ?? {
        id: result.id,
        title: result.title,
        type: "team" as const,
        status: "active" as const,
        classification: "team" as const,
        sensitivity: "internal" as const,
        patientId: null,
        contentJson: {},
        contentHtml: null,
        contentText: result.preview,
        tags: [],
        ownerId: "",
        metadataVersion: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    });
  }, [list.data, semanticQuery, semanticSearch.data]);
  const filteredHomeNotes = useMemo(() => {
    const favoriteIds = new Set(favorites.data ?? []);
    if (homeFilter === "favorites") return homeNotes.filter((note) => favoriteIds.has(note.id));
    if (homeFilter === "patient") return homeNotes.filter((note) => Boolean(note.patientId));
    if (homeFilter === "templates") return homeNotes.filter((note) => note.type === "template");
    if (homeFilter === "shared") return homeNotes.filter((note) => Boolean(note.ownerId && user?.uid && note.ownerId !== user.uid));
    if (homeFilter === "recent") {
      const cutoff = Date.now() - 1000 * 60 * 60 * 24 * 30;
      return homeNotes.filter((note) => new Date(note.updatedAt).getTime() >= cutoff);
    }
    return homeNotes;
  }, [favorites.data, homeFilter, homeNotes, user?.uid]);
  const homeModel = useMemo(() => toHomeModel(filteredHomeNotes, new Set(favorites.data ?? []), homeFilter, user?.uid), [favorites.data, filteredHomeNotes, homeFilter, user?.uid]);
  const createNote = (template?: NoteTemplate) => {
    const selected = template;
    create.mutate(
      patientId
        ? { title: selected?.title ?? "Nota de contexto", type: "patient_context", patientId, contentJson: { type: "doc", content: [] }, contentText: selected?.contentText ?? "" }
        : { title: selected?.title ?? "Sem título", type: selected?.type, classification: selected?.classification, contentJson: { type: "doc", content: [] }, contentText: selected?.contentText ?? "" },
      { onSuccess: ({ data }) => { setTemplateOpen(false); navigate(`/notes/${data.id}`); } },
    );
  };
  const createTaskFromNote = () => {
    if (!detail.data) return;
    const taskTitle = window.prompt("Título da tarefa vinculada");
    if (taskTitle?.trim()) createTask.mutate({ noteId: detail.data.id, title: taskTitle.trim() });
  };
  const shareNote = () => {
    const subjectId = shareSubjectType === "organization" ? undefined : memberId;
    if (!detail.data || (shareSubjectType !== "organization" && !subjectId)) return;
    const capabilities = permission === "editor"
      ? ["view", "comment", "edit_content", "edit_properties"]
      : permission === "commenter"
        ? ["view", "comment"]
        : ["view"];
    grantPermission.mutate(
      { noteId: detail.data.id, subjectType: shareSubjectType, subjectId, accessRole: permission, capabilities },
      { onSuccess: () => { setShareOpen(false); setMemberId(""); setShareSubjectType("user"); } },
    );
  };
  const memberName = (userId: string | null) => users.find((user) => user.id === userId)?.full_name ?? "Membro da equipe";
  const permissionSubjectName = (item: NonNullable<typeof notePermissions.data>[number]) => {
    if (item.subjectType === "organization") return "Equipe inteira";
    if (item.subjectType === "role") return SHAREABLE_ROLES.find((role) => role.value === item.subjectId)?.label ?? `Cargo: ${item.subjectId}`;
    return memberName(item.subjectId);
  };
  const mentionEntity = (entity: { id: string; type: NoteMentionRecord["mentionType"]; label: string }) => {
    if (!detail.data) return;
    createMention.mutate({ noteId: detail.data.id, mentionType: entity.type, targetId: entity.id, displayLabel: entity.label }, { onSuccess: () => { setMentionOpen(false); setPatientSearch(""); } });
  };
  const downloadAttachment = async (attachment: { id: string; originalName: string }) => {
    if (!detail.data) return;
    try {
      const blob = await notesApi.downloadAttachment(detail.data.id, attachment.id);
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = attachment.originalName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      toast.error(`Não foi possível baixar o anexo: ${(error as Error).message}`);
    }
  };
  const submitComment = () => {
    if (!detail.data || !commentBody.trim()) return;
    createComment.mutate({ noteId: detail.data.id, body: commentBody.trim() }, { onSuccess: () => setCommentBody("") });
  };
  const summarizeWithAi = async () => {
    if (!detail.data) return;
    setAiLoading(true);
    try {
      const result = await notesApi.summarizeWithAi(detail.data.id);
      setAiSummary(result.data.summary);
    } catch (error) {
      toast.error(`Não foi possível resumir: ${(error as Error).message}`);
    } finally {
      setAiLoading(false);
    }
  };
  const exportNote = async () => {
    if (!detail.data) return;
    try {
      const blob = await notesApi.exportHtml(detail.data.id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `nota-${detail.data.id}.html`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(`Não foi possível exportar: ${(error as Error).message}`);
    }
  };
  const publishToPortal = async () => {
    if (!detail.data || !portalText.trim()) return;
    setPortalLoading(true);
    try {
      await notesApi.publishToPatientPortal(detail.data.id, { contentText: portalText.trim(), expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() });
      toast.success("Projeção publicada no portal por 7 dias");
      await portalPublications.refetch();
      setPortalOpen(false);
    } catch (error) {
      toast.error(`Não foi possível publicar: ${(error as Error).message}`);
    } finally {
      setPortalLoading(false);
    }
  };
  const revokePortalPublication = async (publicationId: string) => {
    if (!detail.data) return;
    try {
      await notesApi.revokePatientPortalPublication(detail.data.id, publicationId);
      toast.success("Publicação revogada");
      await portalPublications.refetch();
    } catch (error) {
      toast.error(`Não foi possível revogar: ${(error as Error).message}`);
    }
  };
  const restoreRevision = async (revision: NoteRevisionRecord) => {
    if (!detail.data || !window.confirm(`Restaurar a versão ${revision.versionNumber}? As sessões colaborativas serão sincronizadas antes da próxima edição.`)) return;
    try {
      await notesApi.restoreRevision(detail.data.id, revision.id);
      toast.success("Versão restaurada; a nota será recarregada");
      window.location.reload();
    } catch (error) {
      toast.error(`Não foi possível restaurar: ${(error as Error).message}`);
    }
  };

  if (noteId) {
    if (detail.isLoading) return <LoadingState label="Abrindo nota…" />;
    if (!detail.data) return <LoadingState label="Não foi possível encontrar esta nota." />;
    return <>
      <div className="flex min-h-[calc(100vh-4rem)] min-w-0 flex-col overflow-hidden bg-background lg:flex-row">
        <aside className="order-2 h-[38vh] min-h-0 w-full shrink-0 border-t border-border bg-card lg:order-1 lg:h-[calc(100vh-4rem)] lg:w-[280px] lg:border-t-0 lg:border-r xl:w-[320px]">
          <NotesHome
            compact
            selectedNoteId={noteId}
            viewModel={homeModel}
            onCreateNote={() => createNote()}
            onChangeFilter={setHomeFilter}
            onSearch={setSemanticQuery}
            onSelectNote={(id) => navigate(`/notes/${id}`)}
            onToggleFavorite={(id) => toggleFavorite.mutate({ noteId: id, favorite: !favorites.data?.includes(id) })}
          />
        </aside>
        <main className="order-1 min-h-0 min-w-0 flex-1 lg:order-2">
          <NoteEditor
        viewModel={{
          ...toEditorModel(detail.data, { taskData: noteTasks.data, commentCount: noteComments.data?.length ?? 0, backlinkData: noteBacklinks.data }),
          title,
          savedLabel: collaborationStatus === "connected" ? "Colaboração em tempo real ativa" : collaborationStatus === "connecting" ? "Conectando colaboração…" : "Salvamento automático ativo",
          editorContent: <NotesRichTextEditor
            contentHtml={detail.data.contentHtml ?? (detail.data.contentText ? `<p>${detail.data.contentText}</p>` : "")}
            onContentHtmlChange={() => undefined}
            collaborationId={detail.data.id}
            collaborationPath={`/api/notes/${detail.data.id}/collaboration`}
            collaborationTicketPath={`/api/notes/${detail.data.id}/collaboration-ticket`}
            offlinePersistence={showFeature("notes_offline") && !detail.data.patientId && detail.data.sensitivity === "internal"}
            offlinePersistenceKey={showFeature("notes_offline") && user?.uid && detail.data ? `notes:${user.uid}:${user.organizationId ?? "unknown"}:${detail.data.id}` : undefined}
            collaboratorName="Membro da equipe"
            collaborationStatus={collaborationStatus}
            saveStatus={collaborationStatus === "connected" ? "saved" : collaborationStatus === "disconnected" ? "unsaved" : "saving"}
            onCollaborationStatusChange={(status) => setCollaborationStatus(status)}
          />,
        }}
        onTitleChange={setTitle}
        onOpenPatient={(patientId) => navigate(`/patients/${patientId}`)}
        onOpenTask={() => navigate("/boards")}
        onOpenBacklink={() => undefined}
        onOpenHistory={() => setHistoryOpen(true)}
        onOpenComments={() => setCommentsOpen(true)}
        onShare={() => setShareOpen(true)}
        onCreateTask={createTaskFromNote}
        onToggleTask={() => undefined}
        onInsert={(command, file) => command === "mention" ? setMentionOpen(true) : command === "attachment" && file && detail.data ? uploadAttachment.mutate({ noteId: detail.data.id, file }, { onSuccess: () => setAttachmentsOpen(true) }) : undefined}
          />
        </main>
      </div>
      <div className="fixed right-4 bottom-4 left-4 z-20 flex flex-wrap justify-center gap-2 lg:left-[360px]">
        <Button variant="outline" size="sm" onClick={() => setMentionOpen(true)}><AtSign className="mr-2 size-4" />Mencionar paciente</Button>
        <Button variant="outline" size="sm" onClick={() => setAttachmentsOpen(true)}><Paperclip className="mr-2 size-4" />Anexos{attachments.data?.length ? ` (${attachments.data.length})` : ""}</Button>
        <Button variant="outline" size="sm" onClick={() => setCommentsOpen(true)}><MessageSquarePlus className="mr-2 size-4" />Comentar</Button>
        <Button variant="outline" size="sm" onClick={() => void exportNote()}><Download className="mr-2 size-4" />Exportar</Button>
        {detail.data.patientId ? <Button variant="outline" size="sm" onClick={() => { setPortalText(""); setPortalOpen(true); }}><UsersRound className="mr-2 size-4" />Portal do paciente</Button> : null}
        {!detail.data.patientId && detail.data.classification !== "clinical" && detail.data.sensitivity === "internal" ? <Button variant="outline" size="sm" onClick={() => void summarizeWithAi()} disabled={aiLoading}><Sparkles className="mr-2 size-4" />{aiLoading ? "Resumindo…" : "Resumo IA"}</Button> : null}
      </div>
      <Dialog open={attachmentsOpen} onOpenChange={setAttachmentsOpen}>
        <DialogContent className="max-w-lg"><DialogHeader><DialogTitle>Anexos da nota</DialogTitle><DialogDescription>Arquivos protegidos, disponíveis apenas para pessoas com acesso à nota.</DialogDescription></DialogHeader><Label className="block cursor-pointer rounded-md border border-dashed border-primary/40 p-3 text-center text-sm font-medium text-primary hover:bg-primary/5">Adicionar arquivo<input className="sr-only" type="file" accept="application/pdf,image/jpeg,image/png,image/webp,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(event) => { const file = event.target.files?.[0]; if (file) uploadAttachment.mutate({ noteId: detail.data!.id, file }); event.currentTarget.value = ""; }} /><span className="mt-1 block text-xs font-normal text-muted-foreground">PDF, imagem, TXT ou DOCX · até 25 MB</span></Label><div className="max-h-80 space-y-2 overflow-y-auto">{attachments.data?.length ? attachments.data.map((attachment) => <article key={attachment.id} className="flex items-center gap-3 rounded-md border border-border p-3"><Paperclip className="size-4 shrink-0 text-primary" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{attachment.originalName}</p><p className="text-xs text-muted-foreground">{(attachment.sizeBytes / 1024).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} KB · {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(attachment.createdAt))}</p></div><Button variant="ghost" size="icon" aria-label={`Baixar ${attachment.originalName}`} onClick={() => void downloadAttachment(attachment)}><Download className="size-4" /></Button><Button variant="ghost" size="icon" className="text-destructive" aria-label={`Remover ${attachment.originalName}`} disabled={deleteAttachment.isPending} onClick={() => deleteAttachment.mutate({ noteId: detail.data!.id, attachmentId: attachment.id })}><Trash2 className="size-4" /></Button></article>) : <p className="py-8 text-center text-sm text-muted-foreground">Nenhum anexo nesta nota.</p>}</div></DialogContent>
      </Dialog>
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Compartilhar nota</DialogTitle><DialogDescription>Defina quem pode acessar e o nível de permissão. Notas clínicas nunca podem ser abertas para toda a equipe.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Compartilhar com</Label><Select value={shareSubjectType} onValueChange={(value) => { setShareSubjectType(value as ShareSubjectType); setMemberId(""); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="user">Uma pessoa</SelectItem><SelectItem value="role">Um cargo da equipe</SelectItem>{detail.data.classification !== "clinical" ? <SelectItem value="organization">Toda a equipe</SelectItem> : null}</SelectContent></Select></div>
            {shareSubjectType === "user" ? <div className="space-y-2"><Label>Membro da equipe</Label><Select value={memberId} onValueChange={setMemberId}><SelectTrigger><SelectValue placeholder="Selecione uma pessoa" /></SelectTrigger><SelectContent>{users.filter((user) => !user.disabled).map((user) => <SelectItem key={user.id} value={user.id}>{user.full_name}</SelectItem>)}</SelectContent></Select></div> : null}
            {shareSubjectType === "role" ? <div className="space-y-2"><Label>Cargo da equipe</Label><Select value={memberId} onValueChange={setMemberId}><SelectTrigger><SelectValue placeholder="Selecione um cargo" /></SelectTrigger><SelectContent>{SHAREABLE_ROLES.map((role) => <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>)}</SelectContent></Select></div> : null}
            {shareSubjectType === "organization" ? <div className="flex gap-3 rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-muted-foreground"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-amber-600" /><p>Todos os membros ativos da clínica poderão acessar esta nota com a permissão escolhida.</p></div> : null}
            <div className="space-y-2"><Label>Permissão</Label><Select value={permission} onValueChange={(value) => setPermission(value as typeof permission)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="viewer">Pode visualizar</SelectItem><SelectItem value="commenter">Pode comentar</SelectItem><SelectItem value="editor">Pode editar</SelectItem></SelectContent></Select></div>
            {notePermissions.data?.length ? <div className="space-y-2 border-t border-border pt-4"><Label>Acesso atual</Label>{notePermissions.data.map((item) => <div className="flex items-center justify-between gap-3 text-sm" key={item.id}><span className="min-w-0 truncate"><strong>{permissionSubjectName(item)}</strong> · {item.accessRole === "editor" ? "Pode editar" : item.accessRole === "commenter" ? "Pode comentar" : "Pode visualizar"}</span><Button variant="ghost" size="sm" className="text-destructive" disabled={revokePermission.isPending} onClick={() => revokePermission.mutate({ noteId: detail.data!.id, permissionId: item.id })}>Remover</Button></div>)}</div> : null}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShareOpen(false)}>Cancelar</Button><Button disabled={(shareSubjectType !== "organization" && !memberId) || grantPermission.isPending} onClick={shareNote}>Compartilhar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={mentionOpen} onOpenChange={setMentionOpen}>
        <DialogContent className="max-w-md"><DialogHeader><DialogTitle>Inserir menção</DialogTitle><DialogDescription>A busca respeita as permissões da organização e cria uma relação auditável com a nota.</DialogDescription></DialogHeader><Select value={mentionType} onValueChange={(value) => { setMentionType(value as NoteMentionRecord["mentionType"]); setPatientSearch(""); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{MENTIONABLE_TYPES.map((type) => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}</SelectContent></Select><input autoFocus value={patientSearch} onChange={(event) => setPatientSearch(event.target.value)} placeholder="Digite ao menos 2 letras" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />{patientSearch.trim().length >= 2 ? <div className="max-h-56 space-y-1 overflow-y-auto">{(mentionMatches.data?.data ?? []).map((entity) => <button type="button" key={`${entity.type}-${entity.id}`} onClick={() => mentionEntity(entity)} className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted"><span className="block font-medium">{entity.label}</span>{entity.subtitle ? <span className="block text-xs text-muted-foreground">{entity.subtitle}</span> : null}</button>)}{!mentionMatches.isLoading && !(mentionMatches.data?.data ?? []).length ? <p className="px-3 py-4 text-sm text-muted-foreground">Nenhum resultado encontrado.</p> : null}</div> : null}</DialogContent>
      </Dialog>
      <Dialog open={commentsOpen} onOpenChange={setCommentsOpen}><DialogContent className="max-w-lg"><DialogHeader><DialogTitle>Comentários</DialogTitle><DialogDescription>Discussões vinculadas a esta nota.</DialogDescription></DialogHeader><div className="flex gap-2"><input value={commentBody} maxLength={5000} onChange={(event) => setCommentBody(event.target.value)} onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key === "Enter") submitComment(); }} placeholder="Escreva um comentário…" className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" /><Button disabled={!commentBody.trim() || createComment.isPending} onClick={submitComment}>Enviar</Button></div><p className="text-xs text-muted-foreground">Use Ctrl/Cmd + Enter para enviar.</p><div className="max-h-80 space-y-3 overflow-y-auto">{noteComments.data?.length ? noteComments.data.map((comment) => <article key={comment.id} className={`rounded-md border p-3 ${comment.status === "resolved" ? "border-border/70 bg-muted/30" : "border-border"}`}><div className="flex items-start gap-3"><p className={`min-w-0 flex-1 text-sm ${comment.status === "resolved" ? "text-muted-foreground line-through" : ""}`}>{comment.body}</p><Button variant="ghost" size="icon" className="shrink-0" aria-label={comment.status === "resolved" ? "Reabrir comentário" : "Resolver comentário"} disabled={updateCommentStatus.isPending} onClick={() => updateCommentStatus.mutate({ noteId: detail.data!.id, commentId: comment.id, status: comment.status === "resolved" ? "open" : "resolved" })}>{comment.status === "resolved" ? <RotateCcw className="size-4" /> : <CheckCircle2 className="size-4 text-emerald-600" />}</Button></div><p className="mt-2 text-xs text-muted-foreground">{comment.status === "resolved" ? "Resolvido · " : "Aberto · "}{new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(comment.createdAt))}</p></article>) : <p className="py-8 text-center text-sm text-muted-foreground">Ainda não há comentários.</p>}</div></DialogContent></Dialog>
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}><DialogContent className="max-w-lg"><DialogHeader><DialogTitle>Histórico de versões</DialogTitle><DialogDescription>Snapshots imutáveis desta nota. Restaurar cria uma nova versão e sincroniza a colaboração.</DialogDescription></DialogHeader><div className="max-h-80 space-y-3 overflow-y-auto">{noteRevisions.data?.length ? noteRevisions.data.map((revision) => <article key={revision.id} className="flex items-center gap-3 rounded-md border border-border p-3"><div className="min-w-0 flex-1"><p className="text-sm font-semibold">Versão {revision.versionNumber}</p><p className="mt-1 text-xs text-muted-foreground">{revision.reason || "Snapshot automático"} · {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(revision.createdAt))}</p></div><Button variant="outline" size="sm" onClick={() => void restoreRevision(revision)}>Restaurar</Button></article>) : <p className="py-8 text-center text-muted-foreground">Nenhuma versão salva ainda.</p>}</div></DialogContent></Dialog>
      <Dialog open={portalOpen} onOpenChange={setPortalOpen}><DialogContent className="max-w-lg"><DialogHeader><DialogTitle>Publicar no portal do paciente</DialogTitle><DialogDescription>Escolha exatamente o texto que o paciente verá. A publicação expira em 7 dias e pode ser revogada.</DialogDescription></DialogHeader><textarea value={portalText} onChange={(event) => setPortalText(event.target.value)} maxLength={20000} rows={9} placeholder="Escreva a orientação ou resumo destinado ao paciente…" className="w-full rounded-md border border-input bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-ring" /><DialogFooter><Button variant="outline" onClick={() => setPortalOpen(false)}>Cancelar</Button><Button disabled={!portalText.trim() || portalLoading} onClick={() => void publishToPortal()}>{portalLoading ? "Publicando…" : "Publicar por 7 dias"}</Button></DialogFooter><div className="border-t border-border pt-4"><p className="mb-2 text-sm font-semibold">Publicações desta nota</p>{portalPublications.data?.length ? <div className="space-y-2">{portalPublications.data.map((publication) => <div key={publication.id} className="flex items-center gap-3 rounded-md border border-border p-2 text-xs"><span className="min-w-0 flex-1 truncate">{publication.title} · expira {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(publication.expiresAt))}</span>{!publication.revokedAt && new Date(publication.expiresAt) > new Date() ? <Button variant="ghost" size="sm" className="text-destructive" onClick={() => void revokePortalPublication(publication.id)}>Revogar</Button> : <span className="text-muted-foreground">Inativa</span>}</div>)}</div> : <p className="text-xs text-muted-foreground">Nenhuma publicação registrada.</p>}</div></DialogContent></Dialog>
      <Dialog open={aiSummary !== null} onOpenChange={(open) => { if (!open) setAiSummary(null); }}><DialogContent className="max-w-lg"><DialogHeader><DialogTitle>Resumo da nota</DialogTitle><DialogDescription>Gerado por IA a partir desta nota interna. Revise antes de reutilizar.</DialogDescription></DialogHeader><p className="whitespace-pre-wrap text-sm leading-7">{aiSummary}</p></DialogContent></Dialog>
    </>;
  }

  if (list.isLoading) return <LoadingState label="Carregando suas notas…" />;
  return <>
    <NotesHome viewModel={homeModel} onCreateNote={() => createNote()} onChangeFilter={setHomeFilter} onSearch={setSemanticQuery} onSelectNote={(id) => navigate(`/notes/${id}`)} onToggleFavorite={(id) => toggleFavorite.mutate({ noteId: id, favorite: !favorites.data?.includes(id) })} />
    <Button className="fixed bottom-5 right-5 z-20 shadow-lg" variant="outline" onClick={() => setTemplateOpen(true)}><LayoutTemplate className="mr-2 size-4" />Usar template</Button>
    <Dialog open={templateOpen} onOpenChange={setTemplateOpen}>
      <DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Começar com um template</DialogTitle><DialogDescription>Modelos estruturados para começar rápido, sem substituir a evolução clínica oficial.</DialogDescription></DialogHeader><div className="grid gap-3 sm:grid-cols-2">{STARTER_TEMPLATES.map((template) => { const unavailable = Boolean(template.requiresPatient && !patientId); return <button type="button" key={template.id} disabled={unavailable || create.isPending} onClick={() => createNote(template)} className="rounded-lg border border-border p-4 text-left transition hover:border-primary hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50"><p className="font-semibold">{template.title}</p><p className="mt-1 text-sm text-muted-foreground">{template.description}</p>{unavailable ? <p className="mt-3 text-xs text-amber-700">Abra as notas pela ficha do paciente para usar este modelo.</p> : null}</button>; })}</div></DialogContent>
    </Dialog>
  </>;
}

function LoadingState({ label }: { label: string }) {
  return (
    <div className="grid min-h-[60vh] place-items-center bg-background px-6 text-center">
      <div>
        <BookOpen className="mx-auto mb-3 size-6 text-primary" />
        <p className="font-semibold">{label}</p>
      </div>
    </div>
  );
}
