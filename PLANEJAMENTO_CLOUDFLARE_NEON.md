# 🚀 Planejamento Estratégico: FisioFlow + Cloudflare + Neon DB

Este documento consolida a análise da arquitetura atual do FisioFlow (para a escala de 10 funcionários e 30 pacientes no app mobile) e traça um plano de otimização de lógica e expansão do ecossistema Cloudflare, aproveitando o plano **Workers Paid**.

## 1. Melhorias de Lógica e Performance (Código Atual)

### 1.1 O Gargalo de Listagem de Pacientes (O Efeito N+1)
**Problema:** Atualmente, a rota `GET /api/patients` retorna até 200 pacientes carregando um payload "gordo" com endereços JSON e arrays complexos. Pior ainda, o frontend (via `usePatientStats.ts`) orquestra chamadas N+1, buscando *appointments* (agendamentos) e *soapRecords* (evoluções) de forma individual para calcular estatísticas localmente no navegador. Em um banco Serverless TCP (Neon), isso destrói conexões (Connection Pool Bloat).
**Solução (Summary Pattern + CTE):**
A lógica de estatísticas no Frontend deve ser descontinuada para listas. O Backend (`patients.ts`) já tem um esboço com `WITH appointment_agg AS (...)` (Common Table Expressions - CTE) que deve se tornar a fonte oficial. Deve-se criar um `usePatientsSummary` e uma rota `/api/patients/summary` que devolve apenas: `{ id, nome, stats: { próximas_consultas, status_financeiro } }`.

### 1.2 Otimização do Neon Serverless e Drizzle ORM
**Problema:** No arquivo `db.ts`, o sistema oscila entre o modo nativo HTTP do Neon ( `neon()`) e um *Pool TCP local*. Apesar da intenção, criar Pools TCP localmente dentro de um Worker da Cloudflare é perigoso devido ao ciclo de vida volátil das funções (Cold Starts).
**Solução:** Substituir completamente as tentativas locais de *Pooling* usando exclusivamente o **Cloudflare Hyperdrive** configurado no `wrangler.toml` (`HYPERDRIVE = "12b9fefcfbc04074a63342a9212e1b4f"`). O Hyperdrive fará o papel do *PgBouncer*, segurando as conexões TCP de forma durável na ponta (Edge) e repassando para o Neon apenas quando necessário.

---

## 2. Inovações com o Ecossistema Cloudflare

Com o limite do plano pago, podemos ativar _features_ vitais sem comprometer o fluxo de caixa:

### 2.1 Cloudflare One (Zero Trust Access)
**O que é:** Um gateway de segurança invisível.
**Ação:** Proteger a rota `/api/admin` ou o subdomínio administrativo da clínica. Ao invés de lidar com lógicas manuais complexas de RBAC (Role Based Access Control) só para impedir acessos, o Cloudflare Access força que os **10 funcionários** loguem com um PIN enviado ao e-mail deles ou via conta Google da Clínica antes da requisição chegar no FisioFlow.
**Custo:** Totalmente **Gratuito** para até 50 usuários.

### 2.2 Workers AI: Transcrição e Sumarização Clínica (Prontuários SOAP)
**O que é:** Execução de Modelos de IA globais no Edge, sem latência OpenAI.
**Ação:**
- **Sumarização (Para o Paciente):** Após o Fisioterapeuta escrever um SOAP técnico, chamaremos o Llama 3 (`@cf/meta/llama-3-8b-instruct`) na Cloudflare para traduzir o jargão médico ("Epicondilite Lateral com restrição de ADM") para algo que o app do paciente mostre ("Inflamação no cotovelo com limite de movimento").
- **Transcrição de Voz (Para o Fisioterapeuta):** O app mobile grava 1 minuto da voz do Fisio. Um endpoint no Hono usa o `@cf/openai/whisper` que retorna o texto puro.
**Custo:** O plano Paid oferece **10.000 Neurons/dia**. Para o fluxo de 10 funcionários e 30 pacientes, isso virtualmente é **R$ 0,00 de adicional**, já coberto pela mensalidade base do Paid.

### 2.3 Cloudflare AI Search (Busca Semântica no Prontuário)
**O que é:** Uma solução _turn-key_ para busca RAG.
**Ação:** Substituir ou melhorar o arquivo `aiSearch.ts`. A Cloudflare sincronizará (via D1 + Vectorize) as evoluções clínicas. Quando o profissional de fisioterapia buscar "pacientes que fizeram liberação miofascial e sentiram dores no dia seguinte", o AI search entenderá o *contexto*, e não apenas a palavra exata, retornando o histórico dos pacientes que se alinham a essa situação.
**Custo:** Utiliza a cota do plano Paid para os recursos Vectorize e D1. Para 30 pacientes, os índices serão minúsculos. O custo será insignificante.

### 2.4 Cloudflare Images (Transformações na Borda)
**O que é:** Otimização on-the-fly sem SDKs complexos.
**Ação:** Atualmente existe a variável `IMAGE_TRANSFORMATIONS = "enabled"` usando o R2. O App mobile (paciente) pode ter conexões 3G/4G fracas. Configurar o Edge da Cloudflare para entregar os exames ou avatares em `.avif` de forma automatizada, cortando em até 60% a banda gasta do paciente.

---

## 3. Plano de Implementação (Roadmap)

1. **Sprint 1 (Performance e Fix do Neon DB):**
   - Refatorar o `db.ts` para assumir o Driver `pg` puro injetando a URI do Cloudflare Hyperdrive.
   - Refatorar o `usePatientStats.ts` e a API `/patients` para um padrão de `Summary` usando as funções CTE (`appointment_agg`) já esboçadas no código Drizzle do backend.

2. **Sprint 2 (Segurança):**
   - Configurar via Painel da Cloudflare a política *Access* para o painel de retaguarda, listando os e-mails dos 10 funcionários.

3. **Sprint 3 (IA Mão-na-Massa):**
   - Habilitar e testar `env.AI.run("@cf/openai/whisper")` no Hono.
   - Criar interface simples no front para "Gravar Evolução em Áudio".
