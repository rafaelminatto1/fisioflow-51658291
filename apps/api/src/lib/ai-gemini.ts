export async function callGemini(
  apiKey: string, 
  prompt: string, 
  model: string = 'gemini-1.5-flash', 
  gatewayUrl?: string,
  gatewayToken?: string,
  context: 'exercise' | 'clinical' | 'general' = 'clinical'
) {
  // Configuração de vanguarda 2026: Cache dinâmico por tipo de uso
  const cacheTtl = context === 'exercise' ? 86400 : 3600; // 24h para exercícios, 1h para clínico
  
  const baseUrl = gatewayUrl 
    ? `${gatewayUrl}/google-ai-studio` 
    : 'https://generativelanguage.googleapis.com';

  const url = `${baseUrl}/v1beta/models/${model}:generateContent?key=${apiKey}`;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Se houver Gateway, adiciona proteção e otimização
  if (gatewayUrl && gatewayToken) {
    headers['Authorization'] = `Bearer ${gatewayToken}`;
    headers['cf-aig-cache-ttl'] = String(cacheTtl);
    headers['cf-aig-metadata'] = JSON.stringify({ source: 'fisioflow-backend', context });
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: context === 'clinical' ? 0.4 : 0.7, // Mais determinístico para clínico
        maxOutputTokens: 2048,
      }
    })
  });

  if (!response.ok) {
    const error = await response.json() as any;
    throw new Error(error.error?.message || `Failed to call Gemini AI (Status: ${response.status})`);
  }

  const result = await response.json() as any;
  return result.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

export async function transcribeAudioWithGemini(
  apiKey: string, 
  audioBase64: string, 
  mimeType: string, 
  gatewayUrl?: string,
  gatewayToken?: string
) {
  const baseUrl = gatewayUrl 
    ? `${gatewayUrl}/google-ai-studio` 
    : 'https://generativelanguage.googleapis.com';

  const url = `${baseUrl}/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (gatewayUrl && gatewayToken) {
    headers['Authorization'] = `Bearer ${gatewayToken}`;
    headers['cf-aig-cache-ttl'] = '3600'; // 1h para áudios
    headers['cf-aig-metadata'] = JSON.stringify({ source: 'fisioflow-backend', type: 'transcription' });
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
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
