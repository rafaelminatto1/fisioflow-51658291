# ADR-0003 — Monorepo e compartilhamento seletivo

**Status:** Proposta forte

## Decisão

Usar pnpm workspaces + Turborepo com quatro apps e pacotes compartilhados para contratos, regras puras, permissions, banco, observabilidade, testes, design tokens e núcleo mobile. O Worker de jobs é acrescentado somente quando houver o primeiro consumidor assíncrono real.

## Compartilhar

- OpenAPI e SDK gerado;
- tipos de transporte e erros;
- value objects e validações invariantes;
- catálogo de permissions;
- tokens visuais e conteúdo textual quando apropriado;
- auth/storage/sync/push entre os dois apps mobile;
- migrations em ledger único e adapters de banco compartilháveis, com exports de schema/queries restritos por módulo.

## Não compartilhar à força

- componentes DOM com React Native;
- navegação e layout das três superfícies;
- estado de tela específico;
- código servidor dentro de clientes;
- entidades de banco como DTOs públicos;
- adapters de conexão/credentials entre API e jobs;
- um barrel raiz de `packages/db` que exponha tabelas ou queries internas de todos os módulos.

## Consequência

Mudanças de contrato são verificadas num único CI, mas os produtos mantêm experiência apropriada. O CI gera o SDK e o compila contra web, app profissional e app paciente; `package.json#exports` e lint impedem imports internos entre módulos. Evita a falsa promessa de “uma UI para tudo”.
