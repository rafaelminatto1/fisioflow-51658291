# FisioFlow Spec Constitution

## Core Principles

### I. Spec-Driven by Default
Todo novo recurso começa com especificação escrita, plano de implementação e lista de tarefas. Os artefatos devem ser versionados e salvos em `specs/<feature>/`.

### II. Multi-plataforma Consistency
O monorepo suporta web, mobile e API. Reutilize pacotes compartilhados sempre que possível e mantenha o comportamento específico de plataforma isolado em camadas bem definidas.

### III. Privacy & Compliance First
Todas as decisões de produto devem tratar PHI/LGPD como dados protegidos por padrão. A exposição de dados pessoais deve ser minimizada e justificada.

### IV. Test-First and Incremental Delivery
Escreva critérios de aceitação e testes antes de implementar. Prefira entregas pequenas e iterativas que possam ser validadas independentemente.

### V. Observability and Security
Recursos devem ter pontos de observabilidade claros e checagens de segurança. Use guias existentes em `docs/` para alinhar com políticas de qualidade e segurança.

## Workflow Requirements
- Use `/speckit.constitution`, `/speckit.specify`, `/speckit.plan`, `/speckit.tasks`, `/speckit.analyze` e `/speckit.checklist` na sequência recomendada.
- Mantenha `constitution.md`, `specs/` e arquivos de tarefa sob controle de versão.
- Para trabalho brownfield, documente hipóteses, limites do sistema e dependências existentes.
- Cada grande branch de recurso deve incluir ao menos `specs/<feature>/spec.md`, `plan.md` e `tasks.md`.

## Governance
- Alterações nesta constituição devem ser revisadas pelo time central de engenharia.
- Especificações e planos devem ser revisados durante o code review e antes de iniciar a implementação.
- Exceções devem ser documentadas no próprio spec e aprovadas por um responsável.

**Version**: 1.0 | **Ratified**: 2026-04-27 | **Last Amended**: 2026-04-27
