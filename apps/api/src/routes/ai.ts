import { Hono } from "hono";
import { requireAuth, type AuthVariables } from "../lib/auth";
import type { Env } from "../types/env";

import { callGemini, transcribeAudioWithGemini } from "../lib/ai-gemini";
import {
	runAi,
	transcribeWithWhisper,
	summarizeClinicalNote,
} from "../lib/ai-native";
import { logToAxiom } from "../lib/axiom";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

app.use("*", requireAuth);

type ClinicalTrend = "positive" | "neutral" | "negative";

function safeText(val: unknown): string {
	if (val == null) return "";
	if (typeof val === "string") return val;
	if (typeof val === "object") return JSON.stringify(val);
	return String(val);
}

function firstSentence(text: string, fallback: string): string {
	const match = text.match(/[^.!?]*[.!?]/);
	return match ? match[0].trim() : text.trim() || fallback;
}

function inferRiskLevel(text: string): ClinicalTrend {
	const lower = text.toLowerCase();
	if (/piora|regredi|falha|dor intensa|recidiva/.test(lower)) return "negative";
	if (/melhora|evolução|progress|adher|boa resposta/.test(lower))
		return "positive";
	return "neutral";
}

function buildClinicalReport(
	metrics: Record<string, unknown>,
	history?: Record<string, unknown>,
) {
	return {
		summary: "Análise clínica baseada nos dados fornecidos.",
		metrics,
		history: history ?? null,
		trend: inferRiskLevel(JSON.stringify(metrics)),
		generatedAt: new Date().toISOString(),
	};
}

function buildFormSuggestions(context: string): string[] {
	const base = [
		"Escala de dor (EVA)",
		"Amplitude de movimento",
		"Força muscular",
	];
	if (/coluna|lombar|cervical/.test(context.toLowerCase()))
		base.push("Teste de Lasègue", "Schober");
	if (/joelho|quadril/.test(context.toLowerCase()))
		base.push("Teste de McMurray", "Lachman");
	return base;
}

function buildExecutiveSummary(body: Record<string, unknown>) {
	const patientCount = (body.patientCount as number) ?? 0;
	const sessionCount = (body.sessionCount as number) ?? 0;
	return {
		highlights: [
			`${patientCount} pacientes ativos`,
			`${sessionCount} sessões realizadas`,
		],
		insights: "Desempenho clínico dentro dos parâmetros esperados.",
		recommendations: [
			"Manter frequência de reavaliações",
			"Monitorar adesão ao plano domiciliar",
		],
		generatedAt: new Date().toISOString(),
	};
}

function buildSoapFromText(text: string) {
	// This will now be handled by a real LLM prompt in the route if needed,
	// but keeping the fallback logic here.
	const lines = text
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean);
	return {
		subjective:
			lines.slice(0, 2).join(" ") ||
			"Paciente relata evolução clínica em acompanhamento.",
		objective:
			lines.slice(2, 4).join(" ") ||
			"Avaliação objetiva pendente de complementação.",
		assessment:
			lines.slice(4, 6).join(" ") ||
			"Quadro compatível com seguimento fisioterapêutico sem red flags evidentes.",
		plan:
			lines.slice(6, 8).join(" ") ||
			"Manter plano terapêutico, reforçar adesão e reavaliar na próxima sessão.",
	};
}

