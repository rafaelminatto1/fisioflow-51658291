import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, Users, Calendar, TrendingUp, MessageCircle, Camera } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PartnerStats {
  activePatients: number;
  monthlyVouchers: number;
  grossRevenue: number;
  netRevenue: number;
  pendingCommissions: number;
}

interface PatientWithVoucher {
  id: string;
  name: string;
  avatar_url?: string;
  voucher_name: string;
  sessions_remaining: number;
  expiry_date: string;
  last_session?: string;
}

export default function Partner() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<PartnerStats>({
    activePatients: 0,
    monthlyVouchers: 0,
    grossRevenue: 0,
    netRevenue: 0,
    pendingCommissions: 0
  });
  const [patients, setPatients] = useState<PatientWithVoucher[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPartnerData = useCallback(async () => {
    try {
      // Load partner stats
      const { data: commissions } = await supabase
        .from('partner_commissions')
        .select('*')
        .eq('partner_id', profile?.user_id);

      const { data: purchases } = await supabase
        .from('voucher_purchases')
        .select(`
          *,
          vouchers (name),
          patients (name)
        `)
        .eq('status', 'active');

      const { data: sessions } = await supabase
        .from('partner_sessions')
        .select('*')
        .eq('partner_id', profile?.user_id);

      // Calculate stats
      const currentMonth = new Date().getMonth();
      const monthlyPurchases = purchases?.filter(p => 
        new Date(p.created_at).getMonth() === currentMonth
      ) || [];

      const totalCommissions = commissions?.reduce((sum, c) => sum + Number(c.commission_amount), 0) || 0;
      const pendingCommissions = commissions?.filter(c => c.status === 'pending')
        .reduce((sum, c) => sum + Number(c.commission_amount), 0) || 0;

      setStats({
        activePatients: new Set(purchases?.map(p => p.patient_id) || []).size,
        monthlyVouchers: monthlyPurchases.length,
        grossRevenue: monthlyPurchases.reduce((sum, p) => sum + Number(p.amount_paid), 0),
        netRevenue: totalCommissions,
        pendingCommissions
      });

      // Load patients with active vouchers
      const patientsData = purchases?.map(p => ({
        id: p.patient_id,
        name: p.patients?.name || 'Paciente',
        avatar_url: undefined,
        voucher_name: p.vouchers?.name || 'Voucher',
        sessions_remaining: p.sessions_remaining || 0,
        expiry_date: p.expiry_date,
        last_session: sessions?.find(s => s.patient_id === p.patient_id)?.session_date
      })) || [];

      setPatients(patientsData);
    } catch (error) {
      console.error('Error loading partner data:', error);
    } finally {
      setLoading(false);
    }
  }, [profile?.user_id]);

  useEffect(() => {
    if (profile?.role === 'parceiro') {
      loadPartnerData();
    }
  }, [profile?.role, loadPartnerData]);

  if (profile?.role !== 'parceiro') {
    return (
      <MainLayout>
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-destructive">Acesso Negado</h1>
          <p className="text-muted-foreground mt-2">Esta área é exclusiva para parceiros.</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard Parceira</h1>
            <p className="text-muted-foreground">
              Bem-vinda, {profile?.full_name}! Gerencie seus treinos e comissões.
            </p>
          </div>
          <Button>
            <Camera className="w-4 h-4 mr-2" />
            Registrar Atendimento
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Pacientes Ativos"
            value={stats.activePatients}
            icon={<Users className="h-5 w-5 text-primary" />}
            gradient
          />
          <StatsCard
            title="Vouchers Este Mês"
            value={stats.monthlyVouchers}
            icon={<Calendar className="h-5 w-5 text-secondary" />}
          />
          <StatsCard
            title="Receita Bruta"
            value={`R$ ${stats.grossRevenue.toFixed(2)}`}
            icon={<DollarSign className="h-5 w-5 text-accent" />}
          />
          <StatsCard
            title="A Receber"
            value={`R$ ${stats.pendingCommissions.toFixed(2)}`}
            change="Comissões pendentes"
            changeType="neutral"
            icon={<TrendingUp className="h-5 w-5 text-muted-foreground" />}
          />
        </div>

        <Tabs defaultValue="patients" className="space-y-6">
          <TabsList>
            <TabsTrigger value="patients">Meus Clientes</TabsTrigger>
            <TabsTrigger value="sessions">Registrar Sessão</TabsTrigger>
            <TabsTrigger value="financial">Financeiro</TabsTrigger>
          </TabsList>

          <TabsContent value="patients" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Pacientes com Vouchers Ativos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {patients.map((patient) => (
                    <div
                      key={patient.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/5 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={patient.avatar_url} />
                          <AvatarFallback>
                            {patient.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-medium">{patient.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {patient.voucher_name}
                          </p>
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <Badge variant="outline">
                          {patient.sessions_remaining} sessões restantes
                        </Badge>
                        <p className="text-xs text-muted-foreground">
                          Válido até {format(new Date(patient.expiry_date), 'dd/MM/yyyy', { locale: ptBR })}
                        </p>
                        {patient.last_session && (
                          <p className="text-xs text-muted-foreground">
                            Último treino: {format(new Date(patient.last_session), 'dd/MM', { locale: ptBR })}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <MessageCircle className="w-4 h-4" />
                        </Button>
                        <Button size="sm">
                          Registrar Sessão
                        </Button>
                      </div>
                    </div>
                  ))}
                  {patients.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">
                        Nenhum paciente com voucher ativo no momento.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sessions">
            <Card>
              <CardHeader>
                <CardTitle>Registrar Nova Sessão</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Funcionalidade de registro de sessões será implementada em breve.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="financial">
            <Card>
              <CardHeader>
                <CardTitle>Gestão Financeira</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-medium mb-2">Comissões Pendentes</h3>
                    <p className="text-2xl font-bold text-primary">
                      R$ {stats.pendingCommissions.toFixed(2)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      85% das vendas
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-medium mb-2">Total Recebido</h3>
                    <p className="text-2xl font-bold text-secondary">
                      R$ {(stats.netRevenue - stats.pendingCommissions).toFixed(2)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Histórico de pagamentos
                    </p>
                  </div>
                </div>
                <div className="mt-6">
                  <Button className="w-full">
                    Solicitar Saque via PIX
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}