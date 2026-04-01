import { Hono } from 'hono';
import type { Env } from '../types/env';
import { createPool } from '../lib/db';

const app = new Hono<{ Bindings: Env }>();

/**
 * Feed dinâmico de calendário para o paciente (Assinatura Webcal)
 * Retorna todos os agendamentos futuros do paciente.
 */
app.get('/feed/:patientId.ics', async (c) => {
  const patientId = (c.req.param() as Record<string, string>)['patientId.ics']?.replace('.ics', '') ?? '';
  const db = await createPool(c.env);

  // Busca todos os agendamentos futuros deste paciente
  const result = await db.query(`
    SELECT a.*, p.full_name as patient_name, o.name as clinic_name
    FROM appointments a
    JOIN patients p ON p.id = a.patient_id
    JOIN organizations o ON o.id = a.organization_id
    WHERE a.patient_id = $1 
      AND a.date >= (CURRENT_DATE - INTERVAL '1 day')
      AND a.status NOT IN ('cancelado', 'faltou')
    ORDER BY a.date ASC, a.start_time ASC
  `, [patientId]);

  const appointments = result.rows;
  if (!appointments.length) {
    // Se não tiver consultas, retorna um calendário vazio mas válido
    return c.text('BEGIN:VCALENDAR\r\nVERSION:2.0\r\nEND:VCALENDAR', 200, {
      'Content-Type': 'text/calendar; charset=utf-8',
    });
  }

  const clinicName = appointments[0].clinic_name;

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:FisioFlow - ' + clinicName,
    'X-WR-TIMEZONE:America/Sao_Paulo',
    'CALSCALE:GREGORIAN',
    'PROID:-//FisioFlow//NONSGML v1.0//EN',
  ];

  for (const app of appointments) {
    const startDate = app.date.replace(/-/g, '') + 'T' + app.start_time.replace(/:/g, '') + '00';
    const endDate = app.date.replace(/-/g, '') + 'T' + app.end_time.replace(/:/g, '') + '00';
    
    icsContent.push(
      'BEGIN:VEVENT',
      `UID:${app.id}@moocafisio.com.br`,
      `SUMMARY:Fisioterapia: ${clinicName}`,
      `DTSTART:${startDate}`,
      `DTEND:${endDate}`,
      `DESCRIPTION:Sessão de fisioterapia agendada via FisioFlow. Status: ${app.status}`,
      `LOCATION:${clinicName}`,
      'STATUS:CONFIRMED',
      'BEGIN:VALARM',
      'TRIGGER:-PT2H', // Alerta 2 horas antes
      'ACTION:DISPLAY',
      'DESCRIPTION:Lembrete de Consulta',
      'END:VALARM',
      'END:VEVENT'
    );
  }

  icsContent.push('END:VCALENDAR');

  return c.text(icsContent.join('\r\n'), 200, {
    'Content-Type': 'text/calendar; charset=utf-8',
    'Cache-Control': 'public, max-age=3600', // Cache de 1 hora na borda do Cloudflare
  });
});

export { app as calendarRoutes };
