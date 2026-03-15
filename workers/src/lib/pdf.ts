import puppeteer from '@cloudflare/puppeteer';
import type { Env } from '../types/env';

/**
 * Utilitário para gerar PDF a partir de HTML usando Cloudflare Browser Rendering.
 */
export async function generatePdfFromHtml(env: Env, html: string): Promise<Uint8Array> {
  if (!env.BROWSER) {
    throw new Error('Browser Rendering binding (env.BROWSER) not found.');
  }

  const browser = await puppeteer.launch(env.BROWSER);
  try {
    const page = await browser.newPage();
    
    // Configura o conteúdo HTML
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    // Adiciona estilos básicos se necessário
    await page.addStyleTag({
      content: `
        body { font-family: sans-serif; padding: 40px; }
        @media print {
          .no-print { display: none; }
        }
      `
    });

    // Gera o PDF
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        bottom: '20mm',
        left: '15mm',
        right: '15mm'
      }
    });

    return pdf;
  } finally {
    await browser.close();
  }
}
