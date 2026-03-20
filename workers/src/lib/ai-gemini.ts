export async function callGemini(apiKey: string, prompt: string, model: string = 'gemini-1.5-flash', gatewayUrl?: string) {
  // Se houver um Gateway da Cloudflare configurado, roteia por ele para aproveitar cache e logs (economia de tokens)
  const baseUrl = gatewayUrl 
    ? `${gatewayUrl}/google-ai-studio` 
    : 'https://generativelanguage.googleapis.com';

  const url = `${baseUrl}/v1beta/models/${model}:generateContent?key=${apiKey}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      }
    })
  });

  if (!response.ok) {
    const error = await response.json() as any;
    throw new Error(error.error?.message || 'Failed to call Gemini AI');
  }

  const result = await response.json() as any;
  return result.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

export async function transcribeAudioWithGemini(apiKey: string, audioBase64: string, mimeType: string, gatewayUrl?: string) {
  const baseUrl = gatewayUrl 
    ? `${gatewayUrl}/google-ai-studio` 
    : 'https://generativelanguage.googleapis.com';

  const url = `${baseUrl}/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: "Por favor, transcreva este áudio de uma consulta de fisioterapia. Foque em capturar os termos clínicos e queixas do paciente com precisão. Retorne apenas o texto transcrito." },
          {
            inline_data: {
              mime_type: mimeType,
              data: audioBase64
            }
          }
        ]
      }]
    })
  });

  if (!response.ok) {
    const error = await response.json() as any;
    throw new Error(error.error?.message || 'Failed to transcribe audio with Gemini');
  }

  const result = await response.json() as any;
  return result.candidates?.[0]?.content?.parts?.[0]?.text || '';
}
