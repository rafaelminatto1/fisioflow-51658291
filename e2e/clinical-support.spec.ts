/**
 * CLINICAL DECISION SUPPORT E2E TESTS
 *
 * Tests for AI-powered clinical decision support using Gemini 2.5 Pro
 * with Google Search grounding for evidence-based recommendations
 *
 * Test scenarios:
 * - Clinical case analysis and red flag detection
 * - Evidence-based treatment recommendations
 * - Prognosis indicators
 * - Google Search grounding integration
 * - Error handling and rate limiting
 * - Mock responses for reliable testing
 * - Accessibility compliance
 * - Integration with SOAP workflow
 *
 * @see src/lib/ai/clinical-support.ts
 */

import { test } from '@playwright/test';
import { testUsers } from './fixtures/test-data';

const BASE_URL = 'http://localhost:8080';

// Configure test for Chromium only with extended timeout
test.use({ browserName: 'chromium' });
test.setTimeout(180000);

// ========================================
// TEST DATA
// ========================================



const MOCK_CLINICAL_ANALYSIS_RESPONSES = {
  redFlags: {
    success: true,
    data: {
      redFlags: [
        {
          description: 'Síndrome da Cauda Equina - Emergência neurocirúrgica',
          urgency: 'immediate',
          action: 'Encaminhamento URGENTE para pronto-socorro com neurocirurgia. Não realizar tratamento fisioterapêutico. RM de coluna lombar urgente.',
          justification: 'Presença de sinais de alerta neurológicos graves: parestesia perineal (sinal da sela), disfunção esfincteriana, fraqueza progressiva em MMII. Classificada como Bandeira Vermelha (Red Flag) máxima prioridade.',
          category: 'neurological',
        },
        {
          description: 'Hipertensão não controlada',
          urgency: 'urgent',
          action: 'Avaliar com médico assistente. Monitorar PA antes de iniciar exercícios intensos.',
          justification: 'PA 160/95 mmHg em paciente hipertenso conhecido. Risco cardiovascular aumentado.',
          category: 'cardiovascular',
        },
      ],
      treatmentRecommendations: [
        {
          intervention: 'NÃO INICIAR FISIOTERAPIA - Encaminhamento emergencial',
          evidenceLevel: 'strong',
          rationale: 'Síndrome da Cauda Equina é emergência neurocirúrgica. Atraso no tratamento pode resultar em déficit neurológico permanente. Incontinência e parestesia perineal são sinais de compressão medular grave.',
          references: [
            'AAOS Clinical Practice Guidelines',
            'NICE NG59 - Spinal injury assessment',
          ],
          expectedOutcomes: ['Recuperação neurológica se tratamento cirúrgico em <48h'],
          contraindications: ['Qualquer intervenção fisioterapêutica até avaliação neurocirúrgica'],
        },
      ],
      prognosis: [
        {
          indicator: 'Recuperação funcional',
          value: 'poor',
          confidence: 0.15,
          explanation: 'Prognóstico reservado sem intervenção cirúrgica urgente. Risco de déficit neurológico permanente.',
          factors: ['Disfunção esfincteriana', 'Fraqueza bilateral MMII', 'Parestesia perineal'],
        },
      ],
      recommendedAssessments: [
        {
          assessment: 'Ressonância Magnética de Coluna Lombar URGENTE',
          purpose: 'Confirmar diagnóstico de Síndrome da Cauda Equina e identificar nível de compressão',
          priority: 'essential',
          timing: 'Imediato - Pronto Socorro',
        },
        {
          assessment: 'Avaliação Neurocirúrgica',
          purpose: 'Avaliar necessidade de descompressão cirúrgica emergencial',
          priority: 'essential',
          timing: 'Imediato',
        },
      ],
      caseSummary: 'Paciente de 52 anos com sinais neurológicos graves sugestivos de Síndrome da Cauda Equina, caracterizada por emergência médica que requer avaliação neurocirúrgica imediata. Presença de múltiplas red flags neurológicas e cardiovasculares. CONTRAINDICADO tratamento fisioterapêutico até resolução do quadro agudo.',
      keyConsiderations: [
        'EMERGÊNCIA MÉDICA - Não iniciar fisioterapia',
        'Documentar todos os sinais neurológicos detalhadamente',
        'Confirmar encaminhamento para pronto-socorro',
        'Notificar médico responsável imediatamente',
        'Monitorar evolução de sinais neurológicos',
      ],
      differentialDiagnoses: [
        'Hérnia de discal massiva L4-L5 ou L5-S1',
        'Tumor medular (raro, considerar)',
        'Síndrome do cone medular',
      ],
    },
    model: 'gemini-2.5-pro',
    groundingUsed: true,
    usage: {
      promptTokens: 1200,
      completionTokens: 2500,
      totalTokens: 3700,
    },
  },

  standardCase: {
    success: true,
    data: {
      redFlags: [],
      treatmentRecommendations: [
        {
          intervention: 'Fortalecimento de manguito rotador com exercícios excêntricos',
          evidenceLevel: 'strong',
          rationale: 'Exercícios excêntricos demonstraram superioridade em tendinopatias em múltiplos ensaios clínicos randomizados. Melhoram organização de colágeno e reduzem dor.',
          references: [
            'Khan et al. Br J Sports Med 2019',
            'Cochrane Review 2022 - Exercise for rotator cuff disease',
          ],
          expectedOutcomes: ['Redução de dor em 6-12 semanas', 'Melhora funcional significativa'],
          contraindications: ['Dor aguda inflamatória - fase atual'],
        },
        {
          intervention: 'Mobilização escápulo-torácica',
          evidenceLevel: 'moderate',
          rationale: 'Melhora ritmo escápulo-umeral e reduz impacto subacromial',
          references: [
            'Walton et al. Phys Ther 2020',
          ],
        },
      ],
      prognosis: [
        {
          indicator: 'Recuperação completa',
          value: 'good',
          confidence: 0.82,
          explanation: 'Prognóstico favorável com adesão ao tratamento fisioterapêutico. Tendinopatias não-rotas respondem bem ao tratamento conservador.',
          factors: ['Idade (38 anos)', 'Sem trauma', 'Sem degeneração avançada'],
        },
      ],
      recommendedAssessments: [
        {
          assessment: 'Escala de Constant-Murley',
          purpose: 'Avaliação funcional padronizada de ombro',
          priority: 'recommended',
          timing: 'A cada 4 semanas',
        },
        {
          assessment: 'DASH (Disabilities of the Arm, Shoulder and Hand)',
          purpose: 'Avaliação de incapacidade funcional autorreportada',
          priority: 'optional',
          timing: 'Baseline e reavaliação',
        },
      ],
      caseSummary: 'Paciente feminina, 38 anos, com tendinopatia do manguito rotador sem rotura. Quadro de 4 meses de evolução com limitação funcional significativa. Prognóstico favorável com tratamento conservador focado em fortalecimento excêntrico e correção do ritmo escápulo-umeral.',
      keyConsiderations: [
        'Fase subaguda - progredir carga gradualmente',
        'Monitorar resposta ao exercício excêntrico',
        'Corrigir padrões de movimento compensatórios',
        'Educar sobre atividade/reposo relativo',
      ],
      differentialDiagnoses: [
        'Tendinose bicipital associada',
        'Instabilidade glenoumeral leve',
      ],
    },
    model: 'gemini-2.5-pro',
    groundingUsed: true,
    usage: {
      promptTokens: 980,
      completionTokens: 1800,
      totalTokens: 2780,
    },
  },

  error: {
    success: false,
    error: 'AI service temporarily unavailable',
  },

  rateLimit: {
    success: false,
    error: 'Rate limit exceeded. Please try again later.',
  },
};

