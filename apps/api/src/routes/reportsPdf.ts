import { Hono } from 'hono';
import { requireAuth, type AuthVariables } from '../lib/auth';
import type { Env } from '../types/env';
import { R2Service } from '../lib/storage/R2Service';

const QUICK_ACTIONS_BASE = 'https://browser.ai.cloudflare.com/api/v1';

async function generatePdfQuickAction(html: string): Promise<Uint8Array> {
	const response = await fetch(`${QUICK_ACTIONS_BASE}/pdf`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			html,
			options: {
				format: 'A4',
				printBackground: true,
				margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
			},
		}),
	});
	if (!response.ok) {
		throw new Error(`Quick Actions PDF failed: ${response.status}`);
	}
	const buf = await response.arrayBuffer();
	return new Uint8Array(buf);
}

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

type PdfReportType = 'soap' | 'progress' | 'prescription' | 'discharge' | 'exam';

type PdfRequest = {
  type: PdfReportType;
  title?: string;
  patientName: string;
  patientId: string;
  data: Record<string, unknown>;
  saveToR2?: boolean; // se true, salva em R2 e retorna URL; se false, retorna binário
  includeHtml?: boolean; // se true, também salva a versão HTML no R2
};

/**
 * POST /api/reports/pdf
 *
 * Gera PDF server-side via Cloudflare Browser Rendering (Puppeteer).
 * Recebe dados clínicos, renderiza HTML estilizado, converte para PDF.
 */
