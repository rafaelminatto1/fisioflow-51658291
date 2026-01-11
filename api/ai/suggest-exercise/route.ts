/**
 * Vercel Function for AI Exercise Suggestions
 * Using Node.js runtime for better performance and Google AI compatibility
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

export const config = {
  runtime: 'nodejs',
  maxDuration: 30,
};

interface ExerciseSuggestionRequest {
  patientCondition: string;
  patientGoals: string[];
  limitations?: string[];
  currentPhase?: string;
  sessionCount?: number;
}

interface ExerciseSuggestion {
  id: string;
  name: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration?: number;
  sets?: number;
  reps?: number;
  reasoning: string;
}

interface ExerciseSuggestionResponse {
  suggestions: ExerciseSuggestion[];
  rationale: string;
}

const SYSTEM_PROMPT = `You are an expert physical therapist AI assistant. Suggest appropriate exercises based on patient conditions, goals, and limitations.

Provide exercise recommendations in JSON format with the following structure:
{
  "suggestions": [
    {
      "id": "unique_id",
      "name": "Exercise name",
      "description": "How to perform the exercise",
      "category": "stretching | strengthening | mobility | balance",
      "difficulty": "beginner | intermediate | advanced",
      "duration": minutes (optional),
      "sets": number (optional),
      "reps": number (optional),
      "reasoning": "Why this exercise is appropriate"
    }
  ],
  "rationale": "Overall explanation of the exercise program"
}`;

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const {
      patientCondition,
      patientGoals,
      limitations = [],
      currentPhase = 'initial',
      sessionCount = 1,
    }: ExerciseSuggestionRequest = await req.json();

    if (!patientCondition || !patientGoals || patientGoals.length === 0) {
      return jsonResponse(
        { error: 'patientCondition and patientGoals are required' },
        400
      );
    }

    const userMessage = `
Patient Condition: ${patientCondition}
Goals: ${patientGoals.join(', ')}
Limitations: ${limitations.length > 0 ? limitations.join(', ') : 'None'}
Treatment Phase: ${currentPhase}
Session Number: ${sessionCount}

Please suggest appropriate exercises for this patient.`;

    // Call Google Gemini API
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '');
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const result = await model.generateContent([
      { text: SYSTEM_PROMPT },
      { text: userMessage }
    ]);

    const response = await result.response;
    const text = response.text();

    // Extract JSON from potential code blocks
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const cleanJson = jsonMatch ? jsonMatch[0] : text;

    const results: ExerciseSuggestionResponse = JSON.parse(cleanJson);

    return jsonResponse(results);
  } catch (error) {
    console.error('Exercise suggestion error:', error);
    return jsonResponse(
      {
        error: 'Exercise suggestion failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
}
