import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useEventosStats() {
  return useQuery({
    queryKey: ['eventos-stats'],
    queryFn: async () => {
      // Buscar todos os eventos
      const { data: eventos, error: eventosError } = await supabase
        .from('eventos')
        .select('id, status, gratuito, valor_padrao_prestador');

      if (eventosError) throw eventosError;

      // Buscar todos os prestadores
      const { data: prestadores, error: prestadoresError } = await supabase
        .from('prestadores')
        .select('evento_id, valor_acordado, status_pagamento');

      if (prestadoresError) throw prestadoresError;

      // Buscar todos os checklist items
      const { data: checklistItems, error: checklistError } = await supabase
        .from('checklist_items')
        .select('evento_id, quantidade, custo_unitario');

      if (checklistError) throw checklistError;

      // Buscar todos os participantes
      const { data: participantes, error: participantesError } = await supabase
        .from('participantes')
        .select('evento_id, segue_perfil');

      if (participantesError) throw participantesError;

      // Calcular estatísticas
      const totalEventos = eventos?.length || 0;
      const eventosAgendados = eventos?.filter(e => e.status === 'AGENDADO').length || 0;
      const eventosEmAndamento = eventos?.filter(e => e.status === 'EM_ANDAMENTO').length || 0;
      const eventosConcluidos = eventos?.filter(e => e.status === 'CONCLUIDO').length || 0;

      const totalPrestadores = prestadores?.length || 0;
      const prestadoresPendentes = prestadores?.filter(p => p.status_pagamento === 'PENDENTE').length || 0;

      const custoTotalPrestadores = prestadores?.reduce((sum, p) => sum + Number(p.valor_acordado), 0) || 0;
      const custoTotalInsumos = checklistItems?.reduce((sum, item) => 
        sum + (Number(item.custo_unitario) * item.quantidade), 0) || 0;
      const custoTotal = custoTotalPrestadores + custoTotalInsumos;

      const totalParticipantes = participantes?.length || 0;
      const participantesSeguemPerfil = participantes?.filter(p => p.segue_perfil).length || 0;

      // Calcular evento com mais participantes
      const participantesPorEvento = participantes?.reduce((acc, p) => {
        acc[p.evento_id] = (acc[p.evento_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const eventoComMaisParticipantes = participantesPorEvento 
        ? Math.max(...Object.values(participantesPorEvento), 0)
        : 0;

      return {
        totalEventos,
        eventosAgendados,
        eventosEmAndamento,
        eventosConcluidos,
        totalPrestadores,
        prestadoresPendentes,
        custoTotal,
        custoTotalPrestadores,
        custoTotalInsumos,
        totalParticipantes,
        participantesSeguemPerfil,
        eventoComMaisParticipantes,
        percentualSeguidores: totalParticipantes > 0 
          ? (participantesSeguemPerfil / totalParticipantes) * 100 
          : 0,
      };
    },
  });
}
