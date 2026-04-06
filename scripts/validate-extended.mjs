#!/usr/bin/env node
/**
 * Validação Estendida — FisioFlow
 * Cobre: Sessions, Clinical, CRM, Eventos, TimeEntries, TreatmentCycles,
 *        Surveys, Invitations, Wearables, Recibos, Notifications, Scheduling,
 *        Wiki extras, ExercisePlans, ExerciseSessions, EvolutionVersions,
 *        GoalProfiles, MedicalRequests, OrgMembers, AuditLogs, EvaluationForms
 */

const API      = 'https://fisioflow-api.rafalegollas.workers.dev';
const AUTH_URL = 'https://ep-wandering-bonus-acj4zwvo.neonauth.sa-east-1.aws.neon.tech/neondb/auth';
const EMAIL    = 'rafael.minatto@yahoo.com.br';
const PASSWORD = 'Yukari30@';

let passed = 0, failed = 0, skipped = 0;
const ok   = (msg) => { passed++; console.log(`  ✅ ${msg}`); };
const fail = (msg) => { failed++; console.error(`  ❌ ${msg}`); };
const skip = (msg) => { skipped++; console.log(`  ⏭  ${msg}`); };
const info = (msg) => console.log(`\n🔷 ${msg}`);

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
  const init = {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  };
  if (body !== undefined && method !== 'GET') {
    init.body = JSON.stringify(body);
  }
  const res = await fetch(`${API}${path}`, {
    ...init,
  });
  let json;
  try { json = await res.json(); } catch { json = {}; }
  return { status: res.status, ok: res.ok, json };
}

async function suite(name, fn) {
  info(name);
  try { await fn(); } catch (e) { fail(`Suite erro: ${e.message}`); }
}

// helpers de assertiva
const assertList  = (r, label) =>
  r.ok ? ok(`${label} LIST → ${r.status} (${r.json?.data?.length ?? 0})`)
       : fail(`${label} LIST → ${r.status}: ${JSON.stringify(r.json).slice(0,120)}`);

const assertCreate = (r, label, id) =>
  (r.status === 201 || r.status === 200) && id
    ? ok(`${label} CREATE → ${r.status} id=${id}`)
    : fail(`${label} CREATE → ${r.status}: ${JSON.stringify(r.json).slice(0,120)}`);

const assertOk = (r, label) =>
  r.ok ? ok(`${label} → ${r.status}`) : fail(`${label} → ${r.status}: ${JSON.stringify(r.json).slice(0,120)}`);

