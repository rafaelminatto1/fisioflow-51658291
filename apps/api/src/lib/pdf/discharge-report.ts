import type { Env } from "../../types/env";
import { createPool } from "../db";
import puppeteer from "@cloudflare/puppeteer";

/**
 * Discharge Report PDF Generator — High Fidelity (Browser Rendering)
 */

export async function generateDischargeReport(cycleId: string, env: Env): Promise<Uint8Array> {
  const pool = createPool(env);
  
  // 1. Fetch Data (Clinical + Org + Patient)
  const cycleRes = await pool.query(
    `SELECT tc.*, p.full_name as patient_name, p.birth_date, o.name as org_name
     FROM treatment_cycles tc
     JOIN patients p ON tc.patient_id = p.id
     JOIN organizations o ON tc.organization_id = o.id
     WHERE tc.id = $1`,
    [cycleId]
  );
  
  if (!cycleRes.rows.length) throw new Error("Ciclo não encontrado");
  const cycle = cycleRes.rows[0];
  
  const sessionsRes = await pool.query(
    `SELECT subjective, objective, created_at FROM treatment_sessions
     WHERE treatment_cycle_id = $1 ORDER BY created_at ASC`,
    [cycleId]
  );

  // 2. Build HTML Template
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Helvetica', sans-serif; padding: 40px; color: #1e293b; }
        .header { border-bottom: 2px solid #3b82f6; padding-bottom: 20px; margin-bottom: 30px; }
        .title { font-size: 24px; font-weight: bold; color: #1e3a8a; }
        .org-name { font-size: 16px; color: #64748b; }
        .section { margin-bottom: 25px; }
        .section-title { font-size: 14px; font-weight: 800; text-transform: uppercase; color: #3b82f6; margin-bottom: 10px; }
        .content { font-size: 12px; line-height: 1.6; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
        .info-item { background: #f8fafc; padding: 10px; border-radius: 8px; }
        .info-label { font-size: 10px; font-weight: bold; color: #94a3b8; }
        .info-value { font-size: 13px; font-weight: bold; }
        .footer { margin-top: 50px; font-size: 10px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 20px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="title">Relatório de Alta Fisioterapêutica</div>
        <div class="org-name">${cycle.org_name}</div>
      </div>

      <div class="grid">
        <div class="info-item">
          <div class="info-label">PACIENTE</div>
          <div class="info-value">${cycle.patient_name}</div>
        </div>
        <div class="info-item">
          <div class="info-label">PERÍODO</div>
          <div class="info-value">${new Date(cycle.start_date).toLocaleDateString('pt-BR')} — ${new Date().toLocaleDateString('pt-BR')}</div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Diagnóstico e Evolução</div>
        <div class="content">
          Total de sessões realizadas: <strong>${sessionsRes.rows.length}</strong><br><br>
          ${sessionsRes.rows.map((s: any) => `
            <div style="margin-bottom: 15px; padding-left: 10px; border-left: 3px solid #e2e8f0;">
              <small>${new Date(s.created_at).toLocaleDateString('pt-BR')}</small><br>
              ${s.objective || 'Evolução clínica registrada.'}
            </div>
          `).join('')}
        </div>
      </div>

      <div class="footer">
        Documento gerado digitalmente pelo sistema FisioFlow em ${new Date().toLocaleString('pt-BR')}.
      </div>
    </body>
    </html>
  `;

  // 3. Render PDF via Browser Rendering
  if (!env.BROWSER) throw new Error("Browser rendering binding missing");
  
  const browser = await puppeteer.launch(env.BROWSER);
  try {
    const page = await browser.newPage();
    await page.setContent(html);
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
    });
    return new Uint8Array(pdfBuffer);
  } finally {
    await browser.close();
  }
}

