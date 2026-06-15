import { chromium } from "@playwright/test";

const baseUrl = process.env.PROD_BASE_URL || "https://www.moocafisio.com.br";
const email = process.env.TEST_USER_EMAIL;
const password = process.env.TEST_USER_PASSWORD;

if (!email || !password) {
  throw new Error("TEST_USER_EMAIL and TEST_USER_PASSWORD are required");
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });

const result = {
  loggedIn: false,
  openedAgentHub: false,
  simulatorStarted: false,
  firstResponseOk: false,
  secondResponseOk: false,
  evaluationOk: false,
  reportBlocks: {
    note: false,
    strengths: false,
    weaknesses: false,
    missedQuestions: false,
  },
  currentUrl: "",
};

try {
  await page.goto(`${baseUrl}/auth/login`, { waitUntil: "domcontentloaded" });
  await page.getByTestId("auth-email-input").fill(email);
  await page.getByTestId("auth-password-input").fill(password);
  await page.getByTestId("auth-submit-button").click();

  await page.waitForURL((url) => !url.pathname.startsWith("/auth"), { timeout: 30000 });
  result.loggedIn = true;

  await page.goto(`${baseUrl}/ia-studio`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: /IA Studio/i }).waitFor({ timeout: 30000 });

  await page.getByText("Revisores de SOAP e Simuladores").click();
  await page.getByRole("heading", { name: /AGENTHUB/i }).waitFor({ timeout: 15000 });
  result.openedAgentHub = true;

  await page.getByText("Simulador de Paciente").click();
  await page.getByPlaceholder(/dor patelofemoral/i).fill("dor patelofemoral ao subir escadas");
  await page.keyboard.press("Enter");
  await page.getByText(/Começou|duas semanas|subo escadas|dor fica/i).waitFor({ timeout: 45000 });
  result.simulatorStarted = true;
  result.firstResponseOk = !(await page
    .getByText(/Desculpe, não consegui processar/i)
    .isVisible()
    .catch(() => false));

  await page
    .getByPlaceholder(/próxima pergunta clínica/i)
    .fill("A dor piora ao agachar ou correr? Teve trauma recente?");
  await page.keyboard.press("Enter");
  await page.getByText(/agachar|correr|trauma|não lembro/i).waitFor({ timeout: 45000 });
  result.secondResponseOk = !(await page
    .getByText(/Desculpe, não consegui processar/i)
    .isVisible()
    .catch(() => false));

  await page.getByRole("button", { name: /Finalizar/i }).click();
  await page.getByText("Relatório da avaliação").waitFor({ timeout: 45000 });
  result.evaluationOk = true;
  result.reportBlocks.note = await page.getByText(/Nota \d+\/100/i).isVisible();
  result.reportBlocks.strengths = await page.getByText("Pontos fortes").isVisible();
  result.reportBlocks.weaknesses = await page.getByText("Pontos a melhorar").isVisible();
  result.reportBlocks.missedQuestions = await page.getByText("Perguntas que faltaram").isVisible();
  await page.screenshot({ path: "/tmp/agent-hub-prod-validation.png", fullPage: true });
} catch (error) {
  result.error = error instanceof Error ? error.message : String(error);
  await page
    .screenshot({ path: "/tmp/agent-hub-prod-validation-error.png", fullPage: true })
    .catch(() => {});
} finally {
  result.currentUrl = page.url();
  await browser.close();
}

console.log(JSON.stringify(result, null, 2));
