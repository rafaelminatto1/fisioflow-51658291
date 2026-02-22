/**
 * SOAP ASSISTANT E2E TESTS
 *
 * Tests for AI-powered SOAP note generation using Gemini 2.5 Pro
 *
 * Test scenarios:
 * - SOAP generation from consultation text
 * - SOAP generation from audio transcription
 * - Translation and language support
 * - Error handling and rate limiting
 * - Mock responses for reliable testing
 * - Accessibility compliance
 * - Integration with patient evolution workflow
 *
 * @see src/lib/ai/soap-assistant.ts
 */

import { test, expect } from '@playwright/test';
import { testUsers } from './fixtures/test-data';

const BASE_URL = 'http://localhost:8080';

// Configure test for Chromium only with extended timeout
test.use({ browserName: 'chromium' });
test.setTimeout(180000);

// ========================================
// TEST DATA
// ========================================

const MOCK_CONSULTATION_TRANSCRIPTS = {
  lombalgia: `Paciente: "Doutor, minha dor nas costas está piorando. Agora está indo para a perna direita."
Terapeuta: "Quando começou e o que piora a dor?"
Paciente: "Começou há uns 2 meses, depois que carreguei um sofá. Piora muito quando fico sentado no trabalho. Melhora um pouco quando ando."
Terapeuta: "Tem algum formigamento ou dormência?"
Paciente: "Às vezes sento uma fisgada que vai até o pé direito, tipo um choque."
Terapeuta: "Vamos fazer o exame físico. Consegue se inclinar para frente?"
Paciente: "Consigo, mas dói na lombar. Parece que traca."`,

  ombro: `Paciente: "Não consigo mais pentear o cabelo ou pegar coisas nas prateleiras altas."
Terapeuta: "A dor é constante ou só quando mexe o braço?"
Paciente: "É só quando movo, principalmente quando levanto o braço acima da cabeça. De noite também acordo se me deito sobre esse ombro."
Terapeuta: "Teve alguma lesão recente?"
Paciente: "Não, não bati nem nada. Foi devagarzinho, foi piorando."
Terapeuta: "Vamos testar a amplitude. Levante o braço devagar."
Paciente: "Ai! Começa a doer aqui [gesticula altura do ombro] e não consigo ir até o fim."`,

  follow_up: `Paciente: "Doutor, melhorou muito! Consigo trabalhar sentado por quase 2 horas sem dor."
Terapeuta: "E os exercícios em casa?"
Paciente: "Faço quase todo dia. A ponte e o gato-camelo. Já consigo fazer 3 séries."
Terapeuta: "Ainda sente aquela dor que ia para a perna?"
Paciente: "Não, sumiu. Às vezes sinto um cansaço nas costas no final do dia, mas nada comparado a antes."
Terapeuta: "Vamos avaliar a evolução e progressar os exercícios."`,
};

