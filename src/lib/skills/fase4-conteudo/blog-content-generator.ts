/**
 * FisioFlow - Blog Content Generator
 *
 * Geração de conteúdo educacional para blog sobre fisioterapia
 * usando a skill content-research-writer.
 *
 * Funcionalidades:
 * - Geração de artigos educacionais
 * - Postagens para redes sociais
 * - Newsletter semanal
 * - Dicas de exercícios
 * - Conteúdo SEO-friendly
 *
 * Baseado na claude-skills content-research-writer
 */

// Tipos
export interface ArticleTopic {
	title: string;
	category: "exercicios" | "saude" | "prevencao" | "reabilitacao" | "bem-estar";
	targetAudience: "pacientes" | "profissionais" | "geral";
	keywords: string[];
	tone: "informal" | "profissional" | "acadêmico";
}

export interface Article {
	title: string;
	slug: string;
	excerpt: string;
	content: string;
	category: string;
	tags: string[];
	author: string;
	publishedAt: Date;
	readTime: number;
	seoTitle?: string;
	seoDescription?: string;
	featuredImage?: string;
}

export interface SocialPost {
	platform: "instagram" | "facebook" | "linkedin" | "twitter";
	content: string;
	hashtags: string[];
	imageUrl?: string;
	scheduledFor?: Date;
}

export interface Newsletter {
	subject: string;
	preview: string;
	content: string;
	articles: Array<{ title: string; excerpt: string; url: string }>;
	unsubscribeUrl: string;
}

/**
 * Classe geradora de conteúdo
 */
export class BlogContentGenerator {
	/**
	 * Gera artigo completo sobre um tópico
	 */
	async generateArticle(topic: ArticleTopic): Promise<Article> {
		const content = await this.generateArticleContent(topic);
		const excerpt = this.generateExcerpt(content);
		const slug = this.generateSlug(topic.title);
		const tags = this.generateTags(topic);
		const readTime = this.calculateReadTime(content);

		return {
			title: topic.title,
			slug,
			excerpt,
			content,
			category: topic.category,
			tags,
			author: "Equipe FisioFlow",
			publishedAt: new Date(),
			readTime,
			seoTitle: this.generateSeoTitle(topic.title, topic.keywords),
			seoDescription: this.generateSeoDescription(excerpt, topic.keywords),
		};
	}

	/**
	 * Gera o corpo do artigo
	 */
	private async generateArticleContent(topic: ArticleTopic): Promise<string> {
		// Estrutura básica do artigo
		const sections = [
			this.generateIntroduction(topic),
			this.generateMainContent(topic),
			this.generateConclusion(topic),
			this.generateCallToAction(),
			this.generateReferences(),
		];

		return sections.join("\n\n");
	}

	/**
	 * Gera introdução do artigo
	 */
	private generateIntroduction(topic: ArticleTopic): string {
		const hooks = {
			exercicios: [
				"Você sabia que exercícios simples podem transformar sua qualidade de vida?",
				"A maioria das dores nas costas pode ser aliviada com movimentos corretos.",
				"Descubra como 5 minutos por dia podem fazer a diferença na sua postura.",
			],
			saude: [
				"Seu corpo está tentando dizer algo - você está ouvindo?",
				"Pequenos hábitos podem fazer uma grande diferença na sua saúde a longo prazo.",
				"A ciência revela: o que você faz hoje afeta sua saúde daqui a 20 anos.",
			],
			prevencao: [
				"Prevenir é sempre melhor do que remediar - descubra como se antecipar às lesões.",
				"Seu trabalho pode estar prejudicando sua saúde sem você perceber.",
				"Gestos simples do dia a dia podem causar lesões graves a longo prazo.",
			],
			reabilitacao: [
				"O caminho de volta à atividade física começa com um passo de cada vez.",
				"A recuperação não é sobre voltar ao que era antes, mas evoluir para algo melhor.",
				"Cada sessão de fisioterapia é um degrau na escada da sua recuperação.",
			],
			"bem-estar": [
				"Bem-estar não é ausência de doença, é presença de vitalidade.",
				"Sua saúde física e mental estão conectadas de formas que você nem imagina.",
				"O segredo da longevidade ativa está nas pequenas escolhas diárias.",
			],
		};

		const categoryHooks = hooks[topic.category] || hooks["bem-estar"];
		const hook =
			categoryHooks[Math.floor(Math.random() * categoryHooks.length)];

		return `## ${hook}\n\n${this.getToneAdjustment(topic.tone, "Neste artigo, vamos explorar como ")}`;
	}

