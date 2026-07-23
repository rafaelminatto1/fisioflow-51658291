# 20 — Cobertura Final e Segunda Revisão de Lacunas

> Fase 14 (revisão independente de lacunas) + métricas de cobertura. "Completo" = toda lacuna explícita, classificada e rastreável — não invenção do que não pôde ser verificado.

## Métricas de cobertura

| Dimensão | Encontrado | Examinado/correlacionado | Não verificado / inacessível |
|---|---|---|---|
| Rotas UI (web) | 224 ativas (+framework-mode inativo) | 224 classificadas (código); 14 hrefs confirmados e 5 superfícies críticas carregadas como admin | cobertura sistemática e papéis não-admin pendentes |
| Telas/modais | 111 catalogadas | 111 (código); amostra runtime de login, agenda, pacientes, financeiro e prontuário | demais telas/estados e papéis pendentes |
| Endpoints API | 1.191 | 1.168 ativos + 23 órfãos | consumidor front amostrado, não 100% |
| Eventos/jobs | 57 (18 cron, 13 workflow, 6 DO, 6 webhook-in, 5 webhook-out, 4 queue, 3 WS, 2 SSE) | classificados | 4 cron cases mortos, 2 WF ausentes |
| Tabelas de banco | 303 (banco real) | 303 comparadas com código | — |
| Objetos de banco | 5.838 | inventariados | — |
| Regras de negócio | 108 | 86 confiança alta, 22 média | runtime confirmaria as de média |
| Recursos Cloudflare | 63 linhas | classificados (FisioFlow × outros projetos) | D1/crons via API deram auth error (obtidos do wrangler) |
| Recursos Neon | 3 projetos, 2 branches, 9 roles, 2 dbs | classificados | — |
| Integrações | 34 | status+fluxo | sandbox×prod não testado |
| Testes | 442 arquivos | inventariados | cobertura real não medida |
| Papéis | 9 | matriz 50 linhas | enforcement por camada mapeado |

**Rastreabilidade**: matriz `traceability.csv` cobre as 22 jornadas críticas P1/P2 ligando produto→persona→jornada→tela→regra→endpoint→entidade→permissão→evidência→teste→status. Jornadas não-críticas (satélites) têm rastreabilidade via `feature-status.csv` + `screens.csv`.

## Segunda revisão de lacunas (checagens cruzadas)

| Checagem | Resultado |
|---|---|
| Rotas declaradas × telas examinadas | 224 rotas → 111 telas/modais catalogados (rotas com params/sub-rotas agrupadas); runtime parcial como admin (`RUN-001..011`), sem varredura completa |
| Menus × rotas | mapeado no código (Sidebar.tsx); runtime confirmaria visibilidade por papel |
| Chamadas frontend × handlers | amostrado; consumidor_front marcado "desconhecido" onde não conferido |
| Handlers × consumidor | 23 endpoints órfãos + 8 módulos nunca montados identificados |
| Tabelas do código × Neon real | 23 Drizzle × 303 banco; 1 código-sem-banco (ai_usage_events); 8 órfãs no banco |
| Migrations × Neon real | 180 migrations sem ledger; confirmação indireta via presença de tabelas |
| Variáveis × bindings | 38 bindings CF + ~16 vars + 43 secrets mapeados |
| Bindings × consumidores | 2 workflows declarados-sem-existir; KV/R2/secrets órfãos listados |
| RBAC UI × API × RLS | divergência central documentada (RLS inerte; auth gaps 14.C) |
| Documentação × runtime | contradições C1–C6 registradas |
| Recursos CF declarados × existentes | gaps na tabela de 09 |
| Módulos × testes | lacunas em RLS/portal/mobile/biomecânica |
| Recursos web × apps | matriz separada em 12 |
| Integrações × secrets | 34 integrações × 43 secrets; INNGEST órfão; Deepgram direto ausente porque o STT observado é mediado por Workers AI |
| Funcionalidades sem regra | satélites (inventário, marketing) com pouca regra extraída — aceitável |
| Regras sem teste de paridade | criadas em traceability para as críticas |
| Planejado classificado como implementado | corrigido em feature-status (biomecânica=mock, digital twin=parcial, NFS-e=parcial) |

## Lacunas conscientes (registradas, não resolvidas)

1. **Runtime incompleto por papel** (QA-RUN-01) — a passada `admin` confirmou fluxos centrais, mas RBAC de fisioterapeuta/estagiário/recepcionista/paciente e estados negativos continuam sem validação em runtime.
2. **Hermes indisponível** — revisão independente feita por subagentes, não por Hermes.
3. **D1 e crons via API Cloudflare** deram auth error (escopo do token) — obtidos do `wrangler.toml` (confiável) em vez da conta.
4. **Consumidor frontend de endpoints** amostrado, não exaustivo.
5. **Sandbox×produção de integrações** não testado (seria mutável).

## Contradições em aberto (para o time)

- Ver `19-perguntas-em-aberto.md` (22 questões; grupos/turmas já resolvidos) e `14` (contradições C1–C6, buracos A1–A12).

## Estado da auditoria

**Auditoria AS-IS substancialmente completa por análise estática + inspeção de banco/infra reais + passada parcial de runtime como admin (`RUN-001..011`).** Ainda falta validar papéis não-admin, estados negativos e a cobertura sistemática das telas para elevar regras de confiança média. Todos os inventários e diagramas obrigatórios foram produzidos.
