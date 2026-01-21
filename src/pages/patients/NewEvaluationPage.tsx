import { useState, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, BookmarkPlus, LayoutDashboard, FileText, Activity, Map, Plus, Save } from 'lucide-react';

import { MainLayout } from '@/components/layout/MainLayout';
import { PatientDashboard360 } from '@/components/patient/dashboard/PatientDashboard360';
import { PhysicalExamForm } from '@/components/patient/forms/PhysicalExamForm';
import { PainMapManager } from '@/components/evolution/PainMapManager';
import {
    EvaluationTemplateSelector,
    DynamicFieldRenderer,
    AddCustomFieldDialog,
    SaveAsTemplateDialog,
} from '@/components/evaluation';
import type { EvaluationTemplate, TemplateField } from '@/components/evaluation';
import { Button } from '@/components/shared/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/shared/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { PatientHelpers } from '@/types';

// Helper function to generate UUID - using crypto.randomUUID() to avoid "ne is not a function" error in production
const uuidv4 = (): string => crypto.randomUUID();

export default function NewEvaluationPage() {
    const { patientId } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const appointmentId = searchParams.get('appointmentId');
    const { toast } = useToast();

    const [activeTab, setActiveTab] = useState('dashboard');
    const [isSaving, setIsSaving] = useState(false);

    // Template-based Anamnesis State
    const [selectedTemplate, setSelectedTemplate] = useState<EvaluationTemplate | null>(null);
    const [customFields, setCustomFields] = useState<TemplateField[]>([]);
    const [fieldValues, setFieldValues] = useState<Record<string, unknown>>({});
    const [showAddFieldDialog, setShowAddFieldDialog] = useState(false);
    const [showSaveTemplateDialog, setShowSaveTemplateDialog] = useState(false);

    // Physical Exam State (keep existing)
    const [physicalExamData, setPhysicalExamData] = useState({});

    // Combined fields (template + custom)
    const allFields = [...(selectedTemplate?.fields || []), ...customFields];

    // Fetch Patient Data
    const { data: patient, isLoading } = useQuery({
        queryKey: ['patient-full', patientId],
        queryFn: async () => {
            if (!patientId) return null;

            const [patientRes, goalsRes, pathologiesRes, surgeriesRes, appointmentsRes] = await Promise.all([
                supabase.from('patients').select('*').eq('id', patientId).single(),
                supabase.from('patient_goals').select('*').eq('patient_id', patientId),
                supabase.from('patient_pathologies').select('*').eq('patient_id', patientId),
                supabase.from('patient_surgeries').select('*').eq('patient_id', patientId),
                supabase.from('appointments').select('*').eq('patient_id', patientId).order('appointment_date', { ascending: false }).limit(20)
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

    // Handle template selection
    const handleTemplateSelect = useCallback((template: EvaluationTemplate | null) => {
        setSelectedTemplate(template);
        // Optionally reset custom fields when changing template
        // setCustomFields([]);
    }, []);

    // Handle field value change
    const handleFieldValueChange = useCallback((fieldId: string, value: unknown) => {
        setFieldValues(prev => ({ ...prev, [fieldId]: value }));
    }, []);

    // Handle adding custom field
    const handleAddCustomField = useCallback((field: Omit<TemplateField, 'id' | 'ordem'>) => {
        const newField: TemplateField = {
            ...field,
            id: uuidv4(),
            ordem: allFields.length + 1,
        };
        setCustomFields(prev => [...prev, newField]);
    }, [allFields.length]);

    const handleSaveEvaluation = async () => {
        if (!patientId) return;
        setIsSaving(true);
        try {
            // Save evaluation responses
            if (selectedTemplate && Object.keys(fieldValues).length > 0) {
                const { error: responseError } = await supabase
                    .from('patient_evaluation_responses')
                    .insert({
                        patient_id: patientId,
                        form_id: selectedTemplate.id,
                        responses: fieldValues,
                        appointment_id: appointmentId || null,
                    });

                if (responseError) {
                    console.error('Error saving evaluation responses:', responseError);
                }
            }

            toast({
                title: "Avaliação Salva",
                description: "Os dados da avaliação foram registrados com sucesso."
            });

            // Update appointment status if applicable
            if (appointmentId) {
                await supabase.from('appointments').update({ status: 'realizado' }).eq('id', appointmentId);
            }

            navigate('/schedule');
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
                        </TabsList>

                        <div className="mt-6 animate-in fade-in-50 duration-500">

                            <TabsContent value="dashboard" className="m-0">
                                <PatientDashboard360
                                    patient={patient}
                                    appointments={patient.appointments}
                                    currentAppointmentId={appointmentId || undefined}
                                    activeGoals={patient.goals?.filter((g: { status?: string }) => g.status === 'em_andamento') || []}
                                    activePathologies={patient.pathologies?.filter((p: { status?: string }) => p.status !== 'resolvido') || []}
                                    surgeries={patient.surgeries || []}
                                    onAction={(action) => setActiveTab(action === 'goals' ? 'dashboard' : action)}
                                />
                            </TabsContent>

                            <TabsContent value="anamnesis" className="m-0">
                                <div className="max-w-4xl mx-auto space-y-6">
                                    {/* Header with Template Selector */}
                                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                                        <div>
                                            <h2 className="text-2xl font-bold tracking-tight">Anamnese Detalhada</h2>
                                            <p className="text-muted-foreground">Colete o histórico clínico completo do paciente.</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setShowAddFieldDialog(true)}
                                            >
                                                <Plus className="mr-2 h-4 w-4" />
                                                Adicionar Campo
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setShowSaveTemplateDialog(true)}
                                                disabled={allFields.length === 0}
                                            >
                                                <BookmarkPlus className="mr-2 h-4 w-4" />
                                                Salvar Template
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Template Selector */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Template de Avaliação</label>
                                        <EvaluationTemplateSelector
                                            selectedTemplateId={selectedTemplate?.id}
                                            onTemplateSelect={handleTemplateSelect}
                                            autoLoadDefault={true}
                                        />
                                    </div>

                                    {/* Dynamic Fields */}
                                    <DynamicFieldRenderer
                                        fields={allFields}
                                        values={fieldValues}
                                        onChange={handleFieldValueChange}
                                    />

                                    {/* Custom Fields Note */}
                                    {customFields.length > 0 && (
                                        <div className="text-sm text-muted-foreground text-center py-2">
                                            {customFields.length} campo(s) personalizado(s) adicionado(s)
                                        </div>
                                    )}
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
                                        sessionId={appointmentId || undefined}
                                    />
                                </div>
                            </TabsContent>

                        </div>
                    </Tabs>

                </div>
            </div>

            {/* Dialogs */}
            <AddCustomFieldDialog
                open={showAddFieldDialog}
                onOpenChange={setShowAddFieldDialog}
                onAddField={handleAddCustomField}
            />

            <SaveAsTemplateDialog
                open={showSaveTemplateDialog}
                onOpenChange={setShowSaveTemplateDialog}
                fields={allFields}
            />
        </MainLayout>
    );
}
