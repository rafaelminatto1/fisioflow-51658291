import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PatientHelpers } from '@/types';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
    ArrowLeft,
    Edit,
    Calendar as CalendarIcon,
    Phone,
    Mail,
    MapPin,
    FileText,
    Activity,
    DollarSign,
    Trophy,
    Files,
    Award,
    TrendingUp,
    Upload,
    Trash,
    Download,
    CreditCard,
    MoreVertical,
    File as FileIcon,
    Brain,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import EditPatientModal from '@/components/modals/EditPatientModal';

// Gamification Imports
import GamificationHeader from '@/components/gamification/GamificationHeader';
import StreakCalendar from '@/components/gamification/StreakCalendar';
import LevelJourneyMap from '@/components/gamification/LevelJourneyMap';
import { useGamification } from '@/hooks/useGamification';
import { Card } from '@/components/ui/card';

// Overview & Clinical History Imports
import { PatientEvolutionDashboard } from '@/components/patients/PatientEvolutionDashboard';
import { ProgressAnalysisCard } from '@/components/patients/ProgressAnalysisCard';
import { usePatientEvolutionReport } from '@/hooks/usePatientEvolutionReport';
import { SessionHistoryPanel } from '@/components/session/SessionHistoryPanel';
import { useSoapRecords } from '@/hooks/useSoapRecords';

// Analytics & ML Imports
import { PatientAnalyticsDashboard, PatientLifecycleChart, PatientInsightsPanel } from '@/components/patients/analytics';
import { usePatientLifecycleSummary } from '@/hooks/usePatientAnalytics';

