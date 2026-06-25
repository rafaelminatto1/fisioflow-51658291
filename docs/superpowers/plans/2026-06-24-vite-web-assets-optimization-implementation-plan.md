# Plano De Implementacao: Otimizacao De Assets Vite Web

Data: 2026-06-24
Escopo: `apps/web`
Status: em execucao

## Objetivo

Adicionar `vite-plugin-image-optimizer` e `vite-plugin-static-copy` ao pipeline web para:

- reduzir peso de imagens publicas e emitidas no build;
- servir o WASM do MediaPipe a partir do proprio dominio do app;
- manter fallback CDN para resiliencia;
- evitar drift entre pontos diferentes do runtime que inicializam o MediaPipe.

## Mudancas Planejadas

1. Ajustar `apps/web/package.json` para incluir `vite-plugin-static-copy` sem promover upgrades colaterais de `vite` e `wrangler`.
2. Atualizar `apps/web/vite.config.ts` para:
   - importar e registrar `vite-plugin-static-copy`;
   - ativar `ViteImageOptimizer` apenas em build;
   - copiar `node_modules/@mediapipe/tasks-vision/wasm/*` para um path estavel no output.
3. Centralizar os paths do MediaPipe em `src/lib/ai/mediapipe.ts`, priorizando assets locais e mantendo CDNs como fallback.
4. Remover URL hardcoded duplicada em `src/components/biofeedback/MovementAnalysis.tsx`.
5. Adicionar cache runtime para `wasm` local em `apps/web/src/service-worker.ts`.
6. Validar com `type-check` e `build` do app web.

## Criterios De Aceite

- Build web completa sem erro.
- `dist` contem os arquivos do MediaPipe em diretório estavel.
- O runtime tenta o WASM local antes de CDNs.
- `MovementAnalysis` usa a mesma resolucao central dos outros fluxos.
