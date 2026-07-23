/**
 * Harness de regressão do RAG clínico (golden-set).
 *
 * Roda um conjunto curado de perguntas contra o endpoint deployado `/api/ai-search/ask`
 * e verifica se a fonte esperada aparece na recuperação (recall@k) + se respondeu.
 * NÃO é um teste hermético — bate na API real (precisa de token). Rode sob demanda:
 *
 *   RAG_API_BASE="https://fisioflow-api.rafalegollas.workers.dev" \
 *   RAG_TOKEN="<neon jwt de um profissional>" \
 *   npx tsx apps/api/scripts/rag-eval.ts
 *
 * O golden-set abaixo é uma SEMENTE (conteúdo não-PHI já presente na base). Um
 * fisioterapeuta deve expandi-lo com perguntas reais e as fontes/termos esperados.
 * Cada item passa se QUALQUER `expect` (case-insensitive) aparecer na resposta ou no
 * conteúdo/título de alguma fonte recuperada.
 */

interface GoldenItem {
  q: string;
  /** Termos/nomes esperados na resposta ou nas fontes recuperadas. */
  expect: string[];
}

const GOLDEN: GoldenItem[] = [
  { q: "Critérios de progressão na reabilitação de LCA", expect: ["LCA", "progress"] },
  { q: "protocolo de reabilitação do manguito rotador", expect: ["manguito", "rotador"] },
  { q: "progressão de carga em tendinopatia", expect: ["tendinopatia", "carga"] },
  { q: "exercícios para dor lombar crônica", expect: ["lombar", "mckenzie", "williams"] },
  { q: "como estruturar uma evolução clínica no método SOAP", expect: ["SOAP", "subjetivo", "objetivo"] },
  { q: "quais escalas usar para avaliar dor do paciente", expect: ["EVA", "NPRS", "dor"] },
  { q: "contraindicações do protocolo de reconstrução de LCA", expect: ["contraindica", "LCA"] },
  { q: "qual o nível de evidência do protocolo de manguito rotador", expect: ["nível de evidência", "manguito"] },
  { q: "objetivos do tratamento em reabilitação do joelho", expect: ["objetivo", "joelho", "força"] },
  { q: "sinais de alerta (red flags) em ombro pós-operatório", expect: ["red flag", "ombro", "dor noturna"] },
  { q: "escala para medir medo de movimento (cinesiofobia)", expect: ["tampa", "kinesiofobia", "cinesiofobia"] },
  { q: "diferença mínima clinicamente importante na escala de dor", expect: ["DMCI", "2 pontos", "30%"] },
];

const K = 8;

function norm(s: unknown): string {
  return String(s ?? "").toLowerCase();
}

async function main() {
  const base = (process.env.RAG_API_BASE || "").replace(/\/$/, "");
  const token = process.env.RAG_TOKEN || "";
  if (!base || !token) {
    console.error("Defina RAG_API_BASE e RAG_TOKEN. Ex.:");
    console.error(
      '  RAG_API_BASE="https://fisioflow-api.rafalegollas.workers.dev" RAG_TOKEN="<jwt>" npx tsx apps/api/scripts/rag-eval.ts',
    );
    process.exit(2);
  }

  const rows: Array<{ q: string; hit: boolean; answered: boolean; sources: number }> = [];

  for (const item of GOLDEN) {
    try {
      const res = await fetch(`${base}/api/ai-search/ask`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ query: item.q }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        answered?: boolean;
        answer?: string | null;
        sources?: Array<{ title?: string; filename?: string; content?: string }>;
      };
      const sources = (data.sources || []).slice(0, K);
      const haystack = norm(data.answer) + " " + sources.map((s) => norm(s.title) + norm(s.filename) + norm(s.content)).join(" ");
      const hit = item.expect.some((e) => haystack.includes(norm(e)));
      rows.push({ q: item.q, hit, answered: Boolean(data.answered), sources: sources.length });
    } catch (e) {
      rows.push({ q: item.q, hit: false, answered: false, sources: 0 });
    }
  }

  const hits = rows.filter((r) => r.hit).length;
  const answered = rows.filter((r) => r.answered).length;
  const recall = ((hits / rows.length) * 100).toFixed(0);

  console.log(`\n# RAG golden-set — recall@${K}\n`);
  console.log("| # | pergunta | recuperou fonte esperada | respondeu | fontes |");
  console.log("|---|----------|:---:|:---:|:---:|");
  rows.forEach((r, i) =>
    console.log(`| ${i + 1} | ${r.q} | ${r.hit ? "✅" : "❌"} | ${r.answered ? "✅" : "—"} | ${r.sources} |`),
  );
  console.log(`\n**recall@${K}: ${hits}/${rows.length} (${recall}%)** · respondeu: ${answered}/${rows.length}\n`);

  // Gate: falha se recall < 80% (ajuste conforme o golden-set cresce).
  if (hits / rows.length < 0.8) {
    console.error(`Recall abaixo do limiar (80%). Investigar a recuperação.`);
    process.exit(1);
  }
}

main();
