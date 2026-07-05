# AI Search e AutoRAG (Base de Conhecimento Não Sensível)

## Objetivo
Criar uma Base de Conhecimento ("Knowledge Base") utilizando **Cloudflare Vectorize** acoplado ao **Workers AI (Embeddings)** para indexar exclusivamente conteúdos de domínio geral, protocolos clínicos da clínica (sem dados de pacientes), bibliotecas de exercícios e cartilhas educacionais.

## Arquitetura de Dados

Os vetores e metadados ficam hospedados no `Vectorize`. Os textos longos completos ficam no `D1` ou `R2`, relacionados através do `document_id`.

**Conteúdos Elegíveis:**
- `wiki_pages`: Páginas de wiki da clínica (regras, fluxos).
- `protocols`: Protocolos padronizados de tratamento.
- `exercise_protocols`: Fichas de treinamento geral.
- `exercises`: Descrições biomecânicas.
- `articles`: Artigos científicos curados.

**O que NUNCA é indexado aqui:**
- Evoluções clínicas, históricos de mensagens, anamneses.
- Nada que contenha o ID do paciente.
- A flag `isSensitive: true` aciona um guardrail que recusa o insert no Vectorize lançando um erro de segurança.

## Filtros de Metadados (`Metadata Filtering`)

Ao buscar no Vectorize, os filtros garantem isolamento:
1. **`organizationId`**: Isola o conhecimento próprio da clínica X em relação à clínica Y (caso a plataforma evolua para Multi-Tenant SaaS ou franquias).
2. **`patientVisible`**: Se o requisitante for um paciente (via Patient App), a flag `patientVisible = true` é injetada na query, bloqueando acesso a protocolos internos de gestão da clínica.
3. **`contentType`**: Permite buscas específicas (ex: "Buscar apenas em Exercícios").

## Ciclo de Vida e Sincronização

A Rota Admin `POST /api/ai/knowledge/sync` é utilizada sempre que um protocolo ou wiki é atualizado/criado.
A Rota `DELETE /api/ai/knowledge/:id` remove o vetor instantaneamente da base.

## Geração de Resposta e Citação (AutoRAG)
Quando o `POST /api/ai/knowledge/search` é chamado:
1. Faz busca no Vectorize.
2. Injeta os documentos como contexto em um prompt que força citação.
3. Envia para o `AIRouter` usando tipo de task `rag_answer` (o que garante rastreio de custo e log).
4. Retorna a resposta junto com o array de `sources` baseados nas fontes recuperadas, para credibilidade.
