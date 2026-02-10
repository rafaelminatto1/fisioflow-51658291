/**
 * FisioFlow - XLSX Integration
 *
 * Integração da skill XLSX para importação e exportação de dados:
 * - Import de pacientes em lote
 * - Export de relatórios financeiros
 * - Export de estatísticas de atendimento
 * - Import de exercícios
 *
 * Baseado na claude-skills XLSX skill e bibliotecas ExcelJS
 */

import ExcelJS from 'exceljs';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Configurações de estilo
const STYLES = {
  header: {
    font: { bold: true, color: { argb: 'FFFFFFFF' } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF005293' } },
    border: {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    },
    alignment: { vertical: 'middle', horizontal: 'center' },
  },
  subheader: {
    font: { bold: true, color: { argb: 'FF005293' } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F0F9' } },
    border: {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    },
  },
  data: {
    font: { color: { argb: 'FF333333' } },
    border: {
      top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
      left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
      bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
      right: { style: 'thin', color: { argb: 'FFE0E0E0' } },
    },
    alignment: { vertical: 'middle', wrapText: true },
  },
  total: {
    font: { bold: true, color: { argb: 'FFFFFFFF' } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF009688' } },
    border: {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    },
  },
  currency: {
    numFmt: '"R$"#,##0.00',
  },
  percentage: {
    numFmt: '0.0%',
  },
  date: {
    numFmt: 'dd/mm/yyyy',
  },
  datetime: {
    numFmt: 'dd/mm/yyyy hh:mm',
  },
};

/**
 * Exporta lista de pacientes para Excel
 */
export async function exportPatientsToExcel(
  patients: Array<{
    id: string;
    name: string;
    cpf?: string;
    birthDate?: Date;
    phone?: string;
    email?: string;
    status: 'active' | 'inactive';
    firstAppointment?: Date;
    lastAppointment?: Date;
    totalSessions?: number;
    city?: string;
  }>,
  clinicName: string
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Pacientes');

  // Configurar colunas
  worksheet.columns = [
    { header: 'Nome', key: 'name', width: 35 },
    { header: 'CPF', key: 'cpf', width: 18 },
    { header: 'Data Nasc.', key: 'birthDate', width: 12 },
    { header: 'Telefone', key: 'phone', width: 16 },
    { header: 'E-mail', key: 'email', width: 30 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Primeira Consulta', key: 'firstAppointment', width: 16 },
    { header: 'Última Consulta', key: 'lastAppointment', width: 16 },
    { header: 'Total Sessões', key: 'totalSessions', width: 12 },
    { header: 'Cidade', key: 'city', width: 25 },
  ];

  // Aplicar estilos ao cabeçalho
  worksheet.getRow(1).eachCell((cell) => {
    cell.style = STYLES.header;
  });

  // Adicionar dados
  patients.forEach((patient) => {
    worksheet.addRow({
      name: patient.name,
      cpf: patient.cpf || '',
      birthDate: patient.birthDate || null,
      phone: patient.phone || '',
      email: patient.email || '',
      status: patient.status === 'active' ? 'Ativo' : 'Inativo',
      firstAppointment: patient.firstAppointment || null,
      lastAppointment: patient.lastAppointment || null,
      totalSessions: patient.totalSessions || 0,
      city: patient.city || '',
    });
  });

  // Aplicar estilos nas células de data
  worksheet.getColumn(3).numFmt = STYLES.date.numFmt;
  worksheet.getColumn(7).numFmt = STYLES.date.numFmt;
  worksheet.getColumn(8).numFmt = STYLES.date.numFmt;

  // Aplicar estilos nas células de dados
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      row.eachCell((cell) => {
        cell.style = STYLES.data;
      });

      // Status colorido
      const statusCell = row.getCell('status');
      if (statusCell.value === 'Ativo') {
        statusCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFC8E6C9' },
        };
      } else {
        statusCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFCDD2' },
        };
      }
    }
  });

  // Adicionar estatísticas
  const statsRow = patients.length + 3;
  worksheet.mergeCells(`A${statsRow}:B${statsRow}`);
  worksheet.getCell(`A${statsRow}`).value = 'Total de Pacientes';
  worksheet.getCell(`A${statsRow}`).style = STYLES.subheader;
  worksheet.getCell(`C${statsRow}`).value = patients.length;
  worksheet.getCell(`C${statsRow}`).style = STYLES.subheader;

  worksheet.mergeCells(`A${statsRow + 1}:B${statsRow + 1}`);
  worksheet.getCell(`A${statsRow + 1}`).value = 'Pacientes Ativos';
  worksheet.getCell(`A${statsRow + 1}`).style = STYLES.subheader;
  worksheet.getCell(`C${statsRow + 1}`).value = patients.filter(p => p.status === 'active').length;
  worksheet.getCell(`C${statsRow + 1}`).style = STYLES.subheader;

  worksheet.mergeCells(`A${statsRow + 2}:B${statsRow + 2}`);
  worksheet.getCell(`A${statsRow + 2}`).value = 'Total de Sessões Realizadas';
  worksheet.getCell(`A${statsRow + 2}`).style = STYLES.subheader;
  worksheet.getCell(`C${statsRow + 2}`).value = patients.reduce((sum, p) => sum + (p.totalSessions || 0), 0);
  worksheet.getCell(`C${statsRow + 2}`).style = STYLES.subheader;

  // Adicionar cabeçalho da clínica
  const headerRow = patients.length + 6;
  worksheet.mergeCells(`A${headerRow}:K${headerRow}`);
  const headerCell = worksheet.getCell(`A${headerRow}`);
  headerCell.value = clinicName;
  headerCell.style = {
    font: { bold: true, size: 14, color: { argb: 'FF005293' } },
    alignment: { horizontal: 'center' },
  };

  const dateCell = worksheet.getCell(`A${headerRow + 1}`);
  dateCell.value = `Exportado em: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`;
  dateCell.alignment = { horizontal: 'center' };

  // Ajustar altura das linhas
  worksheet.eachRow({ includeEmpty: true }, (row) => {
    row.height = 20;
  });

  // Congelar primeira linha
  worksheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];

  return workbook.xlsx.writeBuffer() as Promise<Buffer>;
}