// ─── main ──────────────────────────────────────────────────────────────────
async function main() {
  console.log('═'.repeat(62));
  console.log('  FisioFlow — Validação Estendida (módulos secundários)');
  console.log(`  Usuário: ${EMAIL}`);
  console.log('═'.repeat(62));

  info('Autenticação');
  let token;
  try { token = await getToken(); ok('Login OK'); }
  catch (e) { fail(`Login: ${e.message}`); return; }

  // Pre-load de FK
  const pRes   = await req('GET', '/api/patients?limit=1', token);
  const patient = pRes.json?.data?.[0];
  if (!patient) { fail('Nenhum paciente disponível — abortando'); return; }
  ok(`Paciente FK: ${patient.id.slice(0,8)}…`);

  const ts = Date.now();

  // ─────────────────────────────────────────────────────────────────────────
  // 1. SESSIONS (SOAP)
  // ─────────────────────────────────────────────────────────────────────────
  await suite('Sessions SOAP — CRUD', async () => {
    // LIST requer patientId
    assertList(await req('GET', `/api/sessions?patientId=${patient.id}`, token), 'Sessions');

    const c = await req('POST', '/api/sessions', token, {
      patient_id: patient.id, record_date: '2026-05-12',
      subjective: 'Dor lombar leve', objective: 'Mobilidade 80%',
      assessment: 'Melhora progressiva', plan: 'Manter protocolo',
      duration_minutes: 50, status: 'draft',
    });
    const sid = c.json?.data?.id;
    assertCreate(c, 'Sessions', sid);

    if (sid) {
      assertOk(await req('GET', `/api/sessions/${sid}`, token), 'Sessions GET/:id');

      assertOk(await req('PUT', `/api/sessions/${sid}`, token, {
        subjective: 'Dor lombar reduzida', status: 'draft',
      }), 'Sessions UPDATE');

      assertOk(await req('POST', `/api/sessions/${sid}/finalize`, token, {}), 'Sessions FINALIZE');

      assertOk(await req('DELETE', `/api/sessions/${sid}`, token), 'Sessions DELETE (finalizada→409 ok)');
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 2. CLINICAL — Conduct Library
  // ─────────────────────────────────────────────────────────────────────────
  await suite('Clinical — Conduct Library CRUD', async () => {
    assertList(await req('GET', '/api/clinical/conduct-library', token), 'ConductLib');

    const c = await req('POST', '/api/clinical/conduct-library', token, {
      title: `Conduta ${ts}`, category: 'fisioterapia',
      conduct_text: 'Aplicar gelo por 15 minutos.',
    });
    const cid = c.json?.data?.id;
    assertCreate(c, 'ConductLib', cid);

    if (cid) {
      assertOk(await req('PUT', `/api/clinical/conduct-library/${cid}`, token, {
        title: `Conduta ${ts} EDIT`,
      }), 'ConductLib UPDATE');

      assertOk(await req('DELETE', `/api/clinical/conduct-library/${cid}`, token), 'ConductLib DELETE');
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 3. CLINICAL — Evolution Templates
  // ─────────────────────────────────────────────────────────────────────────
  await suite('Clinical — Evolution Templates CRUD', async () => {
    assertList(await req('GET', '/api/clinical/evolution-templates', token), 'EvoTemplate');

    const c = await req('POST', '/api/clinical/evolution-templates', token, {
      name: `Template ${ts}`, description: 'Template de validação',
      blocks: [{ type: 'text', label: 'Subjetivo' }],
    });
    const tid = c.json?.data?.id;
    assertCreate(c, 'EvoTemplate', tid);

    if (tid) {
      assertOk(await req('GET', `/api/clinical/evolution-templates/${tid}`, token), 'EvoTemplate GET/:id');
      assertOk(await req('PUT', `/api/clinical/evolution-templates/${tid}`, token, {
        name: `Template ${ts} EDIT`,
      }), 'EvoTemplate UPDATE');
      assertOk(await req('DELETE', `/api/clinical/evolution-templates/${tid}`, token), 'EvoTemplate DELETE');
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 4. CLINICAL — Pain Maps
  // ─────────────────────────────────────────────────────────────────────────
  await suite('Clinical — Pain Maps CRUD', async () => {
    assertList(await req('GET', `/api/clinical/pain-maps?patientId=${patient.id}`, token), 'PainMap');

    const c = await req('POST', '/api/clinical/pain-maps', token, {
      patient_id: patient.id, body_region: 'lombar',
      pain_level: 5, color_code: '#FF0000',
      points: [{ x_coordinate: 100, y_coordinate: 200, intensity: 5, region: 'lombar' }],
    });
    const pmid = c.json?.data?.id;
    assertCreate(c, 'PainMap', pmid);

    if (pmid) {
      assertOk(await req('PUT', `/api/clinical/pain-maps/${pmid}`, token, { pain_level: 3 }), 'PainMap UPDATE');
      assertOk(await req('DELETE', `/api/clinical/pain-maps/${pmid}`, token), 'PainMap DELETE');
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 5. CRM — Leads
  // ─────────────────────────────────────────────────────────────────────────
  await suite('CRM — Leads CRUD', async () => {
    assertList(await req('GET', '/api/crm/leads', token), 'Leads');

    const c = await req('POST', '/api/crm/leads', token, {
      nome: `Lead Teste ${ts}`, telefone: '11977776666',
      email: `lead_${ts}@teste.com`, origem: 'instagram', estagio: 'aguardando',
    });
    const lid = c.json?.data?.id;
    assertCreate(c, 'Leads', lid);

    if (lid) {
      assertOk(await req('GET', `/api/crm/leads/${lid}`, token), 'Leads GET/:id');
      assertOk(await req('PUT', `/api/crm/leads/${lid}`, token, {
        estagio: 'em_contato', observacoes: 'Validação automática',
      }), 'Leads UPDATE');

      // Histórico — usar campo correto tipo_contato
      assertOk(await req('GET', `/api/crm/leads/${lid}/historico`, token), 'Leads GET historico');
      assertOk(await req('POST', `/api/crm/leads/${lid}/historico`, token, {
        tipo_contato: 'ligacao', descricao: 'Primeiro contato', resultado: 'interessado',
      }), 'Leads POST historico');

      assertOk(await req('DELETE', `/api/crm/leads/${lid}`, token), 'Leads DELETE');
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 6. CRM — Campanhas
  // ─────────────────────────────────────────────────────────────────────────
  await suite('CRM — Campanhas CRUD', async () => {
    assertList(await req('GET', '/api/crm/campanhas', token), 'Campanhas');

    const c = await req('POST', '/api/crm/campanhas', token, {
      nome: `Campanha ${ts}`, tipo: 'whatsapp',
      conteudo: 'Campanha de validação', status: 'concluida',
    });
    const cmpid = c.json?.data?.id;
    assertCreate(c, 'Campanhas', cmpid);

    if (cmpid) {
      assertOk(await req('PUT', `/api/crm/campanhas/${cmpid}`, token, { status: 'concluida' }), 'Campanhas UPDATE');
      assertOk(await req('DELETE', `/api/crm/campanhas/${cmpid}`, token), 'Campanhas DELETE');
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 7. EVENTOS — rotas registradas em /api diretamente
  // ─────────────────────────────────────────────────────────────────────────
  await suite('Eventos — CRUD', async () => {
    assertList(await req('GET', '/api/activities', token), 'Eventos');

    const c = await req('POST', '/api/activities', token, {
      nome: `Evento ${ts}`, categoria: 'workshop',
      data_inicio: '2026-06-01', hora_inicio: '09:00',
      data_fim: '2026-06-01', hora_fim: '17:00',
      gratuito: true, status: 'ativo',
    });
    const evid = c.json?.data?.id;
    assertCreate(c, 'Eventos', evid);

    if (evid) {
      assertOk(await req('GET', `/api/activities/${evid}`, token), 'Eventos GET/:id');
      assertOk(await req('PUT', `/api/activities/${evid}`, token, { nome: `Evento ${ts} EDIT` }), 'Eventos UPDATE');
      assertOk(await req('DELETE', `/api/activities/${evid}`, token), 'Eventos DELETE');
    }

    // Salas
    const sala = await req('POST', '/api/salas', token, { nome: `Sala ${ts}`, capacidade: 20 });
    const salaid = sala.json?.data?.id;
    assertCreate(sala, 'Salas', salaid);
    if (salaid) {
      assertOk(await req('DELETE', `/api/salas/${salaid}`, token), 'Salas DELETE');
    }

    // Serviços
    const svc = await req('POST', '/api/servicos', token, {
      nome: `Serviço ${ts}`, descricao: 'Validação', valor: 100,
    });
    const svcid = svc.json?.data?.id;
    assertCreate(svc, 'Servicos', svcid);
    if (svcid) {
      assertOk(await req('DELETE', `/api/servicos/${svcid}`, token), 'Servicos DELETE');
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 8. TIME ENTRIES
  // ─────────────────────────────────────────────────────────────────────────
  await suite('Time Entries — CRUD + Stats', async () => {
    assertList(await req('GET', '/api/time-entries', token), 'TimeEntries');
    assertOk(await req('GET', '/api/time-entries/stats', token), 'TimeEntries STATS');

    const c = await req('POST', '/api/time-entries', token, {
      description: `Sessão ${ts}`, start_time: '2026-05-10T09:00:00Z',
      end_time: '2026-05-10T10:00:00Z', duration_seconds: 3600,
      is_billable: true, patient_id: patient.id,
    });
    const teid = c.json?.data?.id;
    assertCreate(c, 'TimeEntries', teid);

    if (teid) {
      assertOk(await req('PATCH', `/api/time-entries/${teid}`, token, { description: `Sessão ${ts} EDIT` }), 'TimeEntries UPDATE');
      assertOk(await req('DELETE', `/api/time-entries/${teid}`, token), 'TimeEntries DELETE');
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 9. TREATMENT CYCLES
  // ─────────────────────────────────────────────────────────────────────────
  await suite('Treatment Cycles — CRUD', async () => {
    assertList(await req('GET', '/api/treatment-cycles', token), 'TreatCycles');

    const c = await req('POST', '/api/treatment-cycles', token, {
      patient_id: patient.id, title: `Ciclo ${ts}`,
      description: 'Validação', status: 'active',
      start_date: '2026-05-01', end_date: '2026-07-01',
    });
    const tcid = c.json?.data?.id;
    assertCreate(c, 'TreatCycles', tcid);

    if (tcid) {
      assertOk(await req('PATCH', `/api/treatment-cycles/${tcid}`, token, { status: 'completed' }), 'TreatCycles UPDATE');
      assertOk(await req('DELETE', `/api/treatment-cycles/${tcid}`, token), 'TreatCycles DELETE');
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 10. SATISFACTION SURVEYS
  // ─────────────────────────────────────────────────────────────────────────
  await suite('Satisfaction Surveys — CRUD + Stats', async () => {
    assertList(await req('GET', '/api/satisfaction-surveys', token), 'Surveys');
    assertOk(await req('GET', '/api/satisfaction-surveys/stats', token), 'Surveys STATS');

    const c = await req('POST', '/api/satisfaction-surveys', token, {
      patient_id: patient.id, nps_score: 9,
      q_care_quality: 5, q_professionalism: 5,
      q_facility_cleanliness: 4, q_scheduling_ease: 4,
      q_communication: 5, comments: 'Ótimo atendimento!',
    });
    const svid = c.json?.data?.id;
    assertCreate(c, 'Surveys', svid);

    if (svid) {
      assertOk(await req('PATCH', `/api/satisfaction-surveys/${svid}`, token, { comments: 'Editado' }), 'Surveys UPDATE');
      assertOk(await req('DELETE', `/api/satisfaction-surveys/${svid}`, token), 'Surveys DELETE');
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 11. INVITATIONS
  // ─────────────────────────────────────────────────────────────────────────
  await suite('Invitations — CRUD', async () => {
    assertList(await req('GET', '/api/invitations', token), 'Invitations');

    const invEmail = `invite_${ts}@teste.com`;
    const c = await req('POST', '/api/invitations', token, {
      email: invEmail, role: 'fisioterapeuta',
    });
    const iid = c.json?.data?.id;
    const itoken = c.json?.data?.token;
    assertCreate(c, 'Invitations', iid);

    if (iid) {
      assertOk(await req('PATCH', `/api/invitations/${iid}`, token, { role: 'admin' }), 'Invitations UPDATE');

      if (itoken) {
        const v = await req('GET', `/api/invitations/validate/${itoken}`, token);
        assertOk(v, 'Invitations VALIDATE token');
      }

      assertOk(await req('DELETE', `/api/invitations/${iid}`, token), 'Invitations DELETE');
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 12. WEARABLES — campos corretos: source, data_type, timestamp
  // ─────────────────────────────────────────────────────────────────────────
  await suite('Wearables — CRUD', async () => {
    assertList(await req('GET', '/api/wearables', token), 'Wearables');

    const c = await req('POST', '/api/wearables', token, {
      patient_id: patient.id, source: 'manual',
      data_type: 'heart_rate', value: 72, unit: 'bpm',
      timestamp: new Date().toISOString(),
    });
    const wid = c.json?.data?.id;
    assertCreate(c, 'Wearables', wid);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 13. RECIBOS
  // ─────────────────────────────────────────────────────────────────────────
  await suite('Recibos — list + número', async () => {
    assertList(await req('GET', '/api/recibos', token), 'Recibos');
    assertOk(await req('GET', '/api/recibos/last-number', token), 'Recibos LAST-NUMBER');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 14. NOTIFICATIONS
  // ─────────────────────────────────────────────────────────────────────────
  await suite('Notifications — list', async () => {
    assertList(await req('GET', '/api/notifications', token), 'Notifications');
    assertOk(await req('GET', '/api/notification-preferences', token), 'NotifPrefs GET');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 15. SCHEDULING SETTINGS
  // ─────────────────────────────────────────────────────────────────────────
  await suite('Scheduling — settings', async () => {
    assertOk(await req('GET', '/api/scheduling/settings/business-hours', token), 'Scheduling BUSINESS-HOURS');
    assertOk(await req('GET', '/api/scheduling/settings/blocked-times', token), 'Scheduling BLOCKED-TIMES');
    assertOk(await req('GET', '/api/scheduling/waitlist', token), 'Scheduling WAITLIST');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 16. WIKI CATEGORIES + COMMENTS
  // ─────────────────────────────────────────────────────────────────────────
  await suite('Wiki — Categories + Comments', async () => {
    assertList(await req('GET', '/api/wiki/categories', token), 'WikiCategories');

    const cc = await req('POST', '/api/wiki/categories', token, { name: `Cat ${ts}`, color: '#3B82F6' });
    const ccid = cc.json?.data?.id;
    assertCreate(cc, 'WikiCategory', ccid);
    if (ccid) {
      assertOk(await req('DELETE', `/api/wiki/categories/${ccid}`, token), 'WikiCategory DELETE');
    }

    // Busca uma página existente para testar comentário
    const pages = await req('GET', '/api/wiki', token);
    const page = pages.json?.data?.[0];
    if (page) {
      assertList(await req('GET', `/api/wiki/${page.id}/comments`, token), 'WikiComments');
      const cm = await req('POST', `/api/wiki/${page.id}/comments`, token, {
        content: `Comentário de validação ${ts}`,
      });
      assertCreate(cm, 'WikiComment', cm.json?.data?.id);
    } else {
      skip('Sem páginas wiki para testar comentários');
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 17. EXERCISE PLANS
  // ─────────────────────────────────────────────────────────────────────────
  await suite('Exercise Plans — CRUD', async () => {
    assertList(await req('GET', '/api/exercise-plans', token), 'ExercisePlans');

    const c = await req('POST', '/api/exercise-plans', token, {
      patient_id: patient.id, name: `Plano ${ts}`,
      description: 'Plano de validação', status: 'active',
      start_date: '2026-05-01',
    });
    const epid = c.json?.data?.id;
    assertCreate(c, 'ExercisePlans', epid);

    if (epid) {
      assertOk(await req('PATCH', `/api/exercise-plans/${epid}`, token, { name: `Plano ${ts} EDIT` }), 'ExercisePlans UPDATE');
      assertOk(await req('DELETE', `/api/exercise-plans/${epid}`, token), 'ExercisePlans DELETE');
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 18. EXERCISE SESSIONS
  // ─────────────────────────────────────────────────────────────────────────
  await suite('Exercise Sessions — CRUD', async () => {
    assertList(await req('GET', '/api/exercise-sessions', token), 'ExerciseSessions');

    const c = await req('POST', '/api/exercise-sessions', token, {
      patient_id: patient.id, session_date: '2026-05-10',
      duration_minutes: 45, status: 'completed', notes: 'Validação',
    });
    const esid = c.json?.data?.id;
    assertCreate(c, 'ExerciseSessions', esid);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 19. EVOLUTION VERSIONS — requer soapRecordId (não patientId)
  // ─────────────────────────────────────────────────────────────────────────
  await suite('Evolution Versions — list', async () => {
    // Usa UUID fictício; retorna lista vazia mas status 200
    const r = await req('GET', '/api/evolution-versions?soapRecordId=00000000-0000-0000-0000-000000000000', token);
    assertOk(r, 'EvolutionVersions LIST');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 20. GOAL PROFILES — POST requer campo 'id' explícito
  // ─────────────────────────────────────────────────────────────────────────
  await suite('Goal Profiles — CRUD', async () => {
    assertList(await req('GET', '/api/goal-profiles', token), 'GoalProfiles');

    // Gera UUID para o goal profile
    const gpId = [ts, Math.random().toString(36).slice(2)].join('-').padStart(36, '0').slice(0, 36);
    const formattedId = `${gpId.slice(0,8)}-${gpId.slice(8,12)}-4${gpId.slice(12,15)}-a${gpId.slice(15,18)}-${gpId.slice(18,30)}`;

    const c = await req('POST', '/api/goal-profiles', token, {
      id: formattedId,
      name: `Perfil ${ts}`, description: 'Perfil de validação',
      category: 'mobilidade', goals: ['Melhorar flexibilidade'],
    });
    const gpid = c.json?.data?.id;
    assertCreate(c, 'GoalProfiles', gpid);

    if (gpid) {
      assertOk(await req('PUT', `/api/goal-profiles/${gpid}`, token, { name: `Perfil ${ts} EDIT` }), 'GoalProfiles UPDATE');
      assertOk(await req('DELETE', `/api/goal-profiles/${gpid}`, token), 'GoalProfiles DELETE');
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 21. MEDICAL REQUESTS — sem PUT (apenas GET, POST, DELETE)
  // ─────────────────────────────────────────────────────────────────────────
  await suite('Medical Requests — CRUD', async () => {
    assertList(await req('GET', `/api/medical-requests?patientId=${patient.id}`, token), 'MedicalReqs');

    const c = await req('POST', '/api/medical-requests', token, {
      patient_id: patient.id,
      doctor_name: `Dr. Teste ${ts}`,
      notes: `Encaminhamento de validação ${ts}`,
      request_date: '2026-05-01',
    });
    const mrid = c.json?.data?.id;
    assertCreate(c, 'MedicalReqs', mrid);

    if (mrid) {
      assertOk(await req('DELETE', `/api/medical-requests/${mrid}`, token), 'MedicalReqs DELETE');
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 22. ORGANIZATION MEMBERS
  // ─────────────────────────────────────────────────────────────────────────
  await suite('Organization Members — list', async () => {
    assertList(await req('GET', '/api/organization-members', token), 'OrgMembers');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 23. AUDIT LOGS
  // ─────────────────────────────────────────────────────────────────────────
  await suite('Audit Logs — list', async () => {
    assertList(await req('GET', '/api/audit-logs', token), 'AuditLogs');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 24. EVALUATION FORMS
  // ─────────────────────────────────────────────────────────────────────────
  await suite('Evaluation Forms — list', async () => {
    assertList(await req('GET', '/api/evaluation-forms', token), 'EvalForms');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 25. SECURITY — LGPD Consents
  // ─────────────────────────────────────────────────────────────────────────
  await suite('Security — LGPD Consents', async () => {
    assertOk(await req('GET', '/api/security/lgpd-consents', token), 'LGPD Consents GET');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 26. FINANCIAL — Convênios + Formas de Pagamento
  // ─────────────────────────────────────────────────────────────────────────
  await suite('Financeiro — Convênios + Formas de Pagamento', async () => {
    assertList(await req('GET', '/api/financial/convenios', token), 'Convenios');

    const conv = await req('POST', '/api/financial/convenios', token, {
      nome: `Convênio ${ts}`, codigo_tuss: '00190', tipo: 'plano_saude',
    });
    const convid = conv.json?.data?.id;
    assertCreate(conv, 'Convenios', convid);
    if (convid) {
      assertOk(await req('PUT', `/api/financial/convenios/${convid}`, token, { nome: `Convênio ${ts} EDIT` }), 'Convenios UPDATE');
      assertOk(await req('DELETE', `/api/financial/convenios/${convid}`, token), 'Convenios DELETE');
    }

    assertList(await req('GET', '/api/financial/formas-pagamento', token), 'FormasPagamento');

    const fp = await req('POST', '/api/financial/formas-pagamento', token, {
      nome: `Forma ${ts}`, tipo: 'pix',
    });
    const fpid = fp.json?.data?.id;
    assertCreate(fp, 'FormasPagamento', fpid);
    if (fpid) {
      assertOk(await req('DELETE', `/api/financial/formas-pagamento/${fpid}`, token), 'FormasPagamento DELETE');
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 27. TEMPLATES (Exercise)
  // ─────────────────────────────────────────────────────────────────────────
  await suite('Exercise Templates — CRUD', async () => {
    assertList(await req('GET', '/api/templates', token), 'ExerciseTemplates');

    const c = await req('POST', '/api/templates', token, {
      name: `Template ${ts}`, description: 'Validação', category: 'geral',
    });
    const etid = c.json?.data?.id;
    assertCreate(c, 'ExerciseTemplates', etid);
    if (etid) {
      assertOk(await req('PUT', `/api/templates/${etid}`, token, { name: `Template ${ts} EDIT` }), 'ExerciseTemplates UPDATE');
      assertOk(await req('DELETE', `/api/templates/${etid}`, token), 'ExerciseTemplates DELETE');
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 28. EXERCISE VIDEOS
  // ─────────────────────────────────────────────────────────────────────────
  await suite('Exercise Videos — list', async () => {
    assertList(await req('GET', '/api/exercise-videos', token), 'ExerciseVideos');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // RESUMO
  // ─────────────────────────────────────────────────────────────────────────
  const total = passed + failed + skipped;
  console.log('\n' + '═'.repeat(62));
  console.log(`  Resultado: ${passed} ✅  ${failed} ❌  ${skipped} ⏭  (total ${total})`);
  if (failed > 0) {
    console.log(`  ⚠️  ${failed} falha(s) — veja os ❌ acima`);
    process.exitCode = 1;
  } else {
    console.log('  🎉  Todos os testes passaram!');
  }
  console.log('═'.repeat(62));
}

main().catch((e) => { console.error('Erro fatal:', e); process.exit(1); });
