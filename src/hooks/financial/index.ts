/**
 * FisioFlow - Financial Hooks
 * 
 * Este módulo centraliza todos os hooks relacionados a finanças.
 * Os arquivos originais permanecem em src/hooks/ para compatibilidade.
 * 
 * @module hooks/financial
 */

// ============================================================================
// Core Financial Hooks
// ============================================================================

// Hook principal de finanças
export { useFinancial } from '../useFinancial';

// Hook de exportação financeira
export { useFinancialExport } from '../useFinancialExport';

// ============================================================================
// Accounts Hooks
// ============================================================================

// Hook de contas a pagar/receber
export { 
  useContasFinanceiras, 
  useCreateContaFinanceira, 
  useUpdateContaFinanceira, 
  useDeleteContaFinanceira,
  useResumoFinanceiro 
} from '../useContasFinanceiras';

// ============================================================================
// Cash Flow Hooks
// ============================================================================

// Hook de fluxo de caixa
export { useFluxoCaixa } from '../useFluxoCaixa';

// ============================================================================
// Payment Hooks
// ============================================================================

// Hook de pagamentos
export { usePagamentos } from '../usePagamentos';

// Hook de formas de pagamento
export { 
  useFormasPagamento, 
  useCreateFormaPagamento, 
  useUpdateFormaPagamento, 
  useDeleteFormaPagamento 
} from '../useFormasPagamento';

// ============================================================================
// Receipts Hooks
// ============================================================================

// Hook de recibos
export { useRecibos, useCreateRecibo } from '../useRecibos';

// Hook de gerador de recibos
export { useReceiptGenerator } from '../useReceiptGenerator';

// ============================================================================
// Suppliers Hooks
// ============================================================================

// Hook de fornecedores
export { 
  useFornecedores, 
  useCreateFornecedor, 
  useUpdateFornecedor, 
  useDeleteFornecedor 
} from '../useFornecedores';

// ============================================================================
// Cost Centers Hooks
// ============================================================================

// Hook de centros de custo
export { useCentrosCusto } from '../useCentrosCusto';

// ============================================================================
// Transactions Hooks
// ============================================================================

// Hook de transações
export { 
  useTransacoes, 
  useCreateTransacao, 
  useUpdateTransacao, 
  useDeleteTransacao 
} from '../useTransacoes';

// ============================================================================
// Export Hooks
// ============================================================================

// Hook de exportação de dados
export { useDataExport } from '../useDataExport';

// Hook de exportação Excel
export { useExcelExport } from '../useExcelExport';

// ============================================================================
// Event Financial Hooks
// ============================================================================

// Hook de relatório financeiro de eventos
export { useEventoFinancialReport } from '../useEventoFinancialReport';

// ============================================================================
// Partner Companies Hooks
// ============================================================================

export { 
  useEmpresasParceiras, 
  useCreateEmpresaParceira, 
  useUpdateEmpresaParceira, 
  useDeleteEmpresaParceira 
} from '../useEmpresasParceiras';

// ============================================================================
// Convenios Hooks
// ============================================================================

export { useConvenios } from '../useConvenios';