// Financial & Documents Imports
import { usePatientDocuments, useUploadDocument, useDeleteDocument, useDownloadDocument } from '@/hooks/usePatientDocuments';
import { useFinancial } from '@/hooks/useFinancial';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const PersonalDataTab = ({ patient }: { patient: any }) => (
    <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    Contato
                </h3>
                <div className="bg-card border rounded-lg p-4 space-y-3 shadow-sm">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <span className="text-xs text-muted-foreground block">Telefone</span>
                            <span className="font-medium">{patient.phone || '-'}</span>
                        </div>
                        <div>
                            <span className="text-xs text-muted-foreground block">Email</span>
                            <span className="font-medium truncate block" title={patient.email}>{patient.email || '-'}</span>
                        </div>
                        <div>
                            <span className="text-xs text-muted-foreground block">Contato de Emergência</span>
                            <span className="font-medium">{patient.emergency_contact || '-'}</span>
                        </div>
                        <div>
                            <span className="text-xs text-muted-foreground block">Tel. Emergência</span>
                            <span className="font-medium">{patient.emergency_phone || '-'}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    Endereço
                </h3>
                <div className="bg-card border rounded-lg p-4 space-y-3 shadow-sm">
                    <div className="space-y-2">
                        <div>
                            <span className="text-xs text-muted-foreground block">Logradouro</span>
                            <span className="font-medium">{patient.address || '-'}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <span className="text-xs text-muted-foreground block">Cidade/UF</span>
                                <span className="font-medium">
                                    {patient.city || '-'} {patient.state ? `/ ${patient.state}` : ''}
                                </span>
                            </div>
                            <div>
                                <span className="text-xs text-muted-foreground block">CEP</span>
                                <span className="font-medium">{patient.zip_code || '-'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Activity className="h-5 w-5 text-muted-foreground" />
                    Saúde e Convênio
                </h3>
                <div className="bg-card border rounded-lg p-4 space-y-3 shadow-sm">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <span className="text-xs text-muted-foreground block">Convênio</span>
                            <span className="font-medium">{patient.health_insurance || 'Particular'}</span>
                        </div>
                        <div>
                            <span className="text-xs text-muted-foreground block">Número da Carteirinha</span>
                            <span className="font-medium">{patient.insurance_number || '-'}</span>
                        </div>
                        <div className="col-span-1 sm:col-span-2">
                            <span className="text-xs text-muted-foreground block">CPF</span>
                            <span className="font-medium">{patient.cpf || '-'}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    Observações
                </h3>
                <div className="bg-card border rounded-lg p-4 space-y-3 shadow-sm min-h-[120px]">
                    <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                        {patient.observations || 'Nenhuma observação registrada.'}
                    </p>
                </div>
            </div>
        </div>
    </div>
);

const OverviewTab = ({ patient }: { patient: any }) => {
    const { data: evolutionData } = usePatientEvolutionReport(patient.id);

    if (!evolutionData || evolutionData.sessions.length === 0) {
        return (
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 border rounded-lg bg-card shadow-sm">
                        <h3 className="font-semibold text-sm text-muted-foreground mb-2">Próxima Consulta</h3>
                        <p className="font-medium">Nenhuma consulta agendada</p>
                        <Button variant="link" className="p-0 h-auto text-primary">Agendar agora</Button>
                    </div>
                    <div className="p-4 border rounded-lg bg-card shadow-sm">
                        <h3 className="font-semibold text-sm text-muted-foreground mb-2">Status do Tratamento</h3>
                        <Badge variant={patient.status === 'Em Tratamento' ? 'default' : 'secondary'}>
                            {patient.status || 'Não iniciado'}
                        </Badge>
                    </div>
                    <div className="p-4 border rounded-lg bg-card shadow-sm">
                        <h3 className="font-semibold text-sm text-muted-foreground mb-2">Última Atividade</h3>
                        <p className="text-sm">Cadastro realizado em {format(new Date(patient.created_at), 'dd/MM/yyyy')}</p>
                    </div>
                </div>

                <div className="p-8 text-center border rounded-lg bg-muted/10 border-dashed">
                    <Activity className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground font-medium">Sem dados de evolução suficientes</p>
                    <p className="text-sm text-muted-foreground mt-1">Realize atendimentos e evoluções para visualizar o dashboard.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg bg-card shadow-sm">
                    <h3 className="font-semibold text-sm text-muted-foreground mb-2">Próxima Consulta</h3>
                    <p className="font-medium">--</p> {/* TODO: Fetch real next appointment */}
                    <Button variant="link" className="p-0 h-auto text-primary">Ver Agenda</Button>
                </div>
                <div className="p-4 border rounded-lg bg-card shadow-sm">
                    <h3 className="font-semibold text-sm text-muted-foreground mb-2">Status do Tratamento</h3>
                    <Badge variant={patient.status === 'Em Tratamento' ? 'default' : 'secondary'}>
                        {patient.status || 'Não iniciado'}
                    </Badge>
                </div>
                <div className="p-4 border rounded-lg bg-card shadow-sm">
                    <h3 className="font-semibold text-sm text-muted-foreground mb-2">Última Evolução</h3>
                    <p className="text-sm">
                        {evolutionData.sessions.length > 0
                            ? format(new Date(evolutionData.sessions[evolutionData.sessions.length - 1].date), 'dd/MM/yyyy')
                            : 'Nenhuma'}
                    </p>
                </div>
            </div>

            <ProgressAnalysisCard sessions={evolutionData.sessions} />

            <PatientEvolutionDashboard
                patientId={patient.id}
                patientName={patient.name}
                sessions={evolutionData.sessions}
                currentPainLevel={evolutionData.currentPainLevel}
                initialPainLevel={evolutionData.initialPainLevel}
                totalSessions={evolutionData.totalSessions}
                averageImprovement={evolutionData.averageImprovement}
            />
        </div>
    );
};

const ClinicalHistoryTab = ({ patientId }: { patientId: string }) => {
    const { data: records = [] } = useSoapRecords(patientId);

    // Adapt records to SessionData interface if needed, or use as is if compatible
    // SessionHistoryPanel expects SessionData[] which is very similar to what useSoapRecords returns
    // We might need to map it if types strictly mismatch, but let's try direct or simple map.
    // Looking at types:
    // SessionHistoryPanel expects: subjective, objective, assessment, plan, pain_level_after
    // useSoapRecords returns: ... same fields ...

    // Mapping to ensure compatibility and avoid type errors
    const sessions = records.map(record => ({
        ...record,
        pain_level_after: record.pain_level // Mapping pain_level to pain_level_after as expected by component
    }));

    return (
        <div className="h-[600px]">
            <SessionHistoryPanel
                sessions={sessions}
                onReplicate={() => { }} // No-op for readonly view
            />
        </div>
    );
};

const FinancialTab = () => (
    <div className="flex flex-col items-center justify-center h-64 border rounded-lg bg-muted/10 border-dashed">
        <DollarSign className="h-10 w-10 text-muted-foreground mb-2" />
        <p className="text-muted-foreground">Histórico Financeiro</p>
    </div>
);

const DocumentsTab = ({ patientId }: { patientId: string }) => {
    const { data: documents, isLoading } = usePatientDocuments(patientId);
    const uploadDocument = useUploadDocument();
    const deleteDocument = useDeleteDocument();
    const downloadDocument = useDownloadDocument();
    const [uploading, setUploading] = useState(false);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            await uploadDocument.mutateAsync({ patientId, file, documentType: 'other' });
        } finally {
            setUploading(false);
        }
    };

    if (isLoading) {
        return <div className="p-8 text-center"><Skeleton className="h-40 w-full mx-auto" /></div>;
    }

    return (
        <div className="space-y-4">
            <Card className="border-dashed border-2">
                <CardContent className="p-8">
                    <div className="flex flex-col items-center justify-center">
                        <Files className="h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground mb-4">
                            Arraste arquivos aqui ou clique para selecionar
                        </p>
                        <input
                            type="file"
                            onChange={handleFileUpload}
                            disabled={uploading}
                            className="hidden"
                            id="file-upload"
                        />
                        <Label htmlFor="file-upload">
                            <Button variant="outline" disabled={uploading} asChild>
                                <span className="cursor-pointer">
                                    {uploading ? 'Enviando...' : 'Selecionar Arquivo'}
                                </span>
                            </Button>
                        </Label>
                    </div>
                </CardContent>
            </Card>

            {documents && documents.length > 0 ? (
                <div className="space-y-2">
                    {documents.map((doc: any) => (
                        <Card key={doc.id}>
                            <CardContent className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <FileIcon className="h-8 w-8 text-muted-foreground" />
                                    <div>
                                        <p className="font-medium">{doc.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => downloadDocument.mutateAsync(doc.id)}
                                    >
                                        <Download className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => deleteDocument.mutateAsync(doc.id)}
                                    >
                                        <Trash className="h-4 w-4 text-destructive" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card>
                    <CardContent className="p-8 text-center">
                        <Files className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                        <p className="text-muted-foreground">Nenhum arquivo anexado</p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

// ============================================================================
// ANALYTICS TAB WITH ML PREDICTIONS
// ============================================================================

const AnalyticsTab = ({ patientId, patientName }: { patientId: string; patientName: string }) => {
    const { data: lifecycleSummary, isLoading: lifecycleLoading } = usePatientLifecycleSummary(patientId);

    return (
        <div className="space-y-6">
            {/* Main Analytics Dashboard */}
            <PatientAnalyticsDashboard patientId={patientId} patientName={patientName} />

            {/* Two-column layout for lifecycle and insights */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Lifecycle Chart */}
                <PatientLifecycleChart
                    summary={lifecycleSummary || null}
                    isLoading={lifecycleLoading}
                />

                {/* Insights Panel */}
                <PatientInsightsPanel patientId={patientId} limit={5} showHeader={true} />
            </div>
        </div>
    );
};

const GamificationTab = ({ patientId }: { patientId: string }) => {
    const {
        profile,
        xpPerLevel,
        unlockedAchievements,
        allAchievements,
        dailyQuests
    } = useGamification(patientId);

    if (!profile) {
        return (
            <div className="flex flex-col items-center justify-center h-64 border rounded-lg bg-muted/10 border-dashed">
                <Trophy className="h-10 w-10 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">Gamificação não iniciada para este paciente</p>
                <Button variant="outline" size="sm" className="mt-4">Iniciar Gamificação</Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <GamificationHeader
                level={profile.level}
                currentXp={profile.current_xp}
                xpPerLevel={xpPerLevel}
                streak={profile.current_streak}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-6">
                    <LevelJourneyMap currentLevel={profile.level} />
                </div>

                <div className="space-y-6">
                    <StreakCalendar
                        todayActivity={dailyQuests?.some((q: any) => q.completed) || false}
                        activeDates={profile.last_activity_date ? [profile.last_activity_date] : []}
                    />

                    {/* Achievements Preview */}
                    <Card className="overflow-hidden border-none shadow-sm bg-gradient-to-br from-slate-50 to-white border">
                        <div className="p-4 border-b flex justify-between items-center bg-white/50 backdrop-blur-sm">
                            <h3 className="font-semibold flex items-center gap-2">
                                <Award className="w-5 h-5 text-purple-500" />
                                Conquistas
                            </h3>
                            <span className="text-xs text-muted-foreground">
                                {unlockedAchievements?.length || 0}/{allAchievements?.length || 0}
                            </span>
                        </div>
                        <div className="p-4 grid grid-cols-4 gap-2">
                            {allAchievements.slice(0, 8).map((achievement: any) => {
                                const isUnlocked = unlockedAchievements.some((ua: any) => ua.achievement_id === achievement.id);
                                return (
                                    <div key={achievement.id} className="flex flex-col items-center gap-1 group relative">
                                        <div className={`
                                    w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300
                                    ${isUnlocked
                                                ? 'bg-purple-100 text-purple-600 shadow-sm group-hover:scale-110'
                                                : 'bg-muted text-muted-foreground/30 grayscale'
                                            }
                                `}>
                                            <Award className="w-6 h-6" />
                                        </div>
                                        {/* Tooltip-ish */}
                                        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-gray-900 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 pointer-events-none z-10 transition-opacity">
                                            {achievement.title}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                        <Button variant="ghost" className="w-full text-xs text-muted-foreground hover:bg-slate-50 border-t rounded-none h-10">
                            Ver todas as conquistas
                        </Button>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export const PatientProfilePage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const { data: patient, isLoading } = useQuery({
        queryKey: ['patient', id],
        queryFn: async () => {
            if (!id) return null;
            const { data, error } = await supabase
                .from('patients')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            return data;
        },
        enabled: !!id
    });

    const [editingPatient, setEditingPatient] = useState<boolean>(false);

    if (isLoading) {
        return (
            <MainLayout>
                <div className="space-y-6">
                    <div className="flex items-center gap-4">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="space-y-2">
                            <Skeleton className="h-6 w-48" />
                            <Skeleton className="h-4 w-32" />
                        </div>
                    </div>
                    <Skeleton className="h-[200px] w-full rounded-lg" />
                </div>
            </MainLayout>
        );
    }

    if (!patient) {
        return (
            <MainLayout>
                <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
                    <h2 className="text-2xl font-bold">Paciente não encontrado</h2>
                    <Button onClick={() => navigate('/patients')}>Voltar para lista</Button>
                </div>
            </MainLayout>
        );
    }

    const patientName = PatientHelpers.getName(patient);
    const initials = patientName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();

    return (
        <MainLayout>
            <div className="space-y-6 pb-20 fade-in">
                {/* Header Navigation */}
                <div className="flex items-center gap-2 text-muted-foreground mb-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/patients')} className="-ml-2">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <span className="text-sm">Voltar para Pacientes</span>
                </div>

                {/* Patient Header Card */}
                <div className="bg-card rounded-xl p-6 shadow-sm border space-y-6">
                    <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Avatar className="h-20 w-20 border-4 border-background shadow-sm">
                                <AvatarImage src={patient.photo_url} />
                                <AvatarFallback className="text-xl bg-primary/10 text-primary font-bold">
                                    {initials}
                                </AvatarFallback>
                            </Avatar>

                            <div>
                                <h1 className="text-2xl font-bold">{patientName}</h1>
                                <div className="flex flex-wrap items-center gap-2 mt-2">
                                    <Badge variant={patient.status === 'Em Tratamento' ? 'default' : 'secondary'}>
                                        {patient.status || 'Status desconhecido'}
                                    </Badge>
                                    {patient.birth_date && (
                                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                                            <CalendarIcon className="h-3 w-3" />
                                            {format(new Date(patient.birth_date), 'dd/MM/yyyy')}
                                            <span className="mx-1">•</span>
                                            {Math.floor((new Date().getTime() - new Date(patient.birth_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000))} anos
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2 w-full md:w-auto">
                            <Button onClick={() => setEditingPatient(true)} variant="outline" className="flex-1 md:flex-none gap-2">
                                <Edit className="h-4 w-4" />
                                Editar
                            </Button>
                            <Button onClick={() => navigate('/schedule')} className="flex-1 md:flex-none gap-2">
                                <CalendarIcon className="h-4 w-4" />
                                Agendar
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                        <div className="flex items-center gap-3 text-sm">
                            <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                <Phone className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="text-muted-foreground text-xs">Telefone</p>
                                <p className="font-medium">{patient.phone || 'Não informado'}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 text-sm">
                            <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                <Mail className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="text-muted-foreground text-xs">Email</p>
                                <p className="font-medium truncate max-w-[200px]" title={patient.email}>
                                    {patient.email || 'Não informado'}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 md:gap-3 text-sm">
                            <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                <MapPin className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="text-muted-foreground text-xs">Cidade</p>
                                <p className="font-medium">{patient.city ? `${patient.city}/${patient.state || ''}` : 'Não informado'}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content Tabs */}
                <Tabs defaultValue="overview" className="w-full">
                    <TabsList className="w-full justify-start h-auto p-1 bg-transparent border-b rounded-none mb-6 overflow-x-auto flex-nowrap">
                        <TabsTrigger value="overview" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-4 py-2">
                            Visão Geral
                        </TabsTrigger>
                        <TabsTrigger value="analytics" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-4 py-2 gap-1.5">
                            <Brain className="h-4 w-4" />
                            Analytics & IA
                        </TabsTrigger>
                        <TabsTrigger value="personal" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-4 py-2">
                            Dados Pessoais
                        </TabsTrigger>
                        <TabsTrigger value="clinical" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-4 py-2">
                            Histórico Clínico
                        </TabsTrigger>
                        <TabsTrigger value="financial" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-4 py-2">
                            Financeiro
                        </TabsTrigger>
                        <TabsTrigger value="gamification" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-4 py-2">
                            Gamificação
                        </TabsTrigger>
                        <TabsTrigger value="documents" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-4 py-2">
                            Arquivos
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="mt-0">
                        <OverviewTab patient={patient} />
                    </TabsContent>

                    <TabsContent value="analytics" className="mt-0">
                        <AnalyticsTab patientId={id || ''} patientName={patientName} />
                    </TabsContent>

                    <TabsContent value="personal" className="mt-0">
                        <PersonalDataTab patient={patient} />
                    </TabsContent>

                    <TabsContent value="clinical" className="mt-0">
                        <ClinicalHistoryTab patientId={id || ''} />
                    </TabsContent>

                    <TabsContent value="financial" className="mt-0">
                        <FinancialTab patientId={id || ''} />
                    </TabsContent>

                    <TabsContent value="gamification" className="mt-0">
                        <GamificationTab patientId={id || ''} />
                    </TabsContent>

                    <TabsContent value="documents" className="mt-0">
                        <DocumentsTab patientId={id || ''} />
                    </TabsContent>
                </Tabs>

                <EditPatientModal
                    open={editingPatient}
                    onOpenChange={setEditingPatient}
                    patientId={id}
                />
            </div>
        </MainLayout>
    );
};

export default PatientProfilePage;
