# Plano de Integração de IA no FisioFlow

## Visão geral
Este documento descreve como acrescentar capacidades de IA ao projeto FisioFlow, aproveitando o **Cloudflare AI Gateway** como camada de proxy/observabilidade, integrando o modelo **Gemma 4** (via Google AI), possibilitando o uso de **Ollama** para rodar modelos open‑source localmente ou em um serviço separado, e avaliando o potencial do **TurboQuant** para otimização de modelos. O objetivo é obter ganhos de observabilidade, controle de custos, flexibilidade de escolha de modelos e, opcionalmente, reduzir latência/uso de recursos por meio de quantização.

## Stack atual
- **Frontend**: Hospedado no Cloudflare Pages (React 19 + Vite).  
- **Backend**: Cloudflare Workers (Hono.js/TypeScript).  
- **Banco de dados**: Neon Postgres (serverless) + Drizzle ORM.  
- **Auth**: Neon Auth (JWKS).  
- **Storage**: Cloudflare R2.  
- **Conexão DB**: Cloudflare Hyperdrive (pooling).  
- **SDKs de IA já presentes**: `@ai-sdk/google`, `@ai-sdk/openai`, `@google/generative-ai` (indicam uso atual de Gemini ou similares).

Nenhuma chamada direta a serviços de IA foi encontrada no código; a camada de IA pode ser adicionada sem mudar a arquitetura existente.

## Oportunidades

### 1. Cloudflare AI Gateway
- **O que é**: Worker que atua como proxy para qualquer provedor de IA (OpenAI, Google, Anthropic, self‑hosted etc.).  
- **Benefícios**: logging de request/response, cache, rate‑limit, fallback automático, analytics de custo e uso, tudo na borda sem alterar o código da aplicação.  
- **Como aplicar**: criar um Worker (ex.: `ai-gateway`) que receba as chamadas do SDK, escolha o destino (Google AI ou Ollama) baseado no nome do modelo, e encaminhe a requisição adicionando headers de autenticação necessários. Todas as respostas passam pelo gateway antes de chegar ao cliente.

### 2. Gemma 4 (Google)
- Modelo de linguagem grande disponível via Google AI API (ou Vertex AI).  
- Pode ser chamado da mesma forma que o Gemini, trocando apenas o `model` no payload.  
- **Vantagem**: alternativa de custo/qualidade ao Gemini, permite experimentar diferentes trade‑offs.  
- **Integração**: adicionar a chave da Google AI como secret (`GOOGLE_AI_KEY`) e, no gateway, reconhecer modelos com prefixo `gemma-` (ex.: `gemma-4`) para encaminhar ao endpoint Google.

### 3. Ollama (modelos open‑source)
- Ollama fornece uma API compatível com OpenAI para rodar modelos como Gemma, Llama, Mistral etc. em container ou VM.  
- **Benefícios**: dados nunca saem da infraestrutura própria (boa para informações de saúde), custos previsíveis (pago apenas por compute), possibilidade de escolher qualquer modelo open‑source.  
- **Como aplicar**: subir um serviço Ollama (VM, container ou até mesmo um Worker se o modelo couber nos limites), definir secret `OLLAMA_BASE_URL` (e opcionalmente `OLLAMA_API_KEY`). No gateway, tratar modelos com prefixo `ollama-` (ex.: `ollama-gemma-2b`) fazendo proxy para `OLLAMA_BASE_URL/v1/chat/completions`.

### 4. TurboQuant (Google)
- Biblioteca de quantização que reduz tamanho e latência de modelos mantendo a acurácia.  
- **Limitações no Workers**: hoje o Workers AI aceita apenas modelos pré‑quantizados publicados; não podemos subir modelos quantizados arbitrários diretamente.  
- **Possibilidade de uso**: gerar localmente um modelo Gemma quantizado com TurboQuant, hospedá‑lo em R2 e consumi‑lo por um Worker customizado (ONNX Runtime/TensorFlow.js) somente para features de baixo tráfego e alto valor (ex.: recomendação de exercícios).  
- **Prioridade**: experimental – considerar somente depois de validar o gateway e os modelos base.

## Plano de Implementação (por semanas)