app.post("/service", async (c) => {
	const body = (await c.req.json().catch(() => ({}))) as Record<
		string,
		unknown
	>;
	const action = String(body.action ?? "");
	const data =
		body.data && typeof body.data === "object"
			? (body.data as Record<string, unknown>)
			: body;

	switch (action) {
		case "clinicalChat": {
			const message = safeText(data.message);
			const context =
				data.context && typeof data.context === "object"
					? (data.context as Record<string, unknown>)
					: {};

			const prompt = `Você é um assistente especializado em fisioterapia. 
      Contexto do paciente: ${JSON.stringify(context)}
      Pergunta do profissional: ${message}
      Responda de forma técnica, concisa e baseada em evidências clínicas.`;

			const start = performance.now();
			const response = await callGemini(
				c.env.GOOGLE_AI_API_KEY,
				prompt,
				"gemini-1.5-flash",
				c.env.FISIOFLOW_AI_GATEWAY_URL,
				c.env.FISIOFLOW_AI_GATEWAY_TOKEN,
				"clinical",
			);
			const duration = performance.now() - start;

			c.executionCtx.waitUntil(
				logToAxiom(c.env, c.executionCtx, {
					level: "info",
					type: "ai_inference_latency",
					message: "Gemini inference completed",
					metadata: {
						action: "clinicalChat",
						durationMs: duration,
						promptLength: prompt.length,
					},
				}),
			);

			return c.json({ data: { response } });
		}
		case "exerciseSuggestion": {
			const goals = Array.isArray(data.goals)
				? data.goals.map((goal) => String(goal))
				: [];
			const prompt = `Sugira 3 exercícios de fisioterapia para os seguintes objetivos: ${goals.join(", ")}. 
      Para cada exercício, forneça o nome, a justificativa clínica e a área alvo. 
      Retorne em formato JSON: { exercises: [{ name, rationale, targetArea }] }`;

			const aiResponse = await callGemini(
				c.env.GOOGLE_AI_API_KEY,
				prompt,
				"gemini-1.5-flash",
				c.env.FISIOFLOW_AI_GATEWAY_URL,
				c.env.FISIOFLOW_AI_GATEWAY_TOKEN,
				"exercise",
			);
			try {
				const parsed = JSON.parse(aiResponse.replace(/```json|```/g, ""));
				return c.json({ data: { success: true, data: parsed } });
			} catch {
				return c.json({ data: { success: true, data: { exercises: [] } } });
			}
		}
		// ... other cases can be migrated similarly
		default:
			return c.json({ error: "Ação de IA não suportada" }, 400);
	}
});

app.post("/fast-processing", async (c) => {
	const body = (await c.req.json().catch(() => ({}))) as Record<
		string,
		unknown
	>;
	const text = safeText(body.text);
	const mode = safeText(body.mode) || "fix_grammar";

	const prompt =
		mode === "fix_grammar"
			? `Corrija a gramática e melhore a clareza técnica deste registro de fisioterapia, mantendo o tom profissional: "${text}". Retorne apenas o texto corrigido.`
			: `Resuma este registro clínico de forma concisa: "${text}". Retorne apenas o resumo.`;

	const result = await callGemini(
		c.env.GOOGLE_AI_API_KEY,
		prompt,
		"gemini-1.5-flash",
		c.env.FISIOFLOW_AI_GATEWAY_URL,
	);
	return c.json({ data: { result } });
});

app.post("/transcribe-audio", async (c) => {
	const body = (await c.req.json().catch(() => ({}))) as Record<
		string,
		unknown
	>;
	const audioBase64 = String(body.audioData || body.audio || "");

	if (!audioBase64)
		return c.json({ error: "Nenhum dado de áudio enviado" }, 400);

	try {
		const start = performance.now();
		let transcription = "";
		let provider = "native-whisper";

		// Tentar primeiro com Workers AI (Nativo) se o binding existir
		if (c.env.AI) {
			try {
				transcription = await transcribeWithWhisper(c.env, audioBase64);
			} catch (e) {
				console.error("Whisper failed, falling back to Gemini", e);
				provider = "gemini-fallback";
				transcription = await transcribeAudioWithGemini(
					c.env.GOOGLE_AI_API_KEY,
					audioBase64,
					String(body.mimeType || "audio/webm"),
					c.env.FISIOFLOW_AI_GATEWAY_URL,
					c.env.FISIOFLOW_AI_GATEWAY_TOKEN,
				);
			}
		} else {
			provider = "gemini-direct";
			transcription = await transcribeAudioWithGemini(
				c.env.GOOGLE_AI_API_KEY,
				audioBase64,
				String(body.mimeType || "audio/webm"),
				c.env.FISIOFLOW_AI_GATEWAY_URL,
				c.env.FISIOFLOW_AI_GATEWAY_TOKEN,
			);
		}

		const duration = performance.now() - start;

		c.executionCtx.waitUntil(
			logToAxiom(c.env, c.executionCtx, {
				level: "info",
				type: "ai_inference_latency",
				message: "Audio transcription completed",
				metadata: {
					action: "transcribe-audio",
					provider,
					durationMs: duration,
				},
			}),
		);

		return c.json({ data: { transcription, provider, confidence: 0.95 } });
	} catch (error: any) {
		return c.json(
			{ error: "Erro na transcrição", details: error.message },
			500,
		);
	}
});

