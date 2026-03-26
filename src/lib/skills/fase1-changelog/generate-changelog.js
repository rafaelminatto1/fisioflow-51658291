#!/usr/bin/env node
/**
 * FisioFlow - Changelog Generator
 * Gera changelogs automáticos baseados em commits git
 *
 * Uso:
 *   node generate-changelog.js                      # Desde o último tag
 *   node generate-changelog.js --since=v1.0.0      # Desde uma versão específica
 *   node generate-changelog.js --days=7             # Últimos N dias
 *   node generate-changelog.js --output=CHANGELOG.md
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const CONFIG = {
	// Categorias de commits baseadas em conventional commits
	categories: {
		feat: { icon: "✨", label: "Novas Funcionalidades", priority: 1 },
		fix: { icon: "🐛", label: "Correções", priority: 2 },
		perf: { icon: "⚡", label: "Performance", priority: 3 },
		refactor: { icon: "♻️", label: "Refatorações", priority: 4 },
		docs: { icon: "📝", label: "Documentação", priority: 5 },
		test: { icon: "✅", label: "Testes", priority: 6 },
		chore: { icon: "🔧", label: "Manutenção", priority: 7 },
		style: { icon: "💅", label: "Estilo", priority: 8 },
		ci: { icon: "👷", label: "CI/CD", priority: 9 },
		build: { icon: "📦", label: "Build", priority: 10 },
	},
	// Escopos específicos do FisioFlow
	scopes: {
		patients: { label: "Gestão de Pacientes", color: "\x1b[36m" }, // Cyan
		schedule: { label: "Agendamento", color: "\x1b[33m" }, // Yellow
		evolution: { label: "Evolução Clínica", color: "\x1b[32m" }, // Green
		exercises: { label: "Exercícios", color: "\x1b[35m" }, // Magenta
		telemedicine: { label: "Telemedicina", color: "\x1b[34m" }, // Blue
		reports: { label: "Relatórios", color: "\x1b[31m" }, // Red
		auth: { label: "Autenticação", color: "\x1b[90m" }, // Gray
		mobile: { label: "App Mobile", color: "\x1b[95m" }, // Bright Magenta
		ui: { label: "Interface", color: "\x1b[96m" }, // Bright Cyan
		api: { label: "API", color: "\x1b[93m" }, // Bright Yellow
	},
	// Padrões para ignorar
	ignorePatterns: [
		/^Merge branch/,
		/^Merge pull request/,
		/^ chore: release/,
		/^chore: bump/,
		/^ci: skip/,
	],
};

/**
 * Executa um comando shell e retorna a saída
 */
function exec(command, options = {}) {
	try {
		return execSync(command, {
			encoding: "utf-8",
			stdio: "pipe",
			...options,
		}).trim();
	} catch  {
		return "";
	}
}

/**
 * Obtém o último tag de versão
 */
function getLastTag() {
	return exec("git describe --tags --abbrev=0 2>/dev/null") || "HEAD~10";
}

/**
 * Obtém commits desde um ponto específico
 */
function getCommits(since, days) {
	let range = "";
	if (days) {
		const date = new Date();
		date.setDate(date.getDate() - days);
		range = `--since="${date.toISOString()}"`;
	} else if (since && since.startsWith("v")) {
		range = `${since}..HEAD`;
	} else if (since) {
		range = `${since}..HEAD`;
	} else {
		const lastTag = getLastTag();
		range = `${lastTag}..HEAD`;
	}

	const commits = exec(
		`git log ${range} --pretty=format:"%H|%s|%an|%ad" --date=short`,
	);
	return commits ? commits.split("\n") : [];
}

/**
 * Parse um commit no formato conventional commits
 */
function parseCommit(commitLine) {
	const [hash, message, author, date] = commitLine.split("|");

	// Ignorar commits que seguem padrões de ignore
	if (CONFIG.ignorePatterns.some((pattern) => pattern.test(message))) {
		return null;
	}

	// Parse conventional commit: type(scope)!: description
	const conventionalRegex = /^(\w+)(?:\(([^)]+)\))?(?!:)(!?):\s*(.+)$/;
	const match = message.match(conventionalRegex);

	if (!match) {
		// Commit não convencional, mas ainda pode ser útil
		return {
			hash,
			message,
			author,
			date,
			type: "other",
			scope: null,
			breaking: false,
			description: message,
		};
	}

	const [, type, scope, breaking, description] = match;

	return {
		hash,
		message,
		author,
		date,
		type,
		scope,
		breaking: breaking === "!",
		description,
	};
}

