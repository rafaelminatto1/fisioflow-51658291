/**
 * xAI (Grok) Service for FisioFlow
 *
 * Specialized service for xAI's Grok models with advanced reasoning capabilities.
 * Grok excels at:
 * - Complex clinical reasoning
 * - Multi-step analysis
 * - Technical explanations
 * - Real-world knowledge integration
 *
 * @see https://docs.x.ai
 */

import { z } from 'zod';
import { generateAIResponse, generateAIObject, AIResponse } from './gateway';

// ============================================================================
// TYPES
// ============================================================================

export interface GrokClinicalAnalysisOptions {
  patientProfile: PatientProfile;
  currentCondition: string;
  treatmentHistory?: TreatmentRecord[];
  includeReasoning?: boolean;
  detailLevel?: 'concise' | 'standard' | 'comprehensive';
}

export interface PatientProfile {
  age?: number;
  gender?: string;
  weight?: number;
  height?: number;
  primaryComplaint: string;
  secondaryComplaints?: string[];
  medicalHistory?: string[];
  medications?: string[];
  limitations?: string[];
  goals?: string[];
}

export interface TreatmentRecord {
  date: string;
  type: string;
  notes: string;
  outcomes?: string;
  exercises?: string[];
}

export interface GrokAnalysisResult {
  summary: string;
  clinicalReasoning: string;
  keyFindings: KeyFinding[];
  recommendations: Recommendation[];
  exercisePlan: ExerciseRecommendation[];
  precautions: string[];
  prognosis: string;
  confidenceScore: number;
  redFlags?: string[];
}

export interface KeyFinding {
  category: 'positive' | 'concern' | 'neutral';
  finding: string;
  significance: 'critical' | 'moderate' | 'minor';
  evidence: string;
}

export interface Recommendation {
  priority: 'high' | 'medium' | 'low';
  action: string;
  rationale: string;
  timeline?: string;
}

export interface ExerciseRecommendation {
  name: string;
  category: string;
  targetAreas: string[];
  parameters: {
    sets: number;
    reps: number;
    holdTime?: string;
    restTime?: string;
  };
  progression: string[];
  precautions: string[];
}

// ============================================================================
// SCHEMAS FOR STRUCTURED OUTPUT
// ============================================================================

const ClinicalAnalysisSchema = z.object({
  summary: z.string().describe('Brief summary of patient condition in patient-friendly terms'),
  clinicalReasoning: z.string().describe('Detailed clinical reasoning for the assessment'),
  keyFindings: z.array(z.object({
    category: z.enum(['positive', 'concern', 'neutral']),
    finding: z.string(),
    significance: z.enum(['critical', 'moderate', 'minor']),
    evidence: z.string(),
  })),
  recommendations: z.array(z.object({
    priority: z.enum(['high', 'medium', 'low']),
    action: z.string(),
    rationale: z.string(),
    timeline: z.string().optional(),
  })),
  exercisePlan: z.array(z.object({
    name: z.string(),
    category: z.string(),
    targetAreas: z.array(z.string()),
    parameters: z.object({
      sets: z.number(),
      reps: z.number(),
      holdTime: z.string().optional(),
      restTime: z.string().optional(),
    }),
    progression: z.array(z.string()),
    precautions: z.array(z.string()),
  })),
  precautions: z.array(z.string()),
  prognosis: z.string(),
  confidenceScore: z.number().min(0).max(1),
  redFlags: z.array(z.string()).optional(),
});

// ============================================================================
// GROK-SPECIFIC FUNCTIONS
// ============================================================================

/**
 * Advanced Clinical Analysis using Grok-2
 *
 * Leverages Grok's superior reasoning for complex clinical cases.
 */
export async function analyzeWithGrok(
  options: GrokClinicalAnalysisOptions
): Promise<AIResponse<GrokAnalysisResult>> {
  const {
    patientProfile,
    currentCondition,
    treatmentHistory = [],
    includeReasoning = true,
    detailLevel = 'standard',
  } = options;

  const prompt = buildClinicalAnalysisPrompt(
    patientProfile,
    currentCondition,
    treatmentHistory,
    detailLevel
  );

  const systemPrompt = `You are an expert physical therapist with 20+ years of clinical experience.
You specialize in evidence-based practice and provide detailed clinical reasoning.

Your analysis should:
1. Be thorough yet concise
2. Include evidence-based reasoning
3. Consider patient-specific factors
4. Provide actionable recommendations
5. Highlight any red flags or concerns
6. Suggest appropriate exercises with clear parameters

${includeReasoning ? 'ALWAYS include your clinical reasoning process.' : ''}
Response in Portuguese (Brazil).`;

  return generateAIObject(prompt, ClinicalAnalysisSchema, {
    provider: 'grok',
    model: 'grok-2-1212',
    temperature: 0.4, // Lower temperature for clinical accuracy
    systemPrompt,
  });
}

