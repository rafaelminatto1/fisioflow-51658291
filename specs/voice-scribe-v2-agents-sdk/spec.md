# Feature Specification: Voice Scribe v2 — Agents SDK Voice (S6.3)

**Feature Branch**: `feat/voice-scribe-v2-agents-sdk`
**Created**: 2026-05-18
**Status**: Draft (S6.3)
**Input**: Cloudflare Agents SDK v0.12.4 (2026-05-13) + `@cloudflare/voice` (beta)

## Contexto

Atual: `src/hooks/useVoiceScribe.ts` faz chamada HTTP curta ao Worker para transcrever áudio gravado (sem streaming, sem reconnect). Novo `@cloudflare/voice`:

- `withVoice(Agent)` mixin: STT contínuo via WebSocket + TTS + persistência SQLite em DO
- `WorkersAIFluxSTT` para STT
- `useVoiceAgent` React hook que gerencia mic, playback e reconexão automática
- Histórico sobrevive a restarts de DO ✅

## User Scenarios

### US1 — Fisio dita evolução em tempo real durante atendimento (P1)

**Persona**: Fisioterapeuta com mãos ocupadas, voz é única entrada possível.

**Why**: Reduz tempo de redação de evolução em 60%+; histórico de turnos persistido permite revisar transcrições; reconexão automática se Wi-Fi cair.

**Acceptance**:

1. Fisio aperta "Iniciar Voice Scribe" → WebSocket abre com `VoiceScribeAgent`
2. Voz é transcrita em tempo real (latência < 500ms)
3. Se Wi-Fi cair por 10s, reconecta sem perder histórico
4. Ao parar, transcrição completa é salva em `sessions.observacao` como rascunho

### US2 — Migração graceful do hook antigo (P2)

**Persona**: dev mantendo backward-compat.

**Acceptance**:

1. Hook antigo `useVoiceScribe` marcado `@deprecated`, redireciona para `useVoiceScribeV2`
2. Feature flag `VITE_VOICE_SCRIBE_V2=true` controla cutover

### Edge Cases

- Mic permission negada: hook retorna erro claro com instrução
- Áudio com background ruidoso (clínica): WorkersAIFluxSTT já filtra
- Sessão DO já tem 100+ turnos: limite de armazenamento?

## Requirements

- **FR-001**: Upgrade `agents` 0.8.2 → 0.12.4 + `pnpm add @cloudflare/voice` (root + apps/api)
- **FR-002**: Criar `apps/api/src/agents/VoiceScribeAgent.ts` estendendo `withVoice(Agent)` com:
  - `transcriber = new WorkersAIFluxSTT(this.env.AI)`
  - `tts` NÃO definida (Voice Scribe é uni-direcional — só STT)
  - Override `onTurn(transcript, context)` → persistir em `clinical_scribe_logs` + retornar `''` (sem TTS)
- **FR-003**: Registrar DO em `wrangler.toml`: nova tag `v9`, `new_classes = ["VoiceScribeAgent"]`
- **FR-004**: Criar `src/hooks/useVoiceScribeV2.ts` usando `useVoiceAgent` de `@cloudflare/voice/react`
- **FR-005**: `NotionEvolutionPanel.tsx`: trocar import do hook antigo pelo v2 (atrás de feature flag)
- **FR-006**: Smoke test: gravar 30s de áudio mock → transcrição não-vazia retornada

## Success Criteria

- **SC-001**: Latência fim-a-fim (fala → texto na tela) < 500ms em 95% dos casos
- **SC-002**: Reconexão automática após desconexão WS < 2s
- **SC-003**: 0 turno perdido em testes de reconexão
- **SC-004**: Adoção > 80% dos fisios em 30 dias após cutover

## Assumptions

- Conta CF tem acesso a `@cf/black-forest-labs/flux-1-schnell` (modelo Flux STT)
- Beta do Voice API tem SLA aceitável para uso clínico (validar antes)
- DO migration tag `v9` ainda não usada (verificar `wrangler.toml`)

## Out of Scope

- TTS (não usamos — Scribe é só transcrição)
- Multi-idioma (foco PT-BR)
- Detecção de fala de múltiplos interlocutores (single-speaker)
- Voice biometrics
