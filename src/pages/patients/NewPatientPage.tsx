import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { PatientForm } from '@/components/patients/PatientForm';
import { useCreatePatient, type PatientCreateInput } from '@/hooks/usePatientCrud';
import { useOrganizations } from '@/hooks/useOrganizations';
import { Button } from '@/components/ui/button';
import { ArrowLeft, UserPlus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export const NewPatientPage = () => {
    const navigate = useNavigate();
    const { currentOrganization, isCurrentOrgLoading, currentOrgError } = useOrganizations();
    const createMutation = useCreatePatient();

    const handleSubmit = async (data: PatientCreateInput) => {
        try {
            if (!currentOrganization?.id) {
                toast.error('Organização não encontrada');
                return;
            }
            const result = await createMutation.mutateAsync(data);
            navigate(`/patients/${result.id}`);
        } catch (error) {
            console.error('Erro ao criar paciente:', error);
        }
    };

    const isLoading = createMutation.isPending;

    if (isCurrentOrgLoading) {
        return (
            <MainLayout>
                <div className="flex flex-col items-center justify-center h-[50vh]">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                    <p className="text-muted-foreground">Carregando organização...</p>
                </div>
            </MainLayout>
        );
    }

    if (currentOrgError || !currentOrganization?.id) {
        return (
            <MainLayout>
                <div className="bg-destructive/10 text-destructive p-6 rounded-xl border border-destructive/20 text-center mx-auto my-10 max-w-lg">
                    <p className="font-medium">Erro ao carregar organização</p>
                    <p className="text-sm opacity-80 mt-1">
                        Não foi possível identificar sua organização atual.
                        {currentOrgError && ` Erro: ${currentOrgError.message}`}
                    </p>
                    <p className="text-sm opacity-80 mt-1">
                        Verifique se você está logado e se sua conta está associada a uma organização.
                    </p>
                    <Button variant="outline" className="mt-4 border-destructive/30 hover:bg-destructive/10" onClick={() => window.location.reload()}>
                        Recarregar Página
                    </Button>
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <div className="space-y-6 max-w-5xl mx-auto pb-20">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/patients')} className="-ml-2">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <span className="text-sm font-medium">Voltar para Pacientes</span>
                </div>

                <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-3 rounded-xl">
                        <UserPlus className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold">Cadastrar Novo Paciente</h1>
                        <p className="text-muted-foreground text-sm">Insira as informações básicas e clínicas do paciente</p>
                    </div>
                </div>

                <div className="bg-card rounded-xl shadow-sm border p-1 animate-fade-in">
                    <PatientForm
                        organizationId={currentOrganization.id}
                        onSubmit={handleSubmit}
                        isLoading={isLoading}
                        submitLabel="Finalizar Cadastro"
                    />
                </div>
            </div>
        </MainLayout>
    );
};

export default NewPatientPage;
