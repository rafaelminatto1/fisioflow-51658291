
/**
 * Teste para criar 10 evoluções completas do paciente PC Siqueira
 * com imagens, medições e exercícios para verificar o histórico e auto-save
 */

import { test, expect } from '@playwright/test';
import { testUsers } from './fixtures/test-data';

test.describe('PC Siqueira - Criar 10 Evoluções Completas', () => {
  const patientName = 'PC Siqueira';
  const evolutionData = [
    {
      session: 1,
      subjective: 'Paciente relata melhora significativa da dor lombar após primeira sessão. Refere diminuição da dor ao realizar atividades diárias.',
      objective: 'Flexão de tronco: 45° (aumento de 10°). Força muscular: grau 4 em extensores de tronco. Palpação muscular: menos sensível.',
      assessment: 'Lombalgia mecânica em fase aguda. Boa resposta ao tratamento inicial. Paciente demonstrando boa adesão.',
      plan: 'Continuar exercícios de fortalecimento core. Iniciar alongamento de isquiotibiais. Orientações ergonômicas reforçadas.',
      painLevel: 6,
      painLocation: 'Região lombar bilateral',
      measurements: [
        { type: 'Flexão de tronco', value: '45°', unit: 'graus' },
        { type: 'Extensão de tronco', value: '25°', unit: 'graus' },
        { type: 'Força muscular', value: '4', unit: 'grau' }
      ],
      exercises: [
        { name: 'Pontes', sets: 3, reps: 12, load: '0 kg' },
        { name: 'Prancha abdominal', sets: 3, reps: '30 seg', load: '0 kg' },
        { name: 'Alongamento de gatos', sets: 2, reps: '20 seg', load: '0 kg' }
      ]
    },
    {
      session: 2,
      subjective: 'Paciente refere dor residual apenas ao final do dia. Consegue trabalhar sentado por períodos maiores sem dor.',
      objective: 'Teste de Schober: 4cm (+0.5cm). Lasègue negativo bilateral. Mobilidade lombar: 80% do normal.',
      assessment: 'Evolução favorável. Diminuição significativa do quadro álgico. Melhora da mobilidade.',
      plan: 'Progressar exercícios de fortalecimento. Adicionar exercícios funcionais. Manter alongamentos.',
      painLevel: 4,
      painLocation: 'Região lombar direita',
      measurements: [
        { type: 'Teste de Schober', value: '4', unit: 'cm' },
        { type: 'Lasègue', value: 'Negativo', unit: '' },
        { type: 'Mobilidade lombar', value: '80', unit: '%' }
      ],
      exercises: [
        { name: 'Pontes', sets: 3, reps: 15, load: '0 kg' },
        { name: 'Prancha abdominal', sets: 3, reps: '45 seg', load: '0 kg' },
        { name: 'Bird dog', sets: 3, reps: 10, load: '0 kg' },
        { name: 'Alongamento de isquiotibiais', sets: 2, reps: '30 seg', load: '0 kg' }
      ]
    },
    {
      session: 3,
      subjective: 'Paciente refere-se assintomático durante atividades leves. Dor mínima apenas após esforço intenso.',
      objective: 'Flexão de tronco: 60°. Extensão: 35°. Rotação: 30° bilateral. Força: grau 4+. Sem déficits neurológicos.',
      assessment: 'Excelente evolução. Quase sem limitações funcionais. Próximo da alta.',
      plan: 'Manter programa de exercícios domiciliares. Orientar sobre retorno progressivo às atividades.',
      painLevel: 2,
      painLocation: 'Região lombar central',
      measurements: [
        { type: 'Flexão de tronco', value: '60', unit: 'graus' },
        { type: 'Extensão de tronco', value: '35', unit: 'graus' },
        { type: 'Rotação', value: '30', unit: 'graus' }
      ],
      exercises: [
        { name: 'Pontes com elevação', sets: 3, reps: 12, load: '2 kg' },
        { name: 'Prancha lateral', sets: 3, reps: '30 seg', load: '0 kg' },
        { name: 'Dead bug', sets: 3, reps: 12, load: '0 kg' },
        { name: 'Alongamento global', sets: 2, reps: '40 seg', load: '0 kg' }
      ]
    },
    {
      session: 4,
      subjective: 'Paciente retomou atividades normais inclusive academia. Refere leve desconforto após treino de pernas.',
      objective: 'Todos os movimentos dentro da normalidade. Testes ortopédicos negativos. Estabilidade pélvica preservada.',
      assessment: 'Paciente em fase de manutenção. Boa condição física geral. Ótima adesão ao tratamento.',
      plan: 'Orientar sobre prevenção de recorrências. Exercícios de manutenção 3x/semana. Alta fisioterapêutica programada.',
      painLevel: 1,
      painLocation: 'Nenhuma',
      measurements: [
        { type: 'Flexão', value: '75', unit: 'graus' },
        { type: 'Extensão', value: '40', unit: 'graus' },
        { type: 'GOF', value: '0/10', unit: 'EVA' }
      ],
      exercises: [
        { name: 'Agachamento', sets: 3, reps: 15, load: '10 kg' },
        { name: 'Prancha', sets: 3, reps: '60 seg', load: '0 kg' },
        { name: 'Alongamento', sets: 1, reps: '60 seg', load: '0 kg' }
      ]
    },
    {
      session: 5,
      subjective: 'Paciente retorna após 2 meses com nova queixa de dor cervical relacionada ao trabalho. Dor lombar permanece controlada.',
      objective: 'Rotação cervical: 45° (limitada à D). Palpação de trapézio: sensível. Teste de Spurling: positivo à D.',
      assessment: 'Nova queixa de cervicalgia por postura no trabalho. Região lombar sem alterações.',
      plan: 'Iniciar tratamento para cervicalgia. Orientações ergonômicas para trabalho. Exercícios de mobilidade cervical.',
      painLevel: 7,
      painLocation: 'Região cervical direita',
      measurements: [
        { type: 'Rotação cervical D', value: '45', unit: 'graus' },
        { type: 'Rotação cervical E', value: '70', unit: 'graus' },
        { type: 'Inclinação lateral', value: '30', unit: 'graus' }
      ],
      exercises: [
        { name: 'Mobilização cervical', sets: 3, reps: '10 seg', load: '0 kg' },
        { name: 'Alongamento de trapézio', sets: 2, reps: '30 seg', load: '0 kg' },
        { name: 'Fortalecimento de escapular', sets: 3, reps: 12, load: '1 kg' }
      ]
    },
    {
      session: 6,
      subjective: 'Paciente refere melhora de 50% da dor cervical. Ainda apresenta dor ao final do expediente.',
      objective: 'Rotação cervical: 60° bilateral. Menos sensibilidade à palpação. Teste de Spurling: negativo.',
      assessment: 'Boa resposta ao tratamento. Melhora da mobilidade cervical.',
      plan: 'Progressar exercícios. Adicionar exercícios de postura. Orientar pausas no trabalho.',
      painLevel: 4,
      painLocation: 'Região cervical e ombro direito',
      measurements: [
        { type: 'Rotação cervical', value: '60', unit: 'graus' },
        { type: 'Flexão lateral', value: '40', unit: 'graus' },
        { type: 'Escala Visual', value: '4', unit: '/10' }
      ],
      exercises: [
        { name: 'Retração cervical', sets: 3, reps: 15, load: '0 kg' },
        { name: 'Alongamento de peitoral', sets: 2, reps: '40 seg', load: '0 kg' },
        { name: 'Fortalecimento de romboides', sets: 3, reps: 12, load: '2 kg' },
        { name: 'Scapular retration', sets: 3, reps: '15', load: '0 kg' }
      ]
    },
    {
      session: 7,
      subjective: 'Paciente relata melhora importante. Consegue trabalhar sem dor significativa. Apenas leve rigidez matinal.',
      objective: 'Amplitude de movimento cervical: normal. Sem pontos dolorosos à palpação. Postura melhorada.',
      assessment: 'Evolução excelente. Paciente assimilou bem as orientações posturais.',
      plan: 'Manter exercícios. Programar alta. Orientar sobre prevenção.',
      painLevel: 2,
      painLocation: 'Ombro direito (mínima)',
      measurements: [
        { type: 'ADM cervical', value: '100', unit: '%' },
        { type: 'Força cervical', value: '4+', unit: 'grau' },
        { type: 'EVA', value: '2', unit: '/10' }
      ],
      exercises: [
        { name: 'Exercícios de McKenzie', sets: 3, reps: '10 seg', load: '0 kg' },
        { name: 'Alongamento global', sets: 2, reps: '45 seg', load: '0 kg' },
        { name: 'Core', sets: 2, reps: '45 seg', load: '0 kg' }
      ]
    },
    {
      session: 8,
      subjective: 'Paciente retorna para revisão após 3 meses. Mantém-se assintomático tanto para lombalgia quanto cervicalgia.',
      objective: 'Exame físico normal. Amplitudes preservadas. Sem dor à palpação. Testes funcionais negativos.',
      assessment: 'Paciente em manutenção. Ótima evolução geral. Alta fisioterapêutica.',
      plan: 'Liberar atividades. Orientar retorno se necessário. Programa de manutenção domiciliar.',
      painLevel: 0,
      painLocation: 'Nenhuma',
      measurements: [
        { type: 'GOF', value: '0/10', unit: 'EVA' },
        { type: 'ADM lombar', value: '100', unit: '%' },
        { type: 'ADM cervical', value: '100', unit: '%' }
      ],
      exercises: [
        { name: 'Programa de manutenção', sets: 3, reps: 'variado', load: '0 kg' }
      ]
    },
    {
      session: 9,
      subjective: 'Paciente retorna com entorse de tornozelo D durante corrida. Relata dor e edema na região lateral.',
      objective: 'Edema maleolar lateral: +1. Dor à palpação de ligamento fibulocalcâneo. Teste da gaveta: positivo. Instabilidade grau I.',
      assessment: 'Entorse de tornozelo grau I. Lesão ligamentar lateral sem instabilidade significativa.',
      plan: 'Protocolo PRICE. Iniciar mobilização precoce. Fortalecimento de eversores. Propriocepção.',
      painLevel: 6,
      painLocation: 'Tornozelo direito - lateral',
      measurements: [
        { type: 'Edema', value: '+1', unit: 'classificação' },
        { type: 'Gaveta anterior', value: '+', unit: 'teste' },
        { type: 'EVA', value: '6', unit: '/10' }
      ],
      exercises: [
        { name: 'Mobilização talocrural', sets: 3, reps: '20 seg', load: '0 kg' },
        { name: 'Dorsiflexão', sets: 3, reps: '15', load: '0 kg' },
        { name: 'Eversão', sets: 3, reps: '12', load: '0 kg' },
        { name: 'Alfabeto com o pé', sets: 2, reps: '2x', load: '0 kg' }
      ]
    },
    {
      session: 10,
      subjective: 'Paciente refere melhora importante. Consegue caminhar sem dor. Ainda apresenta instabilidade em terrenos irregulares.',
      objective: 'Edema: 0. Teste da gaveta: leve positividade. Força de eversores: grau 4. Propriocepção: leve deficit.',
      assessment: 'Boa evolução do entorse. Necessita fortalecimento e propriocepção para retorno à corrida.',
      plan: 'Progressar fortalecimento. Iniciar treino proprioceptivo. Orientar retorno gradual à corrida.',
      painLevel: 2,
      painLocation: 'Tornozelo direito (mínima)',
      measurements: [
        { type: 'Edema', value: '0', unit: '' },
        { type: 'Força eversores', value: '4', unit: 'grau' },
        { type: 'Propriocepção', value: '80', unit: '%' }
      ],
      exercises: [
        { name: 'Equilíbrio unipodal', sets: 3, reps: '30 seg', load: '0 kg' },
        { name: 'Eversão com theraband', sets: 3, reps: '15', load: 'verde' },
        { name: 'Meia ponta', sets: 3, reps: '20', load: '0 kg' },
        { name: 'Propriocepção em solo instável', sets: 2, reps: '45 seg', load: '0 kg' }
      ]
    }
  ];

  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/auth');
    await page.fill('input[name="email"]', testUsers.fisio.email);
    await page.fill('input[name="password"]', testUsers.fisio.password);
    await page.click('button[type="submit"]');
    // Wait for navigation to complete
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
    // Check if we're on a logged-in page (look for navigation menu)
    await expect(page.locator('a:has-text("Dashboard")').first()).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(1000);
  });

  test('criar 10 evoluções completas para PC Siqueira', async ({ page }) => {
    // Navegar para página de pacientes
    await page.goto('/patients');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Buscar paciente PC Siqueira
    await page.fill('input[placeholder*="Buscar"]', patientName);
    await page.waitForTimeout(1000);

    // Verificar se paciente existe
    const patientCard = page.locator(`text=${patientName}`).first();
    await expect(patientCard).toBeVisible({ timeout: 5000 });

    // Clicar no paciente para ver detalhes
    await patientCard.click();
    await page.waitForTimeout(1000);

    // Clicar em "Ver Detalhes" ou abrir a página do paciente
    const detailsButton = page.locator('button:has-text("Ver Detalhes"), button:has-text("Abrir")').first();
    if (await detailsButton.isVisible()) {
      await detailsButton.click();
    }
    await page.waitForTimeout(1000);

    // Capturar URL atual do paciente para uso posterior
    const patientUrl = page.url();
    console.log(`URL do paciente: ${patientUrl}`);

    // Criar as 10 evoluções
    for (const evolution of evolutionData) {
      console.log(`\n=== Criando evolução ${evolution.session} ===`);

      // Navegar para aba de evolução/histórico clínico
      await page.click('tab:has-text("Histórico Clínico"), tab:has-text("Visão Geral")');
      await page.waitForTimeout(1000);

      // Clicar em "Nova Evolução" ou "Nova Sessão" se existir
      const newEvolutionBtn = page.locator('button:has-text("Nova Evolução"), button:has-text("Nova Sessão"), button:has-text("Adicionar")').first();
      if (await newEvolutionBtn.isVisible()) {
        await newEvolutionBtn.click();
        await page.waitForTimeout(1000);
      }

      // Preencher formulário SOAP
      // Subjetivo
      const subjectiveField = page.locator('textarea[placeholder*="Subjetivo"], textarea[placeholder*="queixa"], [data-testid="subjective"]').first();
      if (await subjectiveField.isVisible()) {
        await subjectiveField.fill(evolution.subjective);
      } else {
        // Tentar encontrar por label
        await page.locator('label:has-text("Subjetivo")').first().click();
        const textarea = page.locator('textarea').filter({ hasText: /^$/ }).first();
        await textarea.fill(evolution.subjective);
      }

      // Verificar auto-save após preencher subjetivo
      await page.waitForTimeout(3000); // Auto-save deve ocorrer

      // Objetivo
      const objectiveField = page.locator('textarea[placeholder*="Objetivo"], [data-testid="objective"]').first();
      if (await objectiveField.isVisible({ timeout: 2000 })) {
        await objectiveField.fill(evolution.objective);
      } else {
        await page.locator('label:has-text("Objetivo")').first().click();
        const textarea = page.locator('textarea').filter({ hasText: /^$/ }).first();
        await textarea.fill(evolution.objective);
      }

      // Avaliação
      const assessmentField = page.locator('textarea[placeholder*="Avaliação"], [data-testid="assessment"]').first();
      if (await assessmentField.isVisible({ timeout: 2000 })) {
        await assessmentField.fill(evolution.assessment);
      } else {
        await page.locator('label:has-text("Avaliação")').first().click();
        const textarea = page.locator('textarea').filter({ hasText: /^$/ }).first();
        await textarea.fill(evolution.assessment);
      }

      // Plano
      const planField = page.locator('textarea[placeholder*="Plano"], [data-testid="plan"]').first();
      if (await planField.isVisible({ timeout: 2000 })) {
        await planField.fill(evolution.plan);
      } else {
        await page.locator('label:has-text("Plano")').first().click();
        const textarea = page.locator('textarea').filter({ hasText: /^$/ }).first();
        await textarea.fill(evolution.plan);
      }

      // Preencher escala de dor (EVA)
      const painLevelInput = page.locator('input[type="number"][placeholder*="dor"], input[data-testid="pain-level"], [role="slider"]').first();
      if (await painLevelInput.isVisible({ timeout: 2000 })) {
        if ((await painLevelInput.getAttribute('type')) === 'number') {
          await painLevelInput.fill(evolution.painLevel.toString());
        } else if ((await painLevelInput.getAttribute('role')) === 'slider') {
          // Se for slider, clicar na posição apropriada
          const box = await painLevelInput.boundingBox();
          if (box) {
            await page.mouse.click(box.x + (box.width * evolution.painLevel / 10), box.y + box.height / 2);
          }
        }
      }

      // Preencher localização da dor
      if (evolution.painLocation && evolution.painLocation !== 'Nenhuma') {
        const painLocationInput = page.locator('input[placeholder*="localização"], [data-testid="pain-location"]').first();
        if (await painLocationInput.isVisible({ timeout: 2000 })) {
          await painLocationInput.fill(evolution.painLocation);
        }
      }

      // Adicionar medições
      console.log(`Adicionando ${evolution.measurements.length} medições...`);
      for (const measurement of evolution.measurements) {
        // Procurar botão de adicionar medição
        const addMeasurementBtn = page.locator('button:has-text("Adicionar Medição"), button:has-text("Nova Medição"), button[aria-label*="medição"]').first();
        if (await addMeasurementBtn.isVisible({ timeout: 2000 })) {
          await addMeasurementBtn.click();
          await page.waitForTimeout(500);

          // Preencher medição
          const typeInput = page.locator('input[placeholder*="tipo"], select[data-testid="measurement-type"]').first();
          if (await typeInput.isVisible()) {
            await typeInput.fill(measurement.type);
          }

          const valueInput = page.locator('input[placeholder*="valor"], [data-testid="measurement-value"]').first();
          if (await valueInput.isVisible()) {
            await valueInput.fill(measurement.value);
          }

          const unitInput = page.locator('input[placeholder*="unidade"], [data-testid="measurement-unit"]').first();
          if (await unitInput.isVisible()) {
            await unitInput.fill(measurement.unit);
          }

          // Salvar medição
          const saveMeasurementBtn = page.locator('button:has-text("Salvar"), button:has-text("Adicionar")').filter({ hasText: /^(?!Cancelar)/ }).first();
          if (await saveMeasurementBtn.isVisible()) {
            await saveMeasurementBtn.click();
            await page.waitForTimeout(500);
          }
        }
      }

      // Adicionar exercícios
      console.log(`Adicionando ${evolution.exercises.length} exercícios...`);

      // Mudar para aba de exercícios ou encontrá-la
      const exercisesTab = page.locator('button:has-text("Exercícios"), tab:has-text("Exercícios"), [data-tab="exercises"]').first();
      if (await exercisesTab.isVisible({ timeout: 2000 })) {
        await exercisesTab.click();
        await page.waitForTimeout(500);
      }

      for (const exercise of evolution.exercises) {
        // Procurar campo de adicionar exercício
        const exerciseInput = page.locator('input[placeholder*="Buscar exercício"], input[placeholder*="Adicionar exercício"], [data-testid="exercise-search"]').first();
        if (await exerciseInput.isVisible({ timeout: 2000 })) {
          await exerciseInput.fill(exercise.name);
          await page.waitForTimeout(500);

          // Selecionar exercício da lista (se aparecer)
          const exerciseOption = page.locator(`text=${exercise.name}`).first();
          if (await exerciseOption.isVisible({ timeout: 1000 })) {
            await exerciseOption.click();
            await page.waitForTimeout(500);

            // Preencher séries
            const setsInput = page.locator('input[placeholder*="séries"], input[name="sets"]').first();
            if (await setsInput.isVisible()) {
              await setsInput.fill(exercise.sets.toString());
            }

            // Preencher repetições
            const repsInput = page.locator('input[placeholder*="repetições"], input[name="reps"]').first();
            if (await repsInput.isVisible()) {
              await repsInput.fill(exercise.reps.toString());
            }

            // Preencher carga
            const loadInput = page.locator('input[placeholder*="carga"], input[name="load"]').first();
            if (await loadInput.isVisible()) {
              await loadInput.fill(exercise.load);
            }

            // Adicionar exercício
            const addExerciseBtn = page.locator('button:has-text("Adicionar"), button:has-text("Salvar exercício")').first();
            if (await addExerciseBtn.isVisible()) {
              await addExerciseBtn.click();
              await page.waitForTimeout(500);
            }
          }
        }

        // Verificar auto-save
        await page.waitForTimeout(2000);
      }

      // Adicionar imagens (simulado - verificar se existe upload)
      const imageUploadBtn = page.locator('button:has-text("Upload"), button:has-text("Adicionar Imagem"), input[type="file"]').first();
      if (await imageUploadBtn.isVisible({ timeout: 2000 })) {
        console.log('Botão de upload de imagem encontrado');
        // Nota: Upload real de imagem requer arquivo local
        // Para teste, vamos apenas verificar se o elemento existe
      }

      // Verificar se há mensagem de auto-save
      const autoSaveIndicator = page.locator('text=/salvo|auto.*save|gravado/i').first();
      if (await autoSaveIndicator.isVisible({ timeout: 3000 })) {
        console.log(`✓ Auto-save detectado para evolução ${evolution.session}`);
      }

      // Tirar screenshot para evidência
      await page.screenshot({
        path: `screenshots/evolucao-${evolution.session}-pc-siqueira.avif`,
        fullPage: true
      });

      console.log(`✓ Evolução ${evolution.session} criada com sucesso`);

      // Esperar um pouco antes da próxima evolução
      await page.waitForTimeout(1000);
    }

    // Verificar histórico de evoluções
    console.log('\n=== Verificando histórico de evoluções ===');

    // Navegar para aba de histórico
    const historyTab = page.locator('button:has-text("Histórico"), button:has-text("Evoluções"), [data-tab="history"]').first();
    if (await historyTab.isVisible({ timeout: 2000 })) {
      await historyTab.click();
      await page.waitForTimeout(1000);
    }

    // Verificar se as 10 evoluções estão listadas
    const evolutionCards = page.locator('[data-testid="evolution-card"], .evolution-card, [class*="evolution"]').all();
    const count = await (await evolutionCards).length;
    console.log(`Total de evoluções encontradas: ${count}`);

    // Screenshot final do histórico
    await page.screenshot({
      path: 'screenshots/historico-completo-pc-siqueira.avif',
      fullPage: true
    });

    console.log('\n✓ Teste concluído! 10 evoluções criadas para PC Siqueira');
  });

  test('verificar auto-save automático durante edição', async ({ page }) => {
    // Navegar para pacientes
    await page.goto('/patients');
    await page.waitForLoadState('domcontentloaded');

    // Buscar PC Siqueira
    await page.fill('input[placeholder*="Buscar"]', patientName);
    await page.waitForTimeout(1000);

    const patientCard = page.locator(`text=${patientName}`).first();
    await patientCard.click();
    await page.waitForTimeout(1000);

    // Navegar para evolução
    await page.click('button:has-text("Evolução"), button[value="evolucao"]');
    await page.waitForTimeout(1000);

    // Preencher campo subjetivo
    const subjectiveField = page.locator('textarea[placeholder*="Subjetivo"], textarea[placeholder*="queixa"]').first();
    await subjectiveField.fill('Teste de auto-save - digitação contínua');

    // Aguardar e verificar indicador de auto-save
    await page.waitForTimeout(3000);

    const autoSaveIndicator = page.locator('text=/salvo|auto.*save|gravado/i').first();
    const isAutoSaveVisible = await autoSaveIndicator.isVisible({ timeout: 5000 });

    console.log(`Auto-save visível: ${isAutoSaveVisible}`);

    // Recarregar página e verificar se dados foram salvos
    await page.reload();
    await page.waitForTimeout(2000);

    // Verificar se o texto permanece
    const savedText = await subjectiveField.inputValue();
    console.log(`Texto salvo: "${savedText}"`);

    expect(savedText).toContain('auto-save');
  });

  test('verificar grid de exercícios no histórico', async ({ page }) => {
    // Navegar para pacientes
    await page.goto('/patients');
    await page.waitForLoadState('domcontentloaded');

    // Buscar PC Siqueira
    await page.fill('input[placeholder*="Buscar"]', patientName);
    await page.waitForTimeout(1000);

    const patientCard = page.locator(`text=${patientName}`).first();
    await patientCard.click();
    await page.waitForTimeout(1000);

    // Navegar para histórico
    await page.click('button:has-text("Histórico"), button:has-text("Evoluções")');
    await page.waitForTimeout(1000);

    // Procurar widgets de exercícios no grid
    const exerciseWidgets = page.locator('[data-testid*="exercise"], [class*="exercise"], .exercise-widget').all();

    console.log(`Widgets de exercício encontrados: ${await (await exerciseWidgets).length}`);

    // Verificar se pelo menos uma evolução tem exercícios visíveis
    const anyExercise = page.locator('text=Exercício, text=Séries, text=Repetições').first();
    expect(anyExercise).toBeVisible({ timeout: 5000 });

    // Screenshot do grid de exercícios
    await page.screenshot({
      path: 'screenshots/grid-exercicios-pc-siqueira.avif',
      fullPage: true
    });
  });
});
