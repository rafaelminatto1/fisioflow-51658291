import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

export function useProjects() {
    return useQuery({
        queryKey: ['projects'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('projects')
                .select('*, manager:profiles!projects_manager_id_fkey(full_name, avatar_url)')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return (data || []) as Project[];
        }
    });
}

export function useProject(id: string) {
    return useQuery({
        queryKey: ['projects', id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('projects')
                .select('*, manager:profiles!projects_manager_id_fkey(full_name, avatar_url)')
                .eq('id', id)
                .single();

            if (error) throw error;
            return data as Project;
        },
        enabled: !!id
    });
}

export function useCreateProject() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (project: Partial<Project>) => {
            const { data: profile } = await supabase
                .from('profiles')
                .select('organization_id')
                .single();

            const user = await supabase.auth.getUser();

            const { data, error } = await supabase
                .from('projects')
                .insert([{
                    title: project.title!,
                    description: project.description,
                    status: project.status || 'active',
                    start_date: project.start_date,
                    end_date: project.end_date,
                    organization_id: profile?.organization_id,
                    created_by: user.data.user?.id,
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
