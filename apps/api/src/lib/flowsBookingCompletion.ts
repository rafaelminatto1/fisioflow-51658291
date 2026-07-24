import type { Env } from "../types/env";
import { createPool } from "./db";
import {
  BOOKING_TYPES,
  getEvaluationProfessionalId,
  getTherapistIds,
  toIsoDate,
  availableSlotsByCapacity,
} from "./flowsBooking";
import { normalizeAppointmentType, calculateEndTime } from "../routes/appointmentHelpers";
import { linkContactToPatient } from "./whatsapp-identity";
import { sendListMessage, sendReplyButtons } from "./whatsapp-interactive";
import { WhatsAppService } from "./whatsapp";

// Flow "Agendar atendimento" publicado na Meta (WABA 806225345331804).
export const DEFAULT_BOOKING_FLOW_ID = "1706568520560773";

const EXCLUDE = "'cancelado','faltou','faltou_sem_aviso','faltou_com_aviso'";

// Extrai um horário específico citado pelo paciente (ex: "10h", "às 10", "10:00", "14h30")
export function extractSpecificTimeFromText(text?: string | null): string | null {
  if (!text) return null;
  const t = text.toLowerCase();
  const match = t.match(/(?:[àa]s\s*|hor[aá]rio\s+de\s+|^|\s)([0-2]?\d)(?::([0-5]\d)|h([0-5]\d)?|(?:\s*horas?))?\b/);
  if (!match) return null;
  const hour = parseInt(match[1], 10);
  if (isNaN(hour) || hour < 7 || hour > 20) return null;
  const min = match[2] || match[3] || "00";
  return `${String(hour).padStart(2, "0")}:${min}`;
}

// Converte expressões de datas em português ("sábado", "amanhã", "segunda-feira") para data ISO e verifica se é sábado.
export function resolveTargetDateFromText(
  text?: string | null,
  nowMs: number = Date.now(),
): { isoDate: string; isSaturday: boolean } {
  const current = new Date(nowMs);
  let target = new Date(nowMs);

  const t = (text || "").toLowerCase();

  const daysOfWeekMap: Record<string, number> = {
    domingo: 0,
    segunda: 1,
    terca: 2,
    terça: 2,
    quarta: 3,
    quinta: 4,
    sexta: 5,
    sabado: 6,
    sábado: 6,
  };

  let foundWeekday = false;
  for (const [dayName, targetDayNum] of Object.entries(daysOfWeekMap)) {
    if (t.includes(dayName)) {
      foundWeekday = true;
      const currentDayNum = current.getUTCDay();
      let diff = targetDayNum - currentDayNum;
      if (diff <= 0) diff += 7;
      target.setUTCDate(target.getUTCDate() + diff);
      break;
    }
  }

  if (!foundWeekday) {
    if (t.includes("hoje")) {
      target = new Date(nowMs);
    } else {
      target.setUTCDate(target.getUTCDate() + 1);
    }
  }

  const isoDate = target.toISOString().slice(0, 10);
  const isSaturday = target.getUTCDay() === 6;
  return { isoDate, isSaturday };
}

