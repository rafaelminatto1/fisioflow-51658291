import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

export default async function handler(request: Request) {
    if (request.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
    }

    try {
        const { patientData } = await request.json();

        if (!patientData) {
            return new Response('Missing patientData', { status: 400 });
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const prompt = `
      Você é um assistente clínico de fisioterapia experiente. 
      Analise os seguintes dados do paciente e forneça um resumo clínico curto e direto (máximo 3 bullets) 
      focado em progresso e recomendações.
      
      Dados: ${JSON.stringify(patientData)}
      
      Responda em Português do Brasil.
    `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        return new Response(JSON.stringify({ insight: text }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
        });
    } catch (error) {
        console.error('AI Insight Error:', error);
        return new Response(JSON.stringify({ error: (error as Error).message }), {
            status: 500,
            headers: { 'content-type': 'application/json' },
        });
    }
}
