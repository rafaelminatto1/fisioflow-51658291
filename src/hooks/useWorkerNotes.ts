import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notesApi } from "@/api/v2/notes";
import { toast } from "sonner";

const key = (id?: string) => (id ? ["workers", "notes", id] : ["workers", "notes"]);

const NOTE_RESOURCE_KEYS = {
  tasks: (noteId?: string) => ["workers", "notes", noteId, "tasks"] as const,
  comments: (noteId?: string) => ["workers", "notes", noteId, "comments"] as const,
  revisions: (noteId?: string) => ["workers", "notes", noteId, "revisions"] as const,
  mentions: (noteId?: string) => ["workers", "notes", noteId, "mentions"] as const,
  backlinks: (noteId?: string) => ["workers", "notes", noteId, "backlinks"] as const,
  attachments: (noteId?: string) => ["workers", "notes", noteId, "attachments"] as const,
};

export function useWorkerNotes(patientId?: string) {
  return useQuery({
    queryKey: [...key(), patientId ?? "all"],
    queryFn: () => notesApi.list(patientId ? { patientId } : undefined),
    select: (result) => result.data,
  });
}

export function useWorkerNote(id?: string) {
  return useQuery({
    queryKey: key(id),
    queryFn: () => notesApi.get(id!),
    select: (result) => result.data,
    enabled: Boolean(id),
  });
}

export function useNoteFavoriteIds() {
  return useQuery({
    queryKey: ["workers", "notes", "favorites"],
    queryFn: notesApi.listFavorites,
    select: (result) => result.data,
  });
}

export function useToggleNoteFavorite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ noteId, favorite }: { noteId: string; favorite: boolean }) => favorite ? notesApi.favorite(noteId) : notesApi.unfavorite(noteId),
    onSuccess: (_, { favorite }) => {
      void queryClient.invalidateQueries({ queryKey: ["workers", "notes", "favorites"] });
      toast.success(favorite ? "Adicionada às favoritas" : "Removida das favoritas");
    },
    onError: (error: Error) => toast.error(`Não foi possível atualizar favoritas: ${error.message}`),
  });
}

export function useCreateNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: notesApi.create,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: key() });
      toast.success("Nota criada");
    },
    onError: (error: Error) => toast.error(`Não foi possível criar a nota: ${error.message}`),
  });
}

export function useUpdateNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string; title?: string; contentText?: string | null; status?: "draft" | "active" | "under_review" | "archived"; version?: number }) =>
      notesApi.update(id, payload, payload.version),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: key() });
      void queryClient.setQueryData(key(result.data.id), result);
    },
    onError: (error: Error) => toast.error(`Não foi possível salvar a nota: ${error.message}`),
  });
}

export function useCreateNoteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ noteId, title }: { noteId: string; title: string }) => notesApi.createTask(noteId, { title }),
    onSuccess: (_, { noteId }) => {
      void queryClient.invalidateQueries({ queryKey: ["workers", "notes", noteId] });
      toast.success("Tarefa vinculada à nota");
    },
    onError: (error: Error) => toast.error(`Não foi possível criar a tarefa: ${error.message}`),
  });
}

export function useGrantNotePermission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ noteId, ...payload }: { noteId: string; subjectType: "user" | "role" | "organization"; subjectId?: string; accessRole: "editor" | "commenter" | "viewer"; capabilities: string[] }) =>
      notesApi.grantPermission(noteId, payload),
    onSuccess: (_, { noteId }) => {
      void queryClient.invalidateQueries({ queryKey: ["workers", "notes", noteId] });
      void queryClient.invalidateQueries({ queryKey: ["workers", "notes"] });
      toast.success("Acesso atualizado");
    },
    onError: (error: Error) => toast.error(`Não foi possível compartilhar: ${error.message}`),
  });
}

export function useNotePermissions(noteId?: string) {
  return useQuery({
    queryKey: ["workers", "notes", noteId, "permissions"],
    queryFn: () => notesApi.listPermissions(noteId!),
    enabled: Boolean(noteId),
    select: (result) => result.data.filter((permission) => !permission.revokedAt),
  });
}

/** Tarefas canônicas (`tarefas`) relacionadas a uma nota que o usuário pode visualizar. */
export function useNoteTasks(noteId?: string) {
  return useQuery({
    queryKey: NOTE_RESOURCE_KEYS.tasks(noteId),
    queryFn: ({ signal }) => notesApi.listTasks(noteId!, { signal }),
    enabled: Boolean(noteId),
    staleTime: 1000 * 30,
    select: (result) => result.data,
  });
}

/** Comentários e respostas de uma nota, em ordem decrescente de criação. */
export function useNoteComments(noteId?: string) {
  return useQuery({
    queryKey: NOTE_RESOURCE_KEYS.comments(noteId),
    queryFn: ({ signal }) => notesApi.listComments(noteId!, { signal }),
    enabled: Boolean(noteId),
    staleTime: 1000 * 15,
    select: (result) => result.data,
  });
}

