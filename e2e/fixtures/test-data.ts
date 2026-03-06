export const testUsers = {
  admin: {
    email: process.env.E2E_LOGIN_EMAIL || 'rafael.minatto@yahoo.com.br',
    password: process.env.E2E_LOGIN_PASSWORD || 'Yukari30@',
    role: 'admin',
    expectedOrganizationId: '00000000-0000-0000-0000-000000000001',
  },
  fisio: {
    email: 'rafael.minatto@yahoo.com.br',
    password: 'Yukari30@',
    role: 'fisioterapeuta',
    expectedOrganizationId: '00000000-0000-0000-0000-000000000001',
  },
  estagiario: {
    email: 'teste@moocafisio.com.br',
    password: 'Yukari3030@',
    role: 'estagiario',
    expectedOrganizationId: null,
  },
  // User for specialized tests
  rafael: {
    email: 'rafael.minatto@yahoo.com.br',
    password: 'Yukari30@',
    role: 'professional',
    expectedOrganizationId: '00000000-0000-0000-0000-000000000001',
  },
};

// Dados de teste para organização
export const testOrganization = {
  name: 'FisioFlow',
  slug: 'fisioflow',
};

export const testEvento = {
  nome: 'Corrida Teste E2E',
  descricao: 'Evento criado automaticamente para testes',
  categoria: 'corrida',
  local: 'Parque Ibirapuera',
  dataInicio: '2025-12-01',
  dataFim: '2025-12-01',
  gratuito: false,
  linkWhatsApp: 'https://wa.me/5511999999999',
  valorPadraoPrestador: 150.0,
};

export const testPrestador = {
  nome: 'João Silva',
  contato: 'joao@example.com',
  cpfCnpj: '123.456.789-00',
  valorAcordado: 200.0,
  statusPagamento: 'PENDENTE',
};

export const testChecklistItem = {
  titulo: 'Tendas',
  tipo: 'alugar',
  quantidade: 5,
  custoUnitario: 100.0,
};

export const testParticipante = {
  nome: 'Maria Santos',
  contato: 'maria@example.com',
  instagram: '@mariasantos',
  seguePerfil: true,
  observacoes: 'Primeira vez no evento',
};
