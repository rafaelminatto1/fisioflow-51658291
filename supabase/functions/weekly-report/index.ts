import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WeeklyMetrics {
  period: { start: string; end: string };
  appointments: {
    total: number;
    completed: number;
    cancelled: number;
    noShows: number;
    completionRate: number;
    noShowRate: number;
  };
  patients: {
    total: number;
    newPatients: number;
    activePatients: number;
    atRiskPatients: number;
  };
  financial: {
    totalRevenue: number;
    paidAmount: number;
    pendingAmount: number;
    averageTicket: number;
  };
  therapists: {
    name: string;
    appointments: number;
    revenue: number;
    completionRate: number;
  }[];
  highlights: string[];
  alerts: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Calcular período da semana anterior
    const now = new Date();
    const endOfWeek = new Date(now);
    endOfWeek.setDate(now.getDate() - now.getDay()); // Último domingo
    const startOfWeek = new Date(endOfWeek);
    startOfWeek.setDate(endOfWeek.getDate() - 6); // Segunda anterior

    const startDate = startOfWeek.toISOString().split('T')[0];
    const endDate = endOfWeek.toISOString().split('T')[0];

    console.log(`📊 Gerando relatório semanal: ${startDate} a ${endDate}`);

    // Buscar dados de agendamentos
    const { data: appointments } = await supabase
      .from('appointments')
      .select('id, status, payment_amount, therapist_id, patient_id')
      .gte('appointment_date', startDate)
      .lte('appointment_date', endDate);

    const totalAppointments = appointments?.length || 0;
    const completed = appointments?.filter(a => a.status === 'completed').length || 0;
    const cancelled = appointments?.filter(a => a.status === 'cancelled').length || 0;
    const noShows = appointments?.filter(a => a.status === 'no_show').length || 0;

    // Buscar pacientes
    const { data: allPatients } = await supabase
      .from('patients')
      .select('id, created_at, status');

    const { data: newPatients } = await supabase
      .from('patients')
      .select('id')
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    // Buscar financeiro
    const { data: financialData } = await supabase
      .from('contas_financeiras')
      .select('valor, status, tipo')
      .eq('tipo', 'receita')
      .gte('data_vencimento', startDate)
      .lte('data_vencimento', endDate);

    const totalRevenue = financialData?.reduce((sum, f) => sum + (f.valor || 0), 0) || 0;
    const paidAmount = financialData?.filter(f => f.status === 'pago').reduce((sum, f) => sum + (f.valor || 0), 0) || 0;
    const pendingAmount = totalRevenue - paidAmount;

    // Buscar performance por terapeuta
    const { data: therapists } = await supabase
      .from('profiles')
      .select('id, full_name')
      .not('full_name', 'is', null);

    const therapistPerformance = (therapists || []).map(t => {
      const therapistApts = appointments?.filter(a => a.therapist_id === t.id) || [];
      const therapistCompleted = therapistApts.filter(a => a.status === 'completed').length;
      const therapistRevenue = therapistApts.reduce((sum, a) => sum + (a.payment_amount || 0), 0);
      
      return {
        name: t.full_name || 'Sem nome',
        appointments: therapistApts.length,
        revenue: therapistRevenue,
        completionRate: therapistApts.length > 0 ? (therapistCompleted / therapistApts.length) * 100 : 0
      };
    }).filter(t => t.appointments > 0).sort((a, b) => b.revenue - a.revenue);

    // Gerar highlights e alertas
    const highlights: string[] = [];
    const alerts: string[] = [];

    const completionRate = totalAppointments > 0 ? (completed / totalAppointments) * 100 : 0;
    const noShowRate = totalAppointments > 0 ? (noShows / totalAppointments) * 100 : 0;

    if (completionRate >= 90) {
      highlights.push(`🎉 Excelente taxa de conclusão: ${completionRate.toFixed(1)}%`);
    }
    if (newPatients && newPatients.length >= 5) {
      highlights.push(`🌟 ${newPatients.length} novos pacientes cadastrados`);
    }
    if (paidAmount >= totalRevenue * 0.9) {
      highlights.push(`💰 ${((paidAmount / totalRevenue) * 100).toFixed(0)}% da receita já recebida`);
    }

    if (noShowRate >= 15) {
      alerts.push(`⚠️ Taxa de no-show alta: ${noShowRate.toFixed(1)}%`);
    }
    if (pendingAmount > totalRevenue * 0.3) {
      alerts.push(`💸 R$ ${pendingAmount.toFixed(2)} em pagamentos pendentes`);
    }
    if (cancelled > totalAppointments * 0.2) {
      alerts.push(`📉 ${cancelled} cancelamentos na semana (${((cancelled / totalAppointments) * 100).toFixed(0)}%)`);
    }

    const metrics: WeeklyMetrics = {
      period: { start: startDate, end: endDate },
      appointments: {
        total: totalAppointments,
        completed,
        cancelled,
        noShows,
        completionRate,
        noShowRate
      },
      patients: {
        total: allPatients?.length || 0,
        newPatients: newPatients?.length || 0,
        activePatients: allPatients?.filter(p => p.status === 'ativo').length || 0,
        atRiskPatients: 0 // Calculado separadamente se necessário
      },
      financial: {
        totalRevenue,
        paidAmount,
        pendingAmount,
        averageTicket: completed > 0 ? paidAmount / completed : 0
      },
      therapists: therapistPerformance.slice(0, 5),
      highlights,
      alerts
    };

    // Gerar HTML do relatório
    const reportHtml = generateReportHtml(metrics);

    // Buscar admins para enviar o relatório
    const { data: admins } = await supabase
      .from('profiles')
      .select('email, full_name')
      .not('email', 'is', null);

    // Enviar email se tiver chave do Resend
    if (resendApiKey && admins && admins.length > 0) {
      for (const admin of admins.slice(0, 3)) { // Limitar a 3 admins
        try {
          const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              from: 'Activity Fisioterapia <noreply@activityfisio.com.br>',
              to: admin.email,
              subject: `📊 Relatório Semanal - ${startDate} a ${endDate}`,
              html: reportHtml
            })
          });

          if (response.ok) {
            console.log(`✅ Relatório enviado para ${admin.email}`);
          }
        } catch (emailError) {
          console.error(`❌ Erro ao enviar para ${admin.email}:`, emailError);
        }
      }
    }

    // Salvar relatório no banco
    await supabase.from('daily_metrics').insert({
      metric_date: endDate,
      total_appointments: metrics.appointments.total,
      completed_appointments: metrics.appointments.completed,
      cancelled_appointments: metrics.appointments.cancelled,
      no_show_appointments: metrics.appointments.noShows,
      total_patients: metrics.patients.total,
      new_patients: metrics.patients.newPatients,
      active_patients: metrics.patients.activePatients,
      total_revenue: metrics.financial.totalRevenue,
      paid_amount: metrics.financial.paidAmount,
      pending_amount: metrics.financial.pendingAmount
    });

    console.log('✅ Relatório semanal gerado com sucesso');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Relatório semanal gerado e enviado',
        metrics
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro ao gerar relatório:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido" 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function generateReportHtml(metrics: WeeklyMetrics): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Relatório Semanal</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .header p { margin: 10px 0 0; opacity: 0.9; }
    .content { padding: 30px; }
    .section { margin-bottom: 25px; }
    .section-title { font-size: 16px; font-weight: 600; color: #374151; margin-bottom: 15px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; }
    .metrics-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
    .metric-card { background: #f9fafb; border-radius: 8px; padding: 15px; text-align: center; }
    .metric-value { font-size: 28px; font-weight: 700; color: #1f2937; }
    .metric-label { font-size: 12px; color: #6b7280; margin-top: 5px; }
    .highlight { background: #ecfdf5; border-left: 4px solid #10b981; padding: 12px; margin: 8px 0; border-radius: 0 8px 8px 0; }
    .alert { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 8px 0; border-radius: 0 8px 8px 0; }
    .therapist-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
    .therapist-name { font-weight: 500; }
    .therapist-stats { color: #6b7280; font-size: 14px; }
    .footer { background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Relatório Semanal</h1>
      <p>${metrics.period.start} a ${metrics.period.end}</p>
    </div>
    
    <div class="content">
      <div class="section">
        <div class="section-title">📅 Agendamentos</div>
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-value">${metrics.appointments.total}</div>
            <div class="metric-label">Total</div>
          </div>
          <div class="metric-card">
            <div class="metric-value" style="color: #10b981">${metrics.appointments.completed}</div>
            <div class="metric-label">Realizados</div>
          </div>
          <div class="metric-card">
            <div class="metric-value" style="color: #f59e0b">${metrics.appointments.cancelled}</div>
            <div class="metric-label">Cancelados</div>
          </div>
          <div class="metric-card">
            <div class="metric-value" style="color: #ef4444">${metrics.appointments.noShows}</div>
            <div class="metric-label">No-shows</div>
          </div>
        </div>
      </div>
      
      <div class="section">
        <div class="section-title">👥 Pacientes</div>
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-value">${metrics.patients.total}</div>
            <div class="metric-label">Total</div>
          </div>
          <div class="metric-card">
            <div class="metric-value" style="color: #3b82f6">+${metrics.patients.newPatients}</div>
            <div class="metric-label">Novos</div>
          </div>
        </div>
      </div>
      
      <div class="section">
        <div class="section-title">💰 Financeiro</div>
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-value">R$ ${metrics.financial.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
            <div class="metric-label">Receita Total</div>
          </div>
          <div class="metric-card">
            <div class="metric-value" style="color: #10b981">R$ ${metrics.financial.paidAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
            <div class="metric-label">Recebido</div>
          </div>
        </div>
      </div>

      ${metrics.therapists.length > 0 ? `
      <div class="section">
        <div class="section-title">🏆 Top Profissionais</div>
        ${metrics.therapists.map(t => `
          <div class="therapist-row">
            <span class="therapist-name">${t.name}</span>
            <span class="therapist-stats">${t.appointments} atend. • R$ ${t.revenue.toFixed(0)}</span>
          </div>
        `).join('')}
      </div>
      ` : ''}

      ${metrics.highlights.length > 0 ? `
      <div class="section">
        <div class="section-title">✨ Destaques</div>
        ${metrics.highlights.map(h => `<div class="highlight">${h}</div>`).join('')}
      </div>
      ` : ''}

      ${metrics.alerts.length > 0 ? `
      <div class="section">
        <div class="section-title">⚠️ Alertas</div>
        ${metrics.alerts.map(a => `<div class="alert">${a}</div>`).join('')}
      </div>
      ` : ''}
    </div>
    
    <div class="footer">
      <p>Activity Fisioterapia - Sistema de Gestão</p>
      <p>Este relatório foi gerado automaticamente.</p>
    </div>
  </div>
</body>
</html>
`;
}
