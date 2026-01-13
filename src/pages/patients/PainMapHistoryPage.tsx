import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ArrowLeft, Calendar, FileText, TrendingDown, Activity,
  MapPin, Target, Clock, Download, GitCompare
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { usePainMapHistory } from '@/hooks/usePainMapHistory';
import { PainMapComparisonModal } from '@/components/pain-map/PainMapComparisonModal';
import { PainMapService } from '@/lib/services/painMapService';
import type { PainMapPoint, BodyRegion } from '@/types/painMap';
import { PatientHelpers } from '@/types';

// Mini body SVG for cards
const bodyPaths: Record<BodyRegion, { path: string }> = {
  cabeca: { path: "M50,5 C58,5 64,12 64,22 C64,32 58,38 50,38 C42,38 36,32 36,22 C36,12 42,5 50,5 Z" },
  pescoco: { path: "M45,38 L55,38 L56,48 L44,48 Z" },
  ombro_direito: { path: "M44,48 L28,58 L26,54 C30,50 38,48 44,48 Z" },
  ombro_esquerdo: { path: "M56,48 L72,58 L74,54 C70,50 62,48 56,48 Z" },
  torax: { path: "M44,48 L56,48 L60,75 L40,75 Z" },
  braco_direito: { path: "M28,58 L20,80 L26,82 L30,62 Z" },
  braco_esquerdo: { path: "M72,58 L80,80 L74,82 L70,62 Z" },
  antebraco_direito: { path: "M20,80 L26,82 L24,105 L16,103 Z" },
  antebraco_esquerdo: { path: "M80,80 L74,82 L76,105 L84,103 Z" },
  mao_direita: { path: "M16,103 L24,105 L25,115 L13,114 Z" },
  mao_esquerda: { path: "M84,103 L76,105 L75,115 L87,114 Z" },
  abdomen: { path: "M40,75 L60,75 L58,95 L42,95 Z" },
  lombar: { path: "M42,95 L58,95 L56,108 L44,108 Z" },
  quadril_direito: { path: "M44,108 L50,118 L40,118 Z" },
  quadril_esquerdo: { path: "M56,108 L50,118 L60,118 Z" },
  coxa_direita: { path: "M40,118 L50,118 L48,155 L38,155 Z" },
  coxa_esquerda: { path: "M50,118 L60,118 L62,155 L52,155 Z" },
  joelho_direito: { path: "M38,155 L48,155 L47,170 L37,170 Z" },
  joelho_esquerdo: { path: "M52,155 L62,155 L63,170 L53,170 Z" },
  perna_direita: { path: "M37,170 L47,170 L45,205 L35,205 Z" },
  perna_esquerda: { path: "M53,170 L63,170 L65,205 L55,205 Z" },
  tornozelo_direito: { path: "M35,205 L45,205 L44,215 L34,215 Z" },
  tornozelo_esquerdo: { path: "M55,205 L65,205 L66,215 L56,215 Z" },
  pe_direito: { path: "M30,215 L44,222 L28,220 Z" },
  pe_esquerdo: { path: "M56,215 L70,222 L72,220 Z" },
};

function MiniBodyThumbnail({ painPoints }: { painPoints: PainMapPoint[] }) {
  const getColor = (intensity: number) => {
    if (intensity <= 2) return '#22c55e';
    if (intensity <= 4) return '#84cc16';
    if (intensity <= 6) return '#eab308';
    if (intensity <= 8) return '#f97316';
    return '#ef4444';
  };

  const pointsMap = new Map<BodyRegion, number>();
  painPoints.forEach(p => pointsMap.set(p.region, p.intensity));

  return (
    <svg viewBox="0 0 100 240" className="w-16 h-24">
      {(Object.keys(bodyPaths) as BodyRegion[]).map((region) => {
        const intensity = pointsMap.get(region) || 0;
        return (
          <path
            key={region}
            d={bodyPaths[region].path}
            fill={intensity > 0 ? getColor(intensity) : 'hsl(var(--muted))'}
            stroke="hsl(var(--border))"
            strokeWidth="0.3"
            opacity={intensity > 0 ? 0.8 : 0.3}
          />
        );
      })}
    </svg>
  );
}