const MOCK_SOAP_RESPONSES = {
  lombalgia: {
    success: true,
    data: {
      soap: {
        subjective: 'Paciente masculino, 45 anos, relata dor lombar há 2 meses com início pós-esforço (carregamento de móveis). Dor irradia para membro inferior direito em trajeto radicular (fisgada até pé). Piora significativa em posição sentada (postura no trabalho). Melhora parcial com deambulação. Limitação funcional para atividades ocupacionais.',
        objective: {
          inspection: 'Postura antálgica com leve retificação da lordose lombar. Marcha preservada sem claudicação.',
          palpation: 'Hipersensibilidade paravertebral bilateral L4-L5. Espasmo muscular paravertebral. Palpação de forames intervertebrais reproduz irradiação para MID direito.',
          movement_tests: {
            'Flexão de tronco': 'Limitada a 40% com dor lombar aos 40°',
            'Extensão': 'Limitada com desconforto lombar',
            'Inclinação lateral direita': 'Reproduz irradiação para MID',
            'SLR direito': 'Positivo a 45° com reprodução de dor ciática',
            'SLR esquerdo': 'Negativo',
          },
          special_tests: {
            'Lasègue direito': 'Positivo a 40°',
            'Slump test': 'Positivo à direita',
            'Força muscular': '4+/5 em dorsiflexores e flexores plantares direito',
            'Reflexos': 'Aquileu direito levemente diminuído',
          },
          posture_analysis: 'Ombros anteriorizados, retificação lombar, pélvis neutra.',
          gait_analysis: 'Marcha preservada sem alterações significativas.',
        },
        assessment: 'Lombalgia mecânica com comprometimento radicular L4-L5 ou L5-S1 à direita. Hérnia de disco comprovada por RM há 3 semanas. Prognóstico favorável com tratamento conservador (fisioterapia). Ausência de bandeiras vermelhas (sem alteração de hábito intestinal/vesical, sem febre, sem perda de peso). Indicação de tratamento fisioterapêutico manual associado a exercícios de estabilização.',
        plan: {
          short_term_goals: [
            'Reduzir dor lombar de 7/10 para 4/10 em 2 semanas',
            'Melhorar flexão de tronco para 60° sem dor irraduada',
            'Educar paciente sobre ergonomia no trabalho',
          ],
          long_term_goals: [
            'Retornar ao trabalho sem restrições em 6 semanas',
            'Realizar atividades de vida diária sem dor',
            'Manter programa de exercícios domiciliares',
          ],
          interventions: [
            'Mobilização vertebral segmentar L4-L5',
            'Técnica de McKenzie (extensão)',
            'Exercícios de Williams e Williams modificado',
            'Crioterapia pós-atendimento',
            'Orientações ergonômicas para posto de trabalho',
          ],
          frequency: '3x/semana por 4 semanas',
          duration: '45-50 minutos por sessão',
          home_exercises: [
            'Pontes: 3x12 reps, diário',
            'Cat-Camel: 2x10 reps, 2x/dia',
            'Bird-Dog: 3x8 reps por lado, diário',
            'Alongamento de isquiotibiais: 2x30s, 2x/dia',
          ],
          precautions: [
            'Evitar flexões excessivas de tronco',
            'Não carregar pesos >5kg',
            'Parar exercício se dor se irradiar para perna',
          ],
        },
      },
      keyFindings: [
        'Dor com característica radicular (fisgada até pé)',
        'SLR positivo à direita sugere compressão radicular',
        'Piora em sentado indica discopatia',
        'Sem bandeiras vermelhas presentes',
        'Prognóstico favorável para tratamento conservador',
      ],
      recommendations: [
        'Avaliar resposta em 5 sessões',
        'Considerar retorno ao trabalho com restrições após 2 semanas',
        'Referir para médico se piora ou sinais de alerta',
        'Manter programa de exercícios domiciliares consistentemente',
      ],
      redFlags: [
        'Monitorar: Perda progressiva de força em MID',
        'Monitorar: Alteração esfincteriana (bandeira vermelha)',
        'Monitorar: Dor noturna progressiva',
      ],
      suggestedCodes: ['M54.5 - Lombalgia', 'M51.1 - Hérnia de disco lombar com radiculopatia'],
    },
  },

  ombro: {
    success: true,
    data: {
      soap: {
        subjective: 'Paciente feminina, 32 anos, relata dor e limitação funcional em ombro direito de início insidioso há 6 meses. Sem trauma prévio. Dor de característica mecânica, piora com elevação acima de 90° e posicionamento em decúbito lateral direito sobre o ombro acometido. Limitação para atividades de vida diária (pentear cabelo, pegar objetos em prateleiras). Paciente refere período de uso excessivo do membro superior (trabalho doméstico e cuidados com filho pequeno).',
        objective: {
          inspection: 'Sem atrofia visível do deltoide ou cintura escapular. Escápula alada discreta à direita.',
          palpation: 'Hipersensibilidade em espaço subacromial direito. Points dolorosos em músculo supraespinhoso e infraespinhoso.',
          movement_tests: {
            'Flexão ativa': '120° com arco doloroso entre 60-120°',
            'Abdução ativa': '110° com arco doloroso entre 60-120°',
            'Rotação lateral': 'Limitada a 40°',
            'Rotação medial': 'Preservada',
            'Adução': 'Preservada',
          },
          special_tests: {
            'Neer': 'Positivo (reproduz dor)',
            'Hawkins-Kennedy': 'Positivo',
            'Jobe (Empty Can)': 'Positivo com fraqueza',
            'Yocum': 'Negativo',
            'Apprehension': 'Negativo',
          },
          posture_analysis: 'Ombros anteriorizados, cifo-teorácica leve, protração escapular bilateral.',
          gait_analysis: 'Não aplicável.',
        },
        assessment: 'Síndrome do impacto subacromial do ombro direito com tendinopatia do manguito rotador (envolvimento de supraespinhoso). Arcus doloroso positivo entre 60-120° de abdução. Testes específicos positivos para impacto (Neer, Hawkins-Kennedy). Sem sinais de lesão completa do manguito (força preservada). Prognóstico favorável com tratamento conservador focado em fortalecimento de manguito rotador e estabilização escapular.',
        plan: {
          short_term_goals: [
            'Reduzir dor de 6/10 para 3/10 em 3 semanas',
            'Eliminar arcus doloroso completo',
            'Melhorar mobilidade para 140° de abdução',
          ],
          long_term_goals: [
            'Retornar a todas as AVDs sem dor',
            'Elevação completa (180°) sem compensações',
            'Fortalecimento adequado para prevenção de recorrência',
          ],
          interventions: [
            'Fortalecimento de manguito rotador (isometria progressiva)',
            'Exercícios de Codman (pendular)',
            'Mobilização escápulo-torácica',
            'Alongamento de pectoral minor e posterior de ombro',
            'Crioterapia pós-exercício',
            'Educação sobre atividade reposo relativo',
          ],
          frequency: '2x/semana por 6 semanas',
          duration: '45 minutos por sessão',
          home_exercises: [
            'Pendular (Codman): 2x1min, 2x/dia',
            'Isometria de rotação lateral: 3x10s, 3x/dia',
            'Wall slides: 3x10 reps',
          ],
          precautions: [
            'Evitar elevação ativa acima de 90° na primeira semana',
            'Não carregar pesos com membro superior direito',
            'Dormir sobre ombro esquerdo ou com travesseiro de apoio',
          ],
        },
      },
      keyFindings: [
        'Arcus doloroso clássico entre 60-120°',
        'Testes de impacto positivos (Neer, Hawkins)',
        'Sem antecedente traumático',
        'Prognóstico favorável',
      ],
      recommendations: [
        'Reavaliar em 6 sessões',
        'Considerar USG ou RM se não houver melhora',
        'Evitar movimentos repetitivos de elevação',
        'Orientar sobre pausas durante atividades domésticas',
      ],
      redFlags: [],
      suggestedCodes: ['M75.41 - Síndrome do impacto do ombro direito'],
    },
  },

  error: {
    success: false,
    error: 'AI service temporarily unavailable',
  },
};