/**
 * Agrupa commits por categoria
 */
function groupCommits(commits) {
	const grouped = {};
	const byScope = {};

	for (const category in CONFIG.categories) {
		grouped[category] = [];
	}
	grouped.other = [];
	grouped.breaking = [];

	for (const commitLine of commits) {
		const commit = parseCommit(commitLine);
		if (!commit) continue;

		if (commit.breaking) {
			grouped.breaking.push(commit);
		}

		const category = CONFIG.categories[commit.type] ? commit.type : "other";
		grouped[category].push(commit);

		// Agrupar também por escopo
		if (commit.scope) {
			if (!byScope[commit.scope]) {
				byScope[commit.scope] = [];
			}
			byScope[commit.scope].push(commit);
		}
	}

	return { grouped, byScope };
}

/**
 * Formata uma mudança para o changelog
 */
function formatChange(commit, colorize = true) {
	const scope = commit.scope
		? colorize
			? `\x1b[90m[${commit.scope}]\x1b[0m`
			: `[${commit.scope}]`
		: "";

	const breaking = commit.breaking
		? colorize
			? ` \x1b[31m[BREAKING]\x1b[0m`
			: ` **[BREAKING]**`
		: "";

	const hash = colorize
		? `\x1b[90m(${commit.hash.substring(0, 7)})\x1b[0m`
		: `(${commit.hash.substring(0, 7)})`;

	return `  - ${scope} ${commit.description}${breaking} ${hash}`;
}

/**
 * Gera o changelog em markdown
 */
function generateMarkdown(grouped, byScope, version, date) {
	let markdown = `# Atualizações${version ? ` - ${version}` : ""} - ${date}\n\n`;

	// Breaking changes primeiro
	if (grouped.breaking.length > 0) {
		markdown += `## ⚠️ Mudanças da Rompetes\n\n`;
		for (const commit of grouped.breaking) {
			markdown += formatChange({ ...commit, breaking: false }, false) + "\n";
		}
		markdown += "\n";
	}

	// Categorizadas
	const categoriesToShow = Object.entries(CONFIG.categories)
		.filter(
			([_, config]) => grouped[config.icon] && grouped[config.icon].length > 0,
		)
		.sort((a, b) => a[1].priority - b[1].priority);

	for (const [type, config] of categoriesToShow) {
		const commits = grouped[type];
		if (commits.length === 0) continue;

		markdown += `## ${config.icon} ${config.label}\n\n`;
		for (const commit of commits) {
			markdown += formatChange({ ...commit, breaking: false }, false) + "\n";
		}
		markdown += "\n";
	}

	// Por escopo (opcional)
	if (Object.keys(byScope).length > 0) {
		markdown += "## 📋 Por Módulo\n\n";
		for (const [scope, commits] of Object.entries(byScope)) {
			const scopeConfig = CONFIG.scopes[scope];
			const label = scopeConfig ? scopeConfig.label : scope;
			markdown += `### ${label}\n\n`;
			for (const commit of commits) {
				markdown +=
					formatChange({ ...commit, scope: null, breaking: false }, false) +
					"\n";
			}
			markdown += "\n";
		}
	}

	// Estatísticas
	const totalCommits =
		Object.values(grouped).reduce((sum, arr) => sum + arr.length, 0) -
		grouped.breaking.length;
	markdown += `---\n`;
	markdown += `**Total de mudanças:** ${totalCommits} commits\n`;

	return markdown;
}

/**
 * Exibe o changelog no terminal com cores
 */
