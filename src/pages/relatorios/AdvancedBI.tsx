import React from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { collection, getDocs, query as firestoreQuery, where, db } from '@/integrations/firebase/app';
import { normalizeFirestoreData } from '@/utils/firestoreData';
import { CalendarCheck2, DollarSign, FileBarChart2, TrendingUp } from 'lucide-react';

const DEFAULT_LOOKER_EMBED_URL = 'https://lookerstudio.google.com/embed/reporting/1se-9ZRSukdgQUiRqYTSjT8nFLTV0v8Uq/page/y5MR';

const toLookerEmbedUrl = (url: string): string => {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes('lookerstudio.google.com')) return url;

    parsed.searchParams.delete('authuser');

    if (parsed.pathname.startsWith('/embed/reporting/')) {
      return parsed.toString();
    }

    if (parsed.pathname.startsWith('/reporting/')) {
      parsed.pathname = `/embed${parsed.pathname}`;
      return parsed.toString();
    }

    return url;
  } catch {
    return url;
  }
};

const configuredLookerUrl = (import.meta.env.VITE_LOOKER_EMBED_URL || '').trim();
const LOOKER_EMBED_URL = toLookerEmbedUrl(configuredLookerUrl || DEFAULT_LOOKER_EMBED_URL);
const usingDefaultLooker = !configuredLookerUrl;

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const dateFormatter = new Intl.DateTimeFormat('pt-BR');

type AppointmentDoc = Record<string, unknown> & {
  appointment_date?: string;
  date?: string;
  created_at?: string;
  status?: string;
  payment_status?: string;
  payment_amount?: number | string;
  type?: string;
  appointment_type?: string;
  service_name?: string;
  servico_nome?: string;
  procedimento?: string;
  procedure?: string;
  service_id?: string;
  service?: { name?: string };
};

type TransactionDoc = Record<string, unknown> & {
  tipo?: string;
  valor?: number | string;
  status?: string;
  created_at?: string;
  data_pagamento?: string;
  date?: string;
  organization_id?: string;
};

interface TopService {
  nome: string;
  sessoes: number;
  receita: number;
}

interface BIReportData {
  id: string;
  nome: string;
  periodo: string;
  geradoEm: string;
  totalAgendamentos: number;
  totalRealizados: number;
  receitaBruta: number;
  ticketMedio: number;
  taxaComparecimento: number;
  taxaOcupacao: number;
  topServicos: TopService[];
}

const formatTwoDigits = (value: number): string => value.toString().padStart(2, '0');