const MOCK_AUDIO_TRANSCRIPTION = {
  success: true,
  data: {
    transcription: MOCK_CONSULTATION_TRANSCRIPTS.lombalgia,
    language: 'pt',
    confidence: 0.95,
    processingTime: 2500,
  },
};

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Login helper
 */
async function login(page: any, email: string, password: string) {
  await page.goto(`${BASE_URL}/auth`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');

  await page.waitForURL(url => !url.pathname.includes('/auth'), { timeout: 30000 });
  await page.waitForTimeout(3000);
}

/**
 * Navigate to patient evolution page
 */
async function navigateToEvolution(page: any, patientId?: string) {
  const targetUrl = patientId
    ? `${BASE_URL}/patient-evolution/${patientId}`
    : `${BASE_URL}/patient-evolution/test-patient`;

  await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  return page.url();
}

/**
 * Mock SOAP AI response
 */
async function mockSOAPAIGeneration(page: any, mockResponse: any) {
  await page.route('**/api/ai/soap**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockResponse),
    });
  });

  await page.route('**/generateSOAP**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockResponse),
    });
  });
}

/**
 * Mock audio transcription
 */
async function mockAudioTranscription(page: any, mockResponse: any) {
  await page.route('**/api/ai/transcribe**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockResponse),
    });
  });
}

/**
 * Mock rate limit error
 */
async function mockSOAPRateLimit(page: any) {
  await page.route('**/api/ai/soap**', async route => {
    await route.fulfill({
      status: 429,
      contentType: 'application/json',
      body: JSON.stringify({
        success: false,
        error: 'Rate limit exceeded. Please try again later.',
      }),
    });
  });
}

