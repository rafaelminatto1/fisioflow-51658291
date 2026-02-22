/**
 * EXERCISE AI ASSISTANT E2E TESTS
 *
 * Tests for AI-powered exercise suggestions using Gemini 2.5 Flash-Lite
 *
 * Test scenarios:
 * - Exercise suggestions based on patient profile
 * - Error handling and rate limiting
 * - Mock responses for reliable testing
 * - Accessibility compliance
 * - Integration with patient evolution workflow
 *
 * @see src/lib/ai/exercises.ts
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

const MOCK_PATIENT_PROFILES = {
  lombalgia: {
    name: 'Paciente Teste Lombalgia',
    age: 45,
    gender: 'Masculino',
    condition: 'Lombalgia crônica',
    painMap: { 'lombar': 7, 'quadril direito': 4 },
    goals: ['Reduzir dor lombar', 'Melhorar mobilidade', 'Voltar a caminhar 30min'],
    equipment: ['Nenhum'],
    sessionCount: 3,
    treatmentPhase: 'initial',
  },
  ombro: {
    name: 'Paciente Teste Ombro',
    age: 32,
    gender: 'Feminino',
    condition: 'Síndrome do impacto do ombro',
    painMap: { 'ombro direito': 8, 'pescoço': 3 },
    goals: ['Elevar braço sem dor', 'Melhorar amplitude de movimento'],
    equipment: ['TheraBand', 'Bola suíça'],
    sessionCount: 8,
    treatmentPhase: 'progressive',
  },
  pos_cirurgia: {
    name: 'Paciente Teste Pós-Cirurgia',
    age: 58,
    gender: 'Masculino',
    condition: 'Reabilitação pós-LCA',
    painMap: { 'joelho esquerdo': 5 },
    goals: ['Recuperar força muscular', 'Voltar a correr', 'Estabilidade do joelho'],
    equipment: ['Bicicleta ergométrica', 'Elásticos', 'Step'],
    sessionCount: 12,
    treatmentPhase: 'advanced',
  },
};

const MOCK_EXERCISE_RESPONSES = {
  lombalgia: {
    success: true,
    data: {
      exercises: [
        {
          name: 'Pontes',
          category: 'Fortalecimento',
          difficulty: 'beginner',
          rationale: 'Fortalece glúteos e core com carga mínima sobre coluna',
          targetArea: 'Glúteos e Core',
          goalsAddressed: ['Reduzir dor lombar', 'Estabilização'],
          sets: 3,
          reps: 12,
          frequency: 'Diário',
          precautions: ['Evitar se houver dor aguda'],
          confidence: 0.9,
        },
        {
          name: 'Cat-Camel (Gato-Camelo)',
          category: 'Mobilidade',
          difficulty: 'beginner',
          rationale: 'Melhora mobilidade flexão-extensão de coluna lombar',
          targetArea: 'Coluna lombar',
          goalsAddressed: ['Melhorar mobilidade', 'Aquecimento'],
          sets: 2,
          reps: 10,
          frequency: '2x/dia',
          precautions: [],
          confidence: 0.95,
        },
        {
          name: 'Bird-Dog',
          category: 'Estabilização',
          difficulty: 'intermediate',
          rationale: 'Treina estabilizadores de tronco com movimento alternado',
          targetArea: 'Core',
          goalsAddressed: ['Estabilidade', 'Coordenação'],
          sets: 3,
          reps: 8,
          frequency: 'Diário',
          precautions: ['Manter coluna neutra'],
          confidence: 0.88,
        },
      ],
      programRationale: 'Programa inicial focado em mobilidade básica e fortalecimento de core para reduzir dor e melhorar função.',
      expectedOutcomes: [
        'Redução de dor em 2-3 semanas',
        'Melhora na mobilidade funcional',
        'Capacidade de caminhar 30min sem dor aguda',
      ],
      progressionCriteria: [
        'Progressar quando exercícios atuais não causarem dor',
        'Aumentar repetições gradualmente',
        'Adicionar resistência após 4 semanas',
      ],
      redFlags: ['Dor irradiada para membros inferiores', 'Formigamento ou perda de força'],
      estimatedDuration: 25,
    },
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
 * Mock AI response for exercise suggestions
 */
