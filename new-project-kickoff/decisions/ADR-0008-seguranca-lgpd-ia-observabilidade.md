# ADR-0008 — Segurança, LGPD, IA e observabilidade

**Status:** Proposta forte

## Decisão

- Privacy/security by design em schema, contrato e UI.
- Classificação de dados: público, interno, pessoal, saúde sensível e segredo.
- Retenção por categoria e finalidade, com legal hold e descarte verificável.
- Log estruturado com IDs técnicos; sem nome, telefone, CPF, nota clínica, prompt ou áudio bruto.
- Audit trail separado de observabilidade e protegido contra alteração comum.
- Secrets somente no gerenciador do ambiente; rotação e inventário automatizados.
- IA clínica produz rascunho; revisão, diff e autoria humana ficam registrados.
- Consentimento específico para áudio/vídeo/monitoramento e política de exclusão visível.
- Threat model antes do primeiro slice cobrindo bootstrap de identidade, isolamento tenant, cache/CSRF/enumeração, uploads/webhooks, offline e acesso operacional.
- Respostas com PHI não usam cache compartilhado; cabeçalhos e configuração edge são testados em CI/staging.
- Escrita de auditoria usa capacidade separada e append-only no fluxo comum; consulta e escrita não compartilham grants amplos.

## Gates de IA

1. finalidade e público definidos;
2. dataset/proveniência lícitos;
3. avaliação clínica e de segurança;
4. custo/latência medidos;
5. fallback sem IA;
6. kill switch;
7. auditoria de aceitação/edição sem armazenar conteúdo sensível além do necessário;
8. nenhum auto-sign ou mudança automática de conduta.

## Observabilidade

- request/correlation ID ponta a ponta;
- métricas RED da API e métricas de fila/workflow;
- SLOs por jornada, não só uptime;
- alertas com runbook e owner;
- release markers, crash reporting nos apps e smoke pós-deploy;
- orçamento explícito de cardinalidade e retenção;
- redaction por allowlist e testes com canários sintéticos em logs, traces e crash reports;
- cursores, mensagens de erro e trace IDs passam por revisão contra enumeração e vazamento;
- restore drill conjunto comprova recuperação de Postgres, objetos R2 e trilha de auditoria, incluindo integridade/referências entre eles.
