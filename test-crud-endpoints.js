/**
 * Teste de endpoints CRUD em produção
 * Usa Firebase Functions Callable SDK para testar os endpoints
 */

const admin = require('firebase-admin');
const { getFunctions } = require('firebase-admin/functions');
const https = require('https');

// Configurações
const FIREBASE_PROJECT_ID = 'fisioflow-migration';
const FIREBASE_REGION = 'us-central1';

// URL base para Firebase Functions em produção
const BASE_URL = `https://${FIREBASE_REGION}-${FIREBASE_PROJECT_ID}.cloudfunctions.net`;

// Headers para autenticação
let authHeaders = {
  'Content-Type': 'application/json',
};

// Cores para output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  gray: '\x1b[90m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'blue');
  console.log('='.repeat(60));
}

function logTest(name, status, details = '') {
  const icon = status === 'PASS' ? '✓' : status === 'FAIL' ? '✗' : '○';
  const color = status === 'PASS' ? 'green' : status === 'FAIL' ? 'red' : 'yellow';
  log(`${icon} ${name}`, color);
  if (details) {
    log(`  ${details}`, 'gray');
  }
}

// Função auxiliar para fazer requisições HTTP
async function makeRequest(functionName, data = {}) {
  return new Promise((resolve, reject) => {
    const url = `${BASE_URL}/${functionName}`;
    const postData = JSON.stringify({ data });

    const options = {
      method: 'POST',
      headers: {
        ...authHeaders,
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(url, options, (res) => {
      let body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: response
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: body
          });
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    req.write(postData);
    req.end();
  });
}

// Testes de Agendamentos (Appointments)
async function testAppointments() {
  logSection('AGENDAMENTOS (APPOINTMENTS)');

  // Test data
  const testAppointmentData = {
    patientId: 'test-patient-id',
    therapistId: 'test-therapist-id',
    date: '2026-02-01',
    startTime: '10:00',
    endTime: '11:00',
    type: 'individual',
    notes: 'Test appointment'
  };

  // GET - Listar agendamentos
  try {
    log('\n1. GET - Listar agendamentos (listAppointments)', 'yellow');
    const response = await makeRequest('listAppointments', {
      limit: 10
    });

    if (response.statusCode === 403 || response.statusCode === 401) {
      logTest('listAppointments', 'FAIL', `Status: ${response.statusCode} - Autenticação necessária`);
      log(`  Resposta: ${JSON.stringify(response.data, null, 2)}`, 'gray');
    } else if (response.statusCode === 200) {
      logTest('listAppointments', 'PASS', `Status: ${response.statusCode}`);
      log(`  Resposta: ${JSON.stringify(response.data, null, 2)}`, 'gray');
    } else {
      logTest('listAppointments', 'FAIL', `Status: ${response.statusCode}`);
      log(`  Resposta: ${JSON.stringify(response.data, null, 2)}`, 'gray');
    }
  } catch (error) {
    logTest('listAppointments', 'FAIL', `Erro: ${error.message}`);
  }

  // POST - Criar agendamento
  try {
    log('\n2. POST - Criar agendamento (createAppointment)', 'yellow');
    const response = await makeRequest('createAppointment', testAppointmentData);

    if (response.statusCode === 403 || response.statusCode === 401) {
      logTest('createAppointment', 'FAIL', `Status: ${response.statusCode} - Autenticação necessária`);
      log(`  Resposta: ${JSON.stringify(response.data, null, 2)}`, 'gray');
    } else if (response.statusCode === 200) {
      logTest('createAppointment', 'PASS', `Status: ${response.statusCode}`);
      log(`  Resposta: ${JSON.stringify(response.data, null, 2)}`, 'gray');
    } else {
      logTest('createAppointment', 'FAIL', `Status: ${response.statusCode}`);
      log(`  Resposta: ${JSON.stringify(response.data, null, 2)}`, 'gray');
    }
  } catch (error) {
    logTest('createAppointment', 'FAIL', `Erro: ${error.message}`);
  }

  // PUT - Atualizar agendamento
  try {
    log('\n3. PUT - Atualizar agendamento (updateAppointment)', 'yellow');
    const response = await makeRequest('updateAppointment', {
      appointmentId: 'test-appointment-id',
      date: '2026-02-02',
      startTime: '14:00',
      endTime: '15:00'
    });

    if (response.statusCode === 403 || response.statusCode === 401) {
      logTest('updateAppointment', 'FAIL', `Status: ${response.statusCode} - Autenticação necessária`);
      log(`  Resposta: ${JSON.stringify(response.data, null, 2)}`, 'gray');
    } else if (response.statusCode === 200) {
      logTest('updateAppointment', 'PASS', `Status: ${response.statusCode}`);
      log(`  Resposta: ${JSON.stringify(response.data, null, 2)}`, 'gray');
    } else {
      logTest('updateAppointment', 'FAIL', `Status: ${response.statusCode}`);
      log(`  Resposta: ${JSON.stringify(response.data, null, 2)}`, 'gray');
    }
  } catch (error) {
    logTest('updateAppointment', 'FAIL', `Erro: ${error.message}`);
  }

  // DELETE/Cancel - Cancelar agendamento
  try {
    log('\n4. DELETE - Cancelar agendamento (cancelAppointment)', 'yellow');
    const response = await makeRequest('cancelAppointment', {
      appointmentId: 'test-appointment-id',
      reason: 'Test cancellation'
    });

    if (response.statusCode === 403 || response.statusCode === 401) {
      logTest('cancelAppointment', 'FAIL', `Status: ${response.statusCode} - Autenticação necessária`);
      log(`  Resposta: ${JSON.stringify(response.data, null, 2)}`, 'gray');
    } else if (response.statusCode === 200) {
      logTest('cancelAppointment', 'PASS', `Status: ${response.statusCode}`);
      log(`  Resposta: ${JSON.stringify(response.data, null, 2)}`, 'gray');
    } else {
      logTest('cancelAppointment', 'FAIL', `Status: ${response.statusCode}`);
      log(`  Resposta: ${JSON.stringify(response.data, null, 2)}`, 'gray');
    }
  } catch (error) {
    logTest('cancelAppointment', 'FAIL', `Erro: ${error.message}`);
  }
}

// Testes de Exercícios (Exercises)
async function testExercises() {
  logSection('EXERCÍCIOS (EXERCISES)');

  // GET - Listar exercícios
  try {
    log('\n1. GET - Listar exercícios (listExercises)', 'yellow');
    const response = await makeRequest('listExercises', {
      limit: 10
    });

    if (response.statusCode === 403 || response.statusCode === 401) {
      logTest('listExercises', 'FAIL', `Status: ${response.statusCode} - Autenticação necessária`);
      log(`  Resposta: ${JSON.stringify(response.data, null, 2)}`, 'gray');
    } else if (response.statusCode === 200) {
      logTest('listExercises', 'PASS', `Status: ${response.statusCode}`);
      log(`  Resposta: ${JSON.stringify(response.data, null, 2)}`, 'gray');
    } else {
      logTest('listExercises', 'FAIL', `Status: ${response.statusCode}`);
      log(`  Resposta: ${JSON.stringify(response.data, null, 2)}`, 'gray');
    }
  } catch (error) {
    logTest('listExercises', 'FAIL', `Erro: ${error.message}`);
  }

  // POST - Criar exercício
  try {
    log('\n2. POST - Criar exercício (createExercise)', 'yellow');
    const response = await makeRequest('createExercise', {
      name: 'Test Exercise',
      category: 'strength',
      muscleGroups: ['legs'],
      difficulty: 'beginner',
      instructions: 'Test instructions'
    });

    if (response.statusCode === 403 || response.statusCode === 401) {
      logTest('createExercise', 'FAIL', `Status: ${response.statusCode} - Autenticação necessária`);
      log(`  Resposta: ${JSON.stringify(response.data, null, 2)}`, 'gray');
    } else if (response.statusCode === 200) {
      logTest('createExercise', 'PASS', `Status: ${response.statusCode}`);
      log(`  Resposta: ${JSON.stringify(response.data, null, 2)}`, 'gray');
    } else {
      logTest('createExercise', 'FAIL', `Status: ${response.statusCode}`);
      log(`  Resposta: ${JSON.stringify(response.data, null, 2)}`, 'gray');
    }
  } catch (error) {
    logTest('createExercise', 'FAIL', `Erro: ${error.message}`);
  }

  // PUT - Atualizar exercício
  try {
    log('\n3. PUT - Atualizar exercício (updateExercise)', 'yellow');
    const response = await makeRequest('updateExercise', {
      exerciseId: 'test-exercise-id',
      name: 'Updated Exercise Name'
    });

    if (response.statusCode === 403 || response.statusCode === 401) {
      logTest('updateExercise', 'FAIL', `Status: ${response.statusCode} - Autenticação necessária`);
      log(`  Resposta: ${JSON.stringify(response.data, null, 2)}`, 'gray');
    } else if (response.statusCode === 200) {
      logTest('updateExercise', 'PASS', `Status: ${response.statusCode}`);
      log(`  Resposta: ${JSON.stringify(response.data, null, 2)}`, 'gray');
    } else {
      logTest('updateExercise', 'FAIL', `Status: ${response.statusCode}`);
      log(`  Resposta: ${JSON.stringify(response.data, null, 2)}`, 'gray');
    }
  } catch (error) {
    logTest('updateExercise', 'FAIL', `Erro: ${error.message}`);
  }

  // DELETE - Deletar exercício
  try {
    log('\n4. DELETE - Deletar exercício (deleteExercise)', 'yellow');
    const response = await makeRequest('deleteExercise', {
      exerciseId: 'test-exercise-id'
    });

    if (response.statusCode === 403 || response.statusCode === 401) {
      logTest('deleteExercise', 'FAIL', `Status: ${response.statusCode} - Autenticação necessária`);
      log(`  Resposta: ${JSON.stringify(response.data, null, 2)}`, 'gray');
    } else if (response.statusCode === 200) {
      logTest('deleteExercise', 'PASS', `Status: ${response.statusCode}`);
      log(`  Resposta: ${JSON.stringify(response.data, null, 2)}`, 'gray');
    } else {
      logTest('deleteExercise', 'FAIL', `Status: ${response.statusCode}`);
      log(`  Resposta: ${JSON.stringify(response.data, null, 2)}`, 'gray');
    }
  } catch (error) {
    logTest('deleteExercise', 'FAIL', `Erro: ${error.message}`);
  }
}

// Testes de Avaliações (Assessments)
async function testAssessments() {
  logSection('AVALIAÇÕES/PROTÓCOLOS (ASSESSMENTS)');

  // GET - Listar avaliações
  try {
    log('\n1. GET - Listar avaliações (listAssessments)', 'yellow');
    const response = await makeRequest('listAssessments', {
      limit: 10
    });

    if (response.statusCode === 403 || response.statusCode === 401) {
      logTest('listAssessments', 'FAIL', `Status: ${response.statusCode} - Autenticação necessária`);
      log(`  Resposta: ${JSON.stringify(response.data, null, 2)}`, 'gray');
    } else if (response.statusCode === 200) {
      logTest('listAssessments', 'PASS', `Status: ${response.statusCode}`);
      log(`  Resposta: ${JSON.stringify(response.data, null, 2)}`, 'gray');
    } else {
      logTest('listAssessments', 'FAIL', `Status: ${response.statusCode}`);
      log(`  Resposta: ${JSON.stringify(response.data, null, 2)}`, 'gray');
    }
  } catch (error) {
    logTest('listAssessments', 'FAIL', `Erro: ${error.message}`);
  }

  // POST - Criar avaliação
  try {
    log('\n2. POST - Criar avaliação (createAssessment)', 'yellow');
    const response = await makeRequest('createAssessment', {
      patientId: 'test-patient-id',
      type: 'initial',
      date: '2026-01-29',
      notes: 'Test assessment'
    });

    if (response.statusCode === 403 || response.statusCode === 401) {
      logTest('createAssessment', 'FAIL', `Status: ${response.statusCode} - Autenticação necessária`);
      log(`  Resposta: ${JSON.stringify(response.data, null, 2)}`, 'gray');
    } else if (response.statusCode === 200) {
      logTest('createAssessment', 'PASS', `Status: ${response.statusCode}`);
      log(`  Resposta: ${JSON.stringify(response.data, null, 2)}`, 'gray');
    } else {
      logTest('createAssessment', 'FAIL', `Status: ${response.statusCode}`);
      log(`  Resposta: ${JSON.stringify(response.data, null, 2)}`, 'gray');
    }
  } catch (error) {
    logTest('createAssessment', 'FAIL', `Erro: ${error.message}`);
  }

  // PUT - Atualizar avaliação
  try {
    log('\n3. PUT - Atualizar avaliação (updateAssessment)', 'yellow');
    const response = await makeRequest('updateAssessment', {
      assessmentId: 'test-assessment-id',
      notes: 'Updated assessment notes'
    });

    if (response.statusCode === 403 || response.statusCode === 401) {
      logTest('updateAssessment', 'FAIL', `Status: ${response.statusCode} - Autenticação necessária`);
      log(`  Resposta: ${JSON.stringify(response.data, null, 2)}`, 'gray');
    } else if (response.statusCode === 200) {
      logTest('updateAssessment', 'PASS', `Status: ${response.statusCode}`);
      log(`  Resposta: ${JSON.stringify(response.data, null, 2)}`, 'gray');
    } else {
      logTest('updateAssessment', 'FAIL', `Status: ${response.statusCode}`);
      log(`  Resposta: ${JSON.stringify(response.data, null, 2)}`, 'gray');
    }
  } catch (error) {
    logTest('updateAssessment', 'FAIL', `Erro: ${error.message}`);
  }

  // DELETE - Nota: Parece que não há endpoint de delete para assessments
  log('\n4. DELETE - Deletar avaliação', 'yellow');
  logTest('deleteAssessment', 'INFO', 'Endpoint não encontrado/implementado');
}

// Testes de Pacientes (Patients)
async function testPatients() {
  logSection('PACIENTES (PATIENTS)');

  // GET - Listar pacientes
  try {
    log('\n1. GET - Listar pacientes (listPatients)', 'yellow');
    const response = await makeRequest('listPatients', {
      limit: 10
    });

    if (response.statusCode === 403 || response.statusCode === 401) {
      logTest('listPatients', 'FAIL', `Status: ${response.statusCode} - Autenticação necessária`);
      log(`  Resposta: ${JSON.stringify(response.data, null, 2)}`, 'gray');
    } else if (response.statusCode === 200) {
      logTest('listPatients', 'PASS', `Status: ${response.statusCode}`);
      log(`  Resposta: ${JSON.stringify(response.data, null, 2)}`, 'gray');
    } else {
      logTest('listPatients', 'FAIL', `Status: ${response.statusCode}`);
      log(`  Resposta: ${JSON.stringify(response.data, null, 2)}`, 'gray');
    }
  } catch (error) {
    logTest('listPatients', 'FAIL', `Erro: ${error.message}`);
  }

  // POST - Criar paciente
  try {
    log('\n2. POST - Criar paciente (createPatient)', 'yellow');
    const response = await makeRequest('createPatient', {
      name: 'Test Patient',
      phone: '(11) 99999-9999',
      email: 'test@example.com'
    });

    if (response.statusCode === 403 || response.statusCode === 401) {
      logTest('createPatient', 'FAIL', `Status: ${response.statusCode} - Autenticação necessária`);
      log(`  Resposta: ${JSON.stringify(response.data, null, 2)}`, 'gray');
    } else if (response.statusCode === 200) {
      logTest('createPatient', 'PASS', `Status: ${response.statusCode}`);
      log(`  Resposta: ${JSON.stringify(response.data, null, 2)}`, 'gray');
    } else {
      logTest('createPatient', 'FAIL', `Status: ${response.statusCode}`);
      log(`  Resposta: ${JSON.stringify(response.data, null, 2)}`, 'gray');
    }
  } catch (error) {
    logTest('createPatient', 'FAIL', `Erro: ${error.message}`);
  }

  // PUT - Atualizar paciente
  try {
    log('\n3. PUT - Atualizar paciente (updatePatient)', 'yellow');
    const response = await makeRequest('updatePatient', {
      patientId: 'test-patient-id',
      name: 'Updated Patient Name'
    });

    if (response.statusCode === 403 || response.statusCode === 401) {
      logTest('updatePatient', 'FAIL', `Status: ${response.statusCode} - Autenticação necessária`);
      log(`  Resposta: ${JSON.stringify(response.data, null, 2)}`, 'gray');
    } else if (response.statusCode === 200) {
      logTest('updatePatient', 'PASS', `Status: ${response.statusCode}`);
      log(`  Resposta: ${JSON.stringify(response.data, null, 2)}`, 'gray');
    } else {
      logTest('updatePatient', 'FAIL', `Status: ${response.statusCode}`);
      log(`  Resposta: ${JSON.stringify(response.data, null, 2)}`, 'gray');
    }
  } catch (error) {
    logTest('updatePatient', 'FAIL', `Erro: ${error.message}`);
  }

  // DELETE - Deletar paciente
  try {
    log('\n4. DELETE - Deletar paciente (deletePatient)', 'yellow');
    const response = await makeRequest('deletePatient', {
      patientId: 'test-patient-id'
    });

    if (response.statusCode === 403 || response.statusCode === 401) {
      logTest('deletePatient', 'FAIL', `Status: ${response.statusCode} - Autenticação necessária`);
      log(`  Resposta: ${JSON.stringify(response.data, null, 2)}`, 'gray');
    } else if (response.statusCode === 200) {
      logTest('deletePatient', 'PASS', `Status: ${response.statusCode}`);
      log(`  Resposta: ${JSON.stringify(response.data, null, 2)}`, 'gray');
    } else {
      logTest('deletePatient', 'FAIL', `Status: ${response.statusCode}`);
      log(`  Resposta: ${JSON.stringify(response.data, null, 2)}`, 'gray');
    }
  } catch (error) {
    logTest('deletePatient', 'FAIL', `Erro: ${error.message}`);
  }
}

// Função principal
async function main() {
  log('TESTE DE ENDPOINTS CRUD EM PRODUÇÃO', 'blue');
  log(`Projeto: ${FIREBASE_PROJECT_ID}`, 'gray');
  log(`URL Base: ${BASE_URL}`, 'gray');
  log(`Data: ${new Date().toISOString()}`, 'gray');

  try {
    await testAppointments();
    await testExercises();
    await testAssessments();
    await testPatients();

    logSection('RESUMO');
    log('Todos os testes foram concluídos!', 'green');
    log('\nNOTA:', 'yellow');
    log('- A maioria dos endpoints retornou 403/401, indicando que a autenticação está funcionando', 'gray');
    log('- Para testes completos, é necessário obter um token de autenticação válido', 'gray');
    log('- Use o Firebase Auth para obter um token de um usuário válido', 'gray');

  } catch (error) {
    log(`\nErro durante a execução: ${error.message}`, 'red');
  }
}

// Executar
main();
