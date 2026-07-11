# Matar o SOAP — observação livre é o modelo único

**Decisão do Rafael (11/jul/2026):** "mate completamente o SOAP pois esse modelo atual [observação livre] é o que iremos seguir". O modelo de dados já migrou em mai/2026 (sessions.observacao); esta spec elimina o conceito SOAP do código/UI em fases, separando **delete** (morto) de **rename** (vivo com nome legado).

## Fase A — SOAP funcional no fluxo da evolução/ditado ✅ (11/jul)

- Contrato do AI Scribe: `onApply(text: string)` (era `SoapFields`); V1 e V2; preview mostra transcrição, não "Preview SOAP".
- `SoapFields` removido de `useVoiceScribe`; `soapToObservacao` → `textToObservacaoHtml` (parágrafos por linha em branco).
- `soapData`/`setSoapData` removidos de `usePatientEvolutionState` (nada renderizava).
- Deletados (verificado: zero importadores): `contexts/SoapContext.tsx`, `evolution/V5ProBlockEditor.tsx`, `ai/AudioTranscription.tsx`.
- `VoiceScribeAgent`: conceito de seção S/O/A/P removido do estado/protocolo; grava a constante `"observacao"` na coluna legada `clinical_scribe_logs.section` até a Fase C.
- `useVoiceScribeV2`: sem `section`; instância DO = `${patientId}:observacao`.

## Fase B — renames de código vivo com nome SOAP (pendente)

- `useAutoSaveSoapRecord` / `src/hooks/soap/` / `useSoapRecords` → nomes de evolução (é o autosave VIVO — só rename, com cuidado).
- `AISoapSummaryDialog` ("Gerar resumo com IA") → `AISummaryDialog`; prompts internos deixam de pedir estrutura SOAP.
- `sessionsApi`/rotas: nomes `soapRecordId` em `evolutionVersions` (param de API — manter compat aceitando os dois nomes durante a transição).
- `capture_reason: "soap_section"` → novo valor no enum de `@fisioflow/core` (com aceite do antigo).
- Prompt do telemedicine que pede `soap_suggestion` → resumo em observação livre.

## Fase C — banco e varredura final (pendente)

- Migração: `evolution_versions.soap_record_id` → `evolution_id` (com view/alias de transição); default de `capture_reason`; `clinical_scribe_logs.section` dropada.
- Deletar componentes/skeletons mortos restantes (`SOAPEditorSkeleton`, `soap-evolution-improved/`, `EvolutionHeader` antigo) — conferir importadores um a um (knip baseline NÃO é confiável sozinho).
- Grep final: nenhum `soap|Soap|SOAP` fora de comentários históricos/migrations antigas.

## Regra permanente

Feature nova nunca introduz o conceito SOAP. Texto clínico = observação livre + campos estruturados específicos (EVA, medições, procedimentos).
