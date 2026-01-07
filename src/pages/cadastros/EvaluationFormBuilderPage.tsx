import { useParams, useNavigate } from 'react-router-dom';
import { FormBuilder } from '@/components/forms/builder/FormBuilder';
import { useEvaluationFormWithFields } from '@/hooks/useEvaluationForms';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function EvaluationFormBuilderPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { data: form, isLoading, error } = useEvaluationFormWithFields(id);

    if (isLoading) {
        return (
            <MainLayout>
                <div className="space-y-4">
                    <div className="flex items-center gap-4 mb-6">
                        <Skeleton className="h-10 w-24" />
                        <Skeleton className="h-8 w-64" />
                    </div>
                    <div className="grid grid-cols-12 gap-6">
                        <div className="col-span-9 space-y-4">
                            <Skeleton className="h-32 w-full" />
                            <Skeleton className="h-24 w-full" />
                            <Skeleton className="h-24 w-full" />
                        </div>
                        <div className="col-span-3">
                            <Skeleton className="h-[500px] w-full" />
                        </div>
                    </div>
                </div>
            </MainLayout>
        );
    }

    if (error) {
        return (
            <MainLayout>
                <div className="flex flex-col items-center justify-center h-[50vh] text-center">
                    <h2 className="text-2xl font-bold text-destructive mb-2">Erro ao carregar ficha</h2>
                    <p className="text-muted-foreground mb-4">Não foi possível carregar os dados da ficha de avaliação.</p>
                    <Button onClick={() => navigate('/cadastros/fichas-avaliacao')}>Voltar para Lista</Button>
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <div className="mb-4">
                <Button variant="ghost" onClick={() => navigate('/cadastros/fichas-avaliacao')} className="gap-2 mb-2 pl-0 hover:bg-transparent hover:text-primary">
                    <ArrowLeft size={16} /> Voltar para Lista
                </Button>
                <h1 className="text-2xl font-bold text-primary">Construtor de Fichas</h1>
                <p className="text-muted-foreground">Configure os campos da sua ficha de avaliação.</p>
            </div>

            <FormBuilder
                formId={id}
                initialData={form || undefined}
                onSave={() => {
                    // Optional: stay on page or navigate? 
                    // Usually nice to stay to allow adding more fields, but user might want to go back.
                    // FormBuilder handles the toast.
                }}
                onBack={() => navigate('/cadastros/fichas-avaliacao')}
            />
        </MainLayout>
    );
}