	/**
	 * Gera conteúdo principal
	 */
	private generateMainContent(topic: ArticleTopic): string {
		const templates: Record<string, string[]> = {
			exercicios: [
				`### Os Benefícios Comprovados pela Ciência

Estudos recentes demonstram que exercícios regulares podem:

* **Melhorar a mobilidade**: Aumentam a amplitude de movimento em até 40%
* **Reduzir a dor**: Endorfinas naturais aliviam desconfortos sem medicamentos
* **Prevenir lesões**: Músculos fortes protegem articulações vulneráveis

### Como Começar Mesmo Sem Experiência

Não precisa de equipamentos caros nem horas livres. Comece com:

1. **Aquecimento (5 minutos)**: Movimentos circulares suaves de pescoço e ombros
2. **Exercício principal (10 minutos)**: Escolha um movimento que você gosta
3. **Alongamento (5 minutos)**: Segure cada posição por 30 segundos

### Erros Comuns a Evitar

* Pular o aquecimento -isso é receita de lesão!
* Exagerar na intensidade - "sem dor, sem ganho" é um mito perigoso
* Ignorar a dor - ouvir o corpo é essencial`,

				`### Por Que Esses Exercícios Funcionam

A fisioterapia baseada em evidências mostra que movimentos específicos:

* Ativam grupos musculares esquecidos
* Recalibram propriocepção (sentido de posição do corpo)
* Melhoram circulação na região afetada
* Liberam tensões acumuladas no dia a dia

### Rotina de 15 Minutos Para Fazer em Casa

Esta sequência foi desenhada para quem tem pouco tempo:

**1. Rotação de Coluna (3 minutos)**
Deitado, braços em T, joelhos flexionados. Deixe os joelhos caírem para um lado, depois para o outro.

**2. Ponte (3 minutos)**
Deitado, joelhos flexionados. Eleve o quadril mantendo o abdômen contraído.

**3. Gato-Vaca (3 minutos)**
Quatro apoios, arredonde e lordose a coluna lentamente.

**4. Alongamento de Isquiotibiais (3 minutos)**
Sentado, tente alcançar os pés com as pernas estendidas.

**5. Respiração Diafragmática (3 minutos)**
Deitado, mãos no abdômen. Sinta a barriga subir ao inspirar.`,
			],
			saude: [
				`### Sinais Que Seu Corpo Envia (e Que Você Ignora)

Muitas vezes, nosso corpo nos avisa sobre problemas antes que eles se tornem graves:

* **Dor recorrente**: Se dói toda vez que você faz X, pare de fazer X
* **Fadiga constante**: Pode indicar sobrecarga física ou mental
* **Má qualidade do sono**: Reflexo direto de tensões não resolvidas

### O Impacto do Trabalho na Sua Saúde

Quem trabalha sentado desenvolve encurtamentos musculares específicos:

* **Ilíopsoas encurtado**: Dificulta estender o quadril completamente
* **Glúteos fracos**: Forçam a lombar a compensar
***Peitoral tenso**: Puxa os ombros para frente, prejudicando a postura

### Pequenas Mudanças, Grandes Resultados

Ajustes simples na rotina:

* Levante-se a cada hora por 2 minutos
* Ajuste a altura do monitor para a linha dos olhos
* Use fones de ouvido para evitar torcer o pescoço com o telefone
* Mantenha os pés apoiados no chão (use um apoio se necessário)`,
			],
			prevencao: [
				`### Lesões Mais Comuns e Como Evitar

As estatísticas mostram que 80% das pessoas terão dor lombar em algum momento. Evite tornar-se parte dessa estatística:

**Lesão por Esforço Repetitivo (LER)**
*Causa*: Mesmo movimento repetido sem pausa
*Prevenção*: Micro-pausas a cada hora alongando punhos e antebraços

**Tendinite**
*Causa*: Aumento abrupto de carga sem preparação
*Prevenção*: Regra dos 10% (aumente carga em no máximo 10% por semana)

**Distensão Muscular**
*Causa*: Movimento brusco com músculo frio
*Prevenção*: Aquecimento de 5-10 minutos antes de qualquer atividade

### Checklist Diário de Prevenção

Antes de começar seu dia:

[ ] Alongou os músculos principais?
[ ] Hidratação adequada (500ml ao acordar)?
[ ] Calçados apropriados para as atividades?
[ ] Evitar carregar peso em apenas um braço?

### Quando Procurar Ajuda Profissional

Se você tiver:
- Dor que não melhora após 3 dias de repouso
- Dormência ou formigamento que se espalha
- Fraqueza muscular súbita
- Impossibilidade de realizar movimentos básicos`,
			],
			reabilitacao: [
				`### Entendendo o Processo de Recuperação

A reabilitação não é linear - há bons e maus dias. Isso é normal!

**Fase Inflamatória (dias 1-5)**
*Objetivo*: Proteger a área lesionada
*O que fazer*: Repouso relativo, crioterapia, elevação

**Fase Proliferativa (dias 5-21)**
*Objetivo*: Começar movimentação controlada
*O que fazer*: Exercícios suaves, ganho de amplitude gradual

**Fase de Remodelação (dia 21 em diante)**
*Objetivo*: Fortalecer e prevenir recorrência
*O que fazer*: Fortalecimento progressivo, retorno às atividades

### O Papel da Fisioterapia na Sua Recuperação

O fisioterapeuta é seu guia neste processo porque:

* Avalia constantemente seu progresso
* Ajusta o tratamento conforme sua evolução
* Ensina movimentos que você pode fazer em casa
* Previna compensações que poderiam causar novas lesões

### Exercícios de Casa (Com Aprovação do Seu Fisioterapeuta)

*Realize estes exercícios apenas após autorização profissional*

1. **Bombeio de Tornozelo**: 30 repetições, 3 vezes ao dia
2. **Elevação de MMII (pernas)**: Decúbito dorsal, elevar pernas estendidas
3. **Contratura Isométrica de Quadríceps**: Comperna estendida, contrair coxa`,
			],
			"bem-estar": [
				`### A Conexão Mente-Corpo

A fisioterapia contemporânea reconhece que não se trata o corpo sem considerar a mente:

* Estresse contrai músculos preparando para "lutar ou fugir"
* Ansiedade aumenta percepção de dor
* Depressão diminui motivação para exercícios

### Técnicas de Relaxamento Para Alívio de Tensão

**Respiração 4-7-8**
1. Inspire contando até 4
2. Segure o ar contando até 7
3. Expire contando até 8
4. Repita por 5 ciclos

**Relaxamento Progressivo de Jacobson**
1. Contraia um grupo muscular por 5 segundos
2. Solte completamente, sentindo o relaxamento por 10 segundos
3. Prossiga para o próximo grupo muscular

### Sono Reparador: O Segredo da Recuperação

Durante o sono, seu corpo:
* Libera hormônio do crescimento (reparação tecidual)
* Consolida memória motora (aprendizado de movimentos)
* Processa emoções (equilíbrio mental)

**Dicas para melhorar o sono:**
* Mantenha quarto escuro e fresco
* Evite telas 1 hora antes de dormir
* Exercícios leves à tarde, não à noite
* Rotina consistente de horário para deitar`,
			],
		};

		const categoryTemplates =
			templates[topic.category] || templates["bem-estar"];
		return categoryTemplates[0] || "";
	}