// Detecta intenção clara do paciente de agendar ou consultar disponibilidade (para enviar o Flow nativo ou Lista Interativa).
export function isBookingIntent(text: string | undefined | null): boolean {
  const t = (text || "").toLowerCase().trim();
  if (!t) return false;

  // 1. Termos diretos de agendamento
  if (/^\s*(agendar|agendamento|marcar|agendei|remarcar)\b/.test(t)) return true;

  // 2. Intenção verbal de agendar/marcar (ex: "gostaria de agendar", "quero marcar", "posso agendar")
  if (/\b(quero|gostaria|preciso|posso|como|desejo)\b[\s\S]{0,40}\b(agendar|marcar|agendamento|atendimento|sess[aã]o|avalia[cç][aã]o)\b/.test(t)) return true;

  // 3. Menção a agendar/marcar + horários/fisio/sessão
  if (/\b(agendar|marcar)\b[\s\S]{0,30}\b(avalia|sess[aã]o|atendimento|hor[aá]rio|fisio|vaga)\b/.test(t)) return true;

  // 4. Pergunta sobre horários/disponibilidade (ex: "olá amanhã no período da tarde teria horário?", "quais os horários disponíveis?", "tem vaga?")
  if (/\b(quais|tem|teria|temos|possui|qual)\b[\s\S]{0,40}\b(hor[aá]rio|hor[aá]rios|vaga|vagas|disponib|dispon[ií]vel|dispon[ií]veis)\b/.test(t)) return true;

  // 5. Perguntas por período ou disponibilidade de horário (ex: "teria no periodo da tarde?", "periodo da tarde", "horário de amanhã")
  if (/\b(tem|teria|temos|possui|qual|quais|ver)\b[\s\S]{0,30}\b(no|em|de)?\s*(periodo|per[ií]odo|manh[aã]|tarde|noite|amanh[aã]|s[aá]bado)\b/.test(t)) return true;
  if (/\b(periodo|per[ií]odo|manh[aã]|tarde|noite|amanh[aã]|s[aá]bado)\b[\s\S]{0,30}\b(hor[aá]rio|hor[aá]rios|vaga|vagas|disponib)\b/.test(t)) return true;

  // 6. Pergunta sobre horário específico (ex: "teria às 10h?", "tem às 14h?", "e às 9h?")
  if (extractSpecificTimeFromText(t) !== null) return true;

  return false;
}

export interface FlowBookingPayload {
  type?: string;
  date?: string;
  slot?: string;
}

export interface FlowContact {
  id: string;
  display_name?: string | null;
  patient_id?: string | null;
}

export interface ConfirmedBookingResult {
  appointmentId: string;
  professionalName: string;
  typeLabel: string;
  isoDate: string;
  time: string;
  confirmationText: string;
}

function typeLabelFor(typeId: string | undefined): string {
  return BOOKING_TYPES.find((t) => t.id === typeId)?.title ?? "Atendimento";
}

function formatBrDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return d && m && y ? `${d}/${m}/${y}` : iso;
}

async function findOrCreatePatient(
  pool: ReturnType<typeof createPool>,
  orgId: string,
  contact: FlowContact,
  phone: string,
): Promise<string | null> {
  if (contact.patient_id) return contact.patient_id;

  const existing = await pool.query(
    `SELECT id FROM patients WHERE organization_id = $1 AND phone = $2 LIMIT 1`,
    [orgId, phone],
  );
  if (existing.rows[0]?.id) {
    await linkContactToPatient(pool as any, contact.id, existing.rows[0].id).catch(() => {});
    return existing.rows[0].id;
  }

  const created = await pool.query(
    `INSERT INTO patients (full_name, phone, organization_id, status)
     VALUES ($1, $2, $3, 'active') RETURNING id`,
    [contact.display_name || "Paciente (WhatsApp)", phone, orgId],
  );
  const patientId = created.rows[0]?.id;
  if (patientId) await linkContactToPatient(pool as any, contact.id, patientId).catch(() => {});
  return patientId ?? null;
}

// Escolhe o fisioterapeuta: avaliação -> profissional designado; sessão -> um
// fisio livre no horário. Retorna null se ninguém disponível (slot tomado).
async function pickTherapist(
  pool: ReturnType<typeof createPool>,
  orgId: string,
  typeNorm: string,
  isoDate: string,
  startTime: string,
): Promise<{ id: string; full_name: string } | null> {
  if (typeNorm === "evaluation") {
    const evalId = await getEvaluationProfessionalId(pool, orgId);
    if (!evalId) return null;
    const busy = await pool.query(
      `SELECT 1 FROM appointments WHERE therapist_id = $1 AND date = $2 AND start_time = $3 AND status NOT IN (${EXCLUDE}) LIMIT 1`,
      [evalId, isoDate, startTime],
    );
    if (busy.rows.length > 0) return null;
    const prof = await pool.query(`SELECT id, full_name FROM profiles WHERE id = $1 LIMIT 1`, [evalId]);
    return prof.rows[0] ?? null;
  }

  const ids = await getTherapistIds(pool, orgId);
  if (ids.length === 0) return null;
  const free = await pool.query(
    `SELECT id, full_name FROM profiles
     WHERE id = ANY($1::uuid[])
       AND id NOT IN (
         SELECT therapist_id FROM appointments
         WHERE date = $2 AND start_time = $3 AND status NOT IN (${EXCLUDE})
       )
     ORDER BY full_name LIMIT 1`,
    [ids, isoDate, startTime],
  );
  return free.rows[0] ?? null;
}

