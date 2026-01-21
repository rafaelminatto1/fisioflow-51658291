import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/ui/card';
import { Button } from '@/components/shared/ui/button';
import { Badge } from '@/components/shared/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/shared/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select';
import {
  TrendingUp,
  BarChart3,
  LineChart,
  AreaChart,
  Table2,
  Loader2,
} from 'lucide-react';
import { MandatoryTestAlert } from './MandatoryTestAlert';
import { EvolutionChart } from './EvolutionChart';
import { EvolutionTable } from './EvolutionTable';
import type { MandatoryTestAlert as MandatoryTestAlertType } from '@/types/evolution';
import { useQuery } from '@tanstack/react-query';
import { TestEvolutionService } from '@/lib/services/testEvolutionService';

interface TestEvolutionPanelProps {
  patientId: string;
  sessionNumber?: number;
  mandatoryAlerts?: MandatoryTestAlertType[];
  onTestClick?: (testName: string) => void;
  onRegisterException?: (testName: string, reason: string) => void;
}

const AVAILABLE_TESTS = [
  { value: 'eva', label: 'EVA (Escala de Dor)' },
  { value: 'flexao_joelho', label: 'Flexão do Joelho' },
  { value: 'extensao_joelho', label: 'Extensão do Joelho' },
  { value: 'flexao_ombro', label: 'Flexão do Ombro' },
  { value: 'abducao_ombro', label: 'Abdução do Ombro' },
  { value: 'forca_muscular', label: 'Força Muscular' },
  { value: 'circunferencia', label: 'Circunferência' },
];

const CHART_TYPES = [
  { value: 'line', label: 'Linha', icon: LineChart },
  { value: 'bar', label: 'Barras', icon: BarChart3 },
  { value: 'area', label: 'Área', icon: AreaChart },
];

export const TestEvolutionPanel: React.FC<TestEvolutionPanelProps> = ({
  patientId,
  sessionNumber: _sessionNumber = 1,
  mandatoryAlerts = [],
  onTestClick,
  onRegisterException,
}) => {
  const [selectedTest, setSelectedTest] = useState<string>('eva');
  const [chartType, setChartType] = useState<'line' | 'bar' | 'area'>('line');
  const [activeTab, setActiveTab] = useState<'chart' | 'table'>('chart');

  const { data: testHistory, isLoading } = useQuery({
    queryKey: ['test-history', patientId],
    queryFn: () => TestEvolutionService.getTestHistory(patientId),
    enabled: !!patientId,
  });

  const { data: testData = [] } = useQuery({
    queryKey: ['test-evolution', patientId, selectedTest],
    queryFn: () => TestEvolutionService.getTestEvolutionData(patientId, selectedTest),
    enabled: !!patientId && !!selectedTest,
  });

  const availableTestsFromData = testHistory
    ? Array.from(testHistory.keys()).map((name) => ({
        value: name,
        label: name,
      }))
    : [];

  const allTests = [...AVAILABLE_TESTS];
  availableTestsFromData.forEach((test) => {
    if (!allTests.find((t) => t.value === test.value)) {
      allTests.push(test);
    }
  });

  const hasAlerts = mandatoryAlerts.some((a) => !a.is_completed);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-5 w-5 text-primary" />
            Evolução de Testes
          </CardTitle>
          {testData.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {testData.length} medições
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden space-y-4">
        {/* Alertas de Testes Obrigatórios */}
        {hasAlerts && (
          <MandatoryTestAlert
            alerts={mandatoryAlerts}
            onTestClick={onTestClick}
            onRegisterException={onRegisterException}
            compact
          />
        )}

        {/* Controles */}
        <div className="flex items-center gap-2">
          <Select value={selectedTest} onValueChange={setSelectedTest}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Selecione o teste" />
            </SelectTrigger>
            <SelectContent>
              {allTests.map((test) => (
                <SelectItem key={test.value} value={test.value}>
                  {test.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex border rounded-md">
            {CHART_TYPES.map((type) => {
              const Icon = type.icon;
              return (
                <Button
                  key={type.value}
                  size="sm"
                  variant={chartType === type.value ? 'secondary' : 'ghost'}
                  className="h-8 w-8 p-0"
                  onClick={() => setChartType(type.value as typeof chartType)}
                >
                  <Icon className="h-4 w-4" />
                </Button>
              );
            })}
          </div>
        </div>

        {/* Tabs Chart/Table */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="grid w-full grid-cols-2 h-8">
            <TabsTrigger value="chart" className="text-xs">
              <BarChart3 className="h-3 w-3 mr-1" />
              Gráfico
            </TabsTrigger>
            <TabsTrigger value="table" className="text-xs">
              <Table2 className="h-3 w-3 mr-1" />
              Tabela
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chart" className="mt-3 flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : testData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center">
                <BarChart3 className="h-12 w-12 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">
                  Nenhuma medição registrada
                </p>
                <p className="text-xs text-muted-foreground">
                  Registre medições para ver a evolução
                </p>
              </div>
            ) : (
              <EvolutionChart data={testData} chartType={chartType} testName={selectedTest} />
            )}
          </TabsContent>

          <TabsContent value="table" className="mt-3 flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : testData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center">
                <Table2 className="h-12 w-12 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">
                  Nenhum dado disponível
                </p>
              </div>
            ) : (
              <EvolutionTable data={testData} testName={selectedTest} />
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
