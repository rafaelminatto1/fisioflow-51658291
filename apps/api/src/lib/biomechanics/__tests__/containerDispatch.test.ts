import { describe, it, expect } from "vitest";
import { signCallbackToken, verifyCallbackToken } from "../containerDispatch";

/**
 * O container é tratado como não confiável para autenticação.
 *
 * Sem este HMAC, `POST /internal/jobs/:jobId/pose-callback` seria uma rota
 * aberta onde qualquer um declara um job como concluído e aponta para um
 * bundle de landmarks arbitrário — que viraria métrica num laudo clínico.
 */

const SECRET = "segredo-de-teste-do-callback";
const JOB = "job-abc";
const ASSESSMENT = "assess-xyz";

const agora = 1_780_000_000_000;
const futuro = Math.floor(agora / 1000) + 3600;

describe("token de callback do container", () => {
  it("aceita um token íntegro dentro da validade", async () => {
    const token = await signCallbackToken(SECRET, JOB, ASSESSMENT, futuro);
    expect(await verifyCallbackToken(SECRET, token, JOB, ASSESSMENT, agora)).toBe(true);
  });

  it("recusa token emitido para OUTRO job", async () => {
    const token = await signCallbackToken(SECRET, "job-de-outro", ASSESSMENT, futuro);
    expect(await verifyCallbackToken(SECRET, token, JOB, ASSESSMENT, agora)).toBe(false);
  });

  it("recusa token emitido para OUTRA avaliação", async () => {
    const token = await signCallbackToken(SECRET, JOB, "assess-alheia", futuro);
    expect(await verifyCallbackToken(SECRET, token, JOB, ASSESSMENT, agora)).toBe(false);
  });

  it("recusa token assinado com outro segredo", async () => {
    const token = await signCallbackToken("segredo-errado", JOB, ASSESSMENT, futuro);
    expect(await verifyCallbackToken(SECRET, token, JOB, ASSESSMENT, agora)).toBe(false);
  });

  it("recusa token expirado", async () => {
    const passado = Math.floor(agora / 1000) - 10;
    const token = await signCallbackToken(SECRET, JOB, ASSESSMENT, passado);
    expect(await verifyCallbackToken(SECRET, token, JOB, ASSESSMENT, agora)).toBe(false);
  });

  it("recusa validade adulterada — o prazo entra no material assinado", async () => {
    const token = await signCallbackToken(SECRET, JOB, ASSESSMENT, futuro);
    const [, assinatura] = token.split(".");
    const esticado = `${futuro + 86400}.${assinatura}`;
    expect(await verifyCallbackToken(SECRET, esticado, JOB, ASSESSMENT, agora)).toBe(false);
  });

  it("recusa assinatura truncada, malformada ou vazia", async () => {
    const token = await signCallbackToken(SECRET, JOB, ASSESSMENT, futuro);
    const [prazo, assinatura] = token.split(".");

    for (const ruim of [
      `${prazo}.${assinatura.slice(0, 20)}`,
      `${prazo}.`,
      prazo,
      "",
      "lixo",
      `naoNumero.${assinatura}`,
    ]) {
      expect(await verifyCallbackToken(SECRET, ruim, JOB, ASSESSMENT, agora)).toBe(false);
    }
  });

  it("um bit trocado na assinatura invalida", async () => {
    const token = await signCallbackToken(SECRET, JOB, ASSESSMENT, futuro);
    const [prazo, assinatura] = token.split(".");
    const primeiro = assinatura[0] === "a" ? "b" : "a";
    expect(
      await verifyCallbackToken(SECRET, `${prazo}.${primeiro}${assinatura.slice(1)}`, JOB, ASSESSMENT, agora),
    ).toBe(false);
  });

  it("é determinístico para as mesmas entradas", async () => {
    const a = await signCallbackToken(SECRET, JOB, ASSESSMENT, futuro);
    const b = await signCallbackToken(SECRET, JOB, ASSESSMENT, futuro);
    expect(a).toBe(b);
  });
});