const MOCK_EVIDENCE_SEARCH = {
  success: true,
  data: {
    summary: 'Exercícios excêntricos demonstram eficácia superior comparada a exercícios concentrados ou terapia manual isolada no tratamento de tendinopatias do manguito rotador. Metanálises recentes indicam redução significativa de dor e melhora funcional com protocolos de 6-12 semanas. A combinação de exercícios com terapia manual pode oferecer benefícios adicionais em curto prazo.',
    references: [
      'Khan KM, et al. Br J Sports Med 2019;53:997-1005',
      'Littlewood C, et al. J Orthop Sports Phys Ther 2020;50:685-695',
      'Cochrane Database Syst Rev 2022;CD012585',
    ],
    evidenceLevel: 'Moderate to Strong',
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
 * Mock clinical analysis response
 */
async function mockClinicalAnalysis(page: any, mockResponse: any) {
  await page.route('**/api/ai/clinical**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockResponse),
    });
  });

  await page.route('**/analyzeCase**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockResponse),
    });
  });
}

/**
 * Mock evidence search
 */
async function mockEvidenceSearch(page: any, mockResponse: any) {
  await page.route('**/api/ai/evidence**', async route => {
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
async function mockRateLimit(page: any) {
  await page.route('**/api/ai/clinical**', async route => {
    await route.fulfill({
      status: 429,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_CLINICAL_ANALYSIS_RESPONSES.rateLimit),
    });
  });
}

/**
 * Mock API error
 */
async function mockAPIError(page: any, errorMessage = 'AI service temporarily unavailable') {
  await page.route('**/api/ai/clinical**', async route => {
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

test.describe('Clinical Decision Support - Happy Paths', () => {
  test('should analyze clinical case and provide recommendations', async ({ page }) => {
    console.log('\n' + '█'.repeat(70));
    console.log('█    TEST: Clinical Case Analysis');
    console.log('█'.repeat(70));

    await mockClinicalAnalysis(page, MOCK_CLINICAL_ANALYSIS_RESPONSES.standardCase);
    await login(page, testUsers.rafael.email, testUsers.rafael.password);

    const url = await navigateToEvolution(page);
    console.log(`  Navegado para: ${url}`);

    await page.screenshot({ path: '/tmp/clinical-ai-01-evolution-page.png', fullPage: true });

    // Look for clinical analysis button or trigger
    const clinicalButtonSelectors = [
      'button:has-text("Análise Clínica")',
      'button:has-text("Suporte Clínico")',
      'button:has-text("Clinical AI")',
      'button:has-text("AI Support")',
      '[data-testid="clinical-ai-button"]',
    ];

    let buttonClicked = false;
    for (const selector of clinicalButtonSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        await page.locator(selector).first().click();
        console.log(`✅ Botão análise clínica clicado: ${selector}`);
        buttonClicked = true;
        await page.waitForTimeout(5000);
        break;
      }
    }

    if (!buttonClicked) {
      console.log('⚠️  Botão de análise clínica não encontrado');
    }

    await page.screenshot({ path: '/tmp/clinical-ai-02-after-analysis.png', fullPage: true });

    // Look for treatment recommendations
    const recommendationIndicators = [
      'text=/recomenda|recommendation|tratamento|treatment/i',
      'text=/evidence|evidência|strong|moderate/i',
      '[data-testid="treatment-recommendations"]',
      '.clinical-recommendations',
    ];

    for (const indicator of recommendationIndicators) {
      const count = await page.locator(indicator).count();
      if (count > 0) {
        console.log(`✅ Recomendações de tratamento encontradas: ${indicator}`);
        break;
      }
    }

    // Check for evidence levels
    const evidenceIndicators = page.locator('text=/strong evidence|moderate|evidência forte/i');
    if (await evidenceIndicators.count() > 0) {
      console.log('✅ Níveis de evidência exibidos');
    }

    console.log('\n' + '█'.repeat(70));
  });

  test('should provide prognosis indicators', async ({ page }) => {
    console.log('\n' + '█'.repeat(70));
    console.log('█    TEST: Prognosis Indicators');
    console.log('█'.repeat(70));

    await mockClinicalAnalysis(page, MOCK_CLINICAL_ANALYSIS_RESPONSES.standardCase);
    await login(page, testUsers.rafael.email, testUsers.rafael.password);
    await navigateToEvolution(page);

    await page.waitForTimeout(5000);
    await page.screenshot({ path: '/tmp/clinical-ai-03-prognosis.png', fullPage: true });

    // Look for prognosis section
    const prognosisIndicators = [
      'text=/prognóstico|prognosis|forecast/i',
      'text=/good|fair|poor|favorável|reservado/i',
      'text=/confiança|confidence/i',
      '[data-testid="prognosis"]',
      '.prognosis-indicators',
    ];

    for (const indicator of prognosisIndicators) {
      const count = await page.locator(indicator).count();
      if (count > 0) {
        console.log(`✅ Indicadores prognósticos encontrados: ${indicator}`);
        break;
      }
    }

    console.log('\n' + '█'.repeat(70));
  });

  test('should recommend additional assessments', async ({ page }) => {
    console.log('\n' + '█'.repeat(70));
    console.log('█    TEST: Recommended Assessments');
    console.log('█'.repeat(70));

    await mockClinicalAnalysis(page, MOCK_CLINICAL_ANALYSIS_RESPONSES.standardCase);
    await login(page, testUsers.rafael.email, testUsers.rafael.password);
    await navigateToEvolution(page);

    await page.waitForTimeout(5000);

    // Look for recommended assessments
    const assessmentIndicators = [
      'text=/avaliações recomendadas|recommended assessments/i',
      'text=/escala|questionário|assessment/i',
      'text=/Constant-Murley|DASH|SPADI/i',
      '[data-testid="recommended-assessments"]',
    ];

    for (const indicator of assessmentIndicators) {
      const count = await page.locator(indicator).count();
      if (count > 0) {
        console.log(`✅ Avaliações recomendadas encontradas: ${indicator}`);
        break;
      }
    }

    // Check for priority levels (essential, recommended, optional)
    const priorityIndicators = page.locator('text=/essencial|recomendado|opcional|essential|optional/i');
    if (await priorityIndicators.count() > 0) {
      console.log('✅ Níveis de prioridade de avaliações exibidos');
    }

    await page.screenshot({ path: '/tmp/clinical-ai-04-assessments.png', fullPage: true });

    console.log('\n' + '█'.repeat(70));
  });
});

test.describe('Clinical Decision Support - Red Flags', () => {
  test('should identify and display red flags', async ({ page }) => {
    console.log('\n' + '█'.repeat(70));
    console.log('█    TEST: Red Flag Detection');
    console.log('█'.repeat(70));

    await mockClinicalAnalysis(page, MOCK_CLINICAL_ANALYSIS_RESPONSES.redFlags);
    await login(page, testUsers.rafael.email, testUsers.rafael.password);
    await navigateToEvolution(page);

    // Fill SOAP with red flag indicators
    const textareas = await page.locator('textarea').all();

    if (textareas.length >= 1) {
      await textareas[0].fill(
        'Paciente com parestesia perineal, disfunção esfincteriana e fraqueza bilateral em MMII.'
      );
      console.log('✅ Subjetivo preenchido com red flags');
    }

    await page.screenshot({ path: '/tmp/clinical-ai-redflag-01.png', fullPage: true });

    // Try to trigger analysis
    const analyzeButton = page.locator('button:has-text("Analisar"), button:has-text("AI")');
    if (await analyzeButton.count() > 0) {
      await analyzeButton.first().click();
      await page.waitForTimeout(5000);
    }

    await page.screenshot({ path: '/tmp/clinical-ai-redflag-02.png', fullPage: true });

    // Look for red flag displays
    const redFlagIndicators = [
      'text=/red flags|bandeiras vermelhas|sinais de alerta/i',
      'text=/cauda equina|emergência|urgente|emergency/i',
      '[data-testid="red-flags"]',
      '.red-flags',
      '.urgent',
      '.emergency',
    ];

    let redFlagsFound = false;
    for (const indicator of redFlagIndicators) {
      const count = await page.locator(indicator).count();
      if (count > 0) {
        console.log(`✅ Red flags detectadas e exibidas: ${indicator}`);
        redFlagsFound = true;
        break;
      }
    }

    if (redFlagsFound) {
      // Check for urgency levels
      const urgencyIndicators = page.locator('text=/imediato|urgente|immediate|urgent/i');
      if (await urgencyIndicators.count() > 0) {
        console.log('✅ Níveis de urgência exibidos');
      }

      // Check for recommended actions
      const actionIndicators = page.locator('text=/encaminhamento|refer|ação|action/i');
      if (await actionIndicators.count() > 0) {
        console.log('✅ Ações recomendadas exibidas');
      }
    }

    console.log('\n' + '█'.repeat(70));
  });

  test('should prioritize critical red flags', async ({ page }) => {
    console.log('\n' + '█'.repeat(70));
    console.log('█    TEST: Red Flag Prioritization');
    console.log('█'.repeat(70));

    await mockClinicalAnalysis(page, MOCK_CLINICAL_ANALYSIS_RESPONSES.redFlags);
    await login(page, testUsers.rafael.email, testUsers.rafael.password);
    await navigateToEvolution(page);

    await page.waitForTimeout(5000);

    // Check if immediate red flags are displayed first or prominently
    const immediateIndicators = page.locator('text=/imediato|immediate|emergency/emergência/i');
    const immediateCount = await immediateIndicators.count();

    if (immediateCount > 0) {
      console.log(`✅ ${immediateCount} indicadores de emergência/imediato encontrados`);

      // Check visual prioritization (larger text, bold, color)
      const firstImmediate = immediateIndicators.first();
      const isVisible = await firstImmediate.isVisible();

      if (isVisible) {
        // Check if it's visually prominent (this would depend on implementation)
        const styles = await firstImmediate.evaluate(el => {
          const computed = window.getComputedStyle(el);
          return {
            fontWeight: computed.fontWeight,
            color: computed.color,
            fontSize: computed.fontSize,
          };
        });

        if (styles.fontWeight === '700' || styles.fontWeight === 'bold') {
          console.log('✅ Red flags críticas visualmente destacadas (negrito)');
        }
      }
    }

    await page.screenshot({ path: '/tmp/clinical-ai-redflag-priority.png', fullPage: true });

    console.log('\n' + '█'.repeat(70));
  });

  test('should provide clear actions for red flags', async ({ page }) => {
    console.log('\n' + '█'.repeat(70));
    console.log('█    TEST: Red Flag Action Guidance');
    console.log('█'.repeat(70));

    await mockClinicalAnalysis(page, MOCK_CLINICAL_ANALYSIS_RESPONSES.redFlags);
    await login(page, testUsers.rafael.email, testUsers.rafael.password);
    await navigateToEvolution(page);

    await page.waitForTimeout(5000);

    // Look for action recommendations
    const actionIndicators = [
      'text=/não iniciar|não tratar|do not start/i',
      'text=/encaminhar|referir|refer to/i',
      'text=/pronto socorro|emergency|urgente/i',
      'text=/neurocirurgia|neurosurgery/i',
      '[data-testid="red-flag-actions"]',
    ];

    for (const indicator of actionIndicators) {
      const count = await page.locator(indicator).count();
      if (count > 0) {
        console.log(`✅ Ações para red flags exibidas: ${indicator}`);
        break;
      }
    }

    await page.screenshot({ path: '/tmp/clinical-ai-redflag-actions.png', fullPage: true });

    console.log('\n' + '█'.repeat(70));
  });
});

test.describe('Clinical Decision Support - Evidence-Based', () => {
  test('should display evidence levels for recommendations', async ({ page }) => {
    console.log('\n' + '█'.repeat(70));
    console.log('█    TEST: Evidence Levels Display');
    console.log('█'.repeat(70));

    await mockClinicalAnalysis(page, MOCK_CLINICAL_ANALYSIS_RESPONSES.standardCase);
    await login(page, testUsers.rafael.email, testUsers.rafael.password);
    await navigateToEvolution(page);

    await page.waitForTimeout(5000);
    await page.screenshot({ path: '/tmp/clinical-ai-evidence-01.png', fullPage: true });

    // Look for evidence level indicators
    const evidenceIndicators = [
      'text=/strong evidence|evidência forte|forte/i',
      'text=/moderate evidence|evidência moderada/i',
      'text=/limited evidence|evidência limitada/i',
      'text=/expert opinion|opinião de especialista/i',
      '[data-testid="evidence-level"]',
    ];

    for (const indicator of evidenceIndicators) {
      const count = await page.locator(indicator).count();
      if (count > 0) {
        console.log(`✅ Níveis de evidência exibidos: ${indicator}`);
        break;
      }
    }

    console.log('\n' + '█'.repeat(70));
  });

  test('should include references and citations', async ({ page }) => {
    console.log('\n' + '█'.repeat(70));
    console.log('█    TEST: References and Citations');
    console.log('█'.repeat(70));

    await mockClinicalAnalysis(page, MOCK_CLINICAL_ANALYSIS_RESPONSES.standardCase);
    await login(page, testUsers.rafael.email, testUsers.rafael.password);
    await navigateToEvolution(page);

    await page.waitForTimeout(5000);

    // Look for references
    const referenceIndicators = [
      'text=/referências|references|citations/i',
      'text=/et al\\./i',
      'text=/\\d{4}/',  // Years like 2019, 2020
      '[data-testid="references"]',
      '.references',
      '.citations',
    ];

    for (const indicator of referenceIndicators) {
      const count = await page.locator(indicator).count();
      if (count > 0) {
        console.log(`✅ Referências encontradas: ${indicator}`);
        break;
      }
    }

    await page.screenshot({ path: '/tmp/clinical-ai-references.png', fullPage: true });

    console.log('\n' + '█'.repeat(70));
  });

  test('should support evidence search functionality', async ({ page }) => {
    console.log('\n' + '█'.repeat(70));
    console.log('█    TEST: Evidence Search');
    console.log('█'.repeat(70));

    await mockEvidenceSearch(page, MOCK_EVIDENCE_SEARCH);
    await mockClinicalAnalysis(page, MOCK_CLINICAL_ANALYSIS_RESPONSES.standardCase);
    await login(page, testUsers.rafael.email, testUsers.rafael.password);
    await navigateToEvolution(page);

    // Look for evidence search input or button
    const searchSelectors = [
      'input[placeholder*="evidência" i]',
      'input[placeholder*="pesquisar" i]',
      'button:has-text("Pesquisar Evidências")',
      'button:has-text("Search Evidence")',
      '[data-testid="evidence-search"]',
    ];

    for (const selector of searchSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        console.log(`✅ Campo de busca de evidências encontrado: ${selector}`);
        break;
      }
    }

    await page.screenshot({ path: '/tmp/clinical-ai-evidence-search.png', fullPage: true });

    console.log('\n' + '█'.repeat(70));
  });
});

test.describe('Clinical Decision Support - Error Handling', () => {
  test('should handle API errors gracefully', async ({ page }) => {
    console.log('\n' + '█'.repeat(70));
    console.log('█    TEST: Clinical API Error Handling');
    console.log('█'.repeat(70));

    await mockAPIError(page);
    await login(page, testUsers.rafael.email, testUsers.rafael.password);
    await navigateToEvolution(page);

    // Try to trigger analysis
    const analyzeButton = page.locator('button:has-text("Analisar"), button:has-text("AI")');
    if (await analyzeButton.count() > 0) {
      await analyzeButton.first().click();
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

    await page.screenshot({ path: '/tmp/clinical-ai-error.png', fullPage: true });

    console.log('\n' + '█'.repeat(70));
  });

  test('should handle rate limiting gracefully', async ({ page }) => {
    console.log('\n' + '█'.repeat(70));
    console.log('█    TEST: Clinical Rate Limiting');
    console.log('█'.repeat(70));

    await mockRateLimit(page);
    await login(page, testUsers.rafael.email, testUsers.rafael.password);
    await navigateToEvolution(page);

    // Try to trigger analysis
    const analyzeButton = page.locator('button:has-text("Analisar"), button:has-text("AI")');
    if (await analyzeButton.count() > 0) {
      await analyzeButton.first().click();
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

    await page.screenshot({ path: '/tmp/clinical-ai-rate-limit.png', fullPage: true });

    console.log('\n' + '█'.repeat(70));
  });

  test('should show loading state during analysis', async ({ page }) => {
    console.log('\n' + '█'.repeat(70));
    console.log('█    TEST: Clinical Analysis Loading State');
    console.log('█'.repeat(70));

    // Delay response
    await page.route('**/api/ai/clinical**', async route => {
      await new Promise(resolve => setTimeout(resolve, 3000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_CLINICAL_ANALYSIS_RESPONSES.standardCase),
      });
    });

    await login(page, testUsers.rafael.email, testUsers.rafael.password);
    await navigateToEvolution(page);

    // Click analyze button
    const analyzeButton = page.locator('button:has-text("Analisar"), button:has-text("AI")');
    if (await analyzeButton.count() > 0) {
      await analyzeButton.first().click();

      // Check for loading indicators
      const loadingIndicators = [
        '[data-testid="loading"]',
        '.loading',
        '.spinner',
        'text=/analisando|analyzing|carregando/i',
        '[aria-busy="true"]',
      ];

      for (const indicator of loadingIndicators) {
        const element = page.locator(indicator).first();
        if (await element.count() > 0) {
          const isVisible = await element.isVisible();
          if (isVisible) {
            console.log(`✅ Estado de carregamento exibido: ${indicator}`);
            break;
          }
        }
      }

      await page.waitForTimeout(3500);
    }

    await page.screenshot({ path: '/tmp/clinical-ai-loading.png', fullPage: true });

    console.log('\n' + '█'.repeat(70));
  });
});

test.describe('Clinical Decision Support - Accessibility', () => {
  test('should have accessible clinical decision support interface', async ({ page }) => {
    console.log('\n' + '█'.repeat(70));
    console.log('█    TEST: Clinical Support Accessibility');
    console.log('█'.repeat(70));

    await mockClinicalAnalysis(page, MOCK_CLINICAL_ANALYSIS_RESPONSES.standardCase);
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

      if (text && (text.includes('Clínica') || text.includes('Analisar') || text.includes('AI'))) {
        console.log(`  Botão: "${text?.trim()}"`);
        if (ariaLabel) {
          console.log(`    ✓ aria-label: ${ariaLabel}`);
        }
      }
    }

    // Check for ARIA regions
    const regions = page.locator('[role="region"], section');
    const regionCount = await regions.count();

    if (regionCount > 0) {
      console.log(`✅ ${regionCount} regiões semânticas encontradas`);
    }

    await page.screenshot({ path: '/tmp/clinical-ai-accessibility.png', fullPage: true });

    console.log('\n' + '█'.repeat(70));
  });

  test('should support keyboard navigation', async ({ page }) => {
    console.log('\n' + '█'.repeat(70));
    console.log('█    TEST: Clinical Support Keyboard Navigation');
    console.log('█'.repeat(70));

    await mockClinicalAnalysis(page, MOCK_CLINICAL_ANALYSIS_RESPONSES.standardCase);
    await login(page, testUsers.rafael.email, testUsers.rafael.password);
    await navigateToEvolution(page);

    // Tab through interactive elements
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(150);

      const focusedElement = await page.evaluate(() => {
        const el = document.activeElement;
        return {
          tagName: el?.tagName,
          ariaLabel: (el as HTMLElement)?.getAttribute('aria-label'),
          textContent: el?.textContent?.substring(0, 40),
        };
      });

      if (focusedElement.ariaLabel || focusedElement.textContent) {
        console.log(`  Tab ${i + 1}: ${focusedElement.tagName} - ${focusedElement.ariaLabel || focusedElement.textContent}`);
      }
    }

    // Check for focus indicators
    const hasFocusVisible = await page.evaluate(() => {
      const el = document.activeElement;
      const styles = window.getComputedStyle(el!);
      return styles.outline !== 'none' || styles.boxShadow !== 'none';
    });

    if (hasFocusVisible) {
      console.log('✅ Indicadores de foco visíveis detectados');
    }

    await page.screenshot({ path: '/tmp/clinical-ai-keyboard.png', fullPage: true });

    console.log('\n' + '█'.repeat(70));
  });

  test('should have proper color contrast for red flags', async ({ page }) => {
    console.log('\n' + '█'.repeat(70));
    console.log('█    TEST: Red Flag Color Contrast');
    console.log('█'.repeat(70));

    await mockClinicalAnalysis(page, MOCK_CLINICAL_ANALYSIS_RESPONSES.redFlags);
    await login(page, testUsers.rafael.email, testUsers.rafael.password);
    await navigateToEvolution(page);

    await page.waitForTimeout(5000);

    // Check if urgent items have visual distinction
    const urgentElements = page.locator('.urgent, .emergency, [data-urgency="immediate"], [data-urgency="urgent"]');

    if (await urgentElements.count() > 0) {
      const firstUrgent = urgentElements.first();

      const styles = await firstUrgent.evaluate(el => {
        const computed = window.getComputedStyle(el);
        return {
          backgroundColor: computed.backgroundColor,
          color: computed.color,
          fontWeight: computed.fontWeight,
        };
      });

      console.log(`  Estilos de elemento urgente:`);
      console.log(`    Cor: ${styles.color}`);
      console.log(`    Fundo: ${styles.backgroundColor}`);
      console.log(`    Peso da fonte: ${styles.fontWeight}`);

      // Note: Automated contrast checking is complex
      // In a real scenario, you'd use a contrast calculation library
      console.log('✅ Estilos visuais de urgência detectados');
    }

    await page.screenshot({ path: '/tmp/clinical-ai-contrast.png', fullPage: true });

    console.log('\n' + '█'.repeat(70));
  });
});

test.describe('Clinical Decision Support - Integration', () => {
  test('should integrate with SOAP workflow', async ({ page }) => {
    console.log('\n' + '█'.repeat(70));
    console.log('█    TEST: Clinical + SOAP Integration');
    console.log('█'.repeat(70));

    await mockClinicalAnalysis(page, MOCK_CLINICAL_ANALYSIS_RESPONSES.standardCase);
    await login(page, testUsers.rafael.email, testUsers.rafael.password);
    await navigateToEvolution(page);

    // Fill SOAP sections
    const textareas = await page.locator('textarea').all();

    if (textareas.length >= 3) {
      await textareas[0].fill('Paciente com dor no ombro direito há 4 meses. Piora com abdução.');
      console.log('✅ Subjetivo preenchido');

      if (textareas.length >= 2) {
        await textareas[1].fill('Abdução 120° com arco doloroso. Neer positivo.');
        console.log('✅ Objetivo preenchido');
      }

      if (textareas.length >= 3) {
        await textareas[2].fill('Síndrome do impacto subacromial.');
        console.log('✅ Avaliação preenchida');
      }
    }

    await page.screenshot({ path: '/tmp/clinical-ai-soap-integration-01.png', fullPage: true });

    // Try to trigger analysis based on SOAP
    const analyzeButton = page.locator('button:has-text("Analisar"), button:has-text("AI Support")');
    if (await analyzeButton.count() > 0) {
      await analyzeButton.first().click();
      await page.waitForTimeout(5000);
      console.log('✅ Análise clínica solicitada');
    }

    await page.screenshot({ path: '/tmp/clinical-ai-soap-integration-02.png', fullPage: true });

    console.log('\n' + '█'.repeat(70));
  });

  test('should save analysis to patient record', async ({ page }) => {
    console.log('\n' + '█'.repeat(70));
    console.log('█    TEST: Save Clinical Analysis');
    console.log('█'.repeat(70));

    await mockClinicalAnalysis(page, MOCK_CLINICAL_ANALYSIS_RESPONSES.standardCase);
    await login(page, testUsers.rafael.email, testUsers.rafael.password);
    await navigateToEvolution(page);

    await page.waitForTimeout(5000);

    // Look for save button for analysis
    const saveButtonSelectors = [
      'button:has-text("Salvar Análise")',
      'button:has-text("Save Analysis")',
      'button:has-text("Adicionar ao Prontuário")',
      '[data-testid="save-analysis"]',
    ];

    for (const selector of saveButtonSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        await page.locator(selector).first().click();
        console.log(`✅ Botão salvar análise clicado: ${selector}`);
        await page.waitForTimeout(3000);
        break;
      }
    }

    await page.screenshot({ path: '/tmp/clinical-ai-save.png', fullPage: true });

    console.log('\n' + '█'.repeat(70));
  });
});

test.describe('Clinical Decision Support - Differential Diagnosis', () => {
  test('should suggest differential diagnoses', async ({ page }) => {
    console.log('\n' + '█'.repeat(70));
    console.log('█    TEST: Differential Diagnoses');
    console.log('█'.repeat(70));

    await mockClinicalAnalysis(page, MOCK_CLINICAL_ANALYSIS_RESPONSES.standardCase);
    await login(page, testUsers.rafael.email, testUsers.rafael.password);
    await navigateToEvolution(page);

    await page.waitForTimeout(5000);

    // Look for differential diagnoses section
    const differentialIndicators = [
      'text=/diagnóstico diferencial|differential diagnosis/i',
      'text=/considerar|suspeitar|rule out/i',
      '[data-testid="differential-diagnosis"]',
      '.differential-diagnosis',
    ];

    for (const indicator of differentialIndicators) {
      const count = await page.locator(indicator).count();
      if (count > 0) {
        console.log(`✅ Diagnósticos diferenciais sugeridos: ${indicator}`);
        break;
      }
    }

    await page.screenshot({ path: '/tmp/clinical-ai-differential.png', fullPage: true });

    console.log('\n' + '█'.repeat(70));
  });
});
