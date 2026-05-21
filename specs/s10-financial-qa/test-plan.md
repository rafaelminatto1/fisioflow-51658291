# S10 — Test Plan Financeiro (PT-BR)

**Branch**: `feat/s10-financial-qa`
**Criado**: 2026-05-21
**Objetivo**: validar os 9 fluxos críticos do módulo financeiro end-to-end em produção, identificar bugs reais, abrir issues/fixes.

## Pré-requisitos
- ✅ Login admin em `https://www.moocafisio.com.br`
- ✅ Pelo menos 1 paciente cadastrado
- ✅ Backend deployed (S7 + S9 fixes)
- ⚠️ Certificado A1 NFS-e SP (mTLS) — bloqueia testes reais; staging fica mock
- ⚠️ Template WhatsApp `recibo_paciente` aprovado pela Meta — bloqueia envio real

## Fluxos a validar

| # | Fluxo | Rotas backend | Componentes | Status |
|---|---|---|---|---|
| **F1** | Listar transações (receitas/despesas) | `GET /api/financial/transactions` | `FinancialDashboard.tsx` | pending |
| **F2** | Criar transação manual | `POST /api/financial/transactions` | `TransactionModal.tsx` | pending |
| **F3** | Gerar recibo PDF | `GET /api/recibos/:id` + `ReciboPDF` | `RecibosPage.tsx` + `ReceiptGenerator.tsx` | pending |
| **F4** | Gerar QR Code PIX | `GET /api/recibos/:id/pix-qr` | `ReceiptGenerator.tsx` | pending |
| **F5** | Enviar recibo via WhatsApp | `POST /api/recibos/:id/send-whatsapp` | `ReceiptGenerator.tsx` | pending |
| **F6** | Emitir NFS-e individual | `POST /api/nfse/generate` + `/api/nfse/send/:id` | `NFSeContent.tsx` + `NfseWizard.tsx` | pending |
| **F7** | Emitir NFS-e em lote | `POST /api/nfse/batch` + queue `GENERATE_NFSE` | `NfseBatchEmitter.tsx` | pending |
| **F8** | Dashboard de comissões | `GET /api/commissions/*` | `CommissionsDashboard.tsx` | pending |
| **F9** | DRE + Fluxo de Caixa | `GET /api/financial-analytics/*` | `FinancialDRE.tsx` + `CashFlow.tsx` | pending |

## Critério de PASS

Cada fluxo:
1. **HTTP 2xx** ou erro tratado com mensagem clara (não 5xx, não exception no console)
2. **UI responde** sem travar (loading state, depois resultado)
3. **Dados persistem** (recarregar página → continuam lá)
4. **Permissões corretas** (admin vê tudo, fisio vê só o dele)

## Critério de FAIL (= cria issue/PR)

- HTTP 5xx
- Exception no console JS
- Dados não persistem
- Cálculo incorreto (somatório, juros, comissão)
- Documento gerado vazio ou malformado

## Como executar

Sem chrome-devtools MCP (desconectado), QA será:
1. **Eu**: query Analytics Engine → identifica rotas que dão 5xx ou latência ruim
2. **Eu**: code review estático de cada componente + endpoint procurando bugs óbvios
3. **Você**: navega manualmente em prod, executa cada fluxo, me reporta resultado
4. **Eu**: abre fix PR pra cada bug confirmado

## Resultado esperado

`specs/s10-financial-qa/results.md` com matriz fluxo × resultado + links PRs/issues.