export default function PainMapHistoryPage() {
  const { id: patientId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [comparisonOpen, setComparisonOpen] = useState(false);

  // Fetch patient info
  const { data: patient, isLoading: patientLoading } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: async () => {
      if (!patientId) return null;
      const { data, error } = await supabase
        .from('patients')
        .select('id, name')
        .eq('id', patientId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!patientId
  });

  // Fetch pain map history
  const { data: historyData, isLoading: historyLoading } = usePainMapHistory(patientId || '');

  const isLoading = patientLoading || historyLoading;

  const exportPDF = () => {
    if (!historyData || !patient) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFontSize(18);
    doc.setTextColor(80, 52, 255);
    doc.text('Relatório de Evolução de Dor', pageWidth / 2, 20, { align: 'center' });
    
    // Patient info
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Paciente: ${PatientHelpers.getName(patient)}`, 14, 35);
    doc.text(`Data do Relatório: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}`, 14, 42);
    
    // Statistics
    doc.setFontSize(14);
    doc.text('Estatísticas Gerais', 14, 55);
    
    autoTable(doc, {
      startY: 60,
      head: [['Métrica', 'Valor']],
      body: [
        ['Total de Sessões', historyData.statistics.totalSessions.toString()],
        ['Média de Dor', `${historyData.statistics.avgPainLevel}/10`],
        ['Redução de Dor', `${historyData.statistics.painReduction}%`],
        ['Região Mais Afetada', historyData.statistics.mostAffectedRegion],
        ['Previsão de Alta', historyData.statistics.estimatedWeeksToRecovery 
          ? `${historyData.statistics.estimatedWeeksToRecovery} semanas`
          : 'Não disponível'
        ],
      ],
      theme: 'striped',
      headStyles: { fillColor: [80, 52, 255] }
    });

    // Insights
    const insightY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.text('Insights', 14, insightY);
    
    autoTable(doc, {
      startY: insightY + 5,
      head: [['Status', 'Observação']],
      body: historyData.insights.map(i => [i.icon, i.text]),
      theme: 'striped',
      headStyles: { fillColor: [80, 52, 255] }
    });

    // Region ranking
    const regionY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.text('Ranking de Regiões Mais Afetadas', 14, regionY);
    
    autoTable(doc, {
      startY: regionY + 5,
      head: [['Região', 'Intensidade Média', 'Frequência']],
      body: historyData.regionRanking.map(r => [
        r.label,
        `${r.avgIntensity}/10`,
        `${r.frequency} sessões`
      ]),
      theme: 'striped',
      headStyles: { fillColor: [80, 52, 255] }
    });

    // Session history
    if (historyData.painMaps.length > 0) {
      doc.addPage();
      doc.setFontSize(14);
      doc.text('Histórico de Sessões', 14, 20);
      
      autoTable(doc, {
        startY: 25,
        head: [['Data', 'Dor Global', 'Regiões Afetadas', 'Observações']],
        body: historyData.painMaps.slice(0, 10).map(pm => [
          format(new Date(pm.recorded_at), "dd/MM/yyyy HH:mm", { locale: ptBR }),
          `${pm.global_pain_level}/10`,
          (pm.pain_points as PainMapPoint[]).length.toString(),
          pm.notes || '-'
        ]),
        theme: 'striped',
        headStyles: { fillColor: [80, 52, 255] }
      });
    }

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128);
      doc.text(
        `FisioFlow - Gerado em ${format(new Date(), "dd/MM/yyyy HH:mm")} - Página ${i}/${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }

    const patientName = PatientHelpers.getName(patient);
    doc.save(`fisioflow_mapa_dor_${patientName.replace(/\s/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`);
  };

  if (!patientId) {
    return (
      <MainLayout>
        <div className="p-6 text-center">
          <p className="text-muted-foreground">Paciente não encontrado</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-4 md:p-6 space-y-6 pb-20 md:pb-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <MapPin className="w-6 h-6 text-primary" />
                Histórico de Mapas de Dor
              </h1>
              {patient && (
                <p className="text-muted-foreground">{PatientHelpers.getName(patient)}</p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setComparisonOpen(true)} disabled={!historyData || historyData.painMaps.length < 2}>
              <GitCompare className="w-4 h-4 mr-2" />
              Comparar
            </Button>
            <Button onClick={exportPDF} disabled={!historyData || historyData.painMaps.length === 0}>
              <Download className="w-4 h-4 mr-2" />
              Exportar PDF
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}><CardContent className="p-6"><Skeleton className="h-20" /></CardContent></Card>
            ))}
          </div>
        ) : historyData && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Calendar className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Sessões</p>
                      <p className="text-2xl font-bold">{historyData.statistics.totalSessions}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-yellow-500/10 rounded-lg">
                      <Activity className="w-5 h-5 text-yellow-500" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Média de Dor</p>
                      <p className="text-2xl font-bold">{historyData.statistics.avgPainLevel}/10</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className={historyData.statistics.painReduction > 0 ? 'border-green-500/30' : 'border-red-500/30'}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${historyData.statistics.painReduction > 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                      {historyData.statistics.painReduction > 0 ? (
                        <TrendingDown className="w-5 h-5 text-green-500" />
                      ) : (
                        <TrendingUp className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Redução de Dor</p>
                      <p className="text-2xl font-bold">{historyData.statistics.painReduction}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                      <Clock className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Previsão Alta</p>
                      <p className="text-2xl font-bold">
                        {historyData.statistics.estimatedWeeksToRecovery 
                          ? `${historyData.statistics.estimatedWeeksToRecovery}sem`
                          : 'N/A'
                        }
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Insights */}
            {historyData.insights.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-primary" />
                    Insights Automáticos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {historyData.insights.map((insight, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg flex items-center gap-3 ${
                          insight.type === 'improvement' ? 'bg-green-500/10' :
                          insight.type === 'worsening' ? 'bg-red-500/10' :
                          'bg-muted/50'
                        }`}
                      >
                        <span className="text-xl">{insight.icon}</span>
                        <p className="text-sm">{insight.text}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Evolution Line Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Evolução da Intensidade</CardTitle>
                </CardHeader>
                <CardContent>
                  {historyData.evolutionData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={historyData.evolutionData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                        <YAxis domain={[0, 10]} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="avgIntensity"
                          name="Intensidade Média"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          dot={{ fill: 'hsl(var(--primary))' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                      Sem dados suficientes
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Region Ranking Bar Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Regiões Mais Afetadas</CardTitle>
                </CardHeader>
                <CardContent>
                  {historyData.regionRanking.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={historyData.regionRanking} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis type="number" domain={[0, 10]} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                        <YAxis type="category" dataKey="label" width={100} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                        <Bar dataKey="avgIntensity" name="Intensidade Média" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                      Sem dados suficientes
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Session History Grid */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Histórico de Sessões
                </CardTitle>
              </CardHeader>
              <CardContent>
                {historyData.painMaps.length > 0 ? (
                  <ScrollArea className="h-[400px]">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {historyData.painMaps.slice(0, 10).map((painMap) => {
                        const points = painMap.pain_points as PainMapPoint[];
                        const mostAffected = points.length > 0
                          ? points.sort((a, b) => b.intensity - a.intensity)[0]
                          : null;

                        return (
                          <Card key={painMap.id} className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                            <div className="flex gap-4">
                              <MiniBodyThumbnail painPoints={points} />
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center justify-between">
                                  <p className="font-semibold">
                                    {format(new Date(painMap.recorded_at), "dd/MM/yyyy", { locale: ptBR })}
                                  </p>
                                  <Badge variant={
                                    painMap.global_pain_level <= 3 ? 'secondary' :
                                    painMap.global_pain_level <= 6 ? 'default' :
                                    'destructive'
                                  }>
                                    {painMap.global_pain_level}/10
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(painMap.recorded_at), "HH:mm", { locale: ptBR })}
                                </p>
                                <div className="text-sm space-y-1">
                                  <p><span className="text-muted-foreground">Regiões:</span> {points.length}</p>
                                  {mostAffected && (
                                    <p className="text-xs">
                                      <span className="text-muted-foreground">Mais afetada:</span>{' '}
                                      {PainMapService.getRegionLabel(mostAffected.region)}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                            {painMap.notes && (
                              <p className="text-xs text-muted-foreground mt-2 line-clamp-2 border-t pt-2">
                                {painMap.notes}
                              </p>
                            )}
                          </Card>
                        );
                      })}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="text-center py-12">
                    <MapPin className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">Nenhum mapa de dor registrado</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Comparison Modal */}
        {historyData && (
          <PainMapComparisonModal
            open={comparisonOpen}
            onOpenChange={setComparisonOpen}
            painMaps={historyData.painMaps}
          />
        )}
      </div>
    </MainLayout>
  );
}