/**
 * Generate detailed treatment plan with Grok
 */
export async function generateTreatmentPlan(
  patientProfile: PatientProfile,
  assessment: string,
  treatmentGoals: string[],
  sessionCount: number = 8
): Promise<AIResponse<string>> {
  const prompt = `Create a detailed physical therapy treatment plan for:

PATIENT PROFILE:
${formatPatientProfile(patientProfile)}

CURRENT ASSESSMENT:
${assessment}

TREATMENT GOALS:
${treatmentGoals.map((g, i) => `${i + 1}. ${g}`).join('\n')}

PLAN REQUIREMENTS:
- ${sessionCount} sessions total
- Include session-by-session progression
- Specify objective measures for tracking progress
- Include home exercise program
- Provide criteria for progression/advancement

Format as a structured treatment plan in Portuguese.`;

  return generateAIResponse(prompt, {
    provider: 'grok',
    model: 'grok-2-1212',
    temperature: 0.5,
    systemPrompt: 'You are an expert physical therapist specializing in treatment planning and progression.',
  });
}

/**
 * Explain clinical reasoning for specific treatment decision
 */
export async function explainClinicalReasoning(
  decision: string,
  context: string,
  alternatives?: string[]
): Promise<AIResponse<string>> {
  const prompt = `Explain the clinical reasoning behind this treatment decision:

DECISION: ${decision}

CONTEXT:
${context}

${alternatives ? `ALTERNATIVES CONSIDERED:\n${alternatives.map((a, i) => `${i + 1}. ${a}`).join('\n')}\n\n` : ''}

Provide:
1. Clinical rationale (evidence-based)
2. Risk-benefit analysis
3. Patient-specific factors considered
4. Expected outcomes
5. Monitoring parameters

Response in Portuguese.`;

  return generateAIResponse(prompt, {
    provider: 'grok',
    model: 'grok-2-1212',
    temperature: 0.3,
    systemPrompt: 'You are an expert clinical educator specializing in evidence-based physical therapy practice.',
  });
}

/**
 * Complex case consultation with Grok
 */
export async function complexCaseConsultation(
  caseData: {
    patientProfile: PatientProfile;
    previousTreatments: TreatmentRecord[];
    currentChallenges: string[];
    specificQuestions: string[];
  }
): Promise<AIResponse<string>> {
  const prompt = `Provide expert consultation on this complex physical therapy case:

PATIENT PROFILE:
${formatPatientProfile(caseData.patientProfile)}

PREVIOUS TREATMENTS:
${caseData.previousTreatments.map((t, i) =>
  `${i + 1}. ${t.date} - ${t.type}: ${t.notes}${t.outcomes ? `\n   Outcome: ${t.outcomes}` : ''}`
).join('\n\n')}

CURRENT CHALLENGES:
${caseData.currentChallenges.map((c, i) => `${i + 1}. ${c}`).join('\n')}

SPECIFIC QUESTIONS:
${caseData.specificQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

Please provide:
1. Analysis of why previous treatments may not have achieved desired outcomes
2. Fresh perspective on the case
3. Alternative approaches to consider
4. Specific recommendations for moving forward
5. Any red flags or areas requiring additional investigation

Response in Portuguese with detailed clinical reasoning.`;

  return generateAIResponse(prompt, {
    provider: 'grok',
    model: 'grok-2-1212',
    temperature: 0.5,
    systemPrompt: 'You are a senior physical therapy consultant with expertise in complex cases and treatment-resistant conditions.',
  });
}

/**
 * Generate SOAP note assistance
 */
export async function generateSOAPAssistance(
  subjective: string,
  objective: string,
  assessmentHint?: string
): Promise<AIResponse<{
  assessment: string;
  plan: string;
  icd10Suggestions?: string[];
  goals?: string[];
}>> {
  const prompt = `Complete this SOAP note based on the following information:

SUBJECTIVE:
${subjective}

OBJECTIVE:
${objective}
${assessmentHint ? `\nASSESSMENT HINT:\n${assessmentHint}` : ''}

Provide:
1. Detailed Assessment (A) with clinical reasoning
2. comprehensive Plan (P) with:
   - Specific interventions with parameters
   - Patient education points
   - Home exercise program updates
   - Follow-up plan
3. ICD-10 code suggestions if applicable
4. Short and long-term goals if appropriate

Response in Portuguese.`;

  const schema = z.object({
    assessment: z.string(),
    plan: z.string(),
    icd10Suggestions: z.array(z.string()).optional(),
    goals: z.array(z.string()).optional(),
  });

  return generateAIObject(prompt, schema, {
    provider: 'grok',
    model: 'grok-2-1212',
    temperature: 0.4,
    systemPrompt: 'You are an expert physical therapist documentation specialist.',
  });
}

