# Diagrama — Deploy e Ambientes (AS-IS)

```mermaid
flowchart TB
    DEV[Dev local Linux Zorin<br/>wrangler dev + .dev.vars + localhost:5173]
    GH[GitHub repo<br/>branch main = auto-deploy]

    subgraph CI [.github/workflows]
        QG[Quality Gate<br/>ci.yml: lint+types+vitest]
        PRODW[production.yml<br/>gate → deploy api+web → smoke]
        STGW[staging.yml]
        E2E[e2e.yml Playwright]
        BKP[db-backup.yml]
        NEONCLEAN[neon-cleanup.yml]
        IOS[ios-build.yml<br/>macos-26 + Xcode 26.2<br/>assinatura manual p12 → IPA artifact → USB]
        SEC[codeql.yml + security-audit.yml]
    end

    DEV -->|push main| GH --> PRODW
    PRODW -->|wrangler deploy| PRODAPI[fisioflow-api<br/>api-pro/api-paciente]
    PRODW -->|wrangler deploy| PRODWEB[fisioflow-web<br/>moocafisio.com.br]
    STGW --> STG[fisioflow-api-staging + fisioflow-web-staging<br/>Hyperdrive staging user app_runtime]
    GH --> IOS -->|IPA| USB[Instalação via cabo USB<br/>libimobiledevice<br/>sem TestFlight neste fluxo]

    PRODAPI --> NEON[(Neon purple-union-72678311<br/>branch production PITR 7d)]
```

Regras operacionais conhecidas: nunca misturar deploy manual com o auto-deploy do CI (race de hashes); falha no teste de cron DB-free bloqueia TODOS os deploys silenciosamente; migrations aplicadas manualmente (sem ledger no banco).