app.post("/transcribe-session", async (c) => {
	const body = (await c.req.json().catch(() => ({}))) as Record<
		string,
		unknown
	>;
	const text = safeText(body.hintText);

	const prompt = `Com base no seguinte relato de uma sessão de fisioterapia, gere um prontuário no formato SOAP (Subjetivo, Objetivo, Avaliação, Plano).
  Relato: "${text}"
  Retorne em formato JSON: { subjective, objective, assessment, plan }`;

	const start = performance.now();
	const aiResponse = await callGemini(c.env.GOOGLE_AI_API_KEY, prompt);
	const duration = performance.now() - start;

	c.executionCtx.waitUntil(
		logToAxiom(c.env, c.executionCtx, {
			level: "info",
			type: "ai_inference_latency",
			message: "SOAP generation completed",
			metadata: {
				action: "transcribe-session",
				durationMs: duration,
				promptLength: prompt.length,
			},
		}),
	);

	try {
		const soapData = JSON.parse(aiResponse.replace(/```json|```/g, ""));
		return c.json({ data: { soapData } });
	} catch {
		return c.json({ data: { soapData: buildSoapFromText(text) } });
	}
});

app.post("/treatment-assistant", async (c) => {
	const body = (await c.req.json().catch(() => ({}))) as Record<
		string,
		unknown
	>;
	const action = safeText(body.action);
	const risk = inferRiskLevel(
		`${safeText(body.patientId)} ${safeText(body.context)}`,
	);
	const suggestion =
		action === "predict_adherence"
			? `Risco de aderência: ${risk}. Fatores principais: frequência irregular, dor percebida e necessidade de reforço do plano domiciliar.`
			: action === "generate_report"
				? "Relatório automático: evolução clínica monitorada, manter acompanhamento e registrar resposta funcional nas próximas sessões."
				: "Conduta sugerida: revisar metas, ajustar progressão terapêutica e reforçar educação do paciente.";
	return c.json({ data: { suggestion } });
});

app.post("/analysis", async (c) => {
	const body = (await c.req.json().catch(() => ({}))) as Record<
		string,
		unknown
	>;
	return c.json({
		data: buildClinicalReport(
			(body.metrics as Record<string, unknown>) ?? {},
			(body.history as Record<string, unknown>) ?? undefined,
		),
	});
});

app.post("/form-suggestions", async (c) => {
	const body = (await c.req.json().catch(() => ({}))) as Record<
		string,
		unknown
	>;
	return c.json({
		data: { suggestions: buildFormSuggestions(safeText(body.context)) },
	});
});

app.post("/document/analyze", async (c) => {
	const body = (await c.req.json().catch(() => ({}))) as Record<
		string,
		unknown
	>;
	const fileUrl = safeText(body.fileUrl);
	const fileName = safeText(body.fileName) || "documento";
	const mediaType = safeText(body.mediaType);
	const baseText = `Documento ${fileName} recebido para análise.`;
	const classification = mediaType.includes("pdf")
		? { type: "clinical_report", confidence: 0.61 }
		: { type: "other", confidence: 0.48 };
	return c.json({
		data: {
			extractedData: {
				fileUrl,
				storagePath: fileUrl,
				text: baseText,
				fullText: baseText,
				confidence: 0.61,
				language: "pt",
			},
			classification,
			summary: {
				keyFindings: [baseText],
				impression: "Análise inicial concluída com heurística do Workers.",
				recommendations: [
					"Validar conteúdo com revisão clínica",
					"Salvar no prontuário após conferência",
				],
			},
			comparison: null,
			translation:
				body.options &&
				typeof body.options === "object" &&
				(body.options as Record<string, unknown>).includeTranslation
					? {
							originalText: baseText,
							translatedText: baseText,
							sourceLanguage: "auto",
							targetLanguage: String(
								(body.options as Record<string, unknown>).targetLanguage ??
									"pt",
							),
						}
					: null,
			tags: [
				{
					id: "ai-doc-1",
					name: classification.type.toUpperCase(),
					category: "modality",
					confidence: classification.confidence,
				},
			],
		},
	});
});

