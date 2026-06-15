# ROPA — Entradas a registrar (LGPD art. 37)

> **⚡ Atalho prático**: [ropa-template.csv](./ropa-template.csv) já tem **20 atividades pré-preenchidas** cobrindo toda Activity Fisioterapia + FisioFlow, aderente ao template oficial da ANPD (Nota Técnica 33/2022).
>
> **Como importar no Google Sheets:**
>
> 1. https://sheets.google.com → Arquivo → Importar → Upload → escolha `ropa-template.csv`
> 2. Tipo de separador: vírgula
> 3. "Substituir planilha" → Importar dados
> 4. Revise/ajuste as 20 linhas conforme realidade da clínica
>
> O markdown abaixo mantém as 3 entradas detalhadas do S6.2 (arquivamento, consulta, logs) em formato narrativo para anexar ao parecer DPO.

---

Rascunho de 3 entradas para o Registro de Operações de Tratamento (ROPA) referentes
ao S6.2 R2 Archive Pipeline. Conforme parecer DPO §9 ([dpo-approval.md](./dpo-approval.md)).

> **Onde registrar**: ROPA é normalmente uma planilha estruturada ou base GRC.
> Se você ainda não tem um, sugiro Confidata, OneTrust, ou simplesmente um Google
> Sheets compartilhado. As 3 entradas abaixo são para copiar/colar nele.

---

## Entrada #1 — Arquivamento de sessões clínicas

| Campo                           | Valor                                                                                                                                                                                                                                           |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Nome da atividade**           | Arquivamento de sessões clínicas em armazenamento de longo prazo                                                                                                                                                                                |
| **Finalidade**                  | Cumprimento de obrigação legal de guarda de prontuário fisioterapêutico (mínimo 20 anos do último atendimento), com redução de custo operacional do banco de dados quente                                                                       |
| **Base legal**                  | LGPD art. 11, II, “f” (tutela da saúde) c/c art. 16, II (cumprimento de obrigação legal — Lei 13.787/2018 art. 6º e Resolução COFFITO 415/2012 art. 6º)                                                                                         |
| **Categorias de titulares**     | Pacientes                                                                                                                                                                                                                                       |
| **Dados pessoais tratados**     | ID interno, ID do paciente, ID do fisioterapeuta, data, duração, status                                                                                                                                                                         |
| **Dados sensíveis**             | Texto livre da observação clínica (evolução), escala de dor (EVA), procedimentos realizados, exercícios prescritos, medições, exercícios domiciliares, anexos                                                                                   |
| **Fonte dos dados**             | Coleta direta do paciente durante atendimento (registrada pelo fisioterapeuta)                                                                                                                                                                  |
| **Compartilhamento externo**    | Cloudflare Inc. — operador de infraestrutura R2 Data Catalog (Iceberg)                                                                                                                                                                          |
| **Transferência internacional** | EUA (Cloudflare global network) — salvaguarda via MSA padrão CF com cláusulas LGPD/GDPR-equivalentes                                                                                                                                            |
| **Prazo de retenção**           | 20 anos do último atendimento (mínimo); guarda permanente permitida pela Lei 13.787/2018 art. 6º                                                                                                                                                |
| **Critério de descarte**        | Após 20 anos, descarte seguro mediante `DELETE FROM` na tabela Iceberg + purga do bucket R2; auditável via `session_archive_runs`                                                                                                               |
| **Medidas de segurança**        | Criptografia AES-256 em repouso (R2 server-side), TLS 1.3 em trânsito, controle de acesso por `organization_id` via Worker autenticado (presigned URLs), audit log em `clinical_access_logs`, backup PITR 7d no Neon enquanto dado for "quente" |
| **Responsável**                 | Rafael Minatto (DPO)                                                                                                                                                                                                                            |

---

## Entrada #2 — Consulta a sessões arquivadas

