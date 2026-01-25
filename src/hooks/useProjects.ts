import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getFirebaseDb, getFirebaseAuth } from '@/integrations/firebase/app';
import { collection, query, where, getDocs, doc, getDoc, orderBy, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';

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

const db = getFirebaseDb();
const auth = getFirebaseAuth();

export function useProjects() {
    return useQuery({
        queryKey: ['projects'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('projects')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Fetch manager profiles from Firestore
            const managerIds = [...new Set((data || []).map(p => p.manager_id).filter(Boolean))];
            const profiles = new Map<string, any>();

            await Promise.all(managerIds.map(async (id) => {
                const snap = await getDoc(doc(db, 'profiles', id!));
                if (snap.exists()) {
                    profiles.set(id!, snap.data());
                }
            }));

            return (data || []).map(p => ({
                ...p,
                manager: profiles.get(p.manager_id || '') ? {
                    full_name: profiles.get(p.manager_id || '').full_name,
                    avatar_url: profiles.get(p.manager_id || '').avatar_url
                } : undefined
            })) as Project[];
        }
    });
}

export function useProject(id: string) {
    return useQuery({
        queryKey: ['projects', id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('projects')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            if (!data) return null;

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

            return { ...data, manager } as Project;
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
            const profileSnap = await getDocs(query(collection(db, 'profiles'), where('user_id', '==', firebaseUser.uid)));
            const profile = !profileSnap.empty ? profileSnap.docs[0].data() : null;

            const { data, error } = await supabase
                .from('projects')
                .insert([{
                    title: project.title!,
                    description: project.description,
                    status: project.status || 'active',
                    start_date: project.start_date,
                    end_date: project.end_date,
                    organization_id: profile?.organization_id,
                    created_by: firebaseUser.uid,
                    manager_id: project.manager_id
                }])
                .select()
                .single();

            if (error) throw error;
            return data;
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
            const { data, error } = await supabase
                .from('projects')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
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
            const { error } = await supabase
                .from('projects')
                .delete()
                .eq('id', id);

            if (error) throw error;
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
