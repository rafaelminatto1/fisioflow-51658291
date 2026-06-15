# Parecer DPO — S6.2 R2 Archive Pipeline

**Data**: 2026-05-19
**DPO**: Rafael Minatto (sócio Activity Fisioterapia, CNPJ 54.836.577/0001-67, DPO designado nos termos do art. 41 LGPD; canal contato@activityfisioterapia.com.br)
**Escopo**: Arquivamento de `sessions`, `patients` (snapshot mínimo) e `appointments` para Cloudflare R2 (Iceberg/Parquet) após 90 dias do último registro, com retenção total de 20 anos.

## 1. Base legal e contexto regulatório

- **LGPD** Lei 13.709/2018 art. 11, II, f (tutela da saúde) e art. 16, II (obrigação legal de guarda) — base legal para manutenção
- **Lei 13.787/2018** art. 6º — prontuário **digitalizado pode ser mantido permanentemente**; nosso piso é 20 anos
- **COFFITO Resolução 415/2012** art. 6º — guarda mínima 5 anos (superada pelo piso de 20 anos adotado)
- **CFM Resolução 1.821/2007** (paralelo médico) — 20 anos do último atendimento

## 2. Decisão DPO

**APROVADO** para implementação, condicionado às 3 garantias técnicas abaixo (item 3).

## 3. Garantias técnicas obrigatórias

| #   | Garantia                                                                            | Implementação                                                                                                    |
| --- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| G1  | Acesso ao R2 sempre via Worker autenticado (nunca direto)                           | Bucket privado; presigned URLs assinadas com JWT Neon Auth; checagem de `org_id` antes de gerar URL              |
| G2  | Logs de acesso a sessões (quentes e arquivadas) por 2 anos                          | Tabela `clinical_access_logs` no Neon; middleware Worker grava em todo `GET/PUT /api/sessions/:id`               |
| G3  | Endpoint LGPD de exclusão que distingue dado clínico (mantém) de cadastral (exclui) | `POST /api/lgpd/data-deletion-request`; resposta automatizada em ≤15 dias úteis citando art. 16, II + Lei 13.787 |

## 4. Critérios de segurança

| Controle                        | Estado                                         | Referência                                          |
| ------------------------------- | ---------------------------------------------- | --------------------------------------------------- |
| Criptografia em repouso         | ✅ R2 server-side AES-256 default              | ANAHP Manual LGPD §2.3                              |
| Criptografia em trânsito        | ✅ TLS 1.3 Cloudflare                          | LGPD art. 46                                        |
| Controle de acesso multi-tenant | ✅ via Worker + checagem `org_id`              | RLS pattern atual                                   |
| DPA com operador (Cloudflare)   | ✅ MSA padrão CF cobre LGPD/GDPR               | Anexar ao ROPA                                      |
| Residência de dados             | ⚠️ R2 não tem região BR fixa                   | Aceito: CF é ISO 27001 + SOC 2, conforme ANAHP §2.3 |
| Backup imutável                 | ✅ Iceberg snapshots imutáveis + Neon PITR 7d  | —                                                   |
| Auditabilidade                  | ✅ Cloudflare Logpush + `clinical_access_logs` | LGPDPro §controle de acesso                         |

## 5. Retenção e descarte

- **Sessions/Patients/Appointments arquivados**: 20 anos do último atendimento (sem job de purga nos primeiros 20 anos)
- **Logs de acesso**: 2 anos; purga via trigger Postgres `pg_cron`
- **Logs de segurança** (login, auth fail): 1 ano
- **Dados administrativos** (nome de cadastro, e-mail, telefone): excluídos imediatamente sob pedido

## 6. Direitos do titular (art. 18 LGPD)

| Direito                         | Tratamento                                                                                                                       |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Confirmação de tratamento (II)  | Endpoint público com login                                                                                                       |
| Acesso a dados (II)             | Endpoint `/api/lgpd/data-export` retorna prontuário + cadastro em PDF/JSON                                                       |
| Correção (III)                  | Já existente via UI de evolução                                                                                                  |
| Eliminação (IV)                 | **Apenas dados cadastrais**. Prontuário recusado com base no art. 16, II (cumprimento de obrigação legal) — resposta documentada |
| Portabilidade (V)               | Mesmo endpoint do acesso, formato HL7 FHIR (futuro)                                                                              |
| Revogação de consentimento (IX) | Para marketing e comunicações; **não revoga base legal do art. 11, II, f**                                                       |

## 7. Comunicação ao titular

A Política de Privacidade deve ser atualizada para informar:

> Seus dados clínicos (prontuário, evoluções, exames) são mantidos por no mínimo 20 anos contados do último atendimento, conforme exigido pela Lei 13.787/2018 e Resolução COFFITO 415/2012. Após esse período, dados podem ser permanentemente excluídos a seu pedido ou descartados pela clínica. Dados cadastrais (nome, e-mail, telefone) podem ser excluídos a qualquer momento sob solicitação, **sem afetar a guarda obrigatória do prontuário**.

**TODO**: atualizar `src/pages/privacy-policy.tsx` ou equivalente. Fora do escopo desta PR técnica — abrir issue separada.

## 8. Plano de revisão

- Reavaliação anual deste parecer (próxima: 2027-05-19)
- Reavaliação imediata se: incidente de segurança, mudança no R2 (deprecação), nova resolução ANPD/COFFITO

## 9. Registros (ROPA)

Adicionar 3 entradas no ROPA:

1. **Arquivamento sessões clínicas** — finalidade: guarda obrigatória; base legal: art. 11, II, f + art. 16, II; categoria: dado sensível; retenção: 20 anos; medidas: G1+G2 acima
2. **Consulta a sessões arquivadas** — finalidade: continuidade do cuidado; base legal: art. 11, II, f; auditoria: G2
3. **Logs de acesso a prontuário** — finalidade: segurança e auditoria; base legal: art. 7º, IX (legítimo interesse); retenção: 2 anos

---

**Assinatura DPO**: Rafael Minatto · 2026-05-19
**Versão**: 1.0