/**
 * Exporta relatório financeiro para Excel
 */
export async function exportFinancialReport(
  data: {
    period: { start: Date; end: Date };
    appointments: Array<{
      date: Date;
      patient: string;
      professional: string;
      type: string;
      value: number;
      status: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
      paymentMethod?: string;
    }>;
    expenses?: Array<{
      date: Date;
      description: string;
      category: string;
      value: number;
    }>;
  },
  clinicName: string
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();

  // Planilha de Receitas
  const revenueSheet = workbook.addWorksheet('Receitas');

  revenueSheet.columns = [
    { header: 'Data', key: 'date', width: 12 },
    { header: 'Paciente', key: 'patient', width: 35 },
    { header: 'Profissional', key: 'professional', width: 25 },
    { header: 'Tipo', key: 'type', width: 20 },
    { header: 'Valor', key: 'value', width: 12 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Pagamento', key: 'paymentMethod', width: 15 },
  ];

  // Cabeçalho
  revenueSheet.getRow(1).eachCell((cell) => cell.style = STYLES.header);

  // Dados
  data.appointments.forEach((apt) => {
    revenueSheet.addRow({
      date: apt.date,
      patient: apt.patient,
      professional: apt.professional,
      type: apt.type,
      value: apt.status === 'completed' ? apt.value : 0,
      status: apt.status,
      paymentMethod: apt.paymentMethod || '',
    });
  });

  // Formatação
  revenueSheet.getColumn('E').numFmt = STYLES.currency.numFmt;
  revenueSheet.getColumn('A').numFmt = STYLES.date.numFmt;

  // Estilos de dados
  revenueSheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      row.eachCell((cell) => cell.style = STYLES.data);
    }
  });

  // Totais
  const totalRow = data.appointments.length + 3;
  revenueSheet.mergeCells(`A${totalRow}:D${totalRow}`);
  revenueSheet.getCell(`A${totalRow}`).value = 'Total Receita Líquida';
  revenueSheet.getCell(`A${totalRow}`).style = STYLES.total;
  revenueSheet.getCell(`E${totalRow}`).value = {
    formula: `SUM(E2:E${data.appointments.length + 1})`,
  };
  revenueSheet.getCell(`E${totalRow}`).style = STYLES.total;

  // Planilha de Despesas (se houver)
  if (data.expenses && data.expenses.length > 0) {
    const expenseSheet = workbook.addWorksheet('Despesas');

    expenseSheet.columns = [
      { header: 'Data', key: 'date', width: 12 },
      { header: 'Descrição', key: 'description', width: 40 },
      { header: 'Categoria', key: 'category', width: 20 },
      { header: 'Valor', key: 'value', width: 12 },
    ];

    expenseSheet.getRow(1).eachCell((cell) => cell.style = STYLES.header);

    data.expenses.forEach((expense) => {
      expenseSheet.addRow(expense);
    });

    expenseSheet.getColumn('D').numFmt = STYLES.currency.numFmt;
    expenseSheet.getColumn('A').numFmt = STYLES.date.numFmt;

    expenseSheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) row.eachCell((cell) => cell.style = STYLES.data);
    });

    const expenseTotalRow = data.expenses.length + 3;
    expenseSheet.mergeCells(`A${expenseTotalRow}:C${expenseTotalRow}`);
    expenseSheet.getCell(`A${expenseTotalRow}`).value = 'Total Despesas';
    expenseSheet.getCell(`A${expenseTotalRow}`).style = STYLES.total;
    expenseSheet.getCell(`D${expenseTotalRow}`).value = {
      formula: `SUM(D2:D${data.expenses.length + 1})`,
    };
    expenseSheet.getCell(`D${expenseTotalRow}`).style = STYLES.total;
  }

  // Planilha de Resumo
  const summarySheet = workbook.addWorksheet('Resumo');

  summarySheet.columns = [
    { header: 'Métrica', key: 'metric', width: 30 },
    { header: 'Valor', key: 'value', width: 20 },
  ];

  summarySheet.getRow(1).eachCell((cell) => cell.style = STYLES.header);

  const completedAppointments = data.appointments.filter(a => a.status === 'completed');
  const totalRevenue = completedAppointments.reduce((sum, a) => sum + a.value, 0);
  const totalExpenses = data.expenses?.reduce((sum, e) => sum + e.value, 0) || 0;
  const profit = totalRevenue - totalExpenses;

  summarySheet.addRows([
    [{ value: 'Período', style: STYLES.subheader }, {
      value: `${format(data.period.start, 'dd/MM/yyyy')} a ${format(data.period.end, 'dd/MM/yyyy')}`,
      style: STYLES.data,
    }],
    [{ value: 'Atendimentos Realizados', style: STYLES.subheader }, {
      value: completedAppointments.length,
      style: STYLES.data,
    }],
    [{ value: 'Total Receita', style: STYLES.subheader }, {
      value: totalRevenue,
      style: { ...STYLES.data, numFmt: STYLES.currency.numFmt },
    }],
    [{ value: 'Total Despesas', style: STYLES.subheader }, {
      value: totalExpenses,
      style: { ...STYLES.data, numFmt: STYLES.currency.numFmt },
    }],
    [{ value: 'Lucro Líquido', style: STYLES.total }, {
      value: profit,
      style: { ...STYLES.total, numFmt: STYLES.currency.numFmt },
    }],
    [{ value: 'Ticket Médio', style: STYLES.subheader }, {
      value: completedAppointments.length > 0 ? totalRevenue / completedAppointments.length : 0,
      style: { ...STYLES.data, numFmt: STYLES.currency.numFmt },
    }],
  ]);

  summarySheet.eachRow((row) => {
    row.height = 22;
  });

  // Cabeçalho da clínica em todas as planilhas
  [revenueSheet, summarySheet].forEach((sheet) => {
    const headerRow = sheet.rowCount + 2;
    sheet.mergeCells(`A${headerRow}:${String.fromCharCode(65 + sheet.columnCount - 1)}${headerRow}`);
    const headerCell = sheet.getCell(`A${headerRow}`);
    headerCell.value = clinicName;
    headerCell.style = {
      font: { bold: true, size: 14, color: { argb: 'FF005293' } },
      alignment: { horizontal: 'center' },
    };
  });

  return workbook.xlsx.writeBuffer() as Promise<Buffer>;
}