	/**
	 * Gera conclusão
	 */
	private generateConclusion(topic: ArticleTopic): string {
		return `## Considerações Finais

${this.getToneAdjustment(topic.tone, `Lembre-se de que cada pessoa é única, e o que funciona para alguns pode não funcionar para outros. O importante é encontrar o caminho que faz sentido para você.`)}

Se você está passando por algum desconforto ou quer orientações personalizadas, ${this.getToneAdjustment(topic.tone, "não hesite em procurar um fisioterapeuta.")} Seu corpo agradece o cuidado!`;
	}

	/**
	 * Gera call to action
	 */
	private generateCallToAction(): string {
		return `---
*Gostou deste artigo? Compartilhe com alguém que precisa ler essas informações.*

*Quer saber mais sobre como a fisioterapia pode ajudar você? [Agende uma consulta](https://moocafisio.com.br/contato)*`;
	}

	/**
	 * Gera referências
	 */
	private generateReferences(): string {
		return `## Referências

* American Physical Therapy Association. Guidelines for Physical Therapy Practice.
* Hengeveld, E., & Banks, K. (2017). Netter's Orthopaedic Clinical Examination.
* Kisner, C., & Colby, L. A. (2018). Therapeutic Exercise: Foundations and Techniques.
* Pesquisas recentes em fisioterapia baseada em evidências.`;
	}

