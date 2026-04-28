MIGRACOES DO BANCO DE DADOS (MIGRATIONS)

1. Objetivo
- Garantir que mudanças de schema sejam seguras, reprodutíveis e auditáveis entre ambientes (dev, staging, prod).
- Registrar, validar, aplicar e reverter migrations de forma controlada, com suporte a rollback.

2. Escopo
- Migration scripts localizados em apps/api/migrations.
- Abrange alterações de schema (ALTER/DROP/CREATE), alterações em índices, constraints e transformações de dados não destrutivas.
- Não inclui alterações de dados sensíveis em código; utilize seeds ou scripts dedicados para dados de teste.

3. Convenções de nomenclatura
- Arquivos de migrations devem seguir a convenção: <NNNN>_<descricao>.sql, onde NNNN é um número crescente.
- Ex.: 0032_boards.sql, 0053_nfse_sp_direct.sql.
- Cada migration pode conter apenas instrucoes de up (aplicar) e, opcionalmente, down (rollback).

4. Fluxo de migrations
- Ordem de aplicação: migrations devem ser executadas na ordem crescente.
- Ambiente alvo: dev -> staging -> prod; cada ambiente utiliza o pipeline de CI/CD para aplicar migrations com gating apropriado.
- Validação pré-apply: validar dependências, integridade referencial e impacto de performance antes de aplicar.
- Testes de migração: validar com um conjunto representativo de dados em staging; checar contagem de linhas, constraints, e índices.
- Rollback: cada migration deve ter um rollback correspondente (down). Caso não exista rollback trivial, dispor de backup e uma estratégia de reversão manual.
- Backups: realizar backup completo do esquema e dados relevantes antes de aplicar migrations em staging/prod.
- Auditoria: registrar log de migrations com usuário, timestamp, versão aplicada e resultado.

5. Pipeline de validação e rollout
- Desenvolvimento: aplicar migrations localmente com dry-run sempre que disponível.
- Staging: pipeline executa migrations com validação automática; falhas bloqueiam o deployment.
- Produção: deployment controlado com aprovação; validar impacto em dashboards/observabilidade antes de liberar.

6. Rollback e recuperação
- Rollback automático: acionar o script down correspondente quando possível.
- Rollback manual: se down não existir, restaurar a partir do backup e reexecutar migrations subsequentes com cuidado.
- Plano de contingência documentado e acessível ao time.

7. Boas práticas
- Manter migrations o mais idempotentes possível.
- Evitar operações perigosas sem backup (por exemplo, truncar tabelas sem precaução).
- Documentar mudanças significativas no schema e impacto de dados.
- Atualizar este documento com mudanças relevantes.

8. Responsáveis
- Responsável técnico: time de Database/Infra.
- Incidentes: registrar em ticket interno com logs de deploy.

9. Anexos
- Caminho físico: apps/api/migrations
- Scripts auxiliares: update_batch_*.sql, seeds, e utilitários de suporte.
