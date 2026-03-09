# 🏗️ FisioFlow - System Architecture (v4.0.0 - 2026)

Documentação técnica atualizada para a stack de borda (Edge Computing) e banco de dados serverless.

## 🚀 Tecnologias Principais

| Camada | Tecnologia | Implementação |
| :--- | :--- | :--- |
| **Frontend** | React 19 + Vite | Hospedado no **Cloudflare Pages**. |
| **Backend** | Cloudflare Workers | Serverless API (Hono.js/TypeScript). |
| **Database** | **Neon DB (PostgreSQL)** | Banco relacional com **Drizzle ORM**. |
| **Auth** | **Neon Auth (Better Auth)** | Gestão de identidade integrada ao banco. |
| **Storage** | **Cloudflare R2** | Armazenamento de mídia (Vídeos/Imagens). |
| **Aceleração** | Cloudflare Hyperdrive | Pooling de conexões PostgreSQL na borda. |

## 📐 Arquitetura do Sistema

```mermaid
graph TD
    User((Paciente/Fisio)) --> CF_Edge[Cloudflare Edge / WAF]
    CF_Edge --> CF_Pages[Cloudflare Pages - Frontend]
    CF_Edge --> CF_Workers[Cloudflare Workers - API]
    
    subgraph "Auth & Security"
        CF_Workers --> Neon_Auth[Neon Auth / Better Auth]
    end
    
    subgraph "Data Persistence"
        CF_Workers --> CF_Hyperdrive[Cloudflare Hyperdrive]
        CF_Hyperdrive --> Neon_DB[(Neon PostgreSQL)]
    end
    
    subgraph "Media Storage"
        CF_Workers --> CF_R2[Cloudflare R2 Storage]
    end
```

## 🔐 Modelo de Segurança

1.  **Isolamento de Tenant**: Utilização de Row Level Security (RLS) no PostgreSQL via Neon para garantir que uma clínica nunca acesse dados de outra.
2.  **Autenticação JWT**: Os Workers validam os tokens emitidos pelo Neon Auth usando chaves públicas (JWKS).
3.  **Acesso Interno**: O sistema está configurado com `X-Robots-Tag: noindex` e headers de segurança para evitar indexação em motores de busca.
4.  **Presigned URLs**: Todo acesso ao Cloudflare R2 é feito via URLs temporárias geradas pelo backend, garantindo que arquivos de pacientes não sejam públicos.

## 💾 Fluxo de Dados

- **Leitura**: Client -> Worker -> Hyperdrive -> Neon DB (Cacheado na borda se aplicável).
- **Escrita**: Client -> Worker -> Neon DB (Commit imediato).
- **Mídia**: Client -> Worker (Gera URL de Upload) -> R2 (Upload direto do Client).

---
**Última Atualização:** Março de 2026  
**Status:** Produção em Transição (Firebase Deprecated)