app.post('/', requireAuth, async (c) => {
  const user = c.get('user');
  const body = (await c.req.json()) as PdfRequest;

  if (!body.type || !body.patientName || !body.data) {
    return c.json({ error: 'type, patientName e data são obrigatórios' }, 400);
  }

  const html = buildHtml(body);
  const r2 = new R2Service(c.env);

  try {
    const pdfBuffer = await generatePdfQuickAction(html);

    if (body.saveToR2 !== false) {
      const timestamp = Date.now();
      const baseKey = `reports/${user.organizationId}/${body.patientId}/${body.type}-${timestamp}`;
      const pdfKey = `${baseKey}.pdf`;
      const fileName = `${body.type}-${body.patientName.replace(/\s+/g, '_')}`;

      // Upload PDF
      await r2.uploadFile(pdfKey, new Uint8Array(pdfBuffer as any), 'application/pdf', `${fileName}.pdf`);

      let htmlKey: string | undefined;
      if (body.includeHtml) {
        htmlKey = `${baseKey}.html`;
        await r2.uploadFile(htmlKey, new TextEncoder().encode(html), 'text/html', `${fileName}.html`);
      }

      return c.json({ 
        pdfUrl: `${c.env.R2_PUBLIC_URL}/${pdfKey}`, 
        pdfKey,
        htmlUrl: htmlKey ? `${c.env.R2_PUBLIC_URL}/${htmlKey}` : undefined,
        htmlKey
      });
    }

    // Retornar binário direto
    return new Response(new Uint8Array(pdfBuffer as any), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${body.type}-${body.patientName.replace(/\s+/g, '_')}.pdf"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: any) {
    console.error('[PDF] Error generating PDF:', error);
    return c.json({ error: 'Erro ao gerar PDF', details: error.message }, 500);
  }
});

/**
 * POST /api/reports/pdf/share
 * Gera um link temporário (URL assinada) para um relatório existente.
 */
app.post('/share', requireAuth, async (c) => {
  const r2 = new R2Service(c.env);
  const { key, expiresIn } = (await c.req.json()) as { key: string; expiresIn?: number };

  if (!key) return c.json({ error: 'key é obrigatória' }, 400);

  try {
    // Gera link temporário (default 24h se não especificado)
    const signedUrl = await r2.getDownloadUrl(key, expiresIn || 86400);
    return c.json({ url: signedUrl });
  } catch (error: any) {
    return c.json({ error: 'Erro ao gerar link temporário', details: error.message }, 500);
  }
});

/**
 * GET /api/reports/pdf/templates
 * Lista tipos de relatório disponíveis.
 */
app.get('/templates', requireAuth, (c) => {
  return c.json({
    templates: [
      { type: 'soap', name: 'Nota SOAP', description: 'Registro de sessão fisioterapêutica' },
      { type: 'progress', name: 'Relatório de Progresso', description: 'Evolução do paciente ao longo do tratamento' },
      { type: 'prescription', name: 'Prescrição / Pedido Médico', description: 'Solicitação de exames ou encaminhamentos' },
      { type: 'discharge', name: 'Relatório de Alta', description: 'Sumário da alta fisioterapêutica' },
      { type: 'exam', name: 'Laudo de Exame', description: 'Laudo de avaliação ou exame físico' },
    ],
  });
});

// ===== HTML TEMPLATES =====

function buildHtml(req: PdfRequest): string {
  const content = buildContent(req);
  const date = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${req.title ?? typeLabel(req.type)} — ${req.patientName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      font-size: 12px;
      line-height: 1.6;
      color: #1a1a2e;
      background: #fff;
    }
    .header {
      background: linear-gradient(135deg, #0f3460 0%, #16213e 100%);
      color: white;
      padding: 20px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .header h1 { font-size: 18px; font-weight: 700; }
    .header .subtitle { font-size: 11px; opacity: 0.8; margin-top: 2px; }
    .header .date { font-size: 11px; text-align: right; }
    .badge {
      display: inline-block;
      background: #e94560;
      color: white;
      font-size: 10px;
      font-weight: 700;
      padding: 3px 10px;
      border-radius: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 6px;
    }
    .body { padding: 24px; }
    .patient-card {
      background: #f8f9ff;
      border: 1px solid #e0e4f0;
      border-radius: 8px;
      padding: 14px 16px;
      margin-bottom: 20px;
      display: flex;
      gap: 24px;
    }
    .patient-card .field { flex: 1; }
    .patient-card .label { font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
    .patient-card .value { font-size: 13px; font-weight: 600; color: #1a1a2e; margin-top: 2px; }
    .section { margin-bottom: 18px; }
    .section-title {
      font-size: 11px;
      font-weight: 700;
      color: #0f3460;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      border-bottom: 2px solid #0f3460;
      padding-bottom: 4px;
      margin-bottom: 10px;
    }
    .section-body {
      font-size: 12px;
      color: #333;
      line-height: 1.7;
      white-space: pre-wrap;
    }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th { background: #0f3460; color: white; padding: 7px 10px; text-align: left; font-weight: 600; }
    td { padding: 7px 10px; border-bottom: 1px solid #eee; }
    tr:nth-child(even) td { background: #f8f9ff; }
    .footer {
      margin-top: 32px;
      border-top: 1px solid #e0e4f0;
      padding-top: 12px;
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: #999;
    }
    .signature-line {
      margin-top: 40px;
      border-top: 1px solid #333;
      width: 220px;
      text-align: center;
      padding-top: 6px;
      font-size: 11px;
    }
    .watermark {
      font-size: 10px;
      color: #ccc;
      text-align: center;
      margin-top: 8px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="subtitle">FisioFlow — Sistema de Gestão Fisioterapêutica</div>
      <h1>${req.title ?? typeLabel(req.type)}</h1>
      <span class="badge">${typeLabel(req.type)}</span>
    </div>
    <div class="date">
      <div>Emitido em</div>
      <div style="font-weight:700">${date}</div>
    </div>
  </div>
  <div class="body">
    <div class="patient-card">
      <div class="field">
        <div class="label">Paciente</div>
        <div class="value">${req.patientName}</div>
      </div>
      <div class="field">
        <div class="label">ID do Prontuário</div>
        <div class="value">${req.patientId.substring(0, 8).toUpperCase()}</div>
      </div>
      <div class="field">
        <div class="label">Tipo de Documento</div>
        <div class="value">${typeLabel(req.type)}</div>
      </div>
    </div>
    ${content}
    <div class="footer">
      <span>Documento gerado eletronicamente — FisioFlow</span>
      <span>moocafisio.com.br | ${date}</span>
    </div>
    <div class="watermark">Este documento é sigiloso e destinado exclusivamente ao paciente e profissional responsável.</div>
  </div>
</body>
</html>`;
}

function buildContent(req: PdfRequest): string {
  const d = req.data as Record<string, string>;

  switch (req.type) {
    case 'soap':
      return `
        <div class="section"><div class="section-title">S — Subjetivo</div><div class="section-body">${d.subjective ?? '—'}</div></div>
        <div class="section"><div class="section-title">O — Objetivo</div><div class="section-body">${d.objective ?? '—'}</div></div>
        <div class="section"><div class="section-title">A — Avaliação</div><div class="section-body">${d.assessment ?? '—'}</div></div>
        <div class="section"><div class="section-title">P — Plano</div><div class="section-body">${d.plan ?? '—'}</div></div>
        ${d.pain_level ? `<div class="section"><div class="section-title">Escala de Dor (EVA)</div><div class="section-body">${d.pain_level}/10 — ${d.pain_location ?? ''}</div></div>` : ''}`;

    case 'progress':
      return `
        <div class="section"><div class="section-title">Evolução Clínica</div><div class="section-body">${d.summary ?? '—'}</div></div>
        <div class="section"><div class="section-title">Objetivos Atingidos</div><div class="section-body">${d.goals_achieved ?? '—'}</div></div>
        <div class="section"><div class="section-title">Próximos Passos</div><div class="section-body">${d.next_steps ?? '—'}</div></div>`;

    case 'prescription':
      return `
        <div class="section"><div class="section-title">Prescrição / Solicitação</div><div class="section-body">${d.content ?? '—'}</div></div>
        <div class="section"><div class="section-title">Indicação Clínica</div><div class="section-body">${d.indication ?? '—'}</div></div>
        <div style="margin-top:40px"><div class="signature-line">Assinatura e carimbo do profissional</div></div>`;

    case 'discharge':
      return `
        <div class="section"><div class="section-title">Sumário da Alta</div><div class="section-body">${d.summary ?? '—'}</div></div>
        <div class="section"><div class="section-title">Orientações Pós-Alta</div><div class="section-body">${d.instructions ?? '—'}</div></div>
        <div class="section"><div class="section-title">Resultado do Tratamento</div><div class="section-body">${d.outcome ?? '—'}</div></div>`;

    default:
      return `<div class="section"><div class="section-body">${JSON.stringify(req.data, null, 2)}</div></div>`;
  }
}

function typeLabel(type: PdfReportType): string {
  const labels: Record<PdfReportType, string> = {
    soap: 'Nota SOAP',
    progress: 'Relatório de Progresso',
    prescription: 'Prescrição',
    discharge: 'Relatório de Alta',
    exam: 'Laudo de Exame',
  };
  return labels[type] ?? 'Relatório';
}

export const reportsPdfRoutes = app;
