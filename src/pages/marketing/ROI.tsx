/**
 * Marketing ROI Calculator Page
 *
 * Calculate return on investment for marketing campaigns
 */

import React, { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {

  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Calculator,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  Target,
  BarChart3,
  PiggyBank,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { calculateMarketingROI } from '@/services/marketing/marketingService';
import { useAuth } from '@/contexts/AuthContext';
import { subMonths } from 'date-fns';

interface ROIMetrics {
  totalLeads: number;
  costPerLead: number;
  conversionRate: number;
  roi: number;
  returnOnAdSpend: number;
}

export default function ROICalculatorPage() {
  const { user } = useAuth();
  const organizationId = user?.organizationId || '';

  const [period, setPeriod] = useState<'30' | '60' | '90' | 'custom'>('30');
  const [adSpend, setAdSpend] = useState<string>('');
  const [avgTicket, setAvgTicket] = useState<string>('500');
  const [calculating, setCalculating] = useState(false);
  const [results, setResults] = useState<ROIMetrics | null>(null);

  const handleCalculate = async () => {
    if (!adSpend || parseFloat(adSpend) <= 0) {
      toast.error('Informe o valor investido em anúncios');
      return;
    }

    setCalculating(true);

    try {
      const days = parseInt(period);
      const endDate = new Date();
      const startDate = subMonths(endDate, days / 30);

      const metrics = await calculateMarketingROI(
        organizationId,
        startDate,
        endDate,
        parseFloat(adSpend)
      );

      // Override with custom average ticket if provided
      const ticket = parseFloat(avgTicket) || 500;
      const totalRevenue = metrics.totalLeads * (metrics.conversionRate / 100) * ticket;
      const roi = ((totalRevenue - parseFloat(adSpend)) / parseFloat(adSpend)) * 100;
      const roas = totalRevenue / parseFloat(adSpend);

      setResults({
        ...metrics,
        roi,
        returnOnAdSpend: roas,
      });

      toast.success('Cálculo realizado com sucesso');
    } catch (error) {
      console.error('Error calculating ROI:', error);
      toast.error('Erro ao calcular ROI. Tente novamente.');
    } finally {
      setCalculating(false);
    }
  };

  const getROIStatus = (roi: number) => {
    if (roi >= 300) return { label: 'Excelente', color: 'text-emerald-600 bg-emerald-50' };
    if (roi >= 200) return { label: 'Muito Bom', color: 'text-green-600 bg-green-50' };
    if (roi >= 100) return { label: 'Bom', color: 'text-blue-600 bg-blue-50' };
    if (roi >= 0) return { label: 'Atenção', color: 'text-amber-600 bg-amber-50' };
    return { label: 'Prejuízo', color: 'text-red-600 bg-red-50' };
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  return (
    <MainLayout>
      <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Calculator className="h-8 w-8" />
          Calculadora de ROI de Marketing
        </h1>
        <p className="text-muted-foreground mt-1">
          Analise o retorno dos seus investimentos em marketing
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Input Panel */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Dados da Campanha
            </CardTitle>
            <CardDescription>Insira os dados para calcular o ROI</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Período de Análise</Label>
              <Select value={period} onValueChange={(value: unknown) => setPeriod(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">Últimos 30 dias</SelectItem>
                  <SelectItem value="60">Últimos 60 dias</SelectItem>
                  <SelectItem value="90">Últimos 90 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Investimento em Ads (R$)</Label>
              <Input
                type="number"
                placeholder="Ex: 1000"
                value={adSpend}
                onChange={(e) => setAdSpend(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Valor total investido em Facebook Ads, Google Ads, etc.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Ticket Médio por Paciente (R$)</Label>
              <Input
                type="number"
                placeholder="Ex: 500"
                value={avgTicket}
                onChange={(e) => setAvgTicket(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Valor médio que cada paciente gera no tratamento
              </p>
            </div>

            <Button onClick={handleCalculate} disabled={calculating} className="w-full">
              {calculating ? (
                <>
                  <Calculator className="h-4 w-4 mr-2 animate-pulse" />
                  Calculando...
                </>
              ) : (
                <>
                  <Calculator className="h-4 w-4 mr-2" />
                  Calcular ROI
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results Panel */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Resultados
            </CardTitle>
            <CardDescription>
              {results
                ? 'Métricas de desempenho da campanha'
                : 'Preencha os dados e clique em calcular'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {results ? (
              <div className="space-y-6">
                {/* Main ROI Display */}
                <div className="text-center p-6 rounded-lg bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950">
                  <p className="text-sm text-muted-foreground mb-2">Retorno sobre Investimento</p>
                  <div className="flex items-center justify-center gap-3">
                    <p className="text-5xl font-bold">{formatPercent(results.roi)}</p>
                    <div className={cn('px-3 py-1 rounded-full text-sm font-medium', getROIStatus(results.roi).color)}>
                      {getROIStatus(results.roi).label}
                    </div>
                  </div>
                  {results.roi >= 0 ? (
                    <TrendingUp className="h-6 w-6 mx-auto mt-3 text-emerald-600" />
                  ) : (
                    <TrendingDown className="h-6 w-6 mx-auto mt-3 text-red-600" />
                  )}
                </div>

                {/* Metrics Grid */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                      <Users className="h-4 w-4" />
                      <span className="text-sm">Leads Gerados</span>
                    </div>
                    <p className="text-2xl font-bold">{results.totalLeads}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Pacientes vindos de canais pagos
                    </p>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                      <DollarSign className="h-4 w-4" />
                      <span className="text-sm">Custo por Lead (CPL)</span>
                    </div>
                    <p className="text-2xl font-bold">{formatCurrency(results.costPerLead)}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Quanto custou cada novo paciente
                    </p>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                      <Target className="h-4 w-4" />
                      <span className="text-sm">Taxa de Conversão</span>
                    </div>
                    <p className="text-2xl font-bold">{formatPercent(results.conversionRate)}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Leads que viraram pacientes ativos
                    </p>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                      <PiggyBank className="h-4 w-4" />
                      <span className="text-sm">Retorno (ROAS)</span>
                    </div>
                    <p className="text-2xl font-bold">
                      {results.returnOnAdSpend.toFixed(2)}x
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Valor retornado por cada R$ 1 investido
                    </p>
                  </div>
                </div>

                {/* Revenue Breakdown */}
                <div className="p-4 border rounded-lg bg-muted/30">
                  <h4 className="font-semibold mb-3">Breakdown de Receita</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Investimento:</span>
                      <span className="font-medium text-red-600">
                        -{formatCurrency(parseFloat(adSpend))}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Receita Gerada:</span>
                      <span className="font-medium text-emerald-600">
                        +{formatCurrency(
                          results.totalLeads *
                            (results.conversionRate / 100) *
                            parseFloat(avgTicket)
                        )}
                      </span>
                    </div>
                    <div className="border-t pt-2 flex justify-between font-semibold">
                      <span>Lucro/Prejuízo:</span>
                      <span
                        className={cn(
                          results.roi >= 0 ? 'text-emerald-600' : 'text-red-600'
                        )}
                      >
                        {formatCurrency(
                          results.totalLeads *
                            (results.conversionRate / 100) *
                            parseFloat(avgTicket) -
                            parseFloat(adSpend)
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <Calculator className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-30" />
                <p className="text-muted-foreground">
                  Preencha os dados da campanha para ver os resultados
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tips Card */}
      <Card className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                Dicas para Melhorar seu ROI
              </p>
              <ul className="space-y-1 text-blue-800 dark:text-blue-200">
                <li>• CRM bem segmentado aumenta conversão em até 40%</li>
                <li>• Anúncios com antes/depois têm CTR 3x maior</li>
                <li>• Email marketing para pacientes inativos tem ROI de 4200%</li>
                <li>• Google My Business otimizado aumenta contatos em 50%</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </MainLayout>
  );
}

import { cn } from '@/lib/utils';