/** Cria um comentário apenas quando a ACL da nota concede a capacidade `comment`. */
export function useCreateNoteComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ noteId, ...payload }: { noteId: string; body: string; parentCommentId?: string; blockId?: string; selection?: Record<string, unknown> }) =>
      notesApi.createComment(noteId, payload),
    onSuccess: (_, { noteId }) => {
      void queryClient.invalidateQueries({ queryKey: NOTE_RESOURCE_KEYS.comments(noteId) });
      toast.success("Comentário adicionado");
    },
    onError: (error: Error) => toast.error(`Não foi possível comentar: ${error.message}`),
  });
}

/** Atualiza o estado de uma discussão, preservando a trilha de auditoria. */
export function useUpdateNoteCommentStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ noteId, commentId, status }: { noteId: string; commentId: string; status: "open" | "resolved" }) =>
      notesApi.updateCommentStatus(noteId, commentId, status),
    onSuccess: (_, { noteId, status }) => {
      void queryClient.invalidateQueries({ queryKey: NOTE_RESOURCE_KEYS.comments(noteId) });
      toast.success(status === "resolved" ? "Comentário resolvido" : "Comentário reaberto");
    },
    onError: (error: Error) => toast.error(`Não foi possível atualizar o comentário: ${error.message}`),
  });
}

/** Snapshots imutáveis disponíveis no histórico de uma nota. */
export function useNoteRevisions(noteId?: string) {
  return useQuery({
    queryKey: NOTE_RESOURCE_KEYS.revisions(noteId),
    queryFn: ({ signal }) => notesApi.listRevisions(noteId!, { signal }),
    enabled: Boolean(noteId),
    staleTime: 1000 * 60,
    select: (result) => result.data,
  });
}

/** Menções estruturadas já persistidas para uma nota. */
export function useNoteMentions(noteId?: string) {
  return useQuery({
    queryKey: NOTE_RESOURCE_KEYS.mentions(noteId),
    queryFn: ({ signal }) => notesApi.listMentions(noteId!, { signal }),
    enabled: Boolean(noteId),
    staleTime: 1000 * 30,
    select: (result) => result.data,
  });
}

export function useNoteBacklinks(noteId?: string) {
  return useQuery({
    queryKey: NOTE_RESOURCE_KEYS.backlinks(noteId),
    queryFn: ({ signal }) => notesApi.listBacklinks(noteId!, { signal }),
    enabled: Boolean(noteId),
    staleTime: 1000 * 30,
    select: (result) => result.data,
  });
}

export function useRevokeNotePermission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ noteId, permissionId }: { noteId: string; permissionId: string }) => notesApi.revokePermission(noteId, permissionId),
    onSuccess: (_, { noteId }) => {
      void queryClient.invalidateQueries({ queryKey: ["workers", "notes", noteId, "permissions"] });
      void queryClient.invalidateQueries({ queryKey: ["workers", "notes"] });
      toast.success("Acesso revogado");
    },
    onError: (error: Error) => toast.error(`Não foi possível revogar o acesso: ${error.message}`),
  });
}

export function useCreateNoteMention() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ noteId, ...payload }: { noteId: string; mentionType: import("@/api/v2/notes").NoteMentionRecord["mentionType"]; targetId: string; displayLabel?: string }) => notesApi.createMention(noteId, payload),
    onSuccess: (_, { noteId }) => {
      void queryClient.invalidateQueries({ queryKey: ["workers", "notes", noteId] });
      toast.success("Menção adicionada");
    },
    onError: (error: Error) => toast.error(`Não foi possível adicionar a menção: ${error.message}`),
  });
}

export function useUploadNoteAttachment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ noteId, file }: { noteId: string; file: File }) => notesApi.uploadAttachment(noteId, file),
    onSuccess: (_, { noteId }) => { void queryClient.invalidateQueries({ queryKey: NOTE_RESOURCE_KEYS.attachments(noteId) }); toast.success("Anexo enviado"); },
    onError: (error: Error) => toast.error(`Não foi possível enviar o anexo: ${error.message}`),
  });
}

/** Metadados de anexos que o usuário já está autorizado a visualizar. */
export function useNoteAttachments(noteId?: string) {
  return useQuery({
    queryKey: NOTE_RESOURCE_KEYS.attachments(noteId),
    queryFn: () => notesApi.listAttachments(noteId!),
    enabled: Boolean(noteId),
    staleTime: 1000 * 30,
    select: (result) => result.data,
  });
}

export function useDeleteNoteAttachment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ noteId, attachmentId }: { noteId: string; attachmentId: string }) => notesApi.deleteAttachment(noteId, attachmentId),
    onSuccess: (_, { noteId }) => {
      void queryClient.invalidateQueries({ queryKey: NOTE_RESOURCE_KEYS.attachments(noteId) });
      toast.success("Anexo removido");
    },
    onError: (error: Error) => toast.error(`Não foi possível remover o anexo: ${error.message}`),
  });
}
