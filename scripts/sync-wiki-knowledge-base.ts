import fs from "fs";
import path from "path";
import vm from "vm";
import { Client } from "pg";

type KnowledgeArticle = {
	id: string;
	title: string;
	group: string;
	subgroup: string;
	focus?: string[];
	evidence: string;
	year?: number;
	source?: string;
	url?: string;
	status: string;
	tags?: string[];
	highlights?: string[];
	observations?: string[];
	keyQuestions?: string[];
	summary?: string;
	metadata?: {
		journal?: string;
		authors?: string[];
		[key: string]: unknown;
	};
};

const pendingHighlights = [
	"Curadoria pendente",
	"Revisar nivel de evidencia",
	"Definir testes e progressao",
];

const pendingObservations = [
	"Adicionar observacoes clinicas da equipe",
	"Validar recomendacoes-chave",
];

function getArg(flag: string): string | undefined {
	const index = process.argv.indexOf(flag);
	if (index === -1) return undefined;
	return process.argv[index + 1];
}

function loadKnowledgeBase(): KnowledgeArticle[] {
	const filePath = path.resolve("src/data/knowledgeBase.ts");
	const source = fs.readFileSync(filePath, "utf8");
	const match = source.match(
		/export const knowledgeBase: KnowledgeArticle\[] = (\[[\s\S]*?\n\]);\n\nexport const knowledgeEvidenceLabels/,
	);
	if (!match) {
		throw new Error("Nao foi possivel localizar knowledgeBase.ts");
	}

	const sandbox = {
		pendingHighlights,
		pendingObservations,
	};

	return vm.runInNewContext(match[1], sandbox) as KnowledgeArticle[];
}

function buildSummary(article: KnowledgeArticle): string {
	if (article.summary?.trim()) return article.summary.trim();
	const highlights = (article.highlights ?? []).filter(Boolean).slice(0, 2);
	const focus = (article.focus ?? []).filter(Boolean).slice(0, 3).join(", ");
	const lead = article.source
		? `${article.source}${article.year ? ` ${article.year}` : ""}`
		: article.year
			? `Evidencia ${article.year}`
			: "Evidencia clinica";

	if (highlights.length >= 2) {
		return `${lead}: ${highlights[0]}. ${highlights[1]}.`;
	}
	if (highlights.length === 1) {
		return `${lead}: ${highlights[0]}.`;
	}
	if (focus) {
		return `${lead}: referencia para ${article.group.toLowerCase()} em ${article.subgroup.toLowerCase()}, com foco em ${focus}.`;
	}
	return `${lead}: ${article.title}.`;
}

async function main() {
	const connectionString = getArg("--connection-string") || process.env.DATABASE_URL;
	const organizationId = getArg("--organization-id");
	const userId = getArg("--user-id");

	if (!connectionString) {
		throw new Error("Passe --connection-string ou defina DATABASE_URL.");
	}
	if (!organizationId) {
		throw new Error("Passe --organization-id.");
	}
	if (!userId) {
		throw new Error("Passe --user-id.");
	}

	const client = new Client({ connectionString });
	await client.connect();

	try {
		const knowledgeBase = loadKnowledgeBase();
		const verifiedArticles = knowledgeBase.filter(
			(article) => article.status === "verified",
		);

		await client.query("BEGIN");

		for (const article of verifiedArticles) {
			const metadata = {
				year: article.year,
				journal: article.metadata?.journal ?? article.source,
				authors: article.metadata?.authors ?? [],
			};

			await client.query(
				`
					INSERT INTO knowledge_articles (
						organization_id,
						article_id,
						title,
						article_type,
						"group",
						subgroup,
						focus,
						evidence,
						year,
						source,
						url,
						tags,
						status,
						summary,
						highlights,
						clinical_implications,
						observations,
						key_questions,
						metadata,
						vector_status,
						view_count,
						citation_count,
						raw_text,
						created_by,
						updated_by,
						created_at,
						updated_at
					) VALUES (
						$1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10,$11,$12::jsonb,$13,$14,
						$15::jsonb,$16::jsonb,$17::jsonb,$18::jsonb,$19::jsonb,$20,$21,$22,$23,$24,$25,NOW(),NOW()
					)
					ON CONFLICT (organization_id, article_id)
					DO UPDATE SET
						title = EXCLUDED.title,
						article_type = EXCLUDED.article_type,
						"group" = EXCLUDED."group",
						subgroup = EXCLUDED.subgroup,
						focus = EXCLUDED.focus,
						evidence = EXCLUDED.evidence,
						year = EXCLUDED.year,
						source = EXCLUDED.source,
						url = EXCLUDED.url,
						tags = EXCLUDED.tags,
						status = EXCLUDED.status,
						summary = EXCLUDED.summary,
						highlights = EXCLUDED.highlights,
						clinical_implications = EXCLUDED.clinical_implications,
						observations = EXCLUDED.observations,
						key_questions = EXCLUDED.key_questions,
						metadata = EXCLUDED.metadata,
						vector_status = EXCLUDED.vector_status,
						updated_by = EXCLUDED.updated_by,
						updated_at = NOW()
				`,
				[
					organizationId,
					article.id,
					article.title,
					article.url?.toLowerCase().endsWith(".pdf") ? "pdf" : "link",
					article.group,
					article.subgroup,
					JSON.stringify(article.focus ?? []),
					article.evidence,
					article.year ?? null,
					article.source ?? null,
					article.url ?? null,
					JSON.stringify(article.tags ?? []),
					article.status,
					buildSummary(article),
					JSON.stringify(article.highlights ?? []),
					JSON.stringify(article.observations ?? []),
					JSON.stringify(article.observations ?? []),
					JSON.stringify(article.keyQuestions ?? []),
					JSON.stringify(metadata),
					"pending",
					0,
					null,
					null,
					userId,
					userId,
				],
			);
		}

		const countResult = await client.query(
			`
				SELECT count(*)::int AS total
				FROM knowledge_articles
				WHERE organization_id = $1
			`,
			[organizationId],
		);

		await client.query("COMMIT");

		console.log(
			JSON.stringify(
				{
					synced: verifiedArticles.length,
					totalKnowledgeArticles: countResult.rows[0]?.total ?? 0,
					organizationId,
				},
				null,
				2,
			),
		);
	} catch (error) {
		await client.query("ROLLBACK");
		throw error;
	} finally {
		await client.end();
	}
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
