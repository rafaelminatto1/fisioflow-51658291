import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Types
export interface ExcelColumn {
  header: string;
  key: string;
  width?: number;
  type?: 'string' | 'number' | 'currency' | 'date' | 'percentage';
  format?: string;
}

export interface ExcelSheet {
  name: string;
  title?: string;
  data: Record<string, any>[];
  columns: ExcelColumn[];
  includeHeader?: boolean;
}

export interface ExcelExportOptions {
  filename: string;
  sheets: ExcelSheet[];
  includeGenerationDate?: boolean;
  clinicName?: string;
}

// Styling constants - xlsx-style não está disponível, mas podemos definir configurações
const HEADER_STYLE = {
  fill: { fgColor: { rgb: '5034FF' } },
  font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 12 },
  alignment: { horizontal: 'center', vertical: 'center' }
};

const TITLE_STYLE = {
  font: { bold: true, sz: 14 },
  alignment: { horizontal: 'center' }
};

const ALTERNATE_ROW_STYLE = {
  fill: { fgColor: { rgb: 'F5F5F5' } }
};

/**
 * Formata valor para exibição no Excel
 */
const formatValue = (value: any, type?: ExcelColumn['type']): string | number => {
  if (value === null || value === undefined) return '';
  
  switch (type) {
    case 'currency':
      if (typeof value === 'number') {
        return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
      return value;
    case 'date':
      if (value instanceof Date) {
        return format(value, 'dd/MM/yyyy', { locale: ptBR });
      }
      if (typeof value === 'string' && value) {
        try {
          return format(new Date(value), 'dd/MM/yyyy', { locale: ptBR });
        } catch {
          return value;
        }
      }
      return value;
    case 'percentage':
      if (typeof value === 'number') {
        return `${value.toFixed(1)}%`;
      }
      return `${value}%`;
    case 'number':
      if (typeof value === 'number') {
        return value.toLocaleString('pt-BR');
      }
      return value;
    default:
      return value;
  }
};

/**
 * Cria cabeçalho com título e informações do relatório
 */
const createReportHeader = (
  title: string, 
  clinicName?: string,
  includeDate?: boolean
): string[][] => {
  const header: string[][] = [];
  
  if (clinicName) {
    header.push([clinicName]);
    header.push(['']);
  }
  
  header.push([title]);
  
  if (includeDate) {
    header.push([`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`]);
  }
  
  header.push(['']); // Empty row separator
  
  return header;
};

/**
 * Converte dados para formato de matriz do xlsx
 */
const dataToAoa = (
  data: Record<string, any>[], 
  columns: ExcelColumn[],
  includeHeader: boolean = true
): any[][] => {
  const result: any[][] = [];
  
  // Add headers
  if (includeHeader) {
    result.push(columns.map(col => col.header));
  }
  
  // Add data rows
  data.forEach(row => {
    const rowData = columns.map(col => formatValue(row[col.key], col.type));
    result.push(rowData);
  });
  
  return result;
};

/**
 * Define largura das colunas automaticamente
 */
const setColumnWidths = (ws: XLSX.WorkSheet, columns: ExcelColumn[], data: any[][]) => {
  const colWidths: XLSX.ColInfo[] = columns.map((col, index) => {
    if (col.width) {
      return { wch: col.width };
    }
    
    // Calculate max width based on content
    let maxWidth = col.header.length;
    data.forEach(row => {
      const cellValue = String(row[index] || '');
      maxWidth = Math.max(maxWidth, cellValue.length);
    });
    
    // Add some padding
    return { wch: Math.min(maxWidth + 2, 50) };
  });
  
  ws['!cols'] = colWidths;
};

/**
 * Exporta dados para Excel com múltiplas abas
 */
export const exportToExcel = async (options: ExcelExportOptions): Promise<void> => {
  const { filename, sheets, includeGenerationDate = true, clinicName = 'FisioFlow' } = options;
  
  const wb = XLSX.utils.book_new();
  
  sheets.forEach(sheet => {
    const headerRows = sheet.title 
      ? createReportHeader(sheet.title, clinicName, includeGenerationDate)
      : [];
    
    const dataAoa = dataToAoa(sheet.data, sheet.columns, sheet.includeHeader !== false);
    const allData = [...headerRows, ...dataAoa];
    
    const ws = XLSX.utils.aoa_to_sheet(allData);
    
    // Set column widths
    setColumnWidths(ws, sheet.columns, dataAoa);
    
    // Add to workbook
    XLSX.utils.book_append_sheet(wb, ws, sheet.name.slice(0, 31)); // Excel sheet names max 31 chars
  });
  
  // Generate filename with date
  const dateStr = format(new Date(), 'yyyy-MM-dd');
  const fullFilename = `fisioflow_${filename}_${dateStr}.xlsx`;
  
  // Write file
  XLSX.writeFile(wb, fullFilename);
};

// ============= Exportadores específicos =============

/**
 * Exportar relatório de ocupação dos fisioterapeutas
 */
export interface TherapistOccupancyExportData {
  ocupacaoMedia: number;
  totalConsultasHoje: number;
  totalHorasTrabalhadas: number;
  fisioterapeutasAtivos: number;
  therapists: Array<{
    id: string;
    name: string;
    consultasHoje: number;
    horasTrabalhadas: number;
    capacidadeHoras: number;
    taxaOcupacao: number;
    status: string;
  }>;
}

export const exportOccupancyReport = async (data: TherapistOccupancyExportData) => {
  const summaryData = [
    { 
      metrica: 'Ocupação Média', 
      valor: `${data.ocupacaoMedia}%` 
    },
    { 
      metrica: 'Total de Consultas Hoje', 
      valor: data.totalConsultasHoje 
    },
    { 
      metrica: 'Horas Trabalhadas', 
      valor: `${data.totalHorasTrabalhadas}h` 
    },
    { 
      metrica: 'Fisioterapeutas Ativos', 
      valor: data.fisioterapeutasAtivos 
    }
  ];

  const detailData = data.therapists.map(t => ({
    fisioterapeuta: t.name,
    consultas: t.consultasHoje,
    horasTrabalhadas: t.horasTrabalhadas,
    capacidade: t.capacidadeHoras,
    ocupacao: t.taxaOcupacao,
    status: t.status === 'otimo' ? 'Ótimo' : t.status === 'bom' ? 'Bom' : 'Baixo'
  }));

  await exportToExcel({
    filename: 'ocupacao',
    sheets: [
      {
        name: 'Resumo',
        title: 'Relatório de Ocupação - Resumo',
        data: summaryData,
        columns: [
          { header: 'Métrica', key: 'metrica', width: 25 },
          { header: 'Valor', key: 'valor', width: 20 }
        ]
      },
      {
        name: 'Detalhamento',
        title: 'Ocupação por Fisioterapeuta',
        data: detailData,
        columns: [
          { header: 'Fisioterapeuta', key: 'fisioterapeuta', width: 30 },
          { header: 'Consultas', key: 'consultas', type: 'number', width: 12 },
          { header: 'Horas Trabalhadas', key: 'horasTrabalhadas', type: 'number', width: 18 },
          { header: 'Capacidade (h)', key: 'capacidade', type: 'number', width: 15 },
          { header: 'Ocupação (%)', key: 'ocupacao', type: 'percentage', width: 15 },
          { header: 'Status', key: 'status', width: 12 }
        ]
      }
    ]
  });
};

/**
 * Exportar relatório de comparecimento
 */
export interface AttendanceExportData {
  totalAppointments: number;
  attended: number;
  noShow: number;
  cancelled: number;
  attendanceRate: number;
  cancellationRate: number;
  therapistData: Array<{
    name: string;
    total: number;
    attended: number;
    noShow: number;
    cancelled: number;
    attendanceRate: number;
  }>;
  appointments: Array<{
    patientName: string;
    patientPhone?: string;
    date: string;
    time: string;
    therapistName: string;
    status: string;
    notes?: string;
  }>;
}

export const exportAttendanceReport = async (data: AttendanceExportData) => {
  const summaryData = [
    { metrica: 'Total de Agendamentos', valor: data.totalAppointments },
    { metrica: 'Comparecimentos', valor: data.attended },
    { metrica: 'Faltas', valor: data.noShow },
    { metrica: 'Cancelamentos', valor: data.cancelled },
    { metrica: 'Taxa de Comparecimento', valor: `${data.attendanceRate}%` },
    { metrica: 'Taxa de Cancelamento', valor: `${data.cancellationRate}%` }
  ];

  const therapistExportData = data.therapistData.map(t => ({
    fisioterapeuta: t.name,
    total: t.total,
    realizados: t.attended,
    faltas: t.noShow,
    cancelados: t.cancelled,
    taxaComparecimento: t.attendanceRate
  }));

  const statusMap: Record<string, string> = {
    'concluido': 'Realizado',
    'faltou': 'Faltou',
    'cancelado': 'Cancelado',
    'agendado': 'Agendado',
    'confirmado': 'Confirmado'
  };

  const appointmentExportData = data.appointments.map(a => ({
    paciente: a.patientName,
    telefone: a.patientPhone || '-',
    data: a.date,
    horario: a.time,
    fisioterapeuta: a.therapistName || '-',
    status: statusMap[a.status] || a.status,
    observacoes: a.notes || '-'
  }));

  await exportToExcel({
    filename: 'comparecimento',
    sheets: [
      {
        name: 'Resumo',
        title: 'Relatório de Comparecimento - Resumo',
        data: summaryData,
        columns: [
          { header: 'Métrica', key: 'metrica', width: 25 },
          { header: 'Valor', key: 'valor', width: 20 }
        ]
      },
      {
        name: 'Por Fisioterapeuta',
        title: 'Comparecimento por Fisioterapeuta',
        data: therapistExportData,
        columns: [
          { header: 'Fisioterapeuta', key: 'fisioterapeuta', width: 30 },
          { header: 'Total', key: 'total', type: 'number', width: 10 },
          { header: 'Realizados', key: 'realizados', type: 'number', width: 12 },
          { header: 'Faltas', key: 'faltas', type: 'number', width: 10 },
          { header: 'Cancelados', key: 'cancelados', type: 'number', width: 12 },
          { header: 'Taxa (%)', key: 'taxaComparecimento', type: 'percentage', width: 12 }
        ]
      },
      {
        name: 'Detalhamento',
        title: 'Detalhamento de Agendamentos',
        data: appointmentExportData,
        columns: [
          { header: 'Paciente', key: 'paciente', width: 25 },
          { header: 'Telefone', key: 'telefone', width: 15 },
          { header: 'Data', key: 'data', width: 12 },
          { header: 'Horário', key: 'horario', width: 10 },
          { header: 'Fisioterapeuta', key: 'fisioterapeuta', width: 25 },
          { header: 'Status', key: 'status', width: 12 },
          { header: 'Observações', key: 'observacoes', width: 30 }
        ]
      }
    ]
  });
};

/**
 * Exportar relatório de performance da equipe
 */
export interface TeamPerformanceExportData {
  totalRevenue: number;
  averageTicket: number;
  retentionRate: number;
  averageNps: number;
  therapists: Array<{
    id: string;
    name: string;
    revenue: number;
    sessions: number;
    retentionRate: number;
    nps: number;
    score: number;
    rank: number;
  }>;
}

export const exportTeamPerformance = async (data: TeamPerformanceExportData) => {
  const summaryData = [
    { metrica: 'Receita Total', valor: data.totalRevenue },
    { metrica: 'Ticket Médio', valor: data.averageTicket },
    { metrica: 'Taxa de Retenção', valor: `${data.retentionRate}%` },
    { metrica: 'NPS Médio', valor: data.averageNps }
  ];

  const top3Data = data.therapists.slice(0, 3).map((t, i) => ({
    posicao: `${i + 1}º Lugar`,
    fisioterapeuta: t.name,
    receita: t.revenue,
    score: t.score
  }));

  const revenueData = data.therapists.map(t => ({
    posicao: t.rank,
    fisioterapeuta: t.name,
    receita: t.revenue,
    sessoes: t.sessions,
    score: t.score
  }));

  const retentionData = data.therapists.map(t => ({
    fisioterapeuta: t.name,
    taxaRetencao: t.retentionRate,
    pacientesAtendidos: t.sessions
  }));

  const sessionsData = data.therapists.map(t => ({
    fisioterapeuta: t.name,
    sessoesConcluidas: t.sessions,
    receitaGerada: t.revenue
  }));

  const rawData = data.therapists.map(t => ({
    id: t.id,
    nome: t.name,
    receita: t.revenue,
    sessoes: t.sessions,
    retencao: t.retentionRate,
    nps: t.nps,
    score: t.score,
    ranking: t.rank
  }));

  await exportToExcel({
    filename: 'performance_equipe',
    sheets: [
      {
        name: 'Resumo Executivo',
        title: 'Relatório de Performance da Equipe',
        data: summaryData,
        columns: [
          { header: 'Métrica', key: 'metrica', width: 25 },
          { header: 'Valor', key: 'valor', width: 20 }
        ]
      },
      {
        name: 'Top 3',
        title: 'Top 3 Fisioterapeutas',
        data: top3Data,
        columns: [
          { header: 'Posição', key: 'posicao', width: 15 },
          { header: 'Fisioterapeuta', key: 'fisioterapeuta', width: 30 },
          { header: 'Receita', key: 'receita', type: 'currency', width: 20 },
          { header: 'Score', key: 'score', type: 'number', width: 12 }
        ]
      },
      {
        name: 'Receita',
        title: 'Receita por Fisioterapeuta',
        data: revenueData,
        columns: [
          { header: 'Posição', key: 'posicao', type: 'number', width: 10 },
          { header: 'Fisioterapeuta', key: 'fisioterapeuta', width: 30 },
          { header: 'Receita', key: 'receita', type: 'currency', width: 20 },
          { header: 'Sessões', key: 'sessoes', type: 'number', width: 12 },
          { header: 'Score', key: 'score', type: 'number', width: 12 }
        ]
      },
      {
        name: 'Taxa de Retenção',
        title: 'Taxa de Retenção por Fisioterapeuta',
        data: retentionData,
        columns: [
          { header: 'Fisioterapeuta', key: 'fisioterapeuta', width: 30 },
          { header: 'Taxa de Retenção (%)', key: 'taxaRetencao', type: 'percentage', width: 20 },
          { header: 'Pacientes Atendidos', key: 'pacientesAtendidos', type: 'number', width: 20 }
        ]
      },
      {
        name: 'Sessões',
        title: 'Sessões Realizadas',
        data: sessionsData,
        columns: [
          { header: 'Fisioterapeuta', key: 'fisioterapeuta', width: 30 },
          { header: 'Sessões Concluídas', key: 'sessoesConcluidas', type: 'number', width: 20 },
          { header: 'Receita Gerada', key: 'receitaGerada', type: 'currency', width: 20 }
        ]
      },
      {
        name: 'Dados Brutos',
        title: 'Dados Brutos Completos',
        data: rawData,
        columns: [
          { header: 'ID', key: 'id', width: 40 },
          { header: 'Nome', key: 'nome', width: 30 },
          { header: 'Receita', key: 'receita', type: 'currency', width: 20 },
          { header: 'Sessões', key: 'sessoes', type: 'number', width: 12 },
          { header: 'Retenção (%)', key: 'retencao', type: 'percentage', width: 15 },
          { header: 'NPS', key: 'nps', type: 'number', width: 10 },
          { header: 'Score', key: 'score', type: 'number', width: 12 },
          { header: 'Ranking', key: 'ranking', type: 'number', width: 10 }
        ]
      }
    ]
  });
};

/**
 * Exportar relatório financeiro
 */
export interface FinancialExportData {
  totalRevenue: number;
  pendingPayments: number;
  paidCount: number;
  totalCount: number;
  averageTicket: number;
  transactions: Array<{
    id: string;
    tipo: string;
    descricao: string;
    valor: number;
    status: string;
    data_vencimento?: string;
    data_pagamento?: string;
    categoria?: string;
  }>;
}

export const exportFinancialReport = async (data: FinancialExportData) => {
  const paymentRate = data.totalCount > 0 
    ? Math.round((data.paidCount / data.totalCount) * 100) 
    : 0;

  const summaryData = [
    { metrica: 'Receita Total', valor: data.totalRevenue },
    { metrica: 'Pagamentos Pendentes', valor: data.pendingPayments },
    { metrica: 'Taxa de Pagamento', valor: `${paymentRate}%` },
    { metrica: 'Ticket Médio', valor: data.averageTicket },
    { metrica: 'Transações Pagas', valor: data.paidCount },
    { metrica: 'Total de Transações', valor: data.totalCount }
  ];

  const tipoMap: Record<string, string> = {
    'receita': 'Receita',
    'despesa': 'Despesa',
    'pagamento': 'Pagamento',
    'recebimento': 'Recebimento'
  };

  const statusMap: Record<string, string> = {
    'concluido': 'Pago',
    'pendente': 'Pendente',
    'cancelado': 'Cancelado'
  };

  const transactionData = data.transactions.map(t => ({
    tipo: tipoMap[t.tipo] || t.tipo,
    descricao: t.descricao || '-',
    valor: t.valor,
    status: statusMap[t.status] || t.status,
    vencimento: t.data_vencimento || '-',
    pagamento: t.data_pagamento || '-',
    categoria: t.categoria || '-'
  }));

  const pendingData = data.transactions
    .filter(t => t.status === 'pendente')
    .map(t => ({
      tipo: tipoMap[t.tipo] || t.tipo,
      descricao: t.descricao || '-',
      valor: t.valor,
      vencimento: t.data_vencimento || '-'
    }));

  await exportToExcel({
    filename: 'financeiro',
    sheets: [
      {
        name: 'Resumo',
        title: 'Relatório Financeiro - Resumo',
        data: summaryData,
        columns: [
          { header: 'Métrica', key: 'metrica', width: 25 },
          { header: 'Valor', key: 'valor', width: 20 }
        ]
      },
      {
        name: 'Transações',
        title: 'Todas as Transações',
        data: transactionData,
        columns: [
          { header: 'Tipo', key: 'tipo', width: 15 },
          { header: 'Descrição', key: 'descricao', width: 30 },
          { header: 'Valor', key: 'valor', type: 'currency', width: 18 },
          { header: 'Status', key: 'status', width: 12 },
          { header: 'Vencimento', key: 'vencimento', width: 15 },
          { header: 'Pagamento', key: 'pagamento', width: 15 },
          { header: 'Categoria', key: 'categoria', width: 15 }
        ]
      },
      {
        name: 'Pendências',
        title: 'Pagamentos Pendentes',
        data: pendingData,
        columns: [
          { header: 'Tipo', key: 'tipo', width: 15 },
          { header: 'Descrição', key: 'descricao', width: 35 },
          { header: 'Valor', key: 'valor', type: 'currency', width: 18 },
          { header: 'Vencimento', key: 'vencimento', width: 15 }
        ]
      }
    ]
  });
};

/**
 * Exportar relatório genérico
 */
export interface GenericReportData {
  title: string;
  summary?: Record<string, any>[];
  summaryColumns?: ExcelColumn[];
  details: Record<string, any>[];
  detailColumns: ExcelColumn[];
}

export const exportGenericReport = async (data: GenericReportData, filename: string) => {
  const sheets: ExcelSheet[] = [];

  if (data.summary && data.summaryColumns) {
    sheets.push({
      name: 'Resumo',
      title: `${data.title} - Resumo`,
      data: data.summary,
      columns: data.summaryColumns
    });
  }

  sheets.push({
    name: 'Detalhamento',
    title: data.title,
    data: data.details,
    columns: data.detailColumns
  });

  await exportToExcel({
    filename,
    sheets
  });
};