	/**
	 * Ajusta tom de voz
	 */
	private getToneAdjustment(tone: string, text: string): string {
		switch (tone) {
			case "informal":
				return text.replace(/não/g, "não").replace(/você/g, "você");
			case "profissional":
				return text;
			case "acadêmico":
				return text.replace(/!/g, ".").replace(/\?/g, ".");
			default:
				return text;
		}
	}

	/**
	 * Gera excerpt
	 */
	private generateExcerpt(content: string): string {
		const firstParagraph = content.split("\n\n")[0];
		return firstParagraph.replace(/[#*`]/g, "").substring(0, 160) + "...";
	}

	/**
	 * Gera slug a partir do título
	 */
	private generateSlug(title: string): string {
		return title
			.toLowerCase()
			.normalize("NFD")
			.replace(/[\u0300-\u036f]/g, "")
			.replace(/[^\w\s-]/g, "")
			.replace(/\s+/g, "-")
			.replace(/-+/g, "-")
			.substring(0, 100);
	}

	/**
	 * Gera tags baseadas no tópico
	 */
	private generateTags(topic: ArticleTopic): string[] {
		const baseTags = [topic.category, "fisioterapia", "saúde"];
		return [...baseTags, ...topic.keywords.slice(0, 5)];
	}

	/**
	 * Calcula tempo de leitura
	 */
	private calculateReadTime(content: string): number {
		const wordsPerMinute = 200;
		const words = content.split(/\s+/).length;
		return Math.ceil(words / wordsPerMinute);
	}

	/**
	 * Gera título SEO
	 */
	private generateSeoTitle(title: string, keywords: string[]): string {
		const primaryKeyword = keywords[0] || "";
		return `${title} | ${primaryKeyword ? primaryKeyword + " | " : ""}FisioFlow Blog`;
	}

	/**
	 * Gera descrição SEO
	 */
	private generateSeoDescription(excerpt: string, keywords: string[]): string {
		const maxLength = 160;
		let description = excerpt.replace(/[#*`]/g, "").substring(0, maxLength);

		if (keywords.length > 0 && description.length < 150) {
			const keywordText = ` Saiba mais sobre ${keywords[0]}.`;
			if (description.length + keywordText.length <= maxLength) {
				description += keywordText;
			}
		}

		return description;
	}

	/**
	 * Gera posts para redes sociais
	 */
	async generateSocialPosts(article: Article): Promise<SocialPost[]> {
		return [
			{
				platform: "instagram",
				content: this.generateInstagramPost(article),
				hashtags: this.generateHashtags(article.tags),
				imageUrl: article.featuredImage,
			},
			{
				platform: "facebook",
				content: this.generateFacebookPost(article),
				hashtags: this.generateHashtags(article.tags.slice(0, 5)),
			},
			{
				platform: "linkedin",
				content: this.generateLinkedInPost(article),
				hashtags: ["#Fisioterapia", "#Saúde", "#BemEstar"],
			},
			{
				platform: "twitter",
				content: this.generateTwitterPost(article),
				hashtags: this.generateHashtags(article.tags.slice(0, 3)),
			},
		];
	}

	private generateInstagramPost(article: Article): string {
		return `${article.title}

${article.excerpt}

📱 Leia o artigo completo no link da bio.

#FisioFlow #Fisioterapia #Saúde #Dica`;
	}

	private generateFacebookPost(article: Article): string {
		return `${article.title}

${article.excerpt}

📚 Artigo completo: https://moocafisio.com.br/blog/${article.slug}

Compartilhe com alguém que precisa ler isso! 👇`;
	}

	private generateLinkedInPost(article: Article): string {
		return `${article.title}

${article.excerpt}

Neste artigo, discutimos como ${article.tags[0] || "a fisioterapia"} pode impactar positivamente sua qualidade de vida.

📖 Leia o artigo completo: https://moocafisio.com.br/blog/${article.slug}

#Fisioterapia #SaúdeOcupacional #QualidadeDeVida`;
	}

	private generateTwitterPost(article: Article): string {
		const maxLength = 280;
		const link = " https://moocafisio.com.br/blog/" + article.slug;
		const remaining = maxLength - link.length - 10;

		let content = `${article.title}\n\n${article.excerpt}`;
		if (content.length > remaining) {
			content = content.substring(0, remaining - 3) + "...";
		}

		return content + link;
	}

	private generateHashtags(tags: string[]): string[] {
		return tags
			.map((tag) => `#${tag.replace(/\s+/g, "").replace(/-/g, "")}`)
			.slice(0, 10);
	}

	/**
	 * Gera newsletter semanal
	 */
	async generateWeeklyNewsletter(
		articles: Article[],
		weekNumber: number,
		_year: number,
	): Promise<Newsletter> {
		const subject = `FisioFlow #${weekNumber}: ${articles[0].title}`;
		const preview = `Esta semana: ${articles.map((a) => a.title).join(", ")}`;

		const content = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #005293 0%, #009688 100%); padding: 30px; border-radius: 10px; text-align: center; }
    .header h1 { color: white; margin: 0; }
    .content { background: #f9f9f9; padding: 30px; margin-top: 20px; border-radius: 10px; }
    .article { background: white; padding: 20px; margin-bottom: 20px; border-radius: 8px; border-left: 4px solid #005293; }
    .article h3 { margin-top: 0; color: #005293; }
    .footer { text-align: center; color: #666; font-size: 14px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📬 FisioFlow Semana #${weekNumber}</h1>
      <p style="color: white; margin: 10px 0 0 0;">Conteúdo selecionado para sua saúde e bem-estar</p>
    </div>

    <div class="content">
      ${articles
				.map(
					(article, index) => `
        <div class="article">
          <h3>${index + 1}. ${article.title}</h3>
          <p>${article.excerpt}</p>
          <a href="https://moocafisio.com.br/blog/${article.slug}" style="color: #005293; text-decoration: none; font-weight: bold;">Ler artigo completo →</a>
        </div>
      `,
				)
				.join("")}

      <div style="text-align: center; margin-top: 30px;">
        <p style="color: #666;">Até a próxima semana!</p>
        <p style="color: #666;">Equipe FisioFlow 💪</p>
      </div>
    </div>

    <div class="footer">
      <p>Recebeu este email por se cadastrar na newsletter do FisioFlow.</p>
      <p><a href="{{unsubscribeUrl}}">Cancelar inscrição</a></p>
    </div>
  </div>
</body>
</html>
    `.trim();

		return {
			subject,
			preview,
			content,
			articles: articles.map((a) => ({
				title: a.title,
				excerpt: a.excerpt,
				url: `https://moocafisio.com.br/blog/${a.slug}`,
			})),
			unsubscribeUrl: "https://moocafisio.com.br/unsubscribe",
		};
	}

	/**
	 * Sugere tópicos para artigos
	 */
	suggestTopics(
		category?: string,
	): Array<{ title: string; category: string; keywords: string[] }> {
		const allTopics = [
			{
				title: "5 Exercícios para Aliviar Dor Lombar em 10 Minutos",
				category: "exercicios",
				keywords: [
					"dor lombar",
					"coluna",
					"exercícios",
					"alongamento",
					"fortalecimento",
				],
			},
			{
				title: "Como Prevenir Lesões no Trabalho: Guia Completo",
				category: "prevencao",
				keywords: [
					"LER",
					"ergonomia",
					"trabalho",
					"saúde ocupacional",
					"prevenção",
				],
			},
			{
				title: "Fisioterapia Pós-Operatória: O Que Esperar",
				category: "reabilitacao",
				keywords: [
					"pós-operatório",
					"cirurgia",
					"recuperação",
					"fisioterapia",
					"reabilitação",
				],
			},
			{
				title: "A Ciência do Alongamento: Quando e Como Fazer",
				category: "exercicios",
				keywords: [
					"alongamento",
					"flexibilidade",
					"exercícios",
					"mobilidade",
					"ciência",
				],
			},
			{
				title: "Dor no Pescoço por Uso de Celular: Como Resolver",
				category: "saude",
				keywords: ["pescoço", "text neck", "celular", "tecnologia", "postura"],
			},
			{
				title: "Reabilitação de Joelho: Do Início ao Fim",
				category: "reabilitacao",
				keywords: [
					"joelho",
					"reabilitação",
					"ligamento",
					"menisco",
					"fisioterapia",
				],
			},
			{
				title: "10 Dicas para Melhorar Sua Postura Hoje",
				category: "bem-estar",
				keywords: [
					"postura",
					"coluna",
					"saúde",
					"ergonomia",
					"qualidade de vida",
				],
			},
			{
				title: "Fisioterapia para Atletas: Prevenção e Performance",
				category: "exercicios",
				keywords: [
					"atletas",
					"esporte",
					"performance",
					"prevenção",
					"fisioterapia esportiva",
				],
			},
			{
				title: "Entendendo a Dor Crônica: Novas Abordagens",
				category: "saude",
				keywords: [
					"dor crônica",
					"tratamento",
					"fisioterapia",
					"qualidade de vida",
					"saúde",
				],
			},
			{
				title: "Exercícios em Casa: Guia Durante a Quarentena",
				category: "exercicios",
				keywords: [
					"casa",
					"quarentena",
					"exercícios",
					"treino em casa",
					"saúde",
				],
			},
		];

		if (category) {
			return allTopics.filter((t) => t.category === category);
		}

		return allTopics;
	}
}

/**
 * Factory para criar gerador de conteúdo
 */
export class ContentGeneratorFactory {
	static create(): BlogContentGenerator {
		return new BlogContentGenerator();
	}

	static async generateTopicFromTrend(trend: string): Promise<ArticleTopic> {
		// Analisa tendência e sugere categoria e palavras-chave
		const keywords = trend.toLowerCase().split(/\s+/);

		let category: ArticleTopic["category"] = "bem-estar";
		if (
			keywords.some((k) =>
				["exercício", "treino", "musculo", "alongamento"].includes(k),
			)
		) {
			category = "exercicios";
		} else if (
			keywords.some((k) => ["prevenir", "evitar", "lesão"].includes(k))
		) {
			category = "prevencao";
		} else if (
			keywords.some((k) => ["recuperar", "reabilitar", "pós"].includes(k))
		) {
			category = "reabilitacao";
		} else if (
			keywords.some((k) => ["dor", "sintoma", "tratamento"].includes(k))
		) {
			category = "saude";
		}

		return {
			title: trend,
			category,
			targetAudience: "geral",
			keywords: keywords.slice(0, 5),
			tone: "informal",
		};
	}
}

// Exportar tipos
export type { ArticleTopic, Article, SocialPost, Newsletter };
