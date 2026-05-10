# ⚖️ FisioFlow - Regras de Negócio (Business Rules)

Este documento centraliza as premissas e restrições de negócio do FisioFlow. Todo agente deve seguir estas regras rigorosamente.

---

## 🏥 Atendimento e Convênios (Medical Insurance)

### 🚫 Regra de Ouro: Sem Atendimento Direto
O FisioFlow **NÃO** realiza atendimento direto por convênios médicos. Todo o fluxo financeiro é baseado em atendimento particular (out-of-pocket).

### 📄 Fluxo de Reembolso
Embora não haja atendimento direto, o sistema permite o cadastro do convênio no perfil do paciente para fins de **Reembolso**.

1.  **Campo de Convênio**: O perfil do paciente possui campos para `provider` (Operadora), `plan` (Plano) e `cardNumber` (Carteirinha).
2.  **Automação de Documentos**: Estes dados são integrados automaticamente para facilitar o reembolso:
    *   **Recibos (PDF)**: Seção dedicada com os dados do convênio.
    *   **NFS-e**: Inclusão automática de bloco "[PARA FINS DE REEMBOLSO]" na discriminação do serviço.
    *   **Relatórios de Evolução**: Cabeçalho com dados de convênio para auditoria da operadora.
3.  **Reembolso Inteligente (Estratégia Particular)**:
    - O sistema permite planejar sessões futuras para fins de nota fiscal antecipada.
    - **Regra de Datas**: As sessões planejadas devem ocorrer obrigatoriamente após a data do pedido médico.
    - **Frequência Padrão**: 3x por semana em dias úteis (Segunda, Quarta, Sexta).
    - **Código TUSS Padrão**: `50000160` (Fisioterapia Musculoesquelética).
    - **Automação de Documento**: Ao emitir a nota, o sistema oferece a geração simultânea do "Relatório de Atendimento" técnico com linguagem clínica apropriada para as operadoras.
26. **Gatilhos de Faturamento (Ciclo de 10 Sessões)**:
    - O sistema monitora o contador de sessões finalizadas.
    - **Notificação Compulsória**: Ao atingir a 10ª sessão (e múltiplos de 10), o time administrativo/financeiro (admins) recebe uma notificação automática.
    - **Ações Fiscais**: O sistema oferece a opção de emitir a NFS-e imediatamente ou criar uma tarefa pendente para faturamento posterior.

---

## 🔒 Segurança e Dados Sensíveis (LGPD)

1.  **Dados Biomecânicos**: Vídeos e imagens de análise biomecânica são considerados dados de saúde sensíveis e devem ser armazenados de forma privada no Cloudflare R2 com acesso via URLs assinadas.
2.  **Assinatura Digital**: Relatórios clínicos certificados não podem ser editados após a assinatura para garantir integridade jurídica.

---

## 💰 Modelo de Cobrança

1.  **Atendimento Particular**: O sistema foca em planos de tratamento particulares, pacotes de sessões e pagamentos avulsos.
2.  **NFS-e**: A emissão de notas fiscais é realizada de forma direta via integração mTLS com a prefeitura (ex: São Paulo), utilizando o Certificado Digital e-CNPJ A1 do prestador, eliminando dependências de gateways pagos (como Focus NFe).

---

**Última Atualização:** Maio de 2026
