# Exercise Literature Pipeline — Spec

## Objective
Buscar artigos científicos (PubMed, arXiv, CrossRef, Semantic Scholar, Google Scholar) para embasar exercícios/protocolos, popular `exercises.references` e `exercises.icd10_codes`, e criar tabela `exercise_evidence` para busca semântica futura (embeddings + RAG).

## Context & Gap Analysis
- 100% dos 399 exercícios sem `icd10_codes`
- 99.7% sem `source` (proveniência)
- 33.6% sem `references`
- Categorias com gap: mobilidade (26), fortalecimento (71), alongamento (16), core (17), funcional (31), retorno ao esporte (14)

## User Stories

| ID | Story | Priority |
|---|---|---|
| US-L1 | Como **fisioterapeuta**, quero que cada exercício tenha `references` com citações Vancouver (DOI/PMID) de guidelines/RCTs recentes para confiar na prescrição. | P1 |
| US-L2 | Como **sistema**, quero tabela `exercise_evidence` com `evidence_level` (1a-5), `icd10_codes` sugeridos e `clinical_recommendation` para alimentar AI prescribing. | P1 |
| US-L3 | Como **dev**, quero um fluxo de curadoria assistida que use o MCP `rafalegollas` durante o desenvolvimento e exija revisão clínica antes de persistir evidências. | P1 |
| US-L4 | Como **dev**, quero uma automação futura via APIs públicas de literatura, não via MCP, somente após validar o modelo de dados e a curadoria manual. | P2 |
| US-L5 | Como **pesquisador**, quero buscar evidências por termo (ex: "hip osteoarthritis exercise") e ver nível de evidência + recomendação clínica. | P2 |

## Acceptance Scenarios

### AS-L1 — Backfill References (US-L1)
- **Dado** exercício "Agachamento Livre" (category: fortalecimento, body_parts: ["quadril", "joelho"])
- **Quando** job roda para esta categoria
- **Então** `exercises.references` recebe 3-5 citações Vancouver com DOI/PMID de RCTs/sistematic reviews últimos 5 anos
- **E** `exercises.icd10_codes` recebe códigos relevantes (ex: M17.0, M17.1 para joelho)

### AS-L2 — Exercise Evidence Table (US-L2)
- **Dado** job completado
- **Quando** consulto `exercise_evidence WHERE exercise_id = $1`
- **Então** retorna linhas com `pmid`, `doi`, `evidence_level` (1a/1b/2b/3b/4/5), `clinical_recommendation`, `icd10_codes[]`
- **E** `evidence_level` segue Oxford CEBM: 1a=SR de RCTs, 1b=RCT individual, 2b=estudo de coorte, 3b=case-control, 4=case series, 5=expert opinion

### AS-L3 — Curadoria Assistida (US-L3)
- **Dado** uma categoria e uma pergunta PICO definida
- **Quando** o agente usa o MCP `rafalegollas` para buscar e ler metadados de PubMed/CrossRef/Semantic Scholar
- **Então** gera um lote de evidências candidatas com PMID, DOI, nível de evidência e resumo clínico
- **E** nenhum dado é gravado em produção antes da aprovação de um fisioterapeuta responsável

## Technical Design

### Database Schema
```sql
CREATE TABLE exercise_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id uuid NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  pmid text,
  doi text UNIQUE,
  title text NOT NULL,
  abstract text,
  evidence_level text NOT NULL CHECK (evidence_level IN ('1a','1b','2a','2b','3a','3b','4','5')),
  clinical_recommendation text,
  icd10_codes text[],
  source_db text NOT NULL CHECK (source_db IN ('pubmed','arxiv','crossref','semantic','scholar')),
  retrieved_at timestamptz DEFAULT now(),
  UNIQUE (exercise_id, doi)
);
CREATE INDEX idx_exercise_evidence_exercise ON exercise_evidence(exercise_id);
CREATE INDEX idx_exercise_evidence_level ON exercise_evidence(evidence_level);
```

### Search Strategy per Category
| Category | PubMeD Query Template | Priority Filters |
|---|---|---|
| `fortalecimento` | `"resistance training" AND rehabilitation AND {{body_part}}` | RCT, systematic review, 2019-2026 |
| `mobilidade` | `"joint mobilization" OR "range of motion" AND {{body_part}}` | RCT, guideline, 2019-2026 |
| `alongamento` | `stretching AND rehabilitation AND {{body_part}}` | RCT, 2019-2026 |
| `core` | `"core stability" OR "motor control" AND low back` | RCT, systematic review |
| `funcional` | `"functional training" AND older adults` | RCT, 2019-2026 |
| `retorno_esporte` | `"return to sport" AND {{body_part}}` | guideline, consensus, 2019-2026 |

