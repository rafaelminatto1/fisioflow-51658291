# 📄 POLÍTICA DE RETENÇÃO DE DADOS - FISIOFLOW
# Conforme LGPD (Lei nº 13.709/2018) - Art. 15, 16, 18

> **Data de Criação:** 2026-04-29  
> **Próxima Revisão:** 2026-07-29 (90 dias)  
> **Responsável:** Rafael Minatto  
> **Base Legal:** Art. 15 (Finalidade), Art. 16 (Necessidade), Art. 18 (Eliminação)

---

## 🎯 OBJETIVO

Estabelecer prazos claros de retenção, arquivamento e eliminação de dados pessoais e sensíveis coletados pelo FisioFlow, garantindo conformidade com a LGPD.

---

## 📊 CATEGORIZAÇÃO DE DADOS

| Categoria | Exemplos | Natureza LGPD |
|---|---|---|
| **Dados Pessoais Comuns** | Nome, email, telefone, CPF, endereço | Art. 5º, III |
| **Dados Sensíveis** | Laudos, prontuários, histórico clínico, evoluções | Art. 5º, IV |
| **Dados de Terceiros** | Contatos de emergência, responsáveis | Art. 5º, III |
| **Dados Técnicos** | Logs de acesso, IPs, user-agents | Art. 5º, III |
| **Dados Financeiros** | Pagamentos, planos, notas fiscals (NFS-e) | Art. 5º, III |

---

## ⏱ PRAZOS DE RETENÇÃO

### 1. Dados Clínicos (Sensíveis)

| Tipo de Dado | Prazo Retenção | Base Legal | Ação Pós-Prazo |
|---|---|---|---|
| **Prontuários Eletrônicos** | **20 anos** após última consulta | Art. 16, CFM Resolução 2.306/2022 | Arquivamento digital seguro |
| **Evoluções de Sessão** | **20 anos** | Art. 16, CFM | Arquivamento |
| **Exames e Laudos** | **20 anos** | Art. 16, CFM | Arquivamento |
| **Agendamentos (Histórico)** | **5 anos** | Art. 15 | Anonimização |
| **Faturas e Pagamentos** | **10 anos** | Art. 16, Código Civil | Arquivamento fiscal |

### 2. Dados Pessoais Comuns

| Tipo de Dado | Prazo Retenção | Base Legal | Ação Pós-Prazo |
|---|---|---|---|
| **Dados de Cadastro (Pacientes)** | **5 anos** após inatividade | Art. 15, III | Exclusão ou anonimização |
| **Dados de Cadastro (Profissionais)** | **5 anos** após inatividade | Art. 15, III | Exclusão ou anonimização |
| **Logs de Acesso** | **1 ano** | Art. 15, boas práticas | Exclusão automática |
| **Cookies e rastreamento** | **6 meses** | Art. 15, LGPD | Exclusão automática |

### 3. Dados Financeiros e Fiscais

| Tipo de Dado | Prazo Retenção | Base Legal | Ação Pós-Prazo |
|---|---|---|---|
| **NFS-e (Notas Fiscais)** | **10 anos** | Art. 16, Lei 5.172/66 (Código Tributário) | Arquivamento digital |
| **Contratos e Termos** | **10 anos** após término | Art. 16, Código Civil | Arquivamento |
| **Registros de Pagamento** | **10 anos** | Art. 16 | Arquivamento fiscal |

---

## 🔐 PROCEDIMENTOS DE ELIMINAÇÃO

### Eliminação Segura (Art. 18, LGPD)

#### 1. Dados Clínicos (Prontuários)
```sql
-- Soft delete (LGPD Art. 18) - NUNCA hard delete
UPDATE patients 
SET deleted_at = NOW(),
    deleted_reason = 'Retenção máxima atingida (20 anos)',
    cpf = NULL, -- Anonimização obrigatória
    email = NULL,
    phone = NULL
WHERE deleted_at IS NULL 
  AND EXISTS (
    SELECT 1 FROM sessions 
    WHERE sessions.patient_id = patients.id 
      AND sessions.created_at < NOW() - INTERVAL '20 years'
  );
```

#### 2. Logs de Acesso
```sql
-- Eliminação automática (1 ano)
DELETE FROM audit_logs 
WHERE created_at < NOW() - INTERVAL '1 year';
```

