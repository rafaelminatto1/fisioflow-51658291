# Bases de Exercícios (gratuitas) + Integração Exercícios↔Wiki↔Artigos↔Protocolos

**Data:** 2026-06-15
**Status:** Brainstorm / análise para planejamento (não implementado)
**Relacionado:** [[2026-06-15-evidence-gateway-pubmed-design]]

## Contexto do que JÁ existe no FisioFlow (verificado no código)

- `exercises` (packages/db/src/schema/exercises.ts) já tem campos clínicos ricos:
  `instructions`, `tips`, `precautions`, `benefits`, `musclesPrimary/Secondary`,
  `bodyParts`, `equipment`, `pathologiesIndicated`, `pathologiesContraindicated`,
  `icd10Codes`, `tags`, `references` (JSON string), `nameEn`, `aliases`,
  `embedding vector(768)`, `embeddingSketch`. → **O schema clínico já está pronto**;
  falta popular, rastrear proveniência e ligar à evidência.
- `apps/api/src/routes/wger.ts` já faz `/search` (wger) e `/enrich` (wger + PubMed + IA),
  porém com **token wger hardcoded** e um `PubMedClient` ingênuo (sem api_key/rate limit).
- `apps/api/src/lib/pubmed-client.ts` = cliente PubMed simples → **redundante** com o
  novo Evidence Gateway (`lib/evidence/`). Consolidar.
- Knowledge/Wiki: `packages/db/src/schema/wiki.ts`, rotas `knowledge.ts`, `wiki.ts`,
  busca semântica clínica `ai-clinical-search.ts` (Workers AI + pgvector).
- Protocolos: `protocols.ts` (`exerciseProtocols`, `protocolExercises`).

**Conclusão estrutural:** o FisioFlow não precisa de uma "base externa em runtime".
Precisa de um **pipeline de ingestão + curadoria + proveniência + evidência**, ligando
exercícios às tabelas que já existem.

---

## Parte 1 — Dissertação: bases de exercícios GRATUITAS

**Tese:** nenhuma base gratuita entrega uma biblioteca clínica de fisioterapia pronta.
A estratégia correta é tratá-las como **matéria-prima**: ingerir → normalizar → traduzir
PT-BR → enriquecer clinicamente → **exigir revisão profissional** antes de publicar.
Toda linha importada carrega `source`, `source_url`, `source_license`, `imported_at`,
`review_status`. Nada entra em prescrição automaticamente.

### 1. free-exercise-db (yuhonas) — **melhor seed inicial**
- Licença **Unlicense** (domínio público de fato) → menor fricção jurídica para SaaS.
- ~800 exercícios JSON + imagens; campos `name/force/level/mechanic/equipment/
  primaryMuscles/secondaryMuscles/instructions/category/images`.
- Contras: foco fitness/musculação, inglês, sem contraindicação/CID-10/fase de reab.
- Uso: seed bruto em staging → mapear para `exercises` → traduzir → curar.

### 2. wrkout/exercises.json — **melhor complemento Unlicense**
- Também Unlicense; scripts geram JSON e **SQL/Postgres** (casa com Neon/Drizzle).
- Valor real = **segunda fonte para deduplicação/cruzamento de confiança** (quando duas
  bases concordam em nome+músculo+equipamento, confiança ↑; divergência → revisar).
- Contras: versão completa é comercial; a gratuita é menor.

### 3. wger (wger-project) — **melhor ecossistema/API, mas auditar licença**
- Sistema OSS completo, REST `/api/v2/`, OpenAPI, self-host Docker, multi-idioma (inclui PT).
- Código **AGPL-3.0**; dados de exercícios em **Creative Commons por entrada** → auditar
  cada licença antes de importar comercialmente (algumas CC pedem atribuição/share-alike).
- Uso: API/instância self-host só como **ferramenta de ingestão/curadoria**, não embutir
  o código. Guardar `attribution` quando exigido. **Já parcialmente integrado** (`wger.ts`).

### 4. Everkinetic data — **baixa prioridade (ShareAlike)**
- **CC-BY-SA-4.0**: o "SA" pode obrigar derivados a manter licença compatível → ruim para
  SaaS proprietário. Usar só como referência manual com conteúdo reescrito.

### 5. ExerciseDB / AscendAPI (self-host OSS) — **NOVIDADE relevante**
- Repo `ExerciseDB/exercisedb-api` agora **AGPL-3.0, self-hostável**, anuncia 11.000+
  exercícios, 15k vídeos, 20k imagens, GIFs masc/fem. Há free tier via RapidAPI (limites).
