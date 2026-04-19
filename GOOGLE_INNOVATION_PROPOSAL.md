# Fisioflow: Inovações Google e Modernização Tecnológica

Este documento detalha propostas de inovação tecnológica para o Fisioflow, aproveitando as ferramentas mais recentes do ecossistema Google (Labs, AI e Cloud), projetadas especificamente para a nossa arquitetura atual: **Cloudflare Workers (Hono), React/Expo e Neon DB (PostgreSQL)**.

Não utilizaremos Firebase ou Supabase em nenhuma dessas propostas.

---

## 1. Visão Computacional para Fisioterapia (Google MediaPipe / AI Edge)

O **MediaPipe Pose Landmarker** é uma tecnologia de ponta do Google que permite rastrear o corpo humano em tempo real usando apenas a câmera de um celular ou computador. Ele identifica 33 pontos articulares em 3D.

### Casos de Uso no Fisioflow:
*   **Avaliação de Amplitude de Movimento (ADM) Automática:** O paciente faz um movimento na frente da câmera (ex: abdução de ombro). O MediaPipe calcula automaticamente os ângulos de cada articulação e envia os dados estruturados para o backend.
*   **Correção de Postura em Tempo Real:** Durante a execução de um exercício em casa (pelo App do Paciente em React Native/Expo), o sistema pode avisar se a coluna está torta ou se o joelho está passando da linha do pé.

### Como Implementar (Arquitetura):
*   **Frontend (React/Expo):** O processamento pesado de visão computacional deve rodar **100% no cliente (browser ou app móvel)** usando `@mediapipe/tasks-vision` em WebAssembly. Isso garante que não haja custos de servidor para processamento de vídeo e que a latência seja zero.
*   **Comunicação:** O frontend extrai as coordenadas vitais (ângulos e `(x,y,z)` de juntas específicas) e envia apenas o JSON final (leves bytes) para a API no Cloudflare Workers.
*   **Backend (Hono/Cloudflare) e Neon DB:** A API recebe o relatório de execução do exercício e o salva no Neon DB, atualizando o progresso e o _adherence score_ (taxa de adesão) do paciente.

### Exemplo de Inicialização no Frontend (Web):

```javascript
import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";

// Inicializa a IA no navegador
const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm"
);

const poseLandmarker = await PoseLandmarker.createFromModelPath(vision,
    "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task"
);

// Processando um frame de vídeo/câmera
// results.poseLandmarks conterá Arrays de objetos com { x, y, z, visibility } para cada junta.
const results = poseLandmarker.detectForVideo(videoElement, performance.now());
```

---

## 2. Inteligência Artificial Generativa (Google Gemini API)

O modelo Gemini do Google (especialmente `gemini-1.5-flash` para velocidade ou `gemini-1.5-pro` para raciocínio complexo) oferece capacidades multimodais incríveis com um custo-benefício excelente.

### Casos de Uso no Fisioflow:
*   **Geração de Resumos de Prontuários (Evolução SOAP):** O fisioterapeuta pode ditar (áudio) ou digitar tópicos soltos sobre a sessão. O Gemini transforma isso em uma evolução SOAP estruturada e profissional.
*   **Sugestão de Protocolos de Tratamento:** Com base nos sintomas relatados, diagnósticos passados e o CID, o Gemini pode sugerir uma lista de exercícios do banco de dados do Fisioflow, que o profissional revisa antes de prescrever.
*   **Análise de Sentimento/Feedback:** Analisar mensagens dos pacientes no app para detectar alertas como "estou sentindo muita dor após o exercício X", notificando o profissional imediatamente.

### Como Implementar (Arquitetura):
*   **Backend (Cloudflare Workers - Hono):** A SDK `@google/generative-ai` pode ser executada perfeitamente no ambiente edge do Cloudflare.
*   **Integração Nativa Cloudflare:** Como já utilizamos Cloudflare Workers AI, podemos usar o **Cloudflare AI Gateway** para atuar como um proxy reverso para a API do Gemini. Isso nos dá logs, rate-limiting e cache nativos, sem mexer no código da aplicação cliente.

### Exemplo de Backend (Hono) Gerando um Resumo SOAP:

```javascript
import { Hono } from 'hono';
import { GoogleGenerativeAI } from '@google/generative-ai';

const app = new Hono();

app.post('/api/ai/generate-soap', async (c) => {
  const { notes } = await c.req.json();
  const apiKey = c.env.GEMINI_API_KEY; // Secret do Cloudflare

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    systemInstruction: "Você é um assistente de fisioterapia. Receba notas soltas e formate em uma evolução SOAP (Subjetivo, Objetivo, Avaliação, Plano) profissional."
  });

  const result = await model.generateContent(notes);
  const text = result.response.text();

  return c.json({ soap_text: text });
});

export default app;
```

---

## 3. Benefícios Imediatos para a Arquitetura Atual

Como não utilizamos Firebase nem Supabase, não há dependência de Vendor Lock-in (amarras de provedores) para features específicas.

1.  **Neon DB:** É o repositório perfeito para dados relacionais densos. Podemos armazenar métricas do MediaPipe (ex: `flexao_joelho_maxima: 110.5`) junto com o perfil do paciente usando colunas `JSONB` no PostgreSQL, facilitando buscas como "encontre pacientes com evolução de flexão abaixo de 10% no último mês".
2.  **Edge Computing (Cloudflare):** Processar prompts de IA com a API do Gemini rodando nas bordas (Edge) e retornar a resposta rápida garante uma UX fluida no App e na Web, sem precisar subir servidores Node.js pesados.

---

## Próximos Passos Sugeridos

1.  Criar uma Prova de Conceito (PoC) simples em React rodando o MediaPipe e extraindo um ângulo do corpo (ex: ângulo do cotovelo ao levantar o braço).
2.  Criar uma rota no backend (Hono) integrando o `@google/generative-ai` para formatar notas em relatórios.