/**
 * Cria um agendamento CONFIRMADO a partir da conclusão do Flow (sem o paciente
 * escolher o fisio). Lembretes 24h/1h são disparados automaticamente pelo cron.
 * Retorna null se faltar dado ou não houver disponibilidade.
 */
export async function createConfirmedAppointmentFromFlow(
  pool: ReturnType<typeof createPool>,
  orgId: string,
  contact: FlowContact,
  contactPhone: string,
  payload: FlowBookingPayload,
): Promise<ConfirmedBookingResult | null> {
  if (!payload.date || !payload.slot || payload.slot === "outra_hora") return null;

  const isoDate = toIsoDate(payload.date);
  const time = String(payload.slot).slice(0, 5);
  const startTime = `${time}:00`;
  const endTime = `${calculateEndTime(time, 60)}:00`;
  const typeNorm = normalizeAppointmentType(payload.type);
  const typeLabel = typeLabelFor(payload.type);

  const therapist = await pickTherapist(pool, orgId, typeNorm, isoDate, startTime);
  if (!therapist) return null; // slot já tomado / sem profissional

  const patientId = await findOrCreatePatient(pool, orgId, contact, contactPhone);
  if (!patientId) return null;

  const appt = await pool.query(
    `INSERT INTO appointments
       (patient_id, therapist_id, date, start_time, end_time, duration_minutes, organization_id, status, type, notes)
     VALUES ($1, $2, $3, $4, $5, 60, $6, 'agendado', $7, $8) RETURNING id`,
    [patientId, therapist.id, isoDate, startTime, endTime, orgId, typeNorm, `${typeLabel} agendada via WhatsApp`],
  );
  const appointmentId = appt.rows[0]?.id;
  if (!appointmentId) return null;

  const confirmationText =
    `✅ Agendamento confirmado!\n\n` +
    `📋 ${typeLabel}\n` +
    `👤 ${therapist.full_name}\n` +
    `📅 ${formatBrDate(isoDate)} às ${time}\n\n` +
    `Você receberá um lembrete antes. Até lá! 💙`;

  return { appointmentId, professionalName: therapist.full_name, typeLabel, isoDate, time, confirmationText };
}

export function detectPeriodFromText(text?: string | null): "manha" | "tarde_noite" | undefined {
  if (!text) return undefined;
  const t = text.toLowerCase();
  if (/(tarde|noite|vespertino|noturno)/.test(t)) return "tarde_noite";
  // Remove "amanhã" / "amanha" para não confundir com a palavra "manhã"
  const sansAmanha = t.replace(/amanh[aã]/g, "");
  if (/(manh[aã]|matutino|cedo)/.test(sansAmanha)) return "manha";
  return undefined;
}

/**
 * Modelo B: Envia botões de resposta rápida com até 2 horários + "Outro Horário".
 * Permite agendamento com 1 único toque no celular.
 */