- AGPL no **código da API** → se self-hospedar e expor publicamente, a licença AGPL incide
  sobre o serviço; os **dados/mídia** exigem verificação de termos antes de redistribuir.
- Uso: prova de conceito visual (mídia é o ponto fraco das bases gratuitas). Em produção,
  validar termos de armazenamento/redistribuição/tradução.

### 6. API Ninjas Exercises (free tier) — **enriquecimento pontual**
- ~3000 exercícios, `safety_info` (mais próximo do clínico que datasets de academia).
- Free retorna poucos por chamada; `allexercises`/paginação são pagos. Não serve ingestão massiva.

### 7. Datasets acadêmicos de movimento (MEx, PHYTMO, low-back rehab) — **para IA/pose, não catálogo**
- Pequenos, licença de pesquisa. Conversam com `referencePose`/`embeddingSketch` para
  futura **avaliação de execução por câmera** (amplitude, ritmo, compensações). Não são biblioteca.

### Ranking gratuito final
1. free-exercise-db (seed) · 2. wrkout (cruzamento) · 3. wger (API/curadoria, auditar) ·
4. API Ninjas free (enriquecimento) · 5. ExerciseDB self-host (mídia, validar termos) ·
6. Everkinetic (referência) · 7. datasets acadêmicos (IA de movimento).

### MCPs de exercícios já existentes (descoberto via Exa — não precisamos esperar o "MCP perfeito")
- **Juxsta/wger-mcp** (MIT) — wger via MCP, gratuito, 12 tools (search/details/categories…).
- **csjoblom/musclesworked-mcp** (MIT) — 856 exercícios; tools úteis para protocolo:
  `analyze_workout` (cobertura/desequilíbrios), `get_alternatives` (substituições por
  sobreposição muscular). Ótimo para **balancear protocolos**.
- **westvegh/exerciseapi-mcp-server** — exerciseapi.dev, 2.198 exercícios c/ categoria PT,
  free 100 req/dia (chave). Útil só para curadoria/protótipo.
- MCP não é "base de dados"; é interface padronizada de tools para IA. O ideal continua
  sendo **nosso MCP próprio** (search/suggest/import) sobre o nosso banco já curado.

---

## Parte 2 — Brainstorm: integração Exercícios ↔ Wiki ↔ Artigos ↔ Protocolos

### Modelo de ligação unificado
O Evidence Gateway já criou `evidence_links(target_type ∈ {exercise,protocol,wiki,patient,
assessment})`. Estender esse padrão como **grafo de conhecimento clínico**: a evidência
(artigo PMID) é o nó central de credibilidade que conecta exercícios, protocolos e wiki.

```
        ┌──────────────┐
        │  ARTIGO/PMID │  (evidence_articles)
        └──────┬───────┘
        evidence_links (polimórfico)
   ┌───────────┼─────────────┬───────────────┐
EXERCÍCIO   PROTOCOLO       WIKI          PACIENTE/AVALIAÇÃO
(exercises) (exerciseProtocols) (wikiPages)   (sugestão contextual)
```

### 20+ Insights

1. **O schema clínico já existe** — `pathologiesIndicated/Contraindicated`, `icd10Codes`,
   `precautions` são exatamente os filtros de segurança que as bases gratuitas não têm.
2. **`exercises.references` (JSON string) deve virar relação real** via `evidence_links`
   (`target_type='exercise'`), com nível de evidência por vínculo — busca e auditoria melhores.
3. **CID-10 é a chave de junção universal**: exercício, protocolo, artigo (via MeSH→CID) e
   diagnóstico do paciente podem ser cruzados pelo mesmo eixo.
4. **MeSH ↔ CID-10 mapping**: criar tabela de tradução para conectar artigos PubMed
   (indexados por MeSH) aos exercícios/patologias (indexados por CID-10).
5. **Proveniência obrigatória**: colunas `source/source_url/source_license/review_status`
   em `exercises` para importar legalmente e publicar só o compatível.
6. **Curadoria como gate clínico**: `review_status pending→approved` — nada importado entra
   em prescrição sem fisioterapeuta aprovar (espelha o gate de segurança do Evidence Gateway).
7. **Deduplicação por nome normalizado + músculo + equipamento** ao cruzar 2+ fontes;
   `musclesworked` pode validar o mapeamento muscular.