| Campo                           | Valor                                                                                                                                              |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Nome da atividade**           | Consulta e leitura de sessões clínicas arquivadas (R2 SQL)                                                                                         |
| **Finalidade**                  | Continuidade do cuidado clínico em casos de retorno após >90 dias do último atendimento; resposta a pedidos de acesso do titular (art. 18 II LGPD) |
| **Base legal**                  | LGPD art. 11, II, “f” (tutela da saúde); art. 18, II (direito de acesso do titular)                                                                |
| **Categorias de titulares**     | Pacientes                                                                                                                                          |
| **Dados pessoais tratados**     | Mesmos da entrada #1 (leitura)                                                                                                                     |
| **Dados sensíveis**             | Sim — todos os dados clínicos da entrada #1                                                                                                        |
| **Fonte dos dados**             | Tabela Iceberg `fisioflow_archive.sessions_archive` em R2 (origem: arquivada pela atividade #1)                                                    |
| **Compartilhamento externo**    | Não há — leitura interna pelo Worker autenticado                                                                                                   |
| **Transferência internacional** | EUA (mesma salvaguarda da entrada #1)                                                                                                              |
| **Prazo de retenção**           | Logs de consulta em `clinical_access_logs`: 2 anos                                                                                                 |
| **Critério de descarte**        | Purga automática via cron de logs >2 anos (a implementar)                                                                                          |
| **Medidas de segurança**        | Worker valida `organization_id` antes de gerar query R2 SQL; toda leitura grava linha em `clinical_access_logs` com `source='r2_archive'`          |
| **Responsável**                 | Rafael Minatto (DPO)                                                                                                                               |

---

## Entrada #3 — Logs de acesso a prontuário

| Campo                           | Valor                                                                                                                                                       |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Nome da atividade**           | Logs de auditoria de acesso a recursos clínicos                                                                                                             |
| **Finalidade**                  | Segurança da informação, auditoria de acesso a prontuário, resposta a incidentes e investigação de uso indevido                                             |
| **Base legal**                  | LGPD art. 7º, IX (legítimo interesse — segurança de dados pessoais sensíveis, exigência do art. 46 LGPD); art. 11, II, “g” (garantia da prevenção à fraude) |
| **Categorias de titulares**     | Profissionais de saúde da clínica (usuários do sistema) e indiretamente pacientes (cujos prontuários são acessados)                                         |
| **Dados pessoais tratados**     | `user_id`, `patient_id`, `session_id`, `resource`, `action`, IP de origem (CF-Connecting-IP), User-Agent, timestamp, `organization_id`                      |
| **Dados sensíveis**             | Não diretamente — log referencia o acesso ao dado sensível, não copia o conteúdo                                                                            |
| **Fonte dos dados**             | Captura automática pelo middleware Worker em toda chamada a `/api/sessions/*`                                                                               |
| **Compartilhamento externo**    | Não há                                                                                                                                                      |
| **Transferência internacional** | Logs ficam no Neon (São Paulo); cópia opcional via Cloudflare Logpush para Axiom (EUA) sob mesma salvaguarda DPA                                            |
| **Prazo de retenção**           | 2 anos (conforme LGPDPro / boas práticas setoriais ANAHP)                                                                                                   |
| **Critério de descarte**        | Job pg_cron a configurar: `DELETE FROM clinical_access_logs WHERE created_at < now() - interval '2 years'`                                                  |
| **Medidas de segurança**        | RLS por `organization_id`, índices para auditoria por paciente/usuário, fire-and-forget via `ctx.waitUntil` (não bloqueia rota clínica)                     |
| **Responsável**                 | Rafael Minatto (DPO)                                                                                                                                        |

---

## Histórico

- **2026-05-19**: Criação inicial, decorrência do parecer DPO S6.2.

## Próxima revisão

2027-05-19 (ou imediata se houver incidente, mudança em R2, ou nova resolução ANPD/COFFITO).
