export async function callGemini(
  apiKey: string,
  prompt: string,
  model: string = "gemini-1.5-flash-latest",
  gatewayUrl?: string,
  gatewayToken?: string,
  context: "exercise" | "clinical" | "general" = "clinical",
  responseSchema?: any,
) {
  // Configuração de vanguarda 2026: Cache dinâmico por tipo de uso
  const cacheTtl = context === "exercise" ? 86400 : 3600; // 24h para exercícios, 1h para clínico

  const useGateway = !!(gatewayUrl && gatewayToken);
  const baseUrl = useGateway
    ? `${gatewayUrl}/google-ai-studio`
    : "https://generativelanguage.googleapis.com";

  const url = `${baseUrl}/v1/models/${model}:generateContent?key=${apiKey}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Se houver Gateway, adiciona proteção e otimização
  if (gatewayUrl && gatewayToken) {
    headers["Authorization"] = `Bearer ${gatewayToken}`;
    headers["cf-aig-cache-ttl"] = String(cacheTtl);
    headers["cf-aig-metadata"] = JSON.stringify({ source: "fisioflow-backend", context });
  }

  const generationConfig: any = {
    temperature: context === "clinical" ? 0.4 : 0.7, // Mais determinístico para clínico
    maxOutputTokens: 2048,
  };

  if (responseSchema) {
    generationConfig.response_mime_type = "application/json";
    generationConfig.response_schema = responseSchema;
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
      generationConfig,
    }),
  });

  if (!response.ok) {
    let errorMessage = `Failed to call Gemini AI (Status: ${response.status})`;
    try {
      const error = (await response.json()) as any;
      errorMessage = error.error?.message || errorMessage;
    } catch {
      // Se não for JSON (erro do Gateway Cloudflare por exemplo)
      const textError = await response.text().catch(() => "");
      errorMessage = `${errorMessage}: ${textError.substring(0, 200)}`;
    }
    throw new Error(errorMessage);
  }

  const result = (await response.json()) as any;
  return result.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

export async function transcribeAudioWithGemini(
  apiKey: string,
  audioBase64: string,
  mimeType: string,
  gatewayUrl?: string,
  gatewayToken?: string,
) {
  const useGateway = !!(gatewayUrl && gatewayToken);
  const baseUrl = useGateway
    ? `${gatewayUrl}/google-ai-studio`
    : "https://generativelanguage.googleapis.com";

  const url = `${baseUrl}/v1/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (useGateway) {
    headers["Authorization"] = `Bearer ${gatewayToken}`;
    headers["cf-aig-cache-ttl"] = "3600"; // 1h para áudios
    headers["cf-aig-metadata"] = JSON.stringify({
      source: "fisioflow-backend",
      type: "transcription",
    });
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: "Por favor, transcreva este áudio de uma consulta de fisioterapia. Foque em capturar os termos clínicos e queixas do paciente com precisão. Retorne apenas o texto transcrito.",
            },
            {
              inline_data: {
                mime_type: mimeType,
                data: audioBase64,
              },
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    let errorMessage = `Failed to transcribe audio with Gemini (Status: ${response.status})`;
    try {
      const error = (await response.json()) as any;
      errorMessage = error.error?.message || errorMessage;
    } catch {
      const textError = await response.text().catch(() => "");
      errorMessage = `${errorMessage}: ${textError.substring(0, 200)}`;
    }
    throw new Error(errorMessage);
  }

  const result = (await response.json()) as any;
  return result.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

export async function streamGeminiChat(
  apiKey: string,
  messages: Array<{ role: string; content: string }>,
  model: string = "gemini-1.5-flash-latest",
  gatewayUrl?: string,
  gatewayToken?: string,
) {
  const useGateway = !!(gatewayUrl && gatewayToken);
  const baseUrl = useGateway
    ? `${gatewayUrl}/google-ai-studio`
    : "https://generativelanguage.googleapis.com";

  const url = `${baseUrl}/v1/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (useGateway) {
    headers["Authorization"] = `Bearer ${gatewayToken}`;
    headers["cf-aig-cache-ttl"] = "0"; // Streaming usually shouldn't be cached at the gateway level
    headers["cf-aig-metadata"] = JSON.stringify({
      source: "fisioflow-backend",
      type: "chat-streaming",
    });
  }

  // Convert messages to Gemini format
  const contents = messages.map((msg) => ({
    role: msg.role === "assistant" ? "model" : "user",
    parts: [{ text: msg.content }],
  }));

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
    }),
  });

  if (!response.ok) {
    let errorMessage = `Failed to start Gemini stream (Status: ${response.status})`;
    try {
      const error = (await response.json()) as any;
      errorMessage = error.error?.message || errorMessage;
    } catch {
      const textError = await response.text().catch(() => "");
      errorMessage = `${errorMessage}: ${textError.substring(0, 200)}`;
    }
    throw new Error(errorMessage);
  }

  return response.body;
}
