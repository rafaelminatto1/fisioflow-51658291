---
description: "Tasks — S6.3 Voice Scribe v2"
---

# Tasks: Voice Scribe v2 (S6.3)

## Phase 1: Setup

- [ ] T001 Branch `feat/voice-scribe-v2-agents-sdk`
- [ ] T002 Verificar tag DO disponível em `wrangler.toml` (v9?) e schema `clinical_scribe_logs` existe
- [ ] T003 `pnpm add @cloudflare/voice` (root + apps/api); `pnpm up agents@0.12.4 -F @fisioflow/api`

## Phase 2: Backend

- [ ] T010 [US1] Criar `apps/api/src/agents/VoiceScribeAgent.ts`:
  ```ts
  import { Agent } from "agents";
  import { withVoice, WorkersAIFluxSTT } from "@cloudflare/voice";
  const VoiceAgent = withVoice(Agent);
  export class VoiceScribeAgent extends VoiceAgent<Env> {
    transcriber = new WorkersAIFluxSTT(this.env.AI);
    async onTurn(transcript, context) {
      await this.persistTurn(transcript);
      return ""; // sem TTS
    }
    async persistTurn(text: string) {
      /* INSERT clinical_scribe_logs */
    }
  }
  ```
- [ ] T011 [US1] `wrangler.toml`: `[[durable_objects.bindings]] name = "VOICE_SCRIBE_AGENT" class_name = "VoiceScribeAgent"`
- [ ] T012 [US1] `wrangler.toml`: nova migration `[[migrations]] tag = "v9" new_classes = ["VoiceScribeAgent"]` (idem env.staging)
- [ ] T013 [US1] `apps/api/src/index.ts`: export class `VoiceScribeAgent`
- [ ] T014 [US1] Smoke test backend: WebSocket connect + envio de áudio mock + asserta DO state

## Phase 3: Frontend

- [ ] T020 [US1] Criar `src/hooks/useVoiceScribeV2.ts`:
  ```ts
  import { useVoiceAgent } from "@cloudflare/voice/react";
  export function useVoiceScribeV2(sessionId: string) {
    return useVoiceAgent({ agent: "voice-scribe-agent", name: sessionId });
  }
  ```
- [ ] T021 [US1] Marcar `useVoiceScribe.ts` antigo como `@deprecated` com JSDoc apontando v2
- [ ] T022 [US1] `NotionEvolutionPanel.tsx`: gate por `import.meta.env.VITE_VOICE_SCRIBE_V2 === 'true'`
- [ ] T023 [US1] UI: indicador "Reconectando..." quando WS estado for `connecting`

## Phase 4: Persistência

- [ ] T030 [US1] Migration `0095_clinical_scribe_logs_session_id.sql` se faltar coluna
- [ ] T031 [US1] Worker rota interna para `VoiceScribeAgent` chamar persistência via Hyperdrive

## Phase 5: Polish

- [ ] T040 PR `feat(voice): Voice Scribe v2 com Cloudflare Voice Agents`
- [ ] T041 Doc `docs/voice-scribe-v2.md` com troubleshooting (mic permission, browser support)
- [ ] T042 Rollout: 1 fisio piloto → 5 → todos
