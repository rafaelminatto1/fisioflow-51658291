# Diagrama — Autenticação e Autorização (AS-IS)

```mermaid
sequenceDiagram
    participant U as Usuário (web)
    participant W as SPA (src/)
    participant NA as Neon Auth (neonauth.sa-east-1)
    participant API as fisioflow-api (Hono)
    participant PG as Neon PG (Hyperdrive)

    U->>W: login (email/senha)
    W->>NA: autentica (Better Auth)
    NA-->>W: sessão + JWT (JWKS)
    W->>API: fetch Authorization: Bearer JWT
    API->>NA: valida via JWKS (cache)
    API->>PG: lookup profile por sub/email
    Note over API: auto-sync de profile por e-mail<br/>fallback DEFAULT_ORG_ID+viewer ⚠️
    API->>PG: queries com WHERE organization_id<br/>(RLS existe mas conexão neondb_owner = bypassrls ⚠️)
    API-->>W: resposta
    W->>NA: logout via POST /sign-out (não keepalive)
```

## Três trilhos de auth divergentes

| Cliente | Mecanismo | Armazenamento |
|---|---|---|
| Web | Neon Auth (Better Auth) + JWT p/ API via GET /__neon-auth/token | cookie/sessão |
| App iOS Pro | `POST /api/auth/login` + JWT + refresh próprio | SecureStore |
| App iOS Paciente | better-auth nativo + trilho `requirePatientAuth` (JWT role=patient); OTP por telefone (stub WhatsApp) | SecureStore |

## Papéis

`admin, fisioterapeuta, recepcionista, estagiario, paciente, parceiro, pending` (+`owner` fantasma via banco, `viewer` fallback implícito). Multi-role em `profiles.roles TEXT[]`. Aprovação de cadastro: role `pending` até admin aprovar. MFA: tabelas/UI existem, login NÃO consulta (decorativo). Detalhe em `03-personas-rbac-e-multitenancy.md` e `10-seguranca-e-lgpd.md`.
