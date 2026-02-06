import React, { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {

  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertTriangle,
  Mail,
  Phone,
  Calendar,
  TrendingDown,
  UserX,
  Filter,
  Download,
  Bell,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import {
  collection,
  query as firestoreQuery,
  where,
  orderBy,
  getDocs,
  doc,
  getDoc,
} from '@/integrations/firebase/app';
import { db } from '@/integrations/firebase/app';
import { differenceInDays, format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface AtRiskPatient {
  id: string;
  patient_id: string;
  patient_name: string;
  email?: string;
  phone?: string;
  last_appointment_date: string;
  last_activity_date: string;
  days_inactive: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  total_sessions: number;
  last_therapist?: string;
}

interface RiskStats {
  total: number;
  low: number;
  medium: number;
  high: number;
  critical: number;
}

export default function AtRiskPatientsPage() {
  const { toast } = useToast();
  const [riskFilter, setRiskFilter] = useState<'all' | 'low' | 'medium' | 'high' | 'critical'>('all');
  const [daysFilter, setDaysFilter] = useState<number>(30);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch at-risk patients
  const { data: atRiskPatients = [], isLoading } = useQuery({
    queryKey: ['at-risk-patients', daysFilter],
    queryFn: async (): Promise<AtRiskPatient[]> => {
      const cutoffDate = subDays(new Date(), daysFilter);

      // Query patients who haven't had appointments in the specified period
      const appointmentsQuery = firestoreQuery(
        collection(db, 'appointments'),
        where('appointment_date', '>=', cutoffDate.toISOString()),
        orderBy('appointment_date', 'desc')
      );

      const appointmentsSnapshot = await getDocs(appointmentsQuery);
      const activePatientIds = new Set(
        appointmentsSnapshot.docs
          .map((d) => d.data().patient_id)
          .filter(Boolean)
      );

      // Get all patients
      const patientsSnapshot = await getDocs(
        firestoreQuery(collection(db, 'patients'), orderBy('created_at', 'desc'))
      );

      const atRiskPatients: AtRiskPatient[] = [];

      for (const patientDoc of patientsSnapshot.docs) {
        const patientId = patientDoc.id;
        if (activePatientIds.has(patientId)) continue;

        const patientData = patientDoc.data();

        // Get last appointment for this patient
        const lastApptQuery = firestoreQuery(
          collection(db, 'appointments'),
          where('patient_id', '==', patientId),
          orderBy('appointment_date', 'desc'),
          // @ts-expect-error - limit exists
          where('limit', '==', 1)
        );

        const lastApptSnapshot = await getDocs(lastApptQuery);
        const lastAppointment = lastApptSnapshot.docs[0]?.data();

        if (!lastAppointment) continue;

        const lastApptDate = new Date(lastAppointment.appointment_date);
        const daysInactive = differenceInDays(new Date(), lastApptDate);

        if (daysInactive < daysFilter) continue;

        // Calculate risk level based on days inactive
        let riskLevel: AtRiskPatient['risk_level'];
        if (daysInactive >= 90) {
          riskLevel = 'critical';
        } else if (daysInactive >= 60) {
          riskLevel = 'high';
        } else if (daysInactive >= 30) {
          riskLevel = 'medium';
        } else {
          riskLevel = 'low';
        }

        atRiskPatients.push({
          id: patientId,
          patient_id: patientId,
          patient_name: patientData.full_name || patientData.name || 'Paciente',
          email: patientData.email,
          phone: patientData.phone,
          last_appointment_date: lastAppointment.appointment_date,
          last_activity_date: lastAppointment.appointment_date,
          days_inactive: daysInactive,
          risk_level: riskLevel,
          total_sessions: 0, // Would need aggregation
          last_therapist: lastAppointment.therapist_id,
        });

        // Limit results and sort by risk level
        atRiskPatients.sort((a, b) => b.days_inactive - a.days_inactive);
      }

      return atRiskPatients.slice(0, 100);
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Calculate statistics
  const stats: RiskStats = useMemo(() => {
    return atRiskPatients.reduce(
      (acc, patient) => {
        acc.total++;
        acc[patient.risk_level]++;
        return acc;
      },
      { total: 0, low: 0, medium: 0, high: 0, critical: 0 }
    );
  }, [atRiskPatients]);

  // Filter patients
  const filteredPatients = useMemo(() => {
    return atRiskPatients.filter((patient) => {
      const matchesRisk = riskFilter === 'all' || patient.risk_level === riskFilter;
      const matchesSearch =
        !searchTerm ||
        patient.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.phone?.includes(searchTerm);
      return matchesRisk && matchesSearch;
    });
  }, [atRiskPatients, riskFilter, searchTerm]);

  // Risk level config
  const riskConfig = {
    critical: {
      label: 'Crítico',
      color: 'text-red-600',
      bg: 'bg-red-50 dark:bg-red-500/10',
      border: 'border-red-200 dark:border-red-500/20',
      icon: AlertTriangle,
    },
    high: {
      label: 'Alto',
      color: 'text-orange-600',
      bg: 'bg-orange-50 dark:bg-orange-500/10',
      border: 'border-orange-200 dark:border-orange-500/20',
      icon: TrendingDown,
    },
    medium: {
      label: 'Médio',
      color: 'text-yellow-600',
      bg: 'bg-yellow-50 dark:bg-yellow-500/10',
      border: 'border-yellow-200 dark:border-yellow-500/20',
      icon: Clock,
    },
    low: {
      label: 'Baixo',
      color: 'text-blue-600',
      bg: 'bg-blue-50 dark:bg-blue-500/10',
      border: 'border-blue-200 dark:border-blue-500/20',
      icon: UserX,
    },
  };

  const handleContact = async (patient: AtRiskPatient, method: 'email' | 'whatsapp') => {
    if (method === 'email') {
      if (!patient.email) {
        toast({
          title: 'E-mail não disponível',
          description: 'Este paciente não possui e-mail cadastrado.',
          variant: 'destructive',
        });
        return;
      }
      window.location.href = `mailto:${patient.email}`;
    } else if (method === 'whatsapp') {
      if (!patient.phone) {
        toast({
          title: 'Telefone não disponível',
          description: 'Este paciente não possui telefone cadastrado.',
          variant: 'destructive',
        });
        return;
      }
      const cleanPhone = patient.phone.replace(/\D/g, '');
      window.open(`https://wa.me/55${cleanPhone}`, '_blank');
    }
  };

  const handleExport = () => {
    const csv = [
      ['Nome', 'E-mail', 'Telefone', 'Última Consulta', 'Dias Inativo', 'Risco'],
      ...filteredPatients.map((p) => [
        p.patient_name,
        p.email || '',
        p.phone || '',
        format(new Date(p.last_appointment_date), 'dd/MM/yyyy', { locale: ptBR }),
        p.days_inactive,
        riskConfig[p.risk_level].label,
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pacientes-em-risco-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Exportação concluída',
      description: 'Arquivo CSV baixado com sucesso.',
    });
  };

  return (
    <MainLayout>
      <div className="container max-w-7xl mx-auto py-6 md:py-10 space-y-8 px-4 sm:px-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-warning" />
              Pacientes em Risco
            </h1>
            <p className="text-muted-foreground mt-1">
              Identifique e reative pacientes que não retornam há muito tempo
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleExport} variant="outline" className="rounded-xl">
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="rounded-xl border border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total em Risco</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>

          <Card className={cn('rounded-xl border', riskConfig.critical.border)}>
            <CardHeader className="pb-2">
              <CardTitle className={cn('text-sm font-medium flex items-center gap-2', riskConfig.critical.color)}>
                <riskConfig.critical.icon className="h-4 w-4" />
                Críticos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={cn('text-3xl font-bold', riskConfig.critical.color)}>{stats.critical}</p>
              <p className="text-xs text-muted-foreground mt-1">90+ dias</p>
            </CardContent>
          </Card>

          <Card className={cn('rounded-xl border', riskConfig.high.border)}>
            <CardHeader className="pb-2">
              <CardTitle className={cn('text-sm font-medium flex items-center gap-2', riskConfig.high.color)}>
                <riskConfig.high.icon className="h-4 w-4" />
                Alto Risco
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={cn('text-3xl font-bold', riskConfig.high.color)}>{stats.high}</p>
              <p className="text-xs text-muted-foreground mt-1">60-89 dias</p>
            </CardContent>
          </Card>

          <Card className={cn('rounded-xl border', riskConfig.medium.border)}>
            <CardHeader className="pb-2">
              <CardTitle className={cn('text-sm font-medium flex items-center gap-2', riskConfig.medium.color)}>
                <riskConfig.medium.icon className="h-4 w-4" />
                Médio Risco
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={cn('text-3xl font-bold', riskConfig.medium.color)}>{stats.medium}</p>
              <p className="text-xs text-muted-foreground mt-1">30-59 dias</p>
            </CardContent>
          </Card>

          <Card className={cn('rounded-xl border', riskConfig.low.border)}>
            <CardHeader className="pb-2">
              <CardTitle className={cn('text-sm font-medium flex items-center gap-2', riskConfig.low.color)}>
                <riskConfig.low.icon className="h-4 w-4" />
                Baixo Risco
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={cn('text-3xl font-bold', riskConfig.low.color)}>{stats.low}</p>
              <p className="text-xs text-muted-foreground mt-1">14-29 dias</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="rounded-xl">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Filter className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, e-mail ou telefone..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <Select value={riskFilter} onValueChange={(v: any) => setRiskFilter(v)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrar por risco" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os níveis</SelectItem>
                  <SelectItem value="critical">Crítico</SelectItem>
                  <SelectItem value="high">Alto</SelectItem>
                  <SelectItem value="medium">Médio</SelectItem>
                  <SelectItem value="low">Baixo</SelectItem>
                </SelectContent>
              </Select>

              <Select value={daysFilter.toString()} onValueChange={(v) => setDaysFilter(Number(v))}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Dias sem consulta" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="14">14+ dias</SelectItem>
                  <SelectItem value="30">30+ dias</SelectItem>
                  <SelectItem value="60">60+ dias</SelectItem>
                  <SelectItem value="90">90+ dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Patients List */}
        {isLoading ? (
          <div className="text-center py-16">
            <div className="animate-pulse space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-20 bg-muted rounded-xl" />
              ))}
            </div>
          </div>
        ) : filteredPatients.length === 0 ? (
          <Card className="rounded-xl">
            <CardContent className="py-16 text-center">
              <CheckCircle2 className="h-16 w-16 text-success mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum paciente em risco</h3>
              <p className="text-muted-foreground">
                {riskFilter !== 'all' || searchTerm
                  ? 'Tente ajustar os filtros de busca.'
                  : `Não há pacientes sem consulta há mais de ${daysFilter} dias.`}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredPatients.map((patient) => {
              const config = riskConfig[patient.risk_level];
              const Icon = config.icon;

              return (
                <Card
                  key={patient.id}
                  className={cn('rounded-xl border hover:shadow-md transition-all', config.border)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1">
                        <div className={cn('p-3 rounded-full', config.bg)}>
                          <Icon className={cn('h-5 w-5', config.color)} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3">
                            <h4 className="font-semibold truncate">{patient.patient_name}</h4>
                            <Badge variant="outline" className={cn('text-xs', config.border, config.color)}>
                              {config.label}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(patient.last_appointment_date), 'dd/MM/yyyy', { locale: ptBR })}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {patient.days_inactive} dias inativo
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {patient.email && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleContact(patient, 'email')}
                            className="h-9"
                          >
                            <Mail className="h-4 w-4" />
                          </Button>
                        )}
                        {patient.phone && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleContact(patient, 'whatsapp')}
                            className="h-9"
                          >
                            <Phone className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.location.href = `/pacientes/${patient.id}`}
                          className="h-9"
                        >
                          Ver Perfil
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
