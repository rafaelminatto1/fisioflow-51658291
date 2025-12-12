# Planejamento de Implementação - Baseado no SeuFisio

Este documento contém o planejamento completo de funcionalidades a serem implementadas no FisioFlow, baseado na análise do sistema SeuFisio.

---

## ✅ FASE 1: Modal de Agendamento (PRIORIDADE ALTA)
**Status: Completo**

- [x] Refatorar modal para layout com Tabs (Informações, Pagamento, Opções)
- [x] Exibir informações resumidas do paciente selecionado
- [x] Organizar campos de forma mais compacta
- [x] Seleção de sala para atendimento
- [x] Status visual com cores
- [x] Adicionar seleção de equipamentos/aparelhos (laser, ultrassom, TENS, etc.)
- [x] Parâmetros de equipamentos com templates
- [x] Duplicar atendimento (data única, múltiplas datas, semanal)
- [x] Inserir lembrete personalizado (WhatsApp, Email, Push)
- [ ] Mover para pacote personalizado

---

## 📋 FASE 2: Gestão de Cadastros Gerais
**Status: Completo**

### 2.1 Tabela de Preços
- [x] CRUD de serviços (Fisioterapia, Pilates, etc.)
- [x] Configurar duração padrão por serviço
- [x] Tipo de cobrança (Unitário, Mensal, Pacote)
- [x] Centro de custo por serviço
- [x] Valor unitário/mensal
- [x] Permitir agendamento online por serviço

### 2.2 Modelos de Atestados
- [x] CRUD de templates de atestados
- [x] Sistema de variáveis dinâmicas:
  - `#cliente-nome`
  - `#cliente-cpf`
  - `#data-hoje`
  - `#hora-atual`
  - `#clinica-cidade`
  - `#profissional-nome`
- [ ] Geração de PDF do atestado

### 2.3 Modelos de Contratos
- [x] CRUD de templates de contratos
- [x] Variáveis dinâmicas para personalização
- [ ] Geração de PDF do contrato

### 2.4 Gestão de Fornecedores
- [x] CRUD de fornecedores (PJ/PF)
- [x] Campos: Razão Social, CNPJ/CPF, Contato, Endereço
- [ ] Vincular a contas a pagar

### 2.5 Gestão de Feriados
- [x] Pré-popular feriados nacionais
- [x] Feriados estaduais/municipais configuráveis
- [x] Integrar com bloqueio automático da agenda

---

## 🏥 FASE 3: Cadastros Clínicos
**Status: Planejado**

### 3.1 Padrão de Evolução
- [ ] Templates de evolução por tipo (Fisioterapia, Pilates)
- [ ] Editor rico para descrição
- [ ] Associar a tipo de atendimento

### 3.2 Fichas de Avaliação Personalizáveis
- [ ] Interface drag-and-drop para montar fichas
- [ ] Tipos de campos:
  - Resposta curta (uma linha)
  - Resposta longa (texto)
  - Lista (múltipla escolha)
  - Opção única (radio)
  - Seleção (dropdown)
- [ ] Organizar em grupos de perguntas
- [ ] Pré-visualização da ficha
- [ ] Fichas padrão: Anamnese, Avaliação Postural

### 3.3 Prontuários Clicáveis
- [ ] Formulários dinâmicos baseados nas fichas
- [ ] Evolução de Pilates (Power House, Dor, etc.)
- [ ] Escala de dor interativa (1-10)
- [ ] Checklist de exercícios (Alongamento, Fortalecimento, Mobilidade)

### 3.4 Interesses/Objetivos do Paciente
- [ ] CRUD de objetivos (Alongamento, Emagrecimento, Postura)
- [ ] Associar objetivos ao paciente
- [ ] Exibir em todas as evoluções/sessões

---

## 💰 FASE 4: Financeiro Avançado
**Status: Planejado**

### 4.1 Contas a Receber
- [ ] Listagem com filtros (Abertas, Pagas, Todas)
- [ ] Ordenação por data de vencimento
- [ ] Ações em lote (Quitar, Marcar NFS-e, Excluir)
- [ ] Resumo: quantidade, atrasados, hoje, futuros, total
- [ ] Filtro por cliente, serviço, data

### 4.2 Contas a Pagar
- [ ] CRUD de contas a pagar
- [ ] Despesas recorrentes
- [ ] Categorias de despesas
- [ ] Resumo de pagamentos (atrasados, hoje, futuros)

