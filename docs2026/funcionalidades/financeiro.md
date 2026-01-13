# Funcionalidade: Gestão Financeira

## Visão Geral

Sistema financeiro completo para controle de receitas, despesas, pagamentos e relatórios financeiros.

## Recursos

- ✅ Controle de receitas e despesas
- ✅ Gestão de convênios
- ✅ Emissão de recibos
- ✅ Fluxo de caixa
- ✅ Demonstrativo mensal
- ✅ Simulador de receitas
- ✅ Relatórios financeiros

## Tipos de Transação

- `income` - Receita
- `expense` - Despesa

## Status

- `pending` - Pendente
- `completed` - Concluído
- `cancelled` - Cancelado

## Formas de Pagamento

- Dinheiro (cash)
- Cartão de crédito
- Cartão de débito
- PIX
- Transferência bancária

## Páginas

- `/financial` - Dashboard financeiro
- `/financial/accounts` - Contas bancárias
- `/financial/fluxo-caixa` - Fluxo de caixa
- `/financial/demonstrativo` - Demonstrativo mensal
- `/financial/simulador` - Simulador de receitas

## Componentes

- `TransactionList` - Lista de transações
- `TransactionForm` - Formulário de transação
- `FinancialDashboard` - Dashboard financeiro
- `ReceiptGenerator` - Gerador de recibos

## API

```typescript
// GET /financial_transactions
const { data } = await supabase
  .from('financial_transactions')
  .select('*')
  .gte('created_at', startDate)
  .lte('created_at', endDate);

// POST /financial_transactions
const { data } = await supabase.from('financial_transactions').insert({
  type: 'income',
  amount: 150,
  description: 'Consulta',
  category: 'consulta',
  payment_method: 'pix',
});
```

## Veja Também

- [Agenda](./agenda.md) - Pagamentos de consultas
- [Relatórios](./relatorios.md) - Relatórios financeiros
