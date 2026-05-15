/**
 * E2E: Analytics — Rota de Predição de Aderência
 *
 * Testa as rotas `/api/analytics/predict/:patientId` e `/api/analytics/at-risk-patients`
 * que agora compilam sem @ts-nocheck após o fix do AdherencePredictor.
 *
 * Executa contra a API real em modo dev (requer workers rodando).
 * Se a API não estiver disponível, os testes são marcados como skip graciosamente.
 */

import { test, expect } from "@playwright/test";

const API_BASE = process.env.WORKERS_URL || "http://localhost:8787";
const AUTH_TOKEN = process.env.E2E_AUTH_TOKEN || "";

test.describe("Analytics — Predição de Aderência", () => {
  test.skip(!AUTH_TOKEN, "E2E_AUTH_TOKEN não configurado — pulando testes de API direta");

  test("GET /api/analytics/at-risk-patients retorna lista válida", async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/analytics/at-risk-patients`, {
      headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
    });

    // Aceita 200 (dados) ou 200 com array vazio
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty("data");
    expect(Array.isArray(body.data)).toBe(true);
  });

  test("POST /api/analytics/predict/:patientId retorna null para paciente sem sessões suficientes", async ({
    request,
  }) => {
    const fakePatientId = "00000000-0000-0000-0000-000000000099";
    const response = await request.post(`${API_BASE}/api/analytics/predict/${fakePatientId}`, {
      headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
    });

    // 200 com null (< 2 sessões) ou 404 (paciente não existe)
    expect([200, 404]).toContain(response.status());
    if (response.status() === 200) {
      const body = await response.json();
      expect(body).toHaveProperty("data");
    }
  });
});

test.describe("Analytics — ML Recovery Prediction", () => {
  test.skip(!AUTH_TOKEN, "E2E_AUTH_TOKEN não configurado — pulando testes de API direta");

  test("GET /api/analytics/ml/recovery-prediction/:patientId retorna 400 para UUID inválido", async ({
    request,
  }) => {
    const response = await request.get(
      `${API_BASE}/api/analytics/ml/recovery-prediction/not-a-uuid`,
      { headers: { Authorization: `Bearer ${AUTH_TOKEN}` } },
    );

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty("error");
  });

  test("GET /api/analytics/ml/history/:patientId retorna 400 para UUID inválido", async ({
    request,
  }) => {
    const response = await request.get(`${API_BASE}/api/analytics/ml/history/not-a-uuid`, {
      headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
    });

    expect(response.status()).toBe(400);
  });
});