/**
 * Patient education content generation
 */
export async function generatePatientEducation(
  topic: string,
  audience: 'patient' | 'caregiver' | 'both',
  literacyLevel: 'basic' | 'intermediate' | 'advanced',
  includeImages?: boolean
): Promise<AIResponse<{
  title: string;
  content: string[];
  keyPoints: string[];
  warnings?: string[];
  questionsToAsk?: string[];
}>> {
  const prompt = `Create patient education materials for:

TOPIC: ${topic}
AUDIENCE: ${audience}
LITERACY LEVEL: ${literacyLevel}

Create:
1. Engaging title (patient-friendly)
2. Educational content divided into sections
3. Key points summary
4. Any warnings or precautions
5. Suggested questions for the patient to ask their therapist

${includeImages ? '6. Suggestions for visual aids/diagrams to include' : ''}

Content should be:
- Clear and easy to understand
- Empowering and encouraging
- Medically accurate
- Culturally appropriate for Brazil

Response in Portuguese.`;

  const schema = z.object({
    title: z.string(),
    content: z.array(z.string()),
    keyPoints: z.array(z.string()),
    warnings: z.array(z.string()).optional(),
    questionsToAsk: z.array(z.string()).optional(),
  });

  return generateAIObject(prompt, schema, {
    provider: 'grok',
    model: 'grok-2-1212',
    temperature: 0.6,
    systemPrompt: 'You are an expert patient educator specializing in physical therapy and rehabilitation.',
  });
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function buildClinicalAnalysisPrompt(
  profile: PatientProfile,
  condition: string,
  history: TreatmentRecord[],
  detailLevel: string
): string {
  let prompt = `Analyze this patient case and provide a comprehensive clinical assessment:

PATIENT PROFILE:
${formatPatientProfile(profile)}

CURRENT CONDITION:
${condition}

`;

  if (history.length > 0) {
    prompt += `TREATMENT HISTORY:\n${history.map((h, i) =>
      `${i + 1}. ${h.date} - ${h.type}\n   ${h.notes}${h.exercises ? `\n   Exercises: ${h.exercises.join(', ')}` : ''}`
    ).join('\n\n')}\n\n`;
  }

  prompt += `DETAIL LEVEL: ${detailLevel}

Provide a thorough analysis including clinical reasoning, key findings, specific recommendations, and exercise plan.`;

  return prompt;
}

function formatPatientProfile(profile: PatientProfile): string {
  const parts: string[] = [];

  if (profile.age) parts.push(`Age: ${profile.age}`);
  if (profile.gender) parts.push(`Gender: ${profile.gender}`);
  if (profile.weight) parts.push(`Weight: ${profile.weight}kg`);
  if (profile.height) parts.push(`Height: ${profile.height}cm`);

  parts.push(`Primary Complaint: ${profile.primaryComplaint}`);

  if (profile.secondaryComplaints?.length) {
    parts.push(`Secondary Complaints: ${profile.secondaryComplaints.join(', ')}`);
  }

  if (profile.medicalHistory?.length) {
    parts.push(`Medical History: ${profile.medicalHistory.join(', ')}`);
  }

  if (profile.medications?.length) {
    parts.push(`Current Medications: ${profile.medications.join(', ')}`);
  }

  if (profile.limitations?.length) {
    parts.push(`Limitations: ${profile.limitations.join(', ')}`);
  }

  if (profile.goals?.length) {
    parts.push(`Goals: ${profile.goals.join(', ')}`);
  }

  return parts.map(p => `- ${p}`).join('\n');
}

// ============================================================================
// EXPORTS
// ============================================================================

export const GrokService = {
  analyze: analyzeWithGrok,
  treatmentPlan: generateTreatmentPlan,
  explainReasoning: explainClinicalReasoning,
  consult: complexCaseConsultation,
  soap: generateSOAPAssistance,
  education: generatePatientEducation,
};

// Re-export types
export type {
  GrokClinicalAnalysisOptions,
  PatientProfile,
  TreatmentRecord,
  GrokAnalysisResult,
  KeyFinding,
  Recommendation,
  ExerciseRecommendation,
};