/**
 * Importa pacientes de arquivo Excel
 */
export async function importPatientsFromExcel(
  buffer: Buffer
): Promise<Array<{
  name: string;
  cpf?: string;
  birthDate?: Date;
  phone?: string;
  email?: string;
  address?: {
    street: string;
    number: string;
    complement?: string;
    district: string;
    city: string;
    state: string;
    zipCode: string;
  };
}>> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const worksheet = workbook.worksheets[0];
  const patients: Array<{
    name: string;
    cpf?: string;
    birthDate?: Date;
    phone?: string;
    email?: string;
    address: {
      street: string;
      number: string;
      complement?: string;
      district: string;
      city: string;
      state: string;
      zipCode: string;
    };
  }> = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Pular cabeçalho

    const patient = {
      name: row.getCell(1).value?.toString() || '',
      cpf: row.getCell(2).value?.toString(),
      birthDate: row.getCell(3).value instanceof Date ? row.getCell(3).value : undefined,
      phone: row.getCell(4).value?.toString(),
      email: row.getCell(5).value?.toString(),
      address: {
        street: row.getCell(6).value?.toString() || '',
        number: row.getCell(7).value?.toString() || '',
        complement: row.getCell(8).value?.toString(),
        district: row.getCell(9).value?.toString() || '',
        city: row.getCell(10).value?.toString() || '',
        state: row.getCell(11).value?.toString() || '',
        zipCode: row.getCell(12).value?.toString() || '',
      },
    };

    if (patient.name) {
      patients.push(patient);
    }
  });

  return patients;
}

