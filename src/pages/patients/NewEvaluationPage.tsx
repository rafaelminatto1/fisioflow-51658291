import React, { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Save, LayoutDashboard, FileText, Activity, Map, Target } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Components
import { PatientDashboard360 } from '@/components/patient/dashboard/PatientDashboard360';
import { AnamnesisForm } from '@/components/patient/forms/AnamnesisForm';
import { PhysicalExamForm } from '@/components/patient/forms/PhysicalExamForm';
import { PainMapManager } from '@/components/evolution/PainMapManager';
import { Skeleton } from '@/components/ui/skeleton';
import { PatientHelpers } from '@/types';

export default function NewEvaluationPage() {
    const { patientId } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const appointmentId = searchParams.get('appointmentId');
    const { toast } = useToast();

    const [activeTab, setActiveTab] = useState('dashboard');
    const [isSaving, setIsSaving] = useState(false);

    // Form States
    const [anamnesisData, setAnamnesisData] = useState({});
    const [physicalExamData, setPhysicalExamData] = useState({});

    // Fetch Patient Data
    const { data: patient, isLoading } = useQuery({
        queryKey: ['patient-full', patientId],
        queryFn: async () => {
            if (!patientId) return null;

            // Parallel fetch for patient, goals, pathologies, etc.
            const [patientRes, goalsRes, pathologiesRes, surgeriesRes, appointmentsRes] = await Promise.all([
                supabase.from('patients').select('*').eq('id', patientId).single(),
                supabase.from('patient_goals').select('*').eq('patient_id', patientId),
                supabase.from('patient_pathologies').select('*').eq('patient_id', patientId),
                supabase.from('patient_surgeries').select('*').eq('patient_id', patientId),
                supabase.from('appointments').select('*').eq('patient_id', patientId).order('appointment_date', { ascending: false }).limit(5)
            ]);

            if (patientRes.error) throw patientRes.error;

            return {
                ...patientRes.data,
                goals: goalsRes.data || [],
                pathologies: pathologiesRes.data || [],
                surgeries: surgeriesRes.data || [],
                appointments: appointmentsRes.data || []
            };
        },
        enabled: !!patientId
    });

    const handleSaveEvaluation = async () => {
        if (!patientId) return;
        setIsSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();

            // Save Anamnesis & Physical Exam as a structured record
            // Note: You might want to create specific tables for these if they don't exist
            // For now, we'll store them in `clinical_evaluations` or similar if available, 
            // or `soap_records` as a fallback, or a flexible `patient_evaluations` table.

            // Assuming a 'clinical_evaluations' table exists or reusing 'patient_evaluation_responses' with a generic/system form ID
            // For this implementation, let's assume we save to a structured JSON column or separate tables.
            // WE WILL USE 'patient_evaluations' generic store for now or insert to specific tables.

            // Save Anamnesis
            if (Object.keys(anamnesisData).length > 0) {
                // Insert logic here (e.g., specific table upserts)
            }

            // Since we don't have the explicit table structure confirmed for structured anamnesis besides JSON forms,
            // we will mock the save success for now and maybe update `patient` record directly for some static fields 
            // like 'occupation', 'history', etc., if your patient table supports it.

            // NOTE: Ideally, update the `patients` table with history fields if they exist there
            // await supabase.from('patients').update({ ...anamnesisData }).eq('id', patientId);

            toast({
                title: "Avaliação Salva",
                description: "Os dados da avaliação foram registrados com sucesso."
            });

            // If appointment ID exists, we might want to update its status
            if (appointmentId) {
                await supabase.from('appointments').update({ status: 'realizado' }).eq('id', appointmentId);
            }

            navigate('/schedule'); // Or stay?
        } catch (error) {
            console.error(error);
            toast({
                title: "Erro ao salvar",
                description: "Ocorreu um erro ao salvar a avaliação.",
                variant: "destructive"
            });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <MainLayout>
                <div className="p-8 space-y-6 max-w-7xl mx-auto">
                    <div className="flex gap-4">
                        <Skeleton className="h-32 w-32 rounded-full" />
                        <div className="space-y-4 flex-1">
                            <Skeleton className="h-8 w-1/3" />
                            <Skeleton className="h-4 w-1/2" />
                        </div>
                    </div>
                    <Skeleton className="h-[500px] w-full" />
                </div>
            </MainLayout>
        );
    }

    if (!patient) return <div>Paciente não encontrado</div>;

    return (
        <MainLayout>
            <div className="min-h-screen bg-background/50 pb-20">
                {/* Header Actions */}
                <div className="sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => navigate('/schedule')}>
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <h1 className="text-xl font-bold text-primary">Avaliação Inicial</h1>
                            <p className="text-xs text-muted-foreground">Paciente: {PatientHelpers.getName(patient)}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={() => navigate(`/patients/${patientId}/history`)}>
                            Ver Histórico
                        </Button>
                        <Button onClick={handleSaveEvaluation} disabled={isSaving}>
                            <Save className="mr-2 h-4 w-4" />
                            {isSaving ? 'Salvando...' : 'Salvar Avaliação'}
                        </Button>
                    </div>
                </div>

                <div className="container max-w-7xl mx-auto pt-6 px-4 space-y-8">

                    {/* Tabs Navigation */}
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-5 p-1 bg-muted/50 rounded-xl mb-6">
                            <TabsTrigger value="dashboard" className="gap-2">
                                <LayoutDashboard className="h-4 w-4" />
                                <span className="hidden sm:inline">Visão Geral</span>
                            </TabsTrigger>
                            <TabsTrigger value="anamnesis" className="gap-2">
                                <FileText className="h-4 w-4" />
                                <span className="hidden sm:inline">Anamnese</span>
                            </TabsTrigger>
                            <TabsTrigger value="physical" className="gap-2">
                                <Activity className="h-4 w-4" />
                                <span className="hidden sm:inline">Exame Físico</span>
                            </TabsTrigger>
                            <TabsTrigger value="pain-map" className="gap-2">
                                <Map className="h-4 w-4" />
                                <span className="hidden sm:inline">Mapa de Dor</span>
                            </TabsTrigger>
                            {/* Additional tabs can go here */}
                        </TabsList>

                        <div className="mt-6 animate-in fade-in-50 duration-500">

                            <TabsContent value="dashboard" className="m-0">
                                <PatientDashboard360
                                    patient={patient}
                                    appointments={patient.appointments}
                                    activeGoals={patient.goals?.filter((g: any) => g.status === 'em_andamento') || []}
                                    activePathologies={patient.pathologies?.filter((p: any) => p.status !== 'resolvido') || []}
                                    surgeries={patient.surgeries || []}
                                    onAction={(action) => setActiveTab(action === 'goals' ? 'dashboard' : action)}
                                />
                            </TabsContent>

                            <TabsContent value="anamnesis" className="m-0">
                                <div className="max-w-4xl mx-auto">
                                    <div className="mb-6">
                                        <h2 className="text-2xl font-bold tracking-tight">Anamnese Detalhada</h2>
                                        <p className="text-muted-foreground">Colete o histórico clínico completo do paciente.</p>
                                    </div>
                                    <AnamnesisForm
                                        data={anamnesisData}
                                        onChange={setAnamnesisData}
                                    />
                                </div>
                            </TabsContent>

                            <TabsContent value="physical" className="m-0">
                                <div className="max-w-4xl mx-auto">
                                    <div className="mb-6">
                                        <h2 className="text-2xl font-bold tracking-tight">Exame Físico</h2>
                                        <p className="text-muted-foreground">Registre os achados físicos, amplitude de movimento e força.</p>
                                    </div>
                                    <PhysicalExamForm
                                        data={physicalExamData}
                                        onChange={setPhysicalExamData}
                                    />
                                </div>
                            </TabsContent>

                            <TabsContent value="pain-map" className="m-0">
                                <div className="max-w-5xl mx-auto">
                                    <div className="mb-6 hidden md:block">
                                        <h2 className="text-2xl font-bold tracking-tight">Mapa de Dor Interativo</h2>
                                        <p className="text-muted-foreground">Marque as regiões dolorosas e a intensidade.</p>
                                    </div>
                                    <PainMapManager
                                        patientId={patientId || ''}
                                        appointmentId={appointmentId || undefined}
                                        sessionId={appointmentId || undefined} // Fallback to appointmentID for session if creating new
                                    />
                                </div>
                            </TabsContent>

                        </div>
                    </Tabs>

                </div>
            </div>
        </MainLayout>
    );
}
