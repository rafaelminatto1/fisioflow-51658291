# TestSprite AI Testing Report (MCP)

---

## 1️⃣ Document Metadata
- **Project Name:** fisioflow-51658291
- **Date:** 2026-02-02
- **Prepared by:** TestSprite AI Team
- **Test Type:** Backend (APIs)
- **Environment:** localhost:8084

---

## 2️⃣ Requirement Validation Summary

### Requirement: APIs de IA (Chat, Insights, Recommendations)
- **Description:** Endpoints REST para chat com IA, insights clínicos e recomendações baseadas em IA para pacientes.

#### Test TC001 – POST /api/ai/chat
- **Test Code:** [TC001_post_api_ai_chat_endpoint.py](./TC001_post_api_ai_chat_endpoint.py)
- **Test Error:** `AssertionError: Expected status 200, got 404`
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/3121c550-3655-4813-9448-ce935e75b267/5960565f-2d72-4ebc-b5a4-e378cc6ab9f7
- **Status:** ❌ Failed
- **Analysis / Findings:** O endpoint `/api/ai/chat` retornou 404 em `http://localhost:8084`. A aplicação em execução na porta 8084 não expõe essa rota, ou as APIs de IA estão em outro serviço/base URL. Verificar se as rotas `/api/ai/*` estão configuradas no servidor que escuta na porta 8084 (ex.: Vite dev server não serve APIs; pode ser necessário usar Firebase Functions ou outro backend).

---

#### Test TC002 – POST /api/ai/insights
- **Test Code:** [TC002_post_api_ai_insights_endpoint.py](./TC002_post_api_ai_insights_endpoint.py)
- **Test Error:** `404 Client Error: Not Found for url: http://localhost:8084/api/ai/insights`
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/3121c550-3655-4813-9448-ce935e75b267/35c66ed0-32fc-40b3-b7b2-b01490b1aa71
- **Status:** ❌ Failed
- **Analysis / Findings:** Mesmo padrão: endpoint `/api/ai/insights` não encontrado em localhost:8084. O plano de testes assume APIs REST locais; no FisioFlow as funcionalidades de IA podem estar em Cloud Functions (Firebase) ou em rotas com path diferente. Documentar a base URL e rotas reais das APIs de IA para alinhar os testes.

---

#### Test TC003 – POST /api/ai/recommendations
- **Test Code:** [TC003_post_api_ai_recommendations_endpoint.py](./TC003_post_api_ai_recommendations_endpoint.py)
- **Test Error:** `AssertionError: Expected status code 200 but got 404`
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/3121c550-3655-4813-9448-ce935e75b267/e46f4816-4dc7-4b6d-851c-7f000fd5bf85
- **Status:** ❌ Failed
- **Analysis / Findings:** Endpoint `/api/ai/recommendations` retorna 404. Conclusão consistente: as três APIs de IA do plano não estão disponíveis em `http://localhost:8084`. Ajustar configuração do TestSprite (localEndpoint) para o backend real das APIs de IA ou expor essas rotas no servidor que roda na 8084 (ex.: proxy no Vite para Firebase/outro backend).

---

## 3️⃣ Coverage & Matching Metrics

- **0%** dos testes passaram (0 de 3).

| Requirement              | Total Tests | ✅ Passed | ❌ Failed |
|--------------------------|-------------|-----------|-----------|
| APIs de IA (Chat, Insights, Recommendations) | 3          | 0         | 3         |

---

## 4️⃣ Key Gaps / Risks

- **Todos os 3 testes de backend falharam com HTTP 404.** Os testes chamam `http://localhost:8084/api/ai/chat`, `/api/ai/insights` e `/api/ai/recommendations`; nenhuma dessas rotas está respondendo no servidor atual.
- **Risco de ambiente:** O projeto FisioFlow usa **Firebase** (Auth, Firestore, Cloud Functions). As APIs de IA podem estar em **Cloud Functions** ou em outro host, não no mesmo processo que escuta na porta 8084 (ex.: dev do Vite). Os testes assumem um backend REST único em localhost:8084.
- **Ações recomendadas:**
  1. Confirmar onde as APIs de IA estão hospedadas (Firebase Functions, outro serviço, pasta `api/` com servidor próprio).
  2. Se estiverem em outro host/porta, configurar o TestSprite com a URL correta (`localEndpoint` / tunnel) ou usar um proxy local que encaminhe `/api/ai/*` para o backend real.
  3. Se as rotas forem outras (ex.: `/api/v1/ai/chat`), atualizar o plano de testes de backend e o código gerado para refletir as URLs reais.
  4. Opcional: executar o plano de testes **frontend** (15 casos), que exercita a aplicação web em si e não depende das APIs REST em 8084.

---
