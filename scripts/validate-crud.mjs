#!/usr/bin/env node
/**
 * Validação CRUD de Pacientes e Agendamentos via API Workers (produção)
 * Uso: node scripts/validate-crud.mjs
 */

const API = 'https://fisioflow-api.rafalegollas.workers.dev';
const AUTH_URL = 'https://ep-wandering-bonus-acj4zwvo.neonauth.sa-east-1.aws.neon.tech/neondb/auth';
const EMAIL = 'REDACTED_EMAIL';
const PASSWORD = 'REDACTED';

const ok  = (msg) => console.log(`  ✅ ${msg}`);
const fail = (msg) => { console.error(`  ❌ ${msg}`); process.exitCode = 1; };
const info = (msg) => console.log(`\n🔷 ${msg}`);

async function getToken() {
  const res = await fetch(`${AUTH_URL}/sign-in/email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Origin': 'https://moocafisio.com.br',
    },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const data = await res.json();
  if (!res.ok || !data?.token) throw new Error(`Login falhou: ${JSON.stringify(data)}`);
  return data.token;
}

async function api(method, path, token, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { status: res.status, ok: res.ok, json };
}

async function main() {
  console.log('='.repeat(55));
  console.log('  FisioFlow — Validação CRUD Pacientes & Agendamentos');
  console.log('='.repeat(55));

  // ── AUTH ──────────────────────────────────────────────
  info('Autenticação');
  let token;
  try {
    token = await getToken();
    ok(`Login OK — token obtido`);
  } catch (e) {
    fail(`Login: ${e.message}`);
    return;
  }

  // ── HEALTH ────────────────────────────────────────────
  info('Health Check');
  const health = await api('GET', '/api/health', token);
  health.ok ? ok(`/api/health → ${health.status}`) : fail(`/api/health → ${health.status}: ${JSON.stringify(health.json)}`);

  // ════════════════════════════════════════════════════
  // PACIENTES
  // ════════════════════════════════════════════════════
  info('CRUD — Pacientes');

  // LIST
  const list = await api('GET', '/api/patients', token);
  list.ok
    ? ok(`LIST → ${list.status} — ${list.json?.data?.length ?? 0} pacientes`)
    : fail(`LIST → ${list.status}: ${JSON.stringify(list.json)}`);

  // CREATE
  const ts = Date.now();
  const create = await api('POST', '/api/patients', token, {
    full_name: `Playwright Teste ${ts}`,
    email: `playwright_${ts}@test.com`,
    phone: '11999990000',
    status: 'Inicial',
  });
  let patientId;
  if (create.status === 201 && create.json?.data?.id) {
    patientId = create.json.data.id;
    ok(`CREATE → 201 — id: ${patientId}`);
  } else {
    fail(`CREATE → ${create.status}: ${JSON.stringify(create.json)}`);
  }

  if (patientId) {
    // READ
    const read = await api('GET', `/api/patients/${patientId}`, token);
    read.ok
      ? ok(`READ → ${read.status} — nome: ${read.json?.data?.name || read.json?.data?.full_name}`)
      : fail(`READ → ${read.status}: ${JSON.stringify(read.json)}`);

    // UPDATE
    const update = await api('PATCH', `/api/patients/${patientId}`, token, {
      full_name: `Playwright Teste ${ts} (Editado)`,
      status: 'Em tratamento',
    });
    update.ok
      ? ok(`UPDATE → ${update.status} — nome: ${update.json?.data?.name || update.json?.data?.full_name}`)
      : fail(`UPDATE → ${update.status}: ${JSON.stringify(update.json)}`);

    // DELETE (soft)
    const del = await api('DELETE', `/api/patients/${patientId}`, token);
    del.ok
      ? ok(`DELETE → ${del.status} — removido (soft-delete)`)
      : fail(`DELETE → ${del.status}: ${JSON.stringify(del.json)}`);
  }

  // ════════════════════════════════════════════════════
  // AGENDAMENTOS
  // ════════════════════════════════════════════════════
  info('CRUD — Agendamentos');

  // Pegar um paciente real para usar como FK
  const patientsRes = await api('GET', '/api/patients?limit=1', token);
  const firstPatient = patientsRes.json?.data?.[0];
  if (!firstPatient) {
    fail('Nenhum paciente encontrado para criar agendamento');
  } else {
    // LIST
    const aList = await api('GET', '/api/appointments', token);
    aList.ok
      ? ok(`LIST → ${aList.status} — ${aList.json?.data?.length ?? 0} agendamentos`)
      : fail(`LIST → ${aList.status}: ${JSON.stringify(aList.json)}`);

    // CREATE
    const aCreate = await api('POST', '/api/appointments', token, {
      patientId: firstPatient.id,
      date: '2026-03-15',
      startTime: '09:00',
      endTime: '09:50',
    });
    let appointmentId;
    if (aCreate.status === 201 && aCreate.json?.data?.id) {
      appointmentId = aCreate.json.data.id;
      ok(`CREATE → 201 — id: ${appointmentId}`);
    } else {
      fail(`CREATE → ${aCreate.status}: ${JSON.stringify(aCreate.json)}`);
    }

    if (appointmentId) {
      // READ
      const aRead = await api('GET', `/api/appointments/${appointmentId}`, token);
      aRead.ok
        ? ok(`READ → ${aRead.status} — data: ${aRead.json?.data?.date}`)
        : fail(`READ → ${aRead.status}: ${JSON.stringify(aRead.json)}`);

      // UPDATE
      const aUpdate = await api('PATCH', `/api/appointments/${appointmentId}`, token, {
        status: 'confirmed',
        notes: 'Validado via script Playwright',
      });
      aUpdate.ok
        ? ok(`UPDATE → ${aUpdate.status} — status: ${aUpdate.json?.data?.status}`)
        : fail(`UPDATE → ${aUpdate.status}: ${JSON.stringify(aUpdate.json)}`);

      // DELETE
      const aDel = await api('DELETE', `/api/appointments/${appointmentId}`, token);
      aDel.ok
        ? ok(`DELETE → ${aDel.status}`)
        : fail(`DELETE → ${aDel.status}: ${JSON.stringify(aDel.json)}`);
    }
  }

  // ── RESUMO ────────────────────────────────────────────
  console.log('\n' + '='.repeat(55));
  if (process.exitCode === 1) {
    console.log('  ⚠️  Alguns testes FALHARAM — veja os ❌ acima');
  } else {
    console.log('  🎉  Todos os testes passaram!');
  }
  console.log('='.repeat(55));
}

main().catch((e) => { console.error('Erro fatal:', e); process.exit(1); });
