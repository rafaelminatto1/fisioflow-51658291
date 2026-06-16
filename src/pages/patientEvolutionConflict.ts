type EvolutionConflictActor = {
  created_by?: string;
  last_edited_by?: string;
};

export function getEvolutionConflictActorId(current?: EvolutionConflictActor | null): string | null {
  return current?.last_edited_by ?? current?.created_by ?? null;
}

export function shouldOpenEvolutionConflictModal(params: {
  currentUserId?: string | null;
  current?: EvolutionConflictActor | null;
}): boolean {
  const actorId = getEvolutionConflictActorId(params.current);

  if (!actorId) return true;
  if (!params.currentUserId) return true;

  return actorId !== params.currentUserId;
}
