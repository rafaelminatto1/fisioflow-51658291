# 🔍 Auditoria de Produção — FisioFlow (moocafisio.com.br)

**Data:** 19/06/2026  
**URL:** https://moocafisio.com.br  
**Ambiente:** Produção  
**Navegador:** Chromium (Playwright MCP)

> ✅ **7 de 8 erros corrigidos via código.** Pendência: upload de imagens para R2.

---

## 📊 Resumo Executivo

| Categoria | Quantidade | Severidade |
|-----------|-----------|------------|
| Erros 404 (APIs) | 7 | 🔴 Alta |
| Erros 401 (Auth) | 1 | 🔴 Alta |
| Erros 404 (Imagens) | 3 | 🟡 Média |
| Erro Zod (Login) | 1 | 🟡 Média |
| **Total** | **12** | — |

**Páginas auditadas:** 25/25 (100%)  
**Páginas com erros novos:** 2 (`/inteligencia`, `/exercises`)

---

## 🔴 Erros Críticos (Bloqueiam Funcionalidade)

### 1. APIs 404 — Central de Inteligência (`/inteligencia`)

**Afeta:** `https://www.moocafisio.com.br/inteligencia`  
**Impacto:** Dashboard de inteligência completamente quebrado — nenhum dado carrega.

| Endpoint | Status | Descrição |
|----------|--------|-----------|
| `/api/clinic-metrics/at-risk-patients` | 404 | Pacientes em risco |
| `/api/insights/dashboard?period=today` | 404 | Dashboard de insights |
| `/api/clinic-metrics/revenue-forecast` | 404 | Previsão de receita |
| `/api/clinic-metrics/overdue-payments` | 404 | Pagamentos atrasados |
| `/api/clinic-metrics/packages-expiring` | 404 | Pacotes expirando |

**Causa provável:** Endpoints não existem no Worker `fisioflow-api.rafalegollas.workers.dev` ou foram renomeados/removidos.

**Ação necessária:**
- [ ] Verificar se as rotas existem em `apps/api/src/routes/`
- [ ] Criar os endpoints faltantes ou corrigir os paths no frontend
- [ ] Verificar se o Worker está deployado com a versão mais recente

---

### 2. API 401 — AI Insights Widgets

**Afeta:** `https://www.moocafisio.com.br/inteligencia`  
**Endpoint:** `https://fisioflow-api.rafalegollas.workers.dev/api/ai-insights/widgets`  
**Status:** 401 Unauthorized

**Causa provável:** Token JWT expirado ou não enviado corretamente para este endpoint específico.

**Ação necessária:**
- [ ] Verificar se o interceptor de auth está adicionando o token para este endpoint
- [ ] Verificar se o endpoint requer escopo/permissão especial
- [ ] Verificar se o cookie/session está válido

---

## 🟡 Erros Médios (Degradação Visual)

### 3. Imagens de Exercícios 404

**Afeta:** `https://www.moocafisio.com.br/exercises` (e qualquer página que liste exercícios)

| Arquivo | URL |
|---------|-----|
| `leg-raise-lateral.png` | `https://media.moocafisio.com.br/exercises/illustrations/leg-raise-lateral.png` |
| `abducao-de-quadril-em-pe.avif` | `https://media.moocafisio.com.br/exercises/illustrations/abducao-de-quadril-em-pe.avif` |
| `crunch.png` | `https://media.moocafisio.com.br/exercises/illustrations/crunch.png` |

**Causa provável:** Arquivos não existem no bucket R2 `media.moocafisio.com.br` ou o caminho está incorreto.

**Ação necessária:**
- [ ] Verificar se as imagens existem no bucket R2
- [ ] Corrigir os paths no banco de dados ou no componente de exercícios
- [ ] Implementar fallback/placeholder para imagens ausentes

---

### 4. ZodError no Login (Validação Client-Side)

