SECURITY PLAN - FISIOFLOW (TECHNICAL)

1. Visão Geral
- Este documento descreve controle de segredos, gestão de acesso, proteção de dados e resposta a incidentes para o ecossistema FisioFlow (API, Web, Apps móveis).
- A conduta de segurança é parte integrante do pipeline de entrega e deve ser utilizada por todas as equipes (backend, frontend, infra, dados).

2. Gestão de Segredos
- Segredos nunca devem ser codificados diretamente no código-fonte.
- Armazenar segredos em fontes de configuração seguras (CI/CD secrets, Wrangler Secrets, Neon Secrets, Vault se disponível).
- Em ambientes de CI, usar repositórios de secrets com rotação periódica e políticas de acesso mínimo.
- Registrar apenas metadados de rotação em logs (sem valores de segredos).
- Práticas recomendadas: usar variáveis de ambiente plenas, injetar via binding de ambiente no runtime, e evitar exposição em artefatos de build.

3. Controles de Acesso
- Definir RBAC com roles claras: admin, dev, operator, user. Aplicar princípio do menor privilégio.
- Multi-tenant RLs para dados sensíveis: garantir isolamento entre tenants no nível de DB (Row-Level Security) e nas APIs.
- Autenticação/Autorização com Neon Auth, JWT/OIDC; manter políticas de expiração de tokens e refresh.
- Auditoria de ações relevantes (criar/ler/atualizar/excluir) com registro de user_id, tenant_id, timestamp.

4. Proteção de Dados
- TLS em trânsito (TLS 1.2+), encriptação de dados em repouso no Neon (configurar at rest conforme provedor).
- Política de minimização de dados: evitar coleta de dados desnecessários; aplicar masking/anonymization quando necessário para logs.
- Controle de exposição de dados sensíveis na API (validação de input, tight schemas, validação de autorização).
- Gerenciamento de backups de dados críticos com retenção definida e testes de restauração.

5. Observabilidade e Segurança
- Logs estruturados com campos padronizados: timestamp, level, service, tenant_id, user_id, request_id, operation, status_code, duration_ms, message.
- Monitorar padrões de acesso suspeitos (falhas de autenticação, tentativas de bruce force) e acionar alertas.
- Integrar com dashboards de segurança e auditoria (log centralizado, SIEM, se disponível).
- Revisões periódicas de dependências para vulnerabilidades (SCA) e atualizações de libs/frameworks.

6. Conformidade e Incidentes
- Manter Runbook de Resposta a Incidentes com contatos, steps, janelas de tempo para resposta inicial (T0) e investigação.
- Práticas de auditoria: manter trilha de mudanças e acesso com imutabilidade quando possível.
- Realizar exercícios simulados (tabletop) para validar planos de resposta.

7. Boas Práticas
- Integrar SAST/DAST no CI/CD; habilitar scanners de dependências para cada PR.
- Evitar logging de dados sensíveis; usar logs mascarados quando necessário.
- Configurar alertas de segurança com SLIs/SLOs apropriados.
- Documentar decisões de segurança e manter revisão de código com checklist de segurança.

8. Responsáveis
- Propriedade técnica: time de Segurança/DevOps. Responsavel pela manutenção deste documento e pela coordenação de incidentes.
- Em caso de incidente, abrir ticket interno com logs relevantes, tempo de atividade e ações tomadas.

9. Notas Finais
- Este documento deve ser revisado periodicamente (p.ex., a cada release principal) e atualizado conforme mudanças na arquitetura ou regressões de segurança.
