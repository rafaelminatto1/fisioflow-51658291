# Procedimento Operacional Padrão (POP): Instant Restore (Neon) e LGPD

## 1. Visão Geral
Este documento descreve o procedimento para restauração de banco de dados point-in-time (Instant Restore) usando o [Neon](https://neon.tech/), e como isso se aplica às diretrizes da LGPD (Lei Geral de Proteção de Dados Pessoais).

O recurso de Instant Restore permite recuperar o banco de dados para qualquer instante específico no tempo dentro do período de retenção (7 dias no plano Free, 30 dias no Launch/Scale). 

No contexto da LGPD, o Instant Restore é crucial para garantir a **disponibilidade** (Art. 46) e possibilitar a reversão em caso de **incidente de segurança** (exclusões indevidas, corrupção). Todo evento de restauração constitui uma manipulação de dados sensíveis e, portanto, deve ser **auditável**.

## 2. Cenários de Uso
Os procedimentos aqui descritos devem ser utilizados exclusivamente nos seguintes cenários:
- **Exclusão acidental de dados de paciente:** Recuperação de prontuários, evoluções ou dados pessoais apagados indevidamente (violação da integridade e disponibilidade).
- **Corrupção de dados por migration problemática:** Reversão após falha crítica em uma atualização de banco de dados.
- **Auditoria de alterações em dados sensíveis:** Criação de um branch point-in-time apenas para inspecionar um estado anterior, sem afetar a produção, auxiliando na investigação de acessos indevidos.
- **Requisição de portabilidade de dados (LGPD art. 18):** Se o acesso principal falhar e for necessária a extração via branch histórico.

## 3. Procedimento de Restore

> [!WARNING]
> Restaurar a produção diretamente pode causar perda de novos dados inseridos entre o ponto de restauração e o presente. O procedimento correto utiliza *branches*.

### 3.1 Utilizando o Script Auxiliar (Recomendado)
A maneira mais segura de realizar o processo é através do nosso script auxiliar, que automatiza o processo e impõe as devidas confirmações:

```bash
./scripts/neon-restore.sh --timestamp "2026-08-07T12:00:00Z" --branch-name "restore-investigacao-01"
```

### 3.2 Passo a passo Manual (Via neonctl)
1. **Identificar o Instante:** Determine o carimbo de data/hora exato para onde o banco deve retornar.
2. **Criar um Branch de Restauração:**
   ```bash
   neonctl branches create --name restore-emergencia --project-id <PROJECT_ID> --timestamp "YYYY-MM-DDTHH:MM:SSZ"
   ```
3. **Verificação (Homologação):**
   Conecte-se ao novo branch criado, verifique se os dados corrompidos ou apagados voltaram ao estado desejado.
4. **Extração ou Promoção:**
   - Se for apenas um paciente: Extraia os dados e insira manualmente na produção atual (para não perder as consultas criadas após a falha).
   - Se for uma corrupção global: Promova o branch restaurado para principal (via console do Neon).
5. **Documentação e Auditoria:**
   Insira um registro na tabela `restore_audit_logs` documentando:
   - Data/hora do restore
   - Operador
   - Motivo (ex: "Recuperação do paciente ID xxx excluído pelo usuário Y")

## 4. Políticas de Retenção e Backup
- **Período de Retenção Neon:** O FisioFlow utiliza o Neon na região `sa-east-1` (São Paulo) para melhor latência e conformidade com soberania de dados. A retenção do histórico point-in-time obedece aos limites do plano contratado (verificar dashboard).
- **Backups Complementares:** De acordo com a nossa `LGPD_RETENTION_POLICY.md`, para retenções superiores (ex: histórico contábil de 5 anos ou médico de 20 anos), o Instant Restore **não é aplicável**. O projeto possui rotinas de exportação periódicas (backups lógicos via `pg_dump`) armazenadas em storage criptografado a frio (S3).

## 5. Contatos e Escalação
Em caso de violação de dados ou incidente grave, acione imediatamente o **DPO (Data Protection Officer)** ou o responsável de segurança do FisioFlow antes de manipular os dados da produção.

**Responsável Técnico / Infraestrutura:** Equipe DevOps / Rafael
**Documentação Relacionada:** `LGPD_RETENTION_POLICY.md`, `SECURITY.md`, `RUNBOOK_INCIDENTS.md`
