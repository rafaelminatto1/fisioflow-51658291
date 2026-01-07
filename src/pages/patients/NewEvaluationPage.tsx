import { useNavigate, useParams } from 'react-router-dom';
import { useEvaluationFormWithFields } from '@/hooks/useEvaluationForms';
import { FormRenderer } from '@/components/forms/renderer/FormRenderer';
import { MainLayout } from '@/components/layout/MainLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { EvaluationFormField, ClinicalFieldType, EvaluationForm } from '@/types/clinical-forms';

export default function NewEvaluationPage() {
    const { patientId, formId } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();

    // Fetch Form
    const { data: form, isLoading: isLoadingForm } = useEvaluationFormWithFields(formId);

    // Fetch Patient Name (Optional, for context)
    const { data: patient } = useQuery({
        queryKey: ['patient-basic', patientId],
        queryFn: async () => {
            if (!patientId) return null;
            const { data, error } = await supabase
                .from('patients')
                .select('name')
                .eq('id', patientId)
                .single();
            if (error) throw error;
            return data;
        },
        enabled: !!patientId
    });

    // Fetch active forms list if no form selected
    const { data: availableForms } = useQuery({
        queryKey: ['evaluation-forms-active'],
        queryFn: async () => {
            if (formId) return [];
            const { data, error } = await supabase
                .from('evaluation_forms')
                .select('*')
                .eq('ativo', true)
                .order('nome');
            if (error) throw error;
            return data as EvaluationForm[];
        },
        enabled: !formId
    });

    const handleSubmit = async (data: Record<string, any>) => {
        if (!patientId || !formId) return;

        try {
            const { data: { user } } = await supabase.auth.getUser();

            const { error } = await supabase
                .from('patient_evaluation_responses')
                .insert({
                    patient_id: patientId,
                    form_id: formId,
                    respostas: data,
                    preenchido_por: user?.id
                });

            if (error) throw error;

            toast({
                title: "Avaliação Salva",
                description: "Os dados da avaliação foram registrados com sucesso."
            });

            navigate(`/patients`);

        } catch (error: any) {
            console.error('Error saving evaluation:', error);
            toast({
                title: "Erro ao salvar",
                description: "Não foi possível salvar a avaliação.",
                variant: "destructive"
            });
        }
    };

    if (isLoadingForm) {
        return (
            <MainLayout>
                <div className="space-y-6 max-w-3xl mx-auto mt-8">
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-[400px] w-full" />
                </div>
            </MainLayout>
        );
    }

    // If no formId, show selection list
    if (!formId) {
        return (
            <MainLayout>
                <div className="max-w-5xl mx-auto py-8">
                    <div className="mb-6">
                        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4 pl-0 gap-2">
                            <ArrowLeft size={16} /> Voltar
                        </Button>
                        <h1 className="text-3xl font-bold text-primary mb-2">Nova Avaliação</h1>
                        {patient && <p className="text-muted-foreground">Selecione o modelo de avaliação para: <span className="font-semibold text-foreground">{patient.name}</span></p>}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {availableForms?.map(form => (
                            <div
                                key={form.id}
                                onClick={() => navigate(`/patients/${patientId}/evaluations/new/${form.id}`)}
                                className="bg-card hover:bg-muted/50 border rounded-xl p-6 cursor-pointer transition-all hover:shadow-md hover:border-primary/50 group"
                            >
                                <h3 className="font-bold text-lg mb-2 group-hover:text-primary transition-colors">{form.nome}</h3>
                                {form.descricao && <p className="text-sm text-muted-foreground line-clamp-3">{form.descricao}</p>}
                            </div>
                        ))}
                        {availableForms?.length === 0 && (
                            <div className="col-span-full text-center py-12 text-muted-foreground bg-muted/20 rounded-xl border-dashed border-2">
                                Nenhuma ficha de avaliação disponível.
                            </div>
                        )}
                    </div>
                </div>
            </MainLayout>
        );
    }

    if (!form) {
        return (
            <MainLayout>
                <div className="flex flex-col items-center justify-center h-[50vh]">
                    <h2 className="text-xl font-semibold mb-2">Ficha não encontrada</h2>
                    <Button onClick={() => navigate(-1)}>Voltar</Button>
                </div>
            </MainLayout>
        );
    }

    // Convert fields types if necessary
    const fields = (form.fields || []).map(f => ({
        ...f,
        tipo_campo: f.tipo_campo as ClinicalFieldType,
        opcoes: typeof f.opcoes === 'string' ? JSON.parse(f.opcoes) : f.opcoes
    })) as EvaluationFormField[];

    return (
        <MainLayout>
            <div className="max-w-4xl mx-auto py-6">
                <Button variant="ghost" onClick={() => navigate(`/patients/${patientId}/evaluations/new`)} className="mb-4 pl-0 hover:bg-transparent hover:text-primary gap-2">
                    <ArrowLeft size={16} /> Voltar para Seleção
                </Button>

                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-primary mb-1">Nova Avaliação: {form.nome}</h1>
                    {patient && <p className="text-muted-foreground">Paciente: <span className="font-medium text-foreground">{patient.name}</span></p>}
                </div>

                <FormRenderer
                    form={form}
                    fields={fields}
                    onSubmit={handleSubmit}
                />
            </div>
        </MainLayout>
    );
}
