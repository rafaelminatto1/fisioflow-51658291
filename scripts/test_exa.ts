import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testExa() {
  const query = "exercício fisioterapia Mobilidade de Coluna site:youtube.com";
  const res = await fetch('https://api.exa.ai/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.EXA_API_KEY || ''
    },
    body: JSON.stringify({
      query,
      numResults: 1
    })
  });
  
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}

testExa();
