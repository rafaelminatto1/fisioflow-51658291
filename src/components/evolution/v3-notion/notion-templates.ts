/**
 * notion-templates.ts
 *
 * Rich Notion-style SOAP templates for orthopedic physiotherapy.
 * HTML content is rendered inside the NotionEvolutionEditor (Tiptap + prose CSS).
 *
 * Sections map to the SOAPTemplate interface:
 *   - subjective  → "S" — patient subjective report
 *   - objective   → "O" — measurable physical exam findings
 *   - assessment  → "A" — clinical reasoning & diagnosis
 *   - plan        → "P" — intervention & next steps
 */

import type { SOAPTemplate } from "./TemplateSelector";

// ─────────────────────────────────────────────────────────────────────────────
// HTML block helpers
// ─────────────────────────────────────────────────────────────────────────────

const h3 = (text: string) => `<h3>${text}</h3>`;
const p = (text: string) => `<p>${text}</p>`;
const ul = (items: string[]) =>
	`<ul>${items.map((i) => `<li>${i}</li>`).join("")}</ul>`;
const ol = (items: string[]) =>
	`<ol>${items.map((i) => `<li>${i}</li>`).join("")}</ol>`;
const callout = (emoji: string, text: string) =>
	`<div class="callout"><span class="callout-icon">${emoji}</span><span>${text}</span></div>`;
const hr = () => `<hr>`;
const bold = (text: string) => `<strong>${text}</strong>`;

// ─────────────────────────────────────────────────────────────────────────────
// Templates
// ─────────────────────────────────────────────────────────────────────────────

