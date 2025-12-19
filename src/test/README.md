# Suite de Testes - FisioFlow

## Estrutura de Testes

```
src/test/
├── setup.ts                    # Configuração global do Vitest
├── utils/
│   └── testHelpers.ts          # Utilitários e mocks reutilizáveis
├── appointments/
│   └── appointments.test.ts    # Testes de agendamentos
├── patients/
│   └── patients.test.ts        # Testes de pacientes
├── transactions/
│   └── transactions.test.ts    # Testes de transações
├── integration/
│   └── workflow.test.ts        # Testes de integração
└── README.md                   # Este arquivo
```

## Executando os Testes

```bash
# Executar todos os testes
npm run test

# Executar testes em modo watch
npm run test:watch

# Executar testes com cobertura
npm run test:coverage

# Executar testes com UI
npm run test:ui
```

## Cobertura de Código

### Validações (src/lib/validations/)
- ✅ CPF - Formato e dígitos verificadores
- ✅ Email - Formato válido
- ✅ Telefone - Formatos brasileiros
- ✅ Horário - Formato HH:MM
- ✅ UUID - Formato válido
- ✅ Datas - Futuras e intervalos
- ✅ Valores monetários - Positivos e não negativos
- ✅ Sanitização de strings

### Agendamentos (appointments)
- ✅ Criação com dados válidos
- ✅ Validação de campos obrigatórios
- ✅ Verificação de conflitos de horário
- ✅ Cálculo de sobreposição de horários
- ✅ Atualização de agendamentos
- ✅ Cancelamento com motivo
- ✅ Mudança de fisioterapeuta

### Pacientes (patients)
- ✅ Criação com dados completos
- ✅ Criação com dados mínimos
- ✅ Validação de CPF
- ✅ Validação de email
- ✅ Validação de telefone
- ✅ Detecção de duplicatas (CPF/email)
- ✅ Atualização de dados
- ✅ Busca por nome

### Transações (transactions)
- ✅ Criação de receita
- ✅ Criação de despesa
- ✅ Vínculo com agendamento
- ✅ Cálculo de valores
- ✅ Aplicação de descontos
- ✅ Atualização de status
- ✅ Relatórios financeiros
- ✅ Identificação de vencidos

### Testes de Integração
- ✅ Agendamento + Transação + Notificação
- ✅ Editar Agendamento + Atualizar Calendário
- ✅ Cancelar + Lista de Espera
- ✅ Fluxo de Pagamento

## Mocks

### Mock do Supabase
O arquivo `setup.ts` configura mocks globais para:
- `supabase.auth` - Autenticação
- `supabase.from()` - Queries
- `supabase.rpc()` - Stored procedures
- `supabase.channel()` - Realtime

### Helpers de Teste
O arquivo `testHelpers.ts` fornece:
- Geradores de dados mock (patients, appointments, transactions)
- Builders de resposta Supabase
- Arrays de dados válidos/inválidos para validação
- Utilitários de data/hora

## Convenções

### Nomenclatura
- Arquivos: `[feature].test.ts`
- Describes: Nome do módulo ou feature
- Its: Comportamento esperado em português

### Estrutura de Teste
```typescript
describe('Feature', () => {
  beforeEach(() => {
    // Setup
  });

  afterEach(() => {
    // Cleanup
  });

  it('deve fazer algo específico', async () => {
    // Arrange
    // Act
    // Assert
  });
});
```

## Métricas de Qualidade

- **Cobertura mínima**: 80%
- **Happy paths**: Todos cobertos
- **Casos de erro**: Principais cobertos
- **Testes de integração**: Fluxos críticos

## Adicionando Novos Testes

1. Crie o arquivo em `src/test/[feature]/[feature].test.ts`
2. Importe helpers de `../utils/testHelpers`
3. Use mocks do setup global
4. Siga as convenções de nomenclatura
5. Execute `npm run test:coverage` para verificar cobertura
