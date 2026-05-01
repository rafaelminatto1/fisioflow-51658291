export interface ChatMessage {
  id: string;
  content: string;
  sender: "user" | "bot";
  timestamp: Date;
  type: "text" | "quick_reply" | "appointment" | "exercise" | "medication" | "emergency";
  metadata?: {
    confidence?: number;
    intent?: string;
    entities?: Array<{ type: string; value: string; confidence: number }>;
    suggestions?: string[];
    attachments?: ChatAttachment[];
  };
}

export interface ChatAttachment {
  id: string;
  type: "image" | "video" | "audio" | "document" | "exercise_plan" | "appointment_card";
  url: string;
  name: string;
  size?: number;
  thumbnail?: string;
}

export interface QuickReply {
  id: string;
  text: string;
  payload: string;
  icon?: string;
}

export interface ChatSession {
  id: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  messages: ChatMessage[];
  context: ChatContext;
  status: "active" | "ended" | "transferred";
  satisfaction?: number;
  tags: string[];
}

export interface ChatContext {
  patientId?: string;
  currentSymptoms?: string[];
  recentAppointments?: Array<{ id: string; date: string; type: string }>;
  activeTreatments?: Array<{ name: string; startDate: string }>;
  medications?: Array<{ name: string; dosage: string }>;
  emergencyContacts?: Array<{
    name: string;
    phone: string;
    relationship: string;
  }>;
  preferredLanguage: string;
  accessibilityNeeds?: string[];
}

export interface BotResponse {
  message: string;
  quickReplies?: QuickReply[];
  suggestions?: string[];
  confidence: number;
  intent: string;
  requiresHumanHandoff?: boolean;
  followUpActions?: string[];
}

export interface MedicalKnowledge {
  symptoms: Record<string, SymptomInfo>;
  treatments: Record<string, TreatmentInfo>;
  exercises: Record<string, ExerciseInfo>;
  medications: Record<string, MedicationInfo>;
  emergencyKeywords: string[];
}

export interface SymptomInfo {
  name: string;
  description: string;
  severity: "low" | "medium" | "high" | "emergency";
  commonCauses: string[];
  recommendations: string[];
  whenToSeekHelp: string[];
  relatedSymptoms: string[];
}

export interface TreatmentInfo {
  name: string;
  description: string;
  duration: string;
  frequency: string;
  precautions: string[];
  contraindications: string[];
  expectedOutcomes: string[];
}

export interface ExerciseInfo {
  name: string;
  description: string;
  instructions: string[];
  duration: string;
  repetitions: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  targetAreas: string[];
  precautions: string[];
  videoUrl?: string;
}

export interface MedicationInfo {
  name: string;
  genericName: string;
  dosage: string;
  frequency: string;
  sideEffects: string[];
  interactions: string[];
  precautions: string[];
  storageInstructions: string;
}
