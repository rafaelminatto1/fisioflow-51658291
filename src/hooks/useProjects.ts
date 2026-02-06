/**
 * useProjects - Migrated to Firebase
 *
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, query as firestoreQuery, where, getDocs, doc, getDoc, orderBy, addDoc, updateDoc, deleteDoc, db, getFirebaseAuth } from '@/integrations/firebase/app';
import { toast } from 'sonner';
import { normalizeFirestoreData } from '@/utils/firestoreData';

export interface Project {
    id: string;
    title: string;
    description?: string;
    status: 'active' | 'completed' | 'archived' | 'on_hold';
    start_date?: string;
    end_date?: string;
    organization_id: string;
    created_by: string;
    manager_id?: string;
    created_at: string;
    updated_at: string;
    manager?: {
        full_name: string;
        avatar_url?: string;
    };
}

const auth = getFirebaseAuth();

interface Profile {
  full_name: string;
  avatar_url?: string;
}

// Helper to convert doc
const convertDoc = (doc: { id: string; data: () => Record<string, unknown> }): Project => ({ id: doc.id, ...normalizeFirestoreData(doc.data()) } as Project);

export function useProjects() {
    return useQuery({
        queryKey: ['projects'],
        queryFn: async () => {
            const q = firestoreQuery(collection(db, 'projects'), orderBy('created_at', 'desc'));
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(convertDoc);

            // Fetch manager profiles from Firestore
            const managerIds = [...new Set(data.map(p => p.manager_id).filter(Boolean))];
            const profiles = new Map<string, Profile>();

            await Promise.all(managerIds.map(async (id) => {
                if (!id) return;
                const snap = await getDoc(doc(db, 'profiles', id));
                if (snap.exists()) {
                    profiles.set(id, snap.data());
                }
            }));

            return data.map(p => ({
                ...p,
                manager: p.manager_id && profiles.get(p.manager_id) ? {
                    full_name: profiles.get(p.manager_id).full_name,
                    avatar_url: profiles.get(p.manager_id).avatar_url
                } : undefined
            }));
        }
    });
}

export function useProject(id: string) {
    return useQuery({
        queryKey: ['projects', id],
        queryFn: async () => {
            if (!id) return null;
            const docRef = doc(db, 'projects', id);
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) return null;

            const data = convertDoc(docSnap);

            let manager = undefined;
            if (data.manager_id) {
                const snap = await getDoc(doc(db, 'profiles', data.manager_id));
                if (snap.exists()) {
                    manager = {
                        full_name: snap.data().full_name,
                        avatar_url: snap.data().avatar_url
                    };
                }
            }

            return { ...data, manager };
        },
        enabled: !!id
    });
}

export function useCreateProject() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (project: Partial<Project>) => {
            const firebaseUser = auth.currentUser;
            if (!firebaseUser) throw new Error('User not authenticated');

            // Get organization ID from Firestore profile
            // We should use `useAuth` hook in components but here we are in a hook, 
            // relying on auth.currentUser is fine if strictly client-side.
            // Better to fetch profile by user_id
            const q = firestoreQuery(collection(db, 'profiles'), where('user_id', '==', firebaseUser.uid));
            const profileSnap = await getDocs(q);
            const profile = !profileSnap.empty ? profileSnap.docs[0].data() : null;

            if (!profile?.organization_id) throw new Error('Organization not found');

            const newProject = {
                title: project.title!,
                description: project.description || null,
                status: project.status || 'active',
                start_date: project.start_date || null,
                end_date: project.end_date || null,
                organization_id: profile.organization_id,
                created_by: firebaseUser.uid,
                manager_id: project.manager_id || null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            const docRef = await addDoc(collection(db, 'projects'), newProject);
            const newDoc = await getDoc(docRef);
            return convertDoc(newDoc);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            toast.success('Projeto criado com sucesso!');
        },
        onError: (error: Error) => {
            toast.error('Erro ao criar projeto: ' + error.message);
        }
    });
}

export function useUpdateProject() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, ...updates }: Partial<Project> & { id: string }) => {
            const docRef = doc(db, 'projects', id);
            await updateDoc(docRef, { ...updates, updated_at: new Date().toISOString() });

            const docSnap = await getDoc(docRef);
            return convertDoc(docSnap);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            toast.success('Projeto atualizado com sucesso!');
        },
        onError: (error: Error) => {
            toast.error('Erro ao atualizar projeto: ' + error.message);
        }
    });
}

export function useDeleteProject() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            await deleteDoc(doc(db, 'projects', id));
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            toast.success('Projeto excluído com sucesso!');
        },
        onError: (error: Error) => {
            toast.error('Erro ao excluir projeto: ' + error.message);
        }
    });
}