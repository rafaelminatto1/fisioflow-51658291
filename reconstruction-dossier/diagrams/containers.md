# Diagrama — Containers (C4 nível 2, AS-IS)

```mermaid
flowchart LR
    subgraph Clients
        WEB[SPA React 19 + Vite 8<br/>src/ raiz via apps/web<br/>moocafisio.com.br]
        PRO[App iOS Pro<br/>Expo 55/RN 0.83<br/>74 telas]
        PACAPP[App iOS Paciente<br/>Expo 55<br/>25 telas]
    end

    subgraph Cloudflare
        AW[fisioflow-web<br/>Workers Assets]
        API[fisioflow-api<br/>Hono + smart placement]
        AIGW2[fisioflow-ai-gateway<br/>router LLM auxiliar]
        MCP[fisioflow-mcp-server]
        Q1[[Queue background-tasks + DLQ]]
        Q2[[Queue whatsapp-inbound + DLQ]]
        WF{{10 Workflows deployados<br/>12 declarados}}
        DO((6 Durable Objects<br/>Yjs collab, agents,<br/>voice scribe, org state))
        R2[(R2: media/exams/clinical-docs/archive/media-dr)]
        D1[(D1: fisioflow-db + edge-cache)]
        KV[(KV FISIOFLOW_CONFIG)]
        VEC[(Vectorize + 2x AI Search)]
        STR[Stream vídeos]
        AI[Workers AI + AI Gateway]
    end

    subgraph Neon [Neon sa-east-1 purple-union-72678311]
        PG[(Postgres 17<br/>branch production<br/>303 tabelas)]
        NAUTH[Neon Auth JWT/JWKS<br/>schema neon_auth]
        DAPI[Data API PostgREST<br/>RLS jwt.sub]
    end

    WEB --> AW
    WEB -->|fetch JWT| API
    WEB -->|leituras diretas| DAPI
    PRO -->|api-pro.moocafisio.com.br| API
    PACAPP -->|api-paciente.moocafisio.com.br| API
    API -->|Hyperdrive, cache OFF,<br/>user neondb_owner ⚠️bypassrls| PG
    API --> Q1 & Q2 & WF & DO & R2 & D1 & KV & VEC & STR & AI
    WEB & PRO & PACAPP -.->|login| NAUTH
    API -.->|valida JWKS| NAUTH
    DAPI --> PG
```

Notas: auth divergente entre clientes (web = Neon Auth; app pro = `POST /api/auth/login` + SecureStore; app paciente = better-auth) [ver 12]. Compartilhamento de código web↔mobile ≈ zero.
