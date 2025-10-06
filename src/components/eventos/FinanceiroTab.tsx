import { usePrestadores } from '@/hooks/usePrestadores';
import { useChecklist } from '@/hooks/useChecklist';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingDown, TrendingUp, AlertCircle } from 'lucide-react';

interface FinanceiroTabProps {
  eventoId: string;
  evento: any;
}

export function FinanceiroTab({ eventoId, evento }: FinanceiroTabProps) {
  const { data: prestadores } = usePrestadores(eventoId);
  const { data: checklistItems } = useChecklist(eventoId);

  const custoPrestadores = prestadores?.reduce((sum, p) => sum + Number(p.valor_acordado), 0) || 0;
  const custoInsumos = checklistItems?.reduce((sum, item) => 
    sum + (Number(item.custo_unitario) * item.quantidade), 0) || 0;
  
  const custoTotal = custoPrestadores + custoInsumos;
  
  const prestadoresPagos = prestadores?.filter(p => p.status_pagamento === 'PAGO')
    .reduce((sum, p) => sum + Number(p.valor_acordado), 0) || 0;
  const prestadoresPendentes = custoPrestadores - prestadoresPagos;

  return (
    <div className="space-y-6">
      {/* Resumo Geral */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Custo Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {custoTotal.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Soma de todos os custos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pago</CardTitle>
            <TrendingDown className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              R$ {prestadoresPagos.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Prestadores já pagos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pendente</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              R$ {prestadoresPendentes.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Aguardando pagamento
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown por Categoria */}
      <Card>
        <CardHeader>
          <CardTitle>Detalhamento de Custos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <p className="font-medium">Prestadores de Serviço</p>
              <p className="text-sm text-muted-foreground">
                {prestadores?.length || 0} prestador(es)
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold">R$ {custoPrestadores.toFixed(2)}</p>
              <p className="text-xs text-green-600">
                Pago: R$ {prestadoresPagos.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <p className="font-medium">Insumos (Checklist)</p>
              <p className="text-sm text-muted-foreground">
                {checklistItems?.length || 0} item(ns)
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold">R$ {custoInsumos.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">
                Levar, alugar e comprar
              </p>
            </div>
          </div>

          {/* Breakdown por tipo de checklist */}
          {checklistItems && checklistItems.length > 0 && (
            <div className="pl-4 space-y-2">
              {['levar', 'alugar', 'comprar'].map((tipo) => {
                const custoTipo = checklistItems
                  .filter(item => item.tipo === tipo)
                  .reduce((sum, item) => sum + (Number(item.custo_unitario) * item.quantidade), 0);
                const qtdTipo = checklistItems.filter(item => item.tipo === tipo).length;

                if (qtdTipo === 0) return null;

                return (
                  <div key={tipo} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground capitalize">
                      {tipo} ({qtdTipo} item{qtdTipo > 1 ? 's' : ''})
                    </span>
                    <span className="font-medium">R$ {custoTipo.toFixed(2)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Informações do Evento */}
      <Card>
        <CardHeader>
          <CardTitle>Informações do Evento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tipo de evento:</span>
            <span className="font-medium">{evento.gratuito ? 'Gratuito' : 'Pago'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Valor padrão prestador:</span>
            <span className="font-medium">R$ {Number(evento.valor_padrao_prestador || 0).toFixed(2)}</span>
          </div>
          {evento.link_whatsapp && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">WhatsApp:</span>
              <a
                href={evento.link_whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Ver grupo
              </a>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
