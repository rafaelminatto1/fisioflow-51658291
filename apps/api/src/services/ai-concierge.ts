import { Env } from "../types/env";
import { runAi, readAiText } from "../lib/ai-native";
import { WORKERS_AI_MODELS } from "../lib/workersAi";

export interface ConciergeResponse {
  reply: string;
  intent: "scheduling" | "information" | "urgent" | "other";
  /**
   * true apenas quando a resposta está 100% coberta pelas informações oficiais
   * da clínica. Quando false, NÃO se deve enviar nada automaticamente — um
   * humano assume (evita respostas inventadas).
   */
  answerable: boolean;
  patientData?: {
    name?: string;
    condition?: string;
    insurance?: string;
  };
}

/**
 * Base de conhecimento OFICIAL da clínica — única fonte de verdade.
 * O modelo só pode responder com o que está aqui; qualquer pergunta fora disto
 * deve cair em answerable=false (humano responde). Não inventar nada.
 */
const CLINIC_KB = `
Activity Fisioterapia — informações oficiais:
- Clínica PARTICULAR de fisioterapia. NÃO aceita convênios. Emitimos nota fiscal e auxiliamos no processo de reembolso pelo convênio.
- Endereço: Rua Manuel Vieira de Sousa, 166 — Mooca, São Paulo/SP, CEP 03124-110 (próximo ao Clube Juventus da Mooca).
- Contato: WhatsApp (11) 93433-5858; telefone (11) 5874-9885; e-mail contato@activityfisioterapia.com.br.
- Especialidades: fisioterapia esportiva, ortopédica, gerontológica (atendimento a idosos) e reabilitação pré e pós-operatória.
- Atendimento 100% individualizado, sessões de 60 minutos, com equipamentos de alta tecnologia.
- Tratamentos e técnicas: Laser Terapia, Ultrassom, Liberação Miofascial, Eletroestimulação, Crioterapia, Recovery Esportivo e Recovery Pump (botas pneumáticas de compressão), entre outros.
- Horário de funcionamento: segunda a sexta das 07h às 21h; sábado das 07h às 13h. Não atende aos domingos.
- Valores: avaliação R$ 180,00; sessão avulsa R$ 180,00; pacote de 10 sessões por R$ 170,00 cada sessão.
- Formas de pagamento: transferência, pix, cartão de débito ou crédito em até 6x.
- Para iniciar o tratamento é necessário agendar uma avaliação.
- Atendente: Rafael, da Activity Fisioterapia.
`.trim();

/**
 * AI Concierge Service — triagem 24/7 (WhatsApp + Instagram).
 * Aterrado SOMENTE nas informações oficiais da clínica; nunca inventa dados.
 */
export class AIConciergeService {
  static async processMessage(
    env: Env,
    _orgId: string,
    message: string,
    history: any[] = [],
  ): Promise<ConciergeResponse> {
    const systemPrompt = `
Você é o atendente virtual da Activity Fisioterapia (assine como "Rafael" quando fizer sentido).
Atende leads e pacientes via WhatsApp e Instagram.

REGRAS ABSOLUTAS:
1. Use EXCLUSIVAMENTE as informações oficiais abaixo. NUNCA invente preços, horários, endereço, telefone, nomes de profissionais, disponibilidade de agenda, promoções, prazos ou qualquer dado que não esteja listado.
2. Se a pergunta NÃO puder ser totalmente respondida com as informações oficiais (ex.: disponibilidade de um horário específico na agenda, reagendamento, confirmação de agendamento, dúvida clínica sobre um caso, qualquer assunto não listado), defina "answerable": false e deixe "reply" vazio. Um humano responderá.
3. Saudações e perguntas básicas cobertas pelas informações (endereço/localização, telefone, WhatsApp, e-mail, valores, formas de pagamento, horário de funcionamento, se aceita convênio, especialidades, tratamentos oferecidos, como agendar uma avaliação) → responda de forma acolhedora e concisa e defina "answerable": true.
4. Se houver sinal de urgência, dor forte ou queixa clínica, defina "answerable": false e "intent": "urgent" (um humano assume imediatamente).
5. Responda em português do Brasil, tom acolhedor e profissional, conciso para chat. Sem excesso de emojis.

INFORMAÇÕES OFICIAIS (única fonte permitida):
${CLINIC_KB}

Retorne APENAS um JSON válido neste formato, sem texto fora do JSON:
{"reply": "string", "intent": "scheduling" | "information" | "urgent" | "other", "answerable": true | false}
`.trim();

    try {
      const response = await runAi(
        env,
        WORKERS_AI_MODELS.llama_3_1_8b,
        {
          messages: [
            { role: "system", content: systemPrompt },
            ...history.map((h) => ({ role: h.role, content: h.content })),
            { role: "user", content: message },
          ],
          response_format: { type: "json_object" },
          temperature: 0.2,
        },
        { cache: false },
      );

      // Modelos -fast (vLLM/OpenAI) populam choices[].message.content, não .response.
      const raw = readAiText(response);
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch?.[0] ?? "{}") as Partial<ConciergeResponse>;

      const answerable = parsed.answerable === true;
      const reply = typeof parsed.reply === "string" ? parsed.reply.trim() : "";
      const intent = parsed.intent ?? "other";

      return {
        // Garante que nada é enviado quando não há resposta segura.
        reply: answerable ? reply : "",
        intent,
        answerable: answerable && reply.length >= 2,
      };
    } catch (error) {
      console.error("[AI Concierge] LLM Error:", error);
      // Em caso de falha NÃO inventamos resposta — deixa para o humano.
      return { reply: "", intent: "other", answerable: false };
    }
  }
}
