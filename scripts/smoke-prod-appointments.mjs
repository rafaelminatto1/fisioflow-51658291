#!/usr/bin/env node
// Smoke test: cria, reagenda e cancela um agendamento em produção/homolog
// e coleta logs em Firestore (notifications/appointment_reminders).

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { initializeApp as initAdmin, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const email = process.env.SMOKE_USER_EMAIL || 'rafael.minatto@yahoo.com.br';
const password = process.env.SMOKE_USER_PASS || 'Yukari30@';
const apiKey = process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY || 'AIzaSyCz2c3HvQoV7RvFCbCaudbEEelEQaO-tY8';
const authDomain = process.env.VITE_FIREBASE_AUTH_DOMAIN || 'fisioflow-migration.firebaseapp.com';
const projectId = process.env.VITE_FIREBASE_PROJECT_ID || 'fisioflow-migration';
const hash = process.env.CLOUD_RUN_HASH || 'tfecm5cqoq';

const fnUrl = (name) => `https://${name.toLowerCase()}-${hash}-rj.a.run.app`;

async function getIdToken() {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true })
    }
  );
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Auth failed: ${res.status} ${json?.error?.message || ''}`);
  }
  return { token: json.idToken, uid: json.localId };
}

async function callFn(idToken, name, body) {
  const res = await fetch(fnUrl(name), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`
    },
    body: JSON.stringify(body || {})
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json?.error || res.statusText;
    throw new Error(`${name} -> ${res.status} ${msg}`);
  }
  return json;
}

function initAdminIfNeeded() {
  if (getApps().length) return;
  const keyPath = path.resolve('functions/service-account-key.json');
  if (!fs.existsSync(keyPath)) {
    throw new Error(`Service account not found at ${keyPath}`);
  }
  const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
  initAdmin({ credential: cert(serviceAccount), projectId: serviceAccount.project_id });
}

async function fetchNotificationSummaries(db, appointmentId) {
  const snap = await db
    .collection('notifications')
    .where('data.appointmentId', '==', appointmentId)
    .get();
  return snap.docs.map((d) => ({
    id: d.id,
    channel: d.get('channel') || d.get('type'),
    status: d.get('status'),
    error: d.get('error_message') || null,
    created_at: d.get('created_at') || null,
  }));
}

async function fetchReminderSummaries(db, appointmentId) {
  const snap = await db
    .collection('appointment_reminders')
    .where('appointment_id', '==', appointmentId)
    .get();
  return snap.docs.map((d) => ({
    id: d.id,
    type: d.get('reminder_type'),
    channels: d.get('channels'),
    errors: d.get('errors'),
    sent_at: d.get('sent_at'),
  }));
}

async function main() {
  console.log('🔐 Autenticando usuário de teste...');
  const { token, uid } = await getIdToken();
  console.log('   UID:', uid);

  console.log('👥 Buscando paciente...');
  const patientsRes = await callFn(token, 'listPatientsV2', { limit: 1 });
  const patientId = patientsRes?.data?.[0]?.id;
  if (!patientId) throw new Error('Nenhum paciente retornado em listPatientsV2');
  console.log('   Paciente escolhido:', patientId, patientsRes?.data?.[0]?.name || '');

  const dateObj = new Date();
  dateObj.setDate(dateObj.getDate() + 1);
  const date = dateObj.toISOString().slice(0, 10); // YYYY-MM-DD
  const startTime = '18:00';
  const endTime = '18:30';

  console.log(`🗓️  Criando agendamento em ${date} ${startTime}-${endTime}...`);
  const createRes = await callFn(token, 'createAppointmentV2', {
    patientId,
    date,
    startTime,
    endTime,
    type: 'Fisioterapia'
  });
  const appointmentId = createRes?.data?.id;
  if (!appointmentId) throw new Error('createAppointmentV2 não retornou id');
  console.log('   Criado appointmentId:', appointmentId);

  console.log('🔄 Reagendando para 19:00-19:30...');
  await callFn(token, 'updateAppointmentV2', {
    appointmentId,
    startTime: '19:00',
    endTime: '19:30'
  });
  console.log('   Reagendado.');

  console.log('❌ Cancelando agendamento...');
  await callFn(token, 'cancelAppointmentV2', {
    appointmentId,
    reason: 'smoke test auto'
  });
  console.log('   Cancelado.');

  console.log('📊 Coletando logs (Firestore)...');
  initAdminIfNeeded();
  const db = getFirestore();
  const notifications = await fetchNotificationSummaries(db, appointmentId);
  const reminders = await fetchReminderSummaries(db, appointmentId);

  console.log('\n=== Resultado ===');
  console.log('Appointment ID:', appointmentId);
  console.log('Notifications:', notifications.length);
  notifications.forEach((n) => console.log(' -', n));
  console.log('Reminders:', reminders.length);
  reminders.forEach((r) => console.log(' -', r));
}

main().catch((err) => {
  console.error('❌ Smoke test falhou:', err.message);
  process.exitCode = 1;
});
