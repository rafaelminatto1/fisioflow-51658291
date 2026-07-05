# Decisão Arquitetural: Cloudflare Vectorize vs Neon pgvector

Esta ADR (Architecture Decision Record) formaliza a estratégia de bancos de dados vetoriais (Vector Databases) dentro do ecosistema FisioFlow.

## Contexto
O FisioFlow exige recursos avançados de IA (RAG e Semantic Search) em duas frentes diametralmente opostas:
1. **Dados Clínicos:** Evoluções, resumos longitudinais, e "pensamentos" da IA restritos a prontuários médicos altamente sensíveis.
2. **Conhecimento Institucional:** Dicionários de exercícios, protocolos da clínica, wikis operacionais e artigos curados públicos.

## A Decisão

Adotaremos um modelo **Bifurcado**:

### 1. Neon pgvector (Drizzle ORM)
- **O que armazena:** Apenas dados sensíveis, PII (Personally Identifiable Information), anamneses e evoluções (tabela `clinical_embeddings`).
- **Por quê:** O banco relacional possui isolamento estrito via RLS (Row Level Security) atrelado ao `organizationId` e proteção criptográfica que herda as certificações da Neon/AWS. Garante que os dados nunca saiam do repositório core da clínica.
- **Caso de Uso:** RAG de Paciente (O Fisioterapeuta quer perguntar ao histórico longo de um único paciente).

### 2. Cloudflare Vectorize (Binding `VECTORIZE_KNOWLEDGE_BASE`)
- **O que armazena:** Conteúdo público, educacional e institucional (Metadados: *wiki, protocol, exercise, article*).
- **Por quê:** Extremamente rápido (roda direto nos datacenters Edge), baixo custo para leituras de alto volume e suporta "Metadata Filtering".
- **Limitação Imposta:** Foi inserido um **guardrail no código** (`isSensitive: true`). Se ativado, a pipeline aborta o upload para o Vectorize lançando um `SECURITY_ERROR`.
- **Fallback:** Em caso de indisponibilidade da API do Vectorize (timeout), o serviço não quebra; retorna um array vazio e o assistente responde que não há contexto.

## Resumo da Regra de Negócio

| Dado | Ferramenta | Onde Reside | Isolamento |
| :--- | :--- | :--- | :--- |
| Histórico do Paciente | Neon `pgvector` | Servidor AWS (Neon) | RLS por `organizationId` + `patientId` |
| Protocolos e Exercícios | CF Vectorize | Edge Global (Cloudflare) | Filtro de Metadata (organizationId) |

Qualquer nova implementação envolvendo vetores **deve obrigatoriamente** consultar esta matriz antes de escolher o banco.