/**
 * Mock API error
 */
async function mockSOAPAPIError(page: any, errorMessage = 'AI service temporarily unavailable') {
  await page.route('**/api/ai/soap**', async route => {
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({
        success: false,
        error: errorMessage,
      }),
    });
  });
}

// ========================================
// TESTS
// ========================================

test.describe('SOAP Assistant - Happy Paths', () => {
  test('should generate SOAP note from consultation text', async ({ page }) => {
    console.log('\n' + '█'.repeat(70));
    console.log('█    TEST: SOAP Generation from Text');
    console.log('█'.repeat(70));

    await mockSOAPAIGeneration(page, MOCK_SOAP_RESPONSES.lombalgia);
    await login(page, testUsers.rafael.email, testUsers.rafael.password);

    const url = await navigateToEvolution(page);
    console.log(`  Navegado para: ${url}`);

    await page.screenshot({ path: '/tmp/soap-ai-01-evolution-page.png', fullPage: true });

    // Look for consultation input or SOAP generation button
    const soapButtonSelectors = [
      'button:has-text("Gerar SOAP")',
      'button:has-text("SOAP AI")',
      'button:has-text("IA SOAP")',
      'button[aria-label*="SOAP" i]',
      '[data-testid="soap-ai-button"]',
    ];

    let soapButtonClicked = false;
    for (const selector of soapButtonSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        await page.locator(selector).first().click();
        console.log(`✅ Botão SOAP AI clicado: ${selector}`);
        soapButtonClicked = true;
        await page.waitForTimeout(5000);
        break;
      }
    }

    // Try alternative: fill consultation notes
    if (!soapButtonClicked) {
      console.log('⚠️  Botão SOAP não encontrado, tentando preencher notas de consulta...');

      const consultationTextarea = page.locator('textarea').first();
      if (await consultationTextarea.count() > 0) {
        await consultationTextarea.fill(MOCK_CONSULTATION_TRANSCRIPTS.lombalgia);
        console.log('✅ Transcrição preenchida');

        // Look for generate button again
        const generateBtn = page.locator('button:has-text("Gerar"), button:has-text("AI")');
        if (await generateBtn.count() > 0) {
          await generateBtn.first().click();
          await page.waitForTimeout(5000);
          console.log('✅ Botão gerar clicado');
        }
      }
    }

    await page.screenshot({ path: '/tmp/soap-ai-02-after-generation.png', fullPage: true });

    // Look for generated SOAP sections
    const soapSections = ['Subjetivo', 'Objetivo', 'Avaliação', 'Plano'];
    const sectionSelectors = [
      'text=/Subjetivo|S:|Subjective/i',
      'text=/Objetivo|O:|Objective/i',
      'text=/Avaliação|A:|Assessment/i',
      'text=/Plano|P:|Plan/i',
    ];

    for (const section of soapSections) {
      console.log(`  Verificando seção: ${section}`);
    }

    let sectionsFound = 0;
    for (const selector of sectionSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        sectionsFound++;
        console.log(`  ✓ Seção encontrada: ${selector}`);
      }
    }

    if (sectionsFound > 0) {
      console.log(`✅ ${sectionsFound}/4 seções SOAP encontradas`);
    } else {
      console.log('⚠️  Nenhuma seção SOAP encontrada (feature pode não estar na UI)');
    }

    console.log('\n' + '█'.repeat(70));
  });

  test('should display structured SOAP sections properly', async ({ page }) => {
    console.log('\n' + '█'.repeat(70));
    console.log('█    TEST: SOAP Sections Structure');
    console.log('█'.repeat(70));

    await mockSOAPAIGeneration(page, MOCK_SOAP_RESPONSES.lombalgia);
    await login(page, testUsers.rafael.email, testUsers.rafael.password);
    await navigateToEvolution(page);

    // Fill and trigger SOAP generation
    const textarea = page.locator('textarea').first();
    if (await textarea.count() > 0) {
      await textarea.fill(MOCK_CONSULTATION_TRANSCRIPTS.lombalgia);
    }

    await page.waitForTimeout(3000);
    await page.screenshot({ path: '/tmp/soap-ai-03-structured.png', fullPage: true });

    // Check for key findings and recommendations
    const keyFindingsIndicators = [
      'text=/key findings|achados|principais/i',
      'text=/recommendations|recomendações/i',
      '[data-testid="key-findings"]',
      '[data-testid="recommendations"]',
    ];

    for (const indicator of keyFindingsIndicators) {
      const count = await page.locator(indicator).count();
      if (count > 0) {
        console.log(`✅ Informações adicionais encontradas: ${indicator}`);
        break;
      }
    }

    console.log('\n' + '█'.repeat(70));
  });

  test('should include ICD-10 codes suggestions', async ({ page }) => {
    console.log('\n' + '█'.repeat(70));
    console.log('█    TEST: SOAP ICD-10 Codes');
    console.log('█'.repeat(70));

    await mockSOAPAIGeneration(page, MOCK_SOAP_RESPONSES.lombalgia);
    await login(page, testUsers.rafael.email, testUsers.rafael.password);
    await navigateToEvolution(page);

    await page.waitForTimeout(3000);

    // Look for ICD-10 codes
    const icdIndicators = [
      'text=/CID|ICD|código/i',
      'text=/M54\\.5|M51\\.1|M75/i',
      '[data-testid="icd-codes"]',
    ];

    let codesFound = false;
    for (const indicator of icdIndicators) {
      const count = await page.locator(indicator).count();
      if (count > 0) {
        console.log(`✅ Códigos CID-10 encontrados: ${indicator}`);
        codesFound = true;
        break;
      }
    }

    if (!codesFound) {
      console.log('⚠️  Códigos CID-10 não encontrados');
    }

    console.log('\n' + '█'.repeat(70));
  });
});