export async function sendQuickSlotButtonsFallback(
  env: Env,
  pool: ReturnType<typeof createPool>,
  orgId: string,
  to: string,
  nowMs: number,
  userText?: string,
): Promise<boolean> {
  const { isoDate: iso, isSaturday } = resolveTargetDateFromText(userText, nowMs);
  const period = detectPeriodFromText(userText);
  const specificTime = extractSpecificTimeFromText(userText);

  const slots = await availableSlotsByCapacity(pool, orgId, iso, period);

  if (slots.length === 0) {
    return sendSlotsListFallback(env, pool, orgId, to, nowMs, userText);
  }

  const dateFormatted = formatBrDate(iso);

  // Se o paciente perguntou por um horário específico (ex: "teria às 10h?")
  if (specificTime) {
    const isAvailable = slots.includes(specificTime);
    if (isAvailable) {
      const buttons = [
        { id: `book_slot|session|${iso}|${specificTime}`, title: specificTime },
        { id: `book_slot|session|${iso}|outra_hora`, title: "Outro Horário" },
      ];
      const bodyText = `Temos sim! 😊 O horário das ${specificTime} para ${dateFormatted} está disponível para agendar sua sessão. Deseja confirmar?`;
      const res = await sendReplyButtons(env, to, bodyText, buttons);
      return !(res as any)?.error;
    } else {
      // O horário solicitado está preenchido/lotado -> Adiciona paciente na Fila de Espera!
      try {
        const contactRes = await pool.query(
          `SELECT id, patient_id, name FROM contacts WHERE phone = $1 AND organization_id = $2 LIMIT 1`,
          [to, orgId]
        );
        const contact = contactRes.rows[0];

        await addToWaitlist(
          pool,
          orgId,
          contact?.id || null,
          contact?.patient_id || null,
          to,
          contact?.name || null,
          iso,
          specificTime
        );
      } catch (err) {
        console.error("[Waitlist Add Error]", err);
      }

      // Encontra os 2 horários disponíveis mais próximos do horário solicitado
      const requestedHour = parseInt(specificTime.split(":")[0], 10);
      const sortedByProximity = [...slots].sort((a, b) => {
        const ha = parseInt(a.split(":")[0], 10);
        const hb = parseInt(b.split(":")[0], 10);
        return Math.abs(ha - requestedHour) - Math.abs(hb - requestedHour);
      });
      const s1 = sortedByProximity[0];
      const s2 = sortedByProximity[1];

      const buttons: { id: string; title: string }[] = [];
      if (s1) buttons.push({ id: `book_slot|session|${iso}|${s1}`, title: s1 });
      if (s2) buttons.push({ id: `book_slot|session|${iso}|${s2}`, title: s2 });
      buttons.push({ id: `book_slot|session|${iso}|outra_hora`, title: "Outro Horário" });

      const topSlotsFormatted = buttons.filter(b => b.id.includes("book_slot|session")).map(b => b.title).join("\n🔹 ");
      const bodyText = `O horário das ${specificTime} para ${dateFormatted} está completo no momento, mas já colocamos você na Fila de Espera 📋!\n\nSe algum paciente desmarcar ou reagendar esse horário, avisaremos você imediatamente para ficar com a vaga.\n\nEnquanto isso, estes horários mais próximos estão livres:\n\n🔹 ${topSlotsFormatted}\n\nQual prefere?`;
      const res = await sendReplyButtons(env, to, bodyText, buttons);
      return !(res as any)?.error;
    }
  }

  // Sugestão geral por período ou dia (ex: "sábado", "tarde", "amanhã")
  const s1 = slots[0];
  const s2 = slots[1];

  const buttons: { id: string; title: string }[] = [];
  if (s1) buttons.push({ id: `book_slot|session|${iso}|${s1}`, title: s1 });
  if (s2) buttons.push({ id: `book_slot|session|${iso}|${s2}`, title: s2 });
  buttons.push({ id: `book_slot|session|${iso}|outra_hora`, title: "Outro Horário" });

  let bodyText: string;
  const topSlotsFormatted = slots.slice(0, 3).join("\n🔹 ");

  if (isSaturday) {
    bodyText = `Aos sábados nosso atendimento é das 07h às 12h. Temos estes horários livres para sábado (${dateFormatted}):\n\n🔹 ${topSlotsFormatted}\n\nQual fica melhor para você?`;
  } else if (period === "tarde_noite") {
    bodyText = `Para ${dateFormatted} no período da tarde/noite, temos estes horários livres:\n\n🔹 ${topSlotsFormatted}\n\nQual fica melhor para você?`;
  } else if (period === "manha") {
    bodyText = `Para ${dateFormatted} no período da manhã, temos estes horários livres:\n\n🔹 ${topSlotsFormatted}\n\nQual fica melhor para você?`;
  } else {
    bodyText = `Para ${dateFormatted}, temos estes horários livres para sua sessão:\n\n🔹 ${topSlotsFormatted}\n\nQual fica melhor para você?`;
  }

  const res = await sendReplyButtons(
    env,
    to,
    bodyText,
    buttons,
  );
  return !(res as any)?.error;
}

