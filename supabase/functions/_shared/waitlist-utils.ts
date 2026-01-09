
import { createSupabaseServiceClient } from './api-helpers.ts';
import { sendNotification, MessageTemplates } from './notifications.ts';

/**
 * Encontra um candidato na lista de espera que corresponda ao horário liberado.
 * @param organizationId ID da organização
 * @param cancelledSlot Data/hora do agendamento cancelado
 * @param supabase Cliente Supabase (opcional, se não fornecido, cria um novo service client)
 */
export async function findWaitlistCandidate(organizationId: string, cancelledSlot: Date, supabase?: any) {
  const client = supabase || createSupabaseServiceClient();

  // Determinar dia da semana e período
  const dayOfWeek = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][cancelledSlot.getDay()];
  const hour = cancelledSlot.getHours();
  const period = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';

  // Buscar candidatos da lista de espera
  const { data: candidates, error } = await client
    .from('waitlist')
    .select(`
      *,
      patient:patients(id, name, phone, email)
    `)
    .eq('organization_id', organizationId)
    .eq('status', 'waiting')
    .contains('preferred_days', [dayOfWeek])
    .contains('preferred_periods', [period])
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(5);

  if (error || !candidates || candidates.length === 0) {
    return null;
  }

  // Filtrar por número de recusas (máx 3)
  const eligibleCandidates = candidates.filter((c: any) => c.refusal_count < 3);

  if (eligibleCandidates.length === 0) {
    return null;
  }

  // Retornar o primeiro candidato elegível
  return eligibleCandidates[0];
}

/**
 * Processa a oferta de uma vaga para um candidato da lista de espera.
 * @param waitlistId ID da entrada na lista de espera
 * @param appointmentSlot Data/hora da vaga oferecida
 * @param offeredByUserId ID do usuário que está oferecendo a vaga (ou 'system')
 * @param organizationId ID da organização
 * @param patientName Nome do paciente (para notificação)
 * @param patientPhone Telefone do paciente (para notificação)
 * @param supabase Cliente Supabase (opcional, se não fornecido, cria um novo service client)
 */
export async function processWaitlistOffer(
  waitlistId: string,
  appointmentSlot: Date,
  offeredByUserId: string,
  organizationId: string,
  patientData: { id: string; name: string; phone?: string; email?: string },
  supabase?: any
) {
  const client = supabase || createSupabaseServiceClient();
  const slotString = appointmentSlot.toISOString();

  // Atualizar status para offered
  const { data: updated, error: updateError } = await client
    .from('waitlist')
    .update({
      status: 'offered',
      offered_slot: slotString,
      offered_at: new Date().toISOString(),
      offer_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h
    })
    .eq('id', waitlistId)
    .select()
    .single();

  if (updateError) {
    console.error('Error updating waitlist status:', updateError);
    throw new Error(updateError.message);
  }

  // Criar log de oferta
  await client.from('waitlist_offers').insert({
    waitlist_id: waitlistId,
    patient_id: patientData.id,
    offered_slot: slotString,
    offered_by: offeredByUserId,
    organization_id: organizationId,
  });

  // Enviar notificação
  const dateTimeFormatted = appointmentSlot.toLocaleString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Formatar mensagem
  const notificationPayload = MessageTemplates.waitlistOffer(
    patientData.name,
    dateTimeFormatted,
    '24 horas'
  );

  await sendNotification({
    ...notificationPayload,
    recipientId: patientData.id,
    recipientPhone: patientData.phone,
    recipientEmail: patientData.email,
    channels: ['whatsapp'], // Priorizar WhatsApp
  });

  return updated;
}
