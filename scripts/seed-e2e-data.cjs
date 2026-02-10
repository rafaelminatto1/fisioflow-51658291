/**
 * Seed E2E Test Data
 *
 * Cria dados de teste para os testes E2E do Playwright.
 *
 * Pré-requisitos:
 * - Firebase service account key configurado
 * - Usuário de teste criado (teste@moocafisio.com.br)
 *
 * Uso:
 *   node scripts/seed-e2e-data.cjs
 *
 * Variáveis de ambiente:
 *   E2E_USER_EMAIL - Email do usuário de teste (default: teste@moocafisio.com.br)
 *   E2E_ORG_ID - ID da organização (default: auto-detect)
 *   E2E_PATIENTS_COUNT - Quantidade de pacientes (default: 10)
 *   E2E_APPOINTMENTS_COUNT - Agendamentos por paciente (default: 5)
 *
 * Dados criados:
 *   - Organization (se necessário)
 *   - Patients (configurável via E2E_PATIENTS_COUNT)
 *   - Appointments (configurável via E2E_APPOINTMENTS_COUNT)
 *   - SOAP Records (para agendamentos realizados)
 *   - Schedule Configuration
 *   - Financial Transactions
 *   - Exercise Videos (8 vídeos para testes E2E)
 */

const { getFirebaseAdmin } = require('./lib/firebase-admin-helper.cjs');

// Configuration
const CONFIG = {
  testUserEmail: process.env.E2E_USER_EMAIL || 'teste@moocafisio.com.br',
  patientsCount: parseInt(process.env.E2E_PATIENTS_COUNT || '10'),
  appointmentsPerPatient: parseInt(process.env.E2E_APPOINTMENTS_PER_PATIENT || '5'),
  orgId: process.env.E2E_ORG_ID || null,
};

// Helper: generate random dates around today
function getDatesAroundToday(offsetDays, count) {
  const dates = [];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + offsetDays);

  for (let i = 0; i < count; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    // Skip weekends
    if (date.getDay() !== 0 && date.getDay() !== 6) {
      dates.push(date);
    }
  }
  return dates;
}

// Helper: format time as HH:MM
function formatTime(date) {
  return date.toTimeString().slice(0, 5);
}

// Helper: generate CPF ( Brazilian ID )
function generateCPF() {
  const cpf = Array(11).fill(0).map(() => Math.floor(Math.random() * 10));
  return cpf.slice(0, 3).join('') + '.' +
         cpf.slice(3, 6).join('') + '.' +
         cpf.slice(6, 9).join('') + '-' +
         cpf.slice(9, 11).join('');
}

// Helper: generate phone number
function generatePhone() {
  const ddd = ['11', '21', '31', '41', '51', '61', '71', '81', '85', '92'][Math.floor(Math.random() * 10)];
  const number = Math.floor(Math.random() * 100000000).toString().padStart(8, '9');
  return ddd + number;
}

// Test data
const PATIENT_NAMES = [
  'Maria Silva Santos',
  'João Pedro Oliveira',
  'Ana Carolina Costa',
  'Carlos Eduardo Rodrigues',
  'Fernanda Lima Almeida',
  'Roberto Santos Junior',
  'Juliana Martins Pereira',
  'Lucas Henrique Souza',
  'Patricia Gonçalves Ribeiro',
  'Marcos Vinicius Dias',
];

const CONDITIONS = [
  'Lombalgia crônica',
  'Cervicalgia',
  'Lesão do LCA',
  'Tendinite patelar',
  'Síndrome do túnel do carpo',
  'Escoliose',
  'Hérnia de disco',
  'Fratura de tornozelo',
  'Luxação de ombro',
  'Recuperação pós-cirúrgica',
];

const APPOINTMENT_TYPES = ['Consulta Inicial', 'Fisioterapia', 'Reavaliação', 'Consulta de Retorno'];
const APPOINTMENT_STATUSES = ['Confirmado', 'Pendente', 'Realizado', 'Reagendado', 'Cancelado'];