| Semana | Objetivo | Atividades principais |
|--------|----------|-----------------------|
| **1** | **Criar o AI Gateway básico** | - Inicializar Worker `ai-gateway` (`wrangler init`). <br> - Adicionar secret `GOOGLE_AI_KEY`. <br> - Implementar roteamento: se o `model` começa com `gemma-` → encaminhar para `https://generativelanguage.googleapis.com/v1beta/models/<model>:generateContent`. <br> - Logging simples (request ID, timestamp, model, status code) inserido em tabela Neon `ai_usage`. <br> - Testar com uma chamada de exemplo (ex.: `/api/ai/test`). |
| **2** | **Integrar Ollama como segundo backend** | - Subir serviço Ollama (VM ou container) com modelo `gemma-2b` quantizado (4‑bit). <br> - Definir secrets `OLLAMA_BASE_URL` e, se necessário, `OLLAMA_API_KEY`. <br> - No gateway, acrescentar branch: se `model` começa com `ollama-` → remover prefixo e fazer proxy para `OLLAMA_BASE_URL/v1/chat/completions`. <br> - Validar trocas entre `gemma-4` (Google) e `ollama-gemma-2b` (Ollama) via endpoint de teste. |
| **3** | **Observabilidade e controle de custos** | - Enriquecer logging: latência, tamanho de request/response, orgId/userId (se disponível no contexto). <br> - Criar view ou dashboard simples (ex.: usando Grafana ligado ao Neon) para consumo diário por modelo e por clínica. <br> - Implementar cache no gateway (TTL configurável via metadata) para prompts determinísticos (ex.: sugestões de exercícios). <br> - Definir políticas de rate‑limit por organização (ex.: 1000 req/dia). |
| **4** | **Feature de alto valor: resumo de evolução SOAP** | - Quando uma sessão é fechada (`POST /api/sessions/:id/close`), disparar uma fila (Queue) que chama o gateway com prompt: “Resuma a evolução SOAP abaixo em 2‑3 frases para o paciente: …”. <br> - Salvar o texto retornado em nova tabela `session_summaries`. <br> - Enviar notificação via WhatsApp (usando Twilio ou similar) com o resumo. <br> - Validar latência (<2 s) e qualidade com usuários internos. |
| **5** (opcional) | **Experimentar TurboQuant** | - Baixar modelo Gemma 2B, aplicar TurboQuant (int4 ou int8). <br> - Converter para ONNX e testar inferência num Worker simples (verificar tamanho < 10 MB e latency aceitável). <br> - Se resultados promissores, considerar migrar o Ollama para esse modelo quantizado dentro do próprio Worker ou de um Durable Object. <br> - Documentar trade‑offs (acurácia vs. tamanho vs. cold‑start). |

### Notas de integração com SDK
- Continuar usando `@ai-sdk/google` (ou `@ai-sdk/openai`) mas alterar o `baseURL` para apontar ao gateway:  
  ```ts
  import { GoogleAI } from '@ai-sdk/google';
  const model = GoogleAI({
    baseURL: 'https://ai-gateway.fisioflow.workers.dev', // gateway
    apiKey: process.env.GOOGLE_AI_KEY, // opcional, o gateway já tem a chave
  });
  ```
- Para usar Ollama basta trocar o nome do modelo na chamada, por exemplo:  
  ```ts
  const result = await generateText({
    model: google('ollama-gemma-2b'), // o gateway reconhece o prefixo
    prompt: 'Liste três alongamentos para lombalgia aguda',
  });
  ```

## Riscos e Mitigações

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| **Custo inesperado de chamadas ao Google AI** | Gastos elevados se uso disparar. | - Alertas de budget no Google Cloud e Cloudflare (notifications quando ultrapassar threshold). <br> - Cache no gateway para prompts repetitivos. <br> - Fallback para Ollama quando custo por token ultrapassar limite definido. |
| **Latência adicionada pelo proxy** | Atraso percebível em chats interativos. | - Medir overhead (geralmente 10‑30 ms). <br> - Habilitar cache no gateway para respostas estáticas. <br> - Manter conexões keep‑alive e usar HTTP/2. |
| **Disponibilidade do serviço Ollama** | Falha do backend de modelos open‑source. | - Deploy Ollama detrás de um balanceador ou usar política de restart automático (Docker/K8s). <br> - No gateway, detectar 5xx e tentar fallback para Google AI. |
| **Tamanho do modelo quantizado para Workers** | Não conseguir rodar o modelo dentro dos limites do Worker. | - Iniciar com Ollama em VM/container; somente avançar para Worker se o modelo couber (< 10 MB) após quantização agressiva. <br> - Caso não seja viável, manter a abordagem de serviço separado. |
| **Segurança de dados de saúde** | Exposição acidental de PHI. | - Garantir que o Ollama rode em ambiente isolado e que nenhum dado saia da VPC/zone. <br> - Usar mTLS ou Cloudflare Access para proteger o endpoint Ollama. <br> - Nunca enviar PHI diretamente para modelos públicos sem consentimento e anonimização. |

## Conclusão
Integrar o **Cloudflare AI Gateway** ao FisioFlow oferece uma camada unificada de observabilidade, controle de custos e flexibilidade para trocar entre modelos proprietários (Gemini/Gemma 4) e modelos open‑source rodados via **Ollama**. Essa abordagem requer poucas mudanças no código existente (apenas alterar o `baseURL` do SDK) e pode ser entregue em aproximadamente quatro semanas, com um opcional quinto semana para experimentar **TurboQuant** caso a equipe deseje explorar inferência self‑hosted de baixo latency. Com esse plano, o FisioFlow ganha capacidade de gerar resumos clínicos, recomendações de exercícios e outros recursos de IA de forma segura, auditável e escalável, mantendo o foco na privacidade dos dados de saúde e na previsibilidade de custos. 

--- 
*Fim do documento.* Salve este conteúdo como, por exemplo, `PLANO_INTEGRACAO_IA_FISIOFLOW.md` no diretório raiz do repositório.