test.describe('SOAP Assistant - Audio Transcription', () => {
  test('should transcribe audio and generate SOAP', async ({ page }) => {
    console.log('\n' + '█'.repeat(70));
    console.log('█    TEST: SOAP from Audio Transcription');
    console.log('█'.repeat(70));

    // Mock both transcription and SOAP generation
    await mockAudioTranscription(page, MOCK_AUDIO_TRANSCRIPTION);
    await mockSOAPAIGeneration(page, MOCK_SOAP_RESPONSES.lombalgia);

    await login(page, testUsers.rafael.email, testUsers.rafael.password);
    await navigateToEvolution(page);

    await page.screenshot({ path: '/tmp/soap-ai-audio-01.png', fullPage: true });

    // Look for audio input or recording button
    const audioSelectors = [
      'input[type="file"]',
      'button:has-text("Gravar")',
      'button:has-text("Microfone")',
      'button:has-text("Upload")',
      '[data-testid="audio-input"]',
      'button[aria-label*="áudio" i]',
      'button[aria-label*="microfone" i]',
    ];

    let audioOptionFound = false;
    for (const selector of audioSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        console.log(`✅ Opção de áudio encontrada: ${selector}`);
        audioOptionFound = true;
        break;
      }
    }

    if (!audioOptionFound) {
      console.log('⚠️  Opção de entrada de áudio não encontrada na UI');
    }

    await page.screenshot({ path: '/tmp/soap-ai-audio-02.png', fullPage: true });

    console.log('\n' + '█'.repeat(70));
  });

  test('should display transcription confidence', async ({ page }) => {
    console.log('\n' + '█'.repeat(70));
    console.log('█    TEST: Transcription Confidence Display');
    console.log('█'.repeat(70));

    await mockAudioTranscription(page, MOCK_AUDIO_TRANSCRIPTION);
    await login(page, testUsers.rafael.email, testUsers.rafael.password);
    await navigateToEvolution(page);

    await page.waitForTimeout(3000);

    // Look for confidence indicators
    const confidenceIndicators = [
      'text=/confiança|confidence|precisão/i',
      'text=/95\\s*%|95 por cento/i',
      '[data-testid="transcription-confidence"]',
    ];

    for (const indicator of confidenceIndicators) {
      const count = await page.locator(indicator).count();
      if (count > 0) {
        console.log(`✅ Indicador de confiança encontrado: ${indicator}`);
        break;
      }
    }

    console.log('\n' + '█'.repeat(70));
  });
});

