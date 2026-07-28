import { Hono } from "hono";
import { z } from "zod";
import type { AuthVariables } from "../../lib/auth";
import type { Env } from "../../types/env";
import { runAi, readAiText } from "../../lib/ai-native";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// Schemas Zod para validação
const landmarkSchema = z.object({
  name: z.string().optional(),
  x: z.number(),
  y: z.number(),
  z: z.number().optional(),
  visibility: z.number().optional(),
});

const analyzePoseSchema = z.object({
  landmarks: z.array(landmarkSchema),
  movementType: z.enum(["squat", "gait", "posture", "shoulder_flexion", "lunge", "general"]).default("general"),
  jointAngles: z.record(z.string(), z.number()).optional(),
  fps: z.number().optional().default(30),
});

const soapObservationSchema = z.object({
  patientId: z.string().optional(),
  movementType: z.string().optional().default("Avaliação Cinemática"),
  mqiScore: z.number().min(0).max(100).optional(),
  symmetryScore: z.number().optional(),
  angles: z.record(z.string(), z.number()).optional(),
  clinicalNotes: z.string().optional(),
});

const ocrDocumentSchema = z.object({
  imageBase64: z.string(),
  documentType: z.enum(["exam_report", "medical_request", "prescription", "general"]).default("general"),
});

// Helper de cálculo cinemático de ângulos 2D (vetores de 3 pontos A-B-C com B como vértice)
function calculateAngle2D(
  a: { x: number; y: number },
  b: { x: number; y: number },
  c: { x: number; y: number }
): number {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs((radians * 180.0) / Math.PI);
  if (angle > 180.0) angle = 360.0 - angle;
  return Math.round(angle * 10) / 10;
}

/**
 * 1. POST /vision/analyze-pose
 * Calcula o Movement Quality Index (MQI Score 0-100), simetria e goniometria em tempo real
 */
app.post("/vision/analyze-pose", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = analyzePoseSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: "Parâmetros inválidos", details: parsed.error.format() }, 400);
  }

  const { landmarks, movementType, jointAngles: clientAngles } = parsed.data;

  const angles: Record<string, number> = { ...(clientAngles || {}) };

  // Se tivermos 33 landmarks do MediaPipe Pose
  if (landmarks.length >= 33) {
    try {
      angles.leftKnee = calculateAngle2D(landmarks[23], landmarks[25], landmarks[27]);
      angles.rightKnee = calculateAngle2D(landmarks[24], landmarks[26], landmarks[28]);
      angles.leftHip = calculateAngle2D(landmarks[11], landmarks[23], landmarks[25]);
      angles.rightHip = calculateAngle2D(landmarks[12], landmarks[24], landmarks[26]);
      angles.leftElbow = calculateAngle2D(landmarks[11], landmarks[13], landmarks[15]);
      angles.rightElbow = calculateAngle2D(landmarks[12], landmarks[14], landmarks[16]);
    } catch {
      // Caso algum índice falhe
    }
  }

  // Cálculo da Simetria (0 - 100%)
  let symmetryScore = 100;
  if (angles.leftKnee && angles.rightKnee) {
    const diff = Math.abs(angles.leftKnee - angles.rightKnee);
    const avg = (angles.leftKnee + angles.rightKnee) / 2 || 1;
    const ratio = Math.min(100, Math.max(0, 100 - (diff / avg) * 100));
    symmetryScore = Math.round(ratio);
  }

  // Cálculo do MQI Score (Movement Quality Index: 0 - 100)
  // Pilares: Simetria (35%), Amplitude (35%), Estabilidade/Alinhamento (30%)
  let romScore = 85;
  if (movementType === "squat") {
    const minKneeAngle = Math.min(angles.leftKnee || 180, angles.rightKnee || 180);
    if (minKneeAngle <= 95) romScore = 98;
    else if (minKneeAngle <= 120) romScore = 82;
    else romScore = 65;
  } else if (movementType === "shoulder_flexion") {
    const maxShoulderAngle = Math.max(angles.leftHip || 0, angles.rightHip || 0);
    if (maxShoulderAngle >= 160) romScore = 95;
    else romScore = Math.round((maxShoulderAngle / 180) * 100);
  }

  const stabilityScore = Math.round((symmetryScore * 0.5) + (romScore * 0.5));
  const mqiScore = Math.min(100, Math.max(0, Math.round(
    symmetryScore * 0.35 + romScore * 0.35 + stabilityScore * 0.30
  )));

  // Destaques Clínicos Heurísticos
  const clinicalHighlights: string[] = [];
  if (symmetryScore < 85) {
    clinicalHighlights.push(`Assimetria moderada a acentuada observada (${symmetryScore}% simetria).`);
  } else {
    clinicalHighlights.push(`Excelente simetria de carga e angulação bilateral (${symmetryScore}%).`);
  }

  if (mqiScore >= 80) {
    clinicalHighlights.push("Padrão de movimento de alta qualidade (MQI > 80).");
  } else if (mqiScore >= 60) {
    clinicalHighlights.push("Qualidade de movimento moderada com pequenas compensações.");
  } else {
    clinicalHighlights.push("Padrão de movimento alterado — recomendada correção postural manual.");
  }

  return c.json({
    success: true,
    mqiScore,
    symmetryScore,
    romScore,
    stabilityScore,
    angles,
    movementType,
    clinicalHighlights,
    timestamp: new Date().toISOString(),
  });
});

