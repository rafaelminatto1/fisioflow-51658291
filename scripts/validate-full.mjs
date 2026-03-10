#!/usr/bin/env node
/**
 * Validação completa — Pacientes, Agendamentos, Financeiro e rotas críticas
 */

const API      = 'https://fisioflow-api.rafalegollas.workers.dev';
const AUTH_URL = 'https://ep-wandering-bonus-acj4zwvo.neonauth.sa-east-1.aws.neon.tech/neondb/auth';
const EMAIL    = 'REDACTED_EMAIL';
const PASSWORD = 'REDACTED';

let passed = 0, failed = 0;
const ok   = (msg) => { passed++; console.log(`  ✅ ${msg}`); };
const fail = (msg) => { failed++; console.error(`  ❌ ${msg}`); };
const info = (msg) => console.log(`\n🔷 ${msg}`);
const skip = (msg) => console.log(`  ⏭  ${msg}`);

async function getToken() {
  const res = await fetch(`${AUTH_URL}/sign-in/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Origin': 'https://moocafisio.com.br' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const d = await res.json();
  if (!res.ok || !d?.token) throw new Error(`Login falhou: ${JSON.stringify(d)}`);
  return d.token;
}

async function req(method, path, token, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json;
  try { json = await res.json(); } catch { json = {}; }
  return { status: res.status, ok: res.ok, json };
}

async function suite(name, fn) {
  info(name);
  try { await fn(); } catch (e) { fail(`Suite "${name}" erro: ${e.message}`); }
}

async function main() {
  console.log('═'.repeat(60));
  console.log('  FisioFlow — Validação Completa do Sistema');
  console.log(`  Usuário: ${EMAIL}`);
  console.log('═'.repeat(60));

  info('Autenticação');
  let token;
  try { token = await getToken(); ok('Login → token obtido'); }
  catch (e) { fail(`Login: ${e.message}`); return; }

  const h = await req('GET', '/api/health', token);
  h.ok ? ok(`Health → ${h.status}`) : fail(`Health → ${h.status}`);

  // ── 1. PACIENTES ──────────────────────────────────────────────────────────
  await suite('Pacientes — CRUD completo', async () => {
    const ts = Date.now();
    const list = await req('GET', '/api/patients?limit=5', token);
    list.ok ? ok(`LIST → ${list.status} — ${list.json?.data?.length ?? 0} registros`) : fail(`LIST → ${list.status}`);

    const create = await req('POST', '/api/patients', token, {
      full_name: `Paciente Teste ${ts}`, email: `pt_${ts}@teste.com`,
      phone: '11988887777', status: 'Inicial',
    });
    const pid = create.json?.data?.id;
    create.status === 201 && pid ? ok(`CREATE → 201 id=${pid}`) : fail(`CREATE → ${create.status}: ${JSON.stringify(create.json)}`);

    if (pid) {
      const read = await req('GET', `/api/patients/${pid}`, token);
      read.ok ? ok(`READ → ${read.status}`) : fail(`READ → ${read.status}`);

      const upd = await req('PATCH', `/api/patients/${pid}`, token, { full_name: `Paciente ${ts} EDIT`, status: 'Em tratamento' });
      upd.ok ? ok(`UPDATE → ${upd.status} nome="${upd.json?.data?.name}"`) : fail(`UPDATE → ${upd.status}: ${JSON.stringify(upd.json)}`);

      const del = await req('DELETE', `/api/patients/${pid}`, token);
      del.ok ? ok(`DELETE → ${del.status} (soft)`) : fail(`DELETE → ${del.status}`);
    }
  });

  // ── 2. AGENDAMENTOS ───────────────────────────────────────────────────────
  await suite('Agendamentos — CRUD completo', async () => {
    const ts = Date.now();
    const plist = await req('GET', '/api/patients?limit=1', token);
    const patient = plist.json?.data?.[0];
    if (!patient) { skip('Sem paciente disponível'); return; }

    const list = await req('GET', '/api/appointments', token);
    list.ok ? ok(`LIST → ${list.status} — ${list.json?.data?.length ?? 0} registros`) : fail(`LIST → ${list.status}`);

    const create = await req('POST', '/api/appointments', token, {
      patientId: patient.id, date: '2026-05-10', startTime: '10:00', endTime: '10:50',
    });
    const aid = create.json?.data?.id;
    create.status === 201 && aid ? ok(`CREATE → 201 id=${aid}`) : fail(`CREATE → ${create.status}: ${JSON.stringify(create.json)}`);

    if (aid) {
      const read = await req('GET', `/api/appointments/${aid}`, token);
      read.ok ? ok(`READ → ${read.status} data="${read.json?.data?.date?.substring(0,10)}"`) : fail(`READ → ${read.status}`);

      const upd = await req('PATCH', `/api/appointments/${aid}`, token, { status: 'confirmed', notes: 'Validado' });
      upd.ok ? ok(`UPDATE → ${upd.status} status="${upd.json?.data?.status}"`) : fail(`UPDATE → ${upd.status}: ${JSON.stringify(upd.json)}`);

      const del = await req('DELETE', `/api/appointments/${aid}`, token);
      del.ok ? ok(`DELETE → ${del.status}`) : fail(`DELETE → ${del.status}`);
    }
  });

  // ── 3. FINANCEIRO — Transações ────────────────────────────────────────────
  await suite('Financeiro — Transações CRUD', async () => {
    const ts = Date.now();
    const list = await req('GET', '/api/financial/transacoes', token);
    list.ok ? ok(`LIST → ${list.status} — ${list.json?.data?.length ?? 0} registros`) : fail(`LIST → ${list.status}: ${JSON.stringify(list.json)}`);

    const create = await req('POST', '/api/financial/transacoes', token, {
      descricao: `Consulta ${ts}`, valor: 150.00, tipo: 'receita',
      status: 'pendente', data_transacao: '2026-05-10',
    });
    const tid = create.json?.data?.id;
    create.status === 201 && tid ? ok(`CREATE → 201 id=${tid}`) : fail(`CREATE → ${create.status}: ${JSON.stringify(create.json)}`);

    if (tid) {
      const upd = await req('PUT', `/api/financial/transacoes/${tid}`, token, {
        descricao: `Consulta ${ts} EDIT`, valor: 200.00, tipo: 'receita',
        status: 'pago', data_transacao: '2026-05-10',
      });
      upd.ok ? ok(`UPDATE → ${upd.status} valor="${upd.json?.data?.valor}"`) : fail(`UPDATE → ${upd.status}: ${JSON.stringify(upd.json)}`);

      const del = await req('DELETE', `/api/financial/transacoes/${tid}`, token);
      del.ok ? ok(`DELETE → ${del.status}`) : fail(`DELETE → ${del.status}`);
    }
  });

  // ── 4. FINANCEIRO — Contas ────────────────────────────────────────────────
  await suite('Financeiro — Contas CRUD', async () => {
    const ts = Date.now();
    const list = await req('GET', '/api/financial/contas', token);
    list.ok ? ok(`LIST → ${list.status} — ${list.json?.data?.length ?? 0} registros`) : fail(`LIST → ${list.status}`);

    // contas_financeiras: tipo = 'pagar' | 'receber'
    const create = await req('POST', '/api/financial/contas', token, {
      tipo: 'receber', valor: 300.00, status: 'pendente',
      descricao: `Conta Teste ${ts}`, data_vencimento: '2026-05-15',
    });
    const cid = create.json?.data?.id;
    create.status === 201 && cid ? ok(`CREATE → 201 id=${cid}`) : fail(`CREATE → ${create.status}: ${JSON.stringify(create.json)}`);

    if (cid) {
      const upd = await req('PUT', `/api/financial/contas/${cid}`, token, {
        tipo: 'receita', valor: 400.00, status: 'pago',
        descricao: `Conta Teste ${ts} EDIT`,
      });
      upd.ok ? ok(`UPDATE → ${upd.status}`) : fail(`UPDATE → ${upd.status}: ${JSON.stringify(upd.json)}`);

      const del = await req('DELETE', `/api/financial/contas/${cid}`, token);
      del.ok ? ok(`DELETE → ${del.status}`) : fail(`DELETE → ${del.status}`);
    }
  });

  // ── 5. FINANCEIRO — Pagamentos ────────────────────────────────────────────
  await suite('Financeiro — Pagamentos (list)', async () => {
    const r = await req('GET', '/api/financial/pagamentos', token);
    r.ok ? ok(`LIST → ${r.status} — ${r.json?.data?.length ?? 0} registros`) : fail(`LIST → ${r.status}: ${JSON.stringify(r.json)}`);
  });

  // ── 6. EXERCÍCIOS ─────────────────────────────────────────────────────────
  await suite('Exercícios — CRUD', async () => {
    const ts = Date.now();
    const cats = await req('GET', '/api/exercises/categories', token);
    cats.ok ? ok(`Categories → ${cats.status} — ${cats.json?.data?.length ?? 0}`) : fail(`Categories → ${cats.status}`);

    const list = await req('GET', '/api/exercises', token);
    list.ok ? ok(`LIST → ${list.status} — ${list.json?.data?.length ?? 0}`) : fail(`LIST → ${list.status}`);

    const catId = cats.json?.data?.[0]?.id;
    if (!catId) { skip('Sem categoria'); return; }

    const create = await req('POST', '/api/exercises', token, {
      name: `Exercício ${ts}`, description: 'Validação', category_id: catId, difficulty: 'iniciante',
    });
    const eid = create.json?.data?.id;
    // aceita 200 ou 201 — rota retorna 200 em alguns casos
    eid ? ok(`CREATE → ${create.status} id=${eid}`) : fail(`CREATE → ${create.status}: ${JSON.stringify(create.json)}`);

    if (eid) {
      const upd = await req('PUT', `/api/exercises/${eid}`, token, {
        name: `Exercício ${ts} EDIT`, description: 'Editado', category_id: catId, difficulty: 'intermediario',
      });
      upd.ok ? ok(`UPDATE → ${upd.status}`) : fail(`UPDATE → ${upd.status}: ${JSON.stringify(upd.json)}`);

      const del = await req('DELETE', `/api/exercises/${eid}`, token);
      del.ok ? ok(`DELETE → ${del.status}`) : fail(`DELETE → ${del.status}`);
    }
  });

  // ── 7. PROTOCOLOS ─────────────────────────────────────────────────────────
  await suite('Protocolos — CRUD', async () => {
    const ts = Date.now();
    const list = await req('GET', '/api/protocols', token);
    list.ok ? ok(`LIST → ${list.status} — ${list.json?.data?.length ?? 0}`) : fail(`LIST → ${list.status}`);

    const create = await req('POST', '/api/protocols', token, {
      name: `Protocolo ${ts}`, description: 'Validação', category: 'geral',
    });
    const pid = create.json?.data?.id;
    create.status === 201 && pid ? ok(`CREATE → 201 id=${pid}`) : fail(`CREATE → ${create.status}: ${JSON.stringify(create.json)}`);

    if (pid) {
      const del = await req('DELETE', `/api/protocols/${pid}`, token);
      del.ok ? ok(`DELETE → ${del.status}`) : fail(`DELETE → ${del.status}`);
    }
  });

  // ── 8. METAS ─────────────────────────────────────────────────────────────
  await suite('Metas — CRUD', async () => {
    const ts = Date.now();
    const plist = await req('GET', '/api/patients?limit=1', token);
    const patient = plist.json?.data?.[0];
    if (!patient) { skip('Sem paciente'); return; }

    // goals LIST requer patientId
    const list = await req('GET', `/api/goals?patientId=${patient.id}`, token);
    list.ok ? ok(`LIST → ${list.status} — ${list.json?.data?.length ?? 0}`) : fail(`LIST → ${list.status}: ${JSON.stringify(list.json)}`);

    const create = await req('POST', '/api/goals', token, {
      patient_id: patient.id, goal_title: `Meta ${ts}`,
      description: `Meta ${ts}`, target_date: '2026-06-01',
    });
    const gid = create.json?.data?.id;
    create.status === 201 && gid ? ok(`CREATE → 201 id=${gid}`) : fail(`CREATE → ${create.status}: ${JSON.stringify(create.json)}`);

    if (gid) {
      const upd = await req('PUT', `/api/goals/${gid}`, token, {
        goal_title: `Meta ${ts} EDIT`, description: 'Atualizado', status: 'em_progresso',
      });
      upd.ok ? ok(`UPDATE → ${upd.status}`) : fail(`UPDATE → ${upd.status}: ${JSON.stringify(upd.json)}`);

      const del = await req('DELETE', `/api/goals/${gid}`, token);
      del.ok ? ok(`DELETE → ${del.status}`) : fail(`DELETE → ${del.status}`);
    }
  });

  // ── 9. WIKI ───────────────────────────────────────────────────────────────
  await suite('Wiki — CRUD', async () => {
    const ts = Date.now();
    const list = await req('GET', '/api/wiki', token);
    list.ok ? ok(`LIST → ${list.status} — ${list.json?.data?.length ?? 0}`) : fail(`LIST → ${list.status}`);

    const create = await req('POST', '/api/wiki', token, {
      title: `Wiki Teste ${ts}`, content: '# Teste\nConteúdo de validação.', category: 'geral',
    });
    const wslug = create.json?.data?.slug;
    const wid   = create.json?.data?.id;
    (wslug || wid) ? ok(`CREATE → ${create.status} slug="${wslug}"`) : fail(`CREATE → ${create.status}: ${JSON.stringify(create.json)}`);

    if (wslug) {
      const upd = await req('PUT', `/api/wiki/${wslug}`, token, {
        title: `Wiki Teste ${ts} EDIT`, content: '# Editado',
      });
      upd.ok ? ok(`UPDATE → ${upd.status}`) : fail(`UPDATE → ${upd.status}: ${JSON.stringify(upd.json)}`);

      const del = await req('DELETE', `/api/wiki/${wslug}`, token);
      del.ok ? ok(`DELETE → ${del.status}`) : fail(`DELETE → ${del.status}`);
    }
  });

  // ── 10. TAREFAS ───────────────────────────────────────────────────────────
  await suite('Tarefas — CRUD', async () => {
    const ts = Date.now();
    const list = await req('GET', '/api/tarefas', token);
    list.ok ? ok(`LIST → ${list.status} — ${list.json?.data?.length ?? 0}`) : fail(`LIST → ${list.status}`);

    // usa 'titulo' (campo DB), não 'title'
    const create = await req('POST', '/api/tarefas', token, {
      titulo: `Tarefa ${ts}`, descricao: 'Validação',
      status: 'A_FAZER', prioridade: 'MEDIA', tipo: 'TAREFA',
    });
    const tarid = create.json?.data?.id;
    create.status === 201 && tarid ? ok(`CREATE → 201 id=${tarid}`) : fail(`CREATE → ${create.status}: ${JSON.stringify(create.json)}`);

    if (tarid) {
      const upd = await req('PATCH', `/api/tarefas/${tarid}`, token, { status: 'CONCLUIDA' });
      upd.ok ? ok(`UPDATE → ${upd.status}`) : fail(`UPDATE → ${upd.status}: ${JSON.stringify(upd.json)}`);

      const del = await req('DELETE', `/api/tarefas/${tarid}`, token);
      del.ok ? ok(`DELETE → ${del.status}`) : fail(`DELETE → ${del.status}`);
    }
  });

  // ── 11. EVOLUÇÕES (treatment-sessions + measurements) ────────────────────
  await suite('Evoluções — list', async () => {
    const plist = await req('GET', '/api/patients?limit=1', token);
    const patient = plist.json?.data?.[0];
    if (!patient) { skip('Sem paciente'); return; }

    const r1 = await req('GET', `/api/evolution/treatment-sessions?patientId=${patient.id}`, token);
    r1.ok ? ok(`Sessions → ${r1.status} — ${r1.json?.data?.length ?? 0}`)
          : fail(`Sessions → ${r1.status}: ${JSON.stringify(r1.json)}`);

    const r2 = await req('GET', `/api/evolution/measurements?patientId=${patient.id}`, token);
    r2.ok ? ok(`Measurements → ${r2.status} — ${r2.json?.data?.length ?? 0}`)
          : fail(`Measurements → ${r2.status}: ${JSON.stringify(r2.json)}`);
  });

  // ── 12. GAMIFICAÇÃO ───────────────────────────────────────────────────────
  await suite('Gamificação — list', async () => {
    const r = await req('GET', '/api/gamification/leaderboard', token);
    r.ok ? ok(`Leaderboard → ${r.status}`) : fail(`Leaderboard → ${r.status}: ${JSON.stringify(r.json)}`);

    const plist = await req('GET', '/api/patients?limit=1', token);
    const patient = plist.json?.data?.[0];
    if (patient) {
      const rp = await req('GET', `/api/gamification/profile/${patient.id}`, token);
      rp.ok ? ok(`Profile → ${rp.status}`) : fail(`Profile → ${rp.status}: ${JSON.stringify(rp.json)}`);
    }
  });

  // ── 13. DOCUMENTOS ────────────────────────────────────────────────────────
  await suite('Documentos — list (com patientId)', async () => {
    const plist = await req('GET', '/api/patients?limit=1', token);
    const patient = plist.json?.data?.[0];
    if (!patient) { skip('Sem paciente'); return; }

    const r = await req('GET', `/api/documents?patientId=${patient.id}`, token);
    r.ok ? ok(`LIST → ${r.status} — ${r.json?.data?.length ?? 0}`) : fail(`LIST → ${r.status}: ${JSON.stringify(r.json)}`);
  });

  // ── 14. PERFIL / ORGANIZAÇÃO ──────────────────────────────────────────────
  await suite('Perfil e Organização', async () => {
    const profile = await req('GET', '/api/profile/me', token);
    const uid = profile.json?.data?.uid || profile.json?.uid || profile.json?.data?.id;
    profile.ok ? ok(`Profile → ${profile.status} uid="${uid}"`) : fail(`Profile → ${profile.status}: ${JSON.stringify(profile.json)}`);

    const org = await req('GET', '/api/organizations/current', token);
    const nome = org.json?.data?.name || org.json?.name;
    org.ok ? ok(`Organização → ${org.status} nome="${nome}"`) : fail(`Org → ${org.status}: ${JSON.stringify(org.json)}`);
  });

  // ── RESUMO ────────────────────────────────────────────────────────────────
  const total = passed + failed;
  console.log('\n' + '═'.repeat(60));
  console.log(`  Resultado: ${passed}/${total} testes passaram`);
  if (failed > 0) {
    console.log(`  ⚠️  ${failed} falha(s) — veja os ❌ acima`);
    process.exitCode = 1;
  } else {
    console.log('  🎉  Todos os testes passaram!');
  }
  console.log('═'.repeat(60));
}

main().catch((e) => { console.error('Erro fatal:', e); process.exit(1); });
