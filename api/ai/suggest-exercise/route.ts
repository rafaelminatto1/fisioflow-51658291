/**
 * Vercel Edge Function for AI Exercise Suggestions
 * Migrated from Supabase Edge Function for better performance
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';
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

    // Call OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' },
      }),
    });

    if (!openaiResponse.ok) {
      const error = await openaiResponse.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const data = await openaiResponse.json();
    const content = data.choices[0].message.content;
    const result: ExerciseSuggestionResponse = JSON.parse(content);

    return NextResponse.json(result);
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