// Fallback: envia uma LISTA de horários de sessão do próximo dia útil (para
// quem não interage com o Flow). Cada linha agenda ao ser tocada (id book|...).
export async function sendSlotsListFallback(
  env: Env,
  pool: ReturnType<typeof createPool>,
  orgId: string,
  to: string,
  nowMs: number,
  userText?: string,
): Promise<boolean> {
  const { isoDate: iso, isSaturday } = resolveTargetDateFromText(userText, nowMs);
  const period = detectPeriodFromText(userText);
  const slots = await availableSlotsByCapacity(pool, orgId, iso, period);

  const rows = slots.slice(0, 9).map((t) => ({ id: `book|session|${iso}|${t}`, title: t, description: "Sessão" }));
  rows.push({ id: `book|session|${iso}|outra_hora`, title: "Outra hora (não listada)", description: "Solicitar outro horário" });

  let headerMsg: string;
  const formattedDate = formatBrDate(iso);
  if (isSaturday) {
    headerMsg = period === "tarde_noite"
      ? `Aos sábados funcionamos das 07h às 12h. Confira os horários livres para sábado, ${formattedDate}:`
      : `Horários livres para sábado, ${formattedDate} (funcionamento das 07h às 12h). Toque em um para agendar:`;
  } else if (period === "tarde_noite") {
    headerMsg = `Horários livres no período da tarde/noite para ${formattedDate}. Toque em um para agendar:`;
  } else if (period === "manha") {
    headerMsg = `Horários livres no período da manhã para ${formattedDate}. Toque em um para agendar:`;
  } else {
    headerMsg = `Horários livres para ${formattedDate}. Toque em um para agendar uma sessão:`;
  }

  const sectionTitle = period === "tarde_noite" ? "Tarde / Noite" : period === "manha" ? "Manhã" : "Horários disponíveis";

  const res = await sendListMessage(
    env,
    to,
    headerMsg,
    "Ver horários",
    [{ title: sectionTitle, rows }],
  );
  return !(res as any)?.error;
}

// Parseia o id de uma linha da lista ou botão rápido: "book|<type>|<iso>|<time>" ou "book_slot|<type>|<iso>|<time>".
export function parseBookListId(id: string | undefined | null): FlowBookingPayload | null {
  if (!id) return null;
  if (id.startsWith("book|") || id.startsWith("book_slot|")) {
    const [, type, date, slot] = id.split("|");
    if (!date || !slot) return null;
    return { type, date, slot };
  }
  return null;
}

/**
 * Adiciona um paciente à Fila de Espera no banco Neon DB.
 */
export async function addToWaitlist(
  pool: ReturnType<typeof createPool>,
  orgId: string,
  contactId: string | null,
  patientId: string | null,
  phone: string,
  name: string | null,
  targetDate: string,
  targetSlot: string,
  type: string = "session"
): Promise<string> {
  const res = await pool.query(
    `INSERT INTO appointment_waitlist (organization_id, contact_id, patient_id, patient_phone, patient_name, target_date, target_slot, type, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'waiting')
     RETURNING id`,
    [orgId, contactId, patientId, phone, name, targetDate, targetSlot, type]
  );
  return res.rows[0].id;
}

/**
 * Dispara aviso automático de vaga livre para o próximo paciente da Fila de Espera por desistência/remarcação.
 */
export async function notifyWaitlistPatientForFreedSlot(
  env: Env,
  pool: ReturnType<typeof createPool>,
  orgId: string,
  targetDate: string,
  targetSlot: string
): Promise<boolean> {
  const res = await pool.query(
    `SELECT * FROM appointment_waitlist
     WHERE organization_id = $1 AND target_date = $2 AND target_slot = $3 AND status = 'waiting'
     ORDER BY created_at ASC LIMIT 1`,
    [orgId, targetDate, targetSlot]
  );
  if (res.rows.length === 0) return false;

  const entry = res.rows[0];
  const formattedDate = formatBrDate(targetDate);
  const bodyText = `🎉 Surgiu uma vaga por desistência para ${formattedDate} às ${targetSlot}! Deseja agendar essa vaga agora?`;
  const buttons = [
    { id: `claim_waitlist|${entry.id}`, title: "Sim, Quero a Vaga!" },
    { id: `decline_waitlist|${entry.id}`, title: "Não, Obrigado" },
  ];

  await sendReplyButtons(env, entry.patient_phone, bodyText, buttons);

  await pool.query(
    `UPDATE appointment_waitlist SET status = 'notified', notified_at = NOW(), updated_at = NOW() WHERE id = $1`,
    [entry.id]
  );

  return true;
}