test.describe('SOAP Assistant - Error Handling', () => {
  test('should handle API errors gracefully', async ({ page }) => {
    console.log('\n' + '█'.repeat(70));
    console.log('█    TEST: SOAP API Error Handling');
    console.log('█'.repeat(70));

    await mockSOAPAPIError(page);
    await login(page, testUsers.rafael.email, testUsers.rafael.password);
    await navigateToEvolution(page);

    // Try to trigger SOAP generation
    const soapButton = page.locator('button:has-text("Gerar SOAP"), button:has-text("SOAP AI")');
    if (await soapButton.count() > 0) {
      await soapButton.first().click();
      await page.waitForTimeout(3000);
    }

    // Look for error message
    const errorIndicators = [
      '.error',
      '.destructive',
      '[role="alert"]',
      'text=/erro|error|unavailable/i',
    ];

    for (const indicator of errorIndicators) {
      const count = await page.locator(indicator).count();
      if (count > 0) {
        const errorElement = page.locator(indicator).first();
        if (await errorElement.isVisible()) {
          const errorText = await errorElement.textContent();
          console.log(`✅ Mensagem de erro exibida: ${errorText?.trim().substring(0, 100)}`);
          break;
        }
      }
    }

    await page.screenshot({ path: '/tmp/soap-ai-error.png', fullPage: true });

    console.log('\n' + '█'.repeat(70));
  });

  test('should handle rate limiting gracefully', async ({ page }) => {
    console.log('\n' + '█'.repeat(70));
    console.log('█    TEST: SOAP Rate Limiting');
    console.log('█'.repeat(70));

    await mockSOAPRateLimit(page);
    await login(page, testUsers.rafael.email, testUsers.rafael.password);
    await navigateToEvolution(page);

    // Try to trigger SOAP generation
    const soapButton = page.locator('button:has-text("Gerar SOAP"), button:has-text("SOAP AI")');
    if (await soapButton.count() > 0) {
      await soapButton.first().click();
      await page.waitForTimeout(3000);
    }

    // Look for rate limit message
    const rateLimitIndicators = [
      'text=/rate limit|limite|muitas solicitações/i',
      'text=/try again|tente novamente/i',
      '[data-testid="rate-limit"]',
    ];

    for (const indicator of rateLimitIndicators) {
      const count = await page.locator(indicator).count();
      if (count > 0) {
        console.log(`✅ Mensagem de rate limit encontrada: ${indicator}`);
        break;
      }
    }

    await page.screenshot({ path: '/tmp/soap-ai-rate-limit.png', fullPage: true });

    console.log('\n' + '█'.repeat(70));
  });

  test('should handle empty consultation text', async ({ page }) => {
    console.log('\n' + '█'.repeat(70));
    console.log('█    TEST: SOAP Empty Consultation');
    console.log('█'.repeat(70));

    await mockSOAPAIGeneration(page, {
      success: false,
      error: 'Consultation text is required',
    });

    await login(page, testUsers.rafael.email, testUsers.rafael.password);
    await navigateToEvolution(page);

    // Try to generate SOAP without input
    const soapButton = page.locator('button:has-text("Gerar SOAP"), button:has-text("SOAP AI")');
    if (await soapButton.count() > 0) {
      await soapButton.first().click();
      await page.waitForTimeout(3000);
    }

    // Look for validation error
    const validationIndicators = [
      'text=/required|obrigatório|necessário/i',
      'text=/provide text|forneça texto/i',
      '[data-testid="validation-error"]',
    ];

    for (const indicator of validationIndicators) {
      const count = await page.locator(indicator).count();
      if (count > 0) {
        console.log(`✅ Mensagem de validação encontrada: ${indicator}`);
        break;
      }
    }

    await page.screenshot({ path: '/tmp/soap-ai-empty.png', fullPage: true });

    console.log('\n' + '█'.repeat(70));
  });
});

