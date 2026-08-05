# Prompt para Claude Code — Melhorias Frontend, Backend, Indicadores e RAG no FisioFlow/MoocaFisio

Você está trabalhando dentro do repositório FisioFlow/MoocaFisio.

Atue como arquiteto sênior full-stack, especialista em produto SaaS de saúde/fisioterapia, UX clínica, dados estruturados, RAG, busca semântica, analytics e sistemas com React/Cloudflare Workers/Neon/Postgres.

## Contexto do projeto

Estamos desenvolvendo o FisioFlow/MoocaFisio, um sistema para clínica de fisioterapia.

Stack principal:

- Frontend: React 19 + Vite + Tailwind v4 + Shadcn/Radix
- Backend: Cloudflare Workers + Hono
- Banco: Neon Postgres 17 + Drizzle ORM
- Auth: Neon Auth/JWT
- Infra: Cloudflare + Neon
- UI: português brasileiro
- Estilo visual: clínico, limpo, superfícies sólidas; evitar glassmorphism, transparências e `backdrop-blur`

Dados já migrados do ZenFisio:

- pacientes
- avaliações completas
- evoluções clínicas/sessões
- observações clínicas
- procedimentos
- dados brutos preservados
- avaliações estruturadas
- histórico do paciente
- escalas de dor
- sessões com datas, fisioterapeutas, condutas e anotações

Há dados clínicos importados preservados em campos brutos e também dados estruturados/parcialmente normalizados. Queremos melhorar a experiência do produto usando esses dados com segurança clínica.

## Objetivo geral

Faça um brainstorming técnico e de produto, bem completo, sobre como podemos melhorar:

- frontend
- backend
- arquitetura de dados
- indicadores clínicos e operacionais
- RAG
- embeddings
- busca semântica
- Cloudflare Vectorize
- Workers AI
- integração entre páginas

Queremos transformar os dados clínicos migrados e os dados novos do sistema em uma experiência inteligente, útil para fisioterapeutas, gestores e recepção, sem criar uma interface poluída.

O foco deve ser em insights acionáveis, não dashboards genéricos.

## Áreas/páginas para analisar

Analise principalmente:

1. Página de Perfil do Paciente
2. Página de Evolução Clínica
3. Página de Avaliação Inicial/Avaliações
4. Página de Agenda
5. Página de Pacientes/Listagem
6. Página de Protocolos
7. Página de CRM/WhatsApp
8. Página de Indicadores/Gestão, caso faça sentido criar ou expandir
9. Backend/API
10. Banco de dados/Postgres/Drizzle
11. RAG, embeddings, busca semântica e Cloudflare Vectorize/Workers AI

## 1. Melhorias de frontend/UX

Para cada página, sugira:

- quais dados deveriam aparecer
- como apresentar os dados visualmente
- quais cards, badges, timelines, alertas ou gráficos fazem sentido
- quais informações devem ficar em destaque
- quais informações devem ficar recolhidas/expandidas
- como evitar excesso de informação
- como melhorar o fluxo de trabalho do fisioterapeuta
- como reduzir cliques
- como mostrar histórico clínico de forma longitudinal
- como comparar avaliação inicial vs evolução atual
- como destacar riscos, pendências e próximos passos

Explore ideias como:

- resumo clínico inteligente no topo do perfil
- timeline longitudinal do paciente
- cards de “última sessão”, “próxima sessão”, “dor atual”, “aderência”, “objetivos”
- evolução de dor por gráfico
- evolução funcional por região corporal
- alertas de piora, ausência, baixa aderência ou risco de abandono
- comparação entre avaliações
- visão “antes/depois”
- painel de condutas mais usadas
- sugestões de próximos testes/avaliações
- visão para recepção vs visão para fisioterapeuta vs visão para gestor

## 2. Indicadores clínicos e operacionais

Crie um inventário amplo de indicadores possíveis, separados por categoria.

### Indicadores clínicos

Inclua, por exemplo:

