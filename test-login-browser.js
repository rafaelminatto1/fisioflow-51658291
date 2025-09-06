// Script para testar login no console do navegador
console.log('🔧 Iniciando teste de login no navegador...');

// Função para testar login
async function testarLogin() {
    try {
        // Verificar se os elementos existem
        const emailInput = document.querySelector('input[type="email"]');
        const passwordInput = document.querySelector('input[type="password"]');
        const submitButton = document.querySelector('button[type="submit"]');
        
        console.log('📋 Elementos encontrados:');
        console.log('  Email input:', !!emailInput);
        console.log('  Password input:', !!passwordInput);
        console.log('  Submit button:', !!submitButton);
        
        if (!emailInput || !passwordInput || !submitButton) {
            console.error('❌ Elementos do formulário não encontrados!');
            return;
        }
        
        // Preencher campos
        emailInput.value = 'teste@fisioflow.com';
        passwordInput.value = 'teste123';
        
        console.log('✅ Campos preenchidos');
        console.log('  Email:', emailInput.value);
        console.log('  Password:', passwordInput.value.replace(/./g, '*'));
        
        // Disparar eventos
        emailInput.dispatchEvent(new Event('input', { bubbles: true }));
        passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
        
        console.log('🔄 Clicando no botão de submit...');
        
        // Aguardar um pouco e clicar
        setTimeout(() => {
            submitButton.click();
            console.log('✅ Botão clicado!');
            
            // Verificar mudanças após 3 segundos
            setTimeout(() => {
                console.log('🔍 Verificando resultado após 3s...');
                console.log('  URL atual:', window.location.href);
                console.log('  Título da página:', document.title);
                
                // Verificar se há mensagens de erro
                const errorElements = document.querySelectorAll('[class*="error"], [class*="alert"], .text-red-500');
                if (errorElements.length > 0) {
                    console.log('⚠️ Possíveis erros encontrados:');
                    errorElements.forEach((el, i) => {
                        console.log(`  ${i + 1}:`, el.textContent.trim());
                    });
                } else {
                    console.log('✅ Nenhum erro visível encontrado');
                }
            }, 3000);
        }, 1000);
        
    } catch (error) {
        console.error('💥 Erro durante o teste:', error);
    }
}

// Executar teste automaticamente após 2 segundos
setTimeout(() => {
    console.log('🚀 Iniciando teste automático...');
    testarLogin();
}, 2000);

console.log('📝 Para executar manualmente, digite: testarLogin()');