function displayConsole(grouped, byScope) {
	console.log("\n" + "=".repeat(80));
	console.log("\x1b[1m\x1b[36m  FisioFlow - Changelog\x1b[0m");
	console.log("=".repeat(80) + "\n");

	// Breaking changes
	if (grouped.breaking.length > 0) {
		console.log("\x1b[1m\x1b[31m  ⚠️  MUDANÇAS QUE ROMPEM\x1b[0m\n");
		for (const commit of grouped.breaking) {
			console.log(formatChange({ ...commit, breaking: false }));
		}
		console.log();
	}

	// Por categoria
	for (const [type, config] of Object.entries(CONFIG.categories)) {
		const commits = grouped[type];
		if (commits.length === 0) continue;

		console.log(`\x1b[1m  ${config.icon} ${config.label}\x1b[0m`);
		console.log(`  ${"─".repeat(76)}`);
		for (const commit of commits) {
			console.log(formatChange({ ...commit, breaking: false }));
		}
		console.log();
	}

	// Outros
	if (grouped.other.length > 0) {
		console.log("\x1b[1m  📝 Outros\x1b[0m");
		console.log(`  ${"─".repeat(76)}`);
		for (const commit of grouped.other.slice(0, 5)) {
			console.log(formatChange(commit));
		}
		if (grouped.other.length > 5) {
			console.log(
				`  \x1b[90m... e mais ${grouped.other.length - 5} commits\x1b[0m`,
			);
		}
		console.log();
	}

	// Estatísticas
	const totalCommits =
		Object.values(grouped).reduce((sum, arr) => sum + arr.length, 0) -
		grouped.breaking.length;
	console.log("  " + "─".repeat(76));
	console.log(`  \x1b[1mTotal:\x1b[0m ${totalCommits} commits`);
	console.log("=".repeat(80) + "\n");
}

/**
 * Determina a próxima versão baseada nos commits
 */
function suggestNextVersion(grouped) {
	const lastTag = getLastTag();
	const match = lastTag.match(/v?(\d+)\.(\d+)\.(\d+)/);

	if (!match) return null;

	let [_, major, minor, patch] = match.slice(1).map(Number);

	if (grouped.breaking.length > 0) {
		major++;
		minor = 0;
		patch = 0;
	} else if (grouped.feat && grouped.feat.length > 0) {
		minor++;
		patch = 0;
	} else if (grouped.fix && grouped.fix.length > 0) {
		patch++;
	}

	return `v${major}.${minor}.${patch}`;
}

/**
 * Main
 */
function main() {
	const args = process.argv.slice(2);
	let since = null;
	let days = null;
	let output = null;

	for (const arg of args) {
		if (arg.startsWith("--since=")) {
			since = arg.split("=")[1];
		} else if (arg.startsWith("--days=")) {
			days = parseInt(arg.split("=")[1], 10);
		} else if (arg.startsWith("--output=")) {
			output = arg.split("=")[1];
		}
	}

	const commits = getCommits(since, days);

	if (commits.length === 0) {
		console.log(
			"\x1b[33m⚠️  Nenhum commit encontrado no período especificado.\x1b[0m",
		);
		return;
	}

	const { grouped, byScope } = groupCommits(commits);

	// Exibir no terminal
	displayConsole(grouped, byScope);

	// Salvar em arquivo se solicitado
	if (output) {
		const nextVersion = suggestNextVersion(grouped);
		const date = new Date().toLocaleDateString("pt-BR");
		const markdown = generateMarkdown(grouped, byScope, nextVersion, date);

		const outputPath = path.resolve(process.cwd(), output);

		// Se arquivo existe, prependar novo conteúdo
		let content = markdown;
		if (fs.existsSync(outputPath)) {
			const existing = fs.readFileSync(outputPath, "utf-8");
			content = markdown + "\n\n" + existing;
		}

		fs.writeFileSync(outputPath, content);
		console.log(`\x1b[32m✓ Changelog salvo em: ${outputPath}\x1b[0m`);

		if (nextVersion) {
			console.log(
				`\x1b[36m→ Sugestão de próxima versão: ${nextVersion}\x1b[0m`,
			);
		}
	}
}

if (require.main === module) {
	main();
}

module.exports = {
	generateMarkdown,
	getCommits,
	groupCommits,
	suggestNextVersion,
	CONFIG,
};
