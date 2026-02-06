/**
 * Serviço de exercícios baseado em Firestore.
 * Usado pela web para listar e fazer CRUD na coleção `exercises` (dados migrados do Supabase).
 */
import {

  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  limit,
  writeBatch,
} from '@/integrations/firebase/app';
import { db } from '@/integrations/firebase/app';
import type { Exercise } from '@/types';
import type { ExerciseFilters } from './exercises';
import { toProxyUrl } from '@/lib/storageProxy';

const COLLECTION = 'exercises';
const MAX_LIST = 1000;

/** Remove undefined values; Firestore does not accept undefined. */
function stripUndefined<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as Record<string, unknown>;
}

function docToExercise(docSnap: { id: string; data: () => Record<string, unknown> }): Exercise {
  const data = docSnap.data();
  const imageUrl = (data.image_url as string) ?? (data.thumbnail_url as string) ?? (data.imageUrl as string) ?? undefined;
  const videoUrl = (data.video_url as string) ?? (data.videoUrl as string) ?? undefined;
  return {
    id: docSnap.id,
    name: (data.name as string) ?? '',
    category: data.category as string | undefined,
    difficulty: data.difficulty as string | undefined,
    video_url: toProxyUrl(videoUrl), // Use proxy URL for videos too
    image_url: toProxyUrl(imageUrl), // Use proxy URL to bypass CORS issues
    description: data.description as string | undefined,
    instructions: data.instructions as string | undefined,
    sets: data.sets as number | undefined,
    repetitions: data.repetitions as number | undefined,
    duration: data.duration as number | undefined,
    targetMuscles: data.targetMuscles as string[] | undefined,
    equipment: data.equipment as string[] | undefined,
    indicated_pathologies: data.indicated_pathologies as string[] | undefined,
    contraindicated_pathologies: data.contraindicated_pathologies as string[] | undefined,
    body_parts: data.body_parts as string[] | undefined,
    created_at: data.created_at as string | undefined,
    updated_at: data.updated_at as string | undefined,
  };
}

function applyFilters(items: Exercise[], filters?: ExerciseFilters): Exercise[] {
  if (!filters) return items;
  let result = items;
  if (filters.category) {
    result = result.filter((e) => e.category === filters!.category);
  }
  if (filters.difficulty) {
    result = result.filter((e) => e.difficulty === filters!.difficulty);
  }
  if (filters.searchTerm && filters.searchTerm.trim()) {
    const term = filters.searchTerm.trim().toLowerCase();
    result = result.filter(
      (e) =>
        (e.name && e.name.toLowerCase().includes(term)) ||
        (e.description && e.description.toLowerCase().includes(term))
    );
  }
  if (filters.equipment && filters.equipment.length > 0) {
    result = result.filter((e) => {
      const eq = e.equipment ?? [];
      return filters!.equipment!.some((f) => eq.includes(f));
    });
  }
  return result;
}

export const exercisesFirestore = {
  async getExercises(filters?: ExerciseFilters): Promise<Exercise[]> {
    const q = query(collection(db, COLLECTION), limit(MAX_LIST));
    const snapshot = await getDocs(q);
    const list = snapshot.docs.map((d) => docToExercise(d));
    list.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '', 'pt'));
    return applyFilters(list, filters);
  },

  async getExerciseById(id: string): Promise<Exercise | null> {
    const ref = doc(db, COLLECTION, id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return docToExercise(snap);
  },

  async createExercise(payload: Omit<Exercise, 'id'>): Promise<Exercise> {
    const now = new Date().toISOString();
    const data = stripUndefined({
      ...payload,
      created_at: now,
      updated_at: now,
    } as Record<string, unknown>);
    const ref = await addDoc(collection(db, COLLECTION), data);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('Exercício não encontrado após criação');
    return docToExercise(snap);
  },

  async updateExercise(id: string, updates: Partial<Exercise>): Promise<Exercise> {
    const ref = doc(db, COLLECTION, id);
    const { id: _id, ...rest } = updates as Partial<Exercise> & { id?: string };
    const payload = stripUndefined({
      ...rest,
      updated_at: new Date().toISOString(),
    } as Record<string, unknown>);
    await updateDoc(ref, payload);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('Exercício não encontrado após atualização');
    return docToExercise(snap);
  },

  async deleteExercise(id: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTION, id));
  },

  async mergeExercises(
    keepId: string,
    mergeIds: string[]
  ): Promise<{ success: boolean; deletedCount: number }> {
    const keepRef = doc(db, COLLECTION, keepId);
    const keepSnap = await getDoc(keepRef);
    if (!keepSnap.exists()) {
      throw new Error('Exercício principal não encontrado');
    }
    const toMerge = mergeIds.filter((id) => id !== keepId);
    if (toMerge.length === 0) {
      return { success: true, deletedCount: 0 };
    }
    const batch = writeBatch(db);
    for (const id of toMerge) {
      batch.delete(doc(db, COLLECTION, id));
    }
    await batch.commit();
    return { success: true, deletedCount: toMerge.length };
  },
};
