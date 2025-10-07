export const testUsers = {
  admin: {
    email: 'admin@activityfisio.com',
    password: 'Admin@123',
  },
  fisio: {
    email: 'fisio@activityfisio.com',
    password: 'Fisio@123',
  },
  estagiario: {
    email: 'estagiario@activityfisio.com',
    password: 'Estagiario@123',
  },
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