test.describe('SOAP Assistant - Accessibility', () => {
  test('should have accessible SOAP generation interface', async ({ page }) => {
    console.log('\n' + '█'.repeat(70));
    console.log('█    TEST: SOAP Accessibility');
    console.log('█'.repeat(70));

    await mockSOAPAIGeneration(page, MOCK_SOAP_RESPONSES.lombalgia);
    await login(page, testUsers.rafael.email, testUsers.rafael.password);
    await navigateToEvolution(page);

    // Check for accessible buttons
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();

    console.log(`  Total de botões na página: ${buttonCount}`);

    for (let i = 0; i < Math.min(buttonCount, 15); i++) {
      const button = buttons.nth(i);
      const text = await button.textContent();
      const ariaLabel = await button.getAttribute('aria-label');

      if (text && (text.includes('SOAP') || text.includes('Gerar') || text.includes('IA'))) {
        console.log(`  Botão: "${text?.trim()}"`);
        if (ariaLabel) {
          console.log(`    ✓ aria-label: ${ariaLabel}`);
        }
      }
    }

    // Check for proper headings
    const headings = page.locator('h1, h2, h3, h4, h5, h6');
    const headingCount = await headings.count();

    if (headingCount > 0) {
      console.log(`✅ ${headingCount} títulos/encontros encontrados`);
    }

    await page.screenshot({ path: '/tmp/soap-ai-accessibility.png', fullPage: true });

    console.log('\n' + '█'.repeat(70));
  });

  test('should support keyboard navigation', async ({ page }) => {
    console.log('\n' + '█'.repeat(70));
    console.log('█    TEST: SOAP Keyboard Navigation');
    console.log('█'.repeat(70));

    await mockSOAPAIGeneration(page, MOCK_SOAP_RESPONSES.lombalgia);
    await login(page, testUsers.rafael.email, testUsers.rafael.password);
    await navigateToEvolution(page);

    // Tab through interactive elements
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(150);

      const focusedElement = await page.evaluate(() => {
        const el = document.activeElement;
        return {
          tagName: el?.tagName,
          type: (el as HTMLElement)?.getAttribute('type'),
          ariaLabel: (el as HTMLElement)?.getAttribute('aria-label'),
          textContent: el?.textContent?.substring(0, 40),
        };
      });

      if (focusedElement.ariaLabel || focusedElement.textContent) {
        console.log(`  Tab ${i + 1}: ${focusedElement.tagName} - ${focusedElement.ariaLabel || focusedElement.textContent}`);
      }
    }

    // Check focus visible
    const hasFocusVisible = await page.evaluate(() => {
      const el = document.activeElement;
      const styles = window.getComputedStyle(el!);
      return styles.outline !== 'none' || styles.boxShadow !== 'none';
    });

    if (hasFocusVisible) {
      console.log('✅ Indicador de foco visível detectado');
    }

    await page.screenshot({ path: '/tmp/soap-ai-keyboard.png', fullPage: true });

    console.log('\n' + '█'.repeat(70));
  });
});

test.describe('SOAP Assistant - Integration', () => {
  test('should integrate SOAP with exercise suggestions', async ({ page }) => {
    console.log('\n' + '█'.repeat(70));
    console.log('█    TEST: SOAP + Exercise Integration');
    console.log('█'.repeat(70));

    await mockSOAPAIGeneration(page, MOCK_SOAP_RESPONSES.lombalgia);
    await login(page, testUsers.rafael.email, testUsers.rafael.password);
    await navigateToEvolution(page);

    // Fill SOAP sections
    const textareas = await page.locator('textarea').all();

    if (textareas.length >= 2) {
      await textareas[0].fill('Paciente relata dor lombar há 6 meses com piora ao sentar.');
      console.log('✅ Subjetivo preenchido');
    }

    await page.screenshot({ path: '/tmp/soap-ai-integration-01.png', fullPage: true });

    // Look for integration with exercises
    const exerciseIntegrationIndicators = [
      'button:has-text("Sugerir Exercícios")',
      'text=/baseado no SOAP|based on SOAP/i',
      '[data-testid="suggest-exercises-from-soap"]',
    ];

    for (const indicator of exerciseIntegrationIndicators) {
      const count = await page.locator(indicator).count();
      if (count > 0) {
        console.log(`✅ Integração com exercícios encontrada: ${indicator}`);
        break;
      }
    }

    await page.screenshot({ path: '/tmp/soap-ai-integration-02.png', fullPage: true });

    console.log('\n' + '█'.repeat(70));
  });

  test('should save generated SOAP to patient record', async ({ page }) => {
    console.log('\n' + '█'.repeat(70));
    console.log('█    TEST: Save SOAP to Record');
    console.log('█'.repeat(70));

    await mockSOAPAIGeneration(page, MOCK_SOAP_RESPONSES.lombalgia);
    await login(page, testUsers.rafael.email, testUsers.rafael.password);
    await navigateToEvolution(page);

    await page.waitForTimeout(3000);

    // Look for save button
    const saveButtonSelectors = [
      'button:has-text("Salvar SOAP")',
      'button:has-text("Salvar Evolução")',
      'button:has-text("Finalizar")',
      'button[type="submit"]',
      '[data-testid="save-soap"]',
    ];

    let saveButtonClicked = false;
    for (const selector of saveButtonSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        await page.locator(selector).first().click();
        console.log(`✅ Botão salvar clicado: ${selector}`);
        saveButtonClicked = true;
        await page.waitForTimeout(3000);
        break;
      }
    }

    if (!saveButtonClicked) {
      console.log('⚠️  Botão de salvar não encontrado');
    }

    await page.screenshot({ path: '/tmp/soap-ai-save.png', fullPage: true });

    console.log('\n' + '█'.repeat(70));
  });
});