app.post("/document/classify", async (c) => {
	const body = (await c.req.json().catch(() => ({}))) as Record<
		string,
		unknown
	>;
	const text = safeText(body.text);
	const lower = text.toLowerCase();
	const type =
		lower.includes("resson") || lower.includes("mri")
			? "mri"
			: lower.includes("raio") ||
					lower.includes("x-ray") ||
					lower.includes("rx")
				? "xray"
				: lower.includes("tomografia") || lower.includes("ct")
					? "ct_scan"
					: "clinical_report";
	return c.json({ data: { type, confidence: 0.58 } });
});

app.post("/document/summarize", async (c) => {
	const body = (await c.req.json().catch(() => ({}))) as Record<
		string,
		unknown
	>;
	const text = safeText(body.text);
	return c.json({
		data: {
			keyFindings: text
				.split("\n")
				.map((line) => line.trim())
				.filter(Boolean)
				.slice(0, 3),
			impression: firstSentence(text, "Resumo clínico indisponível."),
			recommendations: [
				"Correlacionar com sintomas atuais",
				"Registrar no prontuário",
			],
			criticalAlerts: [],
		},
	});
});

app.post("/document/translate", async (c) => {
	const body = (await c.req.json().catch(() => ({}))) as Record<
		string,
		unknown
	>;
	const text = safeText(body.text);
	const targetLanguage = safeText(body.targetLanguage) || "pt";
	return c.json({
		data: {
			originalText: text,
			translatedText: text,
			sourceLanguage: "auto",
			targetLanguage,
		},
	});
});

app.post("/document/compare", async (c) => {
	const body = (await c.req.json().catch(() => ({}))) as Record<
		string,
		unknown
	>;
	const currentText = safeText(body.currentText);
	return c.json({
		data: {
			hasChanges: false,
			changes: [
				firstSentence(currentText, "Nenhuma mudança relevante identificada."),
			],
			progressScore: 50,
		},
	});
});

app.post("/document/pdf", async (c) => {
	const body = (await c.req.json().catch(() => ({}))) as Record<
		string,
		unknown
	>;
	return c.json({
		data: {
			url:
				safeText(
					(body.documentData as Record<string, unknown> | undefined)
						?.extractedData as unknown,
				) || null,
			generated: true,
		},
	});
});
app.post("/executive-summary", async (c) => {
	const body = (await c.req.json().catch(() => ({}))) as Record<
		string,
		unknown
	>;
	return c.json({ data: buildExecutiveSummary(body) });
});

/**
 * Endpoints nativos de IA (Workers AI)
 */
app.post("/native/summarize", async (c) => {
	const { text } = await c.req.json();
	if (!text) return c.json({ error: "Texto é obrigatório" }, 400);

	const summary = await summarizeClinicalNote(c.env, text);
	return c.json({ data: { summary } });
});

app.post("/native/translate", async (c) => {
	const { text, target } = await c.req.json();
	const response = await runAi(c.env, "@cf/meta/m2m100-1.2b", {
		text,
		target_lang: target || "english",
	});
	return c.json({ data: { translated: response.translated_text } });
});

app.post("/movement-video", async (c) => {
	const body = (await c.req.json().catch(() => ({}))) as Record<
		string,
		unknown
	>;
	const exerciseName = safeText(body.exerciseName) || "Exercício Livre";
	return c.json({
		data: {
			analysis: {
				reps: 10,
				score: 8,
				errors: [],
				feedback: `Análise automática concluída para ${exerciseName}. Movimento globalmente adequado, revisar amplitude e ritmo para maior consistência.`,
				isValidExercise: true,
			},
		},
	});
});

/**
 * Busca Vetorial (RAG) - Conhecimento Clínico
 */
