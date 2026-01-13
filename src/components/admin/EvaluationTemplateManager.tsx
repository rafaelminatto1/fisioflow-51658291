import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from '@/components/ui/badge';
import { Plus, Edit2, Trash2, Check, X } from 'lucide-react';
import { toast } from 'sonner';

interface Template {
    id: string;
    title: string;
    description: string;
    category: string;
    content: Record<string, unknown>;
    isActive: boolean;
}

export const EvaluationTemplateManager = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
    const queryClient = useQueryClient();

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: '',
        content: '{}'
    });

    const { data: templates = [], isLoading } = useQuery({
        queryKey: ['evaluation-templates-admin'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('evaluation_templates')
                .select('*')
                .order('category', { ascending: true });

            if (error) throw error;
            return data;
        }
    });

    const saveMutation = useMutation({
        mutationFn: async (data: typeof formData) => {
            // Validate JSON content
            const contentJson: Record<string, unknown> = typeof data.content === 'string'
                ? JSON.parse(data.content)
                : data.content;

            const payload = {
                title: data.title,
                description: data.description,
                category: data.category,
                content: contentJson,
                is_active: true
            };

            if (editingTemplate) {
                const { error } = await supabase
                    .from('evaluation_templates')
                    .update(payload)
                    .eq('id', editingTemplate.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('evaluation_templates')
                    .insert(payload);
                if (error) throw error;
            }
        },
        onSuccess: () => {
            toast.success(editingTemplate ? 'Template atualizado!' : 'Template criado!');
            queryClient.invalidateQueries({ queryKey: ['evaluation-templates-admin'] });
            setIsOpen(false);
            resetForm();
        },
        onError: (err: Error) => {
            toast.error('Erro ao salvar: ' + err.message);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('evaluation_templates')
                .delete()
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success('Template removido.');
            queryClient.invalidateQueries({ queryKey: ['evaluation-templates-admin'] });
        }
    });

    const resetForm = () => {
        setFormData({ title: '', description: '', category: '', content: '{\n  "physical_exam": {},\n  "vital_signs": {}\n}' });
        setEditingTemplate(null);
    };

    const handleEdit = (template: Template) => {
        setEditingTemplate(template);
        setFormData({
            title: template.title,
            description: template.description || '',
            category: template.category || '',
            content: JSON.stringify(template.content, null, 2)
        });
        setIsOpen(true);
    };

    const handleSubmit = () => {
        if (!formData.title) return toast.error('Título é obrigatório');
        try {
            JSON.parse(formData.content);
        } catch {
            return toast.error('JSON inválido no conteúdo');
        }
        saveMutation.mutate(formData);
    };

    return (
        <Card className="max-w-4xl mx-auto">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Modelos de Avaliação</CardTitle>
                    <CardDescription>Gerencie os templates usados nas avaliações clínicas.</CardDescription>
                </div>
                <Button onClick={() => { resetForm(); setIsOpen(true); }}>
                    <Plus className="w-4 h-4 mr-2" /> Novo Template
                </Button>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div>Carregando...</div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Título</TableHead>
                                <TableHead>Categoria</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {templates.map((template: Template) => (
                                <TableRow key={template.id}>
                                    <TableCell className="font-medium">{template.title}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{template.category || 'Geral'}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        {template.is_active ? (
                                            <span className="flex items-center text-green-600 text-xs"><Check className="w-3 h-3 mr-1" /> Ativo</span>
                                        ) : (
                                            <span className="flex items-center text-muted-foreground text-xs"><X className="w-3 h-3 mr-1" /> Inativo</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => handleEdit(template)}>
                                            <Edit2 className="w-4 h-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => {
                                            if (confirm('Tem certeza que deseja excluir?')) deleteMutation.mutate(template.id);
                                        }}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {templates.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Nenhum template cadastrado.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                )}

                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>{editingTemplate ? 'Editar Template' : 'Novo Template'}</DialogTitle>
                            <DialogDescription>
                                Defina a estrutura JSON para pré-popular os campos da avaliação.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Título</Label>
                                    <Input
                                        value={formData.title}
                                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                                        placeholder="Ex: Avaliação de Joelho"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Categoria</Label>
                                    <Input
                                        value={formData.category}
                                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                                        placeholder="Ex: Ortopedia"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Descrição</Label>
                                <Input
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Breve descrição..."
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Conteúdo (JSON Configuration)</Label>
                                <Textarea
                                    value={formData.content}
                                    onChange={e => setFormData({ ...formData, content: e.target.value })}
                                    className="font-mono text-xs"
                                    rows={10}
                                />
                                <p className="text-[10px] text-muted-foreground">
                                    Estrutura esperada: treatment_plan: &#123; evolution, plan &#125;, physical_exam: &#123; ... &#125;, vital_signs: &#123; ... &#125;
                                </p>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3">
                            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
                            <Button onClick={handleSubmit} disabled={saveMutation.isPending}>
                                {saveMutation.isPending ? 'Salvando...' : 'Salvar Template'}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
    );
};