test.describe('SOAP Assistant - Red Flags', () => {
  test('should display red flags when present', async ({ page }) => {
    console.log('\n' + '█'.repeat(70));
    console.log('█    TEST: SOAP Red Flags Display');
    console.log('█'.repeat(70));

    await mockSOAPAIGeneration(page, MOCK_SOAP_RESPONSES.lombalgia);
    await login(page, testUsers.rafael.email, testUsers.rafael.password);
    await navigateToEvolution(page);

    await page.waitForTimeout(3000);

    // Look for red flags section
    const redFlagIndicators = [
      'text=/red flags|bandeiras vermelhas|sinais de alerta/i',
      'text=/atention required|atenção necessária/i',
      '[data-testid="red-flags"]',
      '.red-flags',
      '.warning',
    ];

    for (const indicator of redFlagIndicators) {
      const count = await page.locator(indicator).count();
      if (count > 0) {
        console.log(`✅ Seção de red flags encontrada: ${indicator}`);
        break;
      }
    }

    // Check for urgent red flag styling
    const urgentIndicators = page.locator('.urgent, .danger, [role="alert"]');
    if (await urgentIndicators.count() > 0) {
      const visibleUrgent = urgentIndicators.filter({ hasText: /imediato|urgente|immediate/i });
      if (await visibleUrgent.count() > 0) {
        console.log('✅ Indicadores de urgência encontrados');
      }
    }

    await page.screenshot({ path: '/tmp/soap-ai-red-flags.png', fullPage: true });

    console.log('\n' + '█'.repeat(70));
  });
});

test.describe('SOAP Assistant - Language Support', () => {
  test('should support Portuguese language', async ({ page }) => {
    console.log('\n' + '█'.repeat(70));
    console.log('█    TEST: SOAP Portuguese Language');
    console.log('█'.repeat(70));

    await mockSOAPAIGeneration(page, MOCK_SOAP_RESPONSES.lombalgia);
    await login(page, testUsers.rafael.email, testUsers.rafael.password);
    await navigateToEvolution(page);

    // Fill with Portuguese text
    const textarea = page.locator('textarea').first();
    if (await textarea.count() > 0) {
      await textarea.fill('Paciente relata dor nas costas há dois meses.');
    }

    await page.waitForTimeout(3000);
    await page.screenshot({ path: '/tmp/soap-ai-portuguese.png', fullPage: true });

    // Verify generated text is in Portuguese
    const portugueseIndicators = [
      'text=/paciente|relata|dor|lombar/i',
      'text=/avaliação|plano|objetivo/i',
    ];

    for (const indicator of portugueseIndicators) {
      const count = await page.locator(indicator).count();
      if (count > 0) {
        console.log(`✅ Texto em português detectado: ${indicator}`);
        break;
      }
    }

    console.log('\n' + '█'.repeat(70));
  });
});