const normalizeText = (value: unknown): string => {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

const parseMoney = (value: unknown): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value !== 'string') return 0;

  const clean = value.replace(/[^\d,.-]/g, '').trim();
  if (!clean) return 0;

  if (clean.includes(',') && clean.includes('.')) {
    const normalized = clean.replace(/\./g, '').replace(',', '.');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  if (clean.includes(',')) {
    const parsed = Number(clean.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  const parsed = Number(clean);
  return Number.isFinite(parsed) ? parsed : 0;
};

const parseDateValue = (value: unknown): Date | null => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === 'number') {
    const fromNumber = new Date(value);
    return Number.isNaN(fromNumber.getTime()) ? null : fromNumber;
  }
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const ymdMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymdMatch) {
    const [, y, m, d] = ymdMatch;
    return new Date(Number(y), Number(m) - 1, Number(d), 12, 0, 0);
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const isWithinRange = (date: Date | null, start: Date, end: Date): boolean => {
  if (!date) return false;
  return date >= start && date <= end;
};

const isCompletedStatus = (status: unknown): boolean => {
  const value = normalizeText(status);
  return ['concluido', 'atendido', 'realizado', 'completed'].includes(value);
};

const isCancelledStatus = (status: unknown): boolean => {
  const value = normalizeText(status);
  return ['cancelado', 'cancelled'].includes(value);
};

const isPaidStatus = (status: unknown): boolean => {
  const value = normalizeText(status);
  return ['paid', 'pago', 'concluido', 'completed'].includes(value);
};

const isIncomeTransaction = (tipo: unknown): boolean => {
  const value = normalizeText(tipo);
  return ['receita', 'recebimento', 'entrada', 'pagamento', 'payment'].includes(value);
};

const extractServiceName = (appointment: AppointmentDoc): string => {
  const candidates: unknown[] = [
    appointment.type,
    appointment.appointment_type,
    appointment.service_name,
    appointment.servico_nome,
    appointment.procedimento,
    appointment.procedure,
    appointment.service?.name,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }

  if (typeof appointment.service_id === 'string' && appointment.service_id.trim()) {
    return `Serviço ${appointment.service_id.slice(0, 8)}`;
  }

  return 'Sem classificação';
};

const getAppointmentDate = (appointment: AppointmentDoc): Date | null => {
  return (
    parseDateValue(appointment.appointment_date) ||
    parseDateValue(appointment.date) ||
    parseDateValue(appointment.created_at)
  );
};

const getTransactionDate = (transaction: TransactionDoc): Date | null => {
  return (
    parseDateValue(transaction.data_pagamento) ||
    parseDateValue(transaction.created_at) ||
    parseDateValue(transaction.date)
  );
};

export default function AdvancedBI() {
  const { organizationId } = useAuth();

  const { data: report, isLoading, isError, isFetching, error } = useQuery<BIReportData>({
    queryKey: ['advanced-bi-report', organizationId],
    queryFn: async () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const endOfPeriod = new Date();

      const appointmentsRef = collection(db, 'appointments');
      const transactionsRef = collection(db, 'transacoes');

      const appointmentsSnapshot = organizationId
        ? await getDocs(firestoreQuery(appointmentsRef, where('organization_id', '==', organizationId)))
        : await getDocs(appointmentsRef);

      const transactionsSnapshotResult = await (organizationId
        ? getDocs(firestoreQuery(transactionsRef, where('organization_id', '==', organizationId)))
        : getDocs(transactionsRef)).catch(() => null);

      const appointments = appointmentsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...normalizeFirestoreData(doc.data()),
      })) as AppointmentDoc[];

      const transactions = transactionsSnapshotResult
        ? (transactionsSnapshotResult.docs.map((doc) => ({
            id: doc.id,
            ...normalizeFirestoreData(doc.data()),
          })) as TransactionDoc[])
        : [];

      const appointmentsInPeriod = appointments.filter((appointment) =>
        isWithinRange(getAppointmentDate(appointment), startOfMonth, endOfPeriod)
      );

      const transactionsInPeriod = transactions.filter((transaction) =>
        isWithinRange(getTransactionDate(transaction), startOfMonth, endOfPeriod)
      );

      const totalAgendamentos = appointmentsInPeriod.length;
      const totalRealizados = appointmentsInPeriod.filter((appointment) => isCompletedStatus(appointment.status)).length;
      const totalCancelados = appointmentsInPeriod.filter((appointment) => isCancelledStatus(appointment.status)).length;

      const receitaFromAppointments = appointmentsInPeriod.reduce((sum, appointment) => {
        const amount = parseMoney(appointment.payment_amount);
        const paid = isPaidStatus(appointment.payment_status) || isCompletedStatus(appointment.status);
        return paid ? sum + amount : sum;
      }, 0);

      const receitaFromTransactions = transactionsInPeriod.reduce((sum, transaction) => {
        const isIncome = isIncomeTransaction(transaction.tipo);
        const isValidStatus = !transaction.status || !['cancelado', 'cancelled'].includes(normalizeText(transaction.status));
        if (!isIncome || !isValidStatus) return sum;
        return sum + parseMoney(transaction.valor);
      }, 0);

      const receitaBruta = receitaFromTransactions > 0 ? receitaFromTransactions : receitaFromAppointments;
      const ticketMedio = totalRealizados > 0 ? receitaBruta / totalRealizados : 0;
      const taxaComparecimento = totalAgendamentos > 0 ? (totalRealizados / totalAgendamentos) * 100 : 0;
      const taxaOcupacao = totalAgendamentos > 0 ? ((totalAgendamentos - totalCancelados) / totalAgendamentos) * 100 : 0;

      const serviceMap = new Map<string, { sessoes: number; receita: number }>();
      appointmentsInPeriod.forEach((appointment) => {
        const serviceName = extractServiceName(appointment);
        const current = serviceMap.get(serviceName) || { sessoes: 0, receita: 0 };
        current.sessoes += 1;
        current.receita += parseMoney(appointment.payment_amount);
        serviceMap.set(serviceName, current);
      });

      const topServicos = Array.from(serviceMap.entries())
        .map(([nome, values]) => ({ nome, sessoes: values.sessoes, receita: values.receita }))
        .sort((a, b) => {
          if (b.sessoes === a.sessoes) return b.receita - a.receita;
          return b.sessoes - a.sessoes;
        })
        .slice(0, 3);

      const reportIdDate = `${now.getFullYear()}${formatTwoDigits(now.getMonth() + 1)}${formatTwoDigits(now.getDate())}-${formatTwoDigits(now.getHours())}${formatTwoDigits(now.getMinutes())}`;

      return {
        id: `REL-BI-${reportIdDate}`,
        nome: 'Relatório Executivo - Firestore',
        periodo: `${dateFormatter.format(startOfMonth)} a ${dateFormatter.format(endOfPeriod)}`,
        geradoEm: `${dateFormatter.format(now)} ${formatTwoDigits(now.getHours())}:${formatTwoDigits(now.getMinutes())}`,
        totalAgendamentos,
        totalRealizados,
        receitaBruta,
        ticketMedio,
        taxaComparecimento,
        taxaOcupacao,
        topServicos,
      };
    },
    staleTime: 1000 * 60 * 5,
  });

  const loadErrorMessage = error instanceof Error ? error.message : 'Não foi possível carregar o relatório.';

  return (
    <MainLayout>
      <div className="space-y-6 p-4 md:p-6">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold">Business Intelligence</h1>
          <p className="text-sm text-muted-foreground">
            Relatórios gerenciais da clínica com visão de produção e faturamento.
          </p>
        </div>

        {isError && (
          <Card className="border-destructive/40">
            <CardHeader>
              <CardTitle className="text-lg text-destructive">Erro ao carregar relatório</CardTitle>
              <CardDescription>{loadErrorMessage}</CardDescription>
            </CardHeader>
          </Card>
        )}

        <Card className="border-primary/20 bg-gradient-to-r from-primary/10 via-background to-background">
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-lg">{report?.nome || 'Relatório Executivo'}</CardTitle>
                <CardDescription>
                  {isLoading ? 'Carregando dados do Firestore...' : `Período: ${report?.periodo || '-'} | Gerado em: ${report?.geradoEm || '-'}`}
                </CardDescription>
              </div>
              <Badge className="w-fit">{isFetching ? 'Atualizando...' : `ID ${report?.id || '-'}`}</Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Agendamentos</p>
                  <CalendarCheck2 className="h-4 w-4 text-primary" />
                </div>
                <p className="mt-2 text-2xl font-semibold">{report?.totalAgendamentos ?? 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Realizados</p>
                  <FileBarChart2 className="h-4 w-4 text-primary" />
                </div>
                <p className="mt-2 text-2xl font-semibold">{report?.totalRealizados ?? 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Receita Bruta</p>
                  <DollarSign className="h-4 w-4 text-primary" />
                </div>
                <p className="mt-2 text-2xl font-semibold">{money.format(report?.receitaBruta || 0)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Ticket Médio</p>
                  <TrendingUp className="h-4 w-4 text-primary" />
                </div>
                <p className="mt-2 text-2xl font-semibold">{money.format(report?.ticketMedio || 0)}</p>
              </CardContent>
            </Card>
          </CardContent>
        </Card>

        <div className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Indicadores de Eficiência</CardTitle>
              <CardDescription>Resumo operacional do período selecionado.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Taxa de Comparecimento</span>
                  <span className="font-medium">{(report?.taxaComparecimento || 0).toFixed(1)}%</span>
                </div>
                <Progress value={report?.taxaComparecimento || 0} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Taxa de Ocupação</span>
                  <span className="font-medium">{(report?.taxaOcupacao || 0).toFixed(1)}%</span>
                </div>
                <Progress value={report?.taxaOcupacao || 0} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Top Serviços</CardTitle>
              <CardDescription>Procedimentos com maior volume e faturamento.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {(report?.topServicos || []).length === 0 && (
                <div className="rounded-md border p-3">
                  <p className="text-sm text-muted-foreground">Sem dados suficientes para ranking neste período.</p>
                </div>
              )}
              {(report?.topServicos || []).map((servico) => (
                <div key={servico.nome} className="rounded-md border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{servico.nome}</p>
                    <Badge variant="outline">{servico.sessoes} sessões</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Receita no período: {money.format(servico.receita)}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Painel Externo (Looker Studio)</CardTitle>
            <CardDescription>
              Configure `VITE_LOOKER_EMBED_URL` no `.env.local` para usar seu relatório.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
              {usingDefaultLooker
                ? 'Exibindo painel público de exemplo. Para usar o seu, defina VITE_LOOKER_EMBED_URL.'
                : 'Se aparecer erro de permissão, compartilhe o relatório no Looker Studio com esta conta ou publique para visualização.'}
            </div>
            <div className="h-[520px] overflow-hidden rounded-lg border bg-muted/20">
              <iframe
                src={LOOKER_EMBED_URL}
                className="h-full w-full border-0 bg-white"
                allowFullScreen
                title="Looker Studio BI"
              />
            </div>
            <a
              href={LOOKER_EMBED_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex text-sm text-primary underline-offset-4 hover:underline"
            >
              Abrir painel do Looker em nova aba
            </a>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