// Exercise videos for E2E tests
const EXERCISE_VIDEOS = [
  {
    title: 'Rotação de Ombro',
    description: 'Exercício para mobilidade de ombro',
    category: 'mobilidade',
    difficulty: 'iniciante',
    duration: 45,
    file_size: 1024000,
    body_parts: ['ombros'],
    equipment: [],
  },
  {
    title: 'Agachamento Profundo',
    description: 'Fortalecimento de membros inferiores',
    category: 'fortalecimento',
    difficulty: 'intermediário',
    duration: 60,
    file_size: 2048000,
    body_parts: ['quadril', 'joelhos'],
    equipment: ['halteres'],
  },
  {
    title: 'Alongamento de Coluna',
    description: 'Alongamento para coluna lombar e torácica',
    category: 'alongamento',
    difficulty: 'iniciante',
    duration: 30,
    file_size: 800000,
    body_parts: ['coluna lombar', 'coluna torácica'],
    equipment: ['tapete'],
  },
  {
    title: 'Fortalecimento de Core',
    description: 'Exercícios para fortalecimento abdominal',
    category: 'fortalecimento',
    difficulty: 'intermediário',
    duration: 90,
    file_size: 3500000,
    body_parts: ['coluna lombar', 'quadril'],
    equipment: ['tapete'],
  },
  {
    title: 'Equilíbrio Unipodal',
    description: 'Exercício de equilíbrio para tornozelos',
    category: 'equilíbrio',
    difficulty: 'iniciante',
    duration: 40,
    file_size: 950000,
    body_parts: ['tornozelos', 'joelhos'],
    equipment: [],
  },
  {
    title: 'Mobilidade de Quadril',
    description: 'Exercícios para aumentar mobilidade do quadril',
    category: 'mobilidade',
    difficulty: 'iniciante',
    duration: 55,
    file_size: 1200000,
    body_parts: ['quadril'],
    equipment: ['tapete'],
  },
  {
    title: 'Fortalecimento de Punho',
    description: 'Exercícios para punho e antebraço',
    category: 'fortalecimento',
    difficulty: 'iniciante',
    duration: 35,
    file_size: 750000,
    body_parts: ['punhos', 'cotovelos'],
    equipment: ['banda elástica'],
  },
  {
    title: 'Postura Corrigida',
    description: 'Exercícios posturais para coluna',
    category: 'postura',
    difficulty: 'iniciante',
    duration: 50,
    file_size: 1100000,
    body_parts: ['coluna cervical', 'coluna torácica'],
    equipment: [],
  },
];

async function getOrganizationId(db, userEmail) {
  // Try to find user's organization
  const usersSnapshot = await db.collection('profiles')
    .where('email', '==', userEmail)
    .limit(1)
    .get();

  if (!usersSnapshot.empty) {
    const userDoc = usersSnapshot.docs[0];
    console.log(`✅ Found user: ${userDoc.id}`);
    return userDoc.data().organization_id;
  }

  // Create default org if not found
  console.log('⚠️  User not found, using default organization');
  return 'default-org';
}

async function getUserId(db, userEmail) {
  const usersSnapshot = await db.collection('profiles')
    .where('email', '==', userEmail)
    .limit(1)
    .get();

  if (!usersSnapshot.empty) {
    return usersSnapshot.docs[0].id;
  }
  return null;
}

async function seedPatients(db, orgId, therapistId, count) {
  console.log(`\n👥 Seeding ${count} patients...`);

  const patients = [];

  for (let i = 0; i < count; i++) {
    const name = PATIENT_NAMES[i % PATIENT_NAMES.length];
    const suffix = Math.floor(i / PATIENT_NAMES.length) + 1;
    const displayName = suffix > 1 ? `${name} (${suffix})` : name;

    const patientData = {
      full_name: displayName,
      name: displayName,
      email: `paciente${i + 1}_e2e@teste.com`,
      phone: generatePhone(),
      cpf: generateCPF(),
      birth_date: new Date(1980 + Math.floor(Math.random() * 30), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0],
      gender: ['masculino', 'feminino'][Math.floor(Math.random() * 2)],
      main_condition: CONDITIONS[i % CONDITIONS.length],
      status: 'Em Tratamento',
      progress: Math.floor(Math.random() * 100),
      is_active: true,
      organization_id: orgId,
      medical_history: `Histórico médico de teste para ${displayName}. Paciente em tratamento fisioterapêutico.`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      incomplete_registration: false,
    };

    const patientRef = await db.collection('patients').add(patientData);
    patients.push({ id: patientRef.id, ...patientData });

    console.log(`   ✅ Created patient: ${displayName} (${patientRef.id})`);
  }

  return patients;
}