/**
 * Exporta estatísticas de atendimento
 */
export async function exportAttendanceStats(
  data: {
    period: { start: Date; end: Date };
    byProfessional: Array<{
      name: string;
      totalSessions: number;
      completedSessions: number;
      noShows: number;
      revenue: number;
      averageRating?: number;
    }>;
    byType: Array<{
      type: string;
      count: number;
      percentage: number;
      revenue: number;
    }>;
    byDayOfWeek: Array<{
      day: string;
      count: number;
    }>;
    byHour: Array<{
      hour: string;
      count: number;
    }>;
  },
  clinicName: string
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();

  // Por Profissional
  const profSheet = workbook.addWorksheet('Por Profissional');

  profSheet.columns = [
    { header: 'Profissional', key: 'name', width: 30 },
    { header: 'Total Agendados', key: 'total', width: 15 },
    { header: 'Realizados', key: 'completed', width: 12 },
    { header: 'Faltas', key: 'noShows', width: 10 },
    { header: 'Taxa Comparecimento', key: 'rate', width: 18 },
    { header: 'Receita', key: 'revenue', width: 14 },
    { header: 'Avaliação Média', key: 'rating', width: 14 },
  ];

  profSheet.getRow(1).eachCell((cell) => cell.style = STYLES.header);

  data.byProfessional.forEach((prof) => {
    const row = profSheet.addRow({
      name: prof.name,
      total: prof.totalSessions,
      completed: prof.completedSessions,
      noShows: prof.noShows,
      rate: prof.totalSessions > 0
        ? (prof.completedSessions / prof.totalSessions)
        : 0,
      revenue: prof.revenue,
      rating: prof.averageRating || '',
    });

    row.getCell('rate').numFmt = STYLES.percentage.numFmt;
    row.getCell('revenue').numFmt = STYLES.currency.numFmt;
  });

  // Por Tipo de Atendimento
  const typeSheet = workbook.addWorksheet('Por Tipo');

  typeSheet.columns = [
    { header: 'Tipo de Atendimento', key: 'type', width: 30 },
    { header: 'Quantidade', key: 'count', width: 12 },
    { header: '% do Total', key: 'percentage', width: 12 },
    { header: 'Receita', key: 'revenue', width: 14 },
  ];

  typeSheet.getRow(1).eachCell((cell) => cell.style = STYLES.header);

  data.byType.forEach((item) => {
    const row = typeSheet.addRow({
      type: item.type,
      count: item.count,
      percentage: item.percentage / 100,
      revenue: item.revenue,
    });

    row.getCell('percentage').numFmt = STYLES.percentage.numFmt;
    row.getCell('revenue').numFmt = STYLES.currency.numFmt;
  });

  // Por Dia da Semana
  const dowSheet = workbook.addWorksheet('Por Dia Semana');

  dowSheet.columns = [
    { header: 'Dia', key: 'day', width: 15 },
    { header: 'Atendimentos', key: 'count', width: 15 },
  ];

  dowSheet.getRow(1).eachCell((cell) => cell.style = STYLES.header);
  data.byDayOfWeek.forEach((item) => dowSheet.addRow(item));

  // Por Hora
  const hourSheet = workbook.addWorksheet('Por Horário');

  hourSheet.columns = [
    { header: 'Horário', key: 'hour', width: 12 },
    { header: 'Atendimentos', key: 'count', width: 15 },
  ];

  hourSheet.getRow(1).eachCell((cell) => cell.style = STYLES.header);
  data.byHour.forEach((item) => hourSheet.addRow(item));

  // Gráfico (usando Excel's built-in charts se disponível)
  // Nota: ExcelJS tem suporte limitado para gráficos
  // Recomenda-se usar biblioteca externa para gráficos avançados

  // Aplicar estilos
  workbook.eachSheet((worksheet) => {
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        row.eachCell((cell) => cell.style = STYLES.data);
      }
    });
    worksheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];
  });

  return workbook.xlsx.writeBuffer() as Promise<Buffer>;
}

