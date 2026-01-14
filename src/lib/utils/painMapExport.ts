import type { PainPoint } from '@/components/pain-map/BodyMap';

export interface PainMapExportData {
  patientName: string;
  date: string;
  view: 'front' | 'back' | 'both';
  frontPoints: PainPoint[];
  backPoints: PainPoint[];
  statistics: {
    totalPoints: number;
    averageIntensity: number;
    highIntensityCount: number;
    muscleSpecificCount: number;
  };
}

// Função para gerar relatório em texto
export function generateTextReport(data: PainMapExportData): string {
  const lines: string[] = [];

  lines.push('='.repeat(60));
  lines.push('RELATÓRIO DE MAPA DE DOR');
  lines.push('='.repeat(60));
  lines.push('');
  lines.push(`Paciente: ${data.patientName}`);
  lines.push(`Data: ${new Date(data.date).toLocaleString('pt-BR')}`);
  lines.push('');
  lines.push('-'.repeat(60));
  lines.push('ESTATÍSTICAS GERAIS');
  lines.push('-'.repeat(60));
  lines.push(`Total de pontos: ${data.statistics.totalPoints}`);
  lines.push(`Intensidade média: ${data.statistics.averageIntensity.toFixed(1)}/10`);
  lines.push(`Pontos de alta intensidade: ${data.statistics.highIntensityCount}`);
  lines.push(`Músculos específicos: ${data.statistics.muscleSpecificCount}`);
  lines.push('');

  if (data.frontPoints.length > 0) {
    lines.push('-'.repeat(60));
    lines.push('VISTA FRONTAL');
    lines.push('-'.repeat(60));
    data.frontPoints.forEach((point, index) => {
      lines.push(`${index + 1}. ${point.region}${point.muscleName ? ` (${point.muscleName})` : ''}`);
      lines.push(`   Intensidade: ${point.intensity}/10`);
      lines.push(`   Tipo: ${point.painType}`);
      if (point.notes) {
        lines.push(`   Notas: ${point.notes}`);
      }
      lines.push('');
    });
  }

  if (data.backPoints.length > 0) {
    lines.push('-'.repeat(60));
    lines.push('VISTA POSTERIOR (COSTAS)');
    lines.push('-'.repeat(60));
    data.backPoints.forEach((point, index) => {
      lines.push(`${index + 1}. ${point.region}${point.muscleName ? ` (${point.muscleName})` : ''}`);
      lines.push(`   Intensidade: ${point.intensity}/10`);
      lines.push(`   Tipo: ${point.painType}`);
      if (point.notes) {
        lines.push(`   Notas: ${point.notes}`);
      }
      lines.push('');
    });
  }

  lines.push('='.repeat(60));
  lines.push(`Gerado em ${new Date().toLocaleString('pt-BR')}`);
  lines.push('='.repeat(60));

  return lines.join('\n');
}

// Função para gerar CSV
export function generateCSV(data: PainMapExportData): string {
  const headers = ['Região', 'Músculo', 'Intensidade', 'Tipo', 'Notas', 'Vista'];
  const rows: string[][] = [];

  data.frontPoints.forEach(point => {
    rows.push([
      point.region,
      point.muscleName || '',
      point.intensity.toString(),
      point.painType,
      point.notes || '',
      'Frente',
    ]);
  });

  data.backPoints.forEach(point => {
    rows.push([
      point.region,
      point.muscleName || '',
      point.intensity.toString(),
      point.painType,
      point.notes || '',
      'Costas',
    ]);
  });

  return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
}

// Função para gerar JSON
export function generateJSON(data: PainMapExportData): string {
  return JSON.stringify(data, null, 2);
}

// Função para baixar arquivo
export function downloadFile(content: string, filename: string, type: string = 'text/plain') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Função principal de exportação
export function exportPainMap(
  data: PainMapExportData,
  format: 'txt' | 'csv' | 'json' = 'txt'
): void {
  const timestamp = new Date().toISOString().split('T')[0];
  const patientSlug = data.patientName.toLowerCase().replace(/\s+/g, '-');
  const filename = `mapa-dor-${patientSlug}-${timestamp}.${format}`;

  let content: string;

  switch (format) {
    case 'csv':
      content = generateCSV(data);
      break;
    case 'json':
      content = generateJSON(data);
      break;
    case 'txt':
    default:
      content = generateTextReport(data);
      break;
  }

  const mimeType = format === 'json' ? 'application/json' : format === 'csv' ? 'text/csv' : 'text/plain';
  downloadFile(content, filename, mimeType);
}

// Função para copiar para área de transferência
export async function copyToClipboard(content: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(content);
    return true;
  } catch (err) {
    console.error('Erro ao copiar para área de transferência:', err);
    return false;
  }
}

// Função para imprimir relatório
export function printPainMap(data: PainMapExportData): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const reportContent = generateTextReport(data)
    .replace(/\n/g, '<br>')
    .replace(/={60}/g, '<hr>')
    .replace(/-{60}/g, '<hr>');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Mapa de Dor - ${data.patientName}</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.6;
          }
          hr {
            border: none;
            border-top: 1px solid #ccc;
            margin: 20px 0;
          }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        ${reportContent}
      </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 250);
}

// Função para calcular estatísticas
export function calculatePainMapStatistics(
  frontPoints: PainPoint[],
  backPoints: PainPoint[]
): PainMapExportData['statistics'] {
  const allPoints = [...frontPoints, ...backPoints];

  return {
    totalPoints: allPoints.length,
    averageIntensity: allPoints.length > 0
      ? allPoints.reduce((sum, p) => sum + p.intensity, 0) / allPoints.length
      : 0,
    highIntensityCount: allPoints.filter(p => p.intensity >= 7).length,
    muscleSpecificCount: allPoints.filter(p => p.muscleCode).length,
  };
}
