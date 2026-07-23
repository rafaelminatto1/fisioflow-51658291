# Observações de Runtime (Fase 3 — navegador)

> Sessão de observação **somente leitura** em produção (`moocafisio.com.br`), 2026-07-13, autenticado como **admin** (org MOOCA FISIO). Nenhum formulário foi salvo e nenhum botão destrutivo foi clicado. Foi aberto somente o prontuário pertencente ao próprio usuário para mapear sua estrutura; dados pessoais observados NÃO foram capturados nem reproduzidos (screenshots com PII não salvos em disco).

## Confirmações (elevam confiança código → runtime)

| ID | Observação | Confirma |
|---|---|---|
| RUN-001 | Login em `moocafisio.com.br/auth/login` → redireciona para `/agenda`; toast "Login realizado com sucesso"; usuário logado como perfil **ADMIN** | Auth Neon Auth + roteamento vivo `src/` (SRC-001) |
| RUN-002 | `/agenda` renderiza **FullCalendar** (visões Dia/Semana/Mês, "REAL-TIME ACTIVE", agendamentos reais nas colunas) com botões Pacotes, Fila de Espera, Agendar, Filtros, Configurações da agenda (`/agenda/settings`) | Agenda = FullCalendar; recursos de pacotes/fila/settings |
| RUN-003 | **Host da API em produção = `https://fisioflow-api.rafalegollas.workers.dev`** (subdomínio workers.dev), NÃO o custom domain `api-pro.moocafisio.com.br` declarado no wrangler | ⚠️ Divergência nova — ver abaixo |
| RUN-004 | `/patients` mostra **"986 pacientes encontrados"** — bate exatamente com `count(*)` do banco (DB-003) | Volumetria e leitura via API |
| RUN-005 | Chamadas reais observadas: `GET /api/appointments?dateFrom&dateTo&limit=500` (200), `GET /api/exercises?limit=500` (200), `GET /api/patients?status=ativo&limit=500&minimal=true` (200) | Contratos de endpoints (query params reais) |
| RUN-006 | `/financial` carrega para admin com 8 abas: Resumo, Cobrança, Fluxo de Caixa, Faturamento, Documentos, Performance, Inteligência Clínica, Comissões; todos os valores **R$ 0,00** | Financeiro implementado mas pouco usado (transactions=2 no banco) |
| RUN-007 | Menu do admin (grupos): **Atendimento** (Agenda, Pacientes, CRM·WhatsApp[badge 4]), **Clínica** (Avaliação Inicial, Evolução Clínica, Exercícios, Protocolos, Testes Clínicos, Avaliações, Biomecânica▸), **Inteligência & IA** (Central de Inteligência, Copiloto Clínico, Base de Conhecimento — todos AI), **Gestão & Operação** (Rotina Diária▸, Gestão da Clínica▸, Financeiro▸), **Configurações** (Configurações▸, Painel Admin▸) | Estrutura de navegação e RBAC do admin |
| RUN-008 | Slugs internos em inglês (`/patients`, `/exercises`, `/protocols`, `/clinical-tests`, `/financial`) aparecem sob rótulos PT-BR | Convenção de rotas e terminologia da UI |
| RUN-011 | `/patients` tem aba "Cadastros Pendentes" (aprovação), filtros por Status/Patologias/Status Clínico/Pagamento/Financeiro, badges "0 com risco de falta / 0 com pendência financeira", Cockpit Clínico e Aniversariantes, paginação (Pág 1 de 50) | Fluxo de aprovação + filtros estruturados |

## Rotas confirmadas em runtime (href reais do menu)

`/agenda`, `/agenda/settings`, `/patients`, `/crm-whatsapp`, `/avaliacao-inicial`, `/evolucao-clinica`, `/exercises`, `/protocols`, `/clinical-tests`, `/templates`, `/inteligencia`, `/copiloto`, `/base-conhecimento`, `/financial`.