/**
 * Confirma agendamento quando paciente na Fila de Espera clica [ Sim, Quero a Vaga! ].
 */
export async function claimWaitlistSlot(
  env: Env,
  pool: ReturnType<typeof createPool>,
  orgId: string,
  waitlistId: string,
  fromPhone: string
): Promise<boolean> {
  const res = await pool.query(
    `SELECT * FROM appointment_waitlist WHERE id = $1 AND organization_id = $2`,
    [waitlistId, orgId]
  );
  if (res.rows.length === 0) return false;
  const entry = res.rows[0];

  const whatsapp = new WhatsAppService(env);

  if (entry.status === "fulfilled") {
    await whatsapp.sendTextMessage(fromPhone, "Você já confirmou esta vaga anteriormente! Te esperamos na clínica 😊");
    return true;
  }

  // Resolve paciente
  let pId = entry.patient_id;
  if (!pId) {
    const contactRes = await pool.query(
      `SELECT id, patient_id, name FROM contacts WHERE phone = $1 AND organization_id = $2 LIMIT 1`,
      [fromPhone, orgId]
    );
    if (contactRes.rows.length > 0) {
      pId = contactRes.rows[0].patient_id;
    }
  }

  if (!pId) {
    const insertP = await pool.query(
      `INSERT INTO patients (organization_id, name, phone) VALUES ($1, $2, $3) RETURNING id`,
      [orgId, entry.patient_name || "Paciente WhatsApp", fromPhone]
    );
    pId = insertP.rows[0].id;
  }

  // Procura fisioterapeuta disponível
  const startTime = `${entry.target_slot}:00`;
  const endTime = `${calculateEndTime(entry.target_slot, 60)}:00`;
  const therapist = await pickTherapist(pool, orgId, entry.type || "sessao", entry.target_date, startTime);

  await pool.query(
    `INSERT INTO appointments (patient_id, therapist_id, date, start_time, end_time, duration_minutes, organization_id, status, type, notes)
     VALUES ($1, $2, $3, $4, $5, 60, $6, 'agendado', $7, $8)
     RETURNING id`,
    [
      pId,
      therapist?.id || null,
      entry.target_date,
      startTime,
      endTime,
      orgId,
      entry.type || "sessao",
      "Vaga de fila de espera preenchida via WhatsApp",
    ]
  );

  await pool.query(
    `UPDATE appointment_waitlist SET status = 'fulfilled', updated_at = NOW() WHERE id = $1`,
    [waitlistId]
  );

  const formattedDate = formatBrDate(entry.target_date);
  await whatsapp.sendTextMessage(
    fromPhone,
    `✅ Maravilhoso! Sua vaga para ${formattedDate} às ${entry.target_slot} foi confirmada com sucesso! Te esperamos na clínica! 🏥`
  );

  return true;
}

/**
 * Cancela/recusa vaga da Fila de Espera e passa a vaga para o próximo da fila.
 */
export async function declineWaitlistSlot(
  env: Env,
  pool: ReturnType<typeof createPool>,
  orgId: string,
  waitlistId: string,
  fromPhone: string
): Promise<boolean> {
  let entry: any = null;
  const res = await pool.query(
    `SELECT * FROM appointment_waitlist WHERE id = $1 AND organization_id = $2`,
    [waitlistId, orgId]
  );
  if (res.rows.length > 0) {
    entry = res.rows[0];
    await pool.query(
      `UPDATE appointment_waitlist SET status = 'declined', updated_at = NOW() WHERE id = $1`,
      [waitlistId]
    );
  }

  const whatsapp = new WhatsAppService(env);
  await whatsapp.sendTextMessage(fromPhone, "Sem problemas! Agradecemos o aviso 😊");

  if (entry) {
    // Notifica o próximo da fila!
    await notifyWaitlistPatientForFreedSlot(env, pool, orgId, entry.target_date, entry.target_slot);
  }

  return true;
}