- evolução da dor por paciente
- melhora funcional
- regiões corporais mais tratadas
- diagnósticos/queixas mais comuns
- tempo médio até melhora
- número de sessões até alta
- resposta por protocolo
- pacientes com piora
- pacientes sem evolução documentada
- avaliações incompletas
- pacientes sem reavaliação há X dias
- escala de dor inicial vs atual
- frequência de sintomas
- padrões de recidiva

### Indicadores operacionais

Inclua, por exemplo:

- faltas/cancelamentos
- taxa de comparecimento
- agenda ociosa
- frequência por paciente
- pacientes inativos
- pacientes em risco de abandono
- tempo médio entre sessões
- pacientes sem retorno marcado
- carga por fisioterapeuta
- produtividade por sala/profissional
- evolução por convênio/plano
- funil de captação/conversão

### Indicadores de qualidade de prontuário

Inclua, por exemplo:

- sessões sem observação clínica
- avaliações sem hipótese diagnóstica
- campos estruturados faltantes
- notas muito curtas
- ausência de escala de dor
- ausência de objetivo terapêutico
- falta de conduta/plano
- prontuários com dados brutos importados mas ainda não normalizados

### Indicadores de gestão

Inclua, por exemplo:

- pacientes ativos por período
- retenção
- churn
- lifetime clínico
- ticket/receita, se houver dados
- comparação por profissional
- comparação por tipo de tratamento
- demanda por região corporal
- sazonalidade

Para cada indicador, diga:

- de onde vêm os dados
- como calcular
- onde exibir no sistema
- se é útil para paciente, fisioterapeuta, recepção ou gestor
- prioridade P1/P2/P3
- complexidade técnica baixa/média/alta
- risco de interpretação clínica indevida

## 3. Integração dos indicadores nas páginas existentes

Sugira integrações específicas.

### Perfil do Paciente

Explique:

- quais indicadores individuais aparecem no cabeçalho
- quais aparecem em cards
- quais entram em timeline
- quais ficam na aba de avaliações
- quais ficam na aba financeira/agenda
- quais alertas aparecem automaticamente

### Evolução Clínica

Explique:

- como sugerir dados com base na última sessão
- como comparar a evolução atual com evolução anterior
- como mostrar escala de dor longitudinalmente
- como sugerir “últimos achados relevantes”
- como usar IA para rascunhar evolução sem inventar dados
- como alertar sobre falta de campos importantes

### Avaliação Inicial/Avaliações

Explique:

- como estruturar dados vindos do ZenFisio
- como converter texto livre em campos sem perder o original
- como mostrar avaliação bruta preservada vs avaliação normalizada
- como sugerir testes clínicos baseados na queixa
- como gerar resumo clínico seguro
- como comparar avaliações ao longo do tempo

### Agenda

Explique:

- como mostrar alertas de paciente antes do atendimento
- como indicar pacientes com pendências clínicas
- como mostrar “última dor registrada”
- como mostrar “sem evolução há X dias”
- como preparar o fisioterapeuta antes da sessão

### Listagem de Pacientes

Explique:

- filtros inteligentes
- pacientes em risco
- pacientes sem próxima sessão
- pacientes com avaliação incompleta
- pacientes com melhora/piora
- pacientes por diagnóstico/região corporal
- busca semântica

### CRM/WhatsApp

Explique:

- campanhas baseadas em inatividade
- follow-up pós-alta
- pacientes sem retorno
- pacientes com risco de abandono
- mensagens personalizadas com contexto clínico, sem exposição indevida de dados sensíveis

## 4. Backend e modelagem de dados

Analise como melhorar o backend/API para suportar esses recursos.

Sugira:

- novas tabelas necessárias
- novas views/materialized views
- campos derivados
- jobs de agregação
- endpoints novos
- endpoints existentes a expandir
- normalização dos dados importados
- separação entre dado bruto, dado estruturado e dado inferido por IA
- auditoria das inferências
- versionamento de resumos clínicos
- trilha de origem do dado
- cache
- políticas de atualização
- idempotência dos jobs
- performance em Neon/Postgres
- indexes
- RLS/multitenancy
- cuidados LGPD/privacidade

Proponha um modelo conceitual para:

- `patient_clinical_summary`
- `patient_risk_flags`
- `patient_indicators`
- `clinical_events`
- `body_region_mentions`
- `diagnosis_mentions`
- `treatment_goals`
- `outcome_measures`
- `ai_generated_summaries`
- `clinical_documents`
- `clinical_document_chunks`
- `clinical_embeddings`
- `source_documents`

Explique como manter o dado bruto original preservado e criar camadas derivadas confiáveis.

## 5. RAG, embeddings, Vectorize e IA

Crie um plano robusto para usar RAG no sistema.

Explique:

- quais documentos devem virar embeddings
- granularidade ideal dos chunks
- como chunkar avaliações, sessões, evolução, procedimentos e dados brutos
- metadados necessários por chunk
- como filtrar por paciente, organização, profissional, data, tipo de documento
- quando usar busca vetorial vs busca SQL tradicional
- como combinar full-text search Postgres + embeddings
- como evitar alucinação
- como citar fontes no resumo
- como mostrar “baseado em quais sessões/avaliações”
- como reconstruir contexto longitudinal do paciente
- como atualizar embeddings quando dados mudam
- como versionar embeddings
- como lidar com dados sensíveis
- como fazer RAG por paciente individual
- como fazer RAG populacional/agregado sem expor dados indevidos

Casos de uso de IA/RAG para explorar:

- “resuma o histórico clínico deste paciente”
- “quais foram os principais achados da avaliação?”
- “o paciente melhorou ou piorou?”
- “liste evolução da dor ao longo do tempo”
- “quais condutas foram usadas?”
- “qual foi a resposta ao tratamento?”
- “o que mudou desde a última avaliação?”
- “quais pacientes estão em risco de abandono?”
- “quais pacientes têm lombalgia recorrente?”
- “quais pacientes fizeram TENS?”
- “quais avaliações estão incompletas?”
- “sugira perguntas para próxima sessão”
- “sugira testes clínicos baseados na queixa”
- “gere um resumo para passagem de caso entre fisioterapeutas”
- “gere uma mensagem de follow-up segura para WhatsApp”

Inclua também:

- arquitetura com Cloudflare Workers AI
- Cloudflare Vectorize
- Neon Postgres
- possível uso de pgvector, se fizer sentido
- comparação entre Vectorize e pgvector
- estratégia híbrida
- custos/performance
- riscos
- limites éticos/clínicos
- guardrails

## 6. Melhorias específicas na página de Evolução Clínica

Dedique uma seção específica só para esta página.

Explore ideias como:

- painel lateral com resumo do paciente
- últimas 3 sessões
- dor inicial/atual
- objetivos ativos
- condutas recentes
- alertas
- botão “comparar com última sessão”
- botão “gerar rascunho baseado na sessão anterior”
- sugestões de campos faltantes
- gráfico embutido de dor/frequência
- timeline compacta
- chips de regiões corporais
- histórico de procedimentos
- anexos/exames
- sugestão de próxima conduta
- sem inventar informação clínica

Também sugira:

- componentes React
- estrutura de estado
- hooks
- endpoints
- validações
- testes

## 7. Melhorias específicas na página de Perfil do Paciente

Dedique uma seção específica.

Explore ideias como:

- header clínico resumido
- status do paciente
- risco de abandono
- próxima sessão
- última sessão
- dor atual
- objetivo terapêutico
- região principal
- timeline clínica
- avaliações
- sessões
- documentos
- dados importados do ZenFisio
- “resumo IA com fontes”
- comparação entre avaliação inicial e atual
- cards de indicadores individuais
- prontuário longitudinal
- modo compacto e modo completo

## 8. Melhorias específicas na página de Avaliação

Dedique uma seção específica.

Explore ideias como:

- formulário estruturado inteligente
- preservação do texto original
- extração assistida de campos
- campos sugeridos pela IA
- validação de completude
- testes clínicos sugeridos
- escalas funcionais sugeridas
- comparação com avaliações anteriores
- geração de plano terapêutico
- geração de objetivos SMART
- vínculo com protocolos
- vínculo com evolução clínica
- relatório para paciente/profissional

