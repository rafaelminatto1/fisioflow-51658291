// Utilitário para adicionar gráficos aos PDFs usando Chart.js e html2canvas
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { fisioLogger as logger } from '@/lib/errors/logger';

export interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string;
  }>;
}

/**
 * Adiciona um gráfico de linha ao PDF
 */
export async function addLineChartToPDF(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  data: ChartData,
  title?: string
): Promise<number> {
  // Criar elemento canvas temporário
  const canvas = document.createElement('canvas');
  canvas.width = width * 2; // 2x para melhor qualidade
  canvas.height = height * 2;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Não foi possível criar contexto do canvas');
  }

  // Desenhar gráfico manualmente (simplificado)
  // Em produção, usar Chart.js para renderizar
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (title) {
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 16px Arial';
    ctx.fillText(title, 10, 20);
  }

  // Desenhar eixos
  ctx.strokeStyle = '#cccccc';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(50, canvas.height - 50);
  ctx.lineTo(canvas.width - 50, canvas.height - 50);
  ctx.moveTo(50, 50);
  ctx.lineTo(50, canvas.height - 50);
  ctx.stroke();

  // Desenhar dados
  if (data.datasets.length > 0 && data.labels.length > 0) {
    const dataset = data.datasets[0];
    const maxValue = Math.max(...dataset.data, 1);
    const minValue = Math.min(...dataset.data, 0);
    const range = maxValue - minValue || 1;

    const chartWidth = canvas.width - 100;
    const chartHeight = canvas.height - 100;
    const stepX = chartWidth / (data.labels.length - 1 || 1);
    const stepY = chartHeight / range;

    ctx.strokeStyle = data.datasets[0].borderColor || '#3b82f6';
    ctx.lineWidth = 2;
    ctx.beginPath();

    dataset.data.forEach((value, index) => {
      const xPos = 50 + index * stepX;
      const yPos = canvas.height - 50 - (value - minValue) * stepY;

      if (index === 0) {
        ctx.moveTo(xPos, yPos);
      } else {
        ctx.lineTo(xPos, yPos);
      }
    });

    ctx.stroke();
  }

  // Converter canvas para imagem e adicionar ao PDF
  const imgData = canvas.toDataURL('image/png');
  doc.addImage(imgData, 'PNG', x, y, width, height);

  return y + height + 10;
}

/**
 * Adiciona um gráfico de barras ao PDF
 */
export async function addBarChartToPDF(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  data: ChartData,
  title?: string
): Promise<number> {
  const canvas = document.createElement('canvas');
  canvas.width = width * 2;
  canvas.height = height * 2;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Não foi possível criar contexto do canvas');
  }

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (title) {
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 16px Arial';
    ctx.fillText(title, 10, 20);
  }

  // Desenhar eixos
  ctx.strokeStyle = '#cccccc';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(50, canvas.height - 50);
  ctx.lineTo(canvas.width - 50, canvas.height - 50);
  ctx.moveTo(50, 50);
  ctx.lineTo(50, canvas.height - 50);
  ctx.stroke();

  // Desenhar barras
  if (data.datasets.length > 0 && data.labels.length > 0) {
    const dataset = data.datasets[0];
    const maxValue = Math.max(...dataset.data, 1);
    const chartWidth = canvas.width - 100;
    const chartHeight = canvas.height - 100;
    const barWidth = chartWidth / data.labels.length / 2;
    const stepY = chartHeight / maxValue;

    dataset.data.forEach((value, index) => {
      const xPos = 50 + index * (chartWidth / data.labels.length) + barWidth / 2;
      const barHeight = value * stepY;
      const yPos = canvas.height - 50 - barHeight;

      ctx.fillStyle = Array.isArray(dataset.backgroundColor)
        ? dataset.backgroundColor[index] || '#3b82f6'
        : dataset.backgroundColor || '#3b82f6';
      ctx.fillRect(xPos - barWidth / 2, yPos, barWidth, barHeight);
    });
  }

  const imgData = canvas.toDataURL('image/png');
  doc.addImage(imgData, 'PNG', x, y, width, height);

  return y + height + 10;
}

/**
 * Adiciona gráfico usando Chart.js renderizado via html2canvas
 */
export async function addChartJSChartToPDF(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  chartElement: HTMLElement
): Promise<number> {
  try {
    const canvas = await html2canvas(chartElement, {
      width: width * 2,
      height: height * 2,
      scale: 2,
      useCORS: true,
    });

    const imgData = canvas.toDataURL('image/png');
    doc.addImage(imgData, 'PNG', x, y, width, height);

    return y + height + 10;
  } catch (error) {
    logger.error('Erro ao converter gráfico para PDF', error, 'pdfCharts');
    throw error;
  }
}