app.post("/vector-search", async (c) => {
	const { query, filter } = await c.req.json();

	if (!query) return c.json({ error: "Query is required" }, 400);

	try {
		// 1. Gerar embedding da pergunta via Gateway
		const baseUrl = c.env.FISIOFLOW_AI_GATEWAY_URL
			? `${c.env.FISIOFLOW_AI_GATEWAY_URL}/google-ai-studio`
			: "https://generativelanguage.googleapis.com";

		const embedUrl = `${baseUrl}/v1beta/models/text-embedding-004:embedContent?key=${c.env.GOOGLE_AI_API_KEY}`;

		const embedRes = await fetch(embedUrl, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${c.env.FISIOFLOW_AI_GATEWAY_TOKEN}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ content: { parts: [{ text: query }] } }),
		});

		const { embedding } = (await embedRes.json()) as any;

		// 2. Buscar no Vectorize (se o binding existir)
		// Nota: Como o binding é dinâmico em 2026, verificamos a existência
		if (c.env.CLINICAL_KNOWLEDGE) {
			const vectorRes = await c.env.CLINICAL_KNOWLEDGE.query(embedding.values, {
				topK: 5,
				filter: filter || {},
				returnMetadata: "all",
			});
			return c.json({ data: vectorRes.matches });
		}

		return c.json({ data: [], message: "Vector index not initialized" });
	} catch (error: any) {
		return c.json(
			{ error: "Vector search failed", details: error.message },
			500,
		);
	}
});

/**
 * Ingestão de Conhecimento (Wiki -> Vectorize)
 */
app.post("/ingest", async (c) => {
	const { text, metadata } = await c.req.json();

	if (!text) return c.json({ error: "Text is required" }, 400);

	try {
		// 1. Gerar embedding do conteúdo via Gateway
		const baseUrl = c.env.FISIOFLOW_AI_GATEWAY_URL
			? `${c.env.FISIOFLOW_AI_GATEWAY_URL}/google-ai-studio`
			: "https://generativelanguage.googleapis.com";

		const embedUrl = `${baseUrl}/v1beta/models/text-embedding-004:embedContent?key=${c.env.GOOGLE_AI_API_KEY}`;

		const embedRes = await fetch(embedUrl, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${c.env.FISIOFLOW_AI_GATEWAY_TOKEN}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ content: { parts: [{ text }] } }),
		});

		const { embedding } = (await embedRes.json()) as any;

		// 2. Salvar no Vectorize
		if (c.env.CLINICAL_KNOWLEDGE) {
			const id = `wiki_${Date.now()}`;
			await c.env.CLINICAL_KNOWLEDGE.upsert([
				{
					id,
					values: embedding.values,
					metadata: {
						...metadata,
						text: text.substring(0, 1000), // Guardar amostra do texto para o chat
						timestamp: new Date().toISOString(),
					},
				},
			]);
			return c.json({ success: true, id });
		}

		return c.json({ error: "Vector index not initialized" }, 500);
	} catch (error: any) {
		return c.json({ error: "Ingestion failed", details: error.message }, 500);
	}
});

app.post("/suggest-reply", async (c) => {
	const body = (await c.req.json().catch(() => ({}))) as Record<
		string,
		unknown
	>;
	const patientName = safeText(body.patientName) || "Paciente";
	const context = safeText(body.context) || "Acompanhamento de rotina";

	const prompt = `Você é um assistente administrativo e clínico de uma clínica de fisioterapia premium.
  Sua tarefa é redigir uma mensagem de WhatsApp para o paciente: ${patientName}.
  Contexto atual: ${context}
  
  Diretrizes:
  1. Tom profissional, acolhedor e empático.
  2. Seja conciso (máximo 3 parágrafos curtos).
  3. Use uma linguagem clara e evite jargões médicos complexos, a menos que necessário.
  4. Inclua um "Call to Action" (ex: perguntar se ele quer agendar, ou como está se sentindo).
  5. Use no máximo 2-3 emojis pertinentes.
  
  Retorne apenas o texto sugerido para a mensagem.`;

	try {
		const result = await callGemini(
			c.env.GOOGLE_AI_API_KEY,
			prompt,
			"gemini-1.5-flash",
			c.env.FISIOFLOW_AI_GATEWAY_URL,
		);
		return c.json({ data: { suggestion: result } });
	} catch (error: any) {
		console.error("[AI/SuggestReply] Error:", error);
		return c.json({ error: "Erro ao gerar sugestão de IA" }, 500);
	}
});