8. **Embedding compartilhado**: exercícios (768d) e artigos (1024d) — padronizar o modelo
   de embedding (bge-m3 1024d) para permitir busca cross-entidade "exercício↔artigo".
9. **Busca híbrida**: full-text PT-BR (nome/sinônimos) + pgvector (intenção clínica) +
   filtros rígidos (contraindicação/equipamento/nível/região). IA sugere, backend filtra.
10. **Protocolo baseado em evidência**: cada `protocolExercises` pode exibir os PMIDs que
    sustentam aquela escolha → "protocolo com evidência" como diferencial de produto.
11. **`analyze_workout`/`get_alternatives` (musclesworked-mcp)** para detectar desequilíbrio
    muscular num protocolo e sugerir substituições — valor clínico direto.
12. **Wiki como camada de síntese**: importar artigo → gerar página wiki PT-BR (resumo+
    takeaways) → indexar p/ RAG do Brain Dashboard → linkar de volta a exercícios/protocolos.
13. **Trilha de evidência ("evidence trail")**: já há `scripts/archive/create-wiki-evidence-
    trails.ts` — formalizar: wiki cita artigo, exercício cita wiki, protocolo cita exercício.
14. **Sugestão contextual no atendimento**: ao abrir avaliação com CID-10 X, sugerir
    exercícios aprovados + artigos recentes + protocolo padrão para X.
15. **Consolidar PubMed**: aposentar `pubmed-client.ts` e o `/enrich` ingênuo de `wger.ts`;
    apontar tudo para `lib/evidence/` (com api_key, rate limit, cache, ranking).
16. **Remover token wger hardcoded** de `wger.ts` → `wrangler secret put WGER_API_TOKEN`.
17. **Ingestão via Workflows/Queues** (já temos bindings) — ETL idempotente, retomável,
    com DLQ, em vez de import síncrono que estoura limites.
18. **Mídia em R2** com proveniência: baixar só o que a licença permite; caso contrário,
    referência externa + `media_license`.
19. **Pré-cálculo de "exercícios relacionados"** por sobreposição muscular + mesma patologia
    + co-citação em protocolos → recomendação instantânea.
20. **MCP próprio do FisioFlow** (estado final, alinhado ao Evidence Gateway remoto):
    `search_exercises`, `suggest_exercises_for_condition` (CID-10 + contraindicação),
    `import_exercise_source` (ETL), `link_evidence_to_exercise`, `analyze_protocol_balance`,
    `create_prescription_draft` (rascunho, nunca auto-prescreve).
21. **Versionamento clínico**: aproveitar `evolution-versions`/`wikiPageVersions` para
    versionar exercícios curados (quem aprovou, quando, com base em qual evidência).
22. **Métricas de evidência por organização**: % de exercícios com ≥1 artigo de alto nível,
    "lacunas de evidência" como backlog de curadoria.
23. **Feedback loop com PROMs**: ligar resultado de escalas (VAS/Oswestry…) ao protocolo+
    exercícios usados → evidência interna ("real-world") complementando a literatura.

---

## Parte 3 — Plano faseado proposto (a detalhar em plano de implementação)

- **Fase A — Consolidação & segurança (rápida):** aposentar `pubmed-client.ts`, redirecionar
  `wger.ts/enrich` para `lib/evidence/`, remover token wger hardcoded (→ secret).
- **Fase B — Proveniência & curadoria:** migração: colunas `source/source_url/source_license/
  review_status/reviewed_by/reviewed_at` em `exercises`; tabela `exercise_import_candidates`.
- **Fase C — Pipeline de ingestão (Workflows/Queues):** ETL free-exercise-db → staging →
  dedup (cruzar wrkout/wger) → mapear schema → tradução PT-BR (IA) → fila de curadoria.
- **Fase D — Grafo de evidência:** `exercises.references` → `evidence_links`; tabela MeSH↔CID-10;
  padronizar embedding (bge-m3) p/ busca cross-entidade; "exercícios relacionados".
- **Fase E — Superfícies:** aba "Evidência" no exercício/protocolo; import artigo→wiki;
  sugestão contextual por CID-10; `analyze_protocol_balance`.
- **Fase F — MCP próprio:** tools de exercício+evidência sobre o banco curado (local + remoto Workers).

**Princípio transversal:** IA sugere, fisioterapeuta decide; toda importação rastreável e
revisável; nada gratuito vira conteúdo clínico publicado sem curadoria e licença compatível.
