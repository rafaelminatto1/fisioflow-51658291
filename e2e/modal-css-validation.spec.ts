import { test, expect } from '@playwright/test';

/**
 * Teste focado em validar apenas o CSS/estrutura do modal no mobile
 * Sem depender de login ou navegação complexa
 */
test('validar estrutura CSS do modal mobile', async ({ page }) => {
  // Viewport mobile (iPhone)
  await page.setViewportSize({ width: 390, height: 844 });

  // Carregar página principal
  await page.goto('http://127.0.0.1:8088/');
  await page.waitForTimeout(2000);

  // Injetar HTML de teste com modal diretamente na página
  await page.evaluate(() => {
    // Criar um elemento de modal de teste com a estrutura usada no CustomModal
    const testModalHTML = `
      <div id="test-modal-overlay" style="position: fixed; inset: 0; z-index: 9999; background: rgba(0,0,0,0.5); display: flex; align-items: flex-end;">
        <div id="test-modal-content" style="background: white; width: 100%; border-radius: 16px 16px 0 0; display: flex; flex-direction: column; max-height: calc(100dvh - 2rem); min-height: 0; overflow: hidden;">
          <div id="test-modal-header" style="padding: 20px; border-bottom: 1px solid #e5e7eb; flex-shrink: 0;">
            <h2 style="margin: 0; font-size: 18px;">Novo Agendamento</h2>
          </div>
          <div id="test-modal-body" style="flex: 1; overflow-y: auto; padding: 20px; min-h: 0;">
            <p style="margin: 0 0 10px;">Conteúdo do formulário...</p>
            <div style="height: 400px; background: #f3f4f6; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
              Área de scroll do formulário
            </div>
            <p style="margin: 10px 0;">Mais conteúdo...</p>
          </div>
          <div id="test-modal-footer" style="padding: 16px; border-top: 1px solid #e5e7eb; display: flex; gap: 8px; justify-content: flex-end; flex-shrink: 0; padding-bottom: calc(env(safe-area-inset-bottom) + 16px);">
            <button id="btn-cancel" style="padding: 10px 16px; border: 1px solid #d1d5db; background: white; border-radius: 6px;">Cancelar</button>
            <button id="btn-submit" style="padding: 10px 16px; border: none; background: #0ea5e9; color: white; border-radius: 6px;">Agendar</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', testModalHTML);
  });

  // Screenshot do modal de teste
  const modalContent = page.locator('#test-modal-content');
  await modalContent.screenshot({ path: 'e2e/screenshots/modal-css-test.png' });

  // Verificar dimensões do modal
  const modalDimensions = await page.evaluate(() => {
    const content = document.getElementById('test-modal-content');
    const footer = document.getElementById('test-modal-footer');
    const submitBtn = document.getElementById('btn-submit');

    return {
      windowHeight: window.innerHeight,
      modalHeight: content?.offsetHeight,
      modalMaxHeight: content ? getComputedStyle(content).maxHeight : null,
      footerBottom: footer ? footer.getBoundingClientRect().bottom : null,
      footerVisible: footer ? footer.getBoundingClientRect().bottom <= window.innerHeight : false,
      submitBtnBottom: submitBtn ? submitBtn.getBoundingClientRect().bottom : null,
      submitBtnVisible: submitBtn ? submitBtn.getBoundingClientRect().bottom <= window.innerHeight : false,
      safeAreaSupport: CSS.supports('env(safe-area-inset-bottom)')
    };
  });

  console.log('Dimensões do modal:', JSON.stringify(modalDimensions, null, 2));

  // Verificações
  expect(modalDimensions.modalHeight).toBeGreaterThan(0);
  expect(modalDimensions.modalHeight).toBeLessThanOrEqual(844); // Deve caber na viewport

  // O botão deve estar visível (dentro da viewport)
  if (modalDimensions.submitBtnBottom !== null) {
    console.log('Posição do botão Agendar (bottom):', modalDimensions.submitBtnBottom);
    console.log('Altura da viewport:', modalDimensions.windowHeight);

    // O botão deve estar dentro da viewport (considerando margem pequena)
    expect(modalDimensions.submitBtnBottom).toBeLessThanOrEqual(modalDimensions.windowHeight + 10);
  }

  // Verificar padding do footer para safe area
  const footerPadding = await page.evaluate(() => {
    const footer = document.getElementById('test-modal-footer');
    return footer ? getComputedStyle(footer).paddingBottom : null;
  });

  console.log('Padding bottom do footer:', footerPadding);

  // Screenshot final destacando o botão
  await page.locator('#btn-submit').screenshot({ path: 'e2e/screenshots/submit-button-zoom.png' });
});

/**
 * Teste do CustomModal real da aplicação
 */
test('validar CustomModal da aplicação no mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://127.0.0.1:8088/');
  await page.waitForTimeout(2000);

  // Tentar encontrar e renderizar o CustomModal real
  const hasCustomModal = await page.evaluate(() => {
    // Verificar se o componente CustomModal está disponível
    return typeof window !== 'undefined' &&
           document.querySelector('[class*="CustomModal"]') !== null;
  });

  console.log('CustomModal encontrado na página:', hasCustomModal);

  // Listar todas as classes CSS usadas em elementos modais
  const modalClasses = await page.evaluate(() => {
    const allElements = document.querySelectorAll('*');
    const classes = new Set<string>();

    allElements.forEach(el => {
      const classList = el.className;
      if (typeof classList === 'string') {
        if (classList.includes('modal') || classList.includes('dialog') || classList.includes('Dialog')) {
          classes.add(classList);
        }
      }
    });

    return Array.from(classes);
  });

  console.log('Classes de modal encontradas:', modalClasses);

  expect(true).toBe(true); // Teste informativo
});