/**
 * Template de planilha para importação de pacientes
 */
export async function generatePatientImportTemplate(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Pacientes');

  worksheet.columns = [
    { header: 'Nome *', key: 'name', width: 35 },
    { header: 'CPF', key: 'cpf', width: 18 },
    { header: 'Data Nascimento', key: 'birthDate', width: 14 },
    { header: 'Telefone', key: 'phone', width: 16 },
    { header: 'E-mail', key: 'email', width: 30 },
    { header: 'Logradouro', key: 'street', width: 30 },
    { header: 'Número', key: 'number', width: 10 },
    { header: 'Complemento', key: 'complement', width: 20 },
    { header: 'Bairro', key: 'district', width: 20 },
    { header: 'Cidade', key: 'city', width: 25 },
    { header: 'UF', key: 'state', width: 5 },
    { header: 'CEP', key: 'zipCode', width: 10 },
  ];

  // Estilizar cabeçalho
  worksheet.getRow(1).eachCell((cell) => {
    cell.style = {
      font: { bold: true, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF005293' } },
      alignment: { vertical: 'middle', horizontal: 'center' },
    };
  });

  // Adicionar linha de exemplo
  worksheet.addRow([
    'João da Silva',
    '123.456.789-00',
    '15/03/1985',
    '(11) 99999-9999',
    'joao@email.com',
    'Av. Paulista',
    '1000',
    'Apto 101',
    'Bela Vista',
    'São Paulo',
    'SP',
    '01310-100',
  ]);

  // Adicionar instruções
  const instructionsSheet = workbook.addWorksheet('Instruções');

  instructionsSheet.columns = [
    { header: '', key: 'col1', width: 50 },
    { header: '', key: 'col2', width: 50 },
  ];

  instructionsSheet.getCell('A1').value = 'Instruções para Importação de Pacientes';
  instructionsSheet.getCell('A1').style = {
    font: { bold: true, size: 14, color: { argb: 'FF005293' } },
  };

  const instructions = [
    ['Campos marcados com * são obrigatórios'],
    ['CPF deve estar no formato 000.000.000-00 ou apenas números'],
    ['Data de nascimento deve estar no formato dd/mm/aaaa'],
    ['Telefone deve incluir DDD: (11) 99999-9999 ou 11999999999'],
    ['CEP deve estar no formato 00000-000 ou apenas números'],
    [''],
    ['Dicas:'],
    ['- Preencha apenas os campos que você tem informação'],
    ['- Salve o arquivo antes de importar'],
    ['- O sistema validará os dados antes de importar'],
  ];

  instructions.forEach(([col1, col2], index) => {
    instructionsSheet.getCell(`A${index + 3}`).value = col1;
    if (col2) instructionsSheet.getCell(`B${index + 3}`).value = col2;
  });

  return workbook.xlsx.writeBuffer() as Promise<Buffer>;
}

/**
 * Função helper para download
 */
export function downloadExcelFile(buffer: Buffer, filename: string): void {
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Função helper para upload
 */
export function uploadExcelFile(
  file: File
): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}
