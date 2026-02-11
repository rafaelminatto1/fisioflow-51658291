/**
 * Firebase AI Logic Client SDK
 * 
 * Provides direct client-to-model access for non-clinical AI features.
 * Uses Firebase AI Logic proxy for secure API key management.
 * 
 * SECURITY NOTE: Only use for non-PHI/non-clinical features.
 * Clinical analysis must remain server-side via Cloud Functions.
 */

import { getVertexAI, getGenerativeModel } from "firebase/vertexai";
import { app as firebaseApp } from "@/integrations/firebase/client";

// Initialize Vertex AI with Firebase
const vertexAI = getVertexAI(firebaseApp);

// ============================================================================
// MODEL INSTANCES
// ============================================================================

/**
 * Fast model for quick suggestions and UI helpers
 * Use for: autocomplete, text formatting, general suggestions
 */
export const flashModel = getGenerativeModel(vertexAI, {
    model: "gemini-2.5-flash",
});

/**
 * Advanced model for complex reasoning (use sparingly from client)
 * Use for: complex analysis that doesn't involve PHI
 */
export const proModel = getGenerativeModel(vertexAI, {
    model: "gemini-2.5-pro",
});

// ============================================================================
// CLIENT-SIDE AI HELPERS
// ============================================================================

/**
 * Generate quick text suggestions (non-clinical)
 * Examples: exercise descriptions, general wellness tips
 */
export async function generateQuickSuggestion(
    prompt: string,
    options?: {
        temperature?: number;
        maxTokens?: number;
    }
): Promise<string> {
    const result = await flashModel.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
            temperature: options?.temperature ?? 0.7,
            maxOutputTokens: options?.maxTokens ?? 500,
        },
    });

    const response = result.response;
    return response.text();
}

/**
 * Generate structured exercise descriptions
 * Use for: expanding exercise names into full descriptions
 */
export async function expandExerciseDescription(
    exerciseName: string
): Promise<{
    description: string;
    benefits: string[];
    precautions: string[];
}> {
    const prompt = `Como especialista em fisioterapia, forneça uma descrição detalhada do exercício "${exerciseName}".

Retorne um JSON com:
- description: descrição clara e concisa
- benefits: array de 3-5 benefícios principais
- precautions: array de 2-3 precauções importantes

Formato JSON:
{
  "description": "...",
  "benefits": ["...", "..."],
  "precautions": ["...", "..."]
}`;

    const result = await flashModel.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 800,
            responseMimeType: "application/json",
        },
    });

    const response = result.response;
    const text = response.text();

    try {
        return JSON.parse(text);
    } catch {
        // Fallback if JSON parsing fails
        return {
            description: text,
            benefits: [],
            precautions: [],
        };
    }
}

/**
 * Generate general wellness tips (non-clinical)
 * Use for: home care suggestions, general health tips
 */
export async function generateWellnessTips(
    topic: string,
    count: number = 5
): Promise<string[]> {
    const prompt = `Gere ${count} dicas de bem-estar sobre: ${topic}.

Retorne um JSON array de strings com dicas práticas e acionáveis.

Formato: ["dica 1", "dica 2", ...]`;

    const result = await flashModel.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 600,
            responseMimeType: "application/json",
        },
    });

    const response = result.response;
    const text = response.text();

    try {
        return JSON.parse(text);
    } catch {
        // Fallback
        return [text];
    }
}

/**
 * Format text for better readability
 * Use for: cleaning up user input, formatting notes
 */
export async function formatText(
    text: string,
    style: "professional" | "casual" | "medical" = "professional"
): Promise<string> {
    const stylePrompts = {
        professional: "Reformule o texto de forma profissional e clara",
        casual: "Reformule o texto de forma amigável e acessível",
        medical: "Reformule o texto usando terminologia médica apropriada",
    };

    const prompt = `${stylePrompts[style]}:

"${text}"

Retorne apenas o texto reformulado, sem explicações adicionais.`;

    const result = await flashModel.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
            temperature: 0.5,
            maxOutputTokens: 500,
        },
    });

    const response = result.response;
    return response.text();
}

/**
 * Generate autocomplete suggestions
 * Use for: form field autocomplete, search suggestions
 */
export async function getAutocompleteSuggestions(
    partial: string,
    context: string,
    maxSuggestions: number = 5
): Promise<string[]> {
    const prompt = `Complete a seguinte entrada no contexto de ${context}:

Entrada parcial: "${partial}"

Retorne ${maxSuggestions} sugestões de completamento como um JSON array.

Formato: ["sugestão 1", "sugestão 2", ...]`;

    const result = await flashModel.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
            temperature: 0.6,
            maxOutputTokens: 300,
            responseMimeType: "application/json",
        },
    });

    const response = result.response;
    const text = response.text();

    try {
        return JSON.parse(text);
    } catch {
        return [];
    }
}

// ============================================================================
// STREAMING SUPPORT
// ============================================================================

/**
 * Stream text generation for real-time UI updates
 * Use for: chat interfaces, live text generation
 */
export async function* streamGeneration(
    prompt: string,
    options?: {
        temperature?: number;
        maxTokens?: number;
    }
): AsyncGenerator<string, void, unknown> {
    const result = await flashModel.generateContentStream({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
            temperature: options?.temperature ?? 0.7,
            maxOutputTokens: options?.maxTokens ?? 1000,
        },
    });

    for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) {
            yield text;
        }
    }
}