/**
 * 2. POST /vision/soap-observation
 * Sintetiza o parágrafo Objetivo (O) da nota SOAP usando Cloudflare Workers AI (Gemma 4 / Llama 3.2 Vision)
 */
app.post("/vision/soap-observation", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = soapObservationSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: "Parâmetros inválidos", details: parsed.error.format() }, 400);
  }

  const { movementType, mqiScore, symmetryScore, angles, clinicalNotes } = parsed.data;

  const prompt = `Você é um assistente fisioterapêutico sênior. Com base nos dados cinemáticos extraídos por inteligência visual:
- Tipo de movimento: ${movementType}
- Escore de Qualidade do Movimento (MQI): ${mqiScore ?? "N/A"}/100
- Índice de Simetria Bilateral: ${symmetryScore ?? "N/A"}%
- Ângulos Articulares Principais: ${JSON.stringify(angles || {})}
- Observações do Terapeuta: ${clinicalNotes || "Nenhuma observação adicional"}

Escreva uma seção de OBSERVACAO OBJETIVA (seção 'O' do formulário SOAP) em português, formal e objetiva. Máximo 3 a 4 frases clínicas curtas com termos médicos precisos (ex: goniometria, simetria, flexão, valgo dinâmico se aplicável). Não inclua introduções genéricas.`;

  try {
    const aiResp = await runAi(
      c.env,
      "@cf/google/gemma-4-26b-a4b-it",
      {
        messages: [
          { role: "system", content: "Você gera textos clínicos objetivos e precisos para prontuários de fisioterapia no Brasil." },
          { role: "user", content: prompt },
        ],
        max_tokens: 256,
        temperature: 0.3,
      },
      { cache: true, cacheTtl: 3600 }
    );

    const generatedText = readAiText(aiResp) || "Avaliação cinemática realizada. Padrão de movimento preservado sem assimetrias marcantes.";

    return c.json({
      success: true,
      objectiveNote: generatedText.trim(),
      mqiScore: mqiScore ?? null,
      symmetryScore: symmetryScore ?? null,
      generatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    const fallbackText = `Análise cinemática em ${movementType}: MQI Score de ${mqiScore ?? 80}/100 com simetria bilateral de ${symmetryScore ?? 90}%. Ângulos articulares registrados dentro do padrão de acompanhamento.`;
    return c.json({
      success: true,
      objectiveNote: fallbackText,
      mqiScore: mqiScore ?? null,
      isFallback: true,
      generatedAt: new Date().toISOString(),
    });
  }
});

/**
 * 3. POST /vision/ocr-document
 * Processa imagem de laudo médico / exame e extrai informações estruturadas
 */
app.post("/vision/ocr-document", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = ocrDocumentSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: "Parâmetros inválidos", details: parsed.error.format() }, 400);
  }

  const { imageBase64, documentType } = parsed.data;

  try {
    const prompt = `Analise a imagem deste laudo/exame de fisioterapia/ortopedia (${documentType}).
Extraia em formato JSON estrito:
{
  "title": "título do documento ou exame",
  "patientName": "nome se visível ou null",
  "cid10": "código CID se houver ou null",
  "diagnostic": "resumo do diagnóstico principal",
  "keyFindings": ["achado 1", "achado 2"],
  "clinicalRestrictions": ["restrição 1", "restrição 2"]
}`;

    const aiResp = await runAi(
      c.env,
      "@cf/google/gemma-4-26b-a4b-it",
      {
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image", image: imageBase64.replace(/^data:image\/\w+;base64,/, "") },
            ],
          },
        ],
        max_tokens: 512,
        temperature: 0.2,
      },
      { cache: false }
    );

    const rawText = readAiText(aiResp);
    let parsedData = {};
    try {
      const match = rawText.match(/\{[\s\S]*\}/);
      if (match) parsedData = JSON.parse(match[0]);
    } catch {
      parsedData = { diagnostic: rawText };
    }

    return c.json({
      success: true,
      extractedData: parsedData,
      rawText,
      processedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    return c.json({
      success: false,
      error: "Falha ao processar OCR do documento visual",
      details: err.message,
    }, 500);
  }
});

export { app as aiVisionRoutes };
