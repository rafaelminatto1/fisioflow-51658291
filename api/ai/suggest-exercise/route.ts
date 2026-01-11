/**
 * Vercel Function for AI Exercise Suggestions
 * Using Node.js runtime for better performance and OpenAI compatibility
 */

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const runtime = 'nodejs';
export const maxDuration = 30;

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

export async function POST(req: NextRequest) {
  try {
    const {
      patientCondition,
      patientGoals,
      limitations = [],
      currentPhase = 'initial',
      sessionCount = 1,
    }: ExerciseSuggestionRequest = await req.json();

    if (!patientCondition || !patientGoals || patientGoals.length === 0) {
      return NextResponse.json(
        { error: 'patientCondition and patientGoals are required' },
        { status: 400 }
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

    return NextResponse.json(results);
  } catch (error) {
    console.error('Exercise suggestion error:', error);
    return NextResponse.json(
      {
        error: 'Exercise suggestion failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
