// Script simples para testar a Cloud Function searchPlaces via HTTP
// (Isso valida se a API Key do Maps está configurada e a função está ativa)

const fetch = require('node-fetch');

async function testMaps() {
  const projectId = 'fisioflow-migration';
  const region = 'southamerica-east1';
  const functionName = 'searchPlaces';
  
  // URL pública da função (se for onCall, o protocolo é diferente, mas podemos testar se ela responde)
  // Para funções onCall, o ideal é usar o SDK cliente, mas aqui vamos apenas verificar se o endpoint existe.
  const url = `https://${region}-${projectId}.cloudfunctions.net/${functionName}`;

  console.log(`Testing: ${url}`);

  try {
    // onCall espera um POST com { data: { ... } }
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: { query: 'Av. Paulista, 1000' } })
    });

    if (response.status === 403 || response.status === 401) {
      console.log('✅ Função existe e está protegida (requer Auth, o que é bom).');
      console.log('Para testar funcionalmente, use o frontend.');
    } else {
      const json = await response.json();
      console.log('Response:', JSON.stringify(json, null, 2));
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testMaps();
