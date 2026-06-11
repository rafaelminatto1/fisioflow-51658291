# Professional App Completion Master Plan

## Lote 1: Core de Dados (Offline & Protocolos) [CONCLUÍDO ✅]
- **Modo Offline Básico**: [x]
  - [x] Implementação de fila de requisições via AsyncStorage / SQLite (Expo SQLite).
  - [x] Interceptor no Axios/Fetch para detectar falha de rede e enfileirar `POST/PUT/DELETE`.
  - [x] Background task ou hook no `App.js` que tenta sincronizar a fila quando a conexão retorna.
- **Protocolos Backend & Sincronização**: [x]
  - [x] Criação das rotas e schema Drizzle para `protocols` e `protocol_steps` na API Hono (Cloudflare Workers).
  - [x] Integração do app mobile para criar, buscar e associar protocolos a pacientes.

## Lote 2: Mídia e Conteúdo (Exercícios e Arquivos) [CONCLUÍDO ✅]
- **Upload via Cloudflare R2**: [x]
  - [x] Rota `/upload-url` (presigned URL) na API Hono configurada e validada.
  - [x] App mobile faz PUT direto da mídia (videos/imagens) para o link presigned do bucket R2.
- **Exercícios CRUD**: [x]
  - [x] Tela de listagem e gerenciamento de exercícios no app.
  - [x] Formulário de criação contendo título, descrição, e fluxo de upload de vídeo integrado (`expo-image-picker`).

## Lote 3: Engajamento (Push & Relatórios) [CONCLUÍDO ✅]
- **Notificações Push**: [x]
  - [x] Registrar Expo Push Token na base de usuários atrelado ao Auth State.
  - [x] Criação de UI de Notificações in-app (Sininho) com Deep Linking.
- **Relatórios Avançados**: [x]
  - [x] Rota `/api/reports/chart` gerando gráficos hiper-otimizados no Cloudflare.
  - [x] App consumindo gráficos server-rendered sem afetar performance.

## Lote 4: Comunicação e UX Avançada [CONCLUÍDO ✅]
- **Chat/Mensagens**: [x]
  - [x] Cloudflare Durable Objects configurados para manter WebSockets.
  - [x] UI de chat no app com persistência local e auto-reconnect.
- **Agendamentos Recorrentes**: [x]
  - [x] Lógica de repetição na criação do agendamento conectada ao `/recurring-series`.
- **Assinatura Digital**: [x]
  - [x] Canvas para assinatura manuscrita (`react-native-signature-canvas`) e upload direto via R2.
  - Salvamento como imagem no R2.