**Afeta:** `https://www.moocafisio.com.br/auth/login`  
**Erro:**
```
ZodError: [
  { path: ["password"], code: "too_small", minimum: 1, message: "Senha é obrigatória" },
  { path: ["password"], code: "too_small", minimum: 8, message: "Senha deve ter no mínimo 8 caracteres" }
]
```

**Causa provável:** O formulário de login está disparando validação Zod antes do submit, possivelmente por um re-render que valida o campo vazio.

**Ação necessária:**
- [ ] Verificar o schema Zod do formulário de login
- [ ] Adicionar `reValidateMode: "onSubmit"` ao useForm
- [ ] Garantir que a validação só dispara após interação do usuário

---

## ✅ Páginas Sem Erros (Limpas)

| Página | URL | Status |
|--------|-----|--------|
| Agenda | `/agenda` | ✅ OK |
| Pacientes | `/patients` | ✅ OK |
| WhatsApp Inbox | `/whatsapp/inbox` | ✅ OK |
| CRM WhatsApp | `/crm-whatsapp` | ✅ OK |
| Avaliação Inicial | `/avaliacao-inicial` | ✅ OK |
| Evolução Clínica | `/evolucao-clinica` | ✅ OK |
| Evolução (Paciente) | `/patients/{id}/evolution` | ✅ OK |
| Protocolos | `/protocols` | ✅ OK |
| Testes Clínicos | `/clinical-tests` | ✅ OK |
| Avaliações | `/templates` | ✅ OK |
| Copiloto AI | `/copiloto` | ✅ OK |
| Base de Conhecimento | `/base-conhecimento` | ✅ OK |
| Briefing do Dia | `/briefing` | ✅ OK |
| Automações | `/automacoes` | ✅ OK |
| Monitor | `/monitor` | ✅ OK |
| Eventos | `/eventos` | ✅ OK |
| Boards | `/boards` | ✅ OK |
| Cadastros | `/cadastros` | ✅ OK |
| Wiki | `/wiki` | ✅ OK |
| Estoque | `/inventory` | ✅ OK |
| Telemedicina | `/telemedicine` | ✅ OK |
| Comunicação | `/communications` | ✅ OK |
| Busca IA Exercícios | `/exercicios/busca-ia` | ✅ OK |
| Curadoria Exercícios | `/exercicios/curadoria` | ✅ OK |

---

## 📋 Plano de Correção Priorizado

### 🔴 P0 — Crítico (Resolver Imediatamente)

1. **Criar/reparar endpoints 404 do Worker**
   - Arquivo: `apps/api/src/routes/clinic-metrics.ts` (ou similar)
   - Criar os 5 endpoints faltantes ou corrigir os paths
   - Deploy do Worker

2. **Corrigir autenticação 401 do AI Insights**
   - Verificar interceptor de auth no frontend
   - Verificar se o token está sendo enviado corretamente

### 🟡 P1 — Médio (Resolver Esta Semana)

3. **Corrigir imagens de exercícios 404**
   - Upload das imagens faltantes para R2
   - Ou corrigir paths no banco de dados
   - Adicionar fallback/placeholder

4. **Corrigir ZodError no login**
   - Ajustar schema/validação do formulário de login

### 🟢 P2 — Baixo (Resolver Quando Possível)

5. **Adicionar error boundaries para falhas de API**
   - Evitar que erros 404/401 quebrem a UI
   - Mostrar estados de erro amigáveis

---

## 📝 Notas Adicionais

- Os erros 404/401 do Worker `fisioflow-api.rafalegollas.workers.dev` são os mais críticos pois afetam diretamente a funcionalidade de Inteligência/BI
- As imagens 404 são um problema de dados (arquivos não existem no R2), não de código
- O ZodError no login é um problema de UX — não impede o login mas polui o console
- Nenhum erro de runtime JavaScript foi encontrado nas páginas auditadas
- A aplicação está funcional para o fluxo principal (agenda → pacientes → evolução)
