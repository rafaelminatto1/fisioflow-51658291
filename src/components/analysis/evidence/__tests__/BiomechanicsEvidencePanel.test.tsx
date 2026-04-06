import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
	BiomechanicsEvidencePanel,
	buildWikiArticleMarkdown,
	matchesEvidenceArticle,
} from "../BiomechanicsEvidencePanel";
import { biomechanicsProtocols } from "@/data/biomechanicsEvidence";

const navigateMock = vi.fn();
const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();
const listArticlesMock = vi.fn();
const createArticleMock = vi.fn();
const listPagesMock = vi.fn();
const savePageMock = vi.fn();

vi.mock("@/contexts/AuthContext", () => ({
	useAuth: () => ({
		user: { uid: "user-1" },
		profile: { id: "user-1", user_id: "user-1", organization_id: "org-1" },
		organizationId: "org-1",
	}),
}));

vi.mock("react-router-dom", async () => {
	const actual = await vi.importActual<typeof import("react-router-dom")>(
		"react-router-dom",
	);
	return {
		...actual,
		useNavigate: () => navigateMock,
	};
});

vi.mock("sonner", () => ({
	toast: {
		success: (...args: unknown[]) => toastSuccessMock(...args),
		error: (...args: unknown[]) => toastErrorMock(...args),
	},
}));

vi.mock("@/lib/services/knowledgeBaseService", () => ({
	knowledgeBaseService: {
		listArticles: (...args: unknown[]) => listArticlesMock(...args),
		createArticle: (...args: unknown[]) => createArticleMock(...args),
	},
}));

vi.mock("@/lib/services/wikiService", () => ({
	wikiService: {
		listPages: (...args: unknown[]) => listPagesMock(...args),
		savePage: (...args: unknown[]) => savePageMock(...args),
	},
}));

function renderPanel() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false },
		},
	});

	return render(
		<QueryClientProvider client={queryClient}>
			<BiomechanicsEvidencePanel mode="jump" />
		</QueryClientProvider>,
	);
}

describe("BiomechanicsEvidencePanel", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		listArticlesMock.mockResolvedValue([]);
		listPagesMock.mockResolvedValue([]);
		createArticleMock.mockResolvedValue({ id: "knowledge-1" });
		savePageMock.mockResolvedValue("wiki-1");
	});

	it("gera markdown de wiki com campos clinicos principais", () => {
		const article = biomechanicsProtocols.jump.articles[0];
		const markdown = buildWikiArticleMarkdown("jump", article);

		expect(markdown).toContain(`# ${article.title}`);
		expect(markdown).toContain("## Resumo clínico");
		expect(markdown).toContain("## Aplicação prática na clínica");
		expect(markdown).toContain("## Pontos de uso no sistema");
	});

	it("reconhece artigo existente pela tag paper:<id>", () => {
		const article = biomechanicsProtocols.jump.articles[0];

		expect(matchesEvidenceArticle("titulo qualquer", [`paper:${article.id}`], article)).toBe(
			true,
		);
	});

	it("mostra 'Ler na wiki' quando a pagina ja existe", async () => {
		const article = biomechanicsProtocols.jump.articles[0];
		listPagesMock.mockResolvedValueOnce([
			{
				id: "wiki-1",
				title: article.title,
				slug: "evidence-jump-existing",
				tags: [`paper:${article.id}`],
			},
		]);

		renderPanel();

		await screen.findByText(article.title);
		const wikiButton = await screen.findByRole("button", {
			name: /ler na wiki/i,
		});

		fireEvent.click(wikiButton);

		expect(navigateMock).toHaveBeenCalledWith("/wiki/evidence-jump-existing");
	});

	it("cria artigo e pagina de wiki quando faltar evidencia interna", async () => {
		const article = biomechanicsProtocols.jump.articles[0];

		renderPanel();

		await screen.findByText(article.title);
		const addButtons = await screen.findAllByRole("button", {
			name: /adicionar.*wiki/i,
		});

		fireEvent.click(addButtons[0]);

		await waitFor(() => {
			expect(createArticleMock).toHaveBeenCalledTimes(1);
			expect(savePageMock).toHaveBeenCalledTimes(1);
		});

		expect(createArticleMock.mock.calls[0][0]).toEqual(
			expect.objectContaining({
				id: expect.stringContaining(`biomechanics-jump-${article.id}`),
				title: article.title,
				url: article.url,
			}),
		);
		expect(savePageMock.mock.calls[0][2]).toEqual(
			expect.objectContaining({
				title: article.title,
				slug: `evidence-jump-${article.id}`,
				category: "Evidência científica",
			}),
		);
		expect(toastSuccessMock).toHaveBeenCalled();
	});
});
