import { knowledgeApi } from "@/lib/api/workers-client";

export const aiService = {
	/**
	 * Envia uma pergunta sobre um artefato específico para a IA (RAG)
	 */
	async askArtifact(
		artifactId: string,
		query: string,
	): Promise<{ answer: string; contextUsed?: string }> {
		try {
			return (await knowledgeApi.askArticle(artifactId, query)).data;
		} catch (error) {
			console.error("Erro ao consultar IA:", error);
			throw new Error("Falha ao processar sua pergunta. Tente novamente.");
		}
	},

	/**
	 * Processa um PDF recém-uploadado (Gera chunks e embeddings)
	 * Nota: Em produção, isso seria automático via Trigger do Storage.
	 */
	async processArtifact(
		artifactId: string,
		textContent?: string,
	): Promise<{ success: boolean }> {
		try {
			return (await knowledgeApi.processArticle(artifactId, textContent)).data;
		} catch (error) {
			console.error("Erro ao processar artefato:", error);
			throw new Error("Falha ao indexar documento.");
		}
	},
};