#### 3. Dados de Teste
```bash
# Scripts de teste NUNCA contêm dados reais
# Usar sempre: test-patient-XXX, CPFs fictícios (111.111.111-11)
```

---

## 🔒 ARQUIVAMENTO DIGITAL (20 anos - Prontuários)

### Procedimento:
1. **Exportação:** Extrair dados em formato PDF/A (arquivamento permanente)
2. **Criptografia:** AES-256 com chaves gerenciadas separadamente
3. **Armazenamento:** 
   - Cópia no Neon PostgreSQL (backup PITR)
   - Cópia no Cloudflare R2 (armazenamento frio)
4. **Índice:** Manter tabela de índice para recuperação judicial/cível

---

## 📋 NOTIFICAÇÃO DE VAZAMENTO (Art. 48, LGPD)

### Procedimento em caso de incidente:

| Prazo | Ação | Responsável |
|---|---|---|
| **Imediato** | Containment do vazamento | Equipe Técnica |
| **Até 2 dias úteis** | Notificar ANPD | Controlador (Rafael) |
| **Até 2 dias úteis** | Notificar Titulares afetados | Controlador |
| **3 dias** | Publicar aviso na homepage | Equipe de Comunicação |
| **7 dias** | Relatório de impacto detalhado | DPO / Consultoria |

### Template de Notificação (Art. 48):
```markdown
[EM CASO DE VAZAMENTO]

Prezado(a) paciente,

Informamos que em [DATA] identificamos um incidente de segurança 
que pode ter exposto seus dados [listar dados afetados].

Medidas imediatas tomadas:
- [x] Contenção do vazamento
- [x] Rotação de credenciais
- [x] Reforço de segurança

Seus direitos (Art. 18 LGPD):
- Consultar dados armazenados
- Solicitar exclusão/anonimização
- Reclamar à ANPD

Contato: [EMAIL/TELEFONE]

Atenciosamente,
Equipe FisioFlow
```

---

## 🔍 AUDITORIA E MONITORAMENTO

### Verificações Trimestrais (a cada 90 dias):

```sql
-- Verificar dados além do prazo
SELECT 'Patients > 5 years inactive' as check, COUNT(*) as count
FROM patients 
WHERE deleted_at IS NULL 
  AND updated_at < NOW() - INTERVAL '5 years'

UNION ALL

SELECT 'Sessions > 20 years' as check, COUNT(*) as count
FROM sessions 
WHERE created_at < NOW() - INTERVAL '20 years'

UNION ALL

SELECT 'Audit logs > 1 year' as check, COUNT(*) as count
FROM audit_logs 
WHERE created_at < NOW() - INTERVAL '1 year';
```

### Relatório Trimestral:
- Gerar relatório de dados eliminados
- Documentar ações de retenção
- Arquivar comprovantes de eliminação

---

## 📊 TABELA RESUMO (Referência Rápida)

| Dado | Prazo | Ação | Frequência de Revisão |
|---|---|---|---|
| Prontuários | 20 anos | Arquivar | Semestral |
| Evolucões | 20 anos | Arquivar | Semestral |
| Agendamentos | 5 anos | Anonimizar | Semestral |
| Logs | 1 ano | Eliminar | Trimestral |
| NFS-e | 10 anos | Arquivar | Anual |
| Dados de teste | N/A | NUNCA reais | Contínua |

---

## ⚠️ DECISÃO ABERTA (D9)

> **Pendência:** Definir claramente período de retenção para diferentes tipos de dados clínicos.

**Recomendação:** Adotar os prazos padrão da Resolução CFM 2.306/2022:
- Prontuários: 20 anos (mínimo legal)
- Menores de idade: até 18 anos após maioridade (Fapeam 18 anos adicionais)
- Documentos fiscais: 10 anos (Código Tributário Nacional)

---

## 📎 REFERÊNCIAS

- **LGPD:** Lei nº 13.709/2018 (Art. 15, 16, 18, 48)
- **Resolução CFM 2.306/2022:** Prontuário Eletrônico do Paciente
- **Código Civil:** Art. 206, V (10 anos para prescrição)
- **Código Tributário Nacional:** Lei 5.172/66 (10 anos documentos fiscais)
- **RFC 9280:** Retenção de logs de segurança

---

**Documento aprovado por:** Rafael Minatto  
**Data:** 2026-04-29  
**Próxima Revisão:** 2026-07-29