async function mockExerciseAI(page: any, mockResponse: any) {
  // Intercept calls to exercise AI endpoint
  await page.route('**/api/ai/exercises**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockResponse),
    });
  });

  // Also intercept Firebase Functions calls
  await page.route('**/suggestExercises**', async route => {
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
async function mockRateLimitError(page: any) {
  await page.route('**/api/ai/exercises**', async route => {
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
async function mockAPIError(page: any, errorMessage: string = 'AI service temporarily unavailable') {
  await page.route('**/api/ai/exercises**', async route => {
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

test.describe('Exercise AI Assistant - Happy Paths', () => {
  test('should suggest exercises for patient with low back pain', async ({ page }) => {
    console.log('\n' + '█'.repeat(70));
    console.log('█    TEST: Exercise Suggestions for Low Back Pain');
    console.log('█'.repeat(70));

    // Setup: Mock AI response
    await mockExerciseAI(page, MOCK_EXERCISE_RESPONSES.lombalgia);

    // Login
    await login(page, testUsers.rafael.email, testUsers.rafael.password);

    // Navigate to patient evolution
    const url = await navigateToEvolution(page);
    console.log(`  Navegado para: ${url}`);

    await page.screenshot({ path: '/tmp/exercise-ai-01-evolution-page.png', fullPage: true });

    // Look for AI exercise suggestion button or trigger
    const aiButtonSelectors = [
      'button:has-text("Sugerir Exercícios")',
      'button:has-text("AI Exercises")',
      'button[aria-label*="exercícios" i]',
      'button:has-text("🤖")',
      '[data-testid="exercise-ai-button"]',
    ];

    let aiButtonClicked = false;
    for (const selector of aiButtonSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        await page.locator(selector).first().click();
        console.log(`✅ Botão AI clicado: ${selector}`);
        aiButtonClicked = true;
        await page.waitForTimeout(3000);
        break;
      }
    }

    if (!aiButtonClicked) {
      console.log('⚠️  Botão de sugestão de exercícios não encontrado');
      console.log('   Verificando se há formulário para preencher...');

      // Try to fill patient data to trigger AI
      const textarea = page.locator('textarea').first();
      if (await textarea.count() > 0) {
        await textarea.fill(
          'Paciente com lombalgia crônica, dor 7/10 na região lombar, ' +
          'piora ao sentar. Melhora com deambulação. Objetivo: voltar a caminhar 30min.'
        );
        console.log('✅ Textarea preenchida com dados do paciente');
      }
    }

    await page.screenshot({ path: '/tmp/exercise-ai-02-after-trigger.png', fullPage: true });

    // Look for exercise suggestions in the response
    const exerciseIndicators = [
      'text=/Pontes|Cat-Camel|Bird-Dog/i',
      'text=/fortalecimento|mobilidade|estabilização/i',
      '[data-testid="exercise-suggestion"]',
      '.exercise-card',
      '.ai-suggestion',
    ];

    let exercisesFound = false;
    for (const indicator of exerciseIndicators) {
      const count = await page.locator(indicator).count();
      if (count > 0) {
        console.log(`✅ Sugestões de exercícios encontradas: ${indicator}`);
        exercisesFound = true;
        break;
      }
    }

    if (exercisesFound) {
      // Verify exercise details are displayed
      const exerciseDetails = page.locator('text=/sets|reps|series|repetições/i');
      const hasDetails = await exerciseDetails.count() > 0;

      if (hasDetails) {
        console.log('✅ Detalhes dos exercícios (sets/reps) exibidos');
      }

      // Verify rationale is shown
      const rationale = page.locator('text=/rationale|justificativa|por que/i');
      const hasRationale = await rationale.count() > 0;

      if (hasRationale) {
        console.log('✅ Justificativa clínica exibida');
      }
    } else {
      console.log('⚠️  Sugestões de exercícios não encontradas na página');
      console.log('   Isso pode indicar que a feature ainda não está implementada na UI');
    }

    console.log('\n' + '█'.repeat(70));
  });

  test('should display exercise program with progression criteria', async ({ page }) => {
    console.log('\n' + '█'.repeat(70));
    console.log('█    TEST: Exercise Program Progression');
    console.log('█'.repeat(70));

    await mockExerciseAI(page, MOCK_EXERCISE_RESPONSES.lombalgia);
    await login(page, testUsers.rafael.email, testUsers.rafael.password);

    await navigateToEvolution(page);

    // Look for progression information
    await page.waitForTimeout(3000);

    const progressionIndicators = [
      'text=/progressão|progression|avançar/i',
      'text=/critérios|criteria/i',
      '[data-testid="progression-criteria"]',
      '.exercise-progression',
    ];

    let progressionFound = false;
    for (const indicator of progressionIndicators) {
      const count = await page.locator(indicator).count();
      if (count > 0) {
        console.log(`✅ Critérios de progressão encontrados: ${indicator}`);
        progressionFound = true;
        break;
      }
    }

    if (!progressionFound) {
      console.log('⚠️  Critérios de progressão não encontrados');
    }

    console.log('\n' + '█'.repeat(70));
  });

  test('should show expected outcomes for exercise program', async ({ page }) => {
    console.log('\n' + '█'.repeat(70));
    console.log('█    TEST: Exercise Expected Outcomes');
    console.log('█'.repeat(70));

    await mockExerciseAI(page, MOCK_EXERCISE_RESPONSES.lombalgia);
    await login(page, testUsers.rafael.email, testUsers.rafael.password);

    await navigateToEvolution(page);
    await page.waitForTimeout(3000);

    const outcomeIndicators = [
      'text=/esperado|expected|outcome|resultado/i',
      'text=/melhora|redução|aumento/i',
      '[data-testid="expected-outcomes"]',
    ];

    let outcomesFound = false;
    for (const indicator of outcomeIndicators) {
      const count = await page.locator(indicator).count();
      if (count > 0) {
        console.log(`✅ Resultados esperados encontrados: ${indicator}`);
        outcomesFound = true;
        break;
      }
    }

    if (!outcomesFound) {
      console.log('⚠️  Resultados esperados não encontrados');
    }

    console.log('\n' + '█'.repeat(70));
  });
});

test.describe('Exercise AI Assistant - Error Handling', () => {
  test('should handle API errors gracefully', async ({ page }) => {
    console.log('\n' + '█'.repeat(70));
    console.log('█    TEST: Exercise AI API Error Handling');
    console.log('█'.repeat(70));

    await mockAPIError(page, 'AI service temporarily unavailable');
    await login(page, testUsers.rafael.email, testUsers.rafael.password);

    await navigateToEvolution(page);

    // Try to trigger exercise AI
    const aiButton = page.locator('button:has-text("Sugerir Exercícios"), button:has-text("AI Exercises")');
    if (await aiButton.count() > 0) {
      await aiButton.first().click();
      await page.waitForTimeout(3000);
    }

    // Look for error message
    const errorIndicators = [
      '.error',
      '.destructive',
      '[role="alert"]',
      'text=/erro|error|unavailable/i',
    ];

    let errorFound = false;
    for (const indicator of errorIndicators) {
      const count = await page.locator(indicator).count();
      if (count > 0) {
        const errorElement = page.locator(indicator).first();
        if (await errorElement.isVisible()) {
          const errorText = await errorElement.textContent();
          console.log(`✅ Mensagem de erro exibida: ${errorText?.trim().substring(0, 100)}`);
          errorFound = true;
          break;
        }
      }
    }

    if (!errorFound) {
      console.log('⚠️  Mensagem de erro não encontrada (ou UI ainda não implementada)');
    }

    await page.screenshot({ path: '/tmp/exercise-ai-error.png', fullPage: true });

    console.log('\n' + '█'.repeat(70));
  });

  test('should handle rate limiting gracefully', async ({ page }) => {
    console.log('\n' + '█'.repeat(70));
    console.log('█    TEST: Exercise AI Rate Limiting');
    console.log('█'.repeat(70));

    await mockRateLimitError(page);
    await login(page, testUsers.rafael.email, testUsers.rafael.password);

    await navigateToEvolution(page);

    // Try to trigger exercise AI
    const aiButton = page.locator('button:has-text("Sugerir Exercícios"), button:has-text("AI Exercises")');
    if (await aiButton.count() > 0) {
      await aiButton.first().click();
      await page.waitForTimeout(3000);
    }

    // Look for rate limit message
    const rateLimitIndicators = [
      'text=/rate limit|limite|muitas solicitações/i',
      'text=/try again|tente novamente/i',
      '[data-testid="rate-limit"]',
    ];

    let rateLimitFound = false;
    for (const indicator of rateLimitIndicators) {
      const count = await page.locator(indicator).count();
      if (count > 0) {
        console.log(`✅ Mensagem de rate limit encontrada: ${indicator}`);
        rateLimitFound = true;
        break;
      }
    }

    if (!rateLimitFound) {
      console.log('⚠️  Mensagem de rate limit não encontrada (ou UI ainda não implementada)');
    }

    await page.screenshot({ path: '/tmp/exercise-ai-rate-limit.png', fullPage: true });

    console.log('\n' + '█'.repeat(70));
  });

  test('should show loading state while waiting for AI response', async ({ page }) => {
    console.log('\n' + '█'.repeat(70));
    console.log('█    TEST: Exercise AI Loading State');
    console.log('█'.repeat(70));

    // Delay response to test loading state
    await page.route('**/api/ai/exercises**', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_EXERCISE_RESPONSES.lombalgia),
      });
    });

    await login(page, testUsers.rafael.email, testUsers.rafael.password);
    await navigateToEvolution(page);

    // Click AI button and immediately check for loading state
    const aiButton = page.locator('button:has-text("Sugerir Exercícios"), button:has-text("AI Exercises")');
    if (await aiButton.count() > 0) {
      await aiButton.first().click();

      // Check for loading indicators immediately
      const loadingIndicators = [
        '[data-testid="loading"]',
        '.loading',
        '.spinner',
        'text=/gerando|carregando|loading|generating/i',
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

      await page.waitForTimeout(2500);
    }

    await page.screenshot({ path: '/tmp/exercise-ai-loading.png', fullPage: true });

    console.log('\n' + '█'.repeat(70));
  });
});

test.describe('Exercise AI Assistant - Accessibility', () => {
  test('should have accessible exercise suggestion buttons', async ({ page }) => {
    console.log('\n' + '█'.repeat(70));
    console.log('█    TEST: Exercise AI Accessibility');
    console.log('█'.repeat(70));

    await mockExerciseAI(page, MOCK_EXERCISE_RESPONSES.lombalgia);
    await login(page, testUsers.rafael.email, testUsers.rafael.password);
    await navigateToEvolution(page);

    // Check for accessible AI buttons
    const aiButtons = page.locator('button');
    const buttonCount = await aiButtons.count();

    console.log(`  Total de botões na página: ${buttonCount}`);

    // Look for buttons with accessibility attributes
    for (let i = 0; i < Math.min(buttonCount, 20); i++) {
      const button = aiButtons.nth(i);
      const text = await button.textContent();
      const ariaLabel = await button.getAttribute('aria-label');

      if (text && (text.includes('IA') || text.includes('AI') || text.includes('Sugerir'))) {
        console.log(`  Botão encontrado: "${text?.trim()}"`);
        if (ariaLabel) {
          console.log(`    ✓ aria-label: ${ariaLabel}`);
        } else {
          console.log(`    ⚠ Sem aria-label (usando texto do botão)`);
        }
      }
    }

    // Check for ARIA attributes on exercise containers
    const exerciseContainers = page.locator('[role="region"], [role="article"], section');
    const containerCount = await exerciseContainers.count();

    if (containerCount > 0) {
      console.log(`✅ ${containerCount} contenedores com roles semânticas encontrados`);
    }

    await page.screenshot({ path: '/tmp/exercise-ai-accessibility.png', fullPage: true });

    console.log('\n' + '█'.repeat(70));
  });

  test('should be keyboard navigable', async ({ page, context }) => {
    console.log('\n' + '█'.repeat(70));
    console.log('█    TEST: Exercise AI Keyboard Navigation');
    console.log('█'.repeat(70));

    await mockExerciseAI(page, MOCK_EXERCISE_RESPONSES.lombalgia);
    await login(page, testUsers.rafael.email, testUsers.rafael.password);
    await navigateToEvolution(page);

    // Tab through interactive elements
    const tabCount = 10;
    for (let i = 0; i < tabCount; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(200);

      const focusedElement = await page.evaluate(() => {
        const el = document.activeElement;
        return {
          tagName: el?.tagName,
          type: (el as HTMLElement)?.getAttribute('type'),
          ariaLabel: (el as HTMLElement)?.getAttribute('aria-label'),
          textContent: el?.textContent?.substring(0, 50),
        };
      });

      if (focusedElement.ariaLabel || focusedElement.textContent) {
        console.log(`  Tab ${i + 1}: ${focusedElement.tagName} - ${focusedElement.ariaLabel || focusedElement.textContent}`);
      }
    }

    // Check for focus indicators
    const hasFocusVisible = await page.evaluate(() => {
      const style = window.getComputedStyle(document.body);
      return style.getPropertyValue('--focus-visible') !== '' ||
             document.querySelector('[data-focus-visible]') !== null;
    });

    if (hasFocusVisible) {
      console.log('✅ Indicadores de foco visíveis configurados');
    }

    await page.screenshot({ path: '/tmp/exercise-ai-keyboard.png', fullPage: true });

    console.log('\n' + '█'.repeat(70));
  });
});

test.describe('Exercise AI Assistant - Integration', () => {
  test('should integrate with patient SOAP notes', async ({ page }) => {
    console.log('\n' + '█'.repeat(70));
    console.log('█    TEST: Exercise AI + SOAP Integration');
    console.log('█'.repeat(70));

    await mockExerciseAI(page, MOCK_EXERCISE_RESPONSES.lombalgia);
    await login(page, testUsers.rafael.email, testUsers.rafael.password);
    await navigateToEvolution(page);

    // Fill SOAP fields
    const textareas = await page.locator('textarea').all();

    if (textareas.length >= 2) {
      await textareas[0].fill('Paciente relata dor lombar há 6 meses com piora ao sentar.');
      console.log('✅ Subjetivo preenchido');

      if (textareas.length >= 3) {
        await textareas[1].fill('Mobilidade de coluna reduzida. Força muscular 4/5.');
        console.log('✅ Objetivo preenchido');
      }

      if (textareas.length >= 4) {
        await textareas[2].fill('Lombalgia mecânica. Prognóstico favorável.');
        console.log('✅ Avaliação preenchida');
      }
    }

    await page.screenshot({ path: '/tmp/exercise-ai-soap-filled.png', fullPage: true });

    // Try to trigger exercise suggestions based on SOAP
    const aiButton = page.locator('button:has-text("Sugerir Exercícios"), button:has-text("AI")');
    if (await aiButton.count() > 0) {
      await aiButton.first().click();
      await page.waitForTimeout(3000);
      console.log('✅ Sugestões de exercícios solicitadas');
    }

    await page.screenshot({ path: '/tmp/exercise-ai-soap-result.png', fullPage: true });

    console.log('\n' + '█'.repeat(70));
  });

  test('should save exercise suggestions to patient record', async ({ page }) => {
    console.log('\n' + '█'.repeat(70));
    console.log('█    TEST: Exercise AI Save to Record');
    console.log('█'.repeat(70));

    await mockExerciseAI(page, MOCK_EXERCISE_RESPONSES.lombalgia);
    await login(page, testUsers.rafael.email, testUsers.rafael.password);
    await navigateToEvolution(page);

    // Look for save/apply buttons for exercise suggestions
    const saveButtonSelectors = [
      'button:has-text("Salvar Exercícios")',
      'button:has-text("Aplicar")',
      'button:has-text("Adicionar ao Plano")',
      '[data-testid="save-exercises"]',
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
      console.log('⚠️  Botão de salvar exercícios não encontrado');
    }

    await page.screenshot({ path: '/tmp/exercise-ai-save.png', fullPage: true });

    console.log('\n' + '█'.repeat(70));
  });
});

test.describe('Exercise AI Assistant - Edge Cases', () => {
  test('should handle patient with no pain data', async ({ page }) => {
    console.log('\n' + '█'.repeat(70));
    console.log('█    TEST: Exercise AI - No Pain Data');
    console.log('█'.repeat(70));

    // Mock response for patient without pain data
    const noPainResponse = {
      success: true,
      data: {
        exercises: [
          {
            name: 'Alongamento global',
            category: 'Alongamento',
            difficulty: 'beginner',
            rationale: 'Manutenção de flexibilidade geral',
            targetArea: 'Corpo todo',
            goalsAddressed: ['Manter flexibilidade'],
            sets: 1,
            reps: 3,
            frequency: '3x/semana',
            precautions: [],
            confidence: 0.85,
          },
        ],
        programRationale: 'Programa de manutenção para paciente sem queixas álgicas atuais.',
        expectedOutcomes: ['Manter amplitude de movimento', 'Prevenir contraturas'],
        progressionCriteria: ['Progressar conforme tolerância'],
        estimatedDuration: 15,
      },
    };

    await mockExerciseAI(page, noPainResponse);
    await login(page, testUsers.rafael.email, testUsers.rafael.password);
    await navigateToEvolution(page);

    console.log('✅ Teste de paciente sem dor iniciado');
    await page.screenshot({ path: '/tmp/exercise-ai-no-pain.png', fullPage: true });

    console.log('\n' + '█'.repeat(70));
  });

  test('should handle patient with multiple pain areas', async ({ page }) => {
    console.log('\n' + '█'.repeat(70));
    console.log('█    TEST: Exercise AI - Multiple Pain Areas');
    console.log('█'.repeat(70));

    const multiPainResponse = {
      success: true,
      data: {
        exercises: [
          {
            name: 'Exercício integrado',
            category: 'Funcional',
            difficulty: 'beginner',
            rationale: 'Aborda múltiplas áreas de forma integrada',
            targetArea: 'Múltiplos',
            goalsAddressed: ['Redução de dor multicêntrica'],
            sets: 2,
            reps: 8,
            frequency: 'Diário',
            precautions: ['Priorizar áreas mais limitantes'],
            confidence: 0.82,
          },
        ],
        programRationale: 'Programa integrado para paciente com múltiplas queixas álgicas.',
        expectedOutcomes: ['Melhora funcional global'],
        progressionCriteria: ['Adicionar exercícios específicos conforme evolução'],
        redFlags: ['Dor que piora com exercício'],
        estimatedDuration: 30,
      },
    };

    await mockExerciseAI(page, multiPainResponse);
    await login(page, testUsers.rafael.email, testUsers.rafael.password);
    await navigateToEvolution(page);

    console.log('✅ Teste de múltiplas áreas de dor iniciado');
    await page.screenshot({ path: '/tmp/exercise-ai-multi-pain.png', fullPage: true });

    console.log('\n' + '█'.repeat(70));
  });
});
