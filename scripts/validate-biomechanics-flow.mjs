import { chromium } from "playwright";

const email = process.env.E2E_LOGIN_EMAIL;
const password = process.env.E2E_LOGIN_PASSWORD;
const baseUrl = process.env.BASE_URL || "https://www.moocafisio.com.br";

if (!email || !password) {
	throw new Error("E2E_LOGIN_EMAIL e E2E_LOGIN_PASSWORD sao obrigatorios.");
}

async function expectEvidencePanel(page) {
	await page.getByText("Evidência científica").waitFor({ timeout: 30000 });
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

try {
	await page.goto(`${baseUrl}/auth`, {
		waitUntil: "domcontentloaded",
		timeout: 60000,
	});
	await page.waitForTimeout(3000);

	await page.locator("[data-testid=auth-email-input]").fill(email);
	await page.locator("[data-testid=auth-password-input]").fill(password);
	await page.locator("[data-testid=auth-submit-button]").click();

	await page.waitForURL(
		(url) =>
			url.pathname.includes("/agenda") ||
			url.pathname.includes("/dashboard") ||
			url.pathname === "/",
		{ timeout: 60000 },
	);

	const loginPath = new URL(page.url()).pathname;

	await page.goto(`${baseUrl}/ai/dicom`, {
		waitUntil: "domcontentloaded",
		timeout: 60000,
	});
	await page.waitForURL(
		(url) =>
			url.pathname === "/biomechanics" ||
			url.pathname === "/clinical/biomechanics" ||
			url.pathname === "/auth",
		{ timeout: 60000 },
	);

	const dicomRedirectPath = new URL(page.url()).pathname;

	await page.goto(`${baseUrl}/clinical/biomechanics/jump`, {
		waitUntil: "domcontentloaded",
		timeout: 60000,
	});
	await expectEvidencePanel(page);
	const jumpArticleLinks = await page
		.getByRole("link", { name: /ler artigo/i })
		.count();
	const jumpWikiActions = await page
		.locator("button")
		.filter({ hasText: /Ler na wiki|Adicionar à wiki/i })
		.count();

	await page.goto(`${baseUrl}/clinical/biomechanics/gait`, {
		waitUntil: "domcontentloaded",
		timeout: 60000,
	});
	await expectEvidencePanel(page);

	await page.goto(`${baseUrl}/clinical/biomechanics/posture`, {
		waitUntil: "domcontentloaded",
		timeout: 60000,
	});
	await expectEvidencePanel(page);

	await page.goto(`${baseUrl}/clinical/biomechanics/functional`, {
		waitUntil: "domcontentloaded",
		timeout: 60000,
	});
	await expectEvidencePanel(page);

	console.log(
		JSON.stringify(
			{
				ok: true,
				loginPath,
				dicomRedirectPath,
				jumpArticleLinks,
				jumpWikiActions,
			},
			null,
			2,
		),
	);
} finally {
	await browser.close();
}
