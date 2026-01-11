import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
    User,
    MapPin,
    Phone,
    Mail,
    AlertTriangle,
    Activity,
    Calendar,
    Clock,
    Target,
    FileText,
    DollarSign
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PatientHelpers } from '@/types';

interface PatientDashboardProps {
    patient: any;
    appointments: any[];
    activeGoals: any[];
    activePathologies: any[];
    surgeries: any[];
    onAction: (action: string) => void;
}

export const PatientDashboard360 = ({
    patient,
    appointments,
    activeGoals = [],
    activePathologies = [],
    surgeries = [],
    onAction
}: PatientDashboardProps) => {
    if (!patient) return null;

    const alerts = patient?.alerts || [];
    const nextAppointment = appointments?.find(a => new Date(a.date) > new Date());

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
                                        <h2 className="text-2xl font-bold tracking-tight text-foreground">{PatientHelpers.getName(patient)}</h2>
                                        <p className="text-muted-foreground flex items-center gap-2 mt-1">
                                            <User className="w-4 h-4" />
                                            {patient.age} anos • {patient.profession || 'Profissão não informada'}
                                        </p>
                                    </div>
                                    <Badge variant={patient.isActive ? "default" : "secondary"}>
                                        {patient.isActive ? 'Ativo' : 'Inativo'}
                                    </Badge>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 text-sm">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Phone className="w-4 h-4 text-primary" />
                                        {patient.phone}
                                    </div>
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Mail className="w-4 h-4 text-primary" />
                                        {patient.email || 'Sem email'}
                                    </div>
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <MapPin className="w-4 h-4 text-primary" />
                                        {patient.address?.city || 'Cidade não inf.'} - {patient.address?.state || 'UF'}
                                    </div>
                                </div>

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
                    <Card className="bg-primary text-primary-foreground shadow-lg">
                        <CardContent className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-semibold flex items-center gap-2">
                                    <Calendar className="w-5 h-5" />
                                    Próximo Agendamento
                                </h3>
                            </div>
                            {nextAppointment ? (
                                <div>
                                    <div className="text-2xl font-bold">
                                        {format(new Date(nextAppointment.date), "dd 'de' MMM", { locale: ptBR })}
                                    </div>
                                    <div className="opacity-90 mt-1">
                                        {format(new Date(nextAppointment.date), "HH:mm", { locale: ptBR })} - {nextAppointment.type || 'Sessão'}
                                    </div>
                                </div>
                            ) : (
                                <div className="opacity-90">Nenhum agendamento futuro</div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6 flex items-center justify-between">
                            <div>
                                <p className="text-muted-foreground text-sm font-medium">Saldo de Sessões</p>
                                <div className="text-3xl font-bold mt-1 text-primary">
                                    {patient.balance || 0} <span className="text-xs text-muted-foreground font-normal">restantes</span>
                                </div>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                                <DollarSign className="w-6 h-6 text-primary" />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Middle Section: Goals & Pathologies */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Treatment Goals */}
                <Card className="h-full border-l-4 border-l-violet-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Target className="w-5 h-5 text-violet-500" />
                            Objetivos do Tratamento
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {activeGoals.length > 0 ? (
                            <div className="space-y-4">
                                {activeGoals.map((goal: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
                                        <div>
                                            <p className="font-medium">{goal.description}</p>
                                            {goal.targetDate && (
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    Alvo: {format(new Date(goal.targetDate), "dd/MM/yyyy")}
                                                </p>
                                            )}
                                        </div>
                                        {goal.targetDate && (
                                            <Badge variant="outline" className="bg-background">
                                                {Math.ceil((new Date(goal.targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} dias
                                            </Badge>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-muted-foreground text-sm flex items-center gap-2">
                                <Target className="w-4 h-4 opacity-50" />
                                Nenhum objetivo pendente.
                            </p>
                        )}
                        <Button variant="link" className="px-0 mt-2 text-violet-600" onClick={() => onAction('goals')}>
                            Gerenciar Objetivos
                        </Button>
                    </CardContent>
                </Card>

                {/* Pathologies */}
                <Card className="h-full border-l-4 border-l-rose-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Activity className="w-5 h-5 text-rose-500" />
                            Patologias Ativas
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {activePathologies.length > 0 ? (
                            <div className="space-y-3">
                                {activePathologies.map((pathology: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-rose-100 bg-rose-50/50 dark:bg-rose-950/10">
                                        <div>
                                            <p className="font-medium">{pathology.name}</p>
                                            <p className="text-xs text-muted-foreground">Diagnóstico: {pathology.diagnosedAt ? format(new Date(pathology.diagnosedAt), "dd/MM/yyyy") : 'N/A'}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-muted-foreground text-sm">Nenhuma patologia ativa registrada.</p>
                        )}
                        <Button variant="link" className="px-0 mt-2 text-rose-600" onClick={() => onAction('anamnesis')}>
                            Ver Histórico Completo
                        </Button>
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
                        {(surgeries || []).map((surgery: any, i: number) => (
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

        </div>
    );
};
