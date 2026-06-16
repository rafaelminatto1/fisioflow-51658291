type EvolutionConflictActor = {
  created_by?: string;
  last_edited_by?: string;
  last_edited_device_id?: string;
};

export function getEvolutionConflictActorId(current?: EvolutionConflictActor | null): string | null {
  return current?.last_edited_by ?? current?.created_by ?? null;
}

export function shouldOpenEvolutionConflictModal(params: {
  currentUserId?: string | null;
  currentDeviceId?: string | null;
  current?: EvolutionConflictActor | null;
}): boolean {
  const actorId = getEvolutionConflictActorId(params.current);

  if (!actorId) return true;
  if (!params.currentUserId) return true;

  if (actorId !== params.currentUserId) {
    return true;
  }

  const actorDeviceId = params.current?.last_edited_device_id ?? null;
  if (!actorDeviceId || !params.currentDeviceId) {
    return false;
  }

  return actorDeviceId !== params.currentDeviceId;
}