### Curadoria via MCP `rafalegollas` (fora de produção)
O MCP está disponível para agentes de desenvolvimento, não para o runtime do Cloudflare Worker. Ele é usado para pesquisa, leitura de metadados e geração de um lote revisável; não é uma dependência do código implantado.
```typescript
// PubMed (biomédico - prioridade)
await mcp.rafalegollas_pubmed_search_articles({ 
  query: '"hip osteoarthritis" AND exercise AND rehabilitation', 
  max_results: 20, 
  date_from: '2019', 
  sort: 'pub_date' 
});

// Semantic Scholar (citações, related papers)
await mcp.rafalegollas_adamamer20-paper-search-mcp-openai_search_semantic({ 
  query: 'hip osteoarthritis exercise rehabilitation', 
  max_results: 20, 
  year: '2019-2026' 
});

// CrossRef (DOI resolution)
await mcp.rafalegollas_adamamer20-paper-search-mcp-openai_search_crossref({ 
  query: 'hip osteoarthritis exercise', 
  max_results: 10 
});

// arXiv (biomecânica, ML para motion capture)
await mcp.rafalegollas_arxiv_search_papers({ 
  query: 'hip kinematics exercise rehabilitation', 
  max_results: 10 
});
```

### Evidence Level Classification (heurística)
```typescript
function classifyEvidenceLevel(pubType: string[], studyDesign: string): string {
  if (pubType.includes('Meta-Analysis') || pubType.includes('Systematic Review')) return '1a';
  if (pubType.includes('Randomized Controlled Trial')) return '1b';
  if (pubType.includes('Controlled Clinical Trial')) return '2b';
  if (pubType.includes('Cohort Studies')) return '2b';
  if (pubType.includes('Case-Control Studies')) return '3b';
  if (pubType.includes('Case Reports') || pubType.includes('Case Series')) return '4';
  return '5'; // expert opinion, guideline without grading
}
```

### Fase futura: automação por APIs públicas
Após validar a curadoria manual e obter aprovação clínica, uma integração com APIs públicas documentadas (por exemplo, PubMed E-utilities) poderá substituir o trabalho manual. Essa fase requer spec própria, credenciais/rate limits verificados e não chama o MCP.

```text
cron (03:00 UTC)
  → Worker: seleciona categoria pendente
  → Queue: literature-fetch { categorySlug, exerciseIds: [] }
    → Consumer: chama APIs públicas de literatura, persiste somente evidências aprovadas
```

### Arquitetura de curadoria atual
```
Agente com MCP `rafalegollas`
  → Define pergunta PICO por categoria/exercício
  → Busca PubMed (fonte primária) e resolve DOI/metadados
  → Classifica evidência e gera lote de revisão
  → Fisioterapeuta aprova/rejeita cada candidato
  → Migração/endpoint administrativo persiste somente os aprovados
```

### Rate Limit Handling
- A curadoria com MCP é limitada ao ritmo do agente e não é executada em cron.
- A automação futura deve validar os limites atuais das APIs públicas antes de ser implementada.

## Test Plan

| Test | Description |
|---|---|
| `curadoria de evidência` | Mock do lote aprovado, verifica inserts em `exercise_evidence` |
| `evidence_level classification` | Unit test heurística com pub types conhecidos |
| `Vancouver citation formatter` | Input PMID/DOI → output "Autor. Título. Jornal. Ano;vol(páginas). DOI" |
| `aprovação clínica` | Evidência não aprovada não pode alterar `references` ou `icd10_codes` |
| `rate limit backoff` | Simula 429, verifica retry com delay |

## Migration
- `0145_exercise_evidence_table.sql` + `.down.sql`

## References
- `apps/api/src/routes/exercises.ts` — endpoints existentes
- MCP `rafalegollas` — PubMed, arXiv, CrossRef, Semantic Scholar, Google Scholar (somente curadoria assistida)
- Oxford CEBM Levels of Evidence 2011
- Vancouver citation style (ICMJE)
