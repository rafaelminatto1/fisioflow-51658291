import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Project, useCreateProject, useUpdateProject } from '@/hooks/useProjects';

const projectSchema = z.object({
    title: z.string().min(1, 'Título é obrigatório'),
    description: z.string().optional(),
    status: z.enum(['active', 'completed', 'archived', 'on_hold']),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
});

type ProjectFormData = z.infer<typeof projectSchema>;

interface ProjectModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    project?: Project | null;
}

const STATUS_LABELS = {
    active: 'Ativo',
    completed: 'Concluído',
    archived: 'Arquivado',
    on_hold: 'Em Espera'
};

export function ProjectModal({ open, onOpenChange, project }: ProjectModalProps) {
    const createProject = useCreateProject();
    const updateProject = useUpdateProject();

    const form = useForm<ProjectFormData>({
        resolver: zodResolver(projectSchema),
        defaultValues: {
            title: '',
            description: '',
            status: 'active',
            start_date: '',
            end_date: ''
        }
    });

    useEffect(() => {
        if (project) {
            form.reset({
                title: project.title,
                description: project.description || '',
                status: project.status,
                start_date: project.start_date ? project.start_date.split('T')[0] : '',
                end_date: project.end_date ? project.end_date.split('T')[0] : ''
            });
        } else {
            form.reset({
                title: '',
                description: '',
                status: 'active',
                start_date: '',
                end_date: ''
            });
        }
    }, [project, form, open]);

    const onSubmit = async (data: ProjectFormData) => {
        try {
            if (project) {
                await updateProject.mutateAsync({
                    id: project.id,
                    ...data,
                    start_date: data.start_date || undefined,
                    end_date: data.end_date || undefined
                } as Partial<Project> & { id: string });
            } else {
                await createProject.mutateAsync({
                    ...data,
                    start_date: data.start_date || undefined,
                    end_date: data.end_date || undefined
                } as Partial<Project>);
            }
            onOpenChange(false);
        } catch {
            // Error handled in hooks
        }
    };

    const isPending = createProject.isPending || updateProject.isPending;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{project ? 'Editar Projeto' : 'Criar Novo Projeto'}</DialogTitle>
                    <DialogDescription>
                        {project ? 'Edite os detalhes do projeto.' : 'Adicione um novo projeto para organizar tarefas e metas.'}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Título do Projeto</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ex: Expansão da Clínica" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Descrição</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Detalhes sobre o objetivo do projeto..."
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="status"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Status</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {Object.entries(STATUS_LABELS).map(([value, label]) => (
                                                <SelectItem key={value} value={value}>
                                                    {label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="start_date"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Início</FormLabel>
                                        <FormControl>
                                            <Input type="date" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="end_date"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Previsão de Término</FormLabel>
                                        <FormControl>
                                            <Input type="date" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isPending}>
                                {isPending ? 'Salvando...' : (project ? 'Salvar Alterações' : 'Criar Projeto')}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
