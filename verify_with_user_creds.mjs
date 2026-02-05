import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Configuração
const PROJECT_ID = 'fisioflow-migration';
const REGION = 'southamerica-east1';
const WEB_API_KEY = 'AIzaSyCz2c3HvQoV7RvFCbCaudbEEelEQaO-tY8'; 
const FUNCTION_URL = `https://generateexerciseplan-tfecm5cqoq-rj.a.run.app`;

// Credenciais fornecidas
const EMAIL = 'rafael.minatto@yahoo.com.br';
const PASSWORD = 'Yukari30@';

async function testWithUserCredentials() {
    console.log('🚀 Iniciando teste com credenciais de usuário...');

    // 1. Fazer Login (SignInWithPassword)
    console.log(`\n🔐 1. Logando com ${EMAIL}...`);
    
    try {
        const loginResponse = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${WEB_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: EMAIL,
                password: PASSWORD,
                returnSecureToken: true
            })
        });

        const loginData = await loginResponse.json();

        if (!loginResponse.ok) {
            throw new Error(`Erro no Login: ${loginData.error?.message || loginResponse.statusText}`);
        }

        const idToken = loginData.idToken;
        console.log('✅ Login realizado com sucesso! Token obtido.');

        // 2. Chamar a Função de IA
        console.log('\n🧠 2. Chamando função de IA (Genkit)...');
        
        const input = {
            data: {
                patientName: 'Rafael Minatto',
                age: 35,
                condition: 'Melhoria de Performance',
                painLevel: 0,
                equipment: ['Halteres', 'Elástico'],
                goals: 'Aumentar força e resistência',
                limitations: 'Nenhuma'
            }
        };

        const funcResponse = await fetch(FUNCTION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`
            },
            body: JSON.stringify(input)
        });

        if (!funcResponse.ok) {
            const errorText = await funcResponse.text();
            throw new Error(`Erro na Função (HTTP ${funcResponse.status}): ${errorText}`);
        }

        const data = await funcResponse.json();
        console.log('\n🎉 SUCESSO! A IA respondeu:');
        console.log(JSON.stringify(data.result || data, null, 2));

    } catch (error) {
        console.error('\n❌ FALHA:', error.message);
    }
}

testWithUserCredentials();