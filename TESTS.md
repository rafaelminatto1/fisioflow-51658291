TESTS PLAN - FISIOFLOW

Objetivo
- Definir a estratégia de testes para garantir qualidade de software e confiabilidade da plataforma FisioFlow (API, Web, Apps móveis).

Estrutura de testes
- Unit tests: validar unidades isoladas de cada módulo (especialmente APIs críticas, validações de negócio).
- Integration tests: validar interações entre componentes (DB + ORM, APIs, autenticação, fluxos de negócio).
- End-to-end tests (e2e): cenários críticos do usuário (cadastro de paciente, agendamento, fluxo de prescrição) via Playwright/ Cypress.

Ferramentas e stack recomendadas
- Vitest para unit/integration tests (TypeScript/JavaScript).
- Playwright para testes end-to-end (UI Web; extensão para mobile web se aplicável).
- MSW (Mock Service Worker) ou similar para mocks de API em tests unit/integração.
- Seeds de dados de teste e fixtures sob tests/fixtures.

Convencoes e organizacao
- Estrutura de pastas: tests/unit, tests/integration, tests/e2e.
- Nomes de arquivos: <descritivo>.<tipo>.test.(ts|tsx)
- Padrões de mocks: fixtures em tests/fixtures.
- Cobertura de testes: meta inicial de 70%+ para componentes críticos; 80-90% para APIs-chave mediante viabilidade.
- Tests de migração: incluir validações de migrations (schema, contagem de rows) em ambiente staging.

Execucao local
- Instalar dependencias: use pnpm (monorepo):
  - pnpm i
- Executar testes: 
  - pnpm test
- Executar testes de e2e: 
  - pnpm run test:e2e (conforme script no package.json)

Integração com CI/CD
- Rodar testes em PRs (gate): unidade/integracao e2e smoke para PRs para staging.
- Falhas: bloquear merge quando falhas críticas; validar com a equipe e executar localmente conforme necessário.

Critérios de aceitação
- Pipeline de CI passando para todas as suites relevantes.
- Cobertura mínima definida por componente crítico (ajustar conforme projeto).
- Testes de migrações passando em staging.

Observacoes
- Este documento é um ponto de partida; ajustar conforme stack real e ambientes de execucao do projeto.
