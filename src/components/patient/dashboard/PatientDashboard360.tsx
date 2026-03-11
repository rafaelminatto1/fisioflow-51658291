import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {

    User,
    MapPin,
    Phone,
    Mail,
    AlertTriangle,
    Activity,
    Calendar,
    Target,
    DollarSign,
    Sparkles,
    Loader2,
    Clock,
    Trophy,
    Flame,
    Star,
    Award,
    Plus,
    Pencil,
    CheckCircle2
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ReactMarkdown from 'react-markdown';
import { parseResponseDate } from '@/utils/dateUtils';
import { PatientHelpers } from '@/types';
import { usePatientInsight } from '@/hooks/usePatientInsight';
import { useGamification } from '@/hooks/useGamification';
import { useCompleteGoal, usePatientGoals, usePatientPathologies } from '@/hooks/usePatientEvolution';
import { MetaFormModal } from '@/components/evolution/MetaFormModal';
import { PathologyFormModal } from '@/components/evolution/PathologyFormModal';
import type { PatientGoal, Pathology } from '@/types/evolution';
import { Link } from 'react-router-dom';

interface PatientDashboardProps {
    patient: {
        id?: string;
        name?: string;
        age?: number;
        profession?: string;
        phone?: string;
        email?: string;
        address?: { city?: string; state?: string };
        photoUrl?: string;
        alerts?: string[];
        isActive?: boolean;
        balance?: number;
        mainCondition?: string;
        status?: string;
        allergies?: string;
        birth_date?: string;
        birthDate?: string;
        occupation?: string;
        city?: string;
        sessions_available?: number;
    };
    appointments?: Array<{
        id?: string;
        date?: Date | string;
        appointment_date?: Date | string;
        type?: string;
        status?: string;
        notes?: string;
    }>;
    activeGoals?: Array<{
        id?: string;
        goal_title?: string;
        goal_description?: string;
        description?: string;
        targetDate?: string | Date;
        target_date?: string | Date;
    }>;
    activePathologies?: Array<{
        id?: string;
        pathology_name?: string;
        name?: string;
        diagnosedAt?: string | Date;
        diagnosis_date?: string | Date;
        status?: string;
    }>;
    surgeries?: Array<{
        name: string;
        hospital?: string;
        surgeon?: string;
        surgeryDate?: string | Date;
        notes?: string;
    }>;
    onAction?: (action: string) => void;
    currentAppointmentId?: string;
}

export const PatientDashboard360 = ({
    patient,
    appointments = [],
    activeGoals = [],
    activePathologies = [],
    surgeries = [],
    onAction = () => {},
    currentAppointmentId
}: PatientDashboardProps) => {
    const alerts = patient?.alerts || [];
    const patientId = patient?.id;
    const { data: fetchedGoals = [] } = usePatientGoals(patientId || '');
    const { data: fetchedPathologies = [] } = usePatientPathologies(patientId || '');
    const completeGoal = useCompleteGoal();
    const [goalModalOpen, setGoalModalOpen] = useState(false);
    const [editingGoal, setEditingGoal] = useState<PatientGoal | null>(null);
    const [pathologyModalOpen, setPathologyModalOpen] = useState(false);
    const [editingPathology, setEditingPathology] = useState<Pathology | null>(null);

    // Gamification hook
    const {
        profile,
        unlockedAchievements,
        allAchievements,
        xpPerLevel
    } = useGamification(patientId || '');

    // Memoized data processing
    const { nextAppointment, currentSession, calculatedAge, patientName } = useMemo(() => {
        const name = PatientHelpers.getName(patient);
        const birthDate = patient.birth_date || patient.birthDate;

        const age = patient.age || (birthDate ?
            Math.floor((new Date().getTime() - new Date(birthDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
            : undefined);

        const current = appointments?.find(a => a.id === currentAppointmentId);

        const next = appointments
            ? [...appointments]
                .filter(a => {
                    const date = a.date || a.appointment_date;
                    const status = a.status;
                    return (
                        new Date(date) > new Date() &&
                        a.id !== currentAppointmentId &&
                        status !== 'cancelado' &&
                        status !== 'falta'
                    );
                })
                .sort((a, b) => {
                    const dateA = new Date(a.date || a.appointment_date as string).getTime();
                    const dateB = new Date(b.date || b.appointment_date as string).getTime();
                    return dateA - dateB;
                })[0]
            : null;

        return {
            nextAppointment: next,
            currentSession: current,
            calculatedAge: age,
            patientName: name
        };
    }, [appointments, currentAppointmentId, patient]);

    const resolvedActiveGoals = useMemo(() => {
        if (fetchedGoals.length > 0) {
            return fetchedGoals
                .filter((goal) => goal.status === 'em_andamento')
                .map((goal) => ({
                    id: goal.id,
                    goal_title: goal.goal_title,
                    goal_description: goal.goal_description,
                    target_date: goal.target_date,
                    editableGoal: goal,
                }));
        }

        return activeGoals.map((goal, index) => ({
            id: goal.id ?? `goal-${index}`,
            goal_title: goal.goal_title ?? goal.description ?? 'Meta',
            goal_description: goal.goal_description,
            target_date: goal.target_date ?? goal.targetDate,
            editableGoal: null,
        }));
    }, [activeGoals, fetchedGoals]);

    const resolvedActivePathologies = useMemo(() => {
        if (fetchedPathologies.length > 0) {
            return fetchedPathologies
                .filter((pathology) => pathology.status === 'em_tratamento')
                .map((pathology) => ({
                    id: pathology.id,
                    pathology_name: pathology.pathology_name,
                    diagnosis_date: pathology.diagnosis_date,
                    editablePathology: pathology,
                }));
        }

        return activePathologies.map((pathology, index) => ({
            id: pathology.id ?? `pathology-${index}`,
            pathology_name: pathology.pathology_name ?? pathology.name ?? 'Patologia',
            diagnosis_date: pathology.diagnosis_date ?? pathology.diagnosedAt,
            editablePathology: null,
        }));
    }, [activePathologies, fetchedPathologies]);

    const [insightResult, setInsightResult] = useState<string | null>(null);
    const { mutate: generateInsight, isPending: isGeneratingInsight } = usePatientInsight();

    // Early return after hooks
    if (!patient) return null;

    const handleGenerateInsight = () => {
        const patientData = {
            name: patientName,
            age: calculatedAge,
            mainCondition: patient.mainCondition,
            goals: resolvedActiveGoals.map((goal) => goal.goal_title),
            pathologies: resolvedActivePathologies.map((pathology) => pathology.pathology_name),
            recentAppointments: appointments?.slice(0, 5).map(a => ({
                date: a.date,
                type: a.type,
                notes: a.notes
            }))
        };

        generateInsight(patientData, {
            onSuccess: (data) => {
                setInsightResult(data.insight);
            }
        });
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">

            {/* Top Section: Summary & Vitals */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Patient Summary Card */}
                <Card className="lg:col-span-2 border-primary/10 shadow-md bg-gradient-to-br from-card to-primary/5">
                    <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row gap-6 items-start">
                            <Avatar className="w-24 h-24 border-4 border-background shadow-lg">
                                <AvatarImage src={patient.photoUrl} />
                                <AvatarFallback className="text-xl bg-primary/20 text-primary">
                                    {PatientHelpers.getName(patient).substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>

                            <div className="flex-1 space-y-2">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h2 className="text-2xl font-bold tracking-tight text-foreground">{patientName}</h2>
                                        <p className="text-muted-foreground flex items-center gap-2 mt-1 font-medium">
                                            <User className="w-4 h-4 text-primary" />
                                            {calculatedAge || 'Idade não inf.'} anos • {patient.profession || patient.occupation || 'Profissão não informada'}
                                        </p>
                                    </div>
                                    <Badge variant={(patient.isActive || patient.status === 'active' || patient.status === 'active') ? "default" : "secondary"} className="h-6">
                                        {(patient.isActive || patient.status === 'active' || patient.status === 'active') ? 'Ativo' : 'Inativo'}
                                    </Badge>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Contato</span>
                                        <div className="flex items-center gap-2 text-sm">
                                            <Phone className="w-3.5 h-3.5 text-primary" />
                                            {patient.phone || 'Sem telefone'}
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Email</span>
                                        <div className="flex items-center gap-2 text-sm truncate">
                                            <Mail className="w-3.5 h-3.5 text-primary" />
                                            {patient.email || 'Sem email'}
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Localização</span>
                                        <div className="flex items-center gap-2 text-sm">
                                            <MapPin className="w-3.5 h-3.5 text-primary" />
                                            {patient.address?.city || patient.city || 'Cidade não inf.'}
                                        </div>
                                    </div>
                                </div>

                                {(patient.allergies  || patient.mainCondition) && (
                                    <div className="mt-6 flex flex-wrap gap-2 pt-4 border-t border-primary/5">
                                        {patient.mainCondition && (
                                            <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary gap-1.5 py-1">
                                                <Activity className="w-3.5 h-3.5" />
                                                {patient.mainCondition}
                                            </Badge>
                                        )}
                                        {(patient.allergies ) && (
                                            <Badge variant="outline" className="bg-rose-500/5 border-rose-500/20 text-rose-600 gap-1.5 py-1">
                                                <AlertTriangle className="w-3.5 h-3.5" />
                                                Alergia: {patient.allergies }
                                            </Badge>
                                        )}
                                    </div>
                                )}

                                {alerts.length > 0 && (
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        {alerts.map((alert: string, i: number) => (
                                            <Badge key={i} variant="destructive" className="flex items-center gap-1">
                                                <AlertTriangle className="w-3 h-3" />
                                                {alert}
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Quick Stats / Actions */}
                <div className="grid grid-cols-1 gap-4">
                    {currentSession && (
                        <Card className="bg-emerald-600 text-white shadow-lg border-none overflow-hidden relative group">
                            <div className="absolute right-[-20px] top-[-20px] opacity-10 group-hover:scale-110 transition-transform">
                                <Clock className="w-24 h-24" />
                            </div>
                            <CardContent className="p-5 relative z-10">
                                <div className="flex justify-between items-center mb-3">
                                    <h3 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2 opacity-90">
                                        <Activity className="w-4 h-4" />
                                        Sessão em Curso
                                    </h3>
                                    <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
                                </div>
                                <div className="text-xl font-bold">
                                    {currentSession.type || 'Sessão de Fisioterapia'}
                                </div>
                                <div className="text-white/80 text-sm mt-1 flex items-center gap-2">
                                    <Clock className="w-3.5 h-3.5" />
                                    {format(parseResponseDate(currentSession.date || currentSession.appointment_date), "HH:mm", { locale: ptBR })}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {!currentSession && nextAppointment && (
                        <Card className="bg-primary text-primary-foreground shadow-lg border-none overflow-hidden relative group">
                            <div className="absolute right-[-20px] top-[-20px] opacity-10 group-hover:scale-110 transition-transform">
                                <Calendar className="w-24 h-24" />
                            </div>
                            <CardContent className="p-5 relative z-10">
                                <div className="flex justify-between items-center mb-3">
                                    <h3 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2 opacity-90">
                                        <Calendar className="w-4 h-4" />
                                        Próxima Sessão
                                    </h3>
                                </div>
                                <div className="text-xl font-bold">
                                    {format(parseResponseDate(nextAppointment.date || nextAppointment.appointment_date), "dd 'de' MMMM", { locale: ptBR })}
                                </div>
                                <div className="text-primary-foreground/80 text-sm mt-1 flex items-center gap-2">
                                    <Clock className="w-3.5 h-3.5" />
                                    {format(parseResponseDate(nextAppointment.date || nextAppointment.appointment_date), "HH:mm", { locale: ptBR })} • {nextAppointment.type || 'Sessão'}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <Card className="shadow-md border-primary/5 hover:border-primary/20 transition-colors">
                        <CardContent className="p-5 flex items-center justify-between">
                            <div>
                                <p className="text-muted-foreground text-[10px] uppercase tracking-wider font-bold">Saldo de Sessões</p>
                                <div className={`text-3xl font-bold mt-1 ${(patient.balance ?? patient.sessions_available ?? 0) <= 1 ? 'text-rose-500' : 'text-primary'}`}>
                                    {patient.balance ?? patient.sessions_available ?? 0}
                                    <span className="text-xs text-muted-foreground font-normal ml-2">disponíveis</span>
                                </div>
                            </div>
                            <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${(patient.balance ?? patient.sessions_available ?? 0) <= 1 ? 'bg-rose-50' : 'bg-primary/10'}`}>
                                <DollarSign className={`w-6 h-6 ${(patient.balance ?? patient.sessions_available ?? 0) <= 1 ? 'text-rose-500' : 'text-primary'}`} />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* AI Insight Section */}
                <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 border-indigo-100 dark:border-indigo-900/50 shadow-[0_0_15px_rgba(79,70,229,0.1)] dark:shadow-[0_0_20px_rgba(129,140,248,0.1)] transition-all hover:shadow-[0_0_25px_rgba(79,70,229,0.15)] ring-1 ring-indigo-500/10">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
                                <Sparkles className="w-5 h-5" />
                                Inteligência Artificial
                            </h3>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleGenerateInsight()}
                                disabled={isGeneratingInsight}
                                className="bg-white/50 hover:bg-white/80 dark:bg-black/20"
                            >
                                {isGeneratingInsight ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Analisando...
                                    </>
                                ) : (
                                    'Gerar Resumo Clínico'
                                )}
                            </Button>
                        </div>

                        {insightResult ? (
                            <div className="text-sm text-foreground/80 bg-white/60 dark:bg-black/20 p-4 rounded-lg border border-indigo-100 dark:border-indigo-900/30 prose prose-sm dark:prose-invert max-w-none">
                                <ReactMarkdown>
                                    {insightResult}
                                </ReactMarkdown>
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                Utilize a IA para analisar o histórico completo do paciente e identificar tendências, melhorias e alertas de forma automática.
                            </p>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Gamification Section */}
            {patientId && profile && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Level Progress */}
                    <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 border-purple-200 dark:border-purple-900/50">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold flex items-center gap-2 text-purple-700 dark:text-purple-400">
                                    <Trophy className="w-5 h-5" />
                                    Nível {profile.level}
                                </h3>
                                <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                                    {profile.current_xp || 0} XP
                                </Badge>
                            </div>
                            <Progress
                                value={xpPerLevel > 0 ? ((profile.current_xp || 0) % xpPerLevel) / xpPerLevel * 100 : 0}
                                className="h-2 mb-2"
                            />
                            <p className="text-xs text-muted-foreground">
                                {xpPerLevel - ((profile.current_xp || 0) % xpPerLevel)} XP para o próximo nível
                            </p>
                            <Link to="/gamification" className="mt-3 block">
                                <Button variant="outline" size="sm" className="w-full text-purple-700 border-purple-200 hover:bg-purple-100">
                                    Ver Progresso Completo
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>

                    {/* Streak */}
                    <Card className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 border-orange-200 dark:border-orange-900/50">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold flex items-center gap-2 text-orange-700 dark:text-orange-400">
                                    <Flame className="w-5 h-5" />
                                    Sequência Atual
                                </h3>
                                <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                                    {profile.current_streak || 0} dias
                                </Badge>
                            </div>
                            <div className="flex items-center gap-2 mt-3">
                                <div className="flex-1">
                                    <div className="flex gap-1">
                                        {[...Array(Math.min(7, 3))].map((_, i) => (
                                            <div
                                                key={i}
                                                className={`h-8 flex-1 rounded ${i < (profile.current_streak || 0) ? 'bg-orange-500' : 'bg-orange-200'}`}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-3">
                                {profile.current_streak >= 3
                                    ? 'Ótimo! Continue mantendo a sequência!'
                                    : 'Complete exercícios diários para aumentar sua sequência'}
                            </p>
                        </CardContent>
                    </Card>

                    {/* Recent Achievements */}
                    <Card className="bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-950/30 dark:to-amber-950/30 border-yellow-200 dark:border-yellow-900/50">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
                                    <Award className="w-5 h-5" />
                                    Conquistas
                                </h3>
                                <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
                                    {unlockedAchievements.length}/{allAchievements.length}
                                </Badge>
                            </div>
                            <div className="grid grid-cols-4 gap-2 mb-3">
                                {allAchievements.slice(0, 4).map((achievement) => {
                                    const isUnlocked = unlockedAchievements.some(ua => ua.achievement_id === achievement.id);
                                    return (
                                        <div
                                            key={achievement.id}
                                            className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                                isUnlocked ? 'bg-yellow-400 text-white' : 'bg-gray-200 text-gray-500'
                                            }`}
                                        >
                                            <Star className="w-5 h-5" />
                                        </div>
                                    );
                                })}
                            </div>
                            <Link to="/gamification/achievements" className="block">
                                <Button variant="outline" size="sm" className="w-full text-yellow-700 border-yellow-200 hover:bg-yellow-100">
                                    Ver Todas as Conquistas
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Middle Section: Goals & Pathologies */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Treatment Goals */}
                <Card className="h-full border-l-4 border-l-violet-500">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Target className="w-5 h-5 text-violet-500" />
                            Objetivos do Tratamento
                        </CardTitle>
                        <Button
                            size="sm"
                            variant="outline"
                            className="border-violet-200 text-violet-700 hover:bg-violet-50"
                            onClick={() => {
                                setEditingGoal(null);
                                setGoalModalOpen(true);
                            }}
                            disabled={!patientId}
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Nova meta
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {resolvedActiveGoals.length > 0 ? (
                            <div className="space-y-4">
                                {resolvedActiveGoals.map((goal) => (
                                    <div key={goal.id} className="flex items-start justify-between gap-3 p-3 rounded-lg bg-muted/40">
                                        <div className="min-w-0">
                                            <p className="font-medium">{goal.goal_title}</p>
                                            {goal.goal_description && (
                                                <p className="text-xs text-muted-foreground mt-1">{goal.goal_description}</p>
                                            )}
                                            {goal.target_date && (
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    Alvo: {format(new Date(goal.target_date), "dd/MM/yyyy")}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {goal.target_date && (
                                                <Badge variant="outline" className="bg-background whitespace-nowrap">
                                                    {Math.ceil((new Date(goal.target_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} dias
                                                </Badge>
                                            )}
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-8 w-8 text-violet-700 hover:bg-violet-50"
                                                onClick={() => {
                                                    if (!goal.editableGoal) return;
                                                    setEditingGoal(goal.editableGoal);
                                                    setGoalModalOpen(true);
                                                }}
                                                disabled={!goal.editableGoal}
                                                title="Editar meta"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-8 w-8 text-green-700 hover:bg-green-50"
                                                onClick={() => completeGoal.mutate(goal.id)}
                                                disabled={!goal.editableGoal || completeGoal.isPending}
                                                title="Concluir meta"
                                            >
                                                <CheckCircle2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="rounded-lg border border-dashed border-violet-200 bg-violet-50/50 p-4">
                                <p className="text-sm text-muted-foreground">
                                    Nenhuma meta ativa no momento. Cadastre a primeira meta daqui mesmo.
                                </p>
                                <Button
                                    variant="secondary"
                                    className="mt-3 bg-violet-600 text-white hover:bg-violet-700"
                                    onClick={() => {
                                        setEditingGoal(null);
                                        setGoalModalOpen(true);
                                    }}
                                    disabled={!patientId}
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Criar meta
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Pathologies */}
                <Card className="h-full border-l-4 border-l-rose-500">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Activity className="w-5 h-5 text-rose-500" />
                            Patologias Ativas
                        </CardTitle>
                        <Button
                            size="sm"
                            variant="outline"
                            className="border-rose-200 text-rose-700 hover:bg-rose-50"
                            onClick={() => {
                                setEditingPathology(null);
                                setPathologyModalOpen(true);
                            }}
                            disabled={!patientId}
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Nova patologia
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {resolvedActivePathologies.length > 0 ? (
                            <div className="space-y-3">
                                {resolvedActivePathologies.map((pathology) => (
                                    <div key={pathology.id} className="flex items-start justify-between gap-3 p-3 rounded-lg border border-rose-100 bg-rose-50/50 dark:bg-rose-950/10">
                                        <div className="min-w-0">
                                            <p className="font-medium">{pathology.pathology_name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                Diagnóstico: {pathology.diagnosis_date ? format(new Date(pathology.diagnosis_date), "dd/MM/yyyy") : 'N/A'}
                                            </p>
                                        </div>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-8 w-8 text-rose-700 hover:bg-rose-50"
                                            onClick={() => {
                                                if (!pathology.editablePathology) {
                                                    onAction('anamnesis');
                                                    return;
                                                }
                                                setEditingPathology(pathology.editablePathology);
                                                setPathologyModalOpen(true);
                                            }}
                                            title="Editar patologia"
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="rounded-lg border border-dashed border-rose-200 bg-rose-50/50 p-4">
                                <p className="text-sm text-muted-foreground">
                                    Nenhuma patologia ativa registrada. Adicione a principal condição clínica do paciente aqui.
                                </p>
                                <Button
                                    variant="secondary"
                                    className="mt-3 bg-rose-600 text-white hover:bg-rose-700"
                                    onClick={() => {
                                        setEditingPathology(null);
                                        setPathologyModalOpen(true);
                                    }}
                                    disabled={!patientId}
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Registrar patologia
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Bottom Section: Surgeries & Timeline */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Activity className="w-5 h-5 text-blue-500" />
                        Histórico Cirúrgico
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="relative pl-6 border-l-2 border-muted space-y-6">
                        {(surgeries || []).map((surgery, i: number) => (
                            <div key={i} className="relative">
                                <div className="absolute -left-[29px] top-1 h-3 w-3 rounded-full bg-blue-500 ring-4 ring-background" />
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
                                    <div>
                                        <h4 className="font-semibold text-lg">{surgery.name}</h4>
                                        <p className="text-muted-foreground text-sm">
                                            {surgery.hospital} • Dr(a). {surgery.surgeon}
                                        </p>
                                    </div>
                                    <div className="mt-2 sm:mt-0 text-right">
                                        <p className="font-medium text-blue-600">
                                            {surgery.surgeryDate ? format(new Date(surgery.surgeryDate), "dd MMM yyyy", { locale: ptBR }) : 'Data não inf.'}
                                        </p>
                                        {surgery.surgeryDate && (
                                            <p className="text-xs text-muted-foreground">
                                                há {Math.floor((new Date().getTime() - new Date(surgery.surgeryDate).getTime()) / (1000 * 60 * 60 * 24 * 30))} meses
                                            </p>
                                        )}
                                    </div>
                                </div>
                                {surgery.notes && (
                                    <p className="mt-2 text-sm text-foreground/80 bg-muted/30 p-3 rounded-md">
                                        {surgery.notes}
                                    </p>
                                )}
                            </div>
                        ))}
                        {(!surgeries || surgeries.length === 0) && (
                            <p className="text-muted-foreground text-sm italic">Nenhuma cirurgia registrada.</p>
                        )}
                    </div>
                </CardContent>
            </Card>

            {patientId && (
                <MetaFormModal
                    open={goalModalOpen}
                    onOpenChange={(open) => {
                        setGoalModalOpen(open);
                        if (!open) setEditingGoal(null);
                    }}
                    patientId={patientId}
                    goal={editingGoal}
                />
            )}

            {patientId && (
                <PathologyFormModal
                    open={pathologyModalOpen}
                    onOpenChange={(open) => {
                        setPathologyModalOpen(open);
                        if (!open) setEditingPathology(null);
                    }}
                    patientId={patientId}
                    pathology={editingPathology}
                />
            )}

        </div>
    );
};