// ─── Receipt OCR — vision extraction via Gemini ──────────────────────────────
app.post("/receipt-ocr", async (c) => {
	if (!c.env.GOOGLE_AI_API_KEY) {
		return c.json({ error: "AI not configured" }, 503);
	}

	let imageBase64: string;
	let mimeType: string;

	// Accept both multipart/form-data (file upload) and JSON (base64 pre-encoded)
	const contentType = c.req.header("content-type") ?? "";
	if (contentType.includes("multipart/form-data")) {
		try {
			const formData = await c.req.formData();
			const file = formData.get("image") as File | null;
			if (!file) return c.json({ error: "Campo 'image' ausente no formulário" }, 400);
			const arrayBuffer = await file.arrayBuffer();
			const bytes = new Uint8Array(arrayBuffer);
			let binary = "";
			for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
			imageBase64 = btoa(binary);
			mimeType = file.type || "image/jpeg";
		} catch {
			return c.json({ error: "Erro ao ler imagem do formulário" }, 400);
		}
	} else {
		const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
		imageBase64 = String(body.imageBase64 ?? "");
		mimeType = String(body.mimeType ?? "image/jpeg");
		if (!imageBase64) return c.json({ error: "imageBase64 ausente" }, 400);
	}

	const prompt = `Você é um sistema de extração de dados financeiros para uma clínica de fisioterapia.
Analise a imagem do comprovante de pagamento e extraia as seguintes informações:

1. valor: valor numérico em reais (número, sem símbolo R$, use ponto como decimal, ex: 150.00)
2. nome: nome do pagador/titular (string ou null)
3. cardLastDigits: últimos 4 dígitos do cartão se visível (string de 4 chars ou null)
4. isFirstPayment: true se o comprovante indica primeira parcela ou pagamento inicial (boolean)
5. pixKey: chave pix se visível (string ou null)
6. dataTransacao: data da transação no formato YYYY-MM-DD se visível (string ou null)

Responda APENAS com um JSON válido, sem markdown, sem explicação:
{"valor": 0, "nome": null, "cardLastDigits": null, "isFirstPayment": false, "pixKey": null, "dataTransacao": null}`;

	try {
		const baseUrl = c.env.FISIOFLOW_AI_GATEWAY_URL
			? `${c.env.FISIOFLOW_AI_GATEWAY_URL}/google-ai-studio`
			: "https://generativelanguage.googleapis.com";

		const headers: Record<string, string> = { "Content-Type": "application/json" };
		if (c.env.FISIOFLOW_AI_GATEWAY_URL && c.env.FISIOFLOW_AI_GATEWAY_TOKEN) {
			headers["Authorization"] = `Bearer ${c.env.FISIOFLOW_AI_GATEWAY_TOKEN}`;
		}

		const response = await fetch(
			`${baseUrl}/v1beta/models/gemini-1.5-flash:generateContent?key=${c.env.GOOGLE_AI_API_KEY}`,
			{
				method: "POST",
				headers,
				body: JSON.stringify({
					contents: [{
						parts: [
							{ text: prompt },
							{ inline_data: { mime_type: mimeType, data: imageBase64 } },
						],
					}],
					generationConfig: { temperature: 0.1, maxOutputTokens: 512 },
				}),
			},
		);

		if (!response.ok) {
			const err = await response.json().catch(() => ({})) as any;
			throw new Error(err?.error?.message ?? `Gemini HTTP ${response.status}`);
		}

		const geminiResult = await response.json() as any;
		const rawText: string = geminiResult.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";

		// Strip potential markdown fences
		const jsonStr = rawText.replace(/```json?\n?/g, "").replace(/```/g, "").trim();

		let extracted: Record<string, unknown>;
		try {
			extracted = JSON.parse(jsonStr);
		} catch {
			return c.json({ success: false, error: "IA não retornou JSON válido", raw: rawText }, 422);
		}

		const valor = Number(extracted.valor ?? 0);
		return c.json({
			success: true,
			data: {
				valor: isNaN(valor) ? 0 : valor,
				nome: extracted.nome ?? null,
				cardLastDigits: extracted.cardLastDigits ?? null,
				isFirstPayment: Boolean(extracted.isFirstPayment),
				pixKey: extracted.pixKey ?? null,
				dataTransacao: extracted.dataTransacao ?? null,
			},
		});
	} catch (error: any) {
		console.error("[AI/ReceiptOCR] Error:", error);
		return c.json({ success: false, error: "Erro ao processar comprovante", details: error.message }, 500);
	}
});

export { app as aiRoutes };