Nota: os slugs internos são majoritariamente em inglês (`/patients`, `/exercises`, `/protocols`, `/clinical-tests`, `/financial`) enquanto os rótulos da UI são PT-BR.

## Divergência nova (adicionar a 14)

**RUN-003 — Frontend de produção consome `fisioflow-api.rafalegollas.workers.dev`, não `api-pro.moocafisio.com.br`.** O `apps/api/wrangler.toml` configura os custom domains `api-pro`/`api-paciente`, e `ALLOWED_ORIGINS` os inclui, mas a build web de produção aponta para o subdomínio `workers.dev`. Implicações: (a) o custom domain pode estar configurado mas não ser o que a web usa; (b) exposição do subdomínio `workers.dev` (bypassa regras de zona/WAF do domínio próprio); (c) a `VITE_API_URL`/config da web precisa ser corrigida na reconstrução para usar o domínio próprio. Classificação: **Confirmado em runtime**.

## Prontuário individual — `/patients/{uuid}` (breadcrumb "Detalhes")

Observado no próprio registro do usuário (dados pessoais NÃO reproduzidos aqui). Estrutura da tela:

- **Cabeçalho**: avatar, nome, status "EM TRATAMENTO"; ações: **Chat IA**, **Laudo Médico (IA)**, **Relatório Premium (IA)**, **Relatório**, **Prontuário**, **Editar**, **Avaliar**, **Agendar**.
- **Linha de contato**: Telefone, Email, Localização (com estado "Não informado").
- **Abas (12)**: Visão Geral, Evolução, Linha do Tempo, Analytics & IA, Dados Pessoais, Histórico Clínico, Biomecânica, Financeiro, Gamificação, Arquivos, Tarefas, Evidência.
- **KPIs (Visão Geral)**: Saldo de Sessões, Próximo Agendamento, Condição Principal, Nível Gamificação.
- **Resumo Inteligente (IA)** com botão "Atualizar Análise" (estado vazio: "Ainda não há uma análise gerada").
- **Agente de Retenção** — rotulado "CLOUDFLARE AUTONOMOUS AGENT", status "MONITORANDO", "Risco de Abandono 0%".

## Bug de produção encontrado e CORRIGIDO durante a sessão (RUN-009)

- **Sintoma**: `/patients/{uuid}` caía no ErrorBoundary ("Ops! Algo deu errado") para registros com dados de cirurgia.
- **Causa raiz**: `src/components/evolution/SurgeriesCard.tsx` usava `<Badge>` (linhas ~103–108) **sem importar** `Badge` → `ReferenceError: Badge is not defined` no bundle `SurgeriesCard-*.js`, derrubando a tela inteira.
- **Confirmação**: console `[ErrorBoundary] Uncaught error: ReferenceError: Badge is not defined at .../SurgeriesCard-CM7oLiKx.js` + ausência do `import` no fonte.
- **Correção**: o usuário adicionou o import de `Badge` durante a sessão; após redeploy, a página de detalhe passou a carregar completamente e o console ficou sem o erro. Status: **corrigido e verificado em runtime**.
- **Lição para a reconstrução**: adicionar teste E2E/smoke que abra um prontuário com cirurgia (evita regressão de import faltante em card condicional); considerar lint `no-undef`/checagem de imports no CI.

## Não observado (mantém-se como lacuna)

- Papéis não-admin (fisioterapeuta/estagiário/recepcionista/paciente) — só o admin foi observado; a matriz RBAC de enforcement por papel na UI permanece derivada de código.
- Estados de erro/vazio/bloqueio das telas internas (não forçados para evitar efeitos colaterais).
- Outros prontuários e o conteúdo clínico detalhado de evoluções — deliberadamente não abertos. Somente a estrutura do prontuário do próprio usuário foi observada.
- Portal do paciente e apps iOS — fora do alcance desta sessão de navegador.