## 9. Plano de implementação por fases

Depois do brainstorming, organize tudo em um plano prático.

### Fase 1 — Quick wins sem IA pesada

Inclua:

- melhorias de UI
- queries SQL simples
- indicadores básicos
- cards e filtros
- endpoints simples

### Fase 2 — Dados estruturados e qualidade de prontuário

Inclua:

- normalização
- flags
- views
- materialized views
- jobs
- auditoria

### Fase 3 — RAG por paciente

Inclua:

- embeddings
- chunks
- busca semântica
- resumos com fontes
- timeline inteligente

### Fase 4 — IA operacional/gestão

Inclua:

- cohort analytics
- risco de abandono
- sugestões de follow-up
- insights populacionais

### Fase 5 — Assistente clínico seguro

Inclua:

- perguntas naturais
- suporte à decisão com guardrails
- sugestões com fontes
- não substituir julgamento clínico

Para cada fase, inclua:

- entregáveis
- arquivos/pastas prováveis no projeto
- endpoints
- tabelas/views
- componentes frontend
- riscos
- critérios de aceite
- testes necessários
- prioridade

## 10. Sugestões concretas de arquitetura

Inclua propostas para:

- API routes
- services
- repositories
- jobs
- schemas Drizzle
- migrations
- frontend components
- hooks
- stores/cache
- estratégia de invalidação
- permissões
- logs/auditoria
- fallback quando IA falhar

Exemplos de nomes possíveis:

- `apps/api/src/routes/patientInsights.ts`
- `apps/api/src/services/clinicalSummaryService.ts`
- `apps/api/src/services/ragService.ts`
- `apps/api/src/services/vectorizeService.ts`
- `apps/api/src/jobs/rebuildPatientIndicators.ts`
- `src/components/patient/PatientClinicalSummaryCard.tsx`
- `src/components/patient/PatientRiskFlags.tsx`
- `src/components/evolution/EvolutionContextPanel.tsx`
- `src/components/evaluation/EvaluationCompletenessPanel.tsx`

Não precisa usar exatamente esses nomes, mas quero sugestões nesse nível de concretude.

## 11. Restrições e cuidados obrigatórios

- UI em português brasileiro
- Sem glassmorphism
- Sem transparências/backdrop-blur
- Superfícies sólidas
- Visual clínico limpo
- Não inventar dados clínicos
- IA deve sempre citar fonte quando resumir
- Dados brutos importados devem ser preservados
- Diferenciar dado original, dado estruturado e dado inferido
- Toda inferência de IA deve ser auditável
- Cuidado com LGPD e dados sensíveis
- Priorizar utilidade clínica real
- Evitar dashboard decorativo
- Melhorar o fluxo de trabalho do fisioterapeuta
- Não substituir julgamento clínico profissional

## 12. Entrega esperada

Responda em português do Brasil com:

1. Visão geral estratégica
2. Brainstorming amplo de oportunidades
3. Sugestões por página
4. Indicadores recomendados
5. Arquitetura backend
6. Arquitetura frontend
7. Estratégia RAG/vectorize/embeddings
8. Plano por fases
9. Priorização P1/P2/P3
10. Riscos e cuidados
11. Quick wins que podemos implementar primeiro
12. Ideias mais ambiciosas para depois
13. Perguntas que você faria antes de implementar
14. Lista de arquivos prováveis a alterar/criar

Não seja genérico. Quero uma resposta prática, densa, com muitos insights e exemplos concretos para o FisioFlow/MoocaFisio.

Use os dados e contexto clínico do sistema como base. Pense como produto, engenharia, UX e dados ao mesmo tempo.

## 13. Antes de responder

Antes de propor arquitetura, inspecione o repositório:

- leia `CLAUDE.md`
- leia `package.json`
- localize rotas da API em `apps/api/src`
- localize schemas/migrations Drizzle
- localize páginas React em `src/pages`
- localize componentes de paciente/evolução/avaliação em `src/components`
- identifique padrões existentes de API, hooks, componentes e estilos

Depois disso, faça a análise considerando o código real, não apenas uma proposta abstrata.
