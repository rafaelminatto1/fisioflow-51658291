import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lead } from '@/hooks/useLeads';
import { TrendingUp, TrendingDown, Users, Target, CheckCircle2, XCircle } from 'lucide-react';

interface LeadFunnelProps {
  leads: Lead[];
  estagios: { value: string; label: string; color: string }[];
}

export function LeadFunnel({ leads, estagios }: LeadFunnelProps) {
  // Calcular dados do funil
  const funnelData = estagios.map(estagio => {
    const count = leads.filter(l => l.estagio === estagio.value).length;
    return { ...estagio, count };
  });

  const total = leads.length;
  const efetivados = funnelData.find(f => f.value === 'efetivado')?.count || 0;
  const naoEfetivados = funnelData.find(f => f.value === 'nao_efetivado')?.count || 0;
  const emAndamento = total - efetivados - naoEfetivados;
  const taxaConversao = total > 0 ? ((efetivados / total) * 100).toFixed(1) : '0';
  const taxaPerda = total > 0 ? ((naoEfetivados / total) * 100).toFixed(1) : '0';

  // Calcular conversão entre estágios
  const estagiosAtivos = funnelData.filter(f => f.value !== 'nao_efetivado');
  const maxCount = Math.max(...estagiosAtivos.map(f => f.count), 1);

  return (
    <div className="space-y-6">
      {/* Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">{total}</div>
                <p className="text-sm text-muted-foreground">Total de Leads</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-amber-500/10">
                <Target className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-amber-600">{emAndamento}</div>
                <p className="text-sm text-muted-foreground">Em Andamento</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-emerald-500/10">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-emerald-600">{efetivados}</div>
                <p className="text-sm text-muted-foreground">Convertidos ({taxaConversao}%)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-rose-500/10">
                <XCircle className="h-5 w-5 text-rose-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-rose-600">{naoEfetivados}</div>
                <p className="text-sm text-muted-foreground">Perdidos ({taxaPerda}%)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Funil Visual */}
      <Card>
        <CardHeader>
          <CardTitle>Funil de Vendas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {estagiosAtivos.map((estagio, index) => {
              const width = maxCount > 0 ? (estagio.count / maxCount) * 100 : 0;
              const previousCount = index > 0 ? estagiosAtivos[index - 1].count : 0;
              const conversionRate = previousCount > 0 
                ? ((estagio.count / previousCount) * 100).toFixed(0) 
                : '100';
              
              return (
                <div key={estagio.value} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${estagio.color}`} />
                      <span className="font-medium">{estagio.label}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {index > 0 && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          {Number(conversionRate) >= 100 ? (
                            <TrendingUp className="h-3 w-3 text-emerald-500" />
                          ) : (
                            <TrendingDown className="h-3 w-3 text-rose-500" />
                          )}
                          {conversionRate}% do anterior
                        </span>
                      )}
                      <span className="font-bold">{estagio.count}</span>
                    </div>
                  </div>
                  <div className="relative h-10 bg-muted rounded-lg overflow-hidden">
                    <div 
                      className={`absolute left-0 top-0 h-full ${estagio.color} transition-all duration-500 flex items-center justify-center`}
                      style={{ 
                        width: `${Math.max(width, 5)}%`,
                        clipPath: index < estagiosAtivos.length - 1 
                          ? 'polygon(0 0, calc(100% - 20px) 0, 100% 50%, calc(100% - 20px) 100%, 0 100%)'
                          : undefined
                      }}
                    >
                      {width > 20 && (
                        <span className="text-white text-sm font-medium">
                          {estagio.count} leads
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Taxa de Conversão por Origem */}
          <div className="mt-8">
            <h4 className="font-medium mb-4">Conversão por Origem</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from(new Set(leads.map(l => l.origem).filter(Boolean))).map(origem => {
                const leadsOrigem = leads.filter(l => l.origem === origem);
                const convertidosOrigem = leadsOrigem.filter(l => l.estagio === 'efetivado').length;
                const taxaOrigem = leadsOrigem.length > 0 
                  ? ((convertidosOrigem / leadsOrigem.length) * 100).toFixed(0)
                  : '0';
                
                return (
                  <div key={origem} className="p-3 bg-muted rounded-lg">
                    <div className="text-sm font-medium">{origem}</div>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-2xl font-bold">{taxaOrigem}%</span>
                      <span className="text-xs text-muted-foreground">
                        ({convertidosOrigem}/{leadsOrigem.length})
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
