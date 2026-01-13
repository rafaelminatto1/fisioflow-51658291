import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export type PrestadorExport = {
  nome: string;
  contato?: string;
  cpf_cnpj?: string;
  valor_acordado: number;
  status_pagamento: string;
};

export type ParticipanteExport = {
  nome: string;
  contato?: string;
  instagram?: string;
  segue_perfil: boolean;
  observacoes?: string;
};

export type EventoResumo = {
  nome: string;
  local: string;
  data_inicio: string;
  data_fim: string;
  categoria: string;
  status: string;
  totalPrestadores: number;
  totalParticipantes: number;
  custoTotal: number;
};

export function exportPrestadoresPDF(
  prestadores: PrestadorExport[],
  eventoNome: string
) {
  const doc = new jsPDF();

  // Título
  doc.setFontSize(18);
  doc.text('Relatório de Prestadores', 14, 20);
  
  doc.setFontSize(12);
  doc.text(`Evento: ${eventoNome}`, 14, 30);
  doc.setFontSize(10);
  doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 36);

  // Tabela
  autoTable(doc, {
    startY: 45,
    head: [['Nome', 'Contato', 'CPF/CNPJ', 'Valor', 'Status']],
    body: prestadores.map(p => [
      p.nome,
      p.contato || '-',
      p.cpf_cnpj || '-',
      `R$ ${p.valor_acordado.toFixed(2)}`,
      p.status_pagamento === 'PAGO' ? 'Pago' : 'Pendente'
    ]),
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246] },
    styles: { fontSize: 9 },
  });

  // Total
  const totalPago = prestadores
    .filter(p => p.status_pagamento === 'PAGO')
    .reduce((sum, p) => sum + p.valor_acordado, 0);
  
  const totalPendente = prestadores
    .filter(p => p.status_pagamento === 'PENDENTE')
    .reduce((sum, p) => sum + p.valor_acordado, 0);

  const finalY = (doc as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 45;
  
  doc.setFontSize(10);
  doc.text(`Total Pago: R$ ${totalPago.toFixed(2)}`, 14, finalY + 10);
  doc.text(`Total Pendente: R$ ${totalPendente.toFixed(2)}`, 14, finalY + 16);
  doc.setFontSize(12);
  doc.text(`Total Geral: R$ ${(totalPago + totalPendente).toFixed(2)}`, 14, finalY + 24);

  doc.save(`prestadores-${eventoNome.replace(/\s+/g, '-').toLowerCase()}.pdf`);
}

export function exportParticipantesPDF(
  participantes: ParticipanteExport[],
  eventoNome: string
) {
  const doc = new jsPDF();

  // Título
  doc.setFontSize(18);
  doc.text('Lista de Participantes', 14, 20);
  
  doc.setFontSize(12);
  doc.text(`Evento: ${eventoNome}`, 14, 30);
  doc.setFontSize(10);
  doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 36);

  // Tabela
  autoTable(doc, {
    startY: 45,
    head: [['Nome', 'Contato', 'Instagram', 'Segue Perfil']],
    body: participantes.map(p => [
      p.nome,
      p.contato || '-',
      p.instagram || '-',
      p.segue_perfil ? 'Sim' : 'Não'
    ]),
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246] },
    styles: { fontSize: 9 },
  });

  // Estatísticas
  const seguidores = participantes.filter(p => p.segue_perfil).length;
  const percentual = participantes.length > 0 
    ? (seguidores / participantes.length) * 100 
    : 0;

  const finalY = (doc as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 45;
  
  doc.setFontSize(10);
  doc.text(`Total de Participantes: ${participantes.length}`, 14, finalY + 10);
  doc.text(`Seguem o Perfil: ${seguidores} (${percentual.toFixed(1)}%)`, 14, finalY + 16);

  doc.save(`participantes-${eventoNome.replace(/\s+/g, '-').toLowerCase()}.pdf`);
}

export function exportEventoResumoPDF(evento: EventoResumo) {
  const doc = new jsPDF();

  // Título
  doc.setFontSize(20);
  doc.text('Relatório do Evento', 14, 20);
  
  doc.setFontSize(14);
  doc.text(evento.nome, 14, 32);

  // Informações gerais
  doc.setFontSize(11);
  let y = 45;
  
  doc.text('Informações Gerais:', 14, y);
  y += 8;
  
  doc.setFontSize(10);
  doc.text(`Local: ${evento.local}`, 20, y);
  y += 6;
  doc.text(`Período: ${evento.data_inicio} a ${evento.data_fim}`, 20, y);
  y += 6;
  doc.text(`Categoria: ${evento.categoria}`, 20, y);
  y += 6;
  doc.text(`Status: ${evento.status}`, 20, y);
  y += 12;

  // Estatísticas
  doc.setFontSize(11);
  doc.text('Estatísticas:', 14, y);
  y += 8;

  doc.setFontSize(10);
  doc.text(`Total de Prestadores: ${evento.totalPrestadores}`, 20, y);
  y += 6;
  doc.text(`Total de Participantes: ${evento.totalParticipantes}`, 20, y);
  y += 6;
  doc.text(`Custo Total: R$ ${evento.custoTotal.toFixed(2)}`, 20, y);
  y += 12;

  // Footer
  doc.setFontSize(8);
  doc.text(`Relatório gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 14, 280);

  doc.save(`resumo-${evento.nome.replace(/\s+/g, '-').toLowerCase()}.pdf`);
}
