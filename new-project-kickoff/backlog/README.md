# Backlog do programa modular

O backlog canônico está em [delivery/backlog.md](../delivery/backlog.md). Ele é mantido como uma lista de resultados e IDs estáveis; somente após aprovação dos decision gates esses itens devem virar issues/sprints.

## Trilhas

| Trilha | Resultado | Bloqueio principal |
|---|---|---|
| D0/K0 | descoberta, ICP, decisões, privacidade e segurança | DG-00..DG-07 |
| F0 | fundação greenfield segura e observável | D0/K0 |
| F1 | auth → agenda da clínica (sem seleção de contexto; org resolvida no servidor) → patients list/detail read-only | F0 |
| F2–F4 | núcleo clínico, operação essencial, HEP e continuidade | F1 + decisões clínicas |
| M1/M2 | apps paciente e profissional por persona | APIs estáveis + auth paciente/Apple |
| B1–B4 | ERP/fiscal, projetos, CRM/marketing/site builder, comércio/inventário | fundação + contratos de domínio |
| E1 | gamificação, moedas, loja, inventário virtual e leaderboard | identidade + commerce/ledger |
| A1–A3 | telemedicina/colaboração, IA/agentes, wearables/biomecânica/Digital Twin | gates específicos clínicos e de dados |
| P | deployables condicionais e extrações arquiteturais | runtime/segurança/escala comprovados |
| G | entrada greenfield em produção e recuperação | PITR/backup/restore testados |

O mapa de releases define a ordem macro; o backlog detalha resultados estáveis. Nenhuma trilha representa migração dos registros atuais.

## Regras

- Uma issue deve apontar contrato, permission, dado, risco e critério de aceite.
- Infra, schema e UI do mesmo comportamento pertencem ao mesmo resultado vertical.
- Feature experimental não entra sem hipótese/métrica/kill criterion.
- Nenhuma issue ou placeholder de grupos/turmas é permitido.
- Nenhuma issue ou placeholder de DICOM/PACS é permitido.
- Todo módulo aprovado possui épico, mas pastas/código só surgem quando a onda correspondente começar.
- Bugs e riscos do legado ficam em backlog separado da reconstrução.