### 4.3 Emissão de Recibos
- [ ] Formulário de emissão
- [ ] Personalizar dados (CPF/CNPJ)
- [ ] Emitir em nome do profissional ou clínica
- [ ] Opção de recibo assinado
- [ ] Logo do studio/clínica
- [ ] Exportar PDF

### 4.4 Pagamento de Comissões
- [ ] Filtrar por profissional e período
- [ ] Calcular comissão por atendimento
- [ ] Descontar taxas
- [ ] Comissões personalizadas

### 4.5 Fluxo de Caixa
- [ ] Visão mensal/trimestral/semestral
- [ ] Saldo anterior, entradas, saídas, saldo final
- [ ] Entradas/saídas previstas
- [ ] Extrato resumido por data
- [ ] Exportar PDF/CSV

### 4.6 Demonstrativo Financeiro Mensal (Raio-X)
- [ ] Visão anual com crédito/débito/resultado por mês
- [ ] Filtros: forma de entrada/saída, centro de custo
- [ ] Detalhamento por conta
- [ ] Resumo de clientes: atendimentos, recebidos, a receber
- [ ] Comparativo com mês anterior
- [ ] Exportar PDF/CSV

### 4.7 Caixa Diário
- [ ] Filtro por data, usuário, forma de pagamento
- [ ] Listagem de movimentações do dia
- [ ] Resumo por forma de pagamento
- [ ] Total de entradas e saídas

### 4.8 Simulador de Receitas Fixas
- [ ] Projeção de rentabilidade mensal
- [ ] Baseado em clientes fixos/recorrentes
- [ ] Ajustar quantidades e valores para simulação
- [ ] Comparar atual vs. previsto

---

## 📊 FASE 5: Relatórios
**Status: Planejado**

### 5.1 Relatório de Aniversariantes
- [ ] Listagem por mês
- [ ] Nome, dia, idade
- [ ] Filtros por período

### 5.2 Relatório de Clientes
- [ ] Filtros: gênero, tipo, idade, status
- [ ] Dados: CPF, nascimento, profissão, contato
- [ ] Informações adicionais: procedência, endereço
- [ ] Observações e etiquetas
- [ ] Exportar PDF/CSV

### 5.3 Relatório de Retenção e Cancelamento
- [ ] Possíveis renovações
- [ ] Renovações realizadas
- [ ] Cancelamentos
- [ ] Taxa de conversão

### 5.4 Análises Gerenciais
- [ ] Prospecções e alunos reativados
- [ ] Aulas experimentais (agendadas vs realizadas)
- [ ] Métricas de conversão

---

## 📈 FASE 6: Marketing/CRM
**Status: Planejado**

### 6.1 Cadastro de Leads/Prospecções
- [ ] CRUD de leads
- [ ] Campos: nome, telefone, origem, observações
- [ ] Estágio do lead (aguardando, em contato, etc.)
- [ ] Histórico de atendimentos

### 6.2 Funil de Vendas
- [ ] Visão Kanban: Aguardando → Em Contato → Avaliação → Efetivado/Não Efetivado
- [ ] Filtros por responsável e período
- [ ] Métricas por estágio

### 6.3 Indicadores e Métricas
- [ ] Contatos realizados vs efetivados
- [ ] Taxa de conversão e perdas
- [ ] Contatos por origem/procedência
- [ ] Indicações por responsável
- [ ] Motivos de não efetivação
- [ ] Gráficos de análise

---

## 🔧 Melhorias Técnicas (Paralelo)

- [ ] PWA: melhorar cache offline
- [ ] Performance: lazy loading de módulos
- [ ] Testes: aumentar cobertura e2e
- [ ] Segurança: revisar RLS policies
- [ ] LGPD: finalizar conformidade

---

## Priorização Sugerida

| Prioridade | Fase | Justificativa |
|------------|------|---------------|
| 🔴 Alta | Fase 1 | Modal é core do sistema |
| 🔴 Alta | Fase 4.1-4.2 | Financeiro essencial para operação |
| 🟡 Média | Fase 2.1 | Tabela de preços simplifica agendamento |
| 🟡 Média | Fase 3.2-3.3 | Fichas e prontuários são diferencial clínico |
| 🟢 Baixa | Fase 5-6 | Relatórios e CRM são valor agregado |

---

*Última atualização: Dezembro 2025*
