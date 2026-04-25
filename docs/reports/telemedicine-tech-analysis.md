# Telemedicina: analise tecnica das opcoes

Data: 2026-04-24

## Resumo executivo

O FisioFlow hoje nao esta usando LiveKit de verdade. O backend tem endpoint para gerar token, variaveis de ambiente e tipos para LiveKit, mas o fluxo funcional atual continua sendo Jitsi por iframe.

Para o contexto atual do projeto, a melhor decisao e manter a telemedicina em modo dormindo, com Jitsi como fallback operacional e LiveKit reservado para uma futura fase de ativacao real. Se a telemedicina virar prioridade comercial, LiveKit e a opcao mais equilibrada para o produto. Cloudflare RealtimeKit merece avaliacao, mas ainda precisa de validacao pratica de maturidade, custo e compliance. Zoom e forte como produto empresarial, mas tende a trazer mais custo, peso e lock-in do que o FisioFlow precisa agora.

## O que existe hoje no codigo

No backend, a rota de telemedicina cria salas com `meeting_provider = 'jitsi'` por padrao e monta a URL `https://meet.jit.si/fisioflow-{roomCode}`.

O mesmo arquivo tambem expoe `/api/telemedicine/livekit-token`, com geracao manual de JWT para LiveKit via `wrangler secret put`, mas esse fluxo nao e usado por uma SDK LiveKit real no frontend.

No frontend, o componente chamado `LiveKitRoom` esta enganoso: ele solicita token LiveKit, mas ao entrar na sala renderiza um iframe do Jitsi como fallback. Ou seja, LiveKit existe como infraestrutura preparada, nao como experiencia efetivamente ativa.

No app mobile/professional, o fluxo de telemedicina tambem aponta para `meeting_url` e para o formato de sala da API, o que reforca que o sistema ainda depende mais de URL externa do que de uma SDK de conferencia real.

## Comparacao das opcoes

### LiveKit

Pontos fortes:

- Open source e com Cloud opcional.
- SDKs bons para web, mobile e React Native.
- SFU moderno, apropriado para produto proprio.
- Integra bem com gravacao, transcricao e fluxos de IA no futuro.
- Boa escolha quando a telemedicina precisa virar parte do produto, e nao apenas um link externo.

Pontos fracos:

- Exige ativacao real da SDK no frontend.
- Traz custo operacional e comercial.
- Requer desenho claro de autenticacao, rotas, estados e gravacao.

Leitura para o FisioFlow:

- E a melhor opcao tecnica se telemedicina for uma funcionalidade estrategica.
- Como o projeto ja prepara token e envs, a migracao futura fica bem menor do que com outras plataformas.

### Jitsi

Pontos fortes:

- Simples, barato e rapido de manter.
- Ja esta funcionando como padrao do projeto.
- Possui iframe API e SDK React.
- Bom para MVP, testes e uso de baixo risco.

Pontos fracos:

- `meet.jit.si` publico nao e a melhor base para atendimento sensivel.
- Menos controle sobre experiencia, compliance e caminho de evolucao.
- Self-hosting aumenta bastante a complexidade operacional.

Leitura para o FisioFlow:

- Boa opcao para manter o sistema util sem custo adicional.
- Nao e a melhor escolha final para telemedicina como diferencial comercial.

### Cloudflare RealtimeKit / Realtime

Pontos fortes:

- Esta alinhado com o ecossistema Cloudflare, que o projeto ja usa.
- Tem SDKs e UI kits para video e voz.
- A documentacao atual apresenta RealtimeKit como solucao para chamadas de video, voz, gravacao e integracao web/mobile.
- Pode simplificar a operacao se o restante da arquitetura ja estiver em Cloudflare.

Pontos fracos:

- E mais novo e eu trataria como opcao a validar, nao como decisao padrao.
- Precisa checar maturidade real para telemedicina, suporte, limites e precificacao no caso de uso do FisioFlow.
- Para compliance, ainda e preciso confirmar contrato, DPA/BAA e aderencia juridica.

Leitura para o FisioFlow:

- Vale como candidato serio porque o projeto ja esta no ecossistema Cloudflare.
- Ainda assim, eu nao migraria sem uma POC curta com latencia, UX, gravacao e compliance.

### Zoom Video SDK

Pontos fortes:

- Produto maduro, com marca forte no mercado.
- Tem SDKs, UI toolkit, chat, screen share, transcricao, gravacao e PSTN.
- Mais facil vender para alguns perfis de cliente que ja confiam em Zoom.

Pontos fracos:

- SDK e pacote sao pesados.
- Lock-in comercial maior.
- O sample de telehealth da propria Zoom traz aviso de que nao e uma solucao pronta para HIPAA/PHI.
- Pode ficar caro e complexo para um produto que ainda esta priorizando WhatsApp e operacoes basicas.

Leitura para o FisioFlow:

- Faria sentido se a telemedicina fosse uma aposta comercial central, com foco em experiencia enterprise.
- Hoje eu colocaria atras de LiveKit para este produto.

## Alternativas adicionais

Outras alternativas com SDK React e foco em WebRTC que apareceram na pesquisa:

- Whereby SDK: bom para embed rapido, menos controle profundo.
- Agora RTC React: maduro, forte em video, mas com mais lock-in.
- Vonage Video API: completo e com referencia React, mas mais pesado para o que o FisioFlow precisa agora.

Essas opcoes sao validas, mas nenhuma me parece mais aderente que LiveKit para a evolucao natural do sistema.

## Recomendacao para o FisioFlow

### Agora

1. Manter Jitsi como engine ativa.
2. Manter LiveKit dormindo, com secrets e endpoint preparados.
3. Corrigir o nome do componente `LiveKitRoom`, porque hoje ele nao representa o que faz.
4. Tratar telemedicina como fase posterior do roadmap, nao como prioridade de curto prazo.

### Quando a telemedicina virar prioridade

1. Ativar LiveKit de verdade no frontend com `@livekit/components-react` e `livekit-client`.
2. Reaproveitar o endpoint `/api/telemedicine/livekit-token`.
3. Padronizar a escolha do provider no banco.
4. Avaliar Cloudflare RealtimeKit em POC separada, como alternativa de stack nativa.

## Risco principal

O maior risco hoje nao e tecnico, e sim de expectativa: o sistema carrega nomes e secrets de LiveKit, mas a experiencia real continua sendo Jitsi. Isso pode gerar falsa sensacao de implementacao pronta. O ideal e deixar isso explicitamente registrado no roadmap e na interface tecnica.

## Fontes consultadas

- [LiveKit React components](https://docs.livekit.io/reference/components/react/)
- [Repositorio livekit/components-js](https://github.com/livekit/components-js)
- [Jitsi React SDK](https://jitsi.github.io/handbook/docs/dev-guide/dev-guide-react-sdk/)
- [Jitsi IFrame API](https://jitsi.github.io/handbook/docs/dev-guide/dev-guide-iframe/)
- [Cloudflare Realtime overview](https://developers.cloudflare.com/realtime/)
- [Cloudflare RealtimeKit docs](https://docs.realtime.cloudflare.com/)
- [Zoom Video SDK get started](https://developers.zoom.us/docs/video-sdk/web/get-started/)
- [Zoom Video SDK npm](https://www.npmjs.com/package/@zoom/videosdk)
- [Zoom telehealth sample](https://github.com/zoom/VideoSDK-Web-Telehealth)
- [Whereby SDK](https://github.com/whereby/sdk)
- [Agora RTC React SDK](https://github.com/AgoraIO-Extensions/agora-rtc-react)
- [Vonage Video React app](https://github.com/Vonage/vonage-video-react-app)
