import { useMemo, useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { knowledgeBaseService } from "@/lib/services/knowledgeBaseService";
import {
	knowledgeBase,
	knowledgeGroups,
	type KnowledgeArticle,
	type KnowledgeGroup,
	type EvidenceTier,
} from "@/data/knowledgeBase";
import type {
	KnowledgeAnnotation,
	KnowledgeCuration,
	KnowledgeCurationStatus,
	KnowledgeAuditEntry,
} from "@/types/knowledge-base";
import { toast } from "sonner";

export function useKnowledgeBase(
	currentOrganizationId?: string | null,
	currentUserId?: string | null,
) {
	const queryClient = useQueryClient();
	const [kbQuery, setKbQuery] = useState("");
	const [kbGroup, setKbGroup] = useState<KnowledgeGroup | "Todas">("Todas");
	const [kbEvidence, setKbEvidence] = useState<EvidenceTier | "Todas">("Todas");
	const [kbStatus, setKbStatus] = useState<"verified" | "pending" | "all">(
		"all",
	);
	const [kbView, setKbView] = useState<"library" | "narrative" | "map">(
		"library",
	);
	const [kbUseSemantic, setKbUseSemantic] = useState(false);
	const [syncing, setSyncing] = useState(false);
	const [indexing, setIndexing] = useState(false);

	const { data: knowledgeAnnotations = [] } = useQuery({
		queryKey: ["knowledge-annotations", currentOrganizationId, currentUserId],
		queryFn: () =>
			currentOrganizationId
				? knowledgeBaseService.listAnnotations(
						currentOrganizationId,
						currentUserId,
					)
				: Promise.resolve([]),
		enabled: !!currentOrganizationId,
	});

	const { data: knowledgeCuration = [] } = useQuery({
		queryKey: ["knowledge-curation", currentOrganizationId],
		queryFn: () =>
			currentOrganizationId
				? knowledgeBaseService.listCuration(currentOrganizationId)
				: Promise.resolve([]),
		enabled: !!currentOrganizationId,
	});

	const { data: knowledgeAudit = [] } = useQuery({
		queryKey: ["knowledge-audit", currentOrganizationId],
		queryFn: () =>
			currentOrganizationId
				? knowledgeBaseService.listAudit(currentOrganizationId)
				: Promise.resolve([]),
		enabled: !!currentOrganizationId,
	});

	const { data: knowledgeArticles = [] } = useQuery({
		queryKey: ["knowledge-articles", currentOrganizationId],
		queryFn: () =>
			currentOrganizationId
				? knowledgeBaseService.listArticles(currentOrganizationId)
				: Promise.resolve([]),
		enabled: !!currentOrganizationId,
	});

	const auditItems = useMemo(() => {
		const getTime = (value?: KnowledgeAuditEntry["created_at"]) => {
			if (!value) return 0;
			const maybeDate = (value as { toDate?: () => Date }).toDate?.();
			return maybeDate ? maybeDate.getTime() : 0;
		};
		return [...knowledgeAudit]
			.sort((a, b) => getTime(b.created_at) - getTime(a.created_at))
			.slice(0, 8);
	}, [knowledgeAudit]);

	const { data: auditProfiles = {} } = useQuery({
		queryKey: ["knowledge-audit-profiles", auditItems.map((i) => i.actor_id)],
		queryFn: () =>
			currentOrganizationId
				? knowledgeBaseService.getProfilesSummary(
						currentOrganizationId,
						auditItems.map((i) => i.actor_id),
					)
				: Promise.resolve({}),
		enabled: !!currentOrganizationId && auditItems.length > 0,
	});

	const { data: semanticResults = [] } = useQuery({
		queryKey: ["knowledge-semantic", currentOrganizationId, kbQuery],
		queryFn: () =>
			currentOrganizationId
				? knowledgeBaseService.semanticSearch({
						query: kbQuery,
						organizationId: currentOrganizationId,
						limit: 40,
					})
				: Promise.resolve([]),
		enabled:
			kbUseSemantic && kbQuery.trim().length > 2 && !!currentOrganizationId,
	});

	const annotationMap = useMemo(() => {
		const org = new Map<string, KnowledgeAnnotation>();
		const userMap = new Map<string, KnowledgeAnnotation>();
		knowledgeAnnotations.forEach((entry) => {
			if (entry.scope === "user") {
				userMap.set(entry.article_id, entry);
			} else {
				org.set(entry.article_id, entry);
			}
		});
		return { org, user: userMap };
	}, [knowledgeAnnotations]);

	const curationMap = useMemo(() => {
		const map = new Map<string, KnowledgeCuration>();
		knowledgeCuration.forEach((entry) => map.set(entry.article_id, entry));
		return map;
	}, [knowledgeCuration]);

	const mergedKnowledge = useMemo(() => {
		const source =
			knowledgeArticles.length > 0 ? knowledgeArticles : knowledgeBase;
		return source.map((item) => {
			const orgAnnotation = annotationMap.org.get(item.id);
			const userAnnotation = annotationMap.user.get(item.id);
			const curation = curationMap.get(item.id);
			return {
				...item,
				highlights: userAnnotation?.highlights?.length
					? userAnnotation.highlights
					: orgAnnotation?.highlights?.length
						? orgAnnotation.highlights
						: item.highlights,
				observations: userAnnotation?.observations?.length
					? userAnnotation.observations
					: orgAnnotation?.observations?.length
						? orgAnnotation.observations
						: item.observations,
				status: (curation?.status ||
					orgAnnotation?.status ||
					item.status) as KnowledgeArticle["status"],
				evidence: (orgAnnotation?.evidence ||
					item.evidence) as KnowledgeArticle["evidence"],
			};
		});
	}, [annotationMap, curationMap, knowledgeArticles]);

	const semanticOrdered = useMemo(() => {
		if (!kbUseSemantic || kbQuery.trim().length <= 2) return mergedKnowledge;
		const byId = new Map(mergedKnowledge.map((item) => [item.id, item]));
		return semanticResults
			.map((result) => byId.get(result.article_id))
			.filter((item): item is KnowledgeArticle => Boolean(item));
	}, [kbUseSemantic, kbQuery, mergedKnowledge, semanticResults]);

	const filteredKnowledge = useMemo(() => {
		return semanticOrdered.filter((item) => {
			if (kbGroup !== "Todas" && item.group !== kbGroup) return false;
			if (kbEvidence !== "Todas" && item.evidence !== kbEvidence) return false;
			if (kbStatus !== "all") {
				if (kbStatus === "verified" && item.status !== "verified") return false;
				if (kbStatus === "pending" && item.status === "verified") return false;
			}
			if (!kbQuery || kbUseSemantic) return true;
			const query = kbQuery.toLowerCase();
			return (
				item.title.toLowerCase().includes(query) ||
				item.subgroup.toLowerCase().includes(query) ||
				item.tags.some((tag) => tag.toLowerCase().includes(query))
			);
		});
	}, [semanticOrdered, kbGroup, kbEvidence, kbStatus, kbQuery, kbUseSemantic]);

	const knowledgeGroupsFiltered = useMemo(() => {
		const map = new Map<string, KnowledgeArticle[]>();
		filteredKnowledge.forEach((item) => {
			const key = `${item.group}__${item.subgroup}`;
			const list = map.get(key) || [];
			list.push(item);
			map.set(key, list);
		});
		return map;
	}, [filteredKnowledge]);

	const semanticScoreMap = useMemo(() => {
		const map = new Map<string, number>();
		semanticResults.forEach((result) =>
			map.set(result.article_id, result.score),
		);
		return map;
	}, [semanticResults]);

	const handleSyncArticles = async () => {
		if (!currentOrganizationId || !currentUserId) return;
		try {
			setSyncing(true);
			await knowledgeBaseService.syncArticles({
				organizationId: currentOrganizationId,
				userId: currentUserId,
				articles: knowledgeBase,
			});
			toast.success("Base sincronizada com o banco principal.");
		} catch (error) {
			console.error("Erro ao sincronizar base:", error);
			toast.error("Nao foi possivel sincronizar a base.");
		} finally {
			setSyncing(false);
		}
	};

	const handleIndexArticles = async () => {
		if (!currentOrganizationId) return;
		try {
			setIndexing(true);
			const result = await knowledgeBaseService.indexKnowledgeArticles({
				organizationId: currentOrganizationId,
			});
			toast.success(`Indexacao concluida: ${result.indexed} itens.`);
		} catch (error) {
			console.error("Erro ao indexar base:", error);
			toast.error("Nao foi possivel indexar a base.");
		} finally {
			setIndexing(false);
		}
	};

	const handleCreateArticle = async (article: Partial<KnowledgeArticle>) => {
		if (!currentOrganizationId) return;
		try {
			const newArticle = await knowledgeBaseService.createArticle({
				...article,
				organizationId: currentOrganizationId,
			} as any);
			await queryClient.invalidateQueries({
				queryKey: ["knowledge-articles", currentOrganizationId],
			});
			toast.success("Artigo criado com sucesso.");
			return newArticle;
		} catch (error) {
			console.error("Erro ao criar artigo:", error);
			toast.error("Não foi possível criar o artigo.");
			throw error;
		}
	};

	const handleUpdateArticle = async (
		articleId: string,
		data: Partial<KnowledgeArticle>,
	) => {
		if (!currentOrganizationId) return;
		try {
			const updated = await knowledgeBaseService.updateArticle(articleId, data);
			await queryClient.invalidateQueries({
				queryKey: ["knowledge-articles", currentOrganizationId],
			});
			toast.success("Artigo atualizado.");
			return updated;
		} catch (error) {
			console.error("Erro ao atualizar artigo:", error);
			toast.error("Não foi possível atualizar o artigo.");
			throw error;
		}
	};

	const handleDeleteArticle = async (articleId: string) => {
		if (!currentOrganizationId) return;
		try {
			await knowledgeBaseService.deleteArticle(articleId);
			await queryClient.invalidateQueries({
				queryKey: ["knowledge-articles", currentOrganizationId],
			});
			toast.success("Artigo excluído.");
		} catch (error) {
			console.error("Erro ao excluir artigo:", error);
			toast.error("Não foi possível excluir o artigo.");
			throw error;
		}
	};

	const handleSaveAnnotation = async (params: {
		articleId: string;
		scope: "organization" | "user";
		highlights: string[];
		observations: string[];
		status: KnowledgeCurationStatus;
		notes: string;
	}) => {
		if (!currentOrganizationId || !currentUserId) return;
		try {
			await knowledgeBaseService.upsertAnnotation({
				organizationId: currentOrganizationId,
				userId: currentUserId,
				articleId: params.articleId,
				scope: params.scope,
				highlights: params.highlights,
				observations: params.observations,
			});

			await knowledgeBaseService.updateCuration({
				organizationId: currentOrganizationId,
				userId: currentUserId,
				articleId: params.articleId,
				status: params.status,
				notes: params.notes,
			});

			await knowledgeBaseService.addAuditEntry({
				article_id: params.articleId,
				organization_id: currentOrganizationId,
				actor_id: currentUserId,
				action: "update_annotation",
				after: {
					scope: params.scope,
					highlights: params.highlights,
					observations: params.observations,
					status: params.status,
					notes: params.notes,
				},
			});

			await queryClient.invalidateQueries({
				queryKey: [
					"knowledge-annotations",
					currentOrganizationId,
					currentUserId,
				],
			});
			await queryClient.invalidateQueries({
				queryKey: ["knowledge-curation", currentOrganizationId],
			});
			toast.success("Curadoria atualizada.");
		} catch (error) {
			console.error("Erro ao salvar curadoria:", error);
			toast.error("Nao foi possivel salvar as alteracoes.");
			throw error;
		}
	};

	return {
		knowledgeArticles,
		knowledgeGroupsFiltered,
		filteredKnowledge,
		auditItems,
		auditProfiles,
		semanticScoreMap,
		knowledgeStats: {
			total: (knowledgeArticles.length > 0 ? knowledgeArticles : knowledgeBase)
				.length,
			verified: (knowledgeArticles.length > 0
				? knowledgeArticles
				: knowledgeBase
			).filter((item) => item.status === "verified").length,
		},
		kbFilters: {
			query: kbQuery,
			group: kbGroup,
			evidence: kbEvidence,
			status: kbStatus,
			view: kbView,
			useSemantic: kbUseSemantic,
		},
		setKbFilters: {
			setQuery: setKbQuery,
			setGroup: setKbGroup,
			setEvidence: setKbEvidence,
			setStatus: setKbStatus,
			setView: setKbView,
			setUseSemantic: setKbUseSemantic,
		},
		syncing,
		indexing,
		handleSyncArticles,
		handleIndexArticles,
		handleCreateArticle,
		handleUpdateArticle,
		handleDeleteArticle,
		handleSaveAnnotation,
		curationMap,
		annotationMap,
	};
}
