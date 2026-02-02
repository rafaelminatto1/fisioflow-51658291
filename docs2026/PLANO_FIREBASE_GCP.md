# FisioFlow — Plano de Infraestrutura 100% Firebase + Google Cloud (GCP)

**Objetivo:** Todo o sistema (frontend, backend, APIs, cron, storage, banco) em **Firebase** e **Google Cloud** — sem Vercel nem Netlify.

**Data:** Fevereiro 2026

---

## 1. Visão geral da stack

| Camada | Serviço | Uso |
|--------|---------|-----|
| **Frontend (SPA)** | Firebase Hosting | Hospedagem do build estático (Vite → `dist/`) |
| **Autenticação** | Firebase Auth | Login (email/senha, Google, etc.) |
| **Banco de dados** | Firestore | Dados principais (pacientes, agendamentos, sessões, etc.) |
| **Storage** | Firebase Storage | Arquivos (documentos, imagens, vídeos de exercícios) |
| **Backend / APIs** | Cloud Functions (Firebase) | Lógica serverless (prescrições, relatórios, webhooks) |
| **Tarefas agendadas** | Cloud Scheduler + Cloud Functions | Crons (lembretes, relatórios diários, limpeza) |
| **CI/CD** | Cloud Build | Build e deploy automático a partir do repositório |
| **Cache / filas** | Cloud Memorystore ou Firestore | Cache e filas conforme necessidade |
| **Monitoramento** | Cloud Monitoring, Sentry (opcional) | Logs, métricas, alertas |
| **Domínio / SSL** | Firebase Hosting | Domínio customizado e SSL gerenciado |

---

## 2. Arquitetura em alto nível

```
                    ┌─────────────────────────────────────────────────┐
                    │                  USUÁRIOS                       │
                    └────────────────────────┬────────────────────────┘
                                             │
                    ┌────────────────────────▼────────────────────────┐
                    │           Firebase Hosting (CDN)                 │
                    │  • SPA (React/Vite) • assets estáticos • SSL    │
                    └────────────────────────┬────────────────────────┘
                                             │
         ┌───────────────────────────────────┼───────────────────────────────────┐
         │                                   │                                   │
         ▼                                   ▼                                   ▼
┌─────────────────┐              ┌─────────────────────┐              ┌─────────────────┐
│  Firebase Auth  │              │  Firestore          │              │ Firebase Storage │
│  (identidade)   │              │  (dados principais)  │              │ (arquivos)       │
└─────────────────┘              └─────────────────────┘              └─────────────────┘
         │                                   │                                   │
         └───────────────────────────────────┼───────────────────────────────────┘
                                             │
                    ┌────────────────────────▼────────────────────────┐
                    │           Cloud Functions (Node.js)             │
                    │  • APIs callable/HTTP • crons • webhooks        │
                    └────────────────────────┬────────────────────────┘
                                             │
                    ┌────────────────────────▼────────────────────────┐
                    │     Google Cloud (conforme necessidade)          │
                    │  • Cloud Scheduler (crons) • Secret Manager      │
                    │  • Cloud Build (CI/CD) • Cloud Monitoring        │
                    └─────────────────────────────────────────────────┘
```

---

## 3. Deploy do frontend (Firebase Hosting)

- **Build:** local ou no Cloud Build: `pnpm build` (Vite gera `dist/`).
- **Deploy:** `firebase deploy --only hosting`.
- **Configuração:** `firebase.json` com `public: "dist"`, rewrites para SPA (tudo para `index.html`) e headers de segurança.
- **Variáveis de ambiente:** valores em build time (Vite `VITE_*`) definidos no Cloud Build ou em Secret Manager e injetados no passo de build.

```json
// firebase.json (exemplo)
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [{ "source": "**", "destination": "/index.html" }],
    "headers": [
      {
        "source": "**/*.@(js|css)",
        "headers": [{ "key": "Cache-Control", "value": "max-age=31536000,immutable" }]
      }
    ]
  }
}
```

---

## 4. Backend (Cloud Functions)