async function seedAppointments(db, orgId, therapistId, patients, appointmentsPerPatient) {
  console.log(`\n📅 Seeding appointments...`);

  const today = new Date();
  const appointments = [];

  // Past appointments (for completed sessions)
  const pastDates = getDatesAroundToday(-30, Math.ceil(appointmentsPerPatient / 2));

  // Future appointments
  const futureDates = getDatesAroundToday(1, Math.floor(appointmentsPerPatient / 2));

  for (const patient of patients) {
    const allDates = [...pastDates, ...futureDates].slice(0, appointmentsPerPatient);

    for (let i = 0; i < allDates.length; i++) {
      const date = allDates[i];
      const isPast = date < today;
      const hour = 8 + Math.floor(Math.random() * 10); // 8 AM to 6 PM
      const startTime = `${hour.toString().padStart(2, '0')}:00`;
      const endTime = `${(hour + 1).toString().padStart(2, '0')}:00`;

      const status = isPast
        ? (Math.random() > 0.2 ? 'Realizado' : 'Cancelado')
        : APPOINTMENT_STATUSES[Math.floor(Math.random() * 3)]; // Confirmado, Pendente, or Reagendado

      const appointmentData = {
        patient_id: patient.id,
        patient_name: patient.name,
        therapist_id: therapistId,
        organization_id: orgId,
        date: date.toISOString().split('T')[0],
        start_time: startTime,
        end_time: endTime,
        time: startTime,
        duration: 60,
        type: APPOINTMENT_TYPES[Math.floor(Math.random() * APPOINTMENT_TYPES.length)],
        status: status,
        payment_status: isPast && status === 'Realizado' ? 'paid' : 'pending',
        session_type: 'individual',
        notes: `Agendamento de teste para ${patient.name}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const appointmentRef = await db.collection('appointments').add(appointmentData);
      appointments.push({ id: appointmentRef.id, ...appointmentData });

      // Create SOAP record for completed appointments
      if (status === 'Realizado') {
        await db.collection('soap_records').add({
          patient_id: patient.id,
          session_id: appointmentRef.id,
          session_date: date.toISOString().split('T')[0],
          session_number: i + 1,
          subjective: `Paciente relata ${patient.main_condition}.`,
          objective: 'Exame físico realizado sem alterações significativas.',
          assessment: 'Paciente respondendo bem ao tratamento.',
          plan: 'Continuar com protocolo atual.',
          created_by: therapistId,
          pain_level: Math.floor(Math.random() * 10),
          evolution_notes: `Sessão ${i + 1} registrada automaticamente.`,
          organization_id: orgId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    }

    console.log(`   ✅ Created ${appointmentsPerPatient} appointments for ${patient.name}`);
  }

  return appointments;
}

async function seedScheduleConfig(db, orgId) {
  console.log(`\n⚙️  Seeding schedule configuration...`);

  const daysOfWeek = [1, 2, 3, 4, 5]; // Monday to Friday

  for (const day of daysOfWeek) {
    await db.collection('schedule_capacity_config').add({
      organization_id: orgId,
      day_of_week: day,
      start_time: '08:00',
      end_time: '18:00',
      max_parallel_sessions: 3,
      session_duration_minutes: 60,
      buffer_minutes: 0,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    await db.collection('schedule_business_hours').add({
      organization_id: orgId,
      day_of_week: day,
      start_time: '08:00',
      end_time: '18:00',
      is_active: true,
      notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  console.log('   ✅ Schedule configuration created for Mon-Fri');
}

async function ensureUserRole(db, userEmail) {
  console.log(`\n🔐 Ensuring test user has correct role...`);

  const usersSnapshot = await db.collection('profiles')
    .where('email', '==', userEmail)
    .limit(1)
    .get();

  let userId;
  let organizationId;

  if (usersSnapshot.empty) {
    console.log(`⚠️  User ${userEmail} not found in profiles collection, creating profile...`);

    // First create a default organization
    const now = new Date().toISOString();
    const orgRef = await db.collection('organizations').add({
      name: 'Clínica Teste E2E',
      slug: 'clinica-teste-e2e',
      active: true,
      settings: {
        timezone: 'America/Sao_Paulo',
        language: 'pt-BR',
      },
      created_at: now,
      updated_at: now,
    });
    organizationId = orgRef.id;
    console.log(`   ✅ Created organization: ${organizationId}`);

    // Create profile for test user
    const newProfile = {
      email: userEmail,
      full_name: 'Usuário Teste E2E',
      name: 'Usuário Teste',
      role: 'admin',
      organization_id: organizationId,
      onboarding_completed: true,
      is_active: true,
      created_at: now,
      updated_at: now,
    };

    const profileRef = await db.collection('profiles').add(newProfile);
    userId = profileRef.id;
    console.log(`   ✅ Created profile for test user: ${userId}`);
    return { userId, organizationId };
  }

  const userDoc = usersSnapshot.docs[0];
  const userData = userDoc.data();
  userId = userDoc.id;
  organizationId = userData.organization_id;

  // Create organization if user doesn't have one
  if (!organizationId) {
    const now = new Date().toISOString();
    const orgRef = await db.collection('organizations').add({
      name: 'Clínica Teste E2E',
      slug: 'clinica-teste-e2e',
      active: true,
      settings: {
        timezone: 'America/Sao_Paulo',
        language: 'pt-BR',
      },
      created_at: now,
      updated_at: now,
    });
    organizationId = orgRef.id;

    // Update user profile with organization_id
    await userDoc.ref.update({
      organization_id: organizationId,
      updated_at: now,
    });
    console.log(`   ✅ Created and assigned organization: ${organizationId}`);
  }

  // Set role to admin if it's pending or missing
  if (userData.role === 'pending' || !userData.role) {
    await userDoc.ref.update({
      role: 'admin',
      updated_at: new Date().toISOString(),
    });
    console.log(`   ✅ Updated user role from '${userData.role || 'missing'}' to 'admin'`);
  } else {
    console.log(`   ✅ User role is already '${userData.role}'`);
  }

  return { userId, organizationId };
}

async function seedFinancialData(db, orgId, therapistId, patients) {
  console.log(`\n💰 Seeding financial data...`);

  // Create some income transactions
  for (let i = 0; i < 5; i++) {
    const amount = [15000, 20000, 25000, 30000][Math.floor(Math.random() * 4)]; // in cents

    await db.collection('transactions').add({
      tipo: 'receita',
      descricao: `Pagamento sessão fisioterapia ${i + 1}`,
      valor: amount,
      status: 'completed',
      metadata: {
        patient_name: patients[i % patients.length].name,
        payment_method: 'pix',
      },
      organization_id: orgId,
      user_id: therapistId,
      created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  // Create some expense transactions
  for (let i = 0; i < 3; i++) {
    const expenses = [
      { desc: 'Material de escritório', valor: 5000 },
      { desc: 'Equipamento fisioterapia', valor: 15000 },
      { desc: 'Limpeza clínica', valor: 8000 },
    ];

    await db.collection('transactions').add({
      tipo: 'despesa',
      descricao: expenses[i].desc,
      valor: expenses[i].valor,
      status: 'completed',
      metadata: {},
      organization_id: orgId,
      user_id: therapistId,
      created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  console.log('   ✅ Financial data created');
}

async function seedExerciseVideos(db, orgId, therapistId) {
  console.log(`\n🎬 Seeding exercise videos...`);

  // Use placeholder URLs for video and thumbnail (tests mock video playback)
  const placeholderVideoUrl = 'https://firebasestorage.googleapis.com/v0/b/fisioflow-migration.appspot.com/o/exercise-videos%2Fplaceholder.mp4';
  const placeholderThumbnailUrl = 'https://firebasestorage.googleapis.com/v0/b/fisioflow-migration.appspot.com/o/exercise-videos%2Fthumbnails%2Fplaceholder.jpg';

  const videos = [];

  for (const videoData of EXERCISE_VIDEOS) {
    const data = {
      exercise_id: null,
      title: videoData.title,
      description: videoData.description,
      video_url: placeholderVideoUrl,
      thumbnail_url: placeholderThumbnailUrl,
      duration: videoData.duration,
      file_size: videoData.file_size,
      category: videoData.category,
      difficulty: videoData.difficulty,
      body_parts: videoData.body_parts,
      equipment: videoData.equipment,
      uploaded_by: therapistId,
      organization_id: orgId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const videoRef = await db.collection('exercise_videos').add(data);
    videos.push({ id: videoRef.id, ...data });
    console.log(`   ✅ Created video: ${videoData.title} (${videoRef.id})`);
  }

  console.log(`   ✅ Exercise videos created: ${videos.length}`);
  return videos;
}

async function main() {
  try {
    const { db, auth } = getFirebaseAdmin();
    console.log('🔥 Firebase Admin initialized');

    // Ensure test user has correct role (NOT pending) and get IDs
    const { userId: therapistId, organizationId: orgId } = await ensureUserRole(db, CONFIG.testUserEmail);
    if (!therapistId) {
      throw new Error(`User ${CONFIG.testUserEmail} not found in profiles collection`);
    }

    console.log(`🏢 Organization ID: ${orgId}`);
    console.log(`👨‍⚕️  Therapist ID: ${therapistId}`);

    // Seed patients
    const patients = await seedPatients(db, orgId, therapistId, CONFIG.patientsCount);

    // Seed appointments
    await seedAppointments(db, orgId, therapistId, patients, CONFIG.appointmentsPerPatient);

    // Seed schedule configuration
    await seedScheduleConfig(db, orgId);

    // Seed financial data
    await seedFinancialData(db, orgId, therapistId, patients);

    // Seed exercise videos
    await seedExerciseVideos(db, orgId, therapistId);

    console.log('\n✨ E2E data seeded successfully!');
    console.log(`\n📊 Summary:`);
    console.log(`   - Patients: ${CONFIG.patientsCount}`);
    console.log(`   - Appointments: ${CONFIG.patientsCount * CONFIG.appointmentsPerPatient}`);
    console.log(`   - Exercise Videos: ${EXERCISE_VIDEOS.length}`);
    console.log(`   - Organization: ${orgId}`);
    console.log(`   - Therapist: ${therapistId}`);

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error seeding E2E data:', error);
    process.exit(1);
  }
}

// Run
main();