export const NOTION_TEMPLATES: SOAPTemplate[] = [
	// ═══════════════════════════════════════════════════════════════════════════
	// 0. ORTOPEDIA GERAL — SESSÃO DE RETORNO (template universal)
	// ═══════════════════════════════════════════════════════════════════════════
	{
		id: "notion-orto-geral",
		name: "🦴 Ortopedia Geral — Sessão de Retorno",
		category: "followup",
		usageCount: 0,
		subjective: [
			callout("🔄", "<strong>Fisioterapia Ortopédica — Retorno de Sessão</strong>"),
			h3("Relato do Paciente"),
			ul([
				"EVA atual: <strong>__/10</strong> &nbsp;·&nbsp; Comparado à sessão anterior: ( ) Melhorou &nbsp;( ) Igual &nbsp;( ) Piorou",
				"Localização da dor: __________  &nbsp;·&nbsp;  Irradiação: ( ) Não &nbsp;( ) Sim → __________",
				"Período de maior dor: ( ) Manhã &nbsp;( ) Tarde &nbsp;( ) Noite &nbsp;( ) Constante",
				"Sono: ( ) Sem alteração &nbsp;( ) Acordou __x &nbsp;·&nbsp; Posição antiálgica: __________",
			]),
			h3("Atividades entre Sessões"),
			ul([
				"Exercícios domiciliares (HEP): ( ) Realizou todos &nbsp;( ) Parcialmente &nbsp;( ) Não realizou",
				"Atividade física / trabalho desde a última sessão: __________",
				"Piora após: __________",
				"Melhora após: __________",
			]),
			h3("Objetivos do Paciente Hoje"),
			p("Paciente refere como prioridade desta sessão: __________"),
		].join(""),

		objective: [
			h3("Amplitude de Movimento (Goniometria / Visual)"),
			ul([
				"Movimento principal limitado: __________ → D: ___° / E: ___°  <em>(ref.: ___°)</em>",
				"Comparado à última sessão: ( ) Ganho de ___° &nbsp;( ) Estável &nbsp;( ) Regresso",
				"Dor durante ADM: ( ) Ausente &nbsp;( ) No início &nbsp;( ) No fim &nbsp;( ) Em todo arco",
			]),
			hr(),
			h3("Força Muscular (MRC 0–5)"),
			ul([
				"Grupo muscular principal: __________ &nbsp;→&nbsp; D: ___/5 &nbsp;/ E: ___/5",
				"Déficit em relação ao lado oposto: ___% &nbsp;·&nbsp; Comparado à última sessão: __________",
			]),
			hr(),
			h3("Testes Especiais (aplicáveis ao quadro)"),
			ul([
				"Teste 1: __________ → ( ) Negativo &nbsp;( ) Positivo",
				"Teste 2: __________ → ( ) Negativo &nbsp;( ) Positivo",
				"Teste 3: __________ → ( ) Negativo &nbsp;( ) Positivo",
			]),
			hr(),
			h3("Medidas / Perimetria (quando pertinente)"),
			ul([
				"Edema local: ( ) Ausente &nbsp;( ) Leve &nbsp;( ) Moderado &nbsp;( ) Importante",
				"Perimetria: D ___cm / E ___cm &nbsp;<em>(ponto anatômico: __________)</em>",
			]),
		].join(""),

		assessment: [
			callout(
				"📊",
				`Progressão clínica: ( ) Satisfatória &nbsp;( ) Estagnada &nbsp;( ) Regressão<br>` +
				`<strong>Sessão nº ___</strong> — Objetivo atingido: ___% (estimado)`,
			),
			p(
				"Paciente evolui com __________ <em>(melhora / manutenção / piora)</em> do quadro de __________, apresentando EVA __/10 e ganho de ADM de ___° desde o início do tratamento. Limitação funcional atual: __________.",
			),
			h3("Achados Relevantes"),
			ul([
				"Dor: ( ) Mecânica &nbsp;( ) Inflamatória &nbsp;( ) Neuropática &nbsp;( ) Mista",
				"Controle neuromuscular: ( ) Adequado &nbsp;( ) Insuficiente → __________",
				"Padrão de compensação observado: __________",
				"Critérios de progressão de fase: __________  <em>(atingidos / pendentes)</em>",
			]),
		].join(""),

		plan: [
			h3("Condutas da Sessão"),
			ol([
				"Recursos físicos: __________ &nbsp;·&nbsp; Parâmetros: __________ &nbsp;·&nbsp; Tempo: ___min",
				"Terapia manual: __________ &nbsp;·&nbsp; Grau: ___ &nbsp;·&nbsp; Região: __________",
				"Exercício terapêutico 1: __________ × ___rep × ___séries &nbsp;<em>carga: ___kg / nível: ___</em>",
				"Exercício terapêutico 2: __________ × ___rep × ___séries",
				"Exercício terapêutico 3: __________ × ___rep × ___séries",
				"Propriocepção / equilíbrio: __________ × ___seg × ___séries",
			]),
			hr(),
			h3("Resposta ao Tratamento"),
			ul([
				"EVA pós-sessão: __/10 &nbsp;<em>(melhora de ___pontos vs. início da sessão)</em>",
				"ADM pós-mobilização: ___°",
				"Reação adversa: ( ) Nenhuma &nbsp;( ) Piora transitória → __________",
			]),
			hr(),
			callout("🏠", `<strong>HEP — Exercícios para casa:</strong><br>
1. __________ × ___rep × ___séries<br>
2. __________ × ___rep × ___séries<br>
Frequência: ___ vezes ao dia / semana`),
			p("Próxima sessão: __________ &nbsp;·&nbsp; Frequência recomandada: ___×/semana"),
		].join(""),
	},

	// ═══════════════════════════════════════════════════════════════════════════
	// 1. PRIMEIRA CONSULTA ORTOPÉDICA
	// ═══════════════════════════════════════════════════════════════════════════
	{
		id: "notion-orto-primeira-consulta",
		name: "Primeira Consulta Ortopédica",
		category: "initial",
		usageCount: 0,
		subjective: [
			callout(
				"🆕",
				"<strong>Primeira sessão — anamnese completa obrigatória</strong>",
			),
			h3("Queixa Principal"),
			p("Paciente relata __________ há ______ semanas/meses."),
			h3("Mecanismo de Lesão / Início"),
			ul([
				"Início: ( ) Súbito  ( ) Gradual  ( ) Insidioso",
				"Fator desencadeante: __________",
				"Localização: __________ irradiação para __________",
			]),
			h3("Comportamento da Dor"),
			ul([
				"EVA repouso: __/10 · EVA movimento: __/10 · EVA pior: __/10",
				"Piora com: __________",
				"Melhora com: __________",
				"Comportamento noturno: ( ) Não incomoda  ( ) Acorda  ( ) Impede dormir",
			]),
			h3("Histórico Relevante"),
			ul([
				"Cirurgias: ( ) Não  ( ) Sim → __________",
				"Fraturas: ( ) Não  ( ) Sim → __________",
				"Tratamento fisioterapêutico anterior: ( ) Não  ( ) Sim → Resposta: __________",
				"Medicação em uso: __________",
			]),
			callout("🚩", "Red Flags triados: ( ) Ausentes  ( ) Presentes → __________"),
		].join(""),

		objective: [
			h3("Inspeção"),
			ul([
				"Postura estática: __________",
				"Deformidades / atrofias: __________",
				"Edema / equimose: ( ) Ausente  ( ) Presente ______",
			]),
			hr(),
			h3("Palpação"),
			ul([
				"Dor à palpação: __________ (região / estrutura)",
				"Temperatura local: ( ) Normal  ( ) Aumentada",
				"Crepitação: ( ) Não  ( ) Sim",
			]),
			hr(),
			h3("Amplitude de Movimento (Goniometria)"),
			ul([
				"Flexão: ___°  (ref. ___°)",
				"Extensão: ___°  (ref. ___°)",
				"Rotação interna: ___°  Rotação externa: ___°",
				"ADM: ( ) Sem dor  ( ) Com dor no fim  ( ) Com dor durante",
			]),
			hr(),
			h3("Força Muscular (MRC 0–5)"),
			ul([
				"Grupos principais: __________",
				"Déficit comparativo lado oposto: ( ) Não  ( ) Sim _______%",
			]),
			hr(),
			h3("Testes Especiais"),
			ul([
				"Teste 1: __________ → ( ) Neg  ( ) Pos",
				"Teste 2: __________ → ( ) Neg  ( ) Pos",
				"Teste 3: __________ → ( ) Neg  ( ) Pos",
			]),
		].join(""),

		assessment: [
			callout(
				"🩺",
				`${bold("Diagnóstico Fisioterapêutico:")} __________`,
			),
			p(
				"Paciente apresenta quadro compatível com __________ com comprometimento de __________, resultando em limitações funcionais de __________.",
			),
			h3("Achados Relevantes"),
			ul([
				"Dor: __________ (mecânica / inflamatória / neural / mista)",
				"Déficit de ADM: __________",
				"Fraqueza muscular: __________",
				"Instabilidade: ( ) Não  ( ) Sim → __________",
			]),
			h3("Hipóteses Diagnósticas"),
			ol(["Principal: __________", "Diferencial: __________"]),
			callout("📎", "Exames solicitados/pendentes: __________"),
		].join(""),

		plan: [
			h3("Objetivos de Tratamento"),
			ul([
				"Curto prazo (2–4 sem): Redução da dor · Controle do edema · Ganho de ADM",
				"Médio prazo (4–8 sem): Fortalecimento · Estabilidade articular",
				"Longo prazo (8–12 sem): Retorno às AVDs / atividade esportiva",
			]),
			hr(),
			h3("Condutas da 1ª Sessão"),
			ol([
				"Crioterapia / termoterapia — ___min na região __________",
				"Mobilização articular — grau ______ em __________",
				"Alongamento — __________ × ___seg × ___séries",
				"Eletroterapia: ( ) TENS  ( ) FES  ( ) Ultrassom → Parâmetros: __________",
			]),
			hr(),
			h3("Plano de Tratamento"),
			ul([
				"Frequência: ___× semana · Duração estimada: ___ semanas",
				"Próxima sessão: __________",
			]),
			callout("📌", "Orientações domiciliares: __________ "),
		].join(""),
	},

	// ═══════════════════════════════════════════════════════════════════════════
	// 2. LOMBALGIA / DOR LOMBAR (retorno)
	// ═══════════════════════════════════════════════════════════════════════════
	{
		id: "notion-orto-lombalgia",
		name: "Lombalgia — Retorno de Sessão",
		category: "followup",
		usageCount: 0,
		subjective: [
			callout("🔄", "Sessão de retorno — Lombalgia"),
			h3("Relato do Paciente"),
			ul([
				"EVA atual: __/10 (anterior: __/10) → ( ) Melhorou  ( ) Igual  ( ) Piorou",
				"Dor irradiadora para MMII: ( ) Não  ( ) Sim → _______________",
				"Sintomas neurológicos (formigamento, dormência): ( ) Ausentes  ( ) Presentes → ___",
				"Qualidade do sono: ( ) Não afetado  ( ) Acordou ___x · Posição de alívio: ___",
			]),
			h3("Atividades desde a última sessão"),
			ul([
				"Exercícios domiciliares: ( ) Realizou  ( ) Não realizou  ( ) Parcialmente",
				"Atividade física: __________",
				"Piora após: __________",
			]),
		].join(""),

		objective: [
			h3("Mobilidade Lombar (Flexicurvo / Visual)"),
			ul([
				"Flexão anterior: ___cm (distância dedos–chão) ou ___°",
				"Extensão: ___°  Inclinação Lat D: ___°  Inclinação Lat E: ___°",
				"Padrão de movimento: ( ) Normal  ( ) Antálgico  ( ) Limitado",
			]),
			h3("Exame Neurológico Rápido"),
			ul([
				"Lasègue: ( ) Neg  ( ) Pos → ___° MMID / MMIE",
				"Reflexos patelares e aquileus: ( ) Normais  ( ) Alterados → ___",
				"Sensibilidade: ( ) Preservada  ( ) Alterada → dermátomos ___",
			]),
			h3("Força e Estabilidade"),
			ul([
				"Transverso do abdômen: ( ) Ativa corretamente  ( ) Dificuldade",
				"Glúteo médio (teste de Trendelenburg): D: ( ) Neg  ( ) Pos · E: ( ) Neg  ( ) Pos",
				"Core Draw-In Maneuver: ___seg sustentação",
			]),
		].join(""),

		assessment: [
			callout(
				"📊",
				"Progressão em relação à sessão anterior: ( ) Satisfatória  ( ) Estagnada  ( ) Regressão",
			),
			p(
				"Paciente apresenta lombalgia __________ (mecânica / discal / facetária / miofascial) com EVA __/10. Apresenta __________ em comparação à sessão anterior.",
			),
			h3("Achados Clínicos"),
			ul([
				"Dor mecânica: ( ) Sim  ( ) Não · Comportamento: ( ) Centralização  ( ) Periferalização",
				"Déficit neurológico: ( ) Ausente  ( ) Presente → ___",
				"Instabilidade segmentar: ( ) Suspeita  ( ) Descartada",
			]),
		].join(""),

		plan: [
			h3("Condutas da Sessão"),
			ol([
				"Terapia manual: __________ (mobilização/manipulação L___–L___)",
				"Exercício terapêutico: __________ × ___rep × ___séries",
				"Eletroterapia: TENS ____Hz ____min / Ultrassom ___W/cm² ___min",
				"Liberação miofascial: __________ (região / músculo)",
			]),
			h3("Resposta ao Tratamento"),
			ul([
				"EVA pós-sessão: __/10",
				"ADM pós-mobilização: Flexão ___° / Extensão ___°",
			]),
			hr(),
			callout("📌", "Orientações domiciliares: __________"),
			p(`Próxima sessão: __________`),
		].join(""),
	},

	// ═══════════════════════════════════════════════════════════════════════════
	// 3. JOELHO — RETORNO (pós-lesão/pós-cirúrgico)
	// ═══════════════════════════════════════════════════════════════════════════
	{
		id: "notion-orto-joelho",
		name: "Joelho — Reabilitação / Retorno",
		category: "followup",
		usageCount: 0,
		subjective: [
			callout("🦵", "Protocolo de reabilitação de joelho"),
			h3("Queixa do Dia"),
			ul([
				"EVA: __/10 · Localização: ( ) Medial  ( ) Lateral  ( ) Anterior  ( ) Posterior  ( ) Difuso",
				"Edema percebido pelo paciente: ( ) Não  ( ) Sim",
				"Sensação de instabilidade: ( ) Não  ( ) Sim → situação: ___",
				"Atividades limitadas: __________",
			]),
			h3("Status Pós-Operatório (se aplicável)"),
			ul([
				"Semana pós-op: ___",
				"Carga: ( ) NWB  ( ) PWB (__%) ( ) FWB  ( ) Sem auxílio",
				"Órtese em uso: ( ) Não  ( ) Sim → tipo: ___",
			]),
		].join(""),

		objective: [
			h3("Medidas Objetivas"),
			ul([
				"Perimetria coxa (10cm prox. a patela): D ___cm / E ___cm",
				"Perimetria joelho (linha articular): D ___cm / E ___cm",
				"Edema articular: ( ) Ausente  ( ) + ( ) ++ ( ) +++",
			]),
			h3("Amplitude de Movimento"),
			ul([
				"Flexão ativa: D ___° / E ___°  (ref. 135°)",
				"Extensão ativa: D ___° / E ___°  (ref. 0°)",
				"Hiperextensão: ( ) Ausente  ( ) Presente ___°",
			]),
			h3("Testes Especiais"),
			ul([
				"Lachman: ( ) Neg  ( ) Pos grad. ___",
				"Gaveta anterior/posterior: ( ) Neg  ( ) Pos ___mm",
				"McMurray (menisco): ( ) Neg  ( ) Pos medial/lateral",
				"Clarke (femuropatelar): ( ) Neg  ( ) Pos",
				"Varo / Valgo stress: ( ) Neg  ( ) Pos ___mm",
			]),
			h3("Força (Dinamometria / MRC)"),
			ul([
				"Quadríceps MRC: D ___/5  E ___/5",
				"Isquiotibiais MRC: D ___/5  E ___/5",
				"Glúteo médio: D ___/5  E ___/5",
			]),
		].join(""),

		assessment: [
			callout(
				"📊",
				"Fase de reabilitação: ( ) Inflamatória/Proteção  ( ) Fortalecimento  ( ) Funcional  ( ) RTP",
			),
			p(
				"Joelho __________ (D/E) apresenta __________ com déficit de __________ comparado ao lado contralateral. Critérios de progressão de fase: __________ (atingidos / pendentes).",
			),
			h3("Raciocínio Clínico"),
			ul([
				"Déficit de força quádriceps: ___%",
				"Déficit de ADM: ___%",
				"Limb Symmetry Index: ___%",
			]),
		].join(""),

		plan: [
			h3("Condutas"),
			ol([
				"Crioterapia pós-exercício: 15min",
				"Mobilização patelar: superior/inferior/medial/lateral — ___ séries",
				"Fortalecimento CCA: __________ × ___rep × ___séries com ___kg",
				"Fortalecimento CCF: __________ × ___rep × ___séries",
				"Propriocepção: __________ × ___seg × ___séries",
				"Eletroestimulação (FES Quádriceps): ___Hz ___µs ___min",
			]),
			hr(),
			h3("Progressão para Próxima Sessão"),
			ul([
				"Critério para progressar: __________",
				"EVA pós-sessão: __/10",
			]),
			callout("📌", "HEP (Home Exercise Program): __________"),
			p("Retorno: __________"),
		].join(""),
	},

	// ═══════════════════════════════════════════════════════════════════════════
	// 4. OMBRO — SÍNDROME DO IMPACTO / MANGUITO ROTADOR
	// ═══════════════════════════════════════════════════════════════════════════
	{
		id: "notion-orto-ombro",
		name: "Ombro — Síndrome do Impacto / Manguito",
		category: "followup",
		usageCount: 0,
		subjective: [
			callout("💪", "Reabilitação de ombro — Patologia do Manguito Rotador"),
			h3("Relato"),
			ul([
				"EVA: __/10 · Piora: ( ) Elevação  ( ) Rotação  ( ) Noturno  ( ) Repouso",
				"Arco doloroso: ( ) Ausente  ( ) 60–120°  ( ) Acima de 120°",
				"Limitação funcional: __________ (vestir-se / alcançar / dormir)",
				"Estalinhos / crepitação: ( ) Não  ( ) Sim",
			]),
		].join(""),

		objective: [
			h3("Amplitude de Movimento (Ativo / Passivo)"),
			ul([
				"Flexão: A ___° / P ___° (ref. 180°)",
				"Abdução: A ___° / P ___° (ref. 180°)",
				"Rotação Interna: A ___° / P ___° (ref. 70°)",
				"Rotação Externa: A ___° / P ___° (ref. 90°)",
				"Elevação no plano escap. (Scaption): ___°",
			]),
			h3("Testes Especiais"),
			ul([
				"Neer: ( ) Neg  ( ) Pos",
				"Hawkins–Kennedy: ( ) Neg  ( ) Pos",
				"Speed (bíceps longo): ( ) Neg  ( ) Pos",
				"Lift-off / Bear hug (subescapular): ( ) Neg  ( ) Pos",
				"Empty Can / Full Can (supra): ( ) Neg  ( ) Pos",
				"AC joint compression: ( ) Neg  ( ) Pos",
			]),
			h3("Ritmo Escapulotorácico"),
			ul([
				"Discinesia escapular: ( ) Ausente  ( ) Tipo I  ( ) Tipo II  ( ) Tipo III",
				"Teste de reposicionamento escapular (TRA): ( ) Neg  ( ) Pos",
			]),
		].join(""),

		assessment: [
			callout(
				"🩺",
				"Diagnóstico provável: Síndrome do impacto subacromial (__° estágio) / Lesão parcial de manguito / Bursite subacromial",
			),
			p(
				"Ombro __________ (D/E) com dor __/10, arco doloroso __________, discinesia __________ e fraqueza de __________. Fase: ( ) Aguda ( ) Subaguda ( ) Crônica.",
			),
		].join(""),

		plan: [
			h3("Condutas"),
			ol([
				"Mobilização articular glenoumeral: inferior/posterior — grau ___",
				"Mobilização escapulotorácica: __________ × ___rep",
				"Fortalecimento manguito (rotadores externos): __________",
				"Fortalecimento serrátil anterior / trapézio inferior: __________",
				"Ultrassom contínuo 1MHz ___W/cm² ___min OR TENS ___Hz ___min",
				"Kinesio Tape escapular: ( ) Aplicado  ( ) Não",
			]),
			hr(),
			callout("📌", "Orientações: Evitar elevação acima de ____ / Exercícios domiciliares: __________"),
			p("Retorno: __________"),
		].join(""),
	},

	// ═══════════════════════════════════════════════════════════════════════════
	// 5. TORNOZELO — ENTORSE / INSTABILIDADE
	// ═══════════════════════════════════════════════════════════════════════════
	{
		id: "notion-orto-tornozelo",
		name: "Tornozelo — Entorse / Instabilidade",
		category: "followup",
		usageCount: 0,
		subjective: [
			callout("🦶", "Reabilitação de tornozelo — Entorse / Instabilidade ligamentar"),
			h3("Queixa"),
			ul([
				"Data da entorse: ___/___/___",
				"Mecanismo: ( ) Inversão  ( ) Eversão  ( ) Outros: ___",
				"EVA: __/10 · Edema pós-lesão: ( ) Insignificante  ( ) Moderado  ( ) Importante",
				"Capacidade de carga: ( ) Total  ( ) Parcial  ( ) Nenhuma",
				"Episódios anteriores: ( ) Não  ( ) Sim — ___× no tornozelo ___",
			]),
		].join(""),

		objective: [
			h3("Medidas"),
			ul([
				"Perimetria maleolar: D ___cm / E ___cm",
				"Edema (cacifo): ( ) 0  ( ) +  ( ) ++ ( ) +++",
			]),
			h3("ADM"),
			ul([
				"Dorsiflexão: D ___° / E ___° (ref. ≥10° com joelho em extensão)",
				"Plantiflexão: D ___° / E ___°",
				"Inversão: D ___° / E ___°  Eversão: D ___° / E ___°",
			]),
			h3("Testes Especiais"),
			ul([
				"Gaveta anterior: ( ) Neg  ( ) Pos",
				"Varo stress (talar tilt): ( ) Neg  ( ) Pos",
				"Squeeze test (fíbula): ( ) Neg  ( ) Pos",
				"Thompson (tendão Aquiles): ( ) Neg  ( ) Pos",
				"Ottawa Ankle Rules: ( ) Positivo — raio-X indicado  ( ) Negativo",
			]),
			h3("Propriocepção"),
			ul([
				"Apoio unipodal (olhos abertos): D ___seg / E ___seg",
				"Apoio unipodal (olhos fechados): D ___seg / E ___seg",
				"Star Excursion Balance Test (SEBT): ___cm",
			]),
		].join(""),

		assessment: [
			callout(
				"🩺",
				"Grau da entorse: ( ) I (leve) ( ) II (moderado) ( ) III (grave/ruptura). Fase: ( ) Aguda ( ) Subaguda ( ) Crônica",
			),
			p(
				"Tornozelo __________ (D/E) com déficit de __________ e instabilidade ligamentar __________ confirmada. Critérios RTS pendentes: __________.",
			),
		].join(""),

		plan: [
			h3("Protocolo POLICE"),
			ul([
				"Protection: Imobilização / restrição de carga ___ dias",
				"Optimal Loading: Carga progressiva com ___",
				"Ice: 15min × ___ ao dia",
				"Compression: Bandagem / brace",
				"Elevation: acima do nível cardíaco",
			]),
			hr(),
			h3("Condutas"),
			ol([
				"Mobilização talocrural (deslizamento posterior): ___ séries",
				"Fortalecimento eversores (fibular): ___rep × ___séries",
				"Treino proprioceptivo: __________ × ___seg × ___séries",
				"Taping / Bandagem funcional: ( ) Aplicada",
				"Crioterapia: 15min pós-sessão",
			]),
			callout("📌", "Critério para RTS: __________"),
			p("Retorno: __________"),
		].join(""),
	},

	// ═══════════════════════════════════════════════════════════════════════════
	// 6. QUADRIL — FAI / BURSITE / DOR INGUINAL
	// ═══════════════════════════════════════════════════════════════════════════
	{
		id: "notion-orto-quadril",
		name: "Quadril — FAI / Bursite / Dor Inguinal",
		category: "followup",
		usageCount: 0,
		subjective: [
			callout("🦴", "Reabilitação de quadril"),
			h3("Relato"),
			ul([
				"EVA: __/10 · Localização: ( ) Inguinal  ( ) Trocantérica  ( ) Glútea  ( ) Difusa",
				"Piora com: ( ) Rotação  ( ) Flexão >90°  ( ) Sedestação prolongada  ( ) Esporte: ___",
				"Percepção de estalincho (snapping hip): ( ) Não  ( ) Sim — ( ) Medial  ( ) Lateral",
				"Impacto nas AVDs: __________",
			]),
		].join(""),

		objective: [
			h3("ADM (Flexão / Extensão / Rot.)"),
			ul([
				"Flexão: D ___° / E ___° (ref. 120°)",
				"Extensão: D ___° / E ___° (ref. 20°)",
				"RI em 90° flex: D ___° / E ___° (ref. 45°)",
				"RE em 90° flex: D ___° / E ___° (ref. 45°)",
				"Abdução: D ___° / E ___° (ref. 45°)",
			]),
			h3("Testes Especiais"),
			ul([
				"FADIR (FAI): ( ) Neg  ( ) Pos",
				"FABER (Patrick): ( ) Neg  ( ) Pos — dist. joelho-maca: ___cm",
				"Thomas (flexores curtos): D ( ) Neg ( ) Pos / E ( ) Neg ( ) Pos",
				"Trendelenburg: D ( ) Neg ( ) Pos / E ( ) Neg ( ) Pos",
				"Ober (TFL/banda iliotibial): ( ) Neg  ( ) Pos",
			]),
			h3("Força Muscular"),
			ul([
				"Glúteo médio (abdução isométrica): D ___N / E ___N",
				"Glúteo máximo (extensão resistida): D ___/5 / E ___/5",
				"Hip flexor (iliopsoas): D ___/5 / E ___/5",
			]),
		].join(""),

		assessment: [
			callout(
				"🩺",
				"Hipótese: ( ) FAI Cam  ( ) FAI Pincer  ( ) Bursite trocantérica  ( ) Síndrome do piriforme  ( ) LBP referida",
			),
			p(
				"Quadril __________ (D/E) com padrão __________ e déficit principal de __________. Fase de tratamento: __________.",
			),
		].join(""),

		plan: [
			h3("Condutas"),
			ol([
				"Mobilização de quadril: tração longitudinal / posterior — ___ séries",
				"Liberação miofascial: __________ (piriforme/TFL/psoas)",
				"Fortalecimento glúteo médio: __________ × ___rep × ___séries",
				"Fortalecimento glúteo máximo: __________ × ___rep × ___séries",
				"Treino de controle motor (Trendelenburg): ___rep × ___séries",
				"Crioterapia / TENS: ___min",
			]),
			callout("📌", "Restrições: evitar __________ / Retorno: __________"),
		].join(""),
	},

	// ═══════════════════════════════════════════════════════════════════════════
	// 7. CERVICALGIA / COLUNA CERVICAL
	// ═══════════════════════════════════════════════════════════════════════════
	{
		id: "notion-orto-cervicalgia",
		name: "Cervicalgia — Coluna Cervical",
		category: "followup",
		usageCount: 0,
		subjective: [
			callout("🦿", "Reabilitação cervical"),
			h3("Relato"),
			ul([
				"EVA: __/10 · Irradiação para MMSS: ( ) Não  ( ) Sim → dermátomo: ___",
				"Cefaleia associada: ( ) Não  ( ) Sim — frequência: ___",
				"Tontura / zumbido: ( ) Não  ( ) Sim",
				"Piora com: ( ) Flexão  ( ) Extensão  ( ) Rotação  ( ) Compressão axial  ( ) Postura",
				"Trabalho: ( ) Sedentário  ( ) Atividade física  ( ) Horas em tela: ___h/dia",
			]),
			callout("🚩", "Red flags triados: cefaleia em trovão? déficit neurológico progressivo? mielopatia?"),
		].join(""),

		objective: [
			h3("ADM Cervical"),
			ul([
				"Flexão: ___°  Extensão: ___°  (ref. 50°/60°)",
				"Rot. D: ___°  Rot. E: ___°  (ref. 80°)",
				"Inc. Lat. D: ___°  Inc. Lat. E: ___°  (ref. 45°)",
			]),
			h3("Exame Neurológico"),
			ul([
				"Spurling: ( ) Neg  ( ) Pos → dermátomo: ___",
				"Distração cervical: ( ) Neg  ( ) Pos",
				"Reflexos: Bíceps C5–C6 ( ) Normal  ( ) Alt · Tríceps C7 ( ) Normal  ( ) Alt",
				"Sensibilidade: __________ (dermátomo afetado)",
				"Força MRC: Del. ___/5  Bíc. ___/5  Tríc. ___/5  Interóss. ___/5",
			]),
			h3("Musculatura Cervical"),
			ul([
				"Flexão cérvico-craniana profunda (DCF — Longus Colli): ___mmHg biofeedback",
				"Tensão muscular palpável: __________ (músculo/s)",
			]),
		].join(""),

		assessment: [
			callout(
				"🩺",
				"Diagnóstico: ( ) Cervicalgia mecânica  ( ) Cervicalgia discogênica  ( ) Radiculopatia C___  ( ) Síndrome facetária",
			),
			p(
				"Coluna cervical com dor __/10, ADM limitada em __________, comprometimento neurológico: __________ (ausente / presente).",
			),
		].join(""),

		plan: [
			h3("Condutas"),
			ol([
				"Mobilização cervical: C___–C___ (deslizamento ant/post/lat) — grau ___",
				"Tração cervical manual / mecânica: ___kg × ___min",
				"Fortalecimento flexores profundos (DCF): ___mmHg × ___seg × ___rep",
				"Liberação dos extensores / suboccipitais: ___min",
				"TENS cervical: ___Hz ___min",
				"Postura de trabalho (ergonomia): ( ) Orientado",
			]),
			callout("📌", "Orientações: __________ / Retorno: __________"),
		].join(""),
	},

	// ═══════════════════════════════════════════════════════════════════════════
	// 8. PÓS-OPERATÓRIO LCA
	// ═══════════════════════════════════════════════════════════════════════════
	{
		id: "notion-orto-pos-op-lca",
		name: "Pós-Operatório LCA — Protocolo",
		category: "procedure",
		usageCount: 0,
		subjective: [
			callout("⚕️", "Protocolo pós-operatório Ligamento Cruzado Anterior"),
			h3("Semana Pós-op e Status"),
			ul([
				"Semana: ___ · Data da cirurgia: ___/___/___",
				"Enxerto utilizado: ( ) Tendão Patelar  ( ) Semitendinoso/Gracilis  ( ) BPTB Allograft",
				"Procedimento adicional: ( ) Meniscectomia parcial  ( ) Microfraturas  ( ) Outros: ___",
				"Dor: EVA __/10 · Rigidez matinal: ( ) Não  ( ) Sim",
			]),
			h3("Funcionalidade"),
			ul([
				"Carga: ( ) NWB  ( ) PWB (__%)  ( ) FWB  ( ) Sem auxílio",
				"Órtese: ( ) Sim — ___ graus  ( ) Não",
				"Deambulação: __________ (bengala, muleta, livre)",
			]),
		].join(""),

		objective: [
			h3("Avaliação Objetiva"),
			ul([
				"Perimetria coxa (10cm acima patela): Op ___cm / Contralt ___cm",
				"Edema articular (linha articular joelho): Op ___cm / Contralt ___cm",
				"ADM: Flexão ___° / Extensão ___° (lag de extensão: ___°)",
				"Sinal de derrame articular (balloon test): ( ) Neg  ( ) Pos",
			]),
			h3("Força e Controle Motor"),
			ul([
				"SLR (contração quádriceps sem deficit de extensão): ( ) Realiza  ( ) Não realiza",
				"Quádriceps set: ___rep realizadas sem dor",
				"Controle de VMO: ( ) Bom  ( ) Regular  ( ) Ruim",
			]),
		].join(""),

		assessment: [
			callout(
				"📊",
				"Fase de reabilitação: ( ) I — Proteção ≤2 sem  ( ) II — Mobilidade 2–6 sem  ( ) III — Força 6–12 sem  ( ) IV — Funcional 3–6 m  ( ) V — RTP >6 m",
			),
			p(
				"Paciente na semana ___ pós-op de reconstrução de LCA. Evolução __________ (esperada / acelerada / atrasada). Critérios de progressão de fase: __________ (atingidos/pendentes).",
			),
			h3("Limitantes Atuais"),
			ul([
				"Dor: __________ ",
				"Edema: __________",
				"ADM: __________ (gap de extensão — prioridade máxima)",
				"Força: __________",
			]),
		].join(""),

		plan: [
			h3("Condutas — Semana ___"),
			ol([
				"Crioterapia: 20min com compressão",
				"Extensão passiva / mobilização patelar inferior para extensão completa",
				"Quádriceps set isométrico: 10rep × 3 séries",
				"SLR com controle de lag: ___rep × ___séries",
				"Flexão ativa assistida: até ___° graus",
				"Eletroestimulação FES quádriceps: ___Hz ___µs ___min",
				"Mini-agachamento (CCF 0–60°): ___rep × ___séries",
			]),
			hr(),
			h3("Critérios de Progressão"),
			ul([
				"Extensão completa (0°): ( ) Atingida  ( ) Pendente",
				"Flexão ≥90°: ( ) Atingida sem edema  ( ) Pendente",
				"SLR sem lag: ( ) Sim  ( ) Não",
				"Edema controlado: ( ) Sim  ( ) Não",
			]),
			callout("📌", "HEP: __________ / Retorno: __________"),
		].join(""),
	},

	// ═══════════════════════════════════════════════════════════════════════════
	// 9. PUNHO E MÃO — SÍNDROME DO TÚNEL DO CARPO / TENDINITE
	// ═══════════════════════════════════════════════════════════════════════════
	{
		id: "notion-orto-punho-mao",
		name: "Punho / Mão — Túnel do Carpo / Tendinite",
		category: "followup",
		usageCount: 0,
		subjective: [
			callout("✋", "Reabilitação de punho e mão"),
			h3("Relato"),
			ul([
				"EVA: __/10 · Região: ( ) Punho  ( ) Polegar  ( ) Dedos ___  ( ) Palma  ( ) Dorso",
				"Parestesias: ( ) Não  ( ) Sim → dedos: ___ · Piora à noite: ( ) Não  ( ) Sim",
				"Atividade desencadeante: __________ (digitação / pinça / trabalho manual)",
				"Ocupação: ___________",
			]),
		].join(""),

		objective: [
			h3("ADM Punho (Ativo)"),
			ul([
				"Flexão: D ___° / E ___°  (ref. 80°)",
				"Extensão: D ___° / E ___°  (ref. 70°)",
				"Desvio Ulnar: D ___°  Desvio Radial: D ___°",
				"Pronação/Supinação: Pro ___° / Sup ___°",
			]),
			h3("Força de Preensão"),
			ul([
				"Dinamometria: D ___kgf / E ___kgf (posição II)",
				"Pinça polpa-polpa: D ___kgf / E ___kgf",
			]),
			h3("Testes Especiais"),
			ul([
				"Tinel (nervo mediano): ( ) Neg  ( ) Pos",
				"Phalen: ( ) Neg  ( ) Pos — sintomas em ___seg",
				"Finkelstein: ( ) Neg  ( ) Pos (de Quervain)",
				"Teste de Wartenberg: ( ) Neg  ( ) Pos (nervo radial)",
				"Compressão do carpo: ( ) Neg  ( ) Pos ___seg",
			]),
		].join(""),

		assessment: [
			callout(
				"🩺",
				"Diagnóstico: ( ) STC leve/mod/grave  ( ) Tendinite de de Quervain  ( ) Epicondilalgia  ( ) Artrose CMC1  ( ) Tendinite flexores",
			),
			p("Punho/mão __________ (D/E) com EVA __/10, déficit de força __% comparado ao lado contralateral e __________."),
		].join(""),

		plan: [
			h3("Condutas"),
			ol([
				"Órtese de repouso nocturna: ( ) Prescrita  ( ) Já utiliza",
				"Mobilização neural: deslizamento do nervo mediano — ___ séries suaves",
				"Mobilização do carpo: ___",
				"Fortalecimento progressivo: __________ com grip trainer / terapêutico",
				"Ultrassom terapêutico: 1MHz ___W/cm² ___min",
				"Laser de baixa intensidade: __________ J/cm²",
			]),
			callout("📌", "Orientações ergonômicas: __________ / Retorno: __________"),
		].join(""),
	},

	// ═══════════════════════════════════════════════════════════════════════════
	// 10. ALTA CLÍNICA ORTOPÉDICA
	// ═══════════════════════════════════════════════════════════════════════════
	{
		id: "notion-orto-alta",
		name: "Alta Clínica Ortopédica",
		category: "discharge",
		usageCount: 0,
		subjective: [
			callout("✅", "Documento de Alta Fisioterapêutica"),
			h3("Resumo Clínico"),
			ul([
				"Condição tratada: __________",
				"Período de tratamento: ___ semanas · Total de sessões: ___",
				"Relato final do paciente: sem queixa ativa / assintomático / independente",
			]),
		].join(""),

		objective: [
			h3("Comparativo Inicial × Final"),
			ul([
				"EVA inicial: __/10 → EVA final: __/10",
				"ADM inicial: ___° → ADM final: ___° (___% de recuperação)",
				"Força inicial: ___/5 → Força final: ___/5",
				"Perimetria (se aplicável): ___cm → ___cm",
			]),
			h3("Testes Funcionais (alta)"),
			ul([
				"Hop Test (LCA/joelho): Limb Symmetry Index ___% (OK ≥90%)",
				"SEBT tornozelo: ___cm (OK ≥95% lado contralateral)",
				"Teste de Elevação Ombro: ___° sem dor",
				"Distância dedos–chão: ___cm",
			]),
			h3("Escalas Funcionais"),
			ul([
				"DASH: ___/100 (inicial: ___)",
				"KOOS / IKDC: ___/100",
				"Lysholm: ___/100",
				"PSFS (Patient-Specific Functional Scale): ___/10",
			]),
		].join(""),

		assessment: [
			callout(
				"🏆",
				"Paciente atingiu os objetivos terapêuticos estabelecidos e está apto para receber alta.",
			),
			p(
				"Após ___ semanas de tratamento, o paciente apresenta resolução de __________ com retorno à(s) atividade(s) __________. Função recuperada: ___%. Sem limitações residuais significativas.",
			),
		].join(""),

		plan: [
			h3("Recomendações de Alta"),
			ol([
				"Manutenção de programa de exercícios domiciliares: __________",
				"Retorno ao esporte / atividade profissional: liberado / a partir de: ___",
				"Reavaliação preventiva em: ___ meses",
				"Encaminhamento para: ( ) Ortopedista  ( ) Médico do esporte  ( ) Nenhum",
			]),
			hr(),
			callout(
				"⚠️",
				"Sinais de alerta para retorno: recidiva de dor intensa, novo episódio de trauma, limitação funcional súbita.",
			),
			p(`Alta concedida em: ___ / ___ / _____`),
			p("Fisioterapeuta: ___________________  CREFITO: ___________"),
		].join(""),
	},
];
