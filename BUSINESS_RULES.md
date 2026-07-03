# ⚖️ FisioFlow - Regras de Negócio (Business Rules)

Este documento centraliza as premissas e restrições de negócio do FisioFlow. Todo agente deve seguir estas regras rigorosamente.

---

## 🏥 Atendimento Particular e Ciclo de Sessões (Billing Rules)

### 🚫 Regra de Ouro: Sem Atendimento por Convênios Médicos
O FisioFlow é projetado exclusivamente para atendimento particular (out-of-pocket). Não há suporte para faturamento por guias de convênios, tabelas TISS, ou qualquer trâmite administrativo com operadoras de planos de saúde.

### 💰 Faturamento de Planos de Tratamento e Pacotes
O fluxo financeiro baseia-se estritamente em pacotes de tratamento e sessões particulares avulsas de atendimento individualizado:
1. **Cobrança por Pacotes:** Planos de tratamento recorrentes (comumente fechados em ciclos de 10 sessões) constituem o núcleo financeiro da clínica.
2. **Gatilhos de Faturamento (Ciclo de 10 Sessões):**
    - O sistema monitora o contador de sessões particulares finalizadas de cada paciente.
    - **Notificação Administrativa:** Ao atingir a 10ª sessão (e múltiplos de 10), o time administrativo recebe uma notificação automática para faturamento de renovação do plano de tratamento.
    - **Emissão Fiscal (NFS-e):** O sistema oferece a opção de emitir a NFS-e correspondente de forma direta.


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