- **Runtime:** Node.js 18+.
- **Funções:** em `functions/` (ou `api/` conforme estrutura do projeto); deploy com `firebase deploy --only functions`.
- **Tipos:** callable (chamadas do frontend com auth), HTTP (webhooks, APIs públicas) e **scheduled** (crons via Cloud Scheduler ou `functions.pubsub.schedule()`).
- **Crons (ex-Vercel):** migrar jobs como “daily-report”, “birthday-reminders”, “cleanup” para Cloud Functions agendadas (Pub/Sub + Cloud Scheduler) ou `onSchedule`.

Exemplo de cron com Firebase:

```javascript
// functions/src/scheduled/dailyReport.js
const functions = require('firebase-functions');
exports.dailyReport = functions.pubsub.schedule('0 8 * * *').timeZone('America/Sao_Paulo').onRun(async (context) => {
  // lógica do relatório diário
});
```

---

## 5. CI/CD (Cloud Build)

- **Gatilho:** push em `main` (ou branch de produção) no repositório (GitHub/GitLab/Cloud Source Repositories).
- **Passos típicos:**
  1. Checkout do código.
  2. Instalação de dependências (`pnpm install`).
  3. Build do frontend (`pnpm build`).
  4. Deploy no Firebase Hosting (`firebase deploy --only hosting --token ...`).
  5. Deploy das Cloud Functions (`firebase deploy --only functions --token ...`).
- **Segredos:** usar Secret Manager para tokens do Firebase, Sentry, APIs externas; injetar no build quando necessário.

Arquivo de exemplo: `.cloudbuild.yaml` ou `cloudbuild.yaml` na raiz.

---

## 6. Tarefas agendadas (ex-crons Vercel)

| Job (exemplo) | Frequência | Implementação |
|---------------|------------|----------------|
| Relatório diário | 0 8 * * * | Cloud Function + Cloud Scheduler ou `onSchedule` |
| Lembretes aniversário | 0 9 * * * | Idem |
| Vouchers expirando | 0 10 * * * | Idem |
| Resumo semanal | 0 9 * * 1 | Idem |
| Limpeza / integridade | 0 3 * * * / 0 1 * * * | Idem |

Tudo via **Cloud Scheduler** disparando Pub/Sub ou diretamente **Firebase scheduled functions**.

---

## 7. Cache e filas (substituindo Vercel KV)

- **Cache:** Firestore (com TTL/documentos de controle) ou **Cloud Memorystore (Redis)** se precisar de cache distribuído.
- **Filas:** Pub/Sub + Cloud Functions ou Firestore + Cloud Functions para processamento assíncrono.

---

## 8. Monitoramento e analytics

- **Firebase:** Analytics, Performance Monitoring (opcional).
- **Google Cloud:** Cloud Monitoring (Logging, Métricas, Alertas).
- **Sentry:** manter apenas como serviço externo (configurar DSN no build); não depende de Vercel.

---

## 9. Checklist de migração (saindo da Vercel)

- [ ] Criar/ajustar projeto no Firebase e GCP (mesmo projeto ou vinculados).
- [ ] Configurar **Firebase Hosting** e fazer primeiro deploy manual do SPA.
- [ ] Migrar variáveis de ambiente: da Vercel para **Secret Manager** e/ou Cloud Build.
- [ ] Substituir crons da Vercel por **Cloud Scheduler** + Cloud Functions (ou scheduled functions).
- [ ] Configurar **Cloud Build** com trigger no repositório e deploy de Hosting + Functions.
- [ ] Apontar domínio customizado no Firebase Hosting e remover da Vercel.
- [ ] Remover **vercel.json** (ou manter apenas se houver uso local compatível; não usar na produção).
- [ ] Atualizar documentação (README, PRD, docs de deploy) para **Firebase + GCP apenas**.

---

## 10. Referências

- [Firebase Hosting](https://firebase.google.com/docs/hosting)
- [Cloud Functions](https://firebase.google.com/docs/functions)
- [Cloud Build](https://cloud.google.com/build/docs)
- [Cloud Scheduler](https://cloud.google.com/scheduler/docs)
- [Secret Manager](https://cloud.google.com/secret-manager/docs)
- [Firebase + GCP](https://firebase.google.com/docs/projects)

---

*FisioFlow — Plano de infraestrutura 100% Firebase + GCP. Fevereiro 2026.*
