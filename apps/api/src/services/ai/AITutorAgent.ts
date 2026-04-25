import { streamGeminiChat } from "../../lib/ai-gemini";
import { Env } from "../../types/env";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export class AITutorAgent {
  constructor(private env: Env) {}

  public async generateTutorResponseStream(
    patientProfile: string,
    exerciseContext: string,
    chatHistory: ChatMessage[],
    newMessage: string,
  ): Promise<ReadableStream> {
    const systemPrompt = `You are an empathetic, highly skilled Physiotherapy AI Tutor.
Your goal is to guide the patient through their prescribed exercises, answer their questions about movements, and motivate them.

Patient Profile: ${patientProfile}
Current Exercise Context: ${exerciseContext}

Guidelines:
1. Always be encouraging and positive.
2. Explain movements simply, avoiding overly complex medical jargon unless explaining it clearly.
3. Prioritize patient safety: if they report severe pain, advise them to stop the exercise and consult their physiotherapist.
4. Keep responses concise and actionable.

Respond to the user's latest message based on this context.`;

    // Prepare messages for Gemini: System prompt goes as the first user message conceptually,
    // or we inject it into the history. For simplicity with the current wrapper, we prepend a context message.
    const messagesWithContext = [
      {
        role: "user",
        content: `[SYSTEM INSTRUCTIONS - DO NOT REPLY TO THIS DIRECTLY]\n${systemPrompt}`,
      },
      { role: "assistant", content: "Understood. I am ready to act as the AI Tutor." },
      ...chatHistory,
      { role: "user", content: newMessage },
    ];

    try {
      const stream = await streamGeminiChat(
        this.env.GOOGLE_AI_API_KEY,
        messagesWithContext,
        "gemini-1.5-flash",
        this.env.FISIOFLOW_AI_GATEWAY_URL,
        this.env.FISIOFLOW_AI_GATEWAY_TOKEN,
      );

      if (!stream) {
        throw new Error("Failed to initialize stream");
      }

      return stream;
    } catch (error) {
      console.error("[AITutorAgent] Error generating response:", error);
      throw new Error("Failed to generate tutor response");
    }
  }
}
