# Plano: Reescrita dos AI helpers legados (pós-migração Observação Livre → observação)

Status: **NÃO BLOQUEADOR.** Os arquivos abaixo compilam contra aliases `@deprecated` mantidos em `src/hooks/observacao/types.ts` (Fase 2). Eles ainda funcionam, mas produzem prompts com seções Observação Livre vazias (`"Não informado"`), portanto degradados.

## Arquivos pendentes

| Arquivo                              | LoC aprox | Consumidores diretos                                                       | Impacto se quebrado            |
| ------------------------------------ | --------- | -------------------------------------------------------------------------- | ------------------------------ |
| `src/lib/ai/clinical-support.ts`     | ~750      | `ClinicalDecisionSupport` em `AssistenteTab.tsx`, `IntelligentReports.tsx` | Sugestões clínicas + red flags |
| `src/lib/ai/rag-clinical.ts`         | ~350      | `RAGClinicalContext`, busca por casos similares                            | Buscas de evidência clínica    |
| `src/lib/ai/observacao-assistant.ts` | ~720      | Apenas tipos (após cleanup da Fase 7)                                      | Tipos legados de transcrição   |
| `src/lib/ai/pain-analysis.ts`        | ~400      | `PainAnalysisDashboard`, gráficos de evolução de dor                       | Análise de tendência de dor    |
| `src/lib/ai/exercises.ts`            | ~280      | `ExerciseAIAssistant` em modal de recomendação                             | Sugestão de exercícios         |

Total: ~2.500 linhas.

## Estratégia recomendada — refator incremental por feature

Tocar tudo de uma vez é arriscado (cada arquivo serve N componentes UI). Sugestão: **um PR por feature**, cada um seguindo o template abaixo. Permite revisar a qualidade dos prompts isoladamente e fazer rollback granular.

### Template de cada PR

1. **Inputs**: trocar parâmetro `currentSOAP: { subjective, objective, assessment, plan }` por `currentEvolution: { observacao, painScale, procedures, exercises, measurements, recentPROMs }`.
2. **Prompt**: substituir o bloco "S/O/A/P" por:

   ```
   Observação clínica do fisioterapeuta:
   {observacao_plain}

   Dados estruturados desta sessão:
   - Dor (EVA): {painScale}/10
   - Procedimentos realizados: {procedures}
   - Exercícios prescritos: {exercises}
   - Medições: {measurements}
   - PROMs recentes: {recentPROMs}

   Histórico (últimas N sessões):
   {previousObservacoes_summarized}

   Tarefa: {task}
   ```

3. **Output schema (Zod)**: manter inalterado (red flags, recommendations, etc. seguem com os mesmos campos).
4. **Consumidores**: ajustar componentes UI que chamavam `buildPatientCaseData()` para passar `evolutionData` direto do `usePatientEvolutionState`.
5. **Smoke test**: rodar a feature em produção com 1 sessão real, comparar saída com a versão antiga.

## Ordem sugerida (mais impactante primeiro)

1. **`clinical-support.ts`** (maior, mais consumido) — IntelligentReports e AssistenteTab são as features mais visíveis. PR único, ~1 dia de trabalho.
2. **`pain-analysis.ts`** — Dashboard de dor. Após o refator, parar de derivar EVA de `subjective.painScale` (não existe mais) e usar `sessions.pain_scale` direto. ~3-4h.
3. **`exercises.ts`** — Sugestão de exercícios. Usar `currentEvolution.observacao + currentEvolution.measurements` como contexto. ~3-4h.
4. **`rag-clinical.ts`** — Busca semântica clínica. Os embeddings já estão corretos (Fase 4); só falta atualizar o builder de contexto para o retrieval. ~2h.
5. **`observacao-assistant.ts`** — Apagar inteiro. Tipos legados não têm mais consumidores reais após PRs 1-4. ~30min.

Total estimado: **2–3 dias de trabalho**, distribuídos em 5 PRs revisáveis.

## Script utilitário — encontrar consumidores

Executar antes de cada PR para listar componentes UI dependentes:

```bash
bash scripts/find-ai-consumers.sh clinical-support
# → lista todos arquivos UI que importam de @/lib/ai/clinical-support
```

Já criado em `scripts/find-ai-consumers.sh`.

## Critério de "pronto"

- Typecheck verde nos arquivos refatorados (worker + dashboard).
- Cada feature IA funcional com pelo menos 1 paciente real (não-vazio).
- Prompts revisados visualmente — não deve haver mais menção a "S/O/A/P" no texto.
- `grep -r "currentSOAP\|SOAPSection\|subjective" src/lib/ai/` retorna vazio.
- Aliases `@deprecated` em `src/hooks/observacao/types.ts` podem ser removidos.

## Alternativa: deixar como está

Os 5 arquivos funcionam de forma degradada. Se as features de IA não forem prioridade neste ciclo, é aceitável deixar para depois — o sistema principal (editor + DB + worker + relatórios + PDF) já está 100% no modelo novo.
