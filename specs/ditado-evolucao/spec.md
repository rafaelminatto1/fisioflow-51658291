# Ditado de evolução por voz (web + iOS)

**Status:** aprovado em brainstorming (11/jul/2026) · **Fase:** F1 pendente

## Visão

O fisioterapeuta dita a conduta da sessão e o texto aparece em tempo real no editor de evolução. Áudio **100% transiente** — streamado, transcrito e descartado; nunca persistido em disco, R2, banco ou log. Captura apenas a voz do fisioterapeuta (ditado deliberado, push-to-talk/toggle), nunca a do paciente.

**Fora de escopo:** gravação de anamnese/avaliação completa (produto separado, outra página/lógica); escuta ambiente da consulta (AI scribe); voz do paciente; Android.

## Decisões de arquitetura (fixadas no brainstorming)

| Decisão | Escolha | Racional |
| --- | --- | --- |
| Modo de captura | Ditado deliberado | Mais simples/barato; sem consentimento do paciente envolvido |
| Plataformas | Web + iOS juntos | Cobre os dois fluxos de trabalho desde o início |
| Engine web | `@cf/deepgram/nova-3` WebSocket (Workers AI) | Zero vendor novo, perímetro CF, keyterms, US$0,0092/min; troca se F1 reprovar |
| Engine iOS | `SFSpeechRecognizer` on-device (`expo-speech-recognition`, `requiresOnDeviceRecognition`) | Grátis, offline, áudio não sai do iPhone 14+ |
| Pós-processamento | Texto cru + botão "Organizar com IA" opcional | Transparência; LLM (llama/GLM via `runAi`) só reformata com preview/diff, prompt estrito de não-invenção |
| Hardware alvo | Desktop i5/8GB sem GPU; iPhone 14+ | Descarta Whisper local WebGPU no desktop; processamento no servidor |
| Vendor externo | Permitido (regra 100% CF relaxada) | gpt-4o-transcribe / AssemblyAI são plano B se Nova-3 reprovar acurácia pt-BR |

## User stories

### P1 — Ditar evolução no web
Como fisioterapeuta no desktop da clínica, quero clicar no microfone na tela de evolução e ver o que falo virar texto em tempo real no editor, para documentar a sessão sem digitar.

**Acceptance scenarios:**
1. Dado que estou na evolução com a flag habilitada, quando clico no mic e falo, então parciais aparecem como texto fantasma (cinza) e frases finalizadas entram no documento com pontuação.
2. Dado que um estagiário está com a mesma evolução aberta (colaboração), quando eu dito, então ele vê o texto final aparecer em tempo real (via Yjs).
3. Dado que a conexão WS cai no meio, quando reconecta, então nenhum texto já finalizado é perdido (só o parcial em voo se perde) e o usuário vê indicador de reconexão.
4. Dado que dito termos clínicos do glossário (ex.: "mobilização grau III", "EVA"), então eles são transcritos corretamente (keyterms).
5. Em nenhum momento o áudio é gravado: nenhuma escrita em R2/banco/log contém áudio ou bytes de áudio.

### P1 — Ditar evolução no iOS
Como fisioterapeuta com o app profissional no iPhone, quero ditar no `evolution-form` usando o reconhecimento do aparelho, para registrar a sessão em qualquer lugar, inclusive offline.

**Acceptance scenarios:**
1. Dado que toco no mic no formulário de evolução, quando falo em pt-BR, então o texto aparece no campo em tempo real, processado no aparelho (funciona em modo avião).
2. Dado que salvo a evolução, então ela segue o caminho de API existente do app (sem backend novo).
3. Dado que o aparelho não suporta reconhecimento on-device pt-BR, então o botão de mic não aparece (capability check), sem crash.

### P2 — Organizar com IA
Como fisioterapeuta, quero um botão opcional que reestrutura meu ditado corrido em parágrafos clínicos, vendo o antes/depois antes de aplicar.

**Acceptance scenarios:**
1. Dado texto ditado selecionado (ou o bloco recém-ditado), quando clico "Organizar com IA", então vejo um preview lado a lado e escolho aplicar ou descartar.
2. O LLM não adiciona fatos: prompt instrui a apenas reorganizar/pontuar; conteúdo novo não presente no ditado é motivo de reprovação no eval.

### P3 — Governança
1. Feature flag por organização em `settings` (default OFF); rollout F2 (só admin) → F4 (equipe).
2. Regra de spend limit no `fisioflow-gateway` para `deepgram/nova-3` (mesmo padrão da regra `glm52-daily`).
3. Glossário de keyterms editável em configurações (lista de termos de fisioterapia).

## Arquitetura

```
WEB   AudioWorklet PCM 16kHz ──WS──► Worker (auth JWT+org+RBAC)
                                        │ env.AI.run("@cf/deepgram/nova-3",
                                        │   { language:"pt-BR", interim_results:true,
                                        │     punctuate:true, smart_format:true, keyterms },
                                        │   { websocket:true })
      parciais → decoration TipTap  ◄──┘ finais → transação Yjs no doc colaborativo
                                          (persistência/undo/multiuser já existentes)

iOS   expo-speech-recognition (SFSpeechRecognizer on-device, pt-BR)
      → texto no campo do evolution-form → save pela API existente
```

- Componente web: hook `useDictation` agnóstico de engine (padrão VoiceDraft) + barra de mic; engine plugável para eventual troca (gpt-4o etc.).
- O Worker de ponte não bufferiza áudio além do necessário para o frame WS; sem `console.log` de payload de áudio.
- Timeout de sessão de ditado (ex.: 10 min) + keepalive (gotcha: Deepgram WS derruba após ~60s de silêncio).

## Fases e gates

- **F1 — Validação de acurácia (gate: WER ≤ 10% no roteiro clínico, com keyterms ativos):** script batendo no WS do Nova-3 com ditados de teste (frases clínicas gravadas pelo Rafael, sem dados reais de paciente); mesmo roteiro lido no iPhone p/ medir o motor da Apple. Reprova → testar gpt-4o-transcribe (plano B).
- **F2 — Web atrás de flag** (org do Rafael apenas).
- **F3 — iOS** (build via ios-build.yml, instala via USB).
- **F4 — Rollout equipe** + glossário configurável.

## Custos

Web: US$0,0092/min (WS) ≈ US$2/dia no uso pesado (4 fisios × 50 min/dia). iOS: zero. Spend limit dedicado no gateway.

## Testes

- Vitest: hook `useDictation` (estados, inserção de finais, descarte de parciais), handler WS do Worker (auth, formato de eventos, nunca persiste áudio), montagem de keyterms.
- Playwright: fluxo com WS mockado (mic real não roda em CI).
- F1 script = teste de acurácia manual documentado em `specs/ditado-evolucao/f1-resultados.